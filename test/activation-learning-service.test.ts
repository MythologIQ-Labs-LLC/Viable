import assert from "node:assert/strict";
import test from "node:test";
import type { ActivationLearningWorkspace } from "../src/activation-learning/domain/activation-learning.js";
import type { ActivationLearningStore } from "../src/activation-learning/ports/activation-learning-store.js";
import { ActivationLearningService } from "../src/activation-learning/services/activation-learning-service.js";
import type { CampaignWorkspace } from "../src/campaigns/domain/campaign.js";
import type { CampaignWorkspaceStore } from "../src/campaigns/ports/campaign-workspace-store.js";
import type { ProductWorkspace } from "../src/product-core/domain/workspace.js";
import type { ProductWorkspaceStore } from "../src/product-core/ports/product-workspace-store.js";
import type { RepositoryGrowthWorkspace } from "../src/repository-growth/domain/repository-growth.js";
import type { RepositoryGrowthStore } from "../src/repository-growth/ports/repository-growth-store.js";
import type { VideoProductionWorkspace } from "../src/video-production/domain/video-production.js";
import type { VideoProductionStore } from "../src/video-production/ports/video-production-store.js";

class ActivationStore implements ActivationLearningStore {
  value?: ActivationLearningWorkspace;
  async load(): Promise<ActivationLearningWorkspace | undefined> { return this.value; }
  async save(value: ActivationLearningWorkspace): Promise<void> { this.value = value; }
}
class ProductStore implements ProductWorkspaceStore {
  constructor(public value: ProductWorkspace) {}
  async load(): Promise<ProductWorkspace | undefined> { return this.value; }
  async save(value: ProductWorkspace): Promise<void> { this.value = value; }
}
class CampaignStore implements CampaignWorkspaceStore {
  constructor(public value: CampaignWorkspace) {}
  async load(): Promise<CampaignWorkspace | undefined> { return this.value; }
  async save(value: CampaignWorkspace): Promise<void> { this.value = value; }
}
class RepositoryStore implements RepositoryGrowthStore {
  constructor(public value: RepositoryGrowthWorkspace) {}
  async load(): Promise<RepositoryGrowthWorkspace | undefined> { return this.value; }
  async save(value: RepositoryGrowthWorkspace): Promise<void> { this.value = value; }
}
class VideoStore implements VideoProductionStore {
  constructor(public value: VideoProductionWorkspace) {}
  async load(): Promise<VideoProductionWorkspace | undefined> { return this.value; }
  async save(value: VideoProductionWorkspace): Promise<void> { this.value = value; }
}

const claimReference = {
  claimId: "claim-1",
  claimRevision: 2,
  statement: "Viable preserves named human approval",
  evidenceIds: ["evidence-1"],
} as const;

const product = (): ProductWorkspace => ({
  id: "workspace-1",
  createdAt: "2026-07-16T00:00:00.000Z",
  createdBy: "Founder",
  product: {
    identity: { name: "Viable", description: "Marketability OS", lifecycle: "prototype", supportedEnvironments: ["desktop"] },
    capabilities: ["Manual activation"], limitations: ["No direct publishing"], positioning: "Local-first",
    alternatives: [], differentiation: ["Evidence boundaries"], pricing: [], packaging: [], offers: ["Pilot"],
    callsToAction: ["Review"], brandVoice: ["direct"], terminology: {}, accessibilityConstraints: ["Captions"],
    revision: 1, updatedAt: "2026-07-16T00:00:00.000Z", updatedBy: "Founder",
  },
  evidence: [{
    id: "evidence-1", title: "Founder interview", summary: "Approval and outcomes must remain distinct", origin: "interview",
    observedAt: "2026-07-15T00:00:00.000Z", freshnessReviewAt: "2026-08-15T00:00:00.000Z",
    reviewStatus: "reviewed", reviewedBy: "Researcher", reviewedAt: "2026-07-16T00:00:00.000Z", confidence: "high",
  }],
  claims: [{
    id: "claim-1", statement: claimReference.statement, status: "approved", evidenceIds: ["evidence-1"],
    prohibitedContexts: [], revision: 2, reviewedBy: "Product lead", reviewedAt: "2026-07-16T00:00:00.000Z",
  }],
  icpHypotheses: [], assessments: [], actions: [],
});

const campaigns = (): CampaignWorkspace => ({
  workspaceId: "workspace-1",
  campaigns: [{
    id: "campaign-1", workspaceId: "workspace-1", title: "Launch", objective: "Explain the pilot",
    primaryOutcome: "Qualified review", primaryAudience: "Founder operators", audienceKind: "test_audience",
    problem: "Claim drift", trigger: "Slice ready", offer: "Pilot", messageHierarchy: ["Truth", "Approval"],
    proof: ["Founder interview"], claimReferences: [claimReference], evidenceIds: ["evidence-1"], callToAction: "Review",
    channels: ["linkedin", "website", "github_release"], assetPlan: ["Launch copy"], owner: "Campaign owner",
    successMeasures: ["One qualified review"], dependencies: [], version: 1, status: "approved",
    createdAt: "2026-07-16T00:00:00.000Z", updatedAt: "2026-07-16T00:00:00.000Z",
    reviewedBy: "Campaign reviewer", reviewedAt: "2026-07-16T00:00:00.000Z", reviewNote: "Approved",
  }],
  compositionBriefs: [{
    id: "composition-1", workspaceId: "workspace-1", campaignId: "campaign-1",
    objective: "product_proof", primaryAudience: "Founder operators", desiredOutcome: "Qualified review",
    topic: "Governed launch", contentFamily: "build_proof", hookArchetype: "product_proof",
    toneConstraints: ["Direct"], claimReferences: [claimReference], evidenceIds: ["evidence-1"], prohibitedClaims: [],
    destinationId: "id-1", format: "text", mediaAssetIds: [], callToAction: "Review",
    externalLinkPolicy: "none", hypothesis: "Concrete proof earns qualified review", version: 1,
    createdAt: "2026-07-16T00:00:00.000Z", updatedAt: "2026-07-16T00:00:00.000Z",
  }],
  publicationExperiments: [{
    id: "experiment-linkedin", workspaceId: "workspace-1", compositionBriefId: "composition-1",
    compositionBriefVersion: 1, compositionBriefSha256: "b".repeat(64),
    channelVariantId: "variant-linkedin", channelVariantVersion: 1, channelVariantBodySha256: "c".repeat(64),
    destinationId: "id-1", provider: "linkedin", timezone: "America/New_York",
    expectedOutcome: "Qualified review", changedVariables: ["hook"], status: "draft",
    createdAt: "2026-07-16T00:00:00.000Z", updatedAt: "2026-07-16T00:00:00.000Z",
  }],
  assets: [{
    id: "asset-1", workspaceId: "workspace-1", campaignId: "campaign-1", title: "Canonical launch asset",
    audience: "Founder operators", claimReferences: [claimReference], evidenceIds: ["evidence-1"], rights: ["Owned copy"],
    accessibilityRequirements: ["Plain language"], disclosureRequirements: ["State manual publication"], origin: "human", owner: "Writer",
    versions: [{ version: 1, body: "Approved canonical copy", changedAt: "2026-07-16T00:00:00.000Z", changedBy: "Writer", changeNote: "Initial" }],
    comments: [], status: "approved", createdAt: "2026-07-16T00:00:00.000Z", updatedAt: "2026-07-16T00:00:00.000Z",
    reviewedBy: "Asset reviewer", reviewedAt: "2026-07-16T00:00:00.000Z", reviewNote: "Approved",
  }],
  variants: [
    { id: "variant-linkedin", workspaceId: "workspace-1", canonicalAssetId: "asset-1", channel: "linkedin", body: "Approved LinkedIn copy", constraints: ["No unsupported claims"], version: 1, status: "approved", createdAt: "2026-07-16T00:00:00.000Z", updatedAt: "2026-07-16T00:00:00.000Z", reviewedBy: "Reviewer", reviewedAt: "2026-07-16T00:00:00.000Z", reviewNote: "Approved" },
    { id: "variant-website", workspaceId: "workspace-1", canonicalAssetId: "asset-1", channel: "website", body: "Approved website copy", constraints: ["Accessible headings"], version: 1, status: "approved", createdAt: "2026-07-16T00:00:00.000Z", updatedAt: "2026-07-16T00:00:00.000Z", reviewedBy: "Reviewer", reviewedAt: "2026-07-16T00:00:00.000Z", reviewNote: "Approved" },
    { id: "variant-github", workspaceId: "workspace-1", canonicalAssetId: "asset-1", channel: "github_release", body: "Approved release copy", constraints: ["No Trending promise"], version: 1, status: "approved", createdAt: "2026-07-16T00:00:00.000Z", updatedAt: "2026-07-16T00:00:00.000Z", reviewedBy: "Reviewer", reviewedAt: "2026-07-16T00:00:00.000Z", reviewNote: "Approved" },
  ],
  exports: [],
  updatedAt: "2026-07-16T00:00:00.000Z",
});

const repositories = (): RepositoryGrowthWorkspace => ({
  workspaceId: "workspace-1",
  repositories: [{
    id: "repo-1", workspaceId: "workspace-1", fullName: "MythologIQ-Labs-LLC/Viable", owner: "MythologIQ-Labs-LLC", name: "Viable",
    url: "https://github.com/MythologIQ-Labs-LLC/Viable", visibility: "public", description: "Marketability OS", topics: ["marketability"],
    defaultBranch: "main", archived: false, fork: false, importedAt: "2026-07-16T00:00:00.000Z", importStatus: "success", limitations: [],
    frontDoor: { readmePresent: true, readmeText: "README", quickStartPresent: true, demoPresent: true, documentationPresent: true, changelogPresent: true, socialPreviewState: "available" },
    community: { licensePresent: true, securityPresent: true, contributingPresent: true, codeOfConductPresent: true, supportPresent: true, issueTemplatePresent: true, pullRequestTemplatePresent: true },
    releases: { sampledReleaseCount: 1, latestTag: "v0.1.0", latestPublishedAt: "2026-07-16T00:00:00.000Z", releaseNotesPresent: true, releaseAssetsPresent: true },
    metrics: [],
  }],
  assessments: [], plans: [],
  launchRooms: [{
    id: "launch-1", repositoryId: "repo-1", title: "Viable launch", primaryAudience: "Founder operators", desiredOutcome: "Qualified review",
    releaseTag: "v0.1.0", campaignId: "campaign-1", canonicalAssetId: "asset-1", variantIds: ["variant-linkedin", "variant-website", "variant-github"],
    checklist: [{ id: "check-1", label: "Release ready", required: true, complete: true, evidence: "Release candidate verified" }],
    maintainerCoverage: [{ owner: "Maintainer", responsibility: "Launch support", startsAt: "2026-07-16T12:00:00.000Z", endsAt: "2026-07-16T20:00:00.000Z" }],
    observationStartsAt: "2026-07-16T12:00:00.000Z", observationEndsAt: "2026-07-30T12:00:00.000Z", retrospectiveAt: "2026-07-31T12:00:00.000Z",
    baseline: [], status: "ready_for_manual_launch", createdAt: "2026-07-16T00:00:00.000Z", createdBy: "Maintainer",
  }],
  exports: [], retrospectives: [], updatedAt: "2026-07-16T00:00:00.000Z",
});

const videos = (): VideoProductionWorkspace => ({
  workspaceId: "workspace-1", tools: [], packages: [],
  briefs: [{
    id: "brief-1", workspaceId: "workspace-1", campaignId: "campaign-1", sourceAssetId: "asset-1", sourceAssetVersion: 1,
    title: "Governed launch video", objective: "Explain the workflow", audience: "Founder operators", script: "Approved canonical copy",
    claimReferences: [claimReference], evidenceIds: ["evidence-1"], durationSeconds: 30, platforms: ["linkedin"], aspectRatios: ["1:1"],
    visualStyle: "Product demonstration", prohibitedElements: ["Invented claims"], captionsRequired: true, audioDescriptionRequired: false,
    accessibilityRequirements: ["Captions"], disclosureRequirements: ["Generated media disclosure"], storyboard: [],
    sourceAssets: [{ id: "source-1", label: "Product UI", mediaType: "image/png", sourceReference: "assets/ui.png", owner: "MythologIQ Labs, LLC", rightsBasis: "Owned screenshot", sensitiveKind: "none", consentStatus: "not_applicable", allowedUses: ["Campaign"], prohibitedUses: [], disclosureRequirements: [] }],
    providers: [], owner: "Producer", status: "approved", createdAt: "2026-07-16T00:00:00.000Z", updatedAt: "2026-07-16T00:00:00.000Z",
    reviewedBy: "Video reviewer", reviewedAt: "2026-07-16T00:00:00.000Z", reviewNote: "Approved",
  }],
  artifacts: [{
    id: "artifact-1", workspaceId: "workspace-1", briefId: "brief-1", packageId: "video-package-1", sourceToolId: "manual", sourceToolVersion: "1",
    runCorrelationId: "run-1", renderStatus: "completed", stages: [{ stage: "completed", status: "completed", observedAt: "2026-07-16T00:00:00.000Z", detail: "Complete" }],
    files: [{ id: "file-1", path: "output/final.mp4", mimeType: "video/mp4", sizeBytes: 1024, sha256: "a".repeat(64), relationship: "final_render", sourceBriefId: "brief-1", sourcePackageId: "video-package-1" }],
    redactedLog: "Complete", importedAt: "2026-07-16T00:00:00.000Z", importedBy: "Importer", reviewStatus: "approved",
    reviewedBy: "Render reviewer", reviewedAt: "2026-07-16T00:00:00.000Z", reviewNote: "Approved",
  }],
  variants: [{
    id: "video-linkedin", workspaceId: "workspace-1", artifactId: "artifact-1", platform: "linkedin", aspectRatio: "1:1", fileId: "file-1",
    accessibilityNotes: ["Captions burned in"], disclosureRequirements: ["Generated media disclosure"], status: "approved",
    createdAt: "2026-07-16T00:00:00.000Z", updatedAt: "2026-07-16T00:00:00.000Z", reviewedBy: "Variant reviewer", reviewedAt: "2026-07-16T00:00:00.000Z", reviewNote: "Approved",
  }],
  updatedAt: "2026-07-16T00:00:00.000Z",
});

const fixture = () => {
  const activation = new ActivationStore();
  const products = new ProductStore(product());
  const campaignStore = new CampaignStore(campaigns());
  const repositoryStore = new RepositoryStore(repositories());
  const videoStore = new VideoStore(videos());
  let id = 0;
  const service = new ActivationLearningService(
    activation, products, campaignStore, repositoryStore, videoStore,
    () => new Date("2026-07-16T12:00:00.000Z"), () => `id-${++id}`,
  );
  return { service, activation, products, campaignStore, repositoryStore, videoStore };
};

async function createLinkedInDestination(service: ActivationLearningService): Promise<ActivationLearningWorkspace> {
  return service.createDestination("workspace-1", {
    label: "Company LinkedIn", channel: "linkedin", accountReference: "company-page:mythologiq-labs", accountOwner: "MythologIQ Labs, LLC",
    ownershipConfirmed: true, capabilityNotes: ["Manual post"], rateLimitNotes: "Follow platform limits", retryPolicy: "Review failure before retry",
    dataHandlingNotes: "No credentials stored in Viable",
  });
}

async function approvedSchedule(service: ActivationLearningService): Promise<ActivationLearningWorkspace> {
  let workspace = await createLinkedInDestination(service);
  workspace = await service.createExternalEntry("workspace-1", {
    title: "Publish approved LinkedIn launch", owner: "Operator", startsAt: "2026-07-17T13:00:00.000Z", timezone: "America/New_York",
    notes: "Manual activation", destinationId: workspace.destinations[0]!.id, sourceKind: "campaign_variant", sourceId: "variant-linkedin",
  });
  const entryId = workspace.calendarEntries[0]!.id;
  await service.submitExternalEntry("workspace-1", entryId);
  return service.reviewExternalEntry("workspace-1", entryId, "External reviewer", "approved", "Destination, payload, timing, rights, and approval verified");
}

async function packageReady(service: ActivationLearningService): Promise<ActivationLearningWorkspace> {
  let workspace = await approvedSchedule(service);
  return service.createManualPackage("workspace-1", workspace.calendarEntries[0]!.id, "Export operator");
}

const baselineObservation = {
  metric: "qualified_reviews", state: "verified_zero" as const, value: 0, unit: "count",
  windowStartsAt: "2026-07-01T00:00:00.000Z", windowEndsAt: "2026-07-15T23:59:59.000Z", capturedAt: "2026-07-16T10:00:00.000Z",
  source: "Manual baseline", evidenceReference: "baseline-note-1",
};

const outcomeObservation = {
  metric: "qualified_reviews", state: "observed" as const, value: 3, unit: "count",
  windowStartsAt: "2026-07-17T13:00:00.000Z", windowEndsAt: "2026-07-31T13:00:00.000Z", capturedAt: "2026-07-31T14:00:00.000Z",
  source: "Manual review log", evidenceReference: "outcome-note-1",
};

test("scheduled work remains distinct from delivery and requires evidence", async () => {
  const { service } = fixture();
  let workspace = await packageReady(service);
  const entry = workspace.calendarEntries[0]!;
  const packageRecord = workspace.packages[0]!;
  assert.equal(entry.scheduleStatus, "scheduled");
  assert.equal(entry.activationStatus, "ready_for_manual_activation");
  const manifest = JSON.parse(packageRecord.manifest) as { manualActivation: { credentialsIncluded: boolean; deliveryClaimed: boolean; directPublishingAvailable: boolean } };
  assert.deepEqual(manifest.manualActivation, {
    idempotencyKey: packageRecord.idempotencyKey,
    credentialsIncluded: false,
    directPublishingAvailable: false,
    deliveryClaimed: false,
    providerVerified: false,
    instructions: [
      "Use the approved payload only at the named destination.",
      "Do not add unsupported claims or unapproved assets.",
      "Record the delivery URL, publication identifier, or explicit failure evidence in Viable.",
    ],
  });
  await assert.rejects(service.recordDeliveryOutcome("workspace-1", {
    calendarEntryId: entry.id, packageId: packageRecord.id, status: "delivered", evidenceClassification: "human_recorded",
    source: "Operator", observedAt: "2026-07-17T13:05:00.000Z", recordedBy: "Operator", evidenceReferences: ["screenshot-1"], note: "Posted",
    deliveryUrl: "https://www.linkedin.com/posts/example",
  }), /completed manual export handoff/);
  workspace = await service.markExportDownloaded("workspace-1", workspace.exportOperations[0]!.id);
  workspace = await service.recordDeliveryOutcome("workspace-1", {
    calendarEntryId: entry.id, packageId: packageRecord.id, status: "delivered", evidenceClassification: "human_recorded",
    source: "Operator", observedAt: "2026-07-17T13:05:00.000Z", recordedBy: "Operator", evidenceReferences: ["screenshot-1"], note: "Posted manually and URL captured",
    deliveryUrl: "https://www.linkedin.com/posts/example",
  });
  assert.equal(workspace.calendarEntries[0]!.activationStatus, "delivered");
  assert.equal(workspace.deliveryOutcomes[0]!.evidenceClassification, "human_recorded");
});

test("provider verification cannot be claimed without provider evidence", async () => {
  const { service } = fixture();
  let workspace = await packageReady(service);
  workspace = await service.markExportDownloaded("workspace-1", workspace.exportOperations[0]!.id);
  await assert.rejects(service.recordDeliveryOutcome("workspace-1", {
    calendarEntryId: workspace.calendarEntries[0]!.id, packageId: workspace.packages[0]!.id, status: "delivered", evidenceClassification: "provider_verified",
    source: "Manual operator", observedAt: "2026-07-17T13:05:00.000Z", recordedBy: "Operator", evidenceReferences: ["screenshot-1"], note: "Posted",
    deliveryUrl: "https://www.linkedin.com/posts/example",
  }), /provider response identifier/);
});

test("missing and delayed performance remain distinct from verified zero", async () => {
  const { service } = fixture();
  let workspace = await approvedSchedule(service);
  const entryId = workspace.calendarEntries[0]!.id;
  workspace = await service.createMeasurementPlan("workspace-1", {
    calendarEntryId: entryId, observationStartsAt: "2026-07-17T13:00:00.000Z", observationEndsAt: "2026-07-31T13:00:00.000Z",
    baseline: [baselineObservation], createdBy: "Analyst",
  });
  workspace = await service.importPerformance("workspace-1", {
    calendarEntryId: entryId, status: "partial", source: "Manual evidence", sourceClassification: "human_recorded", importedBy: "Analyst",
    notes: "Qualified reviews observed; referral details delayed",
    observations: [
      outcomeObservation,
      { metric: "referrals", state: "delayed", windowStartsAt: "2026-07-17T13:00:00.000Z", windowEndsAt: "2026-07-31T13:00:00.000Z", capturedAt: "2026-07-31T14:00:00.000Z", source: "Provider dashboard", evidenceReference: "provider-note-1", limitation: "Provider report has not arrived" },
      { metric: "unique_visitors", state: "unavailable", windowStartsAt: "2026-07-17T13:00:00.000Z", windowEndsAt: "2026-07-31T13:00:00.000Z", capturedAt: "2026-07-31T14:00:00.000Z", source: "Manual evidence", evidenceReference: "access-note-1", limitation: "No authenticated analytics access" },
    ],
  });
  assert.deepEqual(workspace.performanceImports[0]!.observations.map((item) => item.state), ["observed", "delayed", "unavailable"]);
  await assert.rejects(service.importPerformance("workspace-1", {
    calendarEntryId: entryId, status: "unavailable", source: "Invalid", sourceClassification: "human_recorded", importedBy: "Analyst", notes: "Invalid zero",
    observations: [{ ...outcomeObservation, metric: "views", state: "unavailable", value: 0, limitation: "Unavailable" }],
  }), /cannot include a numeric value/);
});

test("retrospective compares compatible metrics and writes a learning entry", async () => {
  const { service } = fixture();
  let workspace = await packageReady(service);
  const entryId = workspace.calendarEntries[0]!.id;
  workspace = await service.markExportDownloaded("workspace-1", workspace.exportOperations[0]!.id);
  workspace = await service.recordDeliveryOutcome("workspace-1", {
    calendarEntryId: entryId, packageId: workspace.packages[0]!.id, status: "delivered", evidenceClassification: "human_recorded",
    source: "Operator", observedAt: "2026-07-17T13:05:00.000Z", recordedBy: "Operator", evidenceReferences: ["delivery-proof-1"], note: "Published manually",
    deliveryUrl: "https://www.linkedin.com/posts/example",
  });
  workspace = await service.createMeasurementPlan("workspace-1", {
    calendarEntryId: entryId, observationStartsAt: "2026-07-17T13:00:00.000Z", observationEndsAt: "2026-07-31T13:00:00.000Z",
    baseline: [baselineObservation], createdBy: "Analyst",
  });
  workspace = await service.importPerformance("workspace-1", {
    calendarEntryId: entryId, status: "complete", source: "Manual review log", sourceClassification: "human_recorded", importedBy: "Analyst",
    notes: "Outcome window complete", observations: [outcomeObservation],
  });
  workspace = await service.completeRetrospective("workspace-1", {
    calendarEntryId: entryId, completedBy: "Campaign owner", summary: "The manual launch produced three qualified reviews", learnings: ["Named approval did not block timely activation"],
    decision: "iterate", attributionModel: "manual", attributionUncertainty: "Reviews were manually connected to the launch and may include other influences",
    evidenceReferences: ["delivery-proof-1", "outcome-note-1"], reversibleNextAction: "Repeat one manual LinkedIn activation with a narrower call to action",
    icpConfidenceEffect: "strengthen", icpConfidenceRationale: "Founder operators requested review at the expected rate", positioningEffect: "Keep governance-first positioning",
    learningChange: "Narrow the call to action", learningOutcome: "Three qualified reviews", learningFollowUp: "Run one reversible follow-up campaign",
  });
  assert.equal(workspace.retrospectives[0]!.comparisons[0]!.delta, 3);
  assert.equal(workspace.learningLedger[0]!.attributionModel, "manual");
  assert.match(workspace.learningLedger[0]!.reversibleNextAction, /Repeat one manual LinkedIn/);
});

test("re-importing identical normalized performance evidence is idempotent", async () => {
  const { service } = fixture();
  let workspace = await approvedSchedule(service);
  const entryId = workspace.calendarEntries[0]!.id;
  workspace = await service.createMeasurementPlan("workspace-1", {
    calendarEntryId: entryId, observationStartsAt: "2026-07-17T13:00:00.000Z", observationEndsAt: "2026-07-31T13:00:00.000Z",
    baseline: [baselineObservation], createdBy: "Analyst",
  });
  const input = {
    calendarEntryId: entryId,
    status: "complete" as const,
    source: "Manual review log",
    sourceClassification: "human_recorded" as const,
    importedBy: "Analyst",
    notes: "Outcome window complete",
    observations: [{
      ...outcomeObservation,
      metric: "Qualified Reviews",
      providerMetric: "Qualified review conversions",
      providerDefinition: "Provider-native count of attributed review conversions",
    }],
  };
  workspace = await service.importPerformance("workspace-1", input);
  const firstDigest = workspace.performanceImports[0]!.normalizedDigest;
  assert.equal(workspace.performanceImports[0]!.observations[0]!.metric, "qualified_reviews");
  assert.equal(workspace.performanceImports[0]!.observations[0]!.providerMetric, "Qualified review conversions");
  workspace = await service.importPerformance("workspace-1", { ...input, importedBy: "Second analyst", notes: "Same evidence re-selected" });
  assert.equal(workspace.performanceImports.length, 1);
  assert.match(firstDigest ?? "", /^[0-9a-f]{64}$/);
  assert.equal(workspace.performanceImports[0]!.normalizedDigest, firstDigest);
});

test("manual analytics snapshot can bind exact publication experiment and preserve provider-native provenance", async () => {
  const { service } = fixture();
  let workspace = await approvedSchedule(service);
  const entryId = workspace.calendarEntries[0]!.id;
  workspace = await service.createMeasurementPlan("workspace-1", {
    calendarEntryId: entryId, observationStartsAt: "2026-07-17T13:00:00.000Z", observationEndsAt: "2026-07-31T13:00:00.000Z",
    baseline: [baselineObservation], createdBy: "Analyst",
  });
  workspace = await service.importPerformance("workspace-1", {
    calendarEntryId: entryId,
    publicationExperimentId: "experiment-linkedin",
    providerPublicationId: "urn:li:share:123",
    status: "complete",
    source: "LinkedIn export",
    sourceClassification: "provider_export",
    importedBy: "Analyst",
    notes: "Manual export from the provider dashboard",
    observations: [{
      ...outcomeObservation,
      metric: "Post Impressions",
      providerMetric: "Impressions",
      providerDefinition: "Times the post was shown in LinkedIn",
      value: 42,
      source: "LinkedIn export",
      evidenceReference: "linkedin-export-2026-07-31.csv",
    }],
  });
  const record = workspace.performanceImports[0]!;
  assert.equal(record.publicationExperimentId, "experiment-linkedin");
  assert.equal(record.providerPublicationId, "urn:li:share:123");
  assert.equal(record.observations[0]!.metric, "post_impressions");
  assert.equal(record.observations[0]!.providerMetric, "Impressions");
  assert.match(record.normalizedDigest ?? "", /^[0-9a-f]{64}$/);
});

test("conflicting observations for the same metric window withhold a retrospective delta", async () => {
  const { service } = fixture();
  let workspace = await packageReady(service);
  const entryId = workspace.calendarEntries[0]!.id;
  workspace = await service.markExportDownloaded("workspace-1", workspace.exportOperations[0]!.id);
  workspace = await service.recordDeliveryOutcome("workspace-1", {
    calendarEntryId: entryId, packageId: workspace.packages[0]!.id, status: "delivered", evidenceClassification: "human_recorded",
    source: "Operator", observedAt: "2026-07-17T13:05:00.000Z", recordedBy: "Operator", evidenceReferences: ["delivery-proof-1"], note: "Published manually",
    deliveryUrl: "https://www.linkedin.com/posts/example",
  });
  workspace = await service.createMeasurementPlan("workspace-1", {
    calendarEntryId: entryId, observationStartsAt: "2026-07-17T13:00:00.000Z", observationEndsAt: "2026-07-31T13:00:00.000Z",
    baseline: [baselineObservation], createdBy: "Analyst",
  });
  workspace = await service.importPerformance("workspace-1", {
    calendarEntryId: entryId, status: "complete", source: "Provider export A", sourceClassification: "provider_export", importedBy: "Analyst",
    notes: "First export", observations: [outcomeObservation],
  });
  workspace = await service.importPerformance("workspace-1", {
    calendarEntryId: entryId, status: "complete", source: "Provider export B", sourceClassification: "provider_export", importedBy: "Analyst",
    notes: "Second export disagrees with the first",
    observations: [{
      ...outcomeObservation,
      value: 9,
      capturedAt: "2026-07-31T15:00:00.000Z",
      source: "Provider export B",
      evidenceReference: "outcome-note-2",
    }],
  });
  const reconciled = await service.reconcilePerformanceEvidence("workspace-1", entryId);
  assert.equal(reconciled.length, 1);
  assert.equal(reconciled[0]!.state, "conflict");
  assert.equal(reconciled[0]!.value, undefined);
  assert.match(reconciled[0]!.source, /Provider export A/);
  assert.match(reconciled[0]!.source, /Provider export B/);
  assert.match(reconciled[0]!.evidenceReference, /outcome-note-1/);
  assert.match(reconciled[0]!.evidenceReference, /outcome-note-2/);

  workspace = await service.completeRetrospective("workspace-1", {
    calendarEntryId: entryId, completedBy: "Campaign owner", summary: "Conflicting provider evidence must not produce a numeric conclusion",
    learnings: ["Resolve the evidence conflict before drawing a conclusion"], decision: "inconclusive", attributionModel: "manual",
    attributionUncertainty: "Two provider exports disagree for the same metric and reporting window",
    evidenceReferences: ["delivery-proof-1", "outcome-note-1", "outcome-note-2"],
    reversibleNextAction: "Review the underlying exports", icpConfidenceEffect: "unknown",
    icpConfidenceRationale: "The disputed metric does not support an ICP conclusion",
    positioningEffect: "No positioning change while evidence conflicts",
    learningChange: "Do not change the campaign from disputed evidence", learningOutcome: "Numeric outcome withheld",
    learningFollowUp: "Reconcile the source records",
  });
  const comparison = workspace.retrospectives[0]!.comparisons[0]!;
  assert.equal(comparison.delta, undefined);
  assert.match(comparison.limitation ?? "", /conflict/i);
});

test("same normalized metric and reporting window with incompatible units reconciles as conflict", async () => {
  const { service } = fixture();
  let workspace = await approvedSchedule(service);
  const entryId = workspace.calendarEntries[0]!.id;
  workspace = await service.createMeasurementPlan("workspace-1", {
    calendarEntryId: entryId, observationStartsAt: "2026-07-17T13:00:00.000Z", observationEndsAt: "2026-07-31T13:00:00.000Z",
    baseline: [baselineObservation], createdBy: "Analyst",
  });
  workspace = await service.importPerformance("workspace-1", {
    calendarEntryId: entryId, status: "complete", source: "Export A", sourceClassification: "provider_export", importedBy: "Analyst",
    notes: "Count metric", observations: [{
      ...outcomeObservation, metric: "Post impressions", value: 100, unit: "count", source: "Export A", evidenceReference: "a.csv",
    }],
  });
  workspace = await service.importPerformance("workspace-1", {
    calendarEntryId: entryId, status: "complete", source: "Export B", sourceClassification: "provider_export", importedBy: "Analyst",
    notes: "Ratio mislabeled as the same normalized metric", observations: [{
      ...outcomeObservation, metric: "post_impressions", value: 0.5, unit: "ratio", source: "Export B", evidenceReference: "b.csv",
    }],
  });
  const reconciled = await service.reconcilePerformanceEvidence("workspace-1", entryId);
  assert.equal(reconciled.length, 1);
  assert.equal(reconciled[0]!.state, "conflict");
  assert.match(reconciled[0]!.limitation ?? "", /units disagree/i);
});

test("estimated and unknown metric states preserve uncertainty instead of becoming observed or zero", async () => {
  const { service } = fixture();
  let workspace = await approvedSchedule(service);
  const entryId = workspace.calendarEntries[0]!.id;
  workspace = await service.createMeasurementPlan("workspace-1", {
    calendarEntryId: entryId, observationStartsAt: "2026-07-17T13:00:00.000Z", observationEndsAt: "2026-07-31T13:00:00.000Z",
    baseline: [baselineObservation], createdBy: "Analyst",
  });
  await assert.rejects(service.importPerformance("workspace-1", {
    calendarEntryId: entryId, status: "partial", source: "Estimate", sourceClassification: "human_recorded", importedBy: "Analyst",
    notes: "Missing limitation", observations: [{
      ...outcomeObservation, metric: "reach", state: "estimated", value: 25, source: "Estimate", evidenceReference: "estimate-1",
    }],
  }), /Estimated metric requires a limitation/);
  await assert.rejects(service.importPerformance("workspace-1", {
    calendarEntryId: entryId, status: "partial", source: "Unknown", sourceClassification: "human_recorded", importedBy: "Analyst",
    notes: "Unknown cannot be numeric", observations: [{
      ...outcomeObservation, metric: "reach", state: "unknown", value: 0, source: "Unknown", evidenceReference: "unknown-1", limitation: "Provider does not expose this metric",
    }],
  }), /unknown metric cannot include a numeric value/i);
  workspace = await service.importPerformance("workspace-1", {
    calendarEntryId: entryId, status: "partial", source: "Estimate", sourceClassification: "human_recorded", importedBy: "Analyst",
    notes: "Explicit estimate", observations: [{
      ...outcomeObservation, metric: "reach", state: "estimated", value: 25, source: "Estimate", evidenceReference: "estimate-1", limitation: "Estimated from a sampled dashboard",
    }],
  });
  assert.equal(workspace.performanceImports[0]!.observations[0]!.state, "estimated");
  assert.equal(workspace.performanceImports[0]!.observations[0]!.value, 25);
});

test("derived ratio records formula version and mixed-source provenance without hiding it", async () => {
  const { service } = fixture();
  let workspace = await approvedSchedule(service);
  const entryId = workspace.calendarEntries[0]!.id;
  workspace = await service.createMeasurementPlan("workspace-1", {
    calendarEntryId: entryId, observationStartsAt: "2026-07-17T13:00:00.000Z", observationEndsAt: "2026-07-31T13:00:00.000Z",
    baseline: [baselineObservation], createdBy: "Analyst",
  });
  const window = {
    windowStartsAt: "2026-07-17T13:00:00.000Z",
    windowEndsAt: "2026-07-31T13:00:00.000Z",
    capturedAt: "2026-07-31T14:00:00.000Z",
  };
  workspace = await service.importPerformance("workspace-1", {
    calendarEntryId: entryId, status: "complete", source: "Provider export", sourceClassification: "provider_export", importedBy: "Analyst",
    notes: "Provider reach", observations: [{
      metric: "impressions", state: "observed", value: 100, unit: "count", ...window,
      source: "Provider export", evidenceReference: "provider-impressions.csv", providerMetric: "Impressions",
    }],
  });
  workspace = await service.importPerformance("workspace-1", {
    calendarEntryId: entryId, status: "complete", source: "Manual reach check", sourceClassification: "human_recorded", importedBy: "Analyst",
    notes: "Manual reached count", observations: [{
      metric: "members_reached", state: "observed", value: 50, unit: "count", ...window,
      source: "Manual reach check", evidenceReference: "reach-note-1",
    }],
  });
  const deriveInput = {
    calendarEntryId: entryId,
    metric: "impressions_per_reached",
    formula: "ratio" as const,
    sourceMetrics: ["impressions", "members_reached"],
    windowStartsAt: window.windowStartsAt,
    windowEndsAt: window.windowEndsAt,
    unit: "ratio",
    createdBy: "Analyst",
  };
  workspace = await service.derivePerformanceMetric("workspace-1", deriveInput);
  const derived = workspace.derivedMetrics![0]!;
  assert.equal(derived.value, 2);
  assert.equal(derived.state, "observed");
  assert.equal(derived.formulaVersion, "1");
  assert.deepEqual(derived.sourceClassifications, ["human_recorded", "provider_export"]);
  assert.equal(derived.sourceImportIds.length, 2);
  assert.equal(derived.sourceObservationIds.length, 2);
  assert.match(derived.normalizedDigest, /^[0-9a-f]{64}$/);

  workspace = await service.derivePerformanceMetric("workspace-1", deriveInput);
  assert.equal(workspace.derivedMetrics!.length, 1);
});

test("derived sum with incompatible source units is a conflict instead of arithmetic", async () => {
  const { service } = fixture();
  let workspace = await approvedSchedule(service);
  const entryId = workspace.calendarEntries[0]!.id;
  workspace = await service.createMeasurementPlan("workspace-1", {
    calendarEntryId: entryId, observationStartsAt: "2026-07-17T13:00:00.000Z", observationEndsAt: "2026-07-31T13:00:00.000Z",
    baseline: [baselineObservation], createdBy: "Analyst",
  });
  const window = {
    windowStartsAt: "2026-07-17T13:00:00.000Z",
    windowEndsAt: "2026-07-31T13:00:00.000Z",
    capturedAt: "2026-07-31T14:00:00.000Z",
  };
  workspace = await service.importPerformance("workspace-1", {
    calendarEntryId: entryId, status: "complete", source: "Mixed units", sourceClassification: "human_recorded", importedBy: "Analyst",
    notes: "Two numeric sources with incompatible units", observations: [
      { metric: "reactions", state: "observed", value: 10, unit: "count", ...window, source: "Mixed units", evidenceReference: "mixed-1" },
      { metric: "engagement_rate", state: "observed", value: 0.2, unit: "ratio", ...window, source: "Mixed units", evidenceReference: "mixed-2" },
    ],
  });
  workspace = await service.derivePerformanceMetric("workspace-1", {
    calendarEntryId: entryId, metric: "nonsense_total", formula: "sum",
    sourceMetrics: ["reactions", "engagement_rate"], windowStartsAt: window.windowStartsAt, windowEndsAt: window.windowEndsAt,
    unit: "count", createdBy: "Analyst",
  });
  const derived = workspace.derivedMetrics![0]!;
  assert.equal(derived.state, "conflict");
  assert.equal(derived.value, undefined);
  assert.match(derived.limitation ?? "", /source units disagree/i);
});

test("derived sum output unit must match compatible source units", async () => {
  const { service } = fixture();
  let workspace = await approvedSchedule(service);
  const entryId = workspace.calendarEntries[0]!.id;
  workspace = await service.createMeasurementPlan("workspace-1", {
    calendarEntryId: entryId, observationStartsAt: "2026-07-17T13:00:00.000Z", observationEndsAt: "2026-07-31T13:00:00.000Z",
    baseline: [baselineObservation], createdBy: "Analyst",
  });
  const window = {
    windowStartsAt: "2026-07-17T13:00:00.000Z",
    windowEndsAt: "2026-07-31T13:00:00.000Z",
    capturedAt: "2026-07-31T14:00:00.000Z",
  };
  workspace = await service.importPerformance("workspace-1", {
    calendarEntryId: entryId, status: "complete", source: "Counts", sourceClassification: "human_recorded", importedBy: "Analyst",
    notes: "Compatible counts", observations: [
      { metric: "reactions", state: "observed", value: 10, unit: "count", ...window, source: "Counts", evidenceReference: "count-1" },
      { metric: "comments", state: "observed", value: 2, unit: "count", ...window, source: "Counts", evidenceReference: "count-2" },
    ],
  });
  workspace = await service.derivePerformanceMetric("workspace-1", {
    calendarEntryId: entryId, metric: "engagements", formula: "sum",
    sourceMetrics: ["reactions", "comments"], windowStartsAt: window.windowStartsAt, windowEndsAt: window.windowEndsAt,
    unit: "ratio", createdBy: "Analyst",
  });
  const derived = workspace.derivedMetrics![0]!;
  assert.equal(derived.state, "unavailable");
  assert.equal(derived.value, undefined);
  assert.match(derived.limitation ?? "", /output unit must match/i);
});

test("derived ratio with a verified-zero denominator is unavailable rather than zero", async () => {
  const { service } = fixture();
  let workspace = await approvedSchedule(service);
  const entryId = workspace.calendarEntries[0]!.id;
  workspace = await service.createMeasurementPlan("workspace-1", {
    calendarEntryId: entryId, observationStartsAt: "2026-07-17T13:00:00.000Z", observationEndsAt: "2026-07-31T13:00:00.000Z",
    baseline: [baselineObservation], createdBy: "Analyst",
  });
  const window = {
    windowStartsAt: "2026-07-17T13:00:00.000Z",
    windowEndsAt: "2026-07-31T13:00:00.000Z",
    capturedAt: "2026-07-31T14:00:00.000Z",
  };
  workspace = await service.importPerformance("workspace-1", {
    calendarEntryId: entryId, status: "complete", source: "Manual metrics", sourceClassification: "human_recorded", importedBy: "Analyst",
    notes: "Observed impressions with verified-zero reach", observations: [
      { metric: "impressions", state: "observed", value: 12, unit: "count", ...window, source: "Manual metrics", evidenceReference: "metric-1" },
      { metric: "members_reached", state: "verified_zero", value: 0, unit: "count", ...window, source: "Manual metrics", evidenceReference: "metric-2" },
    ],
  });
  workspace = await service.derivePerformanceMetric("workspace-1", {
    calendarEntryId: entryId, metric: "impressions_per_reached", formula: "ratio",
    sourceMetrics: ["impressions", "members_reached"], windowStartsAt: window.windowStartsAt, windowEndsAt: window.windowEndsAt,
    unit: "ratio", createdBy: "Analyst",
  });
  const derived = workspace.derivedMetrics![0]!;
  assert.equal(derived.state, "unavailable");
  assert.equal(derived.value, undefined);
  assert.match(derived.limitation ?? "", /Division by zero/);
});

test("authority changes invalidate scheduled work and its package", async () => {
  const { service, products } = fixture();
  let workspace = await packageReady(service);
  products.value = { ...products.value, claims: products.value.claims.map((claim) => ({ ...claim, revision: 3, statement: "Changed claim" })) };
  workspace = await service.detectAuthorityImpact("workspace-1");
  assert.equal(workspace.calendarEntries[0]!.scheduleStatus, "approval_invalidated");
  assert.equal(workspace.calendarEntries[0]!.activationStatus, "not_ready");
  assert.equal(workspace.packages[0]!.status, "authority_invalidated");
});

test("repository launch and video variants resolve through their own authority", async () => {
  const { service } = fixture();
  let workspace = await service.createDestination("workspace-1", {
    label: "GitHub release", channel: "github_release", accountReference: "repo:MythologIQ-Labs-LLC/Viable", accountOwner: "MythologIQ Labs, LLC",
    ownershipConfirmed: true, capabilityNotes: ["Manual release"], rateLimitNotes: "Provider limits apply", retryPolicy: "Review before retry", dataHandlingNotes: "No credentials stored",
  });
  workspace = await service.createExternalEntry("workspace-1", {
    title: "Activate repository launch", owner: "Maintainer", startsAt: "2026-07-18T13:00:00.000Z", timezone: "America/New_York", notes: "Manual release",
    destinationId: workspace.destinations[0]!.id, sourceKind: "repository_launch", sourceId: "launch-1",
  });
  assert.equal(workspace.calendarEntries[0]!.source?.repositoryId, "repo-1");
  workspace = await service.createDestination("workspace-1", {
    label: "LinkedIn video", channel: "linkedin", accountReference: "company-page:mythologiq-labs", accountOwner: "MythologIQ Labs, LLC",
    ownershipConfirmed: true, capabilityNotes: ["Manual video post"], rateLimitNotes: "Provider limits apply", retryPolicy: "Review before retry", dataHandlingNotes: "No credentials stored",
  });
  workspace = await service.createExternalEntry("workspace-1", {
    title: "Activate approved video", owner: "Video operator", startsAt: "2026-07-19T13:00:00.000Z", timezone: "America/New_York", notes: "Manual video post",
    destinationId: workspace.destinations[1]!.id, sourceKind: "video_variant", sourceId: "video-linkedin",
  });
  assert.equal(workspace.calendarEntries[1]!.source?.fileReference, "output/final.mp4");
  assert.equal(workspace.calendarEntries[1]!.source?.videoArtifactId, "artifact-1");
});

test("export interruption can recover without claiming delivery", async () => {
  const { service } = fixture();
  let workspace = await packageReady(service);
  const operationId = workspace.exportOperations[0]!.id;
  workspace = await service.markExportInterrupted("workspace-1", operationId, "Browser download was cancelled");
  assert.equal(workspace.exportOperations[0]!.status, "interrupted");
  assert.equal(workspace.calendarEntries[0]!.activationStatus, "ready_for_manual_activation");
  workspace = await service.recoverExport("workspace-1", operationId);
  assert.equal(workspace.exportOperations[0]!.status, "ready_for_download");
  assert.equal(workspace.deliveryOutcomes.length, 0);
});
