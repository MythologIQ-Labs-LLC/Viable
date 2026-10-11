import assert from "node:assert/strict";
import test from "node:test";
import type { ActivationLearningWorkspace } from "../src/activation-learning/domain/activation-learning.js";
import type { ActivationLearningStore } from "../src/activation-learning/ports/activation-learning-store.js";
import { ActivationLearningService } from "../src/activation-learning/services/activation-learning-service.js";
import type { AuthorityRevision, CampaignWorkspace, CompositionBrief } from "../src/campaigns/domain/campaign.js";
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

async function testSha256(value: string): Promise<string> {
  const digest = await globalThis.crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function cohortBrief(id: string, hookArchetype: string, version = 1, history?: readonly AuthorityRevision[]): CompositionBrief {
  return {
    id,
    workspaceId: "workspace-1",
    campaignId: "campaign-1",
    objective: "product_proof" as const,
    primaryAudience: "Founder operators",
    desiredOutcome: "Qualified review",
    topic: "Governed launch",
    contentFamily: "build_proof" as const,
    hookArchetype,
    toneConstraints: ["Direct"],
    claimReferences: [claimReference],
    evidenceIds: ["evidence-1"],
    prohibitedClaims: [],
    destinationId: "cohort-destination",
    format: "text" as const,
    mediaAssetIds: [],
    callToAction: "Review",
    externalLinkPolicy: "none" as const,
    hypothesis: "Concrete proof earns qualified review",
    version,
    createdAt: "2026-07-01T00:00:00.000Z",
    updatedAt: "2026-07-01T00:00:00.000Z",
    ...(history ? { history } : {}),
  };
}

function cohortIdentity(brief: CompositionBrief): Readonly<Record<string, unknown>> {
  return {
    campaignId: brief.campaignId,
    icpHypothesisId: null,
    objective: brief.objective,
    primaryAudience: brief.primaryAudience,
    desiredOutcome: brief.desiredOutcome,
    topic: brief.topic,
    contentFamily: brief.contentFamily,
    hookArchetype: brief.hookArchetype ?? null,
    toneConstraints: [...brief.toneConstraints],
    claimReferences: brief.claimReferences.map((reference) => ({
      claimId: reference.claimId,
      claimRevision: reference.claimRevision,
      statement: reference.statement,
      evidenceIds: [...reference.evidenceIds],
    })),
    evidenceIds: [...brief.evidenceIds],
    prohibitedClaims: [...brief.prohibitedClaims],
    destinationId: brief.destinationId,
    format: brief.format,
    mediaAssetIds: [...brief.mediaAssetIds],
    callToAction: brief.callToAction ?? null,
    externalLinkPolicy: brief.externalLinkPolicy,
    hypothesis: brief.hypothesis,
  };
}

async function seedComparableCohort() {
  const fixtureValue = fixture();
  const { activation, campaignStore } = fixtureValue;

  const historicalReference = cohortBrief("composition-reference", "product_proof", 1);
  const historicalRaw = JSON.stringify(cohortIdentity(historicalReference));
  const currentReference = {
    ...cohortBrief("composition-reference", "contradiction", 2),
    history: [{
      version: 1,
      changedAt: "2026-07-05T00:00:00.000Z",
      changedBy: "Campaign owner",
      rationale: "Later hook revision",
      changedFields: ["hookArchetype"],
      snapshot: historicalRaw,
    }],
  };
  const questionBrief = cohortBrief("composition-question", "question");
  const sevenDayBrief = cohortBrief("composition-seven-day", "question");
  const mismatchBrief = cohortBrief("composition-mismatch", "question");
  const multiBrief = cohortBrief("composition-multi", "question");

  const experiment = async (
    id: string,
    brief: CompositionBrief,
    compositionBriefVersion: number,
    compositionRaw: string,
    changedVariables: readonly ("hook" | "timing")[],
  ) => ({
    id,
    workspaceId: "workspace-1",
    compositionBriefId: brief.id,
    compositionBriefVersion,
    compositionBriefSha256: await testSha256(compositionRaw),
    channelVariantId: "variant-linkedin",
    channelVariantVersion: 1,
    channelVariantBodySha256: "c".repeat(64),
    destinationId: "cohort-destination",
    provider: "linkedin",
    timezone: "America/New_York",
    expectedOutcome: "Qualified review",
    changedVariables,
    status: "published" as const,
    createdAt: "2026-07-01T00:00:00.000Z",
    updatedAt: "2026-07-01T00:00:00.000Z",
  });

  const experiments = [
    await experiment("experiment-reference", currentReference, 1, historicalRaw, ["hook"]),
    await experiment("experiment-question", questionBrief, 1, JSON.stringify(cohortIdentity(questionBrief)), ["hook"]),
    await experiment("experiment-seven-day", sevenDayBrief, 1, JSON.stringify(cohortIdentity(sevenDayBrief)), ["hook"]),
    await experiment("experiment-mismatch", mismatchBrief, 1, JSON.stringify(cohortIdentity(mismatchBrief)), ["hook"]),
    await experiment("experiment-multi", multiBrief, 1, JSON.stringify(cohortIdentity(multiBrief)), ["hook", "timing"]),
  ];

  campaignStore.value = {
    ...campaignStore.value,
    compositionBriefs: [currentReference, questionBrief, sevenDayBrief, mismatchBrief, multiBrief],
    publicationExperiments: experiments,
  };

  const publication = (calendarEntryId: string, day: string, publicationId: string) => ({
    id: `delivery-${calendarEntryId}`,
    workspaceId: "workspace-1",
    calendarEntryId,
    packageId: `package-${calendarEntryId}`,
    status: "delivered" as const,
    evidenceClassification: "provider_evidence" as const,
    source: "Provider receipt",
    observedAt: `${day}T12:00:00.000Z`,
    recordedAt: `${day}T12:05:00.000Z`,
    recordedBy: "Analyst",
    evidenceReferences: [`receipt-${publicationId}`],
    note: "Delivered",
    publicationId,
  });

  const observation = (
    id: string,
    value: number,
    day: string,
    end: string,
    definition = "Provider-native impression count",
  ) => ({
    id,
    metric: "impressions",
    providerMetric: "Impressions",
    providerDefinition: definition,
    state: "observed" as const,
    value,
    unit: "count",
    windowStartsAt: `${day}T12:00:00.000Z`,
    windowEndsAt: end,
    capturedAt: end,
    source: "Provider export",
    evidenceReference: `${id}.csv`,
  });

  const performanceImport = (
    id: string,
    experimentId: string,
    calendarEntryId: string,
    publicationId: string,
    observations: readonly ReturnType<typeof observation>[],
  ) => ({
    id,
    workspaceId: "workspace-1",
    calendarEntryId,
    publicationExperimentId: experimentId,
    providerPublicationId: publicationId,
    normalizedDigest: id.padEnd(64, "a").slice(0, 64),
    status: "complete" as const,
    source: "Provider export",
    sourceClassification: "provider_export" as const,
    observations,
    importedAt: observations[0]!.capturedAt,
    importedBy: "Analyst",
    notes: "Cohort fixture",
  });

  activation.value = {
    workspaceId: "workspace-1",
    destinations: [{
      id: "cohort-destination",
      workspaceId: "workspace-1",
      label: "Company LinkedIn",
      channel: "linkedin",
      accountReference: "company-page:mythologiq-labs",
      accountOwner: "MythologIQ Labs, LLC",
      ownershipConfirmed: true,
      deliveryMode: "manual_only",
      capabilityNotes: ["Manual post"],
      rateLimitNotes: "Follow provider limits",
      retryPolicy: "Review before retry",
      dataHandlingNotes: "No credentials",
      status: "active",
      createdAt: "2026-07-01T00:00:00.000Z",
      updatedAt: "2026-07-01T00:00:00.000Z",
    }],
    calendarEntries: [],
    packages: [],
    exportOperations: [],
    deliveryOutcomes: [
      publication("entry-reference", "2026-07-01", "pub-reference"),
      publication("entry-question", "2026-07-03", "pub-question"),
      publication("entry-seven-day", "2026-07-05", "pub-seven-day"),
      publication("entry-mismatch", "2026-07-07", "pub-mismatch"),
      publication("entry-multi", "2026-07-09", "pub-multi"),
    ],
    measurementPlans: [],
    performanceImports: [
      performanceImport("import-reference", "experiment-reference", "entry-reference", "pub-reference", [
        observation("obs-reference", 10, "2026-07-01", "2026-07-02T12:00:00.000Z"),
      ]),
      performanceImport("import-question-20h", "experiment-question", "entry-question", "pub-question", [
        observation("obs-question-20h", 11, "2026-07-03", "2026-07-04T08:00:00.000Z"),
      ]),
      performanceImport("import-question-24h", "experiment-question", "entry-question", "pub-question", [
        observation("obs-question-24h", 12, "2026-07-03", "2026-07-04T12:00:00.000Z"),
      ]),
      performanceImport("import-seven-day", "experiment-seven-day", "entry-seven-day", "pub-seven-day", [
        observation("obs-seven-day", 999, "2026-07-05", "2026-07-12T12:00:00.000Z"),
      ]),
      performanceImport("import-mismatch", "experiment-mismatch", "entry-mismatch", "pub-mismatch", [
        observation("obs-mismatch", 50, "2026-07-07", "2026-07-08T12:00:00.000Z", "Unique member reach"),
      ]),
      performanceImport("import-multi", "experiment-multi", "entry-multi", "pub-multi", [
        observation("obs-multi", 100, "2026-07-09", "2026-07-10T12:00:00.000Z"),
      ]),
    ],
    derivedMetrics: [],
    cohortEvaluations: [],
    retrospectives: [],
    learningLedger: [],
    updatedAt: "2026-07-13T00:00:00.000Z",
  };

  return fixtureValue;
}

test("24h cohort uses historical experiment context, one observation per experiment, and value-independent exclusions", async () => {
  const { service } = await seedComparableCohort();
  const workspace = await service.evaluatePublicationCohort("workspace-1", {
    referenceExperimentId: "experiment-reference",
    metric: "impressions",
    ageBucket: "24h",
    compareVariable: "hook",
    createdBy: "Analyst",
  });
  const evaluation = workspace.cohortEvaluations![0]!;
  assert.equal(evaluation.sampleSize, 2);
  assert.equal(evaluation.confidence, "insufficient");
  assert.deepEqual(evaluation.included.map((item) => item.publicationExperimentId), ["experiment-reference", "experiment-question"]);
  assert.equal(evaluation.included.find((item) => item.publicationExperimentId === "experiment-reference")?.groupValue, "product_proof");
  assert.equal(evaluation.included.find((item) => item.publicationExperimentId === "experiment-question")?.observationId, "obs-question-24h");
  assert.ok(!evaluation.included.some((item) => item.value === 999));
  assert.ok(evaluation.excluded.some((item) => item.publicationExperimentId === "experiment-seven-day" && /24h/.test(item.reason)));
  assert.ok(evaluation.excluded.some((item) => item.publicationExperimentId === "experiment-mismatch" && /definition/.test(item.reason)));
  assert.ok(evaluation.excluded.some((item) => item.publicationExperimentId === "experiment-multi" && /Single-variable hook/.test(item.reason)));
  assert.match(evaluation.advisory, /not enough evidence/i);
  assert.match(evaluation.limitation, /product guidance, not statistical proof/i);
});

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
    notes: "First export", observations: [{
      ...outcomeObservation,
      source: "Provider export A",
      evidenceReference: "outcome-note-1",
    }],
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

test("estimated and partial numeric disagreement reconciles as conflict", async () => {
  const { service } = fixture();
  let workspace = await approvedSchedule(service);
  const entryId = workspace.calendarEntries[0]!.id;
  workspace = await service.createMeasurementPlan("workspace-1", {
    calendarEntryId: entryId,
    observationStartsAt: "2026-07-17T13:00:00.000Z",
    observationEndsAt: "2026-07-31T13:00:00.000Z",
    baseline: [baselineObservation],
    createdBy: "Analyst",
  });
  workspace = await service.importPerformance("workspace-1", {
    calendarEntryId: entryId,
    status: "partial",
    source: "Estimate A",
    sourceClassification: "human_recorded",
    importedBy: "Analyst",
    notes: "Estimated reach",
    observations: [{
      ...outcomeObservation,
      metric: "members_reached",
      state: "estimated",
      value: 25,
      source: "Estimate A",
      evidenceReference: "estimate-a",
      limitation: "Estimated from sampled dashboard evidence",
    }],
  });
  workspace = await service.importPerformance("workspace-1", {
    calendarEntryId: entryId,
    status: "partial",
    source: "Partial B",
    sourceClassification: "human_recorded",
    importedBy: "Analyst",
    notes: "Partial reach count",
    observations: [{
      ...outcomeObservation,
      metric: "members_reached",
      state: "partial",
      value: 30,
      source: "Partial B",
      evidenceReference: "partial-b",
      limitation: "Only part of the reporting window was visible",
    }],
  });
  const reconciled = await service.reconcilePerformanceEvidence("workspace-1", entryId);
  assert.equal(reconciled.length, 1);
  assert.equal(reconciled[0]!.state, "conflict");
  assert.equal(reconciled[0]!.value, undefined);
  assert.match(reconciled[0]!.limitation ?? "", /25 vs 30/);
});

test("retrospective compares only the exact measurement-plan outcome window", async () => {
  const { service } = fixture();
  let workspace = await packageReady(service);
  const entryId = workspace.calendarEntries[0]!.id;
  workspace = await service.markExportDownloaded("workspace-1", workspace.exportOperations[0]!.id);
  workspace = await service.recordDeliveryOutcome("workspace-1", {
    calendarEntryId: entryId,
    packageId: workspace.packages[0]!.id,
    status: "delivered",
    evidenceClassification: "human_recorded",
    source: "Operator",
    observedAt: "2026-07-17T13:05:00.000Z",
    recordedBy: "Operator",
    evidenceReferences: ["delivery-proof-window"],
    note: "Published manually",
    deliveryUrl: "https://www.linkedin.com/posts/example",
  });
  workspace = await service.createMeasurementPlan("workspace-1", {
    calendarEntryId: entryId,
    observationStartsAt: outcomeObservation.windowStartsAt,
    observationEndsAt: outcomeObservation.windowEndsAt,
    baseline: [baselineObservation],
    createdBy: "Analyst",
  });
  workspace = await service.importPerformance("workspace-1", {
    calendarEntryId: entryId,
    status: "complete",
    source: "Planned outcome window",
    sourceClassification: "human_recorded",
    importedBy: "Analyst",
    notes: "Exact plan window",
    observations: [{
      ...outcomeObservation,
      source: "Planned outcome window",
      evidenceReference: "planned-window",
    }],
  });
  workspace = await service.importPerformance("workspace-1", {
    calendarEntryId: entryId,
    status: "complete",
    source: "Later checkpoint",
    sourceClassification: "human_recorded",
    importedBy: "Analyst",
    notes: "Different reporting window",
    observations: [{
      ...outcomeObservation,
      value: 9,
      windowStartsAt: "2026-08-01T00:00:00.000Z",
      windowEndsAt: "2026-08-07T23:59:59.000Z",
      capturedAt: "2026-08-08T10:00:00.000Z",
      source: "Later checkpoint",
      evidenceReference: "later-window",
    }],
  });
  workspace = await service.completeRetrospective("workspace-1", {
    calendarEntryId: entryId,
    completedBy: "Campaign owner",
    summary: "Use the planned outcome window only",
    learnings: ["Later checkpoints should not silently replace the planned outcome window"],
    decision: "continue",
    attributionModel: "manual",
    attributionUncertainty: "Manual attribution remains bounded",
    evidenceReferences: ["delivery-proof-window", "planned-window", "later-window"],
    reversibleNextAction: "Continue the same bounded experiment",
    icpConfidenceEffect: "no_change",
    icpConfidenceRationale: "The planned window is the comparison authority",
    positioningEffect: "No positioning change",
    learningChange: "Keep the planned observation window explicit",
    learningOutcome: "Planned window produced three qualified reviews",
    learningFollowUp: "Review later checkpoints separately",
  });
  const comparison = workspace.retrospectives[0]!.comparisons[0]!;
  assert.equal(comparison.outcomeValue, 3);
  assert.equal(comparison.delta, 3);
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
