import assert from "node:assert/strict";
import test from "node:test";
import type { CampaignWorkspace } from "../src/campaigns/domain/campaign.js";
import type { CampaignWorkspaceStore } from "../src/campaigns/ports/campaign-workspace-store.js";
import type { ProductWorkspace } from "../src/product-core/domain/workspace.js";
import type { ProductWorkspaceStore } from "../src/product-core/ports/product-workspace-store.js";
import type { VideoProductionWorkspace } from "../src/video-production/domain/video-production.js";
import type { VideoProductionStore } from "../src/video-production/ports/video-production-store.js";
import { VideoProductionService } from "../src/video-production/services/video-production-service.js";

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
    capabilities: ["Governed video packages"], limitations: ["No direct generation"], positioning: "Local-first",
    alternatives: [], differentiation: ["Approval boundaries"], pricing: [], packaging: [], offers: ["Pilot"],
    callsToAction: ["Review"], brandVoice: ["direct"], terminology: {}, accessibilityConstraints: ["Captions"],
    revision: 1, updatedAt: "2026-07-16T00:00:00.000Z", updatedBy: "Founder",
  },
  evidence: [{
    id: "evidence-1", title: "Founder interview", summary: "Approval is required", origin: "interview",
    observedAt: "2026-07-15T00:00:00.000Z", freshnessReviewAt: "2026-08-15T00:00:00.000Z",
    reviewStatus: "reviewed", reviewedBy: "Researcher", reviewedAt: "2026-07-16T00:00:00.000Z", confidence: "high",
  }],
  claims: [{
    id: "claim-1", statement: "Viable preserves named human approval", status: "approved", evidenceIds: ["evidence-1"],
    prohibitedContexts: [], revision: 2, reviewedBy: "Product lead", reviewedAt: "2026-07-16T00:00:00.000Z",
  }],
  icpHypotheses: [], assessments: [], actions: [],
});

const campaigns = (): CampaignWorkspace => ({
  workspaceId: "workspace-1",
  campaigns: [{
    id: "campaign-1", workspaceId: "workspace-1", title: "Video launch", objective: "Explain the pilot",
    primaryOutcome: "Qualified review", primaryAudience: "Founder operators", audienceKind: "test_audience",
    problem: "Claim drift", trigger: "Slice ready", offer: "Pilot", messageHierarchy: ["Truth", "Approval"],
    proof: ["Founder interview"], claimReferences: [{
      claimId: "claim-1", claimRevision: 2, statement: "Viable preserves named human approval", evidenceIds: ["evidence-1"],
    }],
    evidenceIds: ["evidence-1"], callToAction: "Review", channels: ["linkedin"], assetPlan: ["Short video"],
    owner: "Campaign owner", successMeasures: ["One review"], dependencies: [], version: 1, status: "approved",
    createdAt: "2026-07-16T00:00:00.000Z", updatedAt: "2026-07-16T00:00:00.000Z",
    reviewedBy: "Campaign reviewer", reviewedAt: "2026-07-16T00:00:00.000Z", reviewNote: "Approved",
  }],
  assets: [{
    id: "asset-1", workspaceId: "workspace-1", campaignId: "campaign-1", title: "Approved script",
    audience: "Founder operators", claimReferences: [{
      claimId: "claim-1", claimRevision: 2, statement: "Viable preserves named human approval", evidenceIds: ["evidence-1"],
    }],
    evidenceIds: ["evidence-1"], rights: ["Owned copy"], accessibilityRequirements: ["Captions"],
    disclosureRequirements: ["Generated media disclosure"], origin: "human", owner: "Writer",
    versions: [{
      version: 1, body: "Viable preserves product truth and named approval.", changedAt: "2026-07-16T00:00:00.000Z",
      changedBy: "Writer", changeNote: "Initial script",
    }],
    comments: [], status: "approved", createdAt: "2026-07-16T00:00:00.000Z", updatedAt: "2026-07-16T00:00:00.000Z",
    reviewedBy: "Script reviewer", reviewedAt: "2026-07-16T00:00:00.000Z", reviewNote: "Approved",
  }],
  variants: [], exports: [], updatedAt: "2026-07-16T00:00:00.000Z",
});

const input = {
  sourceAssetId: "asset-1", title: "Governed short", objective: "Explain video governance", durationSeconds: 30,
  platforms: ["linkedin", "youtube_shorts"] as const, aspectRatios: ["1:1", "9:16"] as const,
  visualStyle: "Clean product demonstration", prohibitedElements: ["Invented testimonials", "Unapproved logos"],
  captionsRequired: true, audioDescriptionRequired: false,
  storyboard: [
    { purpose: "Problem", narration: "Claims drift.", visualDirection: "Disconnected drafts", shotConstraints: ["No customer data"], durationSeconds: 10 },
    { purpose: "Solution", narration: "Authority remains visible.", visualDirection: "Product workflow", shotConstraints: ["No unapproved brands"], durationSeconds: 20 },
  ],
  sourceAssets: [{
    label: "Product screenshot", mediaType: "image/png", sourceReference: "assets/product.png", owner: "MythologIQ Labs, LLC",
    rightsBasis: "Owned screenshot", sensitiveKind: "none" as const, consentStatus: "not_applicable" as const,
    allowedUses: ["This campaign"], prohibitedUses: ["Resale"], disclosureRequirements: [], sha256: "a".repeat(64),
  }],
  providers: (["llm", "image", "video"] as const).map((kind) => ({
    kind, provider: "User selected", model: "User selected", estimatedCost: 0, currency: "USD",
    dataHandlingNotes: "Configured outside the package", credentialMode: "user_supplied_external" as const, credentialsIncluded: false as const,
  })),
  owner: "Video producer",
};

const fixture = () => {
  const videos = new VideoStore();
  const products = new ProductStore(product());
  const campaignStore = new CampaignStore(campaigns());
  let id = 0;
  const service = new VideoProductionService(videos, products, campaignStore, () => new Date("2026-07-16T12:00:00.000Z"), () => `id-${++id}`);
  return { service, products, campaignStore };
};

async function approveBrief(service: VideoProductionService): Promise<VideoProductionWorkspace> {
  let workspace = await service.createBrief("workspace-1", input);
  const id = workspace.briefs[0]!.id;
  await service.submitBrief("workspace-1", id);
  return service.reviewBrief("workspace-1", id, "Brief reviewer", "approved", "Authority, rights, cost, and accessibility verified");
}

async function makePackage(service: VideoProductionService): Promise<VideoProductionWorkspace> {
  const workspace = await approveBrief(service);
  return service.createManualPackage("workspace-1", workspace.briefs[0]!.id, "Package operator");
}

const completedRun = (packageId: string) => ({
  packageId, sourceToolId: "vimax-v1.1.0-manual", sourceToolVersion: "v1.1.0", runCorrelationId: "run-1",
  renderStatus: "completed" as const,
  stages: [
    { stage: "package_received" as const, status: "completed" as const, observedAt: "2026-07-16T12:01:00.000Z", detail: "Package loaded" },
    { stage: "completed" as const, status: "completed" as const, observedAt: "2026-07-16T12:03:00.000Z", detail: "Assembly completed" },
  ],
  files: [
    { path: "output/final.mp4", mimeType: "video/mp4", sizeBytes: 1024, sha256: "b".repeat(64), relationship: "final_render" as const },
    { path: "output/captions.vtt", mimeType: "text/vtt", sizeBytes: 128, sha256: "c".repeat(64), relationship: "captions" as const },
  ],
  redactedLog: "Render completed. Secret values removed.", importedBy: "Importer",
});

test("video brief snapshots approved campaign authority and requires review", async () => {
  const { service } = fixture();
  let workspace = await service.createBrief("workspace-1", input);
  const brief = workspace.briefs[0]!;
  assert.equal(brief.script, "Viable preserves product truth and named approval.");
  assert.equal(brief.sourceAssetVersion, 1);
  assert.equal(brief.status, "draft");
  await assert.rejects(service.reviewBrief("workspace-1", brief.id, "Reviewer", "approved", "Too early"), /must be in review/);
  await service.submitBrief("workspace-1", brief.id);
  workspace = await service.reviewBrief("workspace-1", brief.id, "Named reviewer", "approved", "Verified");
  assert.equal(workspace.briefs[0]!.status, "approved");
});

test("sensitive assets require recorded consent", async () => {
  const { service } = fixture();
  await assert.rejects(service.createBrief("workspace-1", {
    ...input, sourceAssets: [{ ...input.sourceAssets[0]!, sensitiveKind: "likeness", consentStatus: "missing" }],
  }), /recorded rights and consent/);
});

test("manual package pins ViMax, preserves MIT obligations, and excludes execution authority", async () => {
  const { service } = fixture();
  const workspace = await makePackage(service);
  const record = workspace.packages[0]!;
  const manifest = JSON.parse(record.manifest) as {
    adapterPackets: Array<{ target: { version: string; revision: string; license: string; obligations: string[] }; credentialsIncluded: boolean; files: Record<string, string> }>;
    externalAction: Record<string, boolean>;
  };
  const adapter = manifest.adapterPackets[0]!;
  assert.deepEqual([adapter.target.version, adapter.target.revision, adapter.target.license], ["v1.1.0", "1f8f650", "MIT"]);
  assert.ok(adapter.target.obligations.some((value) => value.includes("MIT")));
  assert.equal(adapter.credentialsIncluded, false);
  assert.match(adapter.files["vimax/main_script2video_viable.py"]!, /Script2VideoPipeline/);
  assert.match(adapter.files["vimax/configs/script2video.viable.yaml"]!, /api_key:\n/);
  assert.deepEqual(manifest.externalAction, {
    credentialsIncluded: false, executedByViable: false, renderApproved: false, approvedForPublishing: false, delivered: false,
  });
});

test("script or claim changes block a production package", async () => {
  const { service, products, campaignStore } = fixture();
  const workspace = await approveBrief(service);
  const id = workspace.briefs[0]!.id;
  campaignStore.value = {
    ...campaignStore.value,
    assets: campaignStore.value.assets.map((asset) => ({
      ...asset, status: "approval_invalidated" as const,
      versions: [...asset.versions, { version: 2, body: "Changed", changedAt: "2026-07-16T12:01:00.000Z", changedBy: "Editor", changeNote: "Changed" }],
    })),
  };
  await assert.rejects(service.createManualPackage("workspace-1", id, "Operator"), /approval changed|version changed/);
  campaignStore.value = campaigns();
  products.value = { ...products.value, claims: products.value.claims.map((claim) => ({ ...claim, status: "retired" as const, revision: 3 })) };
  await assert.rejects(service.createManualPackage("workspace-1", id, "Operator"), /claim authority changed/);
});

test("render completion remains draft until named Viable approval", async () => {
  const { service } = fixture();
  let workspace = await makePackage(service);
  workspace = await service.importRun("workspace-1", completedRun(workspace.packages[0]!.id));
  const artifact = workspace.artifacts[0]!;
  assert.equal(artifact.renderStatus, "completed");
  assert.equal(artifact.reviewStatus, "draft");
  assert.equal(artifact.files[0]!.sourcePackageId, workspace.packages[0]!.id);
  await service.submitArtifact("workspace-1", artifact.id);
  workspace = await service.reviewArtifact("workspace-1", artifact.id, "Render reviewer", "approved", "Render, captions, rights, and disclosures verified");
  assert.equal(workspace.artifacts[0]!.reviewStatus, "approved");
});

test("failed runs remain visible and cannot be approved", async () => {
  const { service } = fixture();
  let workspace = await makePackage(service);
  workspace = await service.importRun("workspace-1", {
    packageId: workspace.packages[0]!.id, sourceToolId: "vimax-v1.1.0-manual", sourceToolVersion: "v1.1.0", runCorrelationId: "run-failed",
    renderStatus: "failed", stages: [{ stage: "video_generation", status: "failed", observedAt: "2026-07-16T12:02:00.000Z", detail: "Provider rejected request" }],
    files: [{ path: "output/redacted.log", mimeType: "text/plain", sizeBytes: 42, sha256: "e".repeat(64), relationship: "redacted_log" }],
    redactedLog: "Provider rejected request. Secret values removed.", importedBy: "Importer",
    failureClass: "provider_rejected", failureDetail: "Provider rejected the request",
  });
  const artifact = workspace.artifacts[0]!;
  assert.equal(artifact.stages[0]!.status, "failed");
  await service.submitArtifact("workspace-1", artifact.id);
  await assert.rejects(service.reviewArtifact("workspace-1", artifact.id, "Reviewer", "approved", "Approve anyway"), /Only completed renders/);
});

test("approved render creates a separately reviewed platform variant", async () => {
  const { service } = fixture();
  let workspace = await makePackage(service);
  workspace = await service.importRun("workspace-1", completedRun(workspace.packages[0]!.id));
  const artifactId = workspace.artifacts[0]!.id;
  await service.submitArtifact("workspace-1", artifactId);
  workspace = await service.reviewArtifact("workspace-1", artifactId, "Render reviewer", "approved", "Approved");
  const render = workspace.artifacts[0]!.files.find((file) => file.relationship === "final_render")!;
  const captions = workspace.artifacts[0]!.files.find((file) => file.relationship === "captions")!;
  workspace = await service.createVariant("workspace-1", {
    artifactId, platform: "linkedin", aspectRatio: "1:1", fileId: render.id, captionFileId: captions.id,
    accessibilityNotes: ["Verify captions against final audio"],
  });
  const variant = workspace.variants[0]!;
  assert.equal(variant.status, "draft");
  await service.submitVariant("workspace-1", variant.id);
  workspace = await service.reviewVariant("workspace-1", variant.id, "Variant reviewer", "approved", "Crop and captions verified");
  assert.equal(workspace.variants[0]!.status, "approved");
});

test("secret-like logs and unsafe paths are rejected", async () => {
  const { service } = fixture();
  const workspace = await makePackage(service);
  const run = completedRun(workspace.packages[0]!.id);
  await assert.rejects(service.importRun("workspace-1", { ...run, redactedLog: "api_key=abcdefghijklmnop" }), /Credentials or secret-like values/);
  await assert.rejects(service.importRun("workspace-1", { ...run, files: [{ ...run.files[0]!, path: "../outside.mp4" }] }), /relative and bounded/);
});
