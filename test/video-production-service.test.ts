import assert from "node:assert/strict";
import test from "node:test";
import type { CampaignWorkspace } from "../src/campaigns/domain/campaign.js";
import type { CampaignWorkspaceStore } from "../src/campaigns/ports/campaign-workspace-store.js";
import type { ProductWorkspace } from "../src/product-core/domain/workspace.js";
import type { ProductWorkspaceStore } from "../src/product-core/ports/product-workspace-store.js";
import type { VideoProductionWorkspace } from "../src/video-production/domain/video-production.js";
import type { VideoProductionStore } from "../src/video-production/ports/video-production-store.js";
import { VideoProductionService } from "../src/video-production/services/video-production-service.js";

class MemoryVideoStore implements VideoProductionStore {
  value?: VideoProductionWorkspace;
  async load(): Promise<VideoProductionWorkspace | undefined> { return this.value; }
  async save(workspace: VideoProductionWorkspace): Promise<void> { this.value = workspace; }
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
  id: "workspace-1", createdAt: "2026-07-16T00:00:00.000Z", createdBy: "Founder",
  product: {
    identity: { name: "Viable", description: "Marketability OS", lifecycle: "prototype", supportedEnvironments: ["desktop"] },
    capabilities: ["Governed video production packages"], limitations: ["No direct generation or publishing"],
    positioning: "Local-first marketability operations", alternatives: [], differentiation: ["Authority boundaries"],
    pricing: [], packaging: [], offers: ["Internal pilot"], callsToAction: ["Review the pilot"],
    brandVoice: ["direct"], terminology: {}, accessibilityConstraints: ["Captions required"],
    revision: 2, updatedAt: "2026-07-16T00:00:00.000Z", updatedBy: "Founder",
  },
  evidence: [{
    id: "evidence-1", title: "Product test", summary: "Video package behavior verified",
    origin: "test", observedAt: "2026-07-15T00:00:00.000Z", freshnessReviewAt: "2026-08-15T00:00:00.000Z",
    reviewStatus: "reviewed", reviewedBy: "Researcher", reviewedAt: "2026-07-16T00:00:00.000Z", confidence: "high",
  }],
  claims: [{
    id: "claim-1", statement: "Viable preserves named human approval", status: "approved",
    evidenceIds: ["evidence-1"], prohibitedContexts: [], revision: 2,
    reviewedBy: "Product lead", reviewedAt: "2026-07-16T00:00:00.000Z",
  }],
  icpHypotheses: [], assessments: [], actions: [],
});

const campaignWorkspace = (): CampaignWorkspace => ({
  workspaceId: "workspace-1",
  campaigns: [{
    id: "campaign-1", workspaceId: "workspace-1", title: "Launch video", objective: "Explain the pilot",
    primaryOutcome: "Qualified review", primaryAudience: "Founder operators", audienceKind: "test_audience",
    problem: "Approval drift", trigger: "Slice ready", offer: "Internal pilot",
    messageHierarchy: ["Truth", "Evidence", "Approval"], proof: ["Product test"],
    claimReferences: [{ claimId: "claim-1", claimRevision: 2, statement: "Viable preserves named human approval", evidenceIds: ["evidence-1"] }],
    evidenceIds: ["evidence-1"], callToAction: "Review the pilot", channels: ["linkedin"],
    assetPlan: ["Short video"], owner: "Campaign owner", successMeasures: ["One qualified review"], dependencies: [],
    version: 1, status: "approved", createdAt: "2026-07-16T00:00:00.000Z", updatedAt: "2026-07-16T00:00:00.000Z",
    reviewedBy: "Campaign reviewer", reviewedAt: "2026-07-16T00:00:00.000Z", reviewNote: "Approved",
  }],
  assets: [{
    id: "asset-1", workspaceId: "workspace-1", campaignId: "campaign-1", title: "Approved video script",
    audience: "Founder operators",
    claimReferences: [{ claimId: "claim-1", claimRevision: 2, statement: "Viable preserves named human approval", evidenceIds: ["evidence-1"] }],
    evidenceIds: ["evidence-1"], rights: ["Original MythologIQ Labs copy"],
    accessibilityRequirements: ["Captions", "Plain language"], disclosureRequirements: ["Disclose generated media"],
    origin: "human", owner: "Writer",
    versions: [{ version: 1, body: "Viable keeps product truth and named approval connected from brief to final asset.", changedAt: "2026-07-16T00:00:00.000Z", changedBy: "Writer", changeNote: "Initial script" }],
    comments: [], status: "approved", createdAt: "2026-07-16T00:00:00.000Z", updatedAt: "2026-07-16T00:00:00.000Z",
    reviewedBy: "Script reviewer", reviewedAt: "2026-07-16T00:00:00.000Z", reviewNote: "Approved",
  }],
  variants: [], exports: [], updatedAt: "2026-07-16T00:00:00.000Z",
});

const briefInput = {
  sourceAssetId: "asset-1", title: "Governed launch short", objective: "Explain the governed video workflow",
  durationSeconds: 30, platforms: ["linkedin", "youtube_shorts"] as const, aspectRatios: ["1:1", "9:16"] as const,
  visualStyle: "Clean product demonstration", prohibitedElements: ["Invented testimonials", "Unapproved logos"],
  captionsRequired: true, audioDescriptionRequired: false,
  storyboard: [{ purpose: "Introduce the problem", narration: "Campaign claims drift.", visualDirection: "Show disconnected drafts", shotConstraints: ["No real customer data"], durationSeconds: 10 },
    { purpose: "Show the solution", narration: "Viable preserves approved truth.", visualDirection: "Show product workflow", shotConstraints: ["No unapproved branding"], durationSeconds: 20 }],
  sourceAssets: [{
    label: "Product UI reference", mediaType: "image/png", sourceReference: "assets/product-ui.png", owner: "MythologIQ Labs, LLC",
    rightsBasis: "Owned product screenshot", sensitiveKind: "none" as const, consentStatus: "not_applicable" as const,
    allowedUses: ["Video production for this campaign"], prohibitedUses: ["Third-party resale"], disclosureRequirements: [],
    sha256: "a".repeat(64),
  }],
  providers: [
    { kind: "llm" as const, provider: "User selected", model: "User selected", estimatedCost: 0, currency: "USD", dataHandlingNotes: "Configure and review outside the package", credentialMode: "user_supplied_external" as const, credentialsIncluded: false as const },
    { kind: "image" as const, provider: "User selected", model: "User selected", estimatedCost: 0, currency: "USD", dataHandlingNotes: "Configure and review outside the package", credentialMode: "user_supplied_external" as const, credentialsIncluded: false as const },
    { kind: "video" as const, provider: "User selected", model: "User selected", estimatedCost: 0, currency: "USD", dataHandlingNotes: "Configure and review outside the package", credentialMode: "user_supplied_external" as const, credentialsIncluded: false as const },
  ],
  owner: "Video producer",
};

const createService = () => {
  const videos = new MemoryVideoStore();
  const products = new MemoryProductStore(productWorkspace());
  const campaigns = new MemoryCampaignStore(campaignWorkspace());
  let id = 0;
  const service = new VideoProductionService(videos, products, campaigns, () => new Date("2026-07-16T12:00:00.000Z"), () => `id-${++id}`);
  return { service, videos, products, campaigns };
};

async function approvedBrief(service: VideoProductionService): Promise<VideoProductionWorkspace> {
  let workspace = await service.createBrief("workspace-1", briefInput);
  const briefId = workspace.briefs[0]!.id;
  workspace = await service.submitBrief("workspace-1", briefId);
  return service.reviewBrief("workspace-1", briefId, "Video reviewer", "approved", "Script, claims, rights, providers, and accessibility verified");
}

async function productionPackage(service: VideoProductionService): Promise<VideoProductionWorkspace> {
  let workspace = await approvedBrief(service);
  return service.createManualPackage("workspace-1", workspace.briefs[0]!.id, "Package operator");
}

const completedRun = (packageId: string) => ({
  packageId, sourceToolId: "vimax-v1.1.0-manual", sourceToolVersion: "v1.1.0", runCorrelationId: "run-1",
  renderStatus: "completed" as const,
  stages: [
    { stage: "package_received" as const, status: "completed" as const, observedAt: "2026-07-16T12:01:00.000Z", detail: "Package loaded" },
    { stage: "video_generation" as const, status: "completed" as const, observedAt: "2026-07-16T12:02:00.000Z", detail: "Video generated" },
    { stage: "completed" as const, status: "completed" as const, observedAt: "2026-07-16T12:03:00.000Z", detail: "Assembly completed" },
  ],
  files: [
    { path: "output/final.mp4", mimeType: "video/mp4", sizeBytes: 1024, sha256: "b".repeat(64), relationship: "final_render" as const },
    { path: "output/captions.vtt", mimeType: "text/vtt", sizeBytes: 128, sha256: "c".repeat(64), relationship: "captions" as const },
    { path: "output/manifest.json", mimeType: "application/json", sizeBytes: 256, sha256: "d".repeat(64), relationship: "artifact_manifest" as const },
  ],
  redactedLog: "Stages completed. Provider credential values removed.", importedBy: "Artifact importer",
});

test("video brief snapshots approved campaign script and requires named review", async () => {
  const { service } = createService();
  let workspace = await service.createBrief("workspace-1", briefInput);
  const brief = workspace.briefs[0]!;
  assert.equal(brief.status, "draft");
  assert.equal(brief.script, campaignWorkspace().assets[0]!.versions[0]!.body);
  assert.equal(brief.sourceAssetVersion, 1);
  assert.equal(brief.claimReferences[0]!.claimRevision, 2);
  await assert.rejects(service.reviewBrief("workspace-1", brief.id, "Reviewer", "approved", "Too early"), /must be in review/);
  workspace = await service.submitBrief("workspace-1", brief.id);
  workspace = await service.reviewBrief("workspace-1", brief.id, "Named reviewer", "approved", "Authority verified");
  assert.equal(workspace.briefs[0]!.status, "approved");
});

test("sensitive source assets require recorded consent", async () => {
  const { service } = createService();
  await assert.rejects(service.createBrief("workspace-1", {
    ...briefInput,
    sourceAssets: [{ ...briefInput.sourceAssets[0]!, sensitiveKind: "likeness", consentStatus: "missing" }],
  }), /require recorded rights and consent/);
});

test("manual package pins ViMax and contains no credentials or execution claims", async () => {
  const { service } = createService();
  const workspace = await productionPackage(service);
  const record = workspace.packages[0]!;
  const manifest = JSON.parse(record.manifest) as {
    adapterPackets: Array<{ target: { version: string; revision: string; license: string; obligations: string[] }; credentialsIncluded: boolean; files: Record<string, string> }>;
    externalAction: Record<string, boolean>;
  };
  const adapter = manifest.adapterPackets[0]!;
  assert.equal(adapter.target.version, "v1.1.0");
  assert.equal(adapter.target.revision, "1f8f650");
  assert.equal(adapter.target.license, "MIT");
  assert.ok(adapter.target.obligations.some((item) => item.includes("MIT")));
  assert.equal(adapter.credentialsIncluded, false);
  assert.match(adapter.files["vimax/main_script2video_viable.py"]!, /Script2VideoPipeline/);
  assert.match(adapter.files["vimax/configs/script2video.viable.yaml"]!, /api_key:\n/);
  assert.doesNotMatch(record.manifest, /sk-[A-Za-z0-9]/);
  assert.deepEqual(manifest.externalAction, {
    credentialsIncluded: false, executedByViable: false, renderApproved: false, approvedForPublishing: false, delivered: false,
  });
});

test("canonical script or Product Core changes block package export", async () => {
  const { service, campaigns, products } = createService();
  let workspace = await approvedBrief(service);
  const briefId = workspace.briefs[0]!.id;
  campaigns.value = {
    ...campaigns.value,
    assets: campaigns.value.assets.map((asset) => ({ ...asset, versions: [...asset.versions, { version: 2, body: "Changed script", changedAt: "2026-07-16T12:01:00.000Z", changedBy: "Editor", changeNote: "Material change" }], status: "approval_invalidated" as const })),
  };
  await assert.rejects(service.createManualPackage("workspace-1", briefId, "Operator"), /approval changed|version changed/);

  campaigns.value = campaignWorkspace();
  products.value = { ...products.value, claims: products.value.claims.map((claim) => ({ ...claim, status: "retired" as const, revision: 3 })) };
  await assert.rejects(service.createManualPackage("workspace-1", briefId, "Operator"), /claim authority changed/);
});

test("completed render imports as draft and requires separate approval", async () => {
  const { service } = createService();
  let workspace = await productionPackage(service);
  workspace = await service.importRun("workspace-1", completedRun(workspace.packages[0]!.id));
  const artifact = workspace.artifacts[0]!;
  assert.equal(artifact.renderStatus, "completed");
  assert.equal(artifact.reviewStatus, "draft");
  assert.equal(artifact.files[0]!.sourceBriefId, workspace.briefs[0]!.id);
  assert.equal(artifact.files[0]!.sourcePackageId, workspace.packages[0]!.id);
  await assert.rejects(service.reviewArtifact("workspace-1", artifact.id, "Reviewer", "approved", "Too early"), /must be in review/);
  workspace = await service.submitArtifact("workspace-1", artifact.id);
  workspace = await service.reviewArtifact("workspace-1", artifact.id, "Named render reviewer", "approved", "Render, captions, rights, and disclosures verified");
  assert.equal(workspace.artifacts[0]!.reviewStatus, "approved");
});

test("failed renders preserve failure stages and cannot be approved", async () => {
  const { service } = createService();
  let workspace = await productionPackage(service);
  workspace = await service.importRun("workspace-1", {
    packageId: workspace.packages[0]!.id, sourceToolId: "vimax-v1.1.0-manual", sourceToolVersion: "v1.1.0", runCorrelationId: "run-failed",
    renderStatus: "failed", stages: [{ stage: "video_generation", status: "failed", observedAt: "2026-07-16T12:02:00.000Z", detail: "Provider rejected request" }],
    files: [{ path: "output/redacted.log", mimeType: "text/plain", sizeBytes: 42, sha256: "e".repeat(64), relationship: "redacted_log" }],
    redactedLog: "Provider rejected request. Credential values removed.", importedBy: "Artifact importer",
    failureClass: "provider_rejected", failureDetail: "Video provider rejected the generation request",
  });
  const artifact = workspace.artifacts[0]!;
  assert.equal(artifact.renderStatus, "failed");
  assert.equal(artifact.stages[0]!.status, "failed");
  workspace = await service.submitArtifact("workspace-1", artifact.id);
  await assert.rejects(service.reviewArtifact("workspace-1", artifact.id, "Reviewer", "approved", "Approve anyway"), /Only completed renders/);
});

test("approved render creates a separately reviewed platform variant", async () => {
  const { service } = createService();
  let workspace = await productionPackage(service);
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
  workspace = await service.submitVariant("workspace-1", variant.id);
  workspace = await service.reviewVariant("workspace-1", variant.id, "Variant reviewer", "approved", "Platform crop and captions verified");
  assert.equal(workspace.variants[0]!.status, "approved");
});

test("secret-like logs and unsafe artifact paths are rejected", async () => {
  const { service } = createService();
  const workspace = await productionPackage(service);
  const input = completedRun(workspace.packages[0]!.id);
  await assert.rejects(service.importRun("workspace-1", { ...input, redactedLog: "api_key=abcdefghijklmnop" }), /Credentials or secret-like values/);
  await assert.rejects(service.importRun("workspace-1", { ...input, files: [{ ...input.files[0]!, path: "../outside.mp4" }] }), /relative and bounded/);
});
