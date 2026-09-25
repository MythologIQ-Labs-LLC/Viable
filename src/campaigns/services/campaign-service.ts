import type { ProductWorkspace } from "../../product-core/domain/workspace.js";
import { isReviewedEvidence } from "../../product-core/domain/evidence.js";
import type { ProductWorkspaceStore } from "../../product-core/ports/product-workspace-store.js";
import type {
  AssetReviewStatus,
  CampaignBrief,
  CampaignWorkspace,
  CanonicalAsset,
  ChannelKind,
  ChannelVariant,
  ClaimReference,
  ContentBrief,
  ManualExportPackage,
  ReviewComment,
} from "../domain/campaign.js";
import type { CampaignWorkspaceStore } from "../ports/campaign-workspace-store.js";

type Clock = () => Date;
type IdFactory = () => string;
type ReviewDecision = "approved" | "rejected" | "changes_requested";

const ALL_CHANNELS: readonly ChannelKind[] = ["linkedin", "website", "github_release"];

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
    if (input.messageHierarchy.length === 0 || input.successMeasures.length === 0) throw new Error("Campaign message hierarchy and success measures are required");
    const product = await this.requiredProduct(workspaceId);
    if (input.audienceKind === "selected_icp") {
      const selected = product.icpHypotheses.find((item) => item.id === input.icpHypothesisId && item.status === "selected" && item.reviewStatus === "reviewed");
      if (!selected) throw new Error("A reviewed selected ICP is required for this campaign audience");
    }
    const claimReferences = this.claimReferences(product, input.claimIds, input.evidenceIds, input.channels);
    const now = this.clock().toISOString();
    const campaign: CampaignBrief = {
      id: this.createId(), workspaceId,
      title: input.title.trim(), objective: input.objective.trim(), primaryOutcome: input.primaryOutcome.trim(), primaryAudience: input.primaryAudience.trim(),
      audienceKind: input.audienceKind, ...(input.icpHypothesisId ? { icpHypothesisId: input.icpHypothesisId } : {}),
      problem: input.problem.trim(), trigger: input.trigger.trim(), offer: input.offer.trim(), messageHierarchy: clean(input.messageHierarchy), proof: clean(input.proof),
      claimReferences, evidenceIds: [...input.evidenceIds], callToAction: input.callToAction.trim(), channels: unique(input.channels), assetPlan: clean(input.assetPlan),
      owner: input.owner.trim(), successMeasures: clean(input.successMeasures), dependencies: clean(input.dependencies), version: 1, status: "draft", createdAt: now, updatedAt: now,
    };
    const workspace = await this.load(workspaceId);
    return this.persist({ ...workspace, campaigns: [...workspace.campaigns, campaign], updatedAt: now });
  }

  async submitCampaign(workspaceId: string, campaignId: string): Promise<CampaignWorkspace> {
    return this.changeCampaign(workspaceId, campaignId, (campaign) => {
      if (!["draft", "changes_requested", "approval_invalidated"].includes(campaign.status)) throw new Error("Only draft, changed, or invalidated campaigns can enter review");
      return { ...campaign, status: "in_review", updatedAt: this.clock().toISOString() };
    });
  }

  async reviewCampaign(workspaceId: string, campaignId: string, reviewer: string, decision: ReviewDecision, note: string): Promise<CampaignWorkspace> {
    requireText(reviewer, "Named campaign reviewer");
    requireText(note, "Campaign review note");
    const product = decision === "approved" ? await this.requiredProduct(workspaceId) : undefined;
    return this.changeCampaign(workspaceId, campaignId, (campaign) => {
      if (campaign.status !== "in_review") throw new Error("Campaign must be in review");
      if (product) this.validateCampaignAuthority(product, campaign);
      const now = this.clock().toISOString();
      return { ...campaign, status: decision, reviewedBy: reviewer.trim(), reviewedAt: now, reviewNote: note.trim(), updatedAt: now };
    });
  }

  async createContentBrief(workspaceId: string, input: Readonly<{
    campaignId: string; title: string; objective: string; pillars: readonly string[]; themes: readonly string[]; deliverables: readonly string[];
    sourceNotes: readonly string[]; owner: string; origin: "human" | "generated_suggestion";
  }>): Promise<CampaignWorkspace> {
    requireText(input.title, "Content brief title");
    requireText(input.objective, "Content brief objective");
    requireText(input.owner, "Content brief owner");
    if (clean(input.pillars).length === 0 || clean(input.deliverables).length === 0) throw new Error("Content brief pillars and deliverables are required");
    const workspace = await this.load(workspaceId);
    const campaign = required(workspace.campaigns, input.campaignId, "Approved campaign");
    if (campaign.status !== "approved") throw new Error("Content briefs require an approved campaign brief");
    const product = await this.requiredProduct(workspaceId);
    this.validateCampaignAuthority(product, campaign);
    const now = this.clock().toISOString();
    const brief: ContentBrief = {
      id: this.createId(), workspaceId, campaignId: campaign.id, title: input.title.trim(), objective: input.objective.trim(), audience: campaign.primaryAudience,
      primaryOutcome: campaign.primaryOutcome, claimReferences: campaign.claimReferences.map((reference) => ({ ...reference, evidenceIds: [...reference.evidenceIds] })),
      evidenceIds: [...campaign.evidenceIds], pillars: clean(input.pillars), themes: clean(input.themes), deliverables: clean(input.deliverables), sourceNotes: clean(input.sourceNotes),
      owner: input.owner.trim(), origin: input.origin, status: "draft", createdAt: now, updatedAt: now,
    };
    return this.persist({ ...workspace, contentBriefs: [...(workspace.contentBriefs ?? []), brief], updatedAt: now });
  }

  async submitContentBrief(workspaceId: string, briefId: string): Promise<CampaignWorkspace> {
    return this.changeContentBrief(workspaceId, briefId, (brief) => {
      if (!["draft", "changes_requested", "approval_invalidated"].includes(brief.status)) throw new Error("Only draft, changed, or invalidated content briefs can enter review");
      return { ...brief, status: "in_review", updatedAt: this.clock().toISOString() };
    });
  }

  async reviewContentBrief(workspaceId: string, briefId: string, reviewer: string, decision: ReviewDecision, note: string): Promise<CampaignWorkspace> {
    requireText(reviewer, "Named content brief reviewer");
    requireText(note, "Content brief review note");
    const workspace = await this.load(workspaceId);
    const brief = required(workspace.contentBriefs ?? [], briefId, "Content brief");
    if (brief.status !== "in_review") throw new Error("Content brief must be in review");
    if (decision === "approved") {
      const product = await this.requiredProduct(workspaceId);
      const campaign = required(workspace.campaigns, brief.campaignId, "Campaign");
      if (campaign.status !== "approved") throw new Error("Content brief approval requires an approved campaign");
      this.validateCampaignAuthority(product, campaign);
      this.validateReferences(product, brief.claimReferences, brief.evidenceIds, campaign.channels);
    }
    const now = this.clock().toISOString();
    return this.persist({
      ...workspace,
      contentBriefs: (workspace.contentBriefs ?? []).map((record) => record.id === briefId
        ? { ...record, status: decision, reviewedBy: reviewer.trim(), reviewedAt: now, reviewNote: note.trim(), updatedAt: now }
        : record),
      updatedAt: now,
    });
  }

  async createCanonicalAsset(workspaceId: string, input: Readonly<{
    campaignId: string; title: string; body: string; owner: string; origin: "human" | "generated_suggestion";
    rights: readonly string[]; accessibilityRequirements: readonly string[]; disclosureRequirements: readonly string[];
  }>): Promise<CampaignWorkspace> {
    requireText(input.title, "Asset title");
    requireText(input.body, "Canonical asset body");
    requireText(input.owner, "Asset owner");
    if (input.rights.length === 0 || input.accessibilityRequirements.length === 0) throw new Error("Rights and accessibility requirements are required");
    const [product, workspace] = await Promise.all([this.requiredProduct(workspaceId), this.load(workspaceId)]);
    const campaign = required(workspace.campaigns, input.campaignId, "Approved campaign");
    if (campaign.status !== "approved") throw new Error("Canonical assets require an approved campaign brief");
    this.validateCampaignAuthority(product, campaign);
    const now = this.clock().toISOString();
    const asset: CanonicalAsset = {
      id: this.createId(), workspaceId, campaignId: campaign.id, title: input.title.trim(), audience: campaign.primaryAudience,
      claimReferences: campaign.claimReferences, evidenceIds: campaign.evidenceIds, rights: clean(input.rights), accessibilityRequirements: clean(input.accessibilityRequirements),
      disclosureRequirements: clean(input.disclosureRequirements), origin: input.origin, owner: input.owner.trim(),
      versions: [{ version: 1, body: input.body, changedAt: now, changedBy: input.owner.trim(), changeNote: "Initial canonical version" }],
      comments: [], status: "draft", createdAt: now, updatedAt: now,
    };
    return this.persist({ ...workspace, assets: [...workspace.assets, asset], updatedAt: now });
  }

  async reviseCanonicalAsset(workspaceId: string, assetId: string, editor: string, body: string, note: string): Promise<CampaignWorkspace> {
    requireText(editor, "Named asset editor"); requireText(body, "Canonical asset body"); requireText(note, "Asset change note");
    const workspace = await this.load(workspaceId);
    const now = this.clock().toISOString();
    const assets = workspace.assets.map((asset) => {
      if (asset.id !== assetId) return asset;
      const next = asset.versions.length + 1;
      const invalidated: AssetReviewStatus = asset.status === "approved" ? "approval_invalidated" : "draft";
      return { ...asset, versions: [...asset.versions, { version: next, body, changedAt: now, changedBy: editor.trim(), changeNote: note.trim() }], status: invalidated, updatedAt: now };
    });
    if (!workspace.assets.some((asset) => asset.id === assetId)) throw new Error("Canonical asset not found");
    const variants = workspace.variants.map((variant) => variant.canonicalAssetId === assetId && variant.status === "approved"
      ? { ...variant, status: "approval_invalidated" as const, updatedAt: now, reviewNote: appendAuditNote(variant.reviewNote, "Approval invalidated: canonical asset changed") }
      : variant);
    return this.persist({ ...workspace, assets, variants, updatedAt: now });
  }

  async commentOnAsset(workspaceId: string, assetId: string, author: string, body: string): Promise<CampaignWorkspace> {
    requireText(author, "Comment author"); requireText(body, "Comment body");
    const now = this.clock().toISOString();
    const comment: ReviewComment = { id: this.createId(), author: author.trim(), body: body.trim(), createdAt: now };
    return this.changeAsset(workspaceId, assetId, (asset) => ({ ...asset, comments: [...asset.comments, comment], updatedAt: now }));
  }

  async submitAsset(workspaceId: string, assetId: string): Promise<CampaignWorkspace> {
    return this.changeAsset(workspaceId, assetId, (asset) => {
      if (!["draft", "changes_requested", "approval_invalidated"].includes(asset.status)) throw new Error("Only draft, changed, or invalidated assets can enter review");
      return { ...asset, status: "in_review", updatedAt: this.clock().toISOString() };
    });
  }

  async reviewAsset(workspaceId: string, assetId: string, reviewer: string, decision: ReviewDecision, note: string): Promise<CampaignWorkspace> {
    requireText(reviewer, "Named asset reviewer"); requireText(note, "Asset review note");
    const workspace = await this.load(workspaceId);
    const asset = required(workspace.assets, assetId, "Canonical asset");
    if (asset.status !== "in_review") throw new Error("Asset must be in review");
    if (decision === "approved") {
      const product = await this.requiredProduct(workspaceId);
      const campaign = required(workspace.campaigns, asset.campaignId, "Campaign");
      if (campaign.status !== "approved") throw new Error("Asset approval requires an approved campaign");
      this.validateCampaignAuthority(product, campaign);
      this.validateReferences(product, asset.claimReferences, asset.evidenceIds, campaign.channels);
    }
    const now = this.clock().toISOString();
    return this.persist({
      ...workspace,
      assets: workspace.assets.map((record) => record.id === assetId
        ? { ...record, status: decision, reviewedBy: reviewer.trim(), reviewedAt: now, reviewNote: note.trim(), updatedAt: now }
        : record),
      updatedAt: now,
    });
  }

  async createVariant(workspaceId: string, assetId: string, channel: ChannelKind, body: string, constraints: readonly string[]): Promise<CampaignWorkspace> {
    requireText(body, "Channel variant body");
    if (constraints.length === 0) throw new Error("Channel constraints are required");
    const [product, workspace] = await Promise.all([this.requiredProduct(workspaceId), this.load(workspaceId)]);
    const asset = required(workspace.assets, assetId, "Canonical asset");
    if (asset.status !== "approved") throw new Error("Channel variants require an approved canonical asset");
    const campaign = required(workspace.campaigns, asset.campaignId, "Campaign");
    if (campaign.status !== "approved") throw new Error("Channel variants require current approved campaign authority");
    this.validateCampaignAuthority(product, campaign);
    this.validateReferences(product, asset.claimReferences, asset.evidenceIds, campaign.channels);
    if (workspace.variants.some((item) => item.canonicalAssetId === assetId && item.channel === channel)) throw new Error("A variant already exists for this channel");
    const now = this.clock().toISOString();
    const variant: ChannelVariant = { id: this.createId(), workspaceId, canonicalAssetId: assetId, channel, body, constraints: clean(constraints), version: 1, status: "draft", createdAt: now, updatedAt: now };
    return this.persist({ ...workspace, variants: [...workspace.variants, variant], updatedAt: now });
  }

  async submitVariant(workspaceId: string, variantId: string): Promise<CampaignWorkspace> {
    return this.changeVariant(workspaceId, variantId, (variant) => {
      if (!["draft", "changes_requested", "approval_invalidated"].includes(variant.status)) throw new Error("Only draft, changed, or invalidated variants can enter review");
      return { ...variant, status: "in_review", updatedAt: this.clock().toISOString() };
    });
  }

  async reviewVariant(workspaceId: string, variantId: string, reviewer: string, decision: ReviewDecision, note: string): Promise<CampaignWorkspace> {
    requireText(reviewer, "Named variant reviewer"); requireText(note, "Variant review note");
    const workspace = await this.load(workspaceId);
    const variant = required(workspace.variants, variantId, "Channel variant");
    if (variant.status !== "in_review") throw new Error("Variant must be in review");
    if (decision === "approved") {
      const product = await this.requiredProduct(workspaceId);
      const asset = required(workspace.assets, variant.canonicalAssetId, "Canonical asset");
      if (asset.status !== "approved") throw new Error("Variant approval requires an approved canonical asset");
      const campaign = required(workspace.campaigns, asset.campaignId, "Campaign");
      if (campaign.status !== "approved") throw new Error("Variant approval requires current approved campaign authority");
      this.validateCampaignAuthority(product, campaign);
      this.validateReferences(product, asset.claimReferences, asset.evidenceIds, campaign.channels);
    }
    const now = this.clock().toISOString();
    return this.persist({
      ...workspace,
      variants: workspace.variants.map((record) => record.id === variantId
        ? { ...record, status: decision, reviewedBy: reviewer.trim(), reviewedAt: now, reviewNote: note.trim(), updatedAt: now }
        : record),
      updatedAt: now,
    });
  }

  async detectClaimImpact(workspaceId: string): Promise<CampaignWorkspace> {
    const [product, workspace] = await Promise.all([this.requiredProduct(workspaceId), this.load(workspaceId)]);
    const now = this.clock().toISOString();
    const affectedCampaignIds = new Set<string>();
    const campaigns = workspace.campaigns.map((campaign) => {
      try {
        this.validateCampaignAuthority(product, campaign);
        return campaign;
      } catch (error) {
        affectedCampaignIds.add(campaign.id);
        const reason = error instanceof Error ? error.message : "Product Core authority changed";
        return campaign.status === "approved"
          ? { ...campaign, status: "approval_invalidated" as const, updatedAt: now, reviewNote: appendAuditNote(campaign.reviewNote, `Approval invalidated: ${reason}`) }
          : campaign;
      }
    });
    const contentBriefs = (workspace.contentBriefs ?? []).map((brief) => affectedCampaignIds.has(brief.campaignId) && brief.status === "approved"
      ? { ...brief, status: "approval_invalidated" as const, updatedAt: now, reviewNote: appendAuditNote(brief.reviewNote, "Approval invalidated: campaign authority changed") }
      : brief);
    const affectedAssetIds = new Set<string>();
    const assets = workspace.assets.map((asset) => {
      if (!affectedCampaignIds.has(asset.campaignId)) return asset;
      affectedAssetIds.add(asset.id);
      return asset.status === "approved"
        ? { ...asset, status: "approval_invalidated" as const, updatedAt: now, reviewNote: appendAuditNote(asset.reviewNote, "Approval invalidated: campaign authority changed") }
        : asset;
    });
    const variants = workspace.variants.map((variant) => affectedAssetIds.has(variant.canonicalAssetId) && variant.status === "approved"
      ? { ...variant, status: "approval_invalidated" as const, updatedAt: now, reviewNote: appendAuditNote(variant.reviewNote, "Approval invalidated: canonical asset authority changed") }
      : variant);
    return this.persist({ ...workspace, campaigns, contentBriefs, assets, variants, updatedAt: now });
  }

  async createManualExport(
    workspaceId: string,
    campaignId: string,
    assetId: string,
    creator: string,
    channels: readonly ChannelKind[] = ALL_CHANNELS,
  ): Promise<CampaignWorkspace> {
    requireText(creator, "Named export creator");
    const [product, workspace] = await Promise.all([this.requiredProduct(workspaceId), this.load(workspaceId)]);
    const campaign = required(workspace.campaigns, campaignId, "Campaign");
    const asset = required(workspace.assets, assetId, "Canonical asset");
    if (campaign.status !== "approved" || asset.status !== "approved" || asset.campaignId !== campaignId) throw new Error("Manual export requires an approved campaign and its approved canonical asset");
    const selectedChannels = normalizeExportChannels(channels);
    if (selectedChannels.some((channel) => !campaign.channels.includes(channel))) throw new Error("Manual export channels must be included in the approved campaign intent");
    this.validateCampaignAuthority(product, campaign);
    this.validateReferences(product, asset.claimReferences, asset.evidenceIds, selectedChannels);
    const variants = selectedChannels.map((channel) => {
      const variant = workspace.variants.find((item) => item.canonicalAssetId === assetId && item.channel === channel && item.status === "approved");
      if (!variant) throw new Error(`Manual export requires an approved ${channel.replaceAll("_", " ")} variant for every selected channel`);
      return variant;
    });
    const now = this.clock().toISOString();
    const record: ManualExportPackage = {
      id: this.createId(), workspaceId, campaignId, canonicalAssetId: assetId, variantIds: variants.map((item) => item.id), channels: selectedChannels,
      createdAt: now, createdBy: creator.trim(), status: "manual_export_ready",
      manifest: JSON.stringify({
        campaign: {
          id: campaign.id,
          version: campaign.version,
          primaryOutcome: campaign.primaryOutcome,
          primaryAudience: campaign.primaryAudience,
          intendedChannels: campaign.channels,
        },
        includedChannels: selectedChannels,
        canonicalAsset: { id: asset.id, version: asset.versions.length, claimReferences: asset.claimReferences, evidenceIds: asset.evidenceIds, rights: asset.rights, accessibilityRequirements: asset.accessibilityRequirements },
        variants: variants.map((item) => ({ id: item.id, channel: item.channel, version: item.version, body: item.body, constraints: item.constraints })),
        externalAction: { approvedForPublishing: false, delivered: false },
      }, null, 2),
    };
    return this.persist({ ...workspace, exports: [...workspace.exports, record], updatedAt: now });
  }

  private async load(workspaceId: string): Promise<CampaignWorkspace> {
    const stored = await this.store.load(workspaceId);
    return stored ? { ...stored, contentBriefs: stored.contentBriefs ?? [] } : { workspaceId, campaigns: [], contentBriefs: [], assets: [], variants: [], exports: [], updatedAt: this.clock().toISOString() };
  }

  private async requiredProduct(workspaceId: string): Promise<ProductWorkspace> {
    const workspace = await this.productStore.load(workspaceId);
    if (!workspace) throw new Error("Product workspace not found");
    return workspace;
  }

  private validateCampaignAuthority(product: ProductWorkspace, campaign: CampaignBrief): void {
    if (campaign.audienceKind === "selected_icp") {
      const selected = product.icpHypotheses.find((item) => item.id === campaign.icpHypothesisId && item.status === "selected" && item.reviewStatus === "reviewed");
      if (!selected) throw new Error("Product Core selected ICP authority changed or requires review");
    }
    this.validateReferences(product, campaign.claimReferences, campaign.evidenceIds, campaign.channels);
  }

  private claimReferences(product: ProductWorkspace, claimIds: readonly string[], evidenceIds: readonly string[], selectedChannels: readonly ChannelKind[]): readonly ClaimReference[] {
    if (claimIds.length === 0) throw new Error("At least one approved Product Core claim is required");
    this.validateEvidence(product, evidenceIds);
    return unique(claimIds).map((claimId) => {
      const claim = product.claims.find((item) => item.id === claimId);
      if (!claim || claim.status !== "approved") throw new Error("Campaign claims must be approved in Product Core");
      if (selectedChannels.some((channel) => claim.prohibitedContexts.includes(channel))) throw new Error("A selected claim is prohibited for a campaign channel");
      if (claim.evidenceIds.some((id) => !evidenceIds.includes(id))) throw new Error("Campaign evidence must include every selected claim evidence reference");
      return { claimId: claim.id, claimRevision: claim.revision, statement: claim.statement, evidenceIds: [...claim.evidenceIds] };
    });
  }

  private validateReferences(product: ProductWorkspace, references: readonly ClaimReference[], evidenceIds: readonly string[], selectedChannels: readonly ChannelKind[]): void {
    this.validateEvidence(product, evidenceIds);
    for (const reference of references) {
      const claim = product.claims.find((item) => item.id === reference.claimId);
      if (!claim || claim.status !== "approved" || claim.revision !== reference.claimRevision || claim.statement !== reference.statement) throw new Error("Product Core claim authority changed");
      if (selectedChannels.some((channel) => claim.prohibitedContexts.includes(channel))) throw new Error("A claim is prohibited for a selected channel");
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

  private async changeContentBrief(workspaceId: string, id: string, change: (record: ContentBrief) => ContentBrief): Promise<CampaignWorkspace> {
    const workspace = await this.load(workspaceId);
    const briefs = workspace.contentBriefs ?? [];
    if (!briefs.some((item) => item.id === id)) throw new Error("Content brief not found");
    return this.persist({ ...workspace, contentBriefs: briefs.map((item) => item.id === id ? change(item) : item), updatedAt: this.clock().toISOString() });
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

function appendAuditNote(previous: string | undefined, note: string): string {
  const prior = previous?.trim();
  return prior ? `${prior}\n${note}` : note;
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

function normalizeExportChannels(values: readonly ChannelKind[]): readonly ChannelKind[] {
  const selected = unique(values);
  if (selected.length === 0) throw new Error("Manual export requires at least one selected channel");
  if (selected.some((channel) => !ALL_CHANNELS.includes(channel))) throw new Error("Manual export contains an unsupported channel");
  return selected;
}

function required<T extends { id: string }>(values: readonly T[], id: string, label: string): T {
  const value = values.find((item) => item.id === id);
  if (!value) throw new Error(label + " not found");
  return value;
}