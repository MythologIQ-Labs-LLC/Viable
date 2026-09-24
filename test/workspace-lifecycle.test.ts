import assert from "node:assert/strict";
import test from "node:test";
import {
  PRODUCT_ACTIVE_KEY,
  WORKSPACE_CONTEXTS,
  WorkspaceLifecycleService,
  type KeyValueStorage,
} from "../src/workspace-lifecycle/workspace-lifecycle-service.js";

class MemoryStorage implements KeyValueStorage {
  private readonly values = new Map<string, string>();
  failSetOnce?: string;
  failRemoveOnce?: string;

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
  entries(): readonly [string, string][] { return [...this.values.entries()]; }
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

test("structurally invalid backup context is rejected before any restore mutation", () => {
  const source = new MemoryStorage();
  seedWorkspace(source, "workspace-1");
  const backup = new WorkspaceLifecycleService(source, now).createBackup("workspace-1");
  const malformed = JSON.parse(backup) as { contexts: { campaign: Record<string, unknown> } };
  malformed.contexts.campaign.campaigns = "not-an-array";

  const target = new MemoryStorage();
  target.setItem("unrelated.preference", "keep-me");
  const before = target.entries();
  assert.throws(() => new WorkspaceLifecycleService(target, now).restoreBackup(JSON.stringify(malformed), "empty_profile"), /Campaigns and exports field campaigns must be an array/);
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
  assert.throws(() => new WorkspaceLifecycleService(target, now).restoreBackup(backup, "replace_current"), /prior local state was restored/);
  assert.deepEqual(target.entries(), before);
});

test("product-wide deletion removes all workspace contexts and active pointer while retaining unrelated preferences", () => {
  const storage = new MemoryStorage();
  seedWorkspace(storage, "workspace-1");
  storage.setItem("unrelated.preference", "keep-me");
  const service = new WorkspaceLifecycleService(storage, now);
  const deleted = service.deleteWorkspace("workspace-1");
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
  assert.throws(() => new WorkspaceLifecycleService(storage, now).deleteWorkspace("workspace-1"), /prior local state was restored/);
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
