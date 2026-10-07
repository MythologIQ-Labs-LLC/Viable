import {
  DurableKeyValueStorage,
  purgeLegacyWorkspaceCopy,
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

  commit(changes: readonly StorageChange[]): Promise<void> {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(STORE, "readwrite", { durability: "strict" });
      const store = transaction.objectStore(STORE);
      for (const { key, value } of changes) {
        if (value === null) store.delete(key); else store.put(value, key);
      }
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error ?? new Error("Workspace storage transaction aborted"));
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
