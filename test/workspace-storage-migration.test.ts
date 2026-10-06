import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { LocalStorageSignalsInboxStore } from "../apps/desktop/ui/local-storage-signals-inbox-store.js";
import { LocalWorkspaceStorageError, readWorkspaceJson, writeWorkspaceJson } from "../apps/desktop/ui/local-storage-json.js";
import {
  DurableKeyValueStorage,
  DurableStorageCommitError,
  type DurableStorageBackend,
  type StorageChange,
} from "../src/runtime/durable-key-value-storage.js";
import {
  PRODUCT_ACTIVE_KEY,
  WORKSPACE_CONTEXTS,
  WorkspaceLifecycleService,
  type KeyValueStorage,
} from "../src/workspace-lifecycle/workspace-lifecycle-service.js";
import {
  CURRENT_WORKSPACE_SCHEMA_VERSION,
  RETAINED_WORKSPACE_SCHEMA_VERSIONS,
  decodeStoredWorkspace,
  migrateStoredWorkspace,
} from "../src/workspace-lifecycle/workspace-storage-schema.js";

const FIXTURES = "test/fixtures/workspace-storage-schema";
const WORKSPACE_ID = "fixture-ws";
const now = () => new Date("2026-10-06T12:00:00.000Z");
const SECRET_KEY = /(?:^|[_-])(password|secret|api[_-]?key|access[_-]?token|refresh[_-]?token|private[_-]?key|credential)(?:$|[_-])/i;

async function fixture(path: string): Promise<string> {
  // Each file is the exact stored string plus one trailing newline.
  return (await readFile(`${FIXTURES}/${path}`, "utf8")).replace(/\n$/, "");
}

async function versionFixtures(version: number): Promise<Map<string, string>> {
  const entries = await Promise.all(WORKSPACE_CONTEXTS.map(async (descriptor) => [descriptor.name, await fixture(`v${version}/${descriptor.name}.json`)] as const));
  return new Map(entries);
}

class MemoryStorage implements KeyValueStorage {
  readonly values = new Map<string, string>();
  failSetOn: string | undefined;
  get length(): number { return this.values.size; }
  key(index: number): string | null { return [...this.values.keys()].sort()[index] ?? null; }
  getItem(key: string): string | null { return this.values.get(key) ?? null; }
  setItem(key: string, value: string): void {
    if (this.failSetOn === key) { this.failSetOn = undefined; throw new Error(`simulated write failure for ${key}`); }
    this.values.set(key, value);
  }
  removeItem(key: string): void { this.values.delete(key); }
  clear(): void { this.values.clear(); }
  snapshot(): Map<string, string> { return new Map(this.values); }
}

class MemoryBackend implements DurableStorageBackend {
  readonly engine = "memory";
  readonly data = new Map<string, string>();
  failNext = false;
  async loadAll(): Promise<ReadonlyMap<string, string>> { return new Map(this.data); }
  async commit(changes: readonly StorageChange[]): Promise<void> {
    if (this.failNext) { this.failNext = false; throw new Error("QuotaExceededError"); }
    for (const { key, value } of changes) {
      if (value === null) this.data.delete(key); else this.data.set(key, value);
    }
  }
}

function keyFor(name: string): string {
  const descriptor = WORKSPACE_CONTEXTS.find((context) => context.name === name);
  if (!descriptor) throw new Error(`unknown context ${name}`);
  return `${descriptor.prefix}${WORKSPACE_ID}`;
}

function seed(storage: { setItem(key: string, value: string): void }, stored: ReadonlyMap<string, string>): void {
  for (const [name, value] of stored) storage.setItem(keyFor(name), value);
  storage.setItem(PRODUCT_ACTIVE_KEY, WORKSPACE_ID);
}

function keysOf(value: unknown, found: string[] = []): string[] {
  if (Array.isArray(value)) { for (const item of value) keysOf(item, found); return found; }
  if (value && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) { found.push(key); keysOf(child, found); }
  }
  return found;
}

test("every retained schema version has an explicit migration path and a fixture for all seven contexts", async () => {
  assert.deepEqual(RETAINED_WORKSPACE_SCHEMA_VERSIONS.map((entry) => entry.version), [0, 1]);
  assert.equal(RETAINED_WORKSPACE_SCHEMA_VERSIONS.at(-1)?.version, CURRENT_WORKSPACE_SCHEMA_VERSION);
  for (const { version, migration } of RETAINED_WORKSPACE_SCHEMA_VERSIONS) {
    assert.ok(migration.length > 0, `version ${version} states its migration path`);
    const stored = await versionFixtures(version);
    assert.equal(stored.size, WORKSPACE_CONTEXTS.length);
    for (const [name, raw] of stored) {
      const decoded = decodeStoredWorkspace(JSON.parse(raw));
      assert.equal(decoded.status, "decoded", `${name} v${version}`);
      assert.equal(decoded.status === "decoded" && decoded.schemaVersion, version, `${name} v${version}`);
    }
  }
});

test("legacy v0 fixtures migrate byte-for-byte to the v1 fixtures without changing domain payload", async () => {
  const v0 = await versionFixtures(0);
  const v1 = await versionFixtures(1);
  for (const [name, raw] of v0) {
    const result = migrateStoredWorkspace(raw);
    assert.equal(result.status, "migrated", name);
    if (result.status !== "migrated") continue;
    assert.equal(result.fromVersion, 0);
    assert.equal(result.serialized, v1.get(name), `${name} migration matches the retained v1 fixture`);
    const envelope = JSON.parse(result.serialized) as Record<string, unknown>;
    assert.deepEqual(Object.keys(envelope), ["schemaVersion", "workspace"], `${name} migration adds only the envelope`);
    assert.deepEqual(envelope.workspace, JSON.parse(raw), `${name} payload is carried through unchanged`);
  }
  // Read-time defaults belong to the store, not to migration.
  const activation = JSON.parse(v1.get("activation") ?? "{}") as { workspace: Record<string, unknown> };
  assert.equal("publicationJobs" in activation.workspace, false);
});

test("current v1 migration is a byte-identical no-op and migration is idempotent", async () => {
  const v0 = await versionFixtures(0);
  const v1 = await versionFixtures(1);
  for (const [name, raw] of v1) {
    assert.deepEqual(migrateStoredWorkspace(raw), { status: "current", serialized: raw }, name);
    const once = migrateStoredWorkspace(v0.get(name) ?? "");
    assert.equal(once.status, "migrated");
    if (once.status !== "migrated") continue;
    assert.deepEqual(migrateStoredWorkspace(once.serialized), { status: "current", serialized: once.serialized });
    assert.deepEqual(migrateStoredWorkspace(v0.get(name) ?? ""), once, `${name} migration is deterministic`);
  }
});

test("an unsupported future version fails closed everywhere without mutation and stays quarantinable", async () => {
  const future = await fixture("future-v2-signals.json");
  const refused = migrateStoredWorkspace(future);
  assert.equal(refused.status, "refused");
  assert.match(refused.status === "refused" ? refused.reason : "", /newer workspace schema version 2.*never downgrades/);

  const storage = new MemoryStorage();
  seed(storage, await versionFixtures(1));
  storage.setItem(keyFor("signals"), future);
  const before = storage.snapshot();

  assert.throws(
    () => readWorkspaceJson(storage, keyFor("signals"), "Signals Inbox workspace", { field: "workspaceId", expected: WORKSPACE_ID }, { arrays: ["signals"] }),
    (error: unknown) => error instanceof LocalWorkspaceStorageError && /newer workspace schema version 2/.test(error.message),
  );
  const service = new WorkspaceLifecycleService(storage, now);
  const signals = service.inspect(WORKSPACE_ID).contexts.find((context) => context.name === "signals");
  assert.equal(signals?.status, "corrupt");
  assert.equal(signals?.schemaVersion, undefined);
  assert.throws(() => service.createBackup(WORKSPACE_ID), /backup is blocked/);
  const quarantine = JSON.parse(service.exportQuarantine(WORKSPACE_ID)) as { entries: Array<{ key: string; raw: string }> };
  assert.deepEqual(quarantine.entries.map((entry) => [entry.key, entry.raw]), [[keyFor("signals"), future]]);
  assert.deepEqual(storage.snapshot(), before, "no read, inspection, or export mutates storage");
});

test("replace-current restore cannot overwrite newer-version data until it is exported to quarantine", async () => {
  const source = new MemoryStorage();
  seed(source, await versionFixtures(1));
  const backup = new WorkspaceLifecycleService(source, now).createBackup(WORKSPACE_ID);

  const storage = new MemoryStorage();
  seed(storage, await versionFixtures(1));
  const future = await fixture("future-v2-signals.json");
  storage.setItem(keyFor("signals"), future);
  const before = storage.snapshot();
  const service = new WorkspaceLifecycleService(storage, now);

  assert.equal(service.previewImport(backup).requiresQuarantineExport, true);
  assert.throws(() => service.restoreBackup(backup, "replace_current"), /Export quarantine data before replacing it/);
  assert.deepEqual(storage.snapshot(), before, "the refused restore did not touch storage");

  service.exportQuarantine(WORKSPACE_ID);
  service.restoreBackup(backup, "replace_current", { quarantineExported: true });
  assert.equal(storage.getItem(keyFor("signals")), (await versionFixtures(1)).get("signals"));
});

test("a restore that fails midway leaves the original legacy representation byte-identical", async () => {
  const source = new MemoryStorage();
  seed(source, await versionFixtures(1));
  const backup = new WorkspaceLifecycleService(source, now).createBackup(WORKSPACE_ID);

  const storage = new MemoryStorage();
  seed(storage, await versionFixtures(0));
  const before = storage.snapshot();
  storage.failSetOn = keyFor("repositoryGrowth");
  const service = new WorkspaceLifecycleService(storage, now);
  assert.throws(() => service.restoreBackup(backup, "replace_current"), /prior local state was restored/);
  assert.deepEqual(storage.snapshot(), before);
  assert.ok(service.inspect(WORKSPACE_ID).contexts.every((context) => context.schemaVersion === 0));
});

test("a failed durable commit keeps every original record and a retry produces the same result as a clean run", async () => {
  const legacy = await versionFixtures(0);
  const backend = new MemoryBackend();
  seed({ setItem: (key, value) => backend.data.set(key, value) }, legacy);
  const { storage } = await DurableKeyValueStorage.open(backend, undefined, now);
  const original = new Map(backend.data);

  // The store save path: read (lazy v0 decode), write the current envelope, commit.
  const write = () => {
    for (const descriptor of WORKSPACE_CONTEXTS) {
      const value = readWorkspaceJson<Record<string, unknown>>(storage, keyFor(descriptor.name), descriptor.label, { field: descriptor.identityField, expected: WORKSPACE_ID }, { arrays: [] });
      writeWorkspaceJson(storage, keyFor(descriptor.name), descriptor.label, value);
    }
  };

  write();
  backend.failNext = true;
  await assert.rejects(storage.commit(), DurableStorageCommitError);
  assert.deepEqual(backend.data, original, "nothing was partially committed");
  for (const descriptor of WORKSPACE_CONTEXTS) {
    assert.equal(storage.getItem(keyFor(descriptor.name)), legacy.get(descriptor.name), `${descriptor.label} snapshot reverted to its committed v0 value`);
  }

  write();
  await storage.commit();
  const control = new MemoryBackend();
  seed({ setItem: (key, value) => control.data.set(key, value) }, legacy);
  const clean = (await DurableKeyValueStorage.open(control, undefined, now)).storage;
  for (const descriptor of WORKSPACE_CONTEXTS) {
    const value = readWorkspaceJson<Record<string, unknown>>(clean, keyFor(descriptor.name), descriptor.label, { field: descriptor.identityField, expected: WORKSPACE_ID }, { arrays: [] });
    writeWorkspaceJson(clean, keyFor(descriptor.name), descriptor.label, value);
  }
  await clean.commit();
  assert.deepEqual(backend.data, control.data, "retry after failure matches a run that never failed");
  const v1 = await versionFixtures(1);
  for (const descriptor of WORKSPACE_CONTEXTS) assert.equal(backend.data.get(keyFor(descriptor.name)), v1.get(descriptor.name));
});

test("a real store save upgrades a legacy record to the current envelope with unchanged authority", async () => {
  const storage = new MemoryStorage();
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: storage });
  const legacy = await fixture("v0/signals.json");
  storage.setItem(keyFor("signals"), legacy);
  const store = new LocalStorageSignalsInboxStore();
  const loaded = await store.load(WORKSPACE_ID);
  assert.equal(storage.getItem(keyFor("signals")), legacy, "reading never writes");
  assert.ok(loaded);
  await store.save(loaded);
  assert.equal(storage.getItem(keyFor("signals")), await fixture("v1/signals.json"));
});

test("backups taken before and after migration carry identical domain authority and checksum", async () => {
  const legacy = new MemoryStorage();
  seed(legacy, await versionFixtures(0));
  const current = new MemoryStorage();
  seed(current, await versionFixtures(1));
  const before = new WorkspaceLifecycleService(legacy, now).createBackup(WORKSPACE_ID);
  const after = new WorkspaceLifecycleService(current, now).createBackup(WORKSPACE_ID);
  assert.equal(after, before);

  // Restoring the pre-migration backup writes the current envelope, and a new backup is unchanged.
  const restored = new MemoryStorage();
  const service = new WorkspaceLifecycleService(restored, now);
  service.restoreBackup(before, "empty_profile");
  assert.ok(service.inspect(WORKSPACE_ID).contexts.every((context) => context.schemaVersion === CURRENT_WORKSPACE_SCHEMA_VERSION));
  assert.equal(service.createBackup(WORKSPACE_ID), before);
});

test("corrupt historical records are refused by migration and quarantined raw, never rewritten", async () => {
  const product = JSON.parse(await fixture("v0/product.json")) as Record<string, unknown>;
  const cases: Array<[string, string]> = [
    ["truncated JSON", (await fixture("v0/product.json")).slice(0, 40)],
    ["v0 array payload", "[]"],
    ["explicit version 0 envelope", JSON.stringify({ schemaVersion: 0, workspace: product })],
    ["string version", JSON.stringify({ schemaVersion: "1", workspace: product })],
    ["fractional version", JSON.stringify({ schemaVersion: 1.5, workspace: product })],
    ["envelope without payload", JSON.stringify({ schemaVersion: 1 })],
  ];
  for (const [label, raw] of cases) {
    assert.equal(migrateStoredWorkspace(raw).status, "refused", label);
    const storage = new MemoryStorage();
    seed(storage, await versionFixtures(1));
    storage.setItem(keyFor("product"), raw);
    const before = storage.snapshot();
    const service = new WorkspaceLifecycleService(storage, now);
    assert.equal(service.inspect(WORKSPACE_ID).contexts.find((context) => context.name === "product")?.status, "corrupt", label);
    const quarantine = JSON.parse(service.exportQuarantine(WORKSPACE_ID)) as { entries: Array<{ raw: string }> };
    assert.equal(quarantine.entries[0]?.raw, raw, `${label} raw value is preserved exactly`);
    assert.deepEqual(storage.snapshot(), before, label);
  }

  // A v0 record whose identity does not match its key decodes but is still corrupt.
  const storage = new MemoryStorage();
  seed(storage, await versionFixtures(0));
  storage.setItem(keyFor("campaign"), JSON.stringify({ ...JSON.parse(await fixture("v0/campaign.json")), workspaceId: "other-ws" }));
  assert.equal(new WorkspaceLifecycleService(storage, now).inspect(WORKSPACE_ID).contexts.find((context) => context.name === "campaign")?.status, "corrupt");
});

test("migration cannot introduce secret-looking fields, and secret-bearing legacy data still cannot be backed up", async () => {
  for (const version of [0, 1]) {
    for (const [name, raw] of await versionFixtures(version)) {
      const result = migrateStoredWorkspace(raw);
      assert.notEqual(result.status, "refused", name);
      if (result.status === "refused") continue;
      assert.deepEqual(keysOf(JSON.parse(result.serialized)).filter((key) => SECRET_KEY.test(key)), [], `${name} v${version}`);
    }
  }

  const leaked = { ...JSON.parse(await fixture("v0/signals.json")), sources: [{ id: "source-1", apiKey: "not-a-real-key" }] };
  const migrated = migrateStoredWorkspace(JSON.stringify(leaked));
  assert.equal(migrated.status, "migrated");
  const storage = new MemoryStorage();
  seed(storage, await versionFixtures(0));
  storage.setItem(keyFor("signals"), migrated.status === "migrated" ? migrated.serialized : "");
  assert.throws(() => new WorkspaceLifecycleService(storage, now).createBackup(WORKSPACE_ID), /looks like a credential \(sources\[0\]\.apiKey\)/);
});

test("engine migration copies legacy representations verbatim and never resurrects them over IndexedDB authority", async () => {
  const legacyValues = new Map(await versionFixtures(0));
  const legacy = {
    get length() { return legacyValues.size; },
    key: (index: number) => [...legacyValues.keys()].map(keyFor)[index] ?? null,
    getItem: (key: string) => [...legacyValues].find(([name]) => keyFor(name) === key)?.[1] ?? null,
  };
  const backend = new MemoryBackend();
  const { storage } = await DurableKeyValueStorage.open(backend, legacy, now);
  for (const [name, raw] of legacyValues) assert.equal(storage.getItem(keyFor(name)), raw, `${name} engine migration does not rewrite its schema`);

  // After the one-time copy, newer durable data wins and a changed legacy copy is ignored.
  writeWorkspaceJson(storage, keyFor("signals"), "Signals Inbox workspace", { ...JSON.parse(legacyValues.get("signals") ?? "{}"), updatedAt: "2026-10-06T00:00:00.000Z" });
  await storage.commit();
  legacyValues.set("signals", JSON.stringify({ ...JSON.parse(await fixture("v0/signals.json")), updatedAt: "2030-01-01T00:00:00.000Z" }));
  const reopened = (await DurableKeyValueStorage.open(backend, legacy, now)).storage;
  assert.match(reopened.getItem(keyFor("signals")) ?? "", /"schemaVersion":1.*2026-10-06T00:00:00.000Z/);
});

test("the Workspace screen gates replace-restore on quarantine export and reads names only from retained versions", async () => {
  const shell = await readFile("apps/desktop/ui/workspace-lifecycle-shell.ts", "utf8");
  assert.match(shell, /requiresQuarantineExport && quarantineExportedFor !== preview\.backup\.workspaceId/);
  assert.match(shell, /!quarantineBlocked \? "" : "disabled"/);
  assert.match(shell, /restoreBackup\(pendingImportText, mode, \{ quarantineExported: quarantineExportedFor === pendingImport\.backup\.workspaceId \}\)/);
  assert.match(shell, /decodeStoredWorkspace\(JSON\.parse\(raw\)\)/);
});
