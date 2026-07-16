import assert from "node:assert/strict";
import test from "node:test";
import type { CampaignWorkspace } from "../src/campaigns/domain/campaign.js";
import type { CampaignWorkspaceStore } from "../src/campaigns/ports/campaign-workspace-store.js";
import type { ProductWorkspace } from "../src/product-core/domain/workspace.js";
import type { ProductWorkspaceStore } from "../src/product-core/ports/product-workspace-store.js";
import type { VideoProductionWorkspace } from "../src/video-production/domain/video-production.js";
import type { VideoProductionStore } from "../src/video-production/ports/video-production-store.js";
import { VideoProductionService } from "../src/video-production/services/guarded-video-production-service.js";

class VideoStore implements VideoProductionStore {
  value?: VideoProductionWorkspace;
  async load(): Promise<VideoProductionWorkspace | undefined> { return this.value; }
  async save(value: VideoProductionWorkspace): Promise<void> { this.value = value; }
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

const product = (): ProductWorkspace => ({
  id: "workspace-1", createdAt: "2026-07-16T00:00:00.000Z", createdBy: "Founder",
  product: {
    identity: { name: "Viable", description: "Marketability OS", lifecycle: "prototype", supportedEnvironments: ["desktop"] },
    capabilities: ["Video packages"], limitations: ["No execution"], positioning: "Local-first", alternatives: [],
    differentiation: ["Authority"], pricing: [], packaging: [], offers: ["Pilot"], callsToAction: ["Review"],
    brandVoice: ["direct"], terminology: {}, accessibilityConstraints: ["Captions"], revision: 1,
    updatedAt: "2026-07-16T00:00:00.000Z", updatedBy: "Founder",
  },
  evidence: [{
    id: "evidence-1", title: "Interview", summary: "Approval matters", origin: "interview",
    observedAt: "2026-07-15T00:00:00.000Z", freshnessReviewAt: "2026-08-15T00:00:00.000Z",
    reviewStatus: "reviewed", reviewedBy: "Researcher", reviewedAt: "2026-07-16T00:00:00.000Z", confidence: "high",
  }],
  claims: [{
    id: "claim-1", statement: "Approval remains named", status: "approved", evidenceIds: ["evidence-1"],
    prohibitedContexts: [], revision: 1, reviewedBy: "Product lead", reviewedAt: "2026-07-16T00:00:00.000Z",
  }],
  icpHypotheses: [], assessments: [], actions: [],
});

const campaigns = (): CampaignWorkspace => ({
  workspaceId: "workspace-1",
  campaigns: [{
    id: "campaign-1", workspaceId: "workspace-1", title: "Campaign", objective: "Explain", primaryOutcome: "Review",
    primaryAudience: "Founders", audienceKind: "test_audience", problem: "Drift", trigger: "Launch", offer: "Pilot",
    messageHierarchy: ["Truth"], proof: ["Interview"], claimReferences: [{
      claimId: "claim-1", claimRevision: 1, statement: "Approval remains named", evidenceIds: ["evidence-1"],
    }],
    evidenceIds: ["evidence-1"], callToAction: "Review", channels: ["linkedin"], assetPlan: ["Video"],
    owner: "Owner", successMeasures: ["Review"], dependencies: [], version: 1, status: "approved",
    createdAt: "2026-07-16T00:00:00.000Z", updatedAt: "2026-07-16T00:00:00.000Z",
  }],
  assets: [{
    id: "asset-1", workspaceId: "workspace-1", campaignId: "campaign-1", title: "Script", audience: "Founders",
    claimReferences: [{ claimId: "claim-1", claimRevision: 1, statement: "Approval remains named", evidenceIds: ["evidence-1"] }],
    evidenceIds: ["evidence-1"], rights: ["Owned"], accessibilityRequirements: ["Captions"], disclosureRequirements: [],
    origin: "human", owner: "Writer", versions: [{ version: 1, body: "Approved script", changedAt: "2026-07-16T00:00:00.000Z", changedBy: "Writer", changeNote: "Initial" }],
    comments: [], status: "approved", createdAt: "2026-07-16T00:00:00.000Z", updatedAt: "2026-07-16T00:00:00.000Z",
  }],
  variants: [], exports: [], updatedAt: "2026-07-16T00:00:00.000Z",
});

const setup = () => {
  const videos = new VideoStore();
  const products = new ProductStore(product());
  const campaignStore = new CampaignStore(campaigns());
  let id = 0;
  const service = new VideoProductionService(videos, products, campaignStore, () => new Date("2026-07-16T12:00:00.000Z"), () => `id-${++id}`);
  return { service, products, campaignStore };
};

const briefInput = {
  sourceAssetId: "asset-1", title: "Video", objective: "Explain", durationSeconds: 15,
  platforms: ["linkedin"] as const, aspectRatios: ["1:1"] as const, visualStyle: "Product demo",
  prohibitedElements: ["Invented claims"], captionsRequired: true, audioDescriptionRequired: false,
  storyboard: [{ purpose: "Explain", narration: "Approved script", visualDirection: "Product", shotConstraints: ["No customer data"], durationSeconds: 15 }],
  sourceAssets: [{ label: "UI", mediaType: "image/png", sourceReference: "ui.png", owner: "Owner", rightsBasis: "Owned", sensitiveKind: "none" as const, consentStatus: "not_applicable" as const, allowedUses: ["Campaign"], prohibitedUses: [], disclosureRequirements: [] }],
  providers: (["llm", "image", "video"] as const).map((kind) => ({ kind, provider: "External", model: "Selected", estimatedCost: 0, currency: "USD", dataHandlingNotes: "External", credentialMode: "user_supplied_external" as const, credentialsIncluded: false as const })),
  owner: "Producer",
};

async function packageReady(service: VideoProductionService): Promise<VideoProductionWorkspace> {
  let workspace = await service.createBrief("workspace-1", briefInput);
  const briefId = workspace.briefs[0]!.id;
  await service.submitBrief("workspace-1", briefId);
  await service.reviewBrief("workspace-1", briefId, "Reviewer", "approved", "Approved");
  return service.createManualPackage("workspace-1", briefId, "Operator");
}

test("artifact import rejects campaign or script authority that changed during external production", async () => {
  const { service, campaignStore } = setup();
  const workspace = await packageReady(service);
  campaignStore.value = {
    ...campaignStore.value,
    assets: campaignStore.value.assets.map((asset) => ({ ...asset, status: "approval_invalidated" as const })),
  };
  await assert.rejects(service.importRun("workspace-1", {
    packageId: workspace.packages[0]!.id, sourceToolId: "vimax", sourceToolVersion: "v1.1.0", runCorrelationId: "run-1",
    renderStatus: "completed", stages: [{ stage: "completed", status: "completed", observedAt: "2026-07-16T12:30:00.000Z", detail: "Done" }],
    files: [{ path: "final.mp4", mimeType: "video/mp4", sizeBytes: 1, sha256: "a".repeat(64), relationship: "final_render" }],
    redactedLog: "Done", importedBy: "Importer",
  }), /approval changed/);
});

test("variant approval rejects Product Core claim changes after render approval", async () => {
  const { service, products } = setup();
  let workspace = await packageReady(service);
  workspace = await service.importRun("workspace-1", {
    packageId: workspace.packages[0]!.id, sourceToolId: "vimax", sourceToolVersion: "v1.1.0", runCorrelationId: "run-1",
    renderStatus: "completed", stages: [{ stage: "completed", status: "completed", observedAt: "2026-07-16T12:30:00.000Z", detail: "Done" }],
    files: [
      { path: "final.mp4", mimeType: "video/mp4", sizeBytes: 1, sha256: "a".repeat(64), relationship: "final_render" },
      { path: "captions.vtt", mimeType: "text/vtt", sizeBytes: 1, sha256: "b".repeat(64), relationship: "captions" },
    ],
    redactedLog: "Done", importedBy: "Importer",
  });
  const artifactId = workspace.artifacts[0]!.id;
  await service.submitArtifact("workspace-1", artifactId);
  workspace = await service.reviewArtifact("workspace-1", artifactId, "Reviewer", "approved", "Approved");
  const render = workspace.artifacts[0]!.files.find((file) => file.relationship === "final_render")!;
  const captions = workspace.artifacts[0]!.files.find((file) => file.relationship === "captions")!;
  workspace = await service.createVariant("workspace-1", { artifactId, platform: "linkedin", aspectRatio: "1:1", fileId: render.id, captionFileId: captions.id, accessibilityNotes: ["Captions checked"] });
  const variantId = workspace.variants[0]!.id;
  await service.submitVariant("workspace-1", variantId);
  products.value = { ...products.value, claims: products.value.claims.map((claim) => ({ ...claim, revision: 2, statement: "Changed claim" })) };
  await assert.rejects(service.reviewVariant("workspace-1", variantId, "Variant reviewer", "approved", "Approve"), /claim authority changed/);
});
