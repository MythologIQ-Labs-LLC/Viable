import assert from "node:assert/strict";
import test from "node:test";
import {
  PRODUCT_ACTIVE_KEY,
  WorkspaceLifecycleService,
  type KeyValueStorage,
} from "../src/workspace-lifecycle/workspace-lifecycle-service.js";

class MemoryStorage implements KeyValueStorage {
  private readonly values = new Map<string, string>();

  get length(): number { return this.values.size; }
  key(index: number): string | null { return [...this.values.keys()][index] ?? null; }
  getItem(key: string): string | null { return this.values.get(key) ?? null; }
  setItem(key: string, value: string): void { this.values.set(key, value); }
  removeItem(key: string): void { this.values.delete(key); }
}

function seedCampaignExport(channels?: readonly string[]): MemoryStorage {
  const storage = new MemoryStorage();
  storage.setItem(PRODUCT_ACTIVE_KEY, "workspace-1");
  storage.setItem("viable.product-workspace.workspace-1", JSON.stringify({
    id: "workspace-1",
    createdAt: "2026-09-25T00:00:00.000Z",
    createdBy: "Founder",
    product: {},
    claims: [],
    evidence: [],
    icpHypotheses: [],
    assessments: [],
    actions: [],
  }));
  storage.setItem("viable.campaign-workspace.workspace-1", JSON.stringify({
    workspaceId: "workspace-1",
    campaigns: [],
    contentBriefs: [],
    assets: [],
    variants: [],
    exports: [{
      id: "export-1",
      workspaceId: "workspace-1",
      campaignId: "campaign-1",
      canonicalAssetId: "asset-1",
      variantIds: channels?.map((channel) => `variant-${channel}`) ?? ["variant-linkedin", "variant-website", "variant-github"],
      ...(channels ? { channels } : {}),
      createdAt: "2026-09-25T00:00:00.000Z",
      createdBy: "Export operator",
      status: "manual_export_ready",
      manifest: "{}",
    }],
    updatedAt: "2026-09-25T00:00:00.000Z",
  }));
  return storage;
}

test("workspace backup round-trips new selected-channel export metadata", () => {
  const service = new WorkspaceLifecycleService(seedCampaignExport(["linkedin"]), () => new Date("2026-09-25T12:00:00.000Z"));
  const backup = service.validateBackup(service.createBackup("workspace-1"));
  const campaign = backup.contexts.campaign as { exports: Array<{ channels?: string[] }> };
  assert.deepEqual(campaign.exports[0]?.channels, ["linkedin"]);
});

test("workspace backup remains compatible with legacy all-channel exports that lack channels", () => {
  const service = new WorkspaceLifecycleService(seedCampaignExport(), () => new Date("2026-09-25T12:00:00.000Z"));
  const backup = service.validateBackup(service.createBackup("workspace-1"));
  const campaign = backup.contexts.campaign as { exports: Array<{ channels?: string[]; variantIds: string[] }> };
  assert.equal(campaign.exports[0]?.channels, undefined);
  assert.equal(campaign.exports[0]?.variantIds.length, 3);
});