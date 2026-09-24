import assert from "node:assert/strict";
import test from "node:test";
import type { CampaignWorkspace, ChannelKind } from "../src/campaigns/domain/campaign.js";
import type { CampaignWorkspaceStore } from "../src/campaigns/ports/campaign-workspace-store.js";
import { CampaignService } from "../src/campaigns/services/campaign-service.js";
import { ICP_DIMENSIONS, type IcpHypothesis } from "../src/product-core/domain/icp.js";
import type { ProductWorkspace } from "../src/product-core/domain/workspace.js";
import type { ProductWorkspaceStore } from "../src/product-core/ports/product-workspace-store.js";
import { ProductRevisionService } from "../src/product-core/services/product-revision-service.js";

class ProductStore implements ProductWorkspaceStore {
  constructor(public value: ProductWorkspace) {}
  async load(workspaceId: string): Promise<ProductWorkspace | undefined> { return this.value.id === workspaceId ? this.value : undefined; }
  async save(workspace: ProductWorkspace): Promise<void> { this.value = workspace; }
}

class CampaignStore implements CampaignWorkspaceStore {
  value?: CampaignWorkspace;
  async load(workspaceId: string): Promise<CampaignWorkspace | undefined> { return this.value?.workspaceId === workspaceId ? this.value : undefined; }
  async save(workspace: CampaignWorkspace): Promise<void> { this.value = workspace; }
}

const dimensions = Object.fromEntries(ICP_DIMENSIONS.map((dimension) => [dimension, {
  rating: 3 as const,
  rationale: `${dimension} supported`,
  evidenceIds: ["evidence-1"],
  confidence: "high" as const,
}])) as unknown as IcpHypothesis["dimensions"];

function productWorkspace(): ProductWorkspace {
  return {
    id: "workspace-1", createdAt: "2026-09-24T12:00:00.000Z", createdBy: "Kevin",
    product: {
      identity: { name: "Viable", description: "Local-first marketability OS", lifecycle: "prototype", supportedEnvironments: ["desktop"] },
      capabilities: ["Governed planning"], limitations: ["No direct publishing"], positioning: "Evidence-backed operations",
      alternatives: [], differentiation: ["Named review"], pricing: [], packaging: ["Desktop"], offers: [], callsToAction: [],
      brandVoice: ["Direct"], terminology: { ICP: "ideal customer profile" }, accessibilityConstraints: ["Plain language"],
      revision: 2, updatedAt: "2026-09-24T12:00:00.000Z", updatedBy: "Kevin",
    },
    evidence: [{ id: "evidence-1", title: "Interview", summary: "Founder evidence", origin: "interview", observedAt: "2026-09-20T12:00:00.000Z", freshnessReviewAt: "2026-10-20T12:00:00.000Z", reviewStatus: "reviewed", reviewedBy: "Kevin", reviewedAt: "2026-09-20T13:00:00.000Z", confidence: "high" }],
    claims: [{ id: "claim-1", statement: "Viable preserves named review", status: "approved", evidenceIds: ["evidence-1"], prohibitedContexts: [], revision: 2, reviewedBy: "Kevin", reviewedAt: "2026-09-20T13:00:00.000Z" }],
    icpHypotheses: [{
      id: "icp-1", name: "Founder operators", summary: "Small teams", status: "selected", origin: "human", reviewStatus: "reviewed",
      roles: { users: ["Founder"], economicBuyers: [], decisionMakers: [], approvers: [], influencers: [], champions: [], blockers: [], partners: [], maintainers: [], contributors: [] },
      dimensions, disqualifiers: ["No active product"], antiIcpConditions: [], assumptions: [], contradictions: [], evidenceIds: ["evidence-1"], confidence: "high",
      owner: "Kevin", lastReviewedAt: "2026-09-24T12:00:00.000Z", nextValidationAction: "Interview founders", changeConditions: ["Evidence changes"], experiments: [], revision: 2, history: [],
    }],
    assessments: [], actions: [],
  };
}

const campaignInput = {
  title: "Governed launch", objective: "Explain the pilot", primaryOutcome: "Pilot review", primaryAudience: "Founder operators",
  audienceKind: "selected_icp" as const, icpHypothesisId: "icp-1", problem: "Campaign drift", trigger: "Pilot ready", offer: "Pilot",
  messageHierarchy: ["Truth", "Evidence", "Approval"], proof: ["Interview"], claimIds: ["claim-1"], evidenceIds: ["evidence-1"],
  callToAction: "Review the pilot", channels: ["linkedin", "website", "github_release"] as readonly ChannelKind[], assetPlan: ["Launch note"],
  owner: "Kevin", successMeasures: ["One review"], dependencies: [],
};

function setup() {
  const products = new ProductStore(productWorkspace());
  const campaigns = new CampaignStore();
  let id = 0;
  return {
    products,
    campaigns,
    core: new CampaignService(campaigns, products, () => new Date("2026-09-24T18:30:00.000Z"), () => `id-${++id}`),
    revision: new ProductRevisionService(products, () => new Date("2026-09-24T18:31:00.000Z")),
  };
}

async function invalidateSelectedIcp(products: ProductStore, revision: ProductRevisionService): Promise<void> {
  const current = products.value.product;
  await revision.reviseProductTruth("workspace-1", {
    identity: { ...current.identity, lifecycle: "private_beta" }, capabilities: current.capabilities, limitations: current.limitations,
    positioning: current.positioning, alternatives: current.alternatives, differentiation: current.differentiation, pricing: current.pricing,
    packaging: current.packaging, offers: current.offers, callsToAction: current.callsToAction, brandVoice: current.brandVoice,
    terminology: current.terminology, accessibilityConstraints: current.accessibilityConstraints, updatedBy: "Kevin", rationale: "Lifecycle changed",
  });
}

test("campaign re-approval fails closed after selected ICP drift but changes-requested remains a recoverable exit", async () => {
  const { products, campaigns, core, revision } = setup();
  let workspace = await core.createBrief("workspace-1", campaignInput);
  const campaignId = workspace.campaigns[0]!.id;
  await core.submitCampaign("workspace-1", campaignId);
  await invalidateSelectedIcp(products, revision);

  await assert.rejects(() => core.reviewCampaign("workspace-1", campaignId, "Reviewer", "approved", "Looks good"), /Product Core selected ICP authority changed/);
  workspace = await core.reviewCampaign("workspace-1", campaignId, "Reviewer", "changes_requested", "Refresh selected ICP authority before approval");
  assert.equal(workspace.campaigns[0]?.status, "changes_requested");
  assert.equal(campaigns.value?.campaigns[0]?.reviewNote, "Refresh selected ICP authority before approval");
});

test("stale selected ICP authority cannot flow into new content, assets, variants, or manual export", async () => {
  const { products, core, revision } = setup();
  let workspace = await core.createBrief("workspace-1", campaignInput);
  const campaignId = workspace.campaigns[0]!.id;
  await core.submitCampaign("workspace-1", campaignId);
  workspace = await core.reviewCampaign("workspace-1", campaignId, "Reviewer", "approved", "Current authority verified");

  workspace = await core.createCanonicalAsset("workspace-1", {
    campaignId, title: "Launch note", body: "Canonical launch copy", owner: "Kevin", origin: "human",
    rights: ["Workspace-owned copy"], accessibilityRequirements: ["Plain language"], disclosureRequirements: [],
  });
  const assetId = workspace.assets[0]!.id;
  await core.submitAsset("workspace-1", assetId);
  workspace = await core.reviewAsset("workspace-1", assetId, "Reviewer", "approved", "Asset verified");

  for (const channel of ["linkedin", "website", "github_release"] as const) {
    workspace = await core.createVariant("workspace-1", assetId, channel, `${channel} copy`, [`${channel} constraint`]);
    const variant = workspace.variants.find((item) => item.channel === channel)!;
    await core.submitVariant("workspace-1", variant.id);
    workspace = await core.reviewVariant("workspace-1", variant.id, "Reviewer", "approved", `${channel} verified`);
  }

  await invalidateSelectedIcp(products, revision);

  await assert.rejects(() => core.createContentBrief("workspace-1", {
    campaignId, title: "Content plan", objective: "Explain pilot", pillars: ["Truth"], themes: [], deliverables: ["Post"], sourceNotes: [], owner: "Kevin", origin: "human",
  }), /Product Core selected ICP authority changed/);
  await assert.rejects(() => core.createCanonicalAsset("workspace-1", {
    campaignId, title: "Second asset", body: "Copy", owner: "Kevin", origin: "human", rights: ["Owned"], accessibilityRequirements: ["Plain language"], disclosureRequirements: [],
  }), /Product Core selected ICP authority changed/);
  await assert.rejects(() => core.createManualExport("workspace-1", campaignId, assetId, "Kevin"), /Product Core selected ICP authority changed/);
});
