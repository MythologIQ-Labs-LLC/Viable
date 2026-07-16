import assert from "node:assert/strict";
import test from "node:test";
import type { CampaignWorkspace } from "../src/campaigns/domain/campaign.js";
import type { CampaignWorkspaceStore } from "../src/campaigns/ports/campaign-workspace-store.js";
import type { ProductWorkspace } from "../src/product-core/domain/workspace.js";
import type { ProductWorkspaceStore } from "../src/product-core/ports/product-workspace-store.js";
import type {
  RepositoryGrowthWorkspace,
  RepositoryImportOutcome,
  RepositoryMetricObservation,
} from "../src/repository-growth/domain/repository-growth.js";
import type { RepositoryGrowthStore } from "../src/repository-growth/ports/repository-growth-store.js";
import { RepositoryGrowthService } from "../src/repository-growth/services/repository-growth-service.js";

class MemoryGrowthStore implements RepositoryGrowthStore {
  value?: RepositoryGrowthWorkspace;
  async load(): Promise<RepositoryGrowthWorkspace | undefined> { return this.value; }
  async save(workspace: RepositoryGrowthWorkspace): Promise<void> { this.value = workspace; }
}

class MemoryProductStore implements ProductWorkspaceStore {
  constructor(public value: ProductWorkspace) {}
  async load(): Promise<ProductWorkspace | undefined> { return this.value; }
  async save(workspace: ProductWorkspace): Promise<void> { this.value = workspace; }
}

class MemoryCampaignStore implements CampaignWorkspaceStore {
  constructor(public value: CampaignWorkspace) {}
  async load(): Promise<CampaignWorkspace | undefined> { return this.value; }
  async save(workspace: CampaignWorkspace): Promise<void> { this.value = workspace; }
}

const productWorkspace = (): ProductWorkspace => ({
  id: "workspace-1",
  createdAt: "2026-07-01T00:00:00.000Z",
  createdBy: "Founder",
  product: {
    identity: { name: "Viable", description: "Marketability OS", lifecycle: "prototype", supportedEnvironments: ["desktop"] },
    capabilities: ["Repository launch planning"], limitations: ["No direct publishing"],
    positioning: "Local-first marketability operations", alternatives: [], differentiation: ["Authority boundaries"],
    pricing: [], packaging: [], offers: ["Internal pilot"], callsToAction: ["Review the pilot"],
    brandVoice: ["direct"], terminology: {}, accessibilityConstraints: ["Plain language"],
    revision: 2, updatedAt: "2026-07-01T00:00:00.000Z", updatedBy: "Founder",
  },
  evidence: [{
    id: "evidence-1", title: "Maintainer interview", summary: "Launch readiness is difficult to coordinate",
    origin: "interview", observedAt: "2026-06-30T00:00:00.000Z", freshnessReviewAt: "2026-08-01T00:00:00.000Z",
    reviewStatus: "reviewed", reviewedBy: "Researcher", reviewedAt: "2026-07-01T00:00:00.000Z", confidence: "high",
  }],
  claims: [{
    id: "claim-1", statement: "Viable preserves named human approval", status: "approved",
    evidenceIds: ["evidence-1"], prohibitedContexts: [], revision: 2,
    reviewedBy: "Product lead", reviewedAt: "2026-07-01T00:00:00.000Z",
  }],
  icpHypotheses: [], assessments: [], actions: [],
});

const campaignWorkspace = (): CampaignWorkspace => ({
  workspaceId: "workspace-1",
  updatedAt: "2026-07-01T00:00:00.000Z",
  campaigns: [{
    id: "campaign-1", workspaceId: "workspace-1", title: "Repository launch", objective: "Launch a useful release",
    primaryOutcome: "Qualified maintainer adoption", primaryAudience: "Open-source maintainers", audienceKind: "test_audience",
    problem: "Repository readiness is fragmented", trigger: "Release candidate ready", offer: "Public release",
    messageHierarchy: ["Problem", "Proof", "Quick start"], proof: ["Reviewed maintainer evidence"],
    claimReferences: [{ claimId: "claim-1", claimRevision: 2, statement: "Viable preserves named human approval", evidenceIds: ["evidence-1"] }],
    evidenceIds: ["evidence-1"], callToAction: "Try the release", channels: ["linkedin", "website", "github_release"],
    assetPlan: ["Canonical launch note"], owner: "Campaign owner", successMeasures: ["One qualified successful use"],
    dependencies: ["Working quick start"], version: 1, status: "approved",
    createdAt: "2026-07-01T00:00:00.000Z", updatedAt: "2026-07-01T00:00:00.000Z",
    reviewedBy: "Campaign reviewer", reviewedAt: "2026-07-01T00:00:00.000Z", reviewNote: "Approved",
  }],
  assets: [{
    id: "asset-1", workspaceId: "workspace-1", campaignId: "campaign-1", title: "Canonical launch note",
    audience: "Open-source maintainers",
    claimReferences: [{ claimId: "claim-1", claimRevision: 2, statement: "Viable preserves named human approval", evidenceIds: ["evidence-1"] }],
    evidenceIds: ["evidence-1"], rights: ["Owned copy"], accessibilityRequirements: ["Plain language"],
    disclosureRequirements: [], origin: "human", owner: "Writer",
    versions: [{ version: 1, body: "A useful governed repository launch.", changedAt: "2026-07-01T00:00:00.000Z", changedBy: "Writer", changeNote: "Initial" }],
    comments: [], status: "approved", createdAt: "2026-07-01T00:00:00.000Z", updatedAt: "2026-07-01T00:00:00.000Z",
    reviewedBy: "Asset reviewer", reviewedAt: "2026-07-01T00:00:00.000Z", reviewNote: "Approved",
  }],
  variants: (["linkedin", "website", "github_release"] as const).map((channel, index) => ({
    id: `variant-${index + 1}`, workspaceId: "workspace-1", canonicalAssetId: "asset-1", channel,
    body: `${channel} release variant`, constraints: ["Preserve canonical claims"], version: 1, status: "approved" as const,
    createdAt: "2026-07-01T00:00:00.000Z", updatedAt: "2026-07-01T00:00:00.000Z",
    reviewedBy: "Channel reviewer", reviewedAt: "2026-07-01T00:00:00.000Z", reviewNote: "Approved",
  })),
  exports: [],
});

const importOutcome = (): RepositoryImportOutcome => ({
  status: "success",
  retrievedAt: "2026-07-01T00:00:00.000Z",
  snapshot: {
    fullName: "MythologIQ-Labs-LLC/Viable", owner: "MythologIQ-Labs-LLC", name: "Viable",
    url: "https://github.com/MythologIQ-Labs-LLC/Viable", visibility: "public",
    description: "Local-first marketability operating system", homepage: "https://example.test/viable",
    topics: ["marketability", "github", "desktop"], defaultBranch: "main", primaryLanguage: "TypeScript",
    license: "NOASSERTION", archived: false, fork: false, pushedAt: "2026-07-01T00:00:00.000Z",
    importedAt: "2026-07-01T00:00:00.000Z", importStatus: "success",
    limitations: ["Traffic metrics unavailable through public import"],
    frontDoor: {
      readmePresent: true,
      readmeText: "Viable helps maintainers solve repository marketability problems. Installation is documented. Known limitations are explicit.",
      quickStartPresent: true, demoPresent: false, documentationPresent: true, changelogPresent: false,
      socialPreviewState: "unavailable",
    },
    community: {
      healthPercentage: 50, licensePresent: true, securityPresent: false, contributingPresent: false,
      codeOfConductPresent: false, supportPresent: false, issueTemplatePresent: false, pullRequestTemplatePresent: false,
    },
    releases: { sampledReleaseCount: 0, releaseNotesPresent: false, releaseAssetsPresent: false },
    metrics: [
      { kind: "stars", state: "observed", value: 5, capturedAt: "2026-07-01T00:00:00.000Z", source: "github_public" },
      { kind: "forks", state: "verified_zero", value: 0, capturedAt: "2026-07-01T00:00:00.000Z", source: "github_public" },
      { kind: "views", state: "unavailable", capturedAt: "2026-07-01T00:00:00.000Z", source: "github_public", limitation: "Requires authorized traffic access" },
    ],
  },
});

const createService = () => {
  const growth = new MemoryGrowthStore();
  const products = new MemoryProductStore(productWorkspace());
  const campaigns = new MemoryCampaignStore(campaignWorkspace());
  let id = 0;
  const service = new RepositoryGrowthService(
    growth,
    products,
    campaigns,
    () => new Date("2026-07-16T12:00:00.000Z"),
    () => `id-${++id}`,
  );
  return { service, growth, products, campaigns };
};

async function preparedLaunch() {
  const setup = createService();
  let workspace = await setup.service.importRepository("workspace-1", importOutcome());
  const repositoryId = workspace.repositories[0]!.id;
  workspace = await setup.service.createLaunchRoom("workspace-1", {
    repositoryId,
    title: "Viable release room",
    primaryAudience: "Open-source maintainers",
    desiredOutcome: "Qualified maintainer adoption",
    releaseTag: "v0.1.0",
    campaignId: "campaign-1",
    canonicalAssetId: "asset-1",
    checklist: ["Quick start verified", "Release notes approved"],
    maintainerCoverage: [{
      owner: "Maintainer", responsibility: "Questions and onboarding failures",
      startsAt: "2026-07-01T09:00:00.000Z", endsAt: "2026-07-01T17:00:00.000Z",
    }],
    observationStartsAt: "2026-07-01T00:00:00.000Z",
    observationEndsAt: "2026-07-10T00:00:00.000Z",
    retrospectiveAt: "2026-07-11T00:00:00.000Z",
    createdBy: "Launch owner",
  });
  const room = workspace.launchRooms[0]!;
  for (const item of room.checklist) {
    workspace = await setup.service.setChecklistItem("workspace-1", room.id, item.id, true, "Verified by named maintainer");
  }
  return { ...setup, workspace, repositoryId, roomId: room.id };
}

test("repository assessment produces explained findings and prioritized owned work", async () => {
  const { service } = createService();
  let workspace = await service.importRepository("workspace-1", importOutcome());
  const repository = workspace.repositories[0]!;
  assert.equal(repository.metrics.find((item) => item.kind === "views")!.state, "unavailable");

  workspace = await service.assessRepository("workspace-1", repository.id, "Maintainer");
  const assessment = workspace.assessments[0]!;
  assert.equal(assessment.findings.length, 12);
  for (const finding of assessment.findings) {
    assert.ok(finding.evidence.length > 0);
    assert.ok(finding.recommendation.length > 0);
    assert.ok(finding.verification.length > 0);
    assert.ok(["low", "medium", "high"].includes(finding.impact));
    assert.ok(["small", "medium", "large"].includes(finding.effort));
  }

  workspace = await service.createGrowthPlan("workspace-1", repository.id, assessment.id, "Maintainer");
  assert.ok(workspace.plans[0]!.actions.length > 0);
  assert.equal(workspace.plans[0]!.actions[0]!.status, "open");
});

test("launch room and manual export reuse current Product Core and campaign authority", async () => {
  const { service, workspace, roomId } = await preparedLaunch();
  const room = workspace.launchRooms[0]!;
  assert.equal(room.status, "ready_for_manual_launch");
  assert.equal(room.baseline.find((item) => item.kind === "views")!.state, "unavailable");

  const exported = await service.createManualExport("workspace-1", roomId, "Export operator");
  const manifest = JSON.parse(exported.exports[0]!.manifest) as {
    campaign: { claims: unknown[] };
    variants: unknown[];
    externalAction: { approvedForPublishing: boolean; delivered: boolean; credentialsIncluded: boolean };
  };
  assert.equal(manifest.campaign.claims.length, 1);
  assert.equal(manifest.variants.length, 3);
  assert.deepEqual(manifest.externalAction, { approvedForPublishing: false, delivered: false, credentialsIncluded: false });
});

test("retrospective compares numeric outcomes while preserving unavailable evidence", async () => {
  const { service, roomId } = await preparedLaunch();
  const outcomes: RepositoryMetricObservation[] = [
    { kind: "stars", state: "observed", value: 15, capturedAt: "2026-07-16T00:00:00.000Z", source: "manual_observation" },
    { kind: "views", state: "unavailable", capturedAt: "2026-07-16T00:00:00.000Z", source: "manual_observation", limitation: "No authorized traffic access" },
  ];
  const workspace = await service.completeRetrospective("workspace-1", roomId, {
    completedBy: "Launch owner",
    summary: "Useful attention increased without verified traffic evidence.",
    learnings: ["Quick-start clarity mattered more than broad promotion"],
    nextAction: "Test one improved onboarding example",
    outcomes,
  });
  const retrospective = workspace.retrospectives[0]!;
  assert.equal(retrospective.comparisons.find((item) => item.kind === "stars")!.delta, 10);
  const views = retrospective.comparisons.find((item) => item.kind === "views")!;
  assert.equal(views.baselineState, "unavailable");
  assert.equal(views.outcomeState, "unavailable");
  assert.equal(views.delta, undefined);
  assert.equal(workspace.launchRooms[0]!.status, "retrospective_complete");
});

test("stale Product Core claims block repository launch export", async () => {
  const { service, products, roomId } = await preparedLaunch();
  products.value = {
    ...products.value,
    claims: products.value.claims.map((claim) => ({ ...claim, status: "retired" as const, revision: claim.revision + 1 })),
  };
  await assert.rejects(service.createManualExport("workspace-1", roomId, "Export operator"), /claim authority changed/);
});

test("unavailable outcome metrics cannot carry invented numeric values", async () => {
  const { service, roomId } = await preparedLaunch();
  await assert.rejects(service.completeRetrospective("workspace-1", roomId, {
    completedBy: "Launch owner",
    summary: "Invalid metric attempt",
    learnings: ["Missing evidence must remain missing"],
    nextAction: "Collect authorized evidence",
    outcomes: [{ kind: "views", state: "unavailable", value: 0, capturedAt: "2026-07-16T00:00:00.000Z", source: "manual" }],
  }), /cannot carry a value/);
});
