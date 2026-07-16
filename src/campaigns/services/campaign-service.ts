import type { ProductWorkspace } from "../../product-core/domain/workspace.js";
import { isReviewedEvidence } from "../../product-core/domain/evidence.js";
import type { ProductWorkspaceStore } from "../../product-core/ports/product-workspace-store.js";
import type {
  AssetReviewStatus,
  CampaignBrief,
  CampaignStatus,
  CampaignWorkspace,
  CanonicalAsset,
  ChannelKind,
  ChannelVariant,
  ClaimReference,
  ManualExportPackage,
  ReviewComment,
} from "../domain/campaign.js";
import type { CampaignWorkspaceStore } from "../ports/campaign-workspace-store.js";

type Clock = () => Date;
type IdFactory = () => string;
type ReviewDecision = "approved" | "rejected" | "changes_requested";

export class CampaignService {
  constructor(
    private readonly store: CampaignWorkspaceStore,
    private readonly productStore: ProductWorkspaceStore,
    private readonly clock: Clock = () => new Date(),
    private readonly createId: IdFactory = () => globalThis.crypto.randomUUID(),
  ) {}

  async createBrief(workspaceId: string, input: Readonly<{
    title: string;
    objective: string;
    primaryOutcome: string;
    primaryAudience: string;
    audienceKind: "selected_icp" | "test_audience";
    icpHypothesisId?: string;
    problem: string;
    trigger: string;
    offer: string;
    messageHierarchy: readonly string[];
    proof: readonly string[];
    claimIds: readonly string[];
    evidenceIds: readonly string[];
    callToAction: string;
    channels: readonly ChannelKind[];
    assetPlan: readonly string[];
    owner: string;
    successMeasures: readonly string[];
    dependencies: readonly string[];
  }>): Promise<CampaignWorkspace> {
    requireText(input.title, "Campaign title");
    requireText(input.objective, "Campaign objective");
    requireText(input.primaryOutcome, "One primary outcome");
    requireText(input.primaryAudience, "One primary audience");
    requireText(input.owner, "Campaign owner");
    requireText(input.callToAction, "Call to action");
    if (input.messageHierarchy.length === 0 || input.successMeasures.length === 0) {
      throw new Error("Campaign message hierarchy and success measures are required");
    }
    const product = await this.requiredProduct(workspaceId);
    if (input.audienceKind === "selected_icp") {
      const selected = product.icpHypotheses.find((item) => item.id === input.icpHypothesisId && item.status === "selected" && item.reviewStatus === "reviewed");
      if (!selected) throw new Error("A reviewed selected ICP is required for this campaign audience");
    }
    const claimReferences = this.claimReferences(product, input.claimIds, input.evidenceIds, input.channels);
    const now = this.clock().toISOString();
    const campaign: CampaignBrief = {
      id: this.createId(),
      workspaceId,
      title: input.title.trim(),
      objective: input.objective.trim(),
      primaryOutcome: input.primaryOutcome.trim(),
      primaryAudience: input.primaryAudience.trim(),
      audienceKind: input.audienceKind,
      ...(input.icpHypothesisId ? { icpHypothesisId: input.icpHypothesisId } : {}),
      problem: input.problem.trim(),
      trigger: input.trigger.trim(),
      offer: input.offer.trim(),
      messageHierarchy: clean(input.messageHierarchy),
      proof: clean(input.proof),
      claimReferences,
      evidenceIds: [...input.evidenceIds],
      callToAction: input.callToAction.trim(),
      channels: unique(input.channels),
      assetPlan: clean(input.assetPlan),
      owner: input.owner.trim(),
      successMeasures: clean(input.successMeasures),
      dependencies: clean(input.dependencies),
      version: 1,
      status: "draft",
      createdAt: now,
      updatedAt: now,
    };
    const workspace = await this.load(workspaceId);
    return this.persist({ ...workspace, campaigns: [...workspace.campaigns, campaign], updatedAt: now });
  }

  async submitCampaign(workspaceId: string, campaignId: string): Promise<CampaignWorkspace> {
    return this.changeCampaign(workspaceId, campaignId, (campaign) => {
      if (!["draft", "changes_requested", "approval_invalidated"].includes(campaign.status)) {
        throw new Error("Only draft, changed, or invalidated campaigns can enter review");
      }
      return { ...campaign, status: "in_review", updatedAt: this.clock().toISOString() };
    });
  }

  async reviewCampaign(workspaceId: string, campaignId: string, reviewer: string, decision: ReviewDecision, note: string): Promise<CampaignWorkspace> {
    requireText(reviewer, "Named campaign reviewer");
    requireText(note, "Campaign review note");
    const product = await this.requiredProduct(workspaceId);
    return this.changeCampaign(workspaceId, campaignId, (campaign) => {
      if (campaign.status !== "in_review") throw new Error("Campaign must be in review");
      this.validateReferences(product, campaign.claimReferences, campaign.evidenceIds, campaign.channels);
      const now = this.clock().toISOString();
      return { ...campaign, status: decision, reviewedBy: reviewer.trim(), reviewedAt: now, reviewNote: note.trim(), updatedAt: now };
    });
  }

  async createCanonicalAsset(workspaceId: string, input: Readonly<{
    campaignId: string;
    title: string;
    body: string;
    owner: string;
    origin: "human" | "generated_suggestion";
    rights: readonly string[];
    accessibilityRequirements: readonly string[];
    disclosureRequirements: readonly string[];
  }>): Promise<CampaignWorkspace> {
    requireText(input.title, "Asset title");
    requireText(input.body, "Canonical asset body");
    requireText(input.owner, "Asset owner");
    if (input.rights.length === 0 || input.accessibilityRequirements.length === 0) {
      throw new Error("Rights and accessibility requirements are required");
    }
    const workspace = await this.load(workspaceId);
    const campaign = required(workspace.campaigns, input.campaignId, "Approved campaign");
    if (campaign.status !== "approved") throw new Error("Canonical assets require an approved campaign brief");
    const now = this.clock().toISOString();
    const asset: CanonicalAsset = {
      id: this.createId(),
      workspaceId,
      campaignId: campaign.id,
      title: input.title.trim(),
      audience: campaign.primaryAudience,
      claimReferences: campaign.claimReferences,
      evidenceIds: campaign.evidenceIds,
      rights: clean(input.rights),
      accessibilityRequirements: clean(input.accessibilityRequirements),
      disclosureRequirements: clean(input.disclosureRequirements),
      origin: input.origin,
      owner: input.owner.trim(),
      versions: [{ version: 1, body: input.body, changedAt: now, changedBy: input.owner.trim(), changeNote: "Initial canonical version" }],
      comments: [],
      status: "draft",
      createdAt: now,
      updatedAt: now,
    };
    return this.persist({ ...workspace, assets: [...workspace.assets, asset], updatedAt: now });
  }

  async reviseCanonicalAsset(workspaceId: string, assetId: string, editor: string, body: string, note: string): Promise<CampaignWorkspace> {
    requireText(editor, "Named asset editor");
    requireText(body, "Canonical asset body");
    requireText(note, "Asset change note");
    const workspace = await this.load(workspaceId);
    const now = this.clock().toISOString();
    const assets = workspace.assets.map((asset) => {
      if (asset.id !== assetId) return asset;
      const next = asset.versions.length + 1;
      const invalidated: AssetReviewStatus = asset.status === "approved" ? "approval_invalidated" : "draft";
      return {
        ...asset,
        versions: [...asset.versions, { version: next, body, changedAt: now, changedBy: editor.trim(), changeNote: note.trim() }],
        status: invalidated,
        updatedAt: now,
      };
    });
    if (!workspace.assets.some((asset) => asset.id === assetId)) throw new Error("Canonical asset not found");
    const variants = workspace.variants.map((variant) =>
      variant.canonicalAssetId === assetId && variant.status === "approved"
        ? { ...variant, status: "approval_invalidated" as const, updatedAt: now, reviewNote: "Canonical asset changed" }
        : variant,
    );
    return this.persist({ ...workspace, assets, variants, updatedAt: now });
  }

  async commentOnAsset(workspaceId: string, assetId: string, author: string, body: string): Promise<CampaignWorkspace> {
    requireText(author, "Comment author");
    requireText(body, "Comment body");
    const now = this.clock().toISOString();
    const comment: ReviewComment = { id: this.createId(), author: author.trim(), body: body.trim(), createdAt: now };
    return this.changeAsset(workspaceId, assetId, (asset) => ({ ...asset, comments: [...asset.comments, comment], updatedAt: now }));
  }

  async submitAsset(workspaceId: string, assetId: string): Promise<CampaignWorkspace> {
    return this.changeAsset(workspaceId, assetId, (asset) => {
      if (!["draft", "changes_requested", "approval_invalidated"].includes(asset.status)) {
        throw new Error("Only draft, changed, or invalidated assets can enter review");
      }
      return { ...asset, status: "in_review", updatedAt: this.clock().toISOString() };
    });
  }

  async reviewAsset(workspaceId: string, assetId: string, reviewer: string, decision: ReviewDecision, note: string): Promise<CampaignWorkspace> {
    requireText(reviewer, "Named asset reviewer");
    requireText(note, "Asset review note");
    const product = await this.requiredProduct(workspaceId);
    return this.changeAsset(workspaceId, assetId, (asset) => {
      if (asset.status !== "in_review") throw new Error("Asset must be in review");
      this.validateReferences(product, asset.claimReferences, asset.evidenceIds, []);
      const now = this.clock().toISOString();
      return { ...asset, status: decision, reviewedBy: reviewer.trim(), reviewedAt: now, reviewNote: note.trim(), updatedAt: now };
    });
  }

  async createVariant(workspaceId: string, assetId: string, channel: ChannelKind, body: string, constraints: readonly string[]): Promise<CampaignWorkspace> {
    requireText(body, "Channel variant body");
    if (constraints.length === 0) throw new Error("Channel constraints are required");
    const workspace = await this.load(workspaceId);
    const asset = required(workspace.assets, assetId, "Canonical asset");
    if (asset.status !== "approved") throw new Error("Channel variants require an approved canonical asset");
    if (workspace.variants.some((item) => item.canonicalAssetId === assetId && item.channel === channel)) {
      throw new Error("A variant already exists for this channel");
    }
    const now = this.clock().toISOString();
    const variant: ChannelVariant = {
      id: this.createId(), workspaceId, canonicalAssetId: assetId, channel, body,
      constraints: clean(constraints), version: 1, status: "draft", createdAt: now, updatedAt: now,
    };
    return this.persist({ ...workspace, variants: [...workspace.variants, variant], updatedAt: now });
  }

  async submitVariant(workspaceId: string, variantId: string): Promise<CampaignWorkspace> {
    return this.changeVariant(workspaceId, variantId, (variant) => {
      if (!["draft", "changes_requested", "approval_invalidated"].includes(variant.status)) {
        throw new Error("Only draft, changed, or invalidated variants can enter review");
      }
      return { ...variant, status: "in_review", updatedAt: this.clock().toISOString() };
    });
  }

  async reviewVariant(workspaceId: string, variantId: string, reviewer: string, decision: ReviewDecision, note: string): Promise<CampaignWorkspace> {
    requireText(reviewer, "Named variant reviewer");
    requireText(note, "Variant review note");
    return this.changeVariant(workspaceId, variantId, (variant) => {
      if (variant.status !== "in_review") throw new Error("Variant must be in review");
      const now = this.clock().toISOString();
      return { ...variant, status: decision, reviewedBy: reviewer.trim(), reviewedAt: now, reviewNote: note.trim(), updatedAt: now };
    });
  }

  async detectClaimImpact(workspaceId: string): Promise<CampaignWorkspace> {
    const product = await this.requiredProduct(workspaceId);
    const workspace = await this.load(workspaceId);
    const now = this.clock().toISOString();
    const affectedCampaignIds = new Set<string>();
    const campaigns = workspace.campaigns.map((campaign) => {
      try {
        this.validateReferences(product, campaign.claimReferences, campaign.evidenceIds, campaign.channels);
        return campaign;
      } catch {
        affectedCampaignIds.add(campaign.id);
        return campaign.status === "approved"
          ? { ...campaign, status: "approval_invalidated" as const, updatedAt: now, reviewNote: "Product Core claim or evidence changed" }
          : campaign;
      }
    });
    const affectedAssetIds = new Set<string>();
    const assets = workspace.assets.map((asset) => {
      if (!affectedCampaignIds.has(asset.campaignId)) return asset;
      affectedAssetIds.add(asset.id);
      return asset.status === "approved"
        ? { ...asset, status: "approval_invalidated" as const, updatedAt: now, reviewNote: "Campaign authority was invalidated" }
        : asset;
    });
    const variants = workspace.variants.map((variant) =>
      affectedAssetIds.has(variant.canonicalAssetId) && variant.status === "approved"
        ? { ...variant, status: "approval_invalidated" as const, updatedAt: now, reviewNote: "Canonical asset authority was invalidated" }
        : variant,
    );
    return this.persist({ ...workspace, campaigns, assets, variants, updatedAt: now });
  }

  async createManualExport(workspaceId: string, campaignId: string, assetId: string, creator: string): Promise<CampaignWorkspace> {
    requireText(creator, "Named export creator");
    const workspace = await this.load(workspaceId);
    const campaign = required(workspace.campaigns, campaignId, "Campaign");
    const asset = required(workspace.assets, assetId, "Canonical asset");
    if (campaign.status !== "approved" || asset.status !== "approved" || asset.campaignId !== campaignId) {
      throw new Error("Manual export requires an approved campaign and its approved canonical asset");
    }
    const variants = workspace.variants.filter((item) => item.canonicalAssetId === assetId && item.status === "approved");
    const channels = new Set(variants.map((item) => item.channel));
    if (!["linkedin", "website", "github_release"].every((channel) => channels.has(channel as ChannelKind))) {
      throw new Error("Manual export requires approved LinkedIn, website, and GitHub release variants");
    }
    const now = this.clock().toISOString();
    const record: ManualExportPackage = {
      id: this.createId(), workspaceId, campaignId, canonicalAssetId: assetId,
      variantIds: variants.map((item) => item.id), createdAt: now, createdBy: creator.trim(),
      status: "manual_export_ready",
      manifest: JSON.stringify({
        campaign: { id: campaign.id, version: campaign.version, primaryOutcome: campaign.primaryOutcome, primaryAudience: campaign.primaryAudience },
        canonicalAsset: { id: asset.id, version: asset.versions.length, claimReferences: asset.claimReferences, evidenceIds: asset.evidenceIds, rights: asset.rights, accessibilityRequirements: asset.accessibilityRequirements },
        variants: variants.map((item) => ({ id: item.id, channel: item.channel, version: item.version, body: item.body, constraints: item.constraints })),
        externalAction: { approvedForPublishing: false, delivered: false },
      }, null, 2),
    };
    return this.persist({ ...workspace, exports: [...workspace.exports, record], updatedAt: now });
  }

  private async load(workspaceId: string): Promise<CampaignWorkspace> {
    return await this.store.load(workspaceId) ?? {
      workspaceId, campaigns: [], assets: [], variants: [], exports: [], updatedAt: this.clock().toISOString(),
    };
  }

  private async requiredProduct(workspaceId: string): Promise<ProductWorkspace> {
    const workspace = await this.productStore.load(workspaceId);
    if (!workspace) throw new Error("Product workspace not found");
    return workspace;
  }

  private claimReferences(product: ProductWorkspace, claimIds: readonly string[], evidenceIds: readonly string[], channels: readonly ChannelKind[]): readonly ClaimReference[] {
    if (claimIds.length === 0) throw new Error("At least one approved Product Core claim is required");
    this.validateEvidence(product, evidenceIds);
    return unique(claimIds).map((claimId) => {
      const claim = product.claims.find((item) => item.id === claimId);
      if (!claim || claim.status !== "approved") throw new Error("Campaign claims must be approved in Product Core");
      if (channels.some((channel) => claim.prohibitedContexts.includes(channel))) {
        throw new Error("A selected claim is prohibited for a campaign channel");
      }
      if (claim.evidenceIds.some((id) => !evidenceIds.includes(id))) {
        throw new Error("Campaign evidence must include every selected claim evidence reference");
      }
      return { claimId: claim.id, claimRevision: claim.revision, statement: claim.statement, evidenceIds: [...claim.evidenceIds] };
    });
  }

  private validateReferences(product: ProductWorkspace, references: readonly ClaimReference[], evidenceIds: readonly string[], channels: readonly ChannelKind[]): void {
    this.validateEvidence(product, evidenceIds);
    for (const reference of references) {
      const claim = product.claims.find((item) => item.id === reference.claimId);
      if (!claim || claim.status !== "approved" || claim.revision !== reference.claimRevision || claim.statement !== reference.statement) {
        throw new Error("Product Core claim authority changed");
      }
      if (channels.some((channel) => claim.prohibitedContexts.includes(channel))) {
        throw new Error("A claim is prohibited for a selected channel");
      }
    }
  }

  private validateEvidence(product: ProductWorkspace, evidenceIds: readonly string[]): void {
    if (evidenceIds.length === 0) throw new Error("Reviewed Product Core evidence is required");
    const reviewed = new Set(product.evidence.filter(isReviewedEvidence).map((item) => item.id));
    if (evidenceIds.some((id) => !reviewed.has(id))) throw new Error("Campaign evidence must be reviewed non-generated Product Core evidence");
  }

  private async changeCampaign(workspaceId: string, id: string, change: (record: CampaignBrief) => CampaignBrief): Promise<CampaignWorkspace> {
    const workspace = await this.load(workspaceId);
    if (!workspace.campaigns.some((item) => item.id === id)) throw new Error("Campaign not found");
    return this.persist({ ...workspace, campaigns: workspace.campaigns.map((item) => item.id === id ? change(item) : item), updatedAt: this.clock().toISOString() });
  }

  private async changeAsset(workspaceId: string, id: string, change: (record: CanonicalAsset) => CanonicalAsset): Promise<CampaignWorkspace> {
    const workspace = await this.load(workspaceId);
    if (!workspace.assets.some((item) => item.id === id)) throw new Error("Canonical asset not found");
    return this.persist({ ...workspace, assets: workspace.assets.map((item) => item.id === id ? change(item) : item), updatedAt: this.clock().toISOString() });
  }

  private async changeVariant(workspaceId: string, id: string, change: (record: ChannelVariant) => ChannelVariant): Promise<CampaignWorkspace> {
    const workspace = await this.load(workspaceId);
    if (!workspace.variants.some((item) => item.id === id)) throw new Error("Channel variant not found");
    return this.persist({ ...workspace, variants: workspace.variants.map((item) => item.id === id ? change(item) : item), updatedAt: this.clock().toISOString() });
  }

  private async persist(workspace: CampaignWorkspace): Promise<CampaignWorkspace> {
    await this.store.save(workspace);
    return workspace;
  }
}

function requireText(value: string, label: string): void {
  if (!value.trim()) throw new Error(label + " is required");
}

function clean(values: readonly string[]): readonly string[] {
  return values.map((value) => value.trim()).filter(Boolean);
}

function unique<T>(values: readonly T[]): readonly T[] {
  return [...new Set(values)];
}

function required<T extends { id: string }>(values: readonly T[], id: string, label: string): T {
  const value = values.find((item) => item.id === id);
  if (!value) throw new Error(label + " not found");
  return value;
}
