import { isReviewedEvidence } from "../../product-core/domain/evidence.js";
import type { ProductWorkspace } from "../../product-core/domain/workspace.js";
import type { ProductWorkspaceStore } from "../../product-core/ports/product-workspace-store.js";
import type {
  AuthorityRevision,
  CampaignBrief,
  CampaignWorkspace,
  ChannelKind,
  ChannelVariant,
  ClaimReference,
  ContentBrief,
} from "../domain/campaign.js";
import type { CampaignWorkspaceStore } from "../ports/campaign-workspace-store.js";

type Clock = () => Date;
type DescendantState = Readonly<{
  contentBriefs: readonly ContentBrief[];
  assets: CampaignWorkspace["assets"];
  variants: CampaignWorkspace["variants"];
}>;

type CampaignCorrectionInput = Readonly<{
  editor: string;
  rationale: string;
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
}>;

export type ContentBriefCorrectionInput = Readonly<{
  editor: string;
  rationale: string;
  title: string;
  objective: string;
  pillars: readonly string[];
  themes: readonly string[];
  deliverables: readonly string[];
  sourceNotes: readonly string[];
  owner: string;
}>;

export type ChannelVariantCorrectionInput = Readonly<{
  editor: string;
  rationale: string;
  body: string;
  constraints: readonly string[];
}>;

export class CampaignRevisionService {
  constructor(
    private readonly store: CampaignWorkspaceStore,
    private readonly productStore: ProductWorkspaceStore,
    private readonly clock: Clock = () => new Date(),
  ) {}

  async reviseCampaign(workspaceId: string, campaignId: string, input: CampaignCorrectionInput): Promise<CampaignWorkspace> {
    requireText(input.editor, "Named campaign editor");
    requireText(input.rationale, "Campaign revision rationale");
    requireCampaignFields(input);
    const [workspace, product] = await Promise.all([this.load(workspaceId), this.requiredProduct(workspaceId)]);
    const current = required(workspace.campaigns, campaignId, "Campaign");
    if (current.status === "in_review") throw new Error("A campaign in review must receive a review decision before it can be revised");
    this.validateAudience(product, input.audienceKind, input.icpHypothesisId);
    const claimReferences = this.claimReferences(product, input.claimIds, input.evidenceIds, input.channels);
    const changedFields = campaignChangedFields(current, input, claimReferences);
    if (changedFields.length === 0) throw new Error("Change at least one campaign field before saving a revision");
    const now = this.clock().toISOString();
    const revision = authorityRevision(current.version, now, input.editor, input.rationale, changedFields, current);
    const status: CampaignBrief["status"] = current.status === "approved" ? "approval_invalidated" : "draft";
    const revisedBase = {
      ...current,
      title: input.title.trim(),
      objective: input.objective.trim(),
      primaryOutcome: input.primaryOutcome.trim(),
      primaryAudience: input.primaryAudience.trim(),
      audienceKind: input.audienceKind,
      problem: input.problem.trim(),
      trigger: input.trigger.trim(),
      offer: input.offer.trim(),
      messageHierarchy: clean(input.messageHierarchy),
      proof: clean(input.proof),
      claimReferences,
      evidenceIds: unique(input.evidenceIds),
      callToAction: input.callToAction.trim(),
      channels: unique(input.channels),
      assetPlan: clean(input.assetPlan),
      owner: input.owner.trim(),
      successMeasures: clean(input.successMeasures),
      dependencies: clean(input.dependencies),
      version: current.version + 1,
      status,
      updatedAt: now,
      history: [...(current.history ?? []), revision],
    };
    const revised: CampaignBrief = input.icpHypothesisId
      ? { ...stripReview(revisedBase), icpHypothesisId: input.icpHypothesisId }
      : stripIcpReference(stripReview(revisedBase));
    const campaigns = workspace.campaigns.map((candidate) => candidate.id === campaignId ? revised : candidate);
    const descendants = invalidateCampaignDescendants(workspace, campaignId, now);
    return this.persist({ ...workspace, ...descendants, campaigns, updatedAt: now });
  }

  async reviseContentBrief(workspaceId: string, briefId: string, input: ContentBriefCorrectionInput): Promise<CampaignWorkspace> {
    requireText(input.editor, "Named content brief editor");
    requireText(input.rationale, "Content brief revision rationale");
    requireText(input.title, "Content brief title");
    requireText(input.objective, "Content brief objective");
    requireText(input.owner, "Content brief owner");
    if (clean(input.pillars).length === 0 || clean(input.deliverables).length === 0) throw new Error("Content brief pillars and deliverables are required");
    const workspace = await this.load(workspaceId);
    const current = required(workspace.contentBriefs ?? [], briefId, "Content brief");
    if (current.status === "in_review") throw new Error("A content brief in review must receive a review decision before it can be revised");
    required(workspace.campaigns, current.campaignId, "Campaign");
    const changedFields = contentBriefChangedFields(current, input);
    if (changedFields.length === 0) throw new Error("Change at least one content brief field before saving a revision");
    const now = this.clock().toISOString();
    const version = current.version ?? 1;
    const revision = authorityRevision(version, now, input.editor, input.rationale, changedFields, current);
    const status: ContentBrief["status"] = current.status === "approved" ? "approval_invalidated" : "draft";
    const revised: ContentBrief = stripReview({
      ...current,
      title: input.title.trim(),
      objective: input.objective.trim(),
      pillars: clean(input.pillars),
      themes: clean(input.themes),
      deliverables: clean(input.deliverables),
      sourceNotes: clean(input.sourceNotes),
      owner: input.owner.trim(),
      version: version + 1,
      status,
      updatedAt: now,
      history: [...(current.history ?? []), revision],
    });
    return this.persist({
      ...workspace,
      contentBriefs: (workspace.contentBriefs ?? []).map((candidate) => candidate.id === briefId ? revised : candidate),
      updatedAt: now,
    });
  }

  async reviseVariant(workspaceId: string, variantId: string, input: ChannelVariantCorrectionInput): Promise<CampaignWorkspace> {
    requireText(input.editor, "Named channel variant editor");
    requireText(input.rationale, "Channel variant revision rationale");
    requireText(input.body, "Channel variant body");
    if (clean(input.constraints).length === 0) throw new Error("Channel variant constraints are required");
    const workspace = await this.load(workspaceId);
    const current = required(workspace.variants, variantId, "Channel variant");
    if (current.status === "in_review") throw new Error("A channel variant in review must receive a review decision before it can be revised");
    const changedFields = variantChangedFields(current, input);
    if (changedFields.length === 0) throw new Error("Change the channel body or constraints before saving a revision");
    const now = this.clock().toISOString();
    const revision = authorityRevision(current.version, now, input.editor, input.rationale, changedFields, current);
    const status: ChannelVariant["status"] = current.status === "approved" ? "approval_invalidated" : "draft";
    const revised: ChannelVariant = stripReview({
      ...current,
      body: input.body.trim(),
      constraints: clean(input.constraints),
      version: current.version + 1,
      status,
      updatedAt: now,
      history: [...(current.history ?? []), revision],
    });
    return this.persist({
      ...workspace,
      variants: workspace.variants.map((candidate) => candidate.id === variantId ? revised : candidate),
      updatedAt: now,
    });
  }

  async revalidateProductAuthority(workspaceId: string): Promise<CampaignWorkspace> {
    const [workspace, product] = await Promise.all([this.load(workspaceId), this.requiredProduct(workspaceId)]);
    const now = this.clock().toISOString();
    const invalidCampaignIds = new Set<string>();
    const campaigns = workspace.campaigns.map((campaign) => {
      if (campaign.status !== "approved") return campaign;
      try {
        this.validateCampaignAuthority(product, campaign);
        return campaign;
      } catch {
        invalidCampaignIds.add(campaign.id);
        return { ...campaign, status: "approval_invalidated" as const, updatedAt: now };
      }
    });
    if (invalidCampaignIds.size === 0) return workspace;
    let contentBriefs = [...(workspace.contentBriefs ?? [])];
    let assets = [...workspace.assets];
    let variants = [...workspace.variants];
    for (const campaignId of invalidCampaignIds) {
      const descendants = invalidateCampaignDescendants({ ...workspace, contentBriefs, assets, variants }, campaignId, now);
      contentBriefs = [...descendants.contentBriefs];
      assets = [...descendants.assets];
      variants = [...descendants.variants];
    }
    return this.persist({ ...workspace, campaigns, contentBriefs, assets, variants, updatedAt: now });
  }

  private validateCampaignAuthority(product: ProductWorkspace, campaign: CampaignBrief): void {
    this.validateAudience(product, campaign.audienceKind, campaign.icpHypothesisId);
    this.validateReferences(product, campaign.claimReferences, campaign.evidenceIds, campaign.channels);
  }

  private validateAudience(product: ProductWorkspace, audienceKind: CampaignBrief["audienceKind"], icpHypothesisId?: string): void {
    if (audienceKind !== "selected_icp") return;
    const selected = product.icpHypotheses.find((candidate) => candidate.id === icpHypothesisId && candidate.status === "selected" && candidate.reviewStatus === "reviewed");
    if (!selected) throw new Error("A reviewed selected ICP is required for this campaign audience");
  }

  private claimReferences(product: ProductWorkspace, claimIds: readonly string[], evidenceIds: readonly string[], selectedChannels: readonly ChannelKind[]): readonly ClaimReference[] {
    const ids = unique(claimIds);
    if (ids.length === 0) throw new Error("At least one approved Product Core claim is required");
    this.validateEvidence(product, evidenceIds);
    return ids.map((claimId) => {
      const claim = product.claims.find((candidate) => candidate.id === claimId);
      if (!claim || claim.status !== "approved") throw new Error("Campaign claims must be approved in Product Core");
      if (selectedChannels.some((channel) => claim.prohibitedContexts.includes(channel))) throw new Error("A selected claim is prohibited for a campaign channel");
      if (claim.evidenceIds.some((id) => !evidenceIds.includes(id))) throw new Error("Campaign evidence must include every selected claim evidence reference");
      return { claimId: claim.id, claimRevision: claim.revision, statement: claim.statement, evidenceIds: [...claim.evidenceIds] };
    });
  }

  private validateReferences(product: ProductWorkspace, references: readonly ClaimReference[], evidenceIds: readonly string[], selectedChannels: readonly ChannelKind[]): void {
    this.validateEvidence(product, evidenceIds);
    for (const reference of references) {
      const claim = product.claims.find((candidate) => candidate.id === reference.claimId);
      if (!claim || claim.status !== "approved" || claim.revision !== reference.claimRevision || claim.statement !== reference.statement) throw new Error("Product Core claim authority changed");
      if (selectedChannels.some((channel) => claim.prohibitedContexts.includes(channel))) throw new Error("A claim is prohibited for a selected channel");
    }
  }

  private validateEvidence(product: ProductWorkspace, evidenceIds: readonly string[]): void {
    const ids = unique(evidenceIds);
    if (ids.length === 0) throw new Error("Reviewed Product Core evidence is required");
    const reviewed = new Set(product.evidence.filter(isReviewedEvidence).map((candidate) => candidate.id));
    if (ids.some((id) => !reviewed.has(id))) throw new Error("Campaign evidence must be reviewed non-generated Product Core evidence");
  }

  private async load(workspaceId: string): Promise<CampaignWorkspace> {
    const workspace = await this.store.load(workspaceId);
    return workspace
      ? { ...workspace, contentBriefs: workspace.contentBriefs ?? [] }
      : { workspaceId, campaigns: [], contentBriefs: [], assets: [], variants: [], exports: [], updatedAt: this.clock().toISOString() };
  }

  private async requiredProduct(workspaceId: string): Promise<ProductWorkspace> {
    const product = await this.productStore.load(workspaceId);
    if (!product) throw new Error("Product workspace not found");
    return product;
  }

  private async persist(workspace: CampaignWorkspace): Promise<CampaignWorkspace> {
    await this.store.save(workspace);
    return workspace;
  }
}

function requireCampaignFields(input: CampaignCorrectionInput): void {
  requireText(input.title, "Campaign title");
  requireText(input.objective, "Campaign objective");
  requireText(input.primaryOutcome, "One primary outcome");
  requireText(input.primaryAudience, "One primary audience");
  requireText(input.problem, "Campaign problem");
  requireText(input.trigger, "Campaign trigger");
  requireText(input.offer, "Campaign offer");
  requireText(input.callToAction, "Campaign call to action");
  requireText(input.owner, "Campaign owner");
  if (clean(input.messageHierarchy).length === 0 || clean(input.successMeasures).length === 0) throw new Error("Campaign message hierarchy and success measures are required");
  if (unique(input.channels).length === 0) throw new Error("At least one campaign channel is required");
}

function campaignChangedFields(current: CampaignBrief, input: CampaignCorrectionInput, claimReferences: readonly ClaimReference[]): string[] {
  const nextIcp = input.icpHypothesisId || undefined;
  const comparisons: readonly [string, unknown, unknown][] = [
    ["title", current.title, input.title.trim()], ["objective", current.objective, input.objective.trim()],
    ["primaryOutcome", current.primaryOutcome, input.primaryOutcome.trim()], ["primaryAudience", current.primaryAudience, input.primaryAudience.trim()],
    ["audienceKind", current.audienceKind, input.audienceKind], ["icpHypothesisId", current.icpHypothesisId, nextIcp],
    ["problem", current.problem, input.problem.trim()], ["trigger", current.trigger, input.trigger.trim()], ["offer", current.offer, input.offer.trim()],
    ["messageHierarchy", current.messageHierarchy, clean(input.messageHierarchy)], ["proof", current.proof, clean(input.proof)],
    ["claimReferences", current.claimReferences, claimReferences], ["evidenceIds", current.evidenceIds, unique(input.evidenceIds)],
    ["callToAction", current.callToAction, input.callToAction.trim()], ["channels", current.channels, unique(input.channels)],
    ["assetPlan", current.assetPlan, clean(input.assetPlan)], ["owner", current.owner, input.owner.trim()],
    ["successMeasures", current.successMeasures, clean(input.successMeasures)], ["dependencies", current.dependencies, clean(input.dependencies)],
  ];
  return changed(comparisons);
}

function contentBriefChangedFields(current: ContentBrief, input: ContentBriefCorrectionInput): string[] {
  return changed([
    ["title", current.title, input.title.trim()], ["objective", current.objective, input.objective.trim()],
    ["pillars", current.pillars, clean(input.pillars)], ["themes", current.themes, clean(input.themes)],
    ["deliverables", current.deliverables, clean(input.deliverables)], ["sourceNotes", current.sourceNotes, clean(input.sourceNotes)],
    ["owner", current.owner, input.owner.trim()],
  ]);
}

function variantChangedFields(current: ChannelVariant, input: ChannelVariantCorrectionInput): string[] {
  return changed([["body", current.body, input.body.trim()], ["constraints", current.constraints, clean(input.constraints)]]);
}

function changed(comparisons: readonly (readonly [string, unknown, unknown])[]): string[] {
  return comparisons.filter(([, before, after]) => JSON.stringify(before) !== JSON.stringify(after)).map(([field]) => field);
}

function authorityRevision(version: number, changedAt: string, changedBy: string, rationale: string, changedFields: readonly string[], record: object): AuthorityRevision {
  const { history: _history, ...snapshot } = record as Record<string, unknown>;
  return { version, changedAt, changedBy: changedBy.trim(), rationale: rationale.trim(), changedFields: [...changedFields], snapshot: JSON.stringify(snapshot) };
}

function invalidateCampaignDescendants(workspace: CampaignWorkspace, campaignId: string, now: string): DescendantState {
  const contentBriefs = (workspace.contentBriefs ?? []).map((brief) => brief.campaignId === campaignId && brief.status === "approved"
    ? { ...brief, status: "approval_invalidated" as const, updatedAt: now }
    : brief);
  const affectedAssetIds = new Set<string>();
  const assets = workspace.assets.map((asset) => {
    if (asset.campaignId !== campaignId) return asset;
    affectedAssetIds.add(asset.id);
    return asset.status === "approved" ? { ...asset, status: "approval_invalidated" as const, updatedAt: now } : asset;
  });
  const variants = workspace.variants.map((variant) => affectedAssetIds.has(variant.canonicalAssetId) && variant.status === "approved"
    ? { ...variant, status: "approval_invalidated" as const, updatedAt: now }
    : variant);
  return { contentBriefs, assets, variants };
}

function stripReview<T extends { reviewedBy?: string; reviewedAt?: string; reviewNote?: string }>(record: T): Omit<T, "reviewedBy" | "reviewedAt" | "reviewNote"> {
  const { reviewedBy: _reviewedBy, reviewedAt: _reviewedAt, reviewNote: _reviewNote, ...rest } = record;
  return rest;
}

function stripIcpReference<T extends { icpHypothesisId?: string }>(record: T): Omit<T, "icpHypothesisId"> {
  const { icpHypothesisId: _icpHypothesisId, ...rest } = record;
  return rest;
}

function clean(values: readonly string[]): readonly string[] {
  return values.map((value) => value.trim()).filter(Boolean);
}

function unique<T>(values: readonly T[]): readonly T[] {
  return [...new Set(values)];
}

function required<T extends { id: string }>(values: readonly T[], id: string, valueLabel: string): T {
  const value = values.find((candidate) => candidate.id === id);
  if (!value) throw new Error(`${valueLabel} not found`);
  return value;
}

function requireText(value: string, valueLabel: string): void {
  if (!value.trim()) throw new Error(`${valueLabel} is required`);
}
