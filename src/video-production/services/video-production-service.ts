import type { CampaignWorkspace, CanonicalAsset, ClaimReference } from "../../campaigns/domain/campaign.js";
import type { CampaignWorkspaceStore } from "../../campaigns/ports/campaign-workspace-store.js";
import { isReviewedEvidence } from "../../product-core/domain/evidence.js";
import type { ProductWorkspace } from "../../product-core/domain/workspace.js";
import type { ProductWorkspaceStore } from "../../product-core/ports/product-workspace-store.js";
import { buildVimaxManualAdaptation, VIMAX_V1_1_TOOL } from "../adapters/vimax-v1-1-manual-adapter.js";
import type {
  ImportedVideoArtifact,
  SourceAssetManifestEntry,
  StoryboardScene,
  VideoAspectRatio,
  VideoBrief,
  VideoPlatform,
  VideoPlatformVariant,
  VideoProductionPackage,
  VideoProductionWorkspace,
  VideoProviderSelection,
  VideoReviewStatus,
  VideoRunStage,
} from "../domain/video-production.js";
import type { VideoProductionStore } from "../ports/video-production-store.js";

type Clock = () => Date;
type IdFactory = () => string;
type ReviewDecision = "approved" | "rejected" | "changes_requested";

export class VideoProductionService {
  constructor(
    private readonly store: VideoProductionStore,
    private readonly productStore: ProductWorkspaceStore,
    private readonly campaignStore: CampaignWorkspaceStore,
    private readonly clock: Clock = () => new Date(),
    private readonly createId: IdFactory = () => globalThis.crypto.randomUUID(),
  ) {}

  async load(workspaceId: string): Promise<VideoProductionWorkspace> {
    return await this.store.load(workspaceId) ?? emptyWorkspace(workspaceId, this.clock().toISOString());
  }

  async createBrief(workspaceId: string, input: Readonly<{
    sourceAssetId: string;
    title: string;
    objective: string;
    durationSeconds: number;
    platforms: readonly VideoPlatform[];
    aspectRatios: readonly VideoAspectRatio[];
    visualStyle: string;
    prohibitedElements: readonly string[];
    captionsRequired: boolean;
    audioDescriptionRequired: boolean;
    storyboard: readonly Omit<StoryboardScene, "id" | "order">[];
    sourceAssets: readonly Omit<SourceAssetManifestEntry, "id">[];
    providers: readonly VideoProviderSelection[];
    owner: string;
  }>): Promise<VideoProductionWorkspace> {
    requireText(input.title, "Video brief title");
    requireText(input.objective, "Video objective");
    requireText(input.visualStyle, "Visual style");
    requireText(input.owner, "Video brief owner");
    if (!Number.isFinite(input.durationSeconds) || input.durationSeconds <= 0 || input.durationSeconds > 600) {
      throw new Error("Video duration must be between 1 and 600 seconds");
    }
    if (input.platforms.length === 0 || input.aspectRatios.length === 0) {
      throw new Error("At least one platform and aspect ratio are required");
    }
    if (input.prohibitedElements.length === 0) throw new Error("Prohibited elements are required");
    validateProviders(input.providers);
    validateSourceAssets(input.sourceAssets);
    validateStoryboard(input.storyboard, input.durationSeconds);

    const campaigns = await this.requiredCampaigns(workspaceId);
    const asset = required(campaigns.assets, input.sourceAssetId, "Canonical script asset");
    const campaign = required(campaigns.campaigns, asset.campaignId, "Campaign");
    if (campaign.status !== "approved" || asset.status !== "approved") {
      throw new Error("Video briefs require an approved campaign and approved canonical script asset");
    }
    const product = await this.requiredProduct(workspaceId);
    validateAuthority(product, asset);
    const version = asset.versions.at(-1);
    if (!version) throw new Error("Approved canonical script version not found");
    const now = this.clock().toISOString();
    const brief: VideoBrief = {
      id: this.createId(),
      workspaceId,
      campaignId: campaign.id,
      sourceAssetId: asset.id,
      sourceAssetVersion: version.version,
      title: input.title.trim(),
      objective: input.objective.trim(),
      audience: asset.audience,
      script: version.body,
      claimReferences: asset.claimReferences,
      evidenceIds: asset.evidenceIds,
      durationSeconds: input.durationSeconds,
      platforms: unique(input.platforms),
      aspectRatios: unique(input.aspectRatios),
      visualStyle: input.visualStyle.trim(),
      prohibitedElements: clean(input.prohibitedElements),
      captionsRequired: input.captionsRequired,
      audioDescriptionRequired: input.audioDescriptionRequired,
      accessibilityRequirements: clean(asset.accessibilityRequirements),
      disclosureRequirements: clean(asset.disclosureRequirements),
      storyboard: input.storyboard.map((scene, index) => ({
        id: this.createId(), order: index + 1, purpose: scene.purpose.trim(), narration: scene.narration.trim(),
        visualDirection: scene.visualDirection.trim(), shotConstraints: clean(scene.shotConstraints), durationSeconds: scene.durationSeconds,
      })),
      sourceAssets: input.sourceAssets.map((entry) => ({ id: this.createId(), ...normalizedSourceAsset(entry) })),
      providers: input.providers.map(normalizedProvider),
      owner: input.owner.trim(),
      status: "draft",
      createdAt: now,
      updatedAt: now,
    };
    const workspace = await this.load(workspaceId);
    return this.persist({ ...workspace, briefs: [...workspace.briefs, brief], updatedAt: now });
  }

  async submitBrief(workspaceId: string, briefId: string): Promise<VideoProductionWorkspace> {
    return this.changeBrief(workspaceId, briefId, (brief) => {
      requireReviewable(brief.status, "Video brief");
      return { ...brief, status: "in_review", updatedAt: this.clock().toISOString() };
    });
  }

  async reviewBrief(workspaceId: string, briefId: string, reviewer: string, decision: ReviewDecision, note: string): Promise<VideoProductionWorkspace> {
    requireText(reviewer, "Named video brief reviewer");
    requireText(note, "Video brief review note");
    const product = await this.requiredProduct(workspaceId);
    const campaigns = await this.requiredCampaigns(workspaceId);
    return this.changeBrief(workspaceId, briefId, (brief) => {
      if (brief.status !== "in_review") throw new Error("Video brief must be in review");
      validateBriefAuthority(product, campaigns, brief);
      const now = this.clock().toISOString();
      return { ...brief, status: decision, reviewedBy: reviewer.trim(), reviewedAt: now, reviewNote: note.trim(), updatedAt: now };
    });
  }

  async createManualPackage(workspaceId: string, briefId: string, creator: string): Promise<VideoProductionWorkspace> {
    requireText(creator, "Named package creator");
    const workspace = await this.load(workspaceId);
    const brief = required(workspace.briefs, briefId, "Video brief");
    if (brief.status !== "approved") throw new Error("Manual production packages require an approved video brief");
    const product = await this.requiredProduct(workspaceId);
    const campaigns = await this.requiredCampaigns(workspaceId);
    validateBriefAuthority(product, campaigns, brief);
    const adaptation = buildVimaxManualAdaptation(brief);
    const now = this.clock().toISOString();
    const manifestValue = {
      schema: "viable.video-production-package.v1",
      package: { version: "1.0", createdAt: now, createdBy: creator.trim() },
      brief: {
        id: brief.id, campaignId: brief.campaignId, sourceAssetId: brief.sourceAssetId,
        sourceAssetVersion: brief.sourceAssetVersion, title: brief.title, objective: brief.objective,
        audience: brief.audience, durationSeconds: brief.durationSeconds, platforms: brief.platforms,
        aspectRatios: brief.aspectRatios, visualStyle: brief.visualStyle, prohibitedElements: brief.prohibitedElements,
        captionsRequired: brief.captionsRequired, audioDescriptionRequired: brief.audioDescriptionRequired,
        accessibilityRequirements: brief.accessibilityRequirements, disclosureRequirements: brief.disclosureRequirements,
      },
      script: { status: "approved", text: brief.script, claimReferences: brief.claimReferences, evidenceIds: brief.evidenceIds },
      storyboard: brief.storyboard,
      sourceAssets: brief.sourceAssets,
      providers: brief.providers,
      expectedArtifacts: ["artifact_manifest", "stage_history", "redacted_log", "final_render", ...(brief.captionsRequired ? ["captions"] : [])],
      adapterPackets: [adaptation],
      externalAction: {
        credentialsIncluded: false,
        executedByViable: false,
        renderApproved: false,
        approvedForPublishing: false,
        delivered: false,
      },
    };
    const manifest = JSON.stringify(manifestValue, null, 2);
    assertNoSecrets(manifest);
    const record: VideoProductionPackage = {
      id: this.createId(), workspaceId, briefId, packageVersion: "1.0", createdAt: now,
      createdBy: creator.trim(), status: "manual_export_ready", manifest,
    };
    return this.persist({ ...workspace, packages: [...workspace.packages, record], updatedAt: now });
  }

  async importRun(workspaceId: string, input: Readonly<{
    packageId: string;
    sourceToolId: string;
    sourceToolVersion: string;
    runCorrelationId: string;
    renderStatus: ImportedVideoArtifact["renderStatus"];
    stages: readonly VideoRunStage[];
    files: readonly Omit<ImportedVideoArtifact["files"][number], "id" | "sourceBriefId" | "sourcePackageId">[];
    redactedLog: string;
    importedBy: string;
    failureClass?: string;
    failureDetail?: string;
  }>): Promise<VideoProductionWorkspace> {
    requireText(input.sourceToolId, "Source production tool");
    requireText(input.sourceToolVersion, "Source production tool version");
    requireText(input.runCorrelationId, "Run correlation identifier");
    requireText(input.importedBy, "Named artifact importer");
    if (input.stages.length === 0) throw new Error("At least one render stage observation is required");
    validateStages(input.stages, input.renderStatus);
    validateImportedFiles(input.files);
    assertNoSecrets(input.redactedLog);
    if (["failed", "cancelled"].includes(input.renderStatus) && !input.failureDetail?.trim()) {
      throw new Error("Failed or cancelled runs require a failure detail");
    }

    const workspace = await this.load(workspaceId);
    const productionPackage = required(workspace.packages, input.packageId, "Video production package");
    const brief = required(workspace.briefs, productionPackage.briefId, "Video brief");
    if (brief.status !== "approved") throw new Error("Imported runs require an approved video brief");
    const files = input.files.map((file) => ({
      id: this.createId(), ...file, path: file.path.trim(), mimeType: file.mimeType.trim(), sha256: file.sha256.toLowerCase(),
      sourceBriefId: brief.id, sourcePackageId: productionPackage.id,
    }));
    const now = this.clock().toISOString();
    const artifact: ImportedVideoArtifact = {
      id: this.createId(), workspaceId, briefId: brief.id, packageId: productionPackage.id,
      sourceToolId: input.sourceToolId.trim(), sourceToolVersion: input.sourceToolVersion.trim(),
      runCorrelationId: input.runCorrelationId.trim(), renderStatus: input.renderStatus,
      stages: input.stages.map((stage) => ({ ...stage, detail: stage.detail.trim() })), files,
      redactedLog: input.redactedLog.trim(), importedAt: now, importedBy: input.importedBy.trim(), reviewStatus: "draft",
      ...(input.failureClass?.trim() ? { failureClass: input.failureClass.trim() } : {}),
      ...(input.failureDetail?.trim() ? { failureDetail: input.failureDetail.trim() } : {}),
    };
    return this.persist({ ...workspace, artifacts: [...workspace.artifacts, artifact], updatedAt: now });
  }

  async submitArtifact(workspaceId: string, artifactId: string): Promise<VideoProductionWorkspace> {
    return this.changeArtifact(workspaceId, artifactId, (artifact) => {
      requireReviewable(artifact.reviewStatus, "Imported artifact");
      return { ...artifact, reviewStatus: "in_review" };
    });
  }

  async reviewArtifact(workspaceId: string, artifactId: string, reviewer: string, decision: ReviewDecision, note: string): Promise<VideoProductionWorkspace> {
    requireText(reviewer, "Named render reviewer");
    requireText(note, "Render review note");
    const product = await this.requiredProduct(workspaceId);
    const campaigns = await this.requiredCampaigns(workspaceId);
    const workspace = await this.load(workspaceId);
    const artifact = required(workspace.artifacts, artifactId, "Imported artifact");
    const brief = required(workspace.briefs, artifact.briefId, "Video brief");
    if (artifact.reviewStatus !== "in_review") throw new Error("Imported artifact must be in review");
    validateBriefAuthority(product, campaigns, brief);
    if (decision === "approved") validateApprovableArtifact(brief, artifact);
    const now = this.clock().toISOString();
    return this.persist({
      ...workspace,
      artifacts: workspace.artifacts.map((item) => item.id === artifactId
        ? { ...item, reviewStatus: decision, reviewedBy: reviewer.trim(), reviewedAt: now, reviewNote: note.trim() }
        : item),
      updatedAt: now,
    });
  }

  async createVariant(workspaceId: string, input: Readonly<{
    artifactId: string;
    platform: VideoPlatform;
    aspectRatio: VideoAspectRatio;
    fileId: string;
    captionFileId?: string;
    accessibilityNotes: readonly string[];
  }>): Promise<VideoProductionWorkspace> {
    if (input.accessibilityNotes.length === 0) throw new Error("Platform variant accessibility notes are required");
    const workspace = await this.load(workspaceId);
    const artifact = required(workspace.artifacts, input.artifactId, "Approved video artifact");
    if (artifact.reviewStatus !== "approved") throw new Error("Platform variants require an approved video artifact");
    const brief = required(workspace.briefs, artifact.briefId, "Video brief");
    if (!brief.platforms.includes(input.platform) || !brief.aspectRatios.includes(input.aspectRatio)) {
      throw new Error("Platform and aspect ratio must be approved in the video brief");
    }
    const file = required(artifact.files, input.fileId, "Variant render file");
    if (!["final_render", "platform_render"].includes(file.relationship)) throw new Error("Variant file must be a render artifact");
    if (brief.captionsRequired) {
      if (!input.captionFileId) throw new Error("This video brief requires a caption artifact");
      const captions = required(artifact.files, input.captionFileId, "Caption artifact");
      if (captions.relationship !== "captions") throw new Error("Caption file must have the captions relationship");
    }
    if (workspace.variants.some((item) => item.artifactId === artifact.id && item.platform === input.platform && item.aspectRatio === input.aspectRatio)) {
      throw new Error("A video variant already exists for this platform and aspect ratio");
    }
    const now = this.clock().toISOString();
    const variant: VideoPlatformVariant = {
      id: this.createId(), workspaceId, artifactId: artifact.id, platform: input.platform, aspectRatio: input.aspectRatio,
      fileId: file.id, ...(input.captionFileId ? { captionFileId: input.captionFileId } : {}),
      accessibilityNotes: clean(input.accessibilityNotes), disclosureRequirements: brief.disclosureRequirements,
      status: "draft", createdAt: now, updatedAt: now,
    };
    return this.persist({ ...workspace, variants: [...workspace.variants, variant], updatedAt: now });
  }

  async submitVariant(workspaceId: string, variantId: string): Promise<VideoProductionWorkspace> {
    return this.changeVariant(workspaceId, variantId, (variant) => {
      requireReviewable(variant.status, "Video platform variant");
      return { ...variant, status: "in_review", updatedAt: this.clock().toISOString() };
    });
  }

  async reviewVariant(workspaceId: string, variantId: string, reviewer: string, decision: ReviewDecision, note: string): Promise<VideoProductionWorkspace> {
    requireText(reviewer, "Named video variant reviewer");
    requireText(note, "Video variant review note");
    return this.changeVariant(workspaceId, variantId, (variant) => {
      if (variant.status !== "in_review") throw new Error("Video platform variant must be in review");
      const now = this.clock().toISOString();
      return { ...variant, status: decision, reviewedBy: reviewer.trim(), reviewedAt: now, reviewNote: note.trim(), updatedAt: now };
    });
  }

  async detectAuthorityImpact(workspaceId: string): Promise<VideoProductionWorkspace> {
    const product = await this.requiredProduct(workspaceId);
    const campaigns = await this.requiredCampaigns(workspaceId);
    const workspace = await this.load(workspaceId);
    const now = this.clock().toISOString();
    const invalidBriefIds = new Set<string>();
    const briefs = workspace.briefs.map((brief) => {
      try {
        validateBriefAuthority(product, campaigns, brief);
        return brief;
      } catch {
        invalidBriefIds.add(brief.id);
        return brief.status === "approved"
          ? { ...brief, status: "approval_invalidated" as const, reviewNote: "Campaign, script, claim, evidence, rights, or accessibility authority changed", updatedAt: now }
          : brief;
      }
    });
    const invalidArtifactIds = new Set<string>();
    const artifacts = workspace.artifacts.map((artifact) => {
      if (!invalidBriefIds.has(artifact.briefId)) return artifact;
      invalidArtifactIds.add(artifact.id);
      return artifact.reviewStatus === "approved"
        ? { ...artifact, reviewStatus: "approval_invalidated" as const, reviewNote: "Approved video brief authority changed" }
        : artifact;
    });
    const variants = workspace.variants.map((variant) => invalidArtifactIds.has(variant.artifactId) && variant.status === "approved"
      ? { ...variant, status: "approval_invalidated" as const, reviewNote: "Approved render authority changed", updatedAt: now }
      : variant);
    return this.persist({ ...workspace, briefs, artifacts, variants, updatedAt: now });
  }

  private async requiredProduct(workspaceId: string): Promise<ProductWorkspace> {
    const product = await this.productStore.load(workspaceId);
    if (!product) throw new Error("Product workspace not found");
    return product;
  }

  private async requiredCampaigns(workspaceId: string): Promise<CampaignWorkspace> {
    const campaigns = await this.campaignStore.load(workspaceId);
    if (!campaigns) throw new Error("Campaign workspace not found");
    return campaigns;
  }

  private async changeBrief(workspaceId: string, id: string, change: (record: VideoBrief) => VideoBrief): Promise<VideoProductionWorkspace> {
    const workspace = await this.load(workspaceId);
    if (!workspace.briefs.some((item) => item.id === id)) throw new Error("Video brief not found");
    return this.persist({ ...workspace, briefs: workspace.briefs.map((item) => item.id === id ? change(item) : item), updatedAt: this.clock().toISOString() });
  }

  private async changeArtifact(workspaceId: string, id: string, change: (record: ImportedVideoArtifact) => ImportedVideoArtifact): Promise<VideoProductionWorkspace> {
    const workspace = await this.load(workspaceId);
    if (!workspace.artifacts.some((item) => item.id === id)) throw new Error("Imported artifact not found");
    return this.persist({ ...workspace, artifacts: workspace.artifacts.map((item) => item.id === id ? change(item) : item), updatedAt: this.clock().toISOString() });
  }

  private async changeVariant(workspaceId: string, id: string, change: (record: VideoPlatformVariant) => VideoPlatformVariant): Promise<VideoProductionWorkspace> {
    const workspace = await this.load(workspaceId);
    if (!workspace.variants.some((item) => item.id === id)) throw new Error("Video platform variant not found");
    return this.persist({ ...workspace, variants: workspace.variants.map((item) => item.id === id ? change(item) : item), updatedAt: this.clock().toISOString() });
  }

  private async persist(workspace: VideoProductionWorkspace): Promise<VideoProductionWorkspace> {
    await this.store.save(workspace);
    return workspace;
  }
}

function emptyWorkspace(workspaceId: string, now: string): VideoProductionWorkspace {
  return { workspaceId, tools: [VIMAX_V1_1_TOOL], briefs: [], packages: [], artifacts: [], variants: [], updatedAt: now };
}

function validateBriefAuthority(product: ProductWorkspace, campaigns: CampaignWorkspace, brief: VideoBrief): void {
  const campaign = required(campaigns.campaigns, brief.campaignId, "Campaign");
  const asset = required(campaigns.assets, brief.sourceAssetId, "Canonical script asset");
  if (campaign.status !== "approved" || asset.status !== "approved" || asset.campaignId !== campaign.id) {
    throw new Error("Campaign or canonical script approval changed");
  }
  const currentVersion = asset.versions.at(-1);
  if (!currentVersion || currentVersion.version !== brief.sourceAssetVersion || currentVersion.body !== brief.script) {
    throw new Error("Approved canonical script version changed");
  }
  if (!sameReferences(asset.claimReferences, brief.claimReferences) || !sameStrings(asset.evidenceIds, brief.evidenceIds)) {
    throw new Error("Canonical script claim or evidence relationships changed");
  }
  validateAuthority(product, asset);
  validateSourceAssets(brief.sourceAssets);
}

function validateAuthority(product: ProductWorkspace, asset: CanonicalAsset): void {
  validateEvidence(product, asset.evidenceIds);
  for (const reference of asset.claimReferences) {
    const claim = product.claims.find((item) => item.id === reference.claimId);
    if (!claim || claim.status !== "approved" || claim.revision !== reference.claimRevision || claim.statement !== reference.statement) {
      throw new Error("Product Core claim authority changed");
    }
    if (claim.evidenceIds.some((id) => !asset.evidenceIds.includes(id))) {
      throw new Error("Canonical script is missing approved claim evidence");
    }
  }
}

function validateEvidence(product: ProductWorkspace, evidenceIds: readonly string[]): void {
  if (evidenceIds.length === 0) throw new Error("Reviewed Product Core evidence is required");
  const reviewed = new Set(product.evidence.filter(isReviewedEvidence).map((item) => item.id));
  if (evidenceIds.some((id) => !reviewed.has(id))) throw new Error("Video production requires reviewed non-generated Product Core evidence");
}

function validateProviders(providers: readonly VideoProviderSelection[]): void {
  const kinds = new Set(providers.map((item) => item.kind));
  if (!(["llm", "image", "video"] as const).every((kind) => kinds.has(kind))) {
    throw new Error("User-selected LLM, image, and video provider plans are required");
  }
  if (providers.length !== kinds.size) throw new Error("Only one provider plan per provider kind is allowed");
  for (const provider of providers) {
    requireText(provider.provider, `${provider.kind} provider`);
    requireText(provider.model, `${provider.kind} model`);
    requireText(provider.currency, `${provider.kind} cost currency`);
    requireText(provider.dataHandlingNotes, `${provider.kind} data-handling notes`);
    if (!Number.isFinite(provider.estimatedCost) || provider.estimatedCost < 0) throw new Error("Provider estimated cost must be zero or greater");
    if (provider.credentialsIncluded !== false) throw new Error("Provider credentials cannot enter a video brief");
  }
}

function validateSourceAssets(assets: readonly Omit<SourceAssetManifestEntry, "id">[] | readonly SourceAssetManifestEntry[]): void {
  for (const asset of assets) {
    requireText(asset.label, "Source asset label");
    requireText(asset.mediaType, "Source asset media type");
    requireText(asset.sourceReference, "Source asset reference");
    requireText(asset.owner, "Source asset owner");
    requireText(asset.rightsBasis, "Source asset rights basis");
    if (asset.allowedUses.length === 0) throw new Error("Every source asset requires at least one allowed use");
    if (asset.sensitiveKind !== "none" && asset.consentStatus !== "recorded") {
      throw new Error("Likeness, voice, logo, trademark, customer, and copyrighted assets require recorded rights and consent");
    }
    if (asset.sha256 && !/^[a-fA-F0-9]{64}$/.test(asset.sha256)) throw new Error("Source asset SHA-256 must contain 64 hexadecimal characters");
  }
}

function validateStoryboard(storyboard: readonly Omit<StoryboardScene, "id" | "order">[], durationSeconds: number): void {
  if (storyboard.length === 0) throw new Error("At least one storyboard scene is required");
  let total = 0;
  for (const scene of storyboard) {
    requireText(scene.purpose, "Storyboard scene purpose");
    requireText(scene.visualDirection, "Storyboard visual direction");
    if (scene.shotConstraints.length === 0) throw new Error("Every storyboard scene requires shot constraints");
    if (!Number.isFinite(scene.durationSeconds) || scene.durationSeconds <= 0) throw new Error("Storyboard scene duration must be greater than zero");
    total += scene.durationSeconds;
  }
  if (total > durationSeconds) throw new Error("Storyboard duration cannot exceed the approved video duration");
}

function validateStages(stages: readonly VideoRunStage[], renderStatus: ImportedVideoArtifact["renderStatus"]): void {
  for (const stage of stages) {
    if (!Date.parse(stage.observedAt)) throw new Error("Render stage time must be a valid ISO date");
    requireText(stage.detail, "Render stage detail");
  }
  if (renderStatus === "completed" && !stages.some((stage) => stage.stage === "completed" && stage.status === "completed")) {
    throw new Error("Completed imports require a completed stage observation");
  }
  if (renderStatus === "failed" && !stages.some((stage) => stage.status === "failed")) throw new Error("Failed imports require a failed stage observation");
  if (renderStatus === "cancelled" && !stages.some((stage) => stage.status === "cancelled")) throw new Error("Cancelled imports require a cancelled stage observation");
}

function validateImportedFiles(files: readonly Omit<ImportedVideoArtifact["files"][number], "id" | "sourceBriefId" | "sourcePackageId">[]): void {
  for (const file of files) {
    requireText(file.path, "Imported artifact path");
    requireText(file.mimeType, "Imported artifact MIME type");
    if (file.path.startsWith("/") || file.path.includes("..") || /^[A-Za-z]:[\\/]/.test(file.path)) {
      throw new Error("Imported artifact paths must be relative and bounded");
    }
    if (!Number.isInteger(file.sizeBytes) || file.sizeBytes < 0) throw new Error("Imported artifact size must be a non-negative integer");
    if (!/^[a-fA-F0-9]{64}$/.test(file.sha256)) throw new Error("Imported artifact SHA-256 must contain 64 hexadecimal characters");
    assertNoSecrets(`${file.path}\n${file.mimeType}\n${file.sha256}`);
  }
}

function validateApprovableArtifact(brief: VideoBrief, artifact: ImportedVideoArtifact): void {
  if (artifact.renderStatus !== "completed") throw new Error("Only completed renders can be approved");
  if (!artifact.files.some((file) => file.relationship === "final_render")) throw new Error("Approved renders require a final render artifact");
  if (brief.captionsRequired && !artifact.files.some((file) => file.relationship === "captions")) {
    throw new Error("Approved renders require the caption artifact declared by the video brief");
  }
}

function normalizedSourceAsset(asset: Omit<SourceAssetManifestEntry, "id">): Omit<SourceAssetManifestEntry, "id"> {
  return {
    label: asset.label.trim(), mediaType: asset.mediaType.trim(), sourceReference: asset.sourceReference.trim(),
    owner: asset.owner.trim(), rightsBasis: asset.rightsBasis.trim(), sensitiveKind: asset.sensitiveKind,
    consentStatus: asset.consentStatus, allowedUses: clean(asset.allowedUses), prohibitedUses: clean(asset.prohibitedUses),
    disclosureRequirements: clean(asset.disclosureRequirements),
    ...(asset.sha256 ? { sha256: asset.sha256.toLowerCase() } : {}),
    ...(asset.expiresAt ? { expiresAt: asset.expiresAt } : {}),
  };
}

function normalizedProvider(provider: VideoProviderSelection): VideoProviderSelection {
  return {
    kind: provider.kind, provider: provider.provider.trim(), model: provider.model.trim(), estimatedCost: provider.estimatedCost,
    currency: provider.currency.trim().toUpperCase(), dataHandlingNotes: provider.dataHandlingNotes.trim(),
    credentialMode: provider.credentialMode, credentialsIncluded: false,
  };
}

function sameReferences(left: readonly ClaimReference[], right: readonly ClaimReference[]): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function sameStrings(left: readonly string[], right: readonly string[]): boolean {
  return JSON.stringify([...left].sort()) === JSON.stringify([...right].sort());
}

function requireReviewable(status: VideoReviewStatus, label: string): void {
  if (!(["draft", "changes_requested", "approval_invalidated"] as VideoReviewStatus[]).includes(status)) {
    throw new Error(`${label} cannot enter review from its current state`);
  }
}

function assertNoSecrets(value: string): void {
  const assignedSecret = /(?:api[_-]?key|access[_-]?token|secret|password)\s*[:=]\s*["']?[A-Za-z0-9_\-]{12,}/i;
  const providerKey = /\b(?:sk-[A-Za-z0-9_-]{16,}|gh[opusr]_[A-Za-z0-9]{20,})\b/;
  if (assignedSecret.test(value) || providerKey.test(value)) throw new Error("Credentials or secret-like values cannot enter video packages, artifact metadata, or logs");
}

function requireText(value: string, label: string): void {
  if (!value.trim()) throw new Error(`${label} is required`);
}

function clean(values: readonly string[]): readonly string[] {
  return values.map((value) => value.trim()).filter(Boolean);
}

function unique<T>(values: readonly T[]): readonly T[] {
  return [...new Set(values)];
}

function required<T extends { id: string }>(values: readonly T[], id: string, label: string): T {
  const value = values.find((item) => item.id === id);
  if (!value) throw new Error(`${label} not found`);
  return value;
}
