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
