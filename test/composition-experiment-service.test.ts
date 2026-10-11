import assert from "node:assert/strict";
import test from "node:test";
import type { ProductWorkspace } from "../src/product-core/domain/workspace.js";
import type { ProductWorkspaceStore } from "../src/product-core/ports/product-workspace-store.js";
import type { CampaignWorkspace } from "../src/campaigns/domain/campaign.js";
import type { CampaignWorkspaceStore } from "../src/campaigns/ports/campaign-workspace-store.js";
import { CampaignService } from "../src/campaigns/services/campaign-service.js";
import { CompositionExperimentService } from "../src/campaigns/services/composition-experiment-service.js";

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
    createdAt: "2026-10-11T12:00:00.000Z",
    createdBy: "Founder",
    product: {
      identity: { name: "Ledgerly", description: "Evidence-backed finance workflow", lifecycle: "prototype", supportedEnvironments: ["pwa"] },
      capabilities: ["Evidence-backed publishing"], limitations: ["No autonomous claims"],
      positioning: "Governed marketability", alternatives: [], differentiation: ["Product Core authority"],
      pricing: [], packaging: [], offers: ["Pilot"], callsToAction: ["Review pilot"],
      brandVoice: ["direct"], terminology: {}, accessibilityConstraints: ["Plain language"],
      revision: 3, updatedAt: "2026-10-11T12:00:00.000Z", updatedBy: "Founder",
    },
    evidence: [{
      id: "evidence-1",
      title: "Pilot evidence",
      summary: "Named approval prevents claim drift",
      origin: "interview",
      observedAt: "2026-10-10T12:00:00.000Z",
      freshnessReviewAt: "2026-11-10T12:00:00.000Z",
      reviewStatus: "reviewed",
      reviewedBy: "Researcher",
      reviewedAt: "2026-10-11T12:00:00.000Z",
      confidence: "high",
    }],
    claims: [{
      id: "claim-1",
      statement: "Ledgerly preserves named human approval",
      status: "approved",
      evidenceIds: ["evidence-1"],
      prohibitedContexts: [],
      revision: 3,
      reviewedBy: "Product lead",
      reviewedAt: "2026-10-11T12:00:00.000Z",
    }],
    icpHypotheses: [{
      id: "icp-1",
      name: "Founder operators",
      summary: "Small product teams",
      status: "selected",
      origin: "human",
      reviewStatus: "reviewed",
      roles: {
        users: ["Founder"], economicBuyers: ["Founder"], decisionMakers: ["Founder"], approvers: ["Founder"],
        influencers: [], champions: [], blockers: [], partners: [], maintainers: [], contributors: [],
      },
      dimensions: Object.fromEntries([
        "problemIntensity", "urgency", "productFit", "timeToValue", "access", "proof",
        "adoptionFriction", "commercialViability", "retentionPotential", "strategicFit", "evidenceQuality",
      ].map((dimension) => [dimension, { rating: 3, rationale: "Reviewed evidence", evidenceIds: ["evidence-1"], confidence: "high" }])) as unknown as ProductWorkspace["icpHypotheses"][number]["dimensions"],
      disqualifiers: [], antiIcpConditions: [], assumptions: [], contradictions: [], evidenceIds: ["evidence-1"],
      confidence: "high", owner: "Founder", lastReviewedAt: "2026-10-11T12:00:00.000Z",
      nextValidationAction: "Run productization experiment", changeConditions: ["Contradictory evidence"],
      experiments: [], revision: 1, history: [],
    }],
    assessments: [],
    actions: [],
  };
}

async function fixture() {
  const campaigns = new MemoryCampaignStore();
  const products = new MemoryProductStore(productWorkspace());
  let campaignId = 0;
  const campaignService = new CampaignService(
    campaigns,
    products,
    () => new Date("2026-10-11T14:00:00.000Z"),
    () => "campaign-id-" + ++campaignId,
  );
  let workspace = await campaignService.createBrief("workspace-1", {
    title: "Productization proof",
    objective: "Show governed publishing evidence",
    primaryOutcome: "Qualified pilot review",
    primaryAudience: "Founder operators",
    audienceKind: "selected_icp",
    icpHypothesisId: "icp-1",
    problem: "Marketing claims drift",
    trigger: "Publishing workflow ready",
    offer: "Pilot",
    messageHierarchy: ["Problem", "Evidence", "Product proof"],
    proof: ["Pilot evidence"],
    claimIds: ["claim-1"],
    evidenceIds: ["evidence-1"],
    callToAction: "Review the pilot",
    channels: ["linkedin"],
    assetPlan: ["LinkedIn proof post"],
    owner: "Campaign owner",
    successMeasures: ["Qualified review"],
    dependencies: ["Approved product truth"],
  });
  const campaign = workspace.campaigns[0]!;
  await campaignService.submitCampaign("workspace-1", campaign.id);
  await campaignService.reviewCampaign("workspace-1", campaign.id, "Campaign reviewer", "approved", "Authority verified");
  workspace = await campaignService.createCanonicalAsset("workspace-1", {
    campaignId: campaign.id,
    title: "Canonical proof",
    body: "Ledgerly preserves named human approval.",
    owner: "Writer",
    origin: "human",
    rights: ["Owned copy"],
    accessibilityRequirements: ["Plain language"],
    disclosureRequirements: [],
  });
  const asset = workspace.assets[0]!;
  await campaignService.submitAsset("workspace-1", asset.id);
  await campaignService.reviewAsset("workspace-1", asset.id, "Asset reviewer", "approved", "Claims verified");
  workspace = await campaignService.createVariant("workspace-1", asset.id, "linkedin", "Named human approval stays in the loop.", ["LinkedIn text"]);
  const variant = workspace.variants[0]!;
  await campaignService.submitVariant("workspace-1", variant.id);
  await campaignService.reviewVariant("workspace-1", variant.id, "Variant reviewer", "approved", "Exact copy approved");

  let compositionId = 0;
  const compositionService = new CompositionExperimentService(
    campaigns,
    products,
    () => new Date("2026-10-11T15:00:00.000Z"),
    () => "composition-id-" + ++compositionId,
  );
  return { campaigns, products, campaignService, compositionService, campaignId: campaign.id, variantId: variant.id };
}

test("composition brief reuses current Product Core authority and exposes separate readiness facets", async () => {
  const { compositionService, campaignId } = await fixture();
  let workspace = await compositionService.createCompositionBrief("workspace-1", {
    campaignId,
    objective: "product_proof",
    desiredOutcome: "One qualified pilot review",
    topic: "Governed product publishing",
    contentFamily: "build_proof",
    hookArchetype: "product_proof",
    toneConstraints: ["Direct", "No hype"],
    prohibitedClaims: ["Guaranteed growth"],
    destinationId: "linkedin-founder",
    format: "text",
    mediaAssetIds: [],
    callToAction: "Review the pilot",
    externalLinkPolicy: "comment",
    hypothesis: "A concrete governance proof earns more qualified review than a generic launch claim.",
  });
  const brief = workspace.compositionBriefs![0]!;
  assert.equal(brief.primaryAudience, "Founder operators");
  assert.equal(brief.claimReferences[0]!.claimRevision, 3);
  assert.deepEqual(brief.evidenceIds, ["evidence-1"]);

  const assessment = await compositionService.assessCompositionBrief("workspace-1", brief.id);
  assert.equal(assessment.readiness.truth, "ready");
  assert.equal(assessment.readiness.audience, "ready");
  assert.equal(assessment.readiness.message, "ready");
  assert.equal(assessment.readiness.channel, "ready");
  assert.equal(assessment.readiness.experiment, "ready");
  assert.equal(assessment.readiness.approval, "blocked");
  assert.ok(assessment.findings.some((finding) => finding.ruleId === "approval.variant_unbound"));
});

test("publication experiment binds exact approved variant revision and SHA-256 content", async () => {
  const { compositionService, campaignId, variantId } = await fixture();
  let workspace = await compositionService.createCompositionBrief("workspace-1", {
    campaignId,
    objective: "product_proof",
    desiredOutcome: "Qualified review",
    topic: "Governed publishing",
    contentFamily: "build_proof",
    hookArchetype: "product_proof",
    toneConstraints: ["Direct"],
    prohibitedClaims: [],
    destinationId: "linkedin-founder",
    format: "text",
    mediaAssetIds: [],
    callToAction: "Review the pilot",
    externalLinkPolicy: "none",
    hypothesis: "Concrete proof increases qualified review.",
  });
  const brief = workspace.compositionBriefs![0]!;
  workspace = await compositionService.bindPublicationExperiment("workspace-1", {
    compositionBriefId: brief.id,
    channelVariantId: variantId,
    provider: "linkedin",
    timezone: "America/New_York",
    expectedOutcome: "One qualified pilot review",
    changedVariables: ["hook"],
  });
  const experiment = workspace.publicationExperiments![0]!;
  assert.equal(experiment.channelVariantVersion, 1);
  assert.match(experiment.channelVariantBodySha256, /^[0-9a-f]{64}$/);
  assert.deepEqual(experiment.changedVariables, ["hook"]);
  assert.equal((await compositionService.assessExperimentFreshness("workspace-1", experiment.id)).stale, false);
  assert.equal((await compositionService.assessCompositionBrief("workspace-1", brief.id)).readiness.approval, "ready");
});

test("variant revision or Product Core authority drift makes the exact experiment stale", async () => {
  const { compositionService, campaigns, products, campaignId, variantId } = await fixture();
  let workspace = await compositionService.createCompositionBrief("workspace-1", {
    campaignId,
    objective: "market_learning",
    desiredOutcome: "Learn from qualified response",
    topic: "Governed publishing",
    contentFamily: "observation",
    toneConstraints: ["Direct"],
    prohibitedClaims: [],
    destinationId: "linkedin-founder",
    format: "text",
    mediaAssetIds: [],
    externalLinkPolicy: "none",
    hypothesis: "The governed workflow is legible to founder operators.",
  });
  const brief = workspace.compositionBriefs![0]!;
  workspace = await compositionService.bindPublicationExperiment("workspace-1", {
    compositionBriefId: brief.id,
    channelVariantId: variantId,
    provider: "linkedin",
    timezone: "America/New_York",
    expectedOutcome: "Useful product feedback",
    changedVariables: ["topic"],
  });
  const experiment = workspace.publicationExperiments![0]!;

  campaigns.value = {
    ...campaigns.value!,
    variants: campaigns.value!.variants.map((variant) => variant.id === variantId
      ? { ...variant, body: "Changed after approval", version: 2, status: "approval_invalidated" as const }
      : variant),
  };
  let freshness = await compositionService.assessExperimentFreshness("workspace-1", experiment.id);
  assert.equal(freshness.stale, true);
  assert.ok(freshness.reasons.some((reason) => reason.includes("revision changed")));
  assert.ok(freshness.reasons.some((reason) => reason.includes("fingerprint changed")));

  products.value = {
    ...products.value,
    claims: products.value.claims.map((claim) => claim.id === "claim-1"
      ? { ...claim, revision: 4, statement: "Changed Product Core claim" }
      : claim),
  };
  freshness = await compositionService.assessExperimentFreshness("workspace-1", experiment.id);
  assert.ok(freshness.reasons.some((reason) => reason.includes("Product Core claim authority changed")));
});

test("media and CTA guidance fail honestly without generating or rewriting content", async () => {
  const { compositionService, campaignId } = await fixture();
  const workspace = await compositionService.createCompositionBrief("workspace-1", {
    campaignId,
    objective: "lead_generation",
    desiredOutcome: "Qualified inquiry",
    topic: "Product proof",
    contentFamily: "build_proof",
    toneConstraints: [],
    prohibitedClaims: [],
    destinationId: "linkedin-founder",
    format: "image",
    mediaAssetIds: [],
    externalLinkPolicy: "body",
    hypothesis: "Visual product proof may create qualified inquiry.",
  });
  const assessment = await compositionService.assessCompositionBrief("workspace-1", workspace.compositionBriefs![0]!.id);
  assert.ok(assessment.findings.some((finding) => finding.ruleId === "channel.media_missing" && finding.severity === "blocking"));
  assert.ok(assessment.findings.some((finding) => finding.ruleId === "message.cta_missing" && finding.severity === "warning"));
  assert.ok(assessment.findings.some((finding) => finding.ruleId === "message.hook_missing" && finding.severity === "warning"));
});
