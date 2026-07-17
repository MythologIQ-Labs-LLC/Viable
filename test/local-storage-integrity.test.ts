import test from "node:test";
import assert from "node:assert/strict";
import { LocalStorageProductWorkspaceStore } from "../apps/desktop/ui/local-storage-product-workspace-store.js";
import {
  LocalWorkspaceStorageError,
  readWorkspaceJson,
  removeStorageItems,
  writeWorkspaceJson,
} from "../apps/desktop/ui/local-storage-json.js";
import type { ProductWorkspace } from "../src/product-core/domain/workspace.js";

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>();
  failGet = false;
  failSet = false;
  failRemoveAfter = Number.POSITIVE_INFINITY;
  removeAttempts = 0;

  get length(): number { return this.values.size; }
  clear(): void { this.values.clear(); }
  getItem(key: string): string | null {
    if (this.failGet) throw new DOMException("blocked", "SecurityError");
    return this.values.get(key) ?? null;
  }
  key(index: number): string | null { return [...this.values.keys()][index] ?? null; }
  removeItem(key: string): void {
    this.removeAttempts += 1;
    if (this.removeAttempts > this.failRemoveAfter) throw new DOMException("blocked", "SecurityError");
    this.values.delete(key);
  }
  setItem(key: string, value: string): void {
    if (this.failSet) throw new DOMException("full", "QuotaExceededError");
    this.values.set(key, value);
  }
}

const shape = { arrays: ["items"], strings: ["updatedAt"] } as const;
const productWorkspace: ProductWorkspace = {
  id: "product-1",
  createdAt: "2026-07-16T00:00:00.000Z",
  createdBy: "Owner",
  product: {
    revision: 1,
    identity: { name: "Viable", description: "Test", lifecycle: "prototype", supportedEnvironments: [] },
    capabilities: [], limitations: [], positioning: "", alternatives: [], differentiation: [], pricing: [], packaging: [], offers: [], callsToAction: [], brandVoice: [], terminology: {}, accessibilityConstraints: [], updatedAt: "2026-07-16T00:00:00.000Z", updatedBy: "Owner",
  },
  claims: [], evidence: [], icpHypotheses: [], assessments: [], actions: [],
};

test("valid local workspace JSON round trips through the integrity boundary", () => {
  const storage = new MemoryStorage();
  const value = { workspaceId: "workspace-1", items: [], updatedAt: "2026-07-16T00:00:00.000Z" };
  writeWorkspaceJson(storage, "key", "Test workspace", value);
  assert.deepEqual(readWorkspaceJson(storage, "key", "Test workspace", { field: "workspaceId", expected: "workspace-1" }, shape), value);
});

test("malformed saved data is rejected without being deleted or rewritten", () => {
  const storage = new MemoryStorage();
  storage.setItem("key", "{not-json");
  assert.throws(
    () => readWorkspaceJson(storage, "key", "Test workspace", { field: "workspaceId", expected: "workspace-1" }, shape),
    (error: unknown) => error instanceof LocalWorkspaceStorageError && error.message.includes("malformed") && error.message.includes("preserved"),
  );
  assert.equal(storage.getItem("key"), "{not-json");
});

test("workspace identity and required collections are validated before authority code receives data", () => {
  const storage = new MemoryStorage();
  storage.setItem("key", JSON.stringify({ workspaceId: "other", items: [], updatedAt: "now" }));
  assert.throws(
    () => readWorkspaceJson(storage, "key", "Test workspace", { field: "workspaceId", expected: "workspace-1" }, shape),
    /identity does not match/,
  );
  storage.setItem("key", JSON.stringify({ workspaceId: "workspace-1", updatedAt: "now" }));
  assert.throws(
    () => readWorkspaceJson(storage, "key", "Test workspace", { field: "workspaceId", expected: "workspace-1" }, shape),
    /items/,
  );
});

test("storage access and quota failures remain explicit", () => {
  const storage = new MemoryStorage();
  storage.failGet = true;
  assert.throws(
    () => readWorkspaceJson(storage, "key", "Test workspace", { field: "workspaceId", expected: "workspace-1" }, shape),
    /could not be read/,
  );
  storage.failGet = false;
  storage.failSet = true;
  assert.throws(() => writeWorkspaceJson(storage, "key", "Test workspace", { value: true }), /could not be saved/);
});

test("serialization and partial removal failures are surfaced", () => {
  const storage = new MemoryStorage();
  const circular: { self?: unknown } = {};
  circular.self = circular;
  assert.throws(() => writeWorkspaceJson(storage, "key", "Test workspace", circular), /could not be serialized/);

  storage.setItem("one", "1");
  storage.setItem("two", "2");
  storage.failRemoveAfter = 1;
  assert.throws(() => removeStorageItems(storage, ["one", "two"], "Test workspace"), /could not be removed completely/);
  assert.equal(storage.getItem("one"), null);
  assert.equal(storage.getItem("two"), "2");
});

test("Product workspace store validates, activates, and clears a complete workspace", async () => {
  const storage = new MemoryStorage();
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: storage });
  const store = new LocalStorageProductWorkspaceStore();

  await store.save(productWorkspace);
  assert.equal(store.activeWorkspaceId(), productWorkspace.id);
  assert.deepEqual(await store.load(productWorkspace.id), productWorkspace);
  store.clearActiveWorkspace();
  assert.equal(store.activeWorkspaceId(), undefined);
  assert.equal(await store.load(productWorkspace.id), undefined);
});

test("partial Product workspace deletion preserves active identity for a recoverable retry", async () => {
  const storage = new MemoryStorage();
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: storage });
  const store = new LocalStorageProductWorkspaceStore();

  await store.save(productWorkspace);
  storage.failRemoveAfter = 1;
  assert.throws(() => store.clearActiveWorkspace(), /could not be removed completely/);
  assert.equal(store.activeWorkspaceId(), productWorkspace.id);
  assert.equal(await store.load(productWorkspace.id), undefined);

  storage.failRemoveAfter = Number.POSITIVE_INFINITY;
  store.clearActiveWorkspace();
  assert.equal(store.activeWorkspaceId(), undefined);
});
