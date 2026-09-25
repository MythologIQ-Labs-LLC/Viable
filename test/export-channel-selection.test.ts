import assert from "node:assert/strict";
import test from "node:test";
import type { ProductWorkspace } from "../src/product-core/domain/workspace.js";
import type { ProductWorkspaceStore } from "../src/product-core/ports/product-workspace-store.js";
import type { CampaignWorkspace, ChannelKind, ManualExportPackage } from "../src/campaigns/domain/campaign.js";
import type { CampaignWorkspaceStore } from "../src/campaigns/ports/campaign-workspace-store.js";
import { CampaignService } from "../src/campaigns/services/campaign-service.js";

class MemoryCampaignStore implements CampaignWorkspaceStore {
  value?: CampaignWorkspace;
  async load(): Promise<CampaignWorkspace | undefined> { return this.value; }
  async save(workspace: CampaignWorkspace): Promise<void> { this.value = workspace; }
}

class MemoryProductStore implements ProductWorkspaceStore {
  constructor(public value: ProductWorkspace) {}
  async load(): Promise<ProductWorkspace | undefined> { return this.value; }
  async save(workspace: ProductWorkspace): Promise<void> { this.value = workspace; }
}

function productWorkspace(): ProductWorkspace {
  return {
    id: "workspace-1",
    createdAt: "2026-09-25T00:00:00.000Z",
    createdBy: "Founder",
    product: {
      identity: { name: "Viable", description: "Marketability OS", lifecycle: "prototype", supportedEnvironments: ["desktop"] },
      capabilities: ["Evidence-backed campaign planning"], limitations: ["No direct publishing"],
      positioning: "Local-first marketability operations", alternatives: [], differentiation: ["Authority boundaries"],
      pricing: [], packaging: [], offers: ["Internal pilot"], callsToAction: ["Review the pilot"],
      brandVoice: ["direct"], terminology: {}, accessibilityConstraints: ["Plain language"],
      revision: 2, updatedAt: "2026-09-25T00:00:00.000Z", updatedBy: "Founder",
    },
    evidence: [{
      id: "evidence-1", title: "Founder interview", summary: "Campaign governance is needed",
      origin: "interview", observedAt: "2026-09-24T00:00:00.000Z", freshnessReviewAt: "2026-10-24T00:00:00.000Z",
      reviewStatus: "reviewed", reviewedBy: "Researcher", reviewedAt: "2026-09-25T00:00:00.000Z", confidence: "high",
    }],
    claims: [{
      id: "claim-1", statement: "Viable preserves named human approval", status: "approved",
      evidenceIds: ["evidence-1"], prohibitedContexts: [], revision: 2,
      reviewedBy: "Product lead", reviewedAt: "2026-09-25T00:00:00.000Z",
    }],
    icpHypotheses: [{
      id: "icp-1", name: "Founder operators", summary: "Small product teams", status: "selected",
      origin: "human", reviewStatus: "reviewed",
      roles: {
        users: ["Founder"], economicBuyers: ["Founder"], decisionMakers: ["Founder"], approvers: ["Founder"],
        influencers: [], champions: [], blockers: [], partners: [], maintainers: [], contributors: [],
      },
      dimensions: Object.fromEntries([
        "problemIntensity", "urgency", "productFit", "timeToValue", "access", "proof",
        "adoptionFriction", "commercialViability", "retentionPotential", "strategicFit", "evidenceQuality",
      ].map((dimension) => [dimension, { rating: 3, rationale: "Reviewed evidence", evidenceIds: ["evidence-1"], confidence: "high" }])) as unknown as ProductWorkspace["icpHypotheses"][number]["dimensions"],
      disqualifiers: ["No product authority"], antiIcpConditions: ["Bulk spam"],
      assumptions: [], contradictions: [], evidenceIds: ["evidence-1"], confidence: "high", owner: "Founder",
      lastReviewedAt: "2026-09-25T00:00:00.000Z", nextValidationAction: "Run pilot",
      changeConditions: ["Repeated contradiction"], experiments: [], revision: 2, history: [],
    }],
    assessments: [],
    actions: [],
  };
}

function createService(store = new MemoryCampaignStore()) {
  let id = 0;
  return {
    store,
    service: new CampaignService(
      store,
      new MemoryProductStore(productWorkspace()),
      () => new Date("2026-09-25T12:00:00.000Z"),
      () => `id-${++id}`,
    ),
  };
}

async function prepareFamily(channels: readonly ChannelKind[]) {
  const { service, store } = createService();
  let workspace = await service.createBrief("workspace-1", {
    title: "Intentional launch",
    objective: "Test explicit export scope",
    primaryOutcome: "Qualified pilot review",
    primaryAudience: "Founder operators",
    audienceKind: "selected_icp",
    icpHypothesisId: "icp-1",
    problem: "Packages expand beyond campaign intent",
    trigger: "Approved source asset exists",
    offer: "Internal pilot",
    messageHierarchy: ["Truth", "Evidence", "Approval"],
    proof: ["Reviewed founder interview"],
    claimIds: ["claim-1"],
    evidenceIds: ["evidence-1"],
    callToAction: "Review the pilot",
    channels,
    assetPlan: ["Canonical note"],
    owner: "Campaign owner",
    successMeasures: ["One qualified review"],
    dependencies: [],
  });
  const campaignId = workspace.campaigns[0]!.id;
  await service.submitCampaign("workspace-1", campaignId);
  await service.reviewCampaign("workspace-1", campaignId, "Campaign reviewer", "approved", "Intent verified");
  workspace = await service.createCanonicalAsset("workspace-1", {
    campaignId,
    title: "Canonical note",
    body: "Canonical meaning",
    owner: "Writer",
    origin: "human",
    rights: ["Owned copy"],
    accessibilityRequirements: ["Plain language"],
    disclosureRequirements: [],
  });
  const assetId = workspace.assets[0]!.id;
  await service.submitAsset("workspace-1", assetId);
  await service.reviewAsset("workspace-1", assetId, "Asset reviewer", "approved", "Approved source");
  return { service, store, campaignId, assetId };
}

async function approveVariant(service: CampaignService, assetId: string, channel: ChannelKind): Promise<void> {
  let workspace = await service.createVariant("workspace-1", assetId, channel, `${channel} adaptation`, ["Preserve canonical claims"]);
  const variant = workspace.variants.find((item) => item.channel === channel)!;
  await service.submitVariant("workspace-1", variant.id);
  await service.reviewVariant("workspace-1", variant.id, "Channel reviewer", "approved", "Channel constraints verified");
}

test("one-channel and two-channel packages include only intentionally selected approved variants", async () => {
  const { service, campaignId, assetId } = await prepareFamily(["linkedin", "website"]);
  await approveVariant(service, assetId, "linkedin");
  await approveVariant(service, assetId, "website");

  let workspace = await service.createManualExport("workspace-1", campaignId, assetId, "Export operator", ["linkedin"]);
  const one = workspace.exports[0]!;
  assert.deepEqual(one.channels, ["linkedin"]);
  assert.equal(one.variantIds.length, 1);
  let manifest = JSON.parse(one.manifest) as { includedChannels: ChannelKind[]; variants: { channel: ChannelKind }[]; externalAction: { approvedForPublishing: boolean; delivered: boolean } };
  assert.deepEqual(manifest.includedChannels, ["linkedin"]);
  assert.deepEqual(manifest.variants.map((item) => item.channel), ["linkedin"]);
  assert.deepEqual(manifest.externalAction, { approvedForPublishing: false, delivered: false });

  workspace = await service.createManualExport("workspace-1", campaignId, assetId, "Export operator", ["linkedin", "website"]);
  const two = workspace.exports[1]!;
  assert.deepEqual(two.channels, ["linkedin", "website"]);
  assert.equal(two.variantIds.length, 2);
  manifest = JSON.parse(two.manifest) as typeof manifest;
  assert.deepEqual(manifest.includedChannels, ["linkedin", "website"]);
});

test("manual export rejects channels outside campaign intent and selected channels without approved variants", async () => {
  const { service, campaignId, assetId } = await prepareFamily(["linkedin", "website"]);
  await approveVariant(service, assetId, "linkedin");

  await assert.rejects(
    service.createManualExport("workspace-1", campaignId, assetId, "Export operator", ["github_release"]),
    /included in the approved campaign intent/,
  );
  await assert.rejects(
    service.createManualExport("workspace-1", campaignId, assetId, "Export operator", ["linkedin", "website"]),
    /approved website variant/,
  );
  await assert.rejects(
    service.createManualExport("workspace-1", campaignId, assetId, "Export operator", []),
    /at least one selected channel/,
  );
});

test("omitting channel selection preserves the explicit legacy all-three preset", async () => {
  const { service, campaignId, assetId } = await prepareFamily(["linkedin", "website", "github_release"]);
  for (const channel of ["linkedin", "website", "github_release"] as const) await approveVariant(service, assetId, channel);

  const workspace = await service.createManualExport("workspace-1", campaignId, assetId, "Export operator");
  const record = workspace.exports[0]!;
  assert.deepEqual(record.channels, ["linkedin", "website", "github_release"]);
  const manifest = JSON.parse(record.manifest) as { includedChannels: ChannelKind[] };
  assert.deepEqual(manifest.includedChannels, ["linkedin", "website", "github_release"]);
});

test("legacy saved all-three packages without the additive channels field remain readable", async () => {
  const store = new MemoryCampaignStore();
  const legacy: ManualExportPackage = {
    id: "legacy-export",
    workspaceId: "workspace-1",
    campaignId: "campaign-1",
    canonicalAssetId: "asset-1",
    variantIds: ["variant-linkedin", "variant-website", "variant-github"],
    createdAt: "2026-07-16T12:00:00.000Z",
    createdBy: "Legacy operator",
    status: "manual_export_ready",
    manifest: JSON.stringify({ variants: [{ channel: "linkedin" }, { channel: "website" }, { channel: "github_release" }], externalAction: { approvedForPublishing: false, delivered: false } }),
  };
  store.value = { workspaceId: "workspace-1", campaigns: [], contentBriefs: [], assets: [], variants: [], exports: [legacy], updatedAt: "2026-07-16T12:00:00.000Z" };
  const { service } = createService(store);
  const loaded = await service.load("workspace-1");
  assert.equal(loaded.exports[0]?.id, "legacy-export");
  assert.equal(loaded.exports[0]?.channels, undefined);
  assert.deepEqual(loaded.exports[0]?.variantIds, legacy.variantIds);
});