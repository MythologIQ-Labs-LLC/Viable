import assert from "node:assert/strict";
import test from "node:test";
import type { ProductWorkspace } from "../src/product-core/domain/workspace.js";
import type { ProductWorkspaceStore } from "../src/product-core/ports/product-workspace-store.js";
import type { CampaignWorkspace } from "../src/campaigns/domain/campaign.js";
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

const productWorkspace = (): ProductWorkspace => ({
  id: "workspace-1",
  createdAt: "2026-07-16T00:00:00.000Z",
  createdBy: "Founder",
  product: {
    identity: { name: "Viable", description: "Marketability OS", lifecycle: "prototype", supportedEnvironments: ["desktop"] },
    capabilities: ["Evidence-backed campaign planning"], limitations: ["No direct publishing"],
    positioning: "Local-first marketability operations", alternatives: [], differentiation: ["Authority boundaries"],
    pricing: [], packaging: [], offers: ["Internal pilot"], callsToAction: ["Review the pilot"],
    brandVoice: ["direct"], terminology: {}, accessibilityConstraints: ["Plain language"],
    revision: 2, updatedAt: "2026-07-16T00:00:00.000Z", updatedBy: "Founder",
  },
  evidence: [{
    id: "evidence-1", title: "Founder interview", summary: "Campaign governance is needed",
    origin: "interview", observedAt: "2026-07-15T00:00:00.000Z", freshnessReviewAt: "2026-08-15T00:00:00.000Z",
    reviewStatus: "reviewed", reviewedBy: "Researcher", reviewedAt: "2026-07-16T00:00:00.000Z", confidence: "high",
  }],
  claims: [{
    id: "claim-1", statement: "Viable preserves named human approval", status: "approved",
    evidenceIds: ["evidence-1"], prohibitedContexts: [], revision: 2,
    reviewedBy: "Product lead", reviewedAt: "2026-07-16T00:00:00.000Z",
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
    ].map((dimension) => [dimension, { rating: 3, rationale: "Reviewed evidence", evidenceIds: ["evidence-1"], confidence: "high" }])) as ProductWorkspace["icpHypotheses"][number]["dimensions"],
    disqualifiers: ["No product authority"], antiIcpConditions: ["Bulk spam"],
    assumptions: [], contradictions: [], evidenceIds: ["evidence-1"], confidence: "high", owner: "Founder",
    lastReviewedAt: "2026-07-16T00:00:00.000Z", nextValidationAction: "Run pilot",
    changeConditions: ["Repeated contradiction"], experiments: [], revision: 2, history: [],
  }],
  assessments: [],
  actions: [],
});

const briefInput = {
  title: "Governed launch",
  objective: "Explain the internal pilot",
  primaryOutcome: "Qualified pilot review",
  primaryAudience: "Founder operators",
  audienceKind: "selected_icp" as const,
  icpHypothesisId: "icp-1",
  problem: "Campaign claims drift",
  trigger: "Product slice ready",
  offer: "Internal pilot",
  messageHierarchy: ["Product truth", "Evidence", "Approval"],
  proof: ["Reviewed founder interview"],
  claimIds: ["claim-1"],
  evidenceIds: ["evidence-1"],
  callToAction: "Review the pilot",
  channels: ["linkedin", "website", "github_release"] as const,
  assetPlan: ["Canonical launch note"],
  owner: "Campaign owner",
  successMeasures: ["One qualified pilot review"],
  dependencies: ["Approved product truth"],
};

const createService = () => {
  const campaigns = new MemoryCampaignStore();
  const products = new MemoryProductStore(productWorkspace());
  let id = 0;
  const service = new CampaignService(
    campaigns,
    products,
    () => new Date("2026-07-16T12:00:00.000Z"),
    () => "id-" + ++id,
  );
  return { service, campaigns, products };
};

test("campaign approval preserves Product Core claim and evidence authority", async () => {
  const { service } = createService();
  let workspace = await service.createBrief("workspace-1", briefInput);
  const campaign = workspace.campaigns[0]!;
  assert.equal(campaign.status, "draft");
  assert.deepEqual(campaign.claimReferences, [{
    claimId: "claim-1", claimRevision: 2,
    statement: "Viable preserves named human approval", evidenceIds: ["evidence-1"],
  }]);

  await assert.rejects(
    service.reviewCampaign("workspace-1", campaign.id, "Reviewer", "approved", "Looks good"),
    /must be in review/,
  );
  workspace = await service.submitCampaign("workspace-1", campaign.id);
  workspace = await service.reviewCampaign("workspace-1", campaign.id, "Reviewer", "approved", "Claims verified");
  assert.equal(workspace.campaigns[0]!.status, "approved");
  assert.equal(workspace.campaigns[0]!.reviewedBy, "Reviewer");
});

test("generated canonical asset cannot enter approved state without named review", async () => {
  const { service } = createService();
  let workspace = await service.createBrief("workspace-1", briefInput);
  const campaignId = workspace.campaigns[0]!.id;
  await service.submitCampaign("workspace-1", campaignId);
  await service.reviewCampaign("workspace-1", campaignId, "Campaign reviewer", "approved", "Approved source packet");
  workspace = await service.createCanonicalAsset("workspace-1", {
    campaignId, title: "Canonical pilot note", body: "One governed source asset", owner: "Generator operator",
    origin: "generated_suggestion", rights: ["Original product copy"], accessibilityRequirements: ["Plain language"],
    disclosureRequirements: ["Identify generated assistance"],
  });
  const asset = workspace.assets[0]!;
  assert.equal(asset.status, "draft");
  await assert.rejects(
    service.reviewAsset("workspace-1", asset.id, "Generator operator", "approved", "Self approval"),
    /must be in review/,
  );
  await service.submitAsset("workspace-1", asset.id);
  workspace = await service.reviewAsset("workspace-1", asset.id, "Named human reviewer", "approved", "Claims and rights verified");
  assert.equal(workspace.assets[0]!.status, "approved");
  assert.equal(workspace.assets[0]!.reviewedBy, "Named human reviewer");
});

test("manual export requires three approved variants and never records delivery", async () => {
  const { service } = createService();
  let workspace = await service.createBrief("workspace-1", briefInput);
  const campaignId = workspace.campaigns[0]!.id;
  await service.submitCampaign("workspace-1", campaignId);
  await service.reviewCampaign("workspace-1", campaignId, "Campaign reviewer", "approved", "Approved");
  workspace = await service.createCanonicalAsset("workspace-1", {
    campaignId, title: "Canonical note", body: "Canonical meaning", owner: "Writer", origin: "human",
    rights: ["Owned copy"], accessibilityRequirements: ["Descriptive link text"], disclosureRequirements: [],
  });
  const assetId = workspace.assets[0]!.id;
  await service.submitAsset("workspace-1", assetId);
  await service.reviewAsset("workspace-1", assetId, "Asset reviewer", "approved", "Approved");
  for (const channel of ["linkedin", "website", "github_release"] as const) {
    workspace = await service.createVariant("workspace-1", assetId, channel, channel + " adaptation", ["Preserve canonical claims"]);
    const variant = workspace.variants.find((item) => item.channel === channel)!;
    await service.submitVariant("workspace-1", variant.id);
    await service.reviewVariant("workspace-1", variant.id, "Channel reviewer", "approved", "Constraints verified");
  }
  workspace = await service.createManualExport("workspace-1", campaignId, assetId, "Export operator");
  const record = workspace.exports[0]!;
  assert.equal(record.status, "manual_export_ready");
  const manifest = JSON.parse(record.manifest) as { externalAction: { approvedForPublishing: boolean; delivered: boolean } };
  assert.deepEqual(manifest.externalAction, { approvedForPublishing: false, delivered: false });
});

test("material canonical changes invalidate asset and channel approval", async () => {
  const { service } = createService();
  let workspace = await service.createBrief("workspace-1", briefInput);
  const campaignId = workspace.campaigns[0]!.id;
  await service.submitCampaign("workspace-1", campaignId);
  await service.reviewCampaign("workspace-1", campaignId, "Campaign reviewer", "approved", "Approved");
  workspace = await service.createCanonicalAsset("workspace-1", {
    campaignId, title: "Canonical note", body: "Version one", owner: "Writer", origin: "human",
    rights: ["Owned copy"], accessibilityRequirements: ["Plain language"], disclosureRequirements: [],
  });
  const assetId = workspace.assets[0]!.id;
  await service.submitAsset("workspace-1", assetId);
  await service.reviewAsset("workspace-1", assetId, "Asset reviewer", "approved", "Approved");
  workspace = await service.createVariant("workspace-1", assetId, "website", "Website variant", ["Web constraint"]);
  const variantId = workspace.variants[0]!.id;
  await service.submitVariant("workspace-1", variantId);
  await service.reviewVariant("workspace-1", variantId, "Variant reviewer", "approved", "Approved");

  workspace = await service.reviseCanonicalAsset("workspace-1", assetId, "Editor", "Version two", "Material message change");
  assert.equal(workspace.assets[0]!.status, "approval_invalidated");
  assert.equal(workspace.variants[0]!.status, "approval_invalidated");
  assert.equal(workspace.assets[0]!.versions.length, 2);
});

test("retired or revised Product Core claims invalidate campaign authority", async () => {
  const { service, products } = createService();
  let workspace = await service.createBrief("workspace-1", briefInput);
  const campaignId = workspace.campaigns[0]!.id;
  await service.submitCampaign("workspace-1", campaignId);
  await service.reviewCampaign("workspace-1", campaignId, "Campaign reviewer", "approved", "Approved");
  products.value = {
    ...products.value,
    claims: products.value.claims.map((claim) => ({ ...claim, status: "retired" as const, revision: claim.revision + 1 })),
  };
  workspace = await service.detectClaimImpact("workspace-1");
  assert.equal(workspace.campaigns[0]!.status, "approval_invalidated");
});
