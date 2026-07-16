import type { CampaignWorkspace, CanonicalAsset } from "../../campaigns/domain/campaign.js";
import type { CampaignWorkspaceStore } from "../../campaigns/ports/campaign-workspace-store.js";
import { isReviewedEvidence } from "../../product-core/domain/evidence.js";
import type { ProductWorkspace } from "../../product-core/domain/workspace.js";
import type { ProductWorkspaceStore } from "../../product-core/ports/product-workspace-store.js";
import type { VideoBrief, VideoProductionWorkspace } from "../domain/video-production.js";
import type { VideoProductionStore } from "../ports/video-production-store.js";
import { VideoProductionService as CoreVideoProductionService } from "./video-production-service.js";

type Clock = () => Date;
type IdFactory = () => string;

/**
 * Public application service for video production.
 *
 * The core service owns deterministic state transitions. This facade adds
 * current Product Core and Campaigns revalidation at asynchronous handoff
 * boundaries where external production time may make prior approval stale.
 */
export class VideoProductionService {
  private readonly core: CoreVideoProductionService;

  constructor(
    private readonly store: VideoProductionStore,
    private readonly productStore: ProductWorkspaceStore,
    private readonly campaignStore: CampaignWorkspaceStore,
    clock: Clock = () => new Date(),
    createId: IdFactory = () => globalThis.crypto.randomUUID(),
  ) {
    this.core = new CoreVideoProductionService(store, productStore, campaignStore, clock, createId);
  }

  async load(...args: Parameters<CoreVideoProductionService["load"]>): ReturnType<CoreVideoProductionService["load"]> {
    return this.core.load(...args);
  }

  async createBrief(...args: Parameters<CoreVideoProductionService["createBrief"]>): ReturnType<CoreVideoProductionService["createBrief"]> {
    return this.core.createBrief(...args);
  }

  async submitBrief(...args: Parameters<CoreVideoProductionService["submitBrief"]>): ReturnType<CoreVideoProductionService["submitBrief"]> {
    return this.core.submitBrief(...args);
  }

  async reviewBrief(...args: Parameters<CoreVideoProductionService["reviewBrief"]>): ReturnType<CoreVideoProductionService["reviewBrief"]> {
    return this.core.reviewBrief(...args);
  }

  async createManualPackage(...args: Parameters<CoreVideoProductionService["createManualPackage"]>): ReturnType<CoreVideoProductionService["createManualPackage"]> {
    return this.core.createManualPackage(...args);
  }

  async importRun(...args: Parameters<CoreVideoProductionService["importRun"]>): ReturnType<CoreVideoProductionService["importRun"]> {
    const [workspaceId, input] = args;
    const workspace = await this.core.load(workspaceId);
    const productionPackage = required(workspace.packages, input.packageId, "Video production package");
    const brief = required(workspace.briefs, productionPackage.briefId, "Video brief");
    await this.validateCurrentAuthority(workspaceId, brief);
    return this.core.importRun(...args);
  }

  async submitArtifact(...args: Parameters<CoreVideoProductionService["submitArtifact"]>): ReturnType<CoreVideoProductionService["submitArtifact"]> {
    return this.core.submitArtifact(...args);
  }

  async reviewArtifact(...args: Parameters<CoreVideoProductionService["reviewArtifact"]>): ReturnType<CoreVideoProductionService["reviewArtifact"]> {
    return this.core.reviewArtifact(...args);
  }

  async createVariant(...args: Parameters<CoreVideoProductionService["createVariant"]>): ReturnType<CoreVideoProductionService["createVariant"]> {
    const [workspaceId, input] = args;
    const workspace = await this.core.load(workspaceId);
    const artifact = required(workspace.artifacts, input.artifactId, "Approved video artifact");
    if (artifact.reviewStatus !== "approved") throw new Error("Platform variants require an approved video artifact");
    const brief = required(workspace.briefs, artifact.briefId, "Video brief");
    await this.validateCurrentAuthority(workspaceId, brief);
    return this.core.createVariant(...args);
  }

  async submitVariant(...args: Parameters<CoreVideoProductionService["submitVariant"]>): ReturnType<CoreVideoProductionService["submitVariant"]> {
    return this.core.submitVariant(...args);
  }

  async reviewVariant(...args: Parameters<CoreVideoProductionService["reviewVariant"]>): ReturnType<CoreVideoProductionService["reviewVariant"]> {
    const [workspaceId, variantId] = args;
    const workspace = await this.core.load(workspaceId);
    const variant = required(workspace.variants, variantId, "Video platform variant");
    const artifact = required(workspace.artifacts, variant.artifactId, "Approved video artifact");
    if (artifact.reviewStatus !== "approved") {
      throw new Error("Video platform variant approval requires an approved video artifact");
    }
    const brief = required(workspace.briefs, artifact.briefId, "Video brief");
    await this.validateCurrentAuthority(workspaceId, brief);
    return this.core.reviewVariant(...args);
  }

  async detectAuthorityImpact(...args: Parameters<CoreVideoProductionService["detectAuthorityImpact"]>): ReturnType<CoreVideoProductionService["detectAuthorityImpact"]> {
    return this.core.detectAuthorityImpact(...args);
  }

  private async validateCurrentAuthority(workspaceId: string, brief: VideoBrief): Promise<void> {
    const [product, campaigns] = await Promise.all([
      this.productStore.load(workspaceId),
      this.campaignStore.load(workspaceId),
    ]);
    if (!product) throw new Error("Product workspace not found");
    if (!campaigns) throw new Error("Campaign workspace not found");
    validateBriefAuthority(product, campaigns, brief);
  }
}

function validateBriefAuthority(product: ProductWorkspace, campaigns: CampaignWorkspace, brief: VideoBrief): void {
  const campaign = required(campaigns.campaigns, brief.campaignId, "Campaign");
  const asset = required(campaigns.assets, brief.sourceAssetId, "Canonical script asset");
  if (campaign.status !== "approved" || asset.status !== "approved" || asset.campaignId !== campaign.id) {
    throw new Error("Campaign or canonical script approval changed");
  }
  const version = asset.versions.at(-1);
  if (!version || version.version !== brief.sourceAssetVersion || version.body !== brief.script) {
    throw new Error("Approved canonical script version changed");
  }
  if (JSON.stringify(asset.claimReferences) !== JSON.stringify(brief.claimReferences)) {
    throw new Error("Canonical script claim relationships changed");
  }
  if (JSON.stringify([...asset.evidenceIds].sort()) !== JSON.stringify([...brief.evidenceIds].sort())) {
    throw new Error("Canonical script evidence relationships changed");
  }
  validateProductAuthority(product, asset);
  for (const source of brief.sourceAssets) {
    if (source.sensitiveKind !== "none" && source.consentStatus !== "recorded") {
      throw new Error("Video source asset consent is no longer valid");
    }
    if (source.allowedUses.length === 0 || !source.rightsBasis.trim()) {
      throw new Error("Video source asset rights are no longer valid");
    }
  }
}

function validateProductAuthority(product: ProductWorkspace, asset: CanonicalAsset): void {
  const reviewed = new Set(product.evidence.filter(isReviewedEvidence).map((item) => item.id));
  if (asset.evidenceIds.length === 0 || asset.evidenceIds.some((id) => !reviewed.has(id))) {
    throw new Error("Video production requires current reviewed Product Core evidence");
  }
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

function required<T extends { id: string }>(values: readonly T[], id: string, label: string): T {
  const value = values.find((item) => item.id === id);
  if (!value) throw new Error(`${label} not found`);
  return value;
}
