import assert from "node:assert/strict";
import test from "node:test";
import type { ProductWorkspace } from "../src/product-core/domain/workspace.js";
import type { ProductWorkspaceStore } from "../src/product-core/ports/product-workspace-store.js";
import type { CampaignWorkspace } from "../src/campaigns/domain/campaign.js";
import type { CampaignWorkspaceStore } from "../src/campaigns/ports/campaign-workspace-store.js";
import { CampaignService } from "../src/campaigns/services/campaign-service.js";
import type { DiscoverabilityBrief } from "../src/campaigns/domain/discoverability.js";
import { DISCOVERY_SURFACES } from "../src/campaigns/domain/discoverability.js";
import { DISCOVERABILITY_PRINCIPLES, DISCOVERY_SURFACE_PROFILES } from "../src/campaigns/domain/discovery-surface-profiles.js";
import { assessDiscoverability, normalizeDiscoverabilityBrief } from "../src/campaigns/services/discoverability-assessment.js";
import { CampaignRevisionService } from "../src/campaigns/services/campaign-revision-service.js";

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
    ].map((dimension) => [dimension, { rating: 3, rationale: "Reviewed evidence", evidenceIds: ["evidence-1"], confidence: "high" }])) as unknown as ProductWorkspace["icpHypotheses"][number]["dimensions"],
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

const NOW = new Date("2026-07-16T12:00:00.000Z");

const discovery = (overrides: Partial<DiscoverabilityBrief> = {}): DiscoverabilityBrief => ({
  intents: ["problem_solution", "question_answering"],
  topicQuestions: ["How do small teams keep campaign claims truthful?"],
  primaryEntity: "Viable",
  categoryTerms: ["marketability operating system"],
  coreMessage: "Viable keeps every campaign claim tied to reviewed product evidence.",
  evidenceNotes: ["Founder interview on claim drift"],
  intendedSurfaces: ["linkedin_post", "owned_web"],
  visibility: "public",
  ...overrides,
});

const codes = (findings: readonly { code: string }[]) => findings.map((finding) => finding.code);

async function approvedAsset() {
  const created = createService();
  const { service } = created;
  let workspace = await service.createBrief("workspace-1", briefInput);
  const campaignId = workspace.campaigns[0]!.id;
  await service.submitCampaign("workspace-1", campaignId);
  await service.reviewCampaign("workspace-1", campaignId, "Campaign reviewer", "approved", "Approved");
  workspace = await service.createCanonicalAsset("workspace-1", {
    campaignId, title: "Canonical note", body: "Canonical meaning", owner: "Writer", origin: "human",
    rights: ["Owned copy"], accessibilityRequirements: ["Plain language"], disclosureRequirements: [],
  });
  const assetId = workspace.assets[0]!.id;
  await service.submitAsset("workspace-1", assetId);
  await service.reviewAsset("workspace-1", assetId, "Asset reviewer", "approved", "Approved");
  return { ...created, assetId };
}

test("discoverability brief is preserved on the variant as part of reviewed intent", async () => {
  const { service, assetId } = await approvedAsset();
  const workspace = await service.createVariant(
    "workspace-1", assetId, "linkedin",
    "Viable is a local-first marketability operating system. Here is how we keep claims truthful.",
    ["Preserve canonical claims"],
    discovery({ topicQuestions: ["  How do small teams keep campaign claims truthful?  ", ""] }),
  );
  const variant = workspace.variants[0]!;
  assert.deepEqual(variant.discoverability?.topicQuestions, ["How do small teams keep campaign claims truthful?"]);
  assert.equal(variant.discoverability?.primaryEntity, "Viable");
  assert.equal(variant.status, "draft");
});

test("variants without discoverability keep the existing workflow unchanged", async () => {
  const { service, assetId } = await approvedAsset();
  let workspace = await service.createVariant("workspace-1", assetId, "website", "Website variant", ["Web constraint"]);
  const id = workspace.variants[0]!.id;
  assert.equal(workspace.variants[0]!.discoverability, undefined);
  await service.submitVariant("workspace-1", id);
  workspace = await service.reviewVariant("workspace-1", id, "Reviewer", "approved", "Approved");
  assert.equal(workspace.variants[0]!.status, "approved");
});

test("restricted visibility contradicts external discovery and blocks approval", async () => {
  const { service, assetId } = await approvedAsset();
  let workspace = await service.createVariant(
    "workspace-1", assetId, "linkedin", "Viable keeps claims truthful.", ["Constraint"], discovery({ visibility: "restricted" }),
  );
  const id = workspace.variants[0]!.id;
  await service.submitVariant("workspace-1", id);
  await assert.rejects(
    service.reviewVariant("workspace-1", id, "Reviewer", "approved", "Approved"),
    /discoverability conflict/,
  );
  workspace = await service.reviewVariant("workspace-1", id, "Reviewer", "changes_requested", "Make it public");
  assert.equal(workspace.variants[0]!.status, "changes_requested");
});

test("advisories inform review but never block approval or rewrite content", async () => {
  const { service, assetId } = await approvedAsset();
  const body = "Big news today! We shipped something. Read more below.";
  let workspace = await service.createVariant("workspace-1", assetId, "linkedin", body, ["Constraint"], discovery({ evidenceNotes: [] }));
  const variant = workspace.variants[0]!;
  const findings = assessDiscoverability(variant.channel, variant.body, variant.discoverability!, NOW);
  assert.ok(codes(findings).includes("lead_lacks_subject"));
  assert.ok(codes(findings).includes("evidence_missing"));
  assert.ok(findings.every((finding) => finding.severity === "advisory"));
  await service.submitVariant("workspace-1", variant.id);
  workspace = await service.reviewVariant("workspace-1", variant.id, "Reviewer", "approved", "Accepted advisories");
  assert.equal(workspace.variants[0]!.status, "approved");
  assert.equal(workspace.variants[0]!.body, body);
});

test("revising discoverability after approval invalidates the variant approval", async () => {
  const { service, campaigns, products, assetId } = await approvedAsset();
  const body = "Viable keeps claims truthful.";
  let workspace = await service.createVariant("workspace-1", assetId, "linkedin", body, ["Constraint"], discovery());
  const id = workspace.variants[0]!.id;
  await service.submitVariant("workspace-1", id);
  await service.reviewVariant("workspace-1", id, "Reviewer", "approved", "Approved");

  const revision = new CampaignRevisionService(campaigns, products, () => NOW);
  workspace = await revision.reviseVariant("workspace-1", id, {
    editor: "Editor", rationale: "Target comparison queries", body, constraints: ["Constraint"],
    discoverability: discovery({ intents: ["comparison"] }),
  });
  const revised = workspace.variants[0]!;
  assert.equal(revised.status, "approval_invalidated");
  assert.equal(revised.version, 2);
  assert.deepEqual(revised.history?.at(-1)?.changedFields, ["discoverability"]);

  workspace = await revision.reviseVariant("workspace-1", id, {
    editor: "Editor", rationale: "Drop discovery strategy", body, constraints: ["Constraint"], discoverability: null,
  });
  assert.equal(workspace.variants[0]!.discoverability, undefined);
});

test("assessment flags channel mismatch, Reddit participation limits, SEO metadata, repetition, and staleness", () => {
  const brief = normalizeDiscoverabilityBrief(discovery({
    intendedSurfaces: ["youtube", "reddit_community"],
    reviewBy: "2026-07-01T00:00:00.000Z",
  }));
  const repeated = "marketability operating system ".repeat(4);
  const github = codes(assessDiscoverability("github_release", repeated, brief, NOW));
  assert.ok(github.includes("channel_surface_mismatch"));
  assert.ok(github.includes("reddit_earned_participation"));
  assert.ok(github.includes("term_repetition"));
  assert.ok(github.includes("freshness_review_due"));

  const web = assessDiscoverability("website", "Viable explained", normalizeDiscoverabilityBrief(discovery({ intendedSurfaces: ["owned_web"] })), NOW);
  assert.ok(codes(web).includes("seo_metadata_missing"));
  const withSeo = assessDiscoverability("website", "Viable explained", normalizeDiscoverabilityBrief(discovery({
    intendedSurfaces: ["owned_web"], seoTitle: "Viable: truthful campaign claims", seoDescription: "How Viable ties claims to evidence.",
  })), NOW);
  assert.ok(!codes(withSeo).includes("seo_metadata_missing"));
});

test("structurally invalid discoverability briefs are rejected", () => {
  assert.throws(() => normalizeDiscoverabilityBrief(discovery({ intents: [] })), /at least one discovery intent/);
  assert.throws(() => normalizeDiscoverabilityBrief(discovery({ primaryEntity: " " })), /primary entity/);
  assert.throws(() => normalizeDiscoverabilityBrief(discovery({ coreMessage: "" })), /core message/);
  assert.throws(() => normalizeDiscoverabilityBrief(discovery({ reviewBy: "not a date" })), /valid date/);
});

test("surface profiles are dated, sourced, and never use third-party authority scores", () => {
  for (const surface of DISCOVERY_SURFACES) {
    const profile = DISCOVERY_SURFACE_PROFILES[surface];
    assert.equal(profile.surface, surface);
    assert.match(profile.reviewedAt, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(profile.sources.length > 0);
    assert.ok(profile.sources.every((source) => source.url.startsWith("https://")));
  }
  assert.equal(DISCOVERY_SURFACE_PROFILES.reddit_community.placement, "earned_participation_only");
  const serialized = JSON.stringify([DISCOVERY_SURFACE_PROFILES, DISCOVERABILITY_PRINCIPLES]);
  assert.doesNotMatch(serialized, /domain authority|domain rating|authority score/i);
});
