import assert from "node:assert/strict";
import test from "node:test";
import {
  PRODUCT_ACTIVE_KEY,
  WORKSPACE_CONTEXTS,
  WORKSPACE_STORAGE_SCHEMA_VERSION,
  WorkspaceLifecycleService,
  type KeyValueStorage,
} from "../src/workspace-lifecycle/workspace-lifecycle-service.js";
import { CURRENT_WORKSPACE_SCHEMA_VERSION, readWorkspaceJson, writeWorkspaceJson } from "../apps/desktop/ui/local-storage-json.js";

class MemoryStorage implements KeyValueStorage {
  private readonly values = new Map<string, string>();
  failSetOnce: string | undefined;
  failRemoveOnce: string | undefined;

  get length(): number { return this.values.size; }
  key(index: number): string | null { return [...this.values.keys()].sort()[index] ?? null; }
  getItem(key: string): string | null { return this.values.get(key) ?? null; }
  setItem(key: string, value: string): void {
    if (this.failSetOnce === key) { this.failSetOnce = undefined; throw new Error(`simulated set failure for ${key}`); }
    this.values.set(key, value);
  }
  removeItem(key: string): void {
    if (this.failRemoveOnce === key) { this.failRemoveOnce = undefined; throw new Error(`simulated remove failure for ${key}`); }
    this.values.delete(key);
  }
  entries(): readonly [string, string][] { return [...this.values.entries()].sort(([left], [right]) => left.localeCompare(right)); }
}

const now = () => new Date("2026-09-24T20:00:00.000Z");

function contextValue(name: string, workspaceId: string): Record<string, unknown> {
  switch (name) {
    case "product": return {
      id: workspaceId,
      createdAt: "2026-09-24T12:00:00.000Z",
      createdBy: "Kevin",
      product: { identity: { name: "Viable", description: "Local-first marketability OS" }, revision: 4 },
      claims: [{ id: "claim-1" }], evidence: [{ id: "evidence-1" }], icpHypotheses: [{ id: "icp-1" }], assessments: [], actions: [],
      drafts: { icp: { kind: "icp", name: "Draft audience" } },
    };
    case "campaign": return { workspaceId, campaigns: [{ id: "campaign-1" }], contentBriefs: [], assets: [{ id: "asset-1" }], variants: [], exports: [{ id: "export-1" }], updatedAt: now().toISOString() };
    case "signals": return { workspaceId, sources: [], sourceHealth: [], signals: [{ id: "signal-1" }], conversions: [], updatedAt: now().toISOString() };
    case "activation": return { workspaceId, destinations: [], calendarEntries: [{ id: "entry-1" }], packages: [], exportOperations: [], deliveryOutcomes: [], measurementPlans: [], performanceImports: [], retrospectives: [], learningLedger: [], updatedAt: now().toISOString() };
    case "repositoryGrowth": return { workspaceId, repositories: [{ id: "repo-1" }], assessments: [], plans: [], launchRooms: [], exports: [], retrospectives: [], updatedAt: now().toISOString() };
    case "videoProduction": return { workspaceId, tools: [], briefs: [{ id: "video-brief-1" }], packages: [], artifacts: [], variants: [], updatedAt: now().toISOString() };
    case "websiteWatch": return { workspaceId, sources: [], sourceHealth: [], sites: [{ id: "site-1" }], targets: [], snapshots: [], observations: [], generatedAnalyses: [], updatedAt: now().toISOString() };
    default: throw new Error(`Unknown test context ${name}`);
  }
}

function seedWorkspace(storage: MemoryStorage, workspaceId: string): void {
  for (const descriptor of WORKSPACE_CONTEXTS) storage.setItem(`${descriptor.prefix}${workspaceId}`, JSON.stringify(contextValue(descriptor.name, workspaceId)));
  storage.setItem(PRODUCT_ACTIVE_KEY, workspaceId);
}

test("workspace preview enumerates every product context and makes retention scope explicit", () => {
  const storage = new MemoryStorage();
  seedWorkspace(storage, "workspace-1");
  const preview = new WorkspaceLifecycleService(storage, now).inspect("workspace-1");
  assert.equal(preview.contexts.length, 7);
  assert.ok(preview.contexts.every((context) => context.status === "present"));
  assert.equal(preview.totalRecords, 11);
  assert.equal(preview.active, true);
  assert.deepEqual(preview.anonymized, []);
  assert.match(preview.retainedOutsideWorkspace.join(" "), /User-exported backup files/);
});

test("backup round-trip validates integrity and restores all contexts into an empty profile", () => {
  const source = new MemoryStorage();
  seedWorkspace(source, "workspace-1");
  const sourceService = new WorkspaceLifecycleService(source, now);
  const backup = sourceService.createBackup("workspace-1");
  const parsed = sourceService.validateBackup(backup);
  assert.equal(parsed.workspaceId, "workspace-1");
  assert.match(parsed.checksum, /^crc32:/);

  const target = new MemoryStorage();
  const targetService = new WorkspaceLifecycleService(target, now);
  const importPreview = targetService.previewImport(backup);
  assert.equal(importPreview.canRestoreIntoEmptyProfile, true);
  const restored = targetService.restoreBackup(backup, "empty_profile");
  assert.equal(restored.contexts.filter((context) => context.status === "present").length, 7);
  assert.equal(target.getItem(PRODUCT_ACTIVE_KEY), "workspace-1");
});

test("legacy campaign workspace without additive content briefs remains backup-compatible", () => {
  const storage = new MemoryStorage();
  seedWorkspace(storage, "workspace-1");
  const campaignKey = `${WORKSPACE_CONTEXTS[1].prefix}workspace-1`;
  const campaign = JSON.parse(storage.getItem(campaignKey)!) as Record<string, unknown>;
  delete campaign.contentBriefs;
  storage.setItem(campaignKey, JSON.stringify(campaign));
  const service = new WorkspaceLifecycleService(storage, now);
  const preview = service.inspect("workspace-1");
  assert.equal(preview.contexts.find((item) => item.name === "campaign")?.status, "present");
  assert.doesNotThrow(() => service.validateBackup(service.createBackup("workspace-1")));
});

test("modified backup is rejected before any restore mutation", () => {
  const source = new MemoryStorage();
  seedWorkspace(source, "workspace-1");
  const backup = new WorkspaceLifecycleService(source, now).createBackup("workspace-1");
  const tampered = JSON.parse(backup) as { contexts: { product: { product: { revision: number } } } };
  tampered.contexts.product.product.revision = 999;
  const text = JSON.stringify(tampered);

  const target = new MemoryStorage();
  target.setItem("unrelated.preference", "keep-me");
  const before = target.entries();
  assert.throws(() => new WorkspaceLifecycleService(target, now).restoreBackup(text, "empty_profile"), /integrity check failed/);
  assert.deepEqual(target.entries(), before);
});

test("malformed optional additive backup field is rejected before any restore mutation", () => {
  const source = new MemoryStorage();
  seedWorkspace(source, "workspace-1");
  const backup = new WorkspaceLifecycleService(source, now).createBackup("workspace-1");
  const malformed = JSON.parse(backup) as { contexts: { campaign: Record<string, unknown> } };
  malformed.contexts.campaign.contentBriefs = "not-an-array";

  const target = new MemoryStorage();
  target.setItem("unrelated.preference", "keep-me");
  const before = target.entries();
  assert.throws(() => new WorkspaceLifecycleService(target, now).restoreBackup(JSON.stringify(malformed), "empty_profile"), /Campaigns and exports optional field contentBriefs must be an array when present/);
  assert.deepEqual(target.entries(), before);
});

test("backup refuses credential-like fields instead of exporting them", () => {
  const storage = new MemoryStorage();
  seedWorkspace(storage, "workspace-1");
  const productKey = `${WORKSPACE_CONTEXTS[0].prefix}workspace-1`;
  const product = JSON.parse(storage.getItem(productKey)!) as Record<string, unknown>;
  product["api_key"] = "should-not-export";
  storage.setItem(productKey, JSON.stringify(product));
  assert.throws(() => new WorkspaceLifecycleService(storage, now).createBackup("workspace-1"), /backups do not export secrets/);
});

test("restore into an existing different workspace is blocked without mutation", () => {
  const source = new MemoryStorage();
  seedWorkspace(source, "workspace-1");
  const backup = new WorkspaceLifecycleService(source, now).createBackup("workspace-1");

  const target = new MemoryStorage();
  seedWorkspace(target, "workspace-2");
  const before = target.entries();
  const service = new WorkspaceLifecycleService(target, now);
  const preview = service.previewImport(backup);
  assert.equal(preview.canReplaceCurrentWorkspace, false);
  assert.match(preview.conflict ?? "", /different workspace/);
  assert.throws(() => service.restoreBackup(backup, "replace_current"), /different workspace/);
  assert.deepEqual(target.entries(), before);
});

test("replace-current restore rolls back all prior context values when one write fails", () => {
  const source = new MemoryStorage();
  seedWorkspace(source, "workspace-1");
  const productKey = `${WORKSPACE_CONTEXTS[0].prefix}workspace-1`;
  const sourceProduct = JSON.parse(source.getItem(productKey)!) as { product: { revision: number } };
  sourceProduct.product.revision = 10;
  source.setItem(productKey, JSON.stringify(sourceProduct));
  const backup = new WorkspaceLifecycleService(source, now).createBackup("workspace-1");

  const target = new MemoryStorage();
  seedWorkspace(target, "workspace-1");
  const before = target.entries();
  target.failSetOnce = `${WORKSPACE_CONTEXTS[1].prefix}workspace-1`;
  assert.throws(() => new WorkspaceLifecycleService(target, now).restoreBackup(backup, "replace_current", { recoveryPoint: { kind: "declined" } }), /prior local state was restored/);
  assert.deepEqual(target.entries(), before);
});

test("product-wide deletion removes all workspace contexts and active pointer while retaining unrelated preferences", () => {
  const storage = new MemoryStorage();
  seedWorkspace(storage, "workspace-1");
  storage.setItem("unrelated.preference", "keep-me");
  const service = new WorkspaceLifecycleService(storage, now);
  const deleted = service.deleteWorkspace("workspace-1", { recoveryPoint: { kind: "declined" } });
  assert.equal(deleted.contexts.length, 7);
  assert.equal(storage.getItem(PRODUCT_ACTIVE_KEY), null);
  assert.ok(WORKSPACE_CONTEXTS.every((descriptor) => storage.getItem(`${descriptor.prefix}workspace-1`) === null));
  assert.equal(storage.getItem("unrelated.preference"), "keep-me");
});

test("failed product-wide deletion rolls back already removed contexts", () => {
  const storage = new MemoryStorage();
  seedWorkspace(storage, "workspace-1");
  const before = storage.entries();
  storage.failRemoveOnce = `${WORKSPACE_CONTEXTS[2].prefix}workspace-1`;
  assert.throws(() => new WorkspaceLifecycleService(storage, now).deleteWorkspace("workspace-1", { recoveryPoint: { kind: "declined" } }), /prior local state was restored/);
  assert.deepEqual(storage.entries(), before);
});

test("malformed stored context is treated as corrupt instead of valid workspace state", () => {
  const storage = new MemoryStorage();
  seedWorkspace(storage, "workspace-1");
  const campaignKey = `${WORKSPACE_CONTEXTS[1].prefix}workspace-1`;
  const campaign = JSON.parse(storage.getItem(campaignKey)!) as Record<string, unknown>;
  campaign.campaigns = "not-an-array";
  storage.setItem(campaignKey, JSON.stringify(campaign));
  const preview = new WorkspaceLifecycleService(storage, now).inspect("workspace-1");
  const context = preview.contexts.find((item) => item.name === "campaign");
  assert.equal(context?.status, "corrupt");
  assert.match(context?.issue ?? "", /campaigns must be an array/);
});

test("corrupt context is previewed and exportable as quarantine without destructive mutation", () => {
  const storage = new MemoryStorage();
  seedWorkspace(storage, "workspace-1");
  const signalsKey = `${WORKSPACE_CONTEXTS[2].prefix}workspace-1`;
  storage.setItem(signalsKey, "{broken-json");
  const before = storage.entries();
  const service = new WorkspaceLifecycleService(storage, now);
  const preview = service.inspect("workspace-1");
  assert.equal(preview.hasCorruptData, true);
  assert.equal(preview.contexts.find((context) => context.name === "signals")?.status, "corrupt");
  assert.throws(() => service.createBackup("workspace-1"), /quarantine/);
  const quarantine = JSON.parse(service.exportQuarantine("workspace-1")) as { format: string; entries: readonly { raw: string }[] };
  assert.equal(quarantine.format, "viable.workspace-quarantine");
  assert.equal(quarantine.entries[0]?.raw, "{broken-json");
  assert.deepEqual(storage.entries(), before);
});

// Regression: stores write a { schemaVersion, workspace } envelope (PR #62),
// but the lifecycle service parsed values as legacy unwrapped objects, so every
// current workspace looked corrupt and backup/deletion were blocked.
function seedEnvelopedWorkspace(storage: MemoryStorage, workspaceId: string): void {
  for (const descriptor of WORKSPACE_CONTEXTS) {
    writeWorkspaceJson(storage, `${descriptor.prefix}${workspaceId}`, descriptor.label, contextValue(descriptor.name, workspaceId));
  }
  storage.setItem(PRODUCT_ACTIVE_KEY, workspaceId);
}

test("lifecycle envelope version matches the store adapters' current schema version", () => {
  assert.equal(WORKSPACE_STORAGE_SCHEMA_VERSION, CURRENT_WORKSPACE_SCHEMA_VERSION);
});

test("workspaces saved by the real store adapters are present, backed up unwrapped, and restored as current envelopes", () => {
  const source = new MemoryStorage();
  seedEnvelopedWorkspace(source, "ws-current");
  const service = new WorkspaceLifecycleService(source, now);

  const preview = service.inspect("ws-current");
  assert.equal(preview.hasCorruptData, false);
  assert.ok(preview.contexts.every((context) => context.status === "present"));

  const backup = JSON.parse(service.createBackup("ws-current")) as { contexts: Record<string, Record<string, unknown>> };
  assert.equal(backup.contexts.product?.id, "ws-current");
  assert.equal("schemaVersion" in (backup.contexts.product ?? {}), false, "backups carry domain values, not storage envelopes");

  const target = new MemoryStorage();
  new WorkspaceLifecycleService(target, now).restoreBackup(JSON.stringify(backup), "empty_profile");
  const stored = JSON.parse(target.getItem("viable.product-workspace.ws-current") ?? "{}") as { schemaVersion?: number };
  assert.equal(stored.schemaVersion, CURRENT_WORKSPACE_SCHEMA_VERSION);
  const readBack = readWorkspaceJson<{ id: string }>(target, "viable.product-workspace.ws-current", "Product workspace", { field: "id", expected: "ws-current" }, { arrays: ["claims"] });
  assert.equal(readBack?.id, "ws-current");
});

test("workspace deletion works for workspaces saved in the current envelope", () => {
  const storage = new MemoryStorage();
  seedEnvelopedWorkspace(storage, "ws-delete");
  const service = new WorkspaceLifecycleService(storage, now);
  service.deleteWorkspace("ws-delete", { recoveryPoint: { kind: "declined" } });
  assert.equal(service.knownWorkspaceIds().has("ws-delete"), false);
});

test("unsupported future envelope versions are corrupt and quarantinable, never treated as valid", () => {
  const storage = new MemoryStorage();
  seedEnvelopedWorkspace(storage, "ws-future");
  const key = "viable.signals-inbox.ws-future";
  const future = JSON.stringify({ schemaVersion: WORKSPACE_STORAGE_SCHEMA_VERSION + 1, workspace: contextValue("signals", "ws-future") });
  storage.setItem(key, future);
  const service = new WorkspaceLifecycleService(storage, now);
  const signals = service.inspect("ws-future").contexts.find((context) => context.name === "signals");
  assert.equal(signals?.status, "corrupt");
  assert.throws(() => service.createBackup("ws-future"), /backup is blocked/);
  const quarantine = JSON.parse(service.exportQuarantine("ws-future")) as { entries: Array<{ raw: string; issue: string }> };
  assert.equal(quarantine.entries[0]?.raw, future);
  assert.match(quarantine.entries[0]?.issue ?? "", /unsupported workspace schema version 2/);
});

test("destructive actions refuse to run without an explicit recovery-point decision", () => {
  const storage = new MemoryStorage();
  seedWorkspace(storage, "workspace-1");
  const service = new WorkspaceLifecycleService(storage, now);
  const backup = service.createBackup("workspace-1");
  const before = storage.entries();
  assert.throws(() => service.deleteWorkspace("workspace-1"), /recovery point[\s\S]*Nothing was changed/);
  assert.throws(() => service.restoreBackup(backup, "replace_current"), /recovery point[\s\S]*Nothing was changed/);
  assert.deepEqual(storage.entries(), before);
});

test("a recovery point restores exactly the workspace a deletion removed", () => {
  const storage = new MemoryStorage();
  seedWorkspace(storage, "workspace-1");
  const service = new WorkspaceLifecycleService(storage, now);
  const point = service.createRecoveryPoint("workspace-1");
  const captured = service.validateBackup(point.backup);
  assert.equal(captured.workspaceId, "workspace-1", "a recovery point is an ordinary validated backup");
  service.deleteWorkspace("workspace-1", { recoveryPoint: { kind: "downloaded", fingerprint: point.fingerprint } });
  assert.equal(storage.length, 0);
  service.restoreBackup(point.backup, "empty_profile");
  assert.deepEqual(service.validateBackup(service.createBackup("workspace-1")).contexts, captured.contexts);
  assert.equal(storage.getItem(PRODUCT_ACTIVE_KEY), "workspace-1");
});

test("a recovery point taken before the workspace changed is refused as stale", () => {
  const storage = new MemoryStorage();
  seedWorkspace(storage, "workspace-1");
  const service = new WorkspaceLifecycleService(storage, now);
  const point = service.createRecoveryPoint("workspace-1");
  const signalsKey = `${WORKSPACE_CONTEXTS.find((descriptor) => descriptor.name === "signals")!.prefix}workspace-1`;
  // For example, another open tab saved a new signal after the download.
  storage.setItem(signalsKey, JSON.stringify(contextValue("signals", "workspace-1")).replace("signal-1", "signal-2"));
  const before = storage.entries();
  const decision = { recoveryPoint: { kind: "downloaded", fingerprint: point.fingerprint } } as const;
  assert.throws(() => service.deleteWorkspace("workspace-1", decision), /changed after its recovery point[\s\S]*Nothing was changed/);
  assert.throws(() => service.restoreBackup(point.backup, "replace_current", decision), /changed after its recovery point/);
  assert.deepEqual(storage.entries(), before);
  const fresh = service.createRecoveryPoint("workspace-1");
  service.deleteWorkspace("workspace-1", { recoveryPoint: { kind: "downloaded", fingerprint: fresh.fingerprint } });
  assert.equal(storage.length, 0);
});

test("recovery points are unavailable whenever a normal backup is blocked, leaving only an explicit decline", () => {
  const storage = new MemoryStorage();
  seedWorkspace(storage, "workspace-1");
  storage.setItem(`${WORKSPACE_CONTEXTS[1].prefix}workspace-1`, "{not json");
  const service = new WorkspaceLifecycleService(storage, now);
  assert.throws(() => service.createRecoveryPoint("workspace-1"), /backup is blocked/);
  service.deleteWorkspace("workspace-1", { recoveryPoint: { kind: "declined" } });
  assert.equal(storage.length, 0);
});

test("the state fingerprint covers every record a destructive action would change, and nothing else", () => {
  const storage = new MemoryStorage();
  seedWorkspace(storage, "workspace-1");
  seedWorkspace(storage, "workspace-2");
  storage.setItem(PRODUCT_ACTIVE_KEY, "workspace-1");
  const service = new WorkspaceLifecycleService(storage, now);
  const initial = service.stateFingerprint("workspace-1");
  storage.setItem("unrelated.preference", "x");
  storage.setItem(`${WORKSPACE_CONTEXTS[0].prefix}workspace-2`, "{}");
  assert.equal(service.stateFingerprint("workspace-1"), initial, "other workspaces and preferences do not invalidate it");
  storage.setItem(PRODUCT_ACTIVE_KEY, "workspace-2");
  assert.notEqual(service.stateFingerprint("workspace-1"), initial, "the active pointer is part of what deletion changes");
  storage.setItem(PRODUCT_ACTIVE_KEY, "workspace-1");
  storage.removeItem(`${WORKSPACE_CONTEXTS[6].prefix}workspace-1`);
  assert.notEqual(service.stateFingerprint("workspace-1"), initial);
});
