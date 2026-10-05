import {
  DurableKeyValueStorage,
  type DurableStorageBackend,
  type MigrationReport,
  type StorageChange,
} from "../../../src/runtime/durable-key-value-storage.js";

// Single workspace storage for every runtime (ADR-0010, #114).
//
// Authoritative workspace data lives in IndexedDB (transactional, large
// quota) in both the PWA and the desktop webview. Existing localStorage data
// is migrated once and verified; the legacy copy is kept untouched as a
// recovery source. If IndexedDB is unavailable, Viable falls back to
// localStorage and reports that honestly in the Workspace runtime panel.

const DATABASE = "viable-workspace";
const STORE = "kv";
const CHANNEL = "viable-workspace-storage";
// Every module awaits storage before rendering, so opening must never hang the
// app: if IndexedDB does not answer, fall back (data stays in localStorage).
const OPEN_TIMEOUT_MS = 8000;
// Written to localStorage once IndexedDB holds this profile's data. Not under
// the "viable." prefix, so it is neither migrated nor treated as workspace data.
const ENGINE_MARKER = "viable-storage-engine";

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

function markerSet(): boolean {
  try { return typeof localStorage !== "undefined" && localStorage.getItem(ENGINE_MARKER) === "indexeddb"; } catch { return false; }
}

async function openWorkspaceStorage(): Promise<{ storage: WorkspaceStorage; status: WorkspaceStorageStatus }> {
  if (typeof indexedDB === "undefined") {
    return { storage: liveLocalStorage, status: { engine: "localStorage", migration: { status: "unavailable" }, fallbackReason: "IndexedDB is not available in this environment." } };
  }
  try {
    const backend = new IndexedDbBackend(await openDatabase());
    const legacy = typeof localStorage === "undefined" ? undefined : localStorage;
    const { storage, migration } = await DurableKeyValueStorage.open(backend, legacy);
    if (typeof BroadcastChannel !== "undefined") {
      const channel = new BroadcastChannel(CHANNEL);
      channel.onmessage = (event: MessageEvent<{ changes?: StorageChange[] }>) => {
        if (Array.isArray(event.data?.changes)) storage.applyExternal(event.data.changes);
      };
      storage.onCommitted((changes) => channel.postMessage({ changes }));
    }
    try { localStorage.setItem(ENGINE_MARKER, "indexeddb"); } catch { /* marker is best effort */ }
    return { storage, status: { engine: "indexeddb", migration } };
  } catch (error) {
    const reason = error instanceof Error ? error.message : "IndexedDB could not be opened.";
    if (markerSet()) {
      showUnavailableBanner(reason);
      return { storage: unavailableStorage(reason), status: { engine: "unavailable", migration: { status: "unavailable" }, fallbackReason: reason } };
    }
    // Never migrated: localStorage still holds the only copy, so it is safe to keep using it.
    return { storage: liveLocalStorage, status: { engine: "localStorage", migration: { status: "unavailable" }, fallbackReason: reason } };
  }
}

const opened = await openWorkspaceStorage();

/** The one storage every workspace store and the lifecycle service use. */
export const workspaceStorage: WorkspaceStorage = opened.storage;
export const workspaceStorageStatus: WorkspaceStorageStatus = opened.status;
