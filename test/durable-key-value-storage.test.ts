import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import {
  DurableKeyValueStorage,
  DurableStorageCommitError,
  DurableStorageConflictError,
  MIGRATION_MARKER_KEY,
  type LegacyMigrationResult,
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

  async migrateLegacy(entries: readonly (readonly [string, string])[], migratedAt: string): Promise<LegacyMigrationResult> {
    const existing = await this.loadAll();
    if (existing.has(MIGRATION_MARKER_KEY)) {
      return { snapshot: existing, migration: { status: "already_migrated" } };
    }
    const toCopy = entries.filter(([key]) => key !== MIGRATION_MARKER_KEY && key.startsWith("viable.") && !existing.has(key));
    await this.commit([
      ...toCopy.map(([key, value]) => ({ key, value })),
      { key: MIGRATION_MARKER_KEY, value: JSON.stringify({ migratedAt, keys: toCopy.length }) },
    ]);
    const verified = await this.loadAll();
    for (const [key, value] of toCopy) {
      if (verified.get(key) !== value) {
        throw new DurableStorageCommitError("Workspace migration could not be verified. The original legacy source was retained.");
      }
    }
    return { snapshot: verified, migration: toCopy.length ? { status: "migrated", keys: toCopy.length } : { status: "not_needed" } };
  }

  async commitIfUnchanged(changes: readonly StorageChange[], expected: readonly StorageChange[]): Promise<void> {
    // Mimic one IndexedDB readwrite transaction: compare before applying any
    // change. A test fake must not hide the write-race it is testing.
    for (const { key, value } of expected) {
      if ((this.data.get(key) ?? null) !== value) {
        throw new DurableStorageConflictError();
      }
    }
    await this.commit(changes);
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

test("two tabs cannot silently overwrite the same whole-workspace record", async () => {
  const backend = new MemoryBackend();
  const first = (await DurableKeyValueStorage.open(backend)).storage;
  first.setItem("viable.product-workspace.ws", '{"version":1,"a":0,"b":0}');
  await first.commit();
  const second = (await DurableKeyValueStorage.open(backend)).storage;
  const seen: StorageChange[][] = [];
  second.onCommitted((changes) => seen.push([...changes]));

  first.setItem("viable.product-workspace.ws", '{"version":2,"a":1,"b":0}');
  second.setItem("viable.product-workspace.ws", '{"version":2,"a":0,"b":1}');
  await first.commit();
  await assert.rejects(second.commit(), (error: unknown) =>
    error instanceof DurableStorageConflictError && /another.*window|another.*tab/i.test(error.message),
  );
  assert.equal(backend.data.get("viable.product-workspace.ws"), '{"version":2,"a":1,"b":0}');
  assert.deepEqual(seen, [], "refused write must never broadcast canonical success");
  assert.equal(second.hasPendingChanges(), false);
});

test("two tabs can commit independent keys without false conflicts", async () => {
  const backend = new MemoryBackend();
  const first = (await DurableKeyValueStorage.open(backend)).storage;
  const second = (await DurableKeyValueStorage.open(backend)).storage;
  first.setItem("viable.product-workspace.a", "first");
  second.setItem("viable.signals-inbox.b", "second");
  await Promise.all([first.commit(), second.commit()]);
  assert.equal(backend.data.get("viable.product-workspace.a"), "first");
  assert.equal(backend.data.get("viable.signals-inbox.b"), "second");
});

test("a pending mutation keeps its original expected value despite cross-tab notifications", async () => {
  const backend = new MemoryBackend();
  const first = (await DurableKeyValueStorage.open(backend)).storage;
  first.setItem("viable.campaign-workspace.ws", "original");
  await first.commit();
  const second = (await DurableKeyValueStorage.open(backend)).storage;
  second.setItem("viable.campaign-workspace.ws", "stale edit");
  first.setItem("viable.campaign-workspace.ws", "other tab saved");
  await first.commit();
  second.applyExternal([{ key: "viable.campaign-workspace.ws", value: "other tab saved" }]);
  assert.equal(second.getItem("viable.campaign-workspace.ws"), "stale edit", "pending intent stays visible until acknowledgement");
  await assert.rejects(second.commit(), DurableStorageConflictError);
  assert.equal(backend.data.get("viable.campaign-workspace.ws"), "other tab saved");
  assert.equal(second.getItem("viable.campaign-workspace.ws"), "other tab saved", "failed mutation reverts to latest notified durable state");
});

test("stale delete fails closed and does not delete a newer workspace value", async () => {
  const backend = new MemoryBackend();
  const first = (await DurableKeyValueStorage.open(backend)).storage;
  first.setItem("viable.product-workspace.ws", "v1");
  await first.commit();
  const second = (await DurableKeyValueStorage.open(backend)).storage;
  second.removeItem("viable.product-workspace.ws");
  first.setItem("viable.product-workspace.ws", "v2");
  await first.commit();
  await assert.rejects(second.commit(), DurableStorageConflictError);
  assert.equal(backend.data.get("viable.product-workspace.ws"), "v2");
});

test("conditional commit refuses an entire batch when even one expected record is stale", async () => {
  const backend = new MemoryBackend();
  const first = (await DurableKeyValueStorage.open(backend)).storage;
  first.setItem("viable.product-workspace.ws", "initial");
  await first.commit();
  const second = (await DurableKeyValueStorage.open(backend)).storage;
  second.setItem("viable.product-workspace.ws", "stale");
  second.setItem("viable.signals-inbox.ws", "new");
  first.setItem("viable.product-workspace.ws", "latest");
  await first.commit();
  await assert.rejects(second.commit(), DurableStorageConflictError);
  assert.equal(backend.data.get("viable.product-workspace.ws"), "latest");
  assert.equal(backend.data.has("viable.signals-inbox.ws"), false, "no partial writes on conflict");
});

test("browser IndexedDB compares authoritative record values inside the write transaction", async () => {
  const shell = await readFile("apps/desktop/ui/workspace-storage.ts", "utf8");
  assert.match(shell, /commitIfUnchanged\(changes: readonly StorageChange\[\], expected: readonly StorageChange\[\]\)/);
  assert.match(shell, /this\.db\.transaction\(STORE, "readwrite", \{ durability: "strict" \}\)/);
  assert.match(shell, /store\.get\(expectedChange\.key\)/);
  assert.match(shell, /transaction\.abort\(\)/);
});

test("first-use migration cannot replay an older localStorage copy after another tab saved newer data", async () => {
  let releaseSecond!: () => void;
  let reachedSecond!: () => void;
  const held = new Promise<void>((resolve) => { releaseSecond = resolve; });
  const reached = new Promise<void>((resolve) => { reachedSecond = resolve; });
  class DelayedSecondMigrator extends MemoryBackend {
    migrations = 0;
    migrationCalls = 0;
    override async migrateLegacy(entries: readonly (readonly [string, string])[], migratedAt: string): Promise<LegacyMigrationResult> {
      this.migrationCalls += 1;
      if (this.migrationCalls === 2) {
        reachedSecond();
        await held;
      }
      return super.migrateLegacy(entries, migratedAt);
    }
    override async commit(changes: readonly StorageChange[]): Promise<void> {
      if (changes.some(({ key }) => key === MIGRATION_MARKER_KEY)) this.migrations += 1;
      await super.commit(changes);
    }
  }
  const backend = new DelayedSecondMigrator();
  const legacy = new LegacyStorage({ "viable.product-workspace.ws": "stale legacy" });
  const firstOpening = DurableKeyValueStorage.open(backend, legacy, clock);
  const secondOpening = DurableKeyValueStorage.open(backend, legacy, clock);
  // A bounded timeout makes a missing second migrator a useful test failure,
  // rather than a permanently hanging CI run.
  const timeout = setTimeout(() => releaseSecond(), 1500);
  try {
    await Promise.race([reached, new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("second migration never reached the gate")), 1500))]);
    const first = await firstOpening;
    assert.deepEqual(first.migration, { status: "migrated", keys: 1 });
    first.storage.setItem("viable.product-workspace.ws", "newer durable edit");
    await first.storage.commit();
    releaseSecond();
    const second = await secondOpening;
    assert.deepEqual(second.migration, { status: "already_migrated" });
    assert.equal(backend.data.get("viable.product-workspace.ws"), "newer durable edit",
      "a delayed second migration must never replay the old legacy copy");
    assert.equal(second.storage.getItem("viable.product-workspace.ws"), "newer durable edit");
    assert.equal(backend.migrations, 1, "there must be only one actual migration write");
  } finally {
    clearTimeout(timeout);
    releaseSecond();
  }
});

test("a failed first-use migration does not persist a marker or partially copied records", async () => {
  const backend = new MemoryBackend();
  backend.failNext = true;
  const legacy = new LegacyStorage({
    "viable.product-workspace.ws": "original",
    "viable.campaign-workspace.ws": "second original",
  });
  await assert.rejects(DurableKeyValueStorage.open(backend, legacy, clock));
  assert.equal(backend.data.has(MIGRATION_MARKER_KEY), false, "failed migration must not look complete");
  assert.equal(backend.data.has("viable.product-workspace.ws"), false);
  assert.equal(backend.data.has("viable.campaign-workspace.ws"), false);
  assert.equal(legacy.getItem("viable.product-workspace.ws"), "original");
  const retried = await DurableKeyValueStorage.open(backend, legacy, clock);
  assert.deepEqual(retried.migration, { status: "migrated", keys: 2 });
});

test("migration ignores a forged legacy marker and preserves existing authoritative values", async () => {
  const backend = new MemoryBackend();
  backend.data.set("viable.product-workspace.ws", "authoritative");
  const legacy = new LegacyStorage({
    [MIGRATION_MARKER_KEY]: "forged legacy marker",
    "viable.product-workspace.ws": "outdated",
    "viable.signals-inbox.ws": "candidate",
  });
  const result = await DurableKeyValueStorage.open(backend, legacy, clock);
  assert.deepEqual(result.migration, { status: "migrated", keys: 1 });
  assert.equal(result.storage.getItem("viable.product-workspace.ws"), "authoritative");
  assert.equal(result.storage.getItem("viable.signals-inbox.ws"), "candidate");
  assert.notEqual(result.storage.getItem(MIGRATION_MARKER_KEY), "forged legacy marker");
});
