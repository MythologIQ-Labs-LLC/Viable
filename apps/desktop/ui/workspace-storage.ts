import {
  DurableKeyValueStorage,
  DurableStorageCommitError,
  DurableStorageConflictError,
  MIGRATION_MARKER_KEY,
  purgeLegacyWorkspaceCopy,
  type LegacyMigrationResult,
  type DurableStorageBackend,
  type MigrationReport,
  type StorageChange,
} from "../../../src/runtime/durable-key-value-storage.js";

// Single workspace storage for every runtime (ADR-0010, #114).
//
// Authoritative workspace data lives in IndexedDB (transactional, large
// quota) in both the PWA and the desktop webview. Existing localStorage data
// is migrated once and verified; the legacy copy is kept as a recovery source
// until the person deletes that workspace, which purges its legacy records too
// (#36) so deletion never silently retains data. Once a browser exposes IndexedDB, failure to open it is
// treated as an authority failure and Viable fails closed rather than risking
// stale localStorage becoming authoritative again.

const DATABASE = "viable-workspace";
const STORE = "kv";
const CHANNEL = "viable-workspace-storage";
// Every module awaits storage before rendering, so opening must never hang the
// app. A timeout is a fail-closed authority error, not permission to resurrect
// a potentially stale legacy localStorage copy.
const OPEN_TIMEOUT_MS = 8000;
// Reading saved data (and the one-time migration) must not hang startup either.
// A load timeout fails closed too: the migration may still be finishing in the
// background, so falling back to localStorage could diverge from it.
const LOAD_TIMEOUT_MS = 15000;

export type WorkspaceStorage = Pick<DurableKeyValueStorage, "length" | "key" | "getItem" | "setItem" | "removeItem" | "commit">;

export type WorkspaceStorageStatus = Readonly<{
  engine: "indexeddb" | "localStorage" | "unavailable";
  migration: MigrationReport | { status: "unavailable" };
  fallbackReason?: string;
}>;

function request<T>(value: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    value.onsuccess = () => resolve(value.result);
    value.onerror = () => reject(value.error);
  });
}

function withinLoadTimeout<T>(promise: Promise<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error("IndexedDB did not finish loading saved data in time.")), LOAD_TIMEOUT_MS);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("IndexedDB did not respond in time.")), OPEN_TIMEOUT_MS);
    const open = indexedDB.open(DATABASE, 1);
    open.onupgradeneeded = () => {
      if (!open.result.objectStoreNames.contains(STORE)) open.result.createObjectStore(STORE);
    };
    open.onsuccess = () => { clearTimeout(timer); resolve(open.result); };
    open.onerror = () => { clearTimeout(timer); reject(open.error); };
    open.onblocked = () => { clearTimeout(timer); reject(new Error("Workspace storage upgrade is blocked by another open Viable window.")); };
  });
}

class IndexedDbBackend implements DurableStorageBackend {
  readonly engine = "indexeddb";
  constructor(private readonly db: IDBDatabase) {}

  async loadAll(): Promise<ReadonlyMap<string, string>> {
    const transaction = this.db.transaction(STORE, "readonly");
    const store = transaction.objectStore(STORE);
    const [keys, values] = await Promise.all([request(store.getAllKeys()), request(store.getAll())]);
    const entries = new Map<string, string>();
    keys.forEach((key, index) => {
      const value = values[index];
      if (typeof key === "string" && typeof value === "string") entries.set(key, value);
    });
    return entries;
  }

  migrateLegacy(entries: readonly (readonly [string, string])[], migratedAt: string): Promise<LegacyMigrationResult> {
    // The initial read, marker check, missing-key copy and readback all run
    // under one readwrite lock. A delayed tab can never replay an old legacy
    // copy after another tab's migration or later authoritative write.
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(STORE, "readwrite", { durability: "strict" });
      const store = transaction.objectStore(STORE);
      let outcome: LegacyMigrationResult | undefined;
      let verificationFailure: DurableStorageCommitError | undefined;
      transaction.onerror = () => reject(verificationFailure ?? transaction.error);
      transaction.onabort = () => reject(verificationFailure ?? transaction.error ?? new Error("Workspace migration transaction aborted"));
      transaction.oncomplete = () => {
        if (!outcome) {
          reject(new DurableStorageCommitError("Workspace migration finished without a verified authoritative snapshot."));
          return;
        }
        resolve(outcome);
      };

      // getAllKeys/getAll are ordered requests within the SAME transaction.
      // Their successful results describe the atomic state before any copy.
      const keysRequest = store.getAllKeys();
      const valuesRequest = store.getAll();
      let keysReady = false;
      let valuesReady = false;
      const apply = (): void => {
        if (!keysReady || !valuesReady) return;
        const current = new Map<string, string>();
        keysRequest.result.forEach((key, index) => {
          const value = valuesRequest.result[index];
          if (typeof key === "string" && typeof value === "string") current.set(key, value);
        });
        if (current.has(MIGRATION_MARKER_KEY)) {
          outcome = { snapshot: current, migration: { status: "already_migrated" } };
          return;
        }

        let copied = 0;
        for (const [key, value] of entries) {
          // No localStorage value may supply or overwrite the authoritative
          // migration marker, even if the legacy source contains one.
          if (!key.startsWith("viable.") || key === MIGRATION_MARKER_KEY || current.has(key)) continue;
          current.set(key, value);
          store.put(value, key);
          copied += 1;
        }
        const marker = JSON.stringify({ migratedAt, keys: copied });
        current.set(MIGRATION_MARKER_KEY, marker);
        store.put(marker, MIGRATION_MARKER_KEY);

        // Validate the actual IndexedDB reads after all queued put requests
        // but before transaction completion. Any mismatch aborts EVERY write.
        const verifyKeys = store.getAllKeys();
        const verifyValues = store.getAll();
        let verifiedKeys = false;
        let verifiedValues = false;
        const verify = (): void => {
          if (!verifiedKeys || !verifiedValues) return;
          const actual = new Map<string, string>();
          verifyKeys.result.forEach((key, index) => {
            const value = verifyValues.result[index];
            if (typeof key === "string" && typeof value === "string") actual.set(key, value);
          });
          if (actual.size !== current.size || [...current].some(([key, value]) => actual.get(key) !== value)) {
            verificationFailure = new DurableStorageCommitError("Workspace migration could not be verified. The original legacy copy remains untouched.");
            transaction.abort();
            return;
          }
          outcome = {
            snapshot: actual,
            migration: copied ? { status: "migrated", keys: copied } : { status: "not_needed" },
          };
        };
        verifyKeys.onsuccess = () => { verifiedKeys = true; verify(); };
        verifyValues.onsuccess = () => { verifiedValues = true; verify(); };
      };
      keysRequest.onsuccess = () => { keysReady = true; apply(); };
      valuesRequest.onsuccess = () => { valuesReady = true; apply(); };
    });
  }

  commitIfUnchanged(changes: readonly StorageChange[], expected: readonly StorageChange[]): Promise<void> {
    // Reads and writes share ONE readwrite transaction. A preflight read in a
    // separate transaction would leave a race between checking and writing.
    return new Promise((resolve, reject) => {
      const expectedKeys = new Set(expected.map(({ key }) => key));
      if (expectedKeys.size !== expected.length || changes.some(({ key }) => !expectedKeys.has(key))) {
        reject(new Error("A workspace change lacked a complete unique expected-value set."));
        return;
      }
      const transaction = this.db.transaction(STORE, "readwrite", { durability: "strict" });
      const store = transaction.objectStore(STORE);
      let conflict: DurableStorageConflictError | undefined;
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(conflict ?? transaction.error);
      transaction.onabort = () => reject(conflict ?? transaction.error ?? new Error("Workspace storage transaction aborted"));
      const compare = (index: number): void => {
        const expectedChange = expected[index];
        if (!expectedChange) {
          // All reads matched while the transaction held the write lock.
          // No other tab can interleave a same-store write before these puts.
          for (const { key, value } of changes) {
            if (value === null) store.delete(key); else store.put(value, key);
          }
          return;
        }
        const read = store.get(expectedChange.key);
        read.onsuccess = () => {
          const actual = typeof read.result === "string" ? read.result : null;
          if (actual !== expectedChange.value) {
            conflict = new DurableStorageConflictError();
            transaction.abort();
            return;
          }
          compare(index + 1);
        };
        // IDB request failures abort the transaction automatically; onabort
        // rejects with the actual error rather than claiming a stale write.
      };
      compare(0);
    });
  }
}

// Fallback / non-browser runtime: delegates to whatever localStorage is
// installed at call time (tests install their own per test).
const liveLocalStorage: WorkspaceStorage = {
  get length() { return globalThis.localStorage.length; },
  key: (index) => globalThis.localStorage.key(index),
  getItem: (key) => globalThis.localStorage.getItem(key),
  setItem: (key, value) => globalThis.localStorage.setItem(key, value),
  removeItem: (key) => globalThis.localStorage.removeItem(key),
  commit: async () => undefined,
};

// Fail closed: after migration the localStorage copy is stale, so it must never
// be served or written if IndexedDB becomes unavailable.
function unavailableStorage(reason: string): WorkspaceStorage {
  const refuse = (): never => {
    throw new Error(`Viable's saved workspace data could not be opened (${reason}). Nothing was changed. Close other Viable windows and reload.`);
  };
  return { length: 0, key: () => null, getItem: () => null, setItem: refuse, removeItem: refuse, commit: async () => refuse() };
}

function showUnavailableBanner(reason: string): void {
  if (typeof document === "undefined") return;
  const show = () => {
    const banner = document.createElement("section");
    banner.className = "state error";
    banner.setAttribute("role", "alert");
    banner.innerHTML = "<strong>Your saved Viable data could not be opened.</strong><span></span>";
    banner.querySelector("span")!.textContent = `${reason} Your data has not been changed. Close other Viable windows or tabs and reload. If this continues, restore from a backup.`;
    document.body.prepend(banner);
  };
  if (document.body) show(); else document.addEventListener("DOMContentLoaded", show, { once: true });
}

async function openWorkspaceStorage(): Promise<{ storage: WorkspaceStorage; status: WorkspaceStorageStatus }> {
  if (typeof indexedDB === "undefined") {
    return { storage: liveLocalStorage, status: { engine: "localStorage", migration: { status: "unavailable" }, fallbackReason: "IndexedDB is not available in this environment." } };
  }
  try {
    const backend = new IndexedDbBackend(await openDatabase());
    const legacy = typeof localStorage === "undefined" ? undefined : localStorage;
    const { storage, migration } = await withinLoadTimeout(DurableKeyValueStorage.open(backend, legacy));
    if (typeof BroadcastChannel !== "undefined") {
      const channel = new BroadcastChannel(CHANNEL);
      channel.onmessage = (event: MessageEvent<{ changes?: StorageChange[] }>) => {
        if (Array.isArray(event.data?.changes)) storage.applyExternal(event.data.changes);
      };
      storage.onCommitted((changes) => channel.postMessage({ changes }));
    }
    return { storage, status: { engine: "indexeddb", migration } };
  } catch (error) {
    const reason = error instanceof Error ? error.message : "IndexedDB could not be opened.";
    console.warn(`Viable workspace storage: ${reason}`);
    showUnavailableBanner(reason);
    return { storage: unavailableStorage(reason), status: { engine: "unavailable", migration: { status: "unavailable" }, fallbackReason: reason } };
  }
}

const opened = await openWorkspaceStorage();

/** The one storage every workspace store and the lifecycle service use. */
export const workspaceStorage: WorkspaceStorage = opened.storage;
export const workspaceStorageStatus: WorkspaceStorageStatus = opened.status;

/**
 * After a workspace deletion has been durably committed to IndexedDB, removes
 * that workspace's leftover pre-migration localStorage copy. Without this the
 * legacy copy would silently retain deleted data and could resurrect it if the
 * browser later evicted IndexedDB. In the localStorage fallback the deletion
 * itself already removed these keys, and when storage is unavailable nothing
 * was deleted, so both are no-ops. Returns how many legacy entries were removed.
 */
export function purgeLegacyWorkspaceRecords(keys: readonly string[], pointer: Readonly<{ key: string; value: string }>): number {
  if (opened.status.engine !== "indexeddb" || typeof localStorage === "undefined") return 0;
  return purgeLegacyWorkspaceCopy(localStorage, keys, pointer);
}
