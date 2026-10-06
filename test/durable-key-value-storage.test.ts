import assert from "node:assert/strict";
import test from "node:test";
import {
  DurableKeyValueStorage,
  DurableStorageCommitError,
  MIGRATION_MARKER_KEY,
  purgeLegacyWorkspaceCopy,
  type DurableStorageBackend,
  type StorageChange,
} from "../src/runtime/durable-key-value-storage.js";

class MemoryBackend implements DurableStorageBackend {
  readonly engine = "memory";
  readonly data = new Map<string, string>();
  commits: StorageChange[][] = [];
  failNext = false;
  corruptOnCommit: string | undefined;

  async loadAll(): Promise<ReadonlyMap<string, string>> {
    return new Map(this.data);
  }

  async commit(changes: readonly StorageChange[]): Promise<void> {
    if (this.failNext) {
      this.failNext = false;
      throw new Error("QuotaExceededError");
    }
    // Atomic: stage everything, then apply.
    const next = new Map(this.data);
    for (const { key, value } of changes) {
      if (value === null) next.delete(key); else next.set(key, key === this.corruptOnCommit ? "corrupted" : value);
    }
    this.data.clear();
    for (const [key, value] of next) this.data.set(key, value);
    this.commits.push([...changes]);
  }
}

class LegacyStorage {
  constructor(private readonly values: Record<string, string>) {}
  get length(): number { return Object.keys(this.values).length; }
  key(index: number): string | null { return Object.keys(this.values)[index] ?? null; }
  getItem(key: string): string | null { return this.values[key] ?? null; }
}

const clock = () => new Date("2026-10-05T20:00:00.000Z");

test("migration copies only viable.* legacy keys once, verifies them, and leaves the legacy copy untouched", async () => {
  const backend = new MemoryBackend();
  const legacy = new LegacyStorage({
    "viable.product-workspace.ws": "{\"schemaVersion\":1}",
    "viable.product-workspace.active": "ws",
    "other.app": "not ours",
  });

  const first = await DurableKeyValueStorage.open(backend, legacy, clock);
  assert.deepEqual(first.migration, { status: "migrated", keys: 2 });
  assert.equal(first.storage.getItem("viable.product-workspace.active"), "ws");
  assert.equal(first.storage.getItem("other.app"), null);
  assert.equal(backend.commits.length, 1, "migration is one transaction");
  assert.ok(backend.data.has(MIGRATION_MARKER_KEY));
  assert.equal(legacy.getItem("viable.product-workspace.active"), "ws");

  const second = await DurableKeyValueStorage.open(backend, legacy, clock);
  assert.deepEqual(second.migration, { status: "already_migrated" });
  assert.equal(backend.commits.length, 1, "never migrates twice");
});

test("migration never overwrites data already in durable storage", async () => {
  const backend = new MemoryBackend();
  backend.data.set("viable.product-workspace.active", "durable-ws");
  const { storage } = await DurableKeyValueStorage.open(backend, new LegacyStorage({ "viable.product-workspace.active": "legacy-ws" }), clock);
  assert.equal(storage.getItem("viable.product-workspace.active"), "durable-ws");
});

test("migration that cannot be verified fails without claiming success", async () => {
  const backend = new MemoryBackend();
  backend.corruptOnCommit = "viable.signals-inbox.ws";
  await assert.rejects(
    DurableKeyValueStorage.open(backend, new LegacyStorage({ "viable.signals-inbox.ws": "{}" }), clock),
    DurableStorageCommitError,
  );
});

test("writes are visible immediately and durable only after commit resolves", async () => {
  const backend = new MemoryBackend();
  const { storage } = await DurableKeyValueStorage.open(backend);
  storage.setItem("viable.a", "1");
  storage.setItem("viable.b", "2");
  assert.equal(storage.getItem("viable.a"), "1");
  assert.equal(backend.data.has("viable.a"), false);
  assert.equal(storage.hasPendingChanges(), true);

  await storage.commit();
  assert.equal(backend.data.get("viable.a"), "1");
  assert.equal(backend.data.get("viable.b"), "2");
  assert.equal(backend.commits.at(-1)?.length, 2, "one transaction for the batch");
  assert.equal(storage.hasPendingChanges(), false);
});

test("a failed commit reverts every key in the batch to its last committed value", async () => {
  const backend = new MemoryBackend();
  const { storage } = await DurableKeyValueStorage.open(backend);
  storage.setItem("viable.keep", "committed");
  await storage.commit();

  storage.setItem("viable.keep", "unsaved edit");
  storage.setItem("viable.new", "unsaved new");
  storage.removeItem("viable.keep");
  backend.failNext = true;
  await assert.rejects(storage.commit(), (error: unknown) => error instanceof DurableStorageCommitError && /nothing was partially saved/.test(error.message));

  assert.equal(storage.getItem("viable.keep"), "committed");
  assert.equal(storage.getItem("viable.new"), null);
  assert.equal(backend.data.get("viable.keep"), "committed");
  assert.equal(storage.hasPendingChanges(), false);
});

test("concurrent commits are serialized and each includes earlier writes", async () => {
  const backend = new MemoryBackend();
  const { storage } = await DurableKeyValueStorage.open(backend);
  storage.setItem("viable.a", "1");
  const first = storage.commit();
  storage.setItem("viable.b", "2");
  const second = storage.commit();
  await Promise.all([first, second]);
  assert.equal(backend.data.get("viable.a"), "1");
  assert.equal(backend.data.get("viable.b"), "2");
});

test("changes committed in another tab apply without clobbering local unsaved edits", async () => {
  const backend = new MemoryBackend();
  const { storage } = await DurableKeyValueStorage.open(backend);
  storage.setItem("viable.mine", "local draft");
  storage.applyExternal([
    { key: "viable.theirs", value: "from other tab" },
    { key: "viable.mine", value: "other tab version" },
  ]);
  assert.equal(storage.getItem("viable.theirs"), "from other tab");
  assert.equal(storage.getItem("viable.mine"), "local draft");
  storage.applyExternal([{ key: "viable.theirs", value: null }]);
  assert.equal(storage.getItem("viable.theirs"), null);
});

test("committed changes are announced for cross-tab propagation", async () => {
  const { storage } = await DurableKeyValueStorage.open(new MemoryBackend());
  const seen: StorageChange[][] = [];
  storage.onCommitted((changes) => seen.push([...changes]));
  storage.setItem("viable.x", "1");
  storage.removeItem("viable.y");
  await storage.commit();
  assert.deepEqual(seen, [[{ key: "viable.x", value: "1" }, { key: "viable.y", value: null }]]);
});

test("storage enumerates keys like Storage for the workspace lifecycle service", async () => {
  const backend = new MemoryBackend();
  backend.data.set("viable.product-workspace.ws", "{}");
  const { storage } = await DurableKeyValueStorage.open(backend);
  const keys = Array.from({ length: storage.length }, (_, index) => storage.key(index));
  assert.ok(keys.includes("viable.product-workspace.ws"));
  assert.equal(storage.key(99), null);
});

class RemovableLegacyStorage {
  constructor(readonly values: Record<string, string>) {}
  getItem(key: string): string | null { return this.values[key] ?? null; }
  removeItem(key: string): void { delete this.values[key]; }
}

test("purging a deleted workspace removes only its legacy records and leaves other workspaces untouched", () => {
  const legacy = new RemovableLegacyStorage({
    "viable.product-workspace.ws": "a",
    "viable.campaign-workspace.ws": "b",
    "viable.product-workspace.other": "c",
    "viable.theme": "dark",
  });
  const removed = purgeLegacyWorkspaceCopy(legacy, ["viable.product-workspace.ws", "viable.campaign-workspace.ws", "viable.signals-inbox.ws"]);
  assert.equal(removed, 2);
  assert.deepEqual(legacy.values, { "viable.product-workspace.other": "c", "viable.theme": "dark" });
});

test("purging removes the legacy active pointer only when it still names the deleted workspace", () => {
  const pointer = { key: "viable.product-workspace.active", value: "ws" };
  const naming = new RemovableLegacyStorage({ "viable.product-workspace.active": "ws" });
  assert.equal(purgeLegacyWorkspaceCopy(naming, [], pointer), 1);
  assert.deepEqual(naming.values, {});
  const other = new RemovableLegacyStorage({ "viable.product-workspace.active": "other" });
  assert.equal(purgeLegacyWorkspaceCopy(other, [], pointer), 0);
  assert.deepEqual(other.values, { "viable.product-workspace.active": "other" });
});
