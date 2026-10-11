import { isReviewedEvidence } from "../../product-core/domain/evidence.js";
import type { ProductWorkspace } from "../../product-core/domain/workspace.js";
import type { ProductWorkspaceStore } from "../../product-core/ports/product-workspace-store.js";
import type {
  CampaignBrief,
  CampaignWorkspace,
  CompositionBrief,
  CompositionFormat,
  CompositionObjective,
  ContentFamily,
  ExperimentVariable,
  ExternalLinkPolicy,
  PublicationExperiment,
} from "../domain/campaign.js";
import type { CampaignWorkspaceStore } from "../ports/campaign-workspace-store.js";

type Clock = () => Date;
type IdFactory = () => string;
export type ReadinessState = "ready" | "blocked";

export type GuidanceFinding = Readonly<{
  id: string;
  severity: "info" | "warning" | "blocking";
  ruleId: string;
  message: string;
  remediationHint?: string;
}>;

export type CompositionReadiness = Readonly<{
  truth: ReadinessState;
  audience: ReadinessState;
  message: ReadinessState;
  channel: ReadinessState;
  experiment: ReadinessState;
  approval: ReadinessState;
}>;

export type CompositionAssessment = Readonly<{
  briefId: string;
  readiness: CompositionReadiness;
  findings: readonly GuidanceFinding[];
}>;

export type ExperimentFreshness = Readonly<{
  experimentId: string;
  stale: boolean;
  reasons: readonly string[];
}>;

export class CompositionExperimentService {
  constructor(
    private readonly store: CampaignWorkspaceStore,
    private readonly productStore: ProductWorkspaceStore,
    private readonly clock: Clock = () => new Date(),
    private readonly createId: IdFactory = () => globalThis.crypto.randomUUID(),
  ) {}

  async createCompositionBrief(workspaceId: string, input: Readonly<{
    campaignId: string;
    objective: CompositionObjective;
    desiredOutcome: string;
    topic: string;
    contentFamily: ContentFamily;
    hookArchetype?: string;
    toneConstraints: readonly string[];
    prohibitedClaims: readonly string[];
    destinationId: string;
    format: CompositionFormat;
    mediaAssetIds: readonly string[];
    callToAction?: string;
    externalLinkPolicy: ExternalLinkPolicy;
    hypothesis: string;
  }>): Promise<CampaignWorkspace> {
    requireText(input.desiredOutcome, "Desired outcome");
    requireText(input.topic, "Composition topic");
    requireText(input.destinationId, "Destination");
    requireText(input.hypothesis, "Experiment hypothesis");
    const [workspace, product] = await Promise.all([this.load(workspaceId), this.requiredProduct(workspaceId)]);
    const campaign = required(workspace.campaigns, input.campaignId, "Campaign");
    if (campaign.status !== "approved") throw new Error("Composition briefs require an approved campaign");
    this.validateCampaignAuthority(product, campaign);
    const now = this.clock().toISOString();
    const brief: CompositionBrief = {
      id: this.createId(),
      workspaceId,
      campaignId: campaign.id,
      ...(campaign.icpHypothesisId ? { icpHypothesisId: campaign.icpHypothesisId } : {}),
      objective: input.objective,
      primaryAudience: campaign.primaryAudience,
      desiredOutcome: input.desiredOutcome.trim(),
      topic: input.topic.trim(),
      contentFamily: input.contentFamily,
      ...(input.hookArchetype?.trim() ? { hookArchetype: input.hookArchetype.trim() } : {}),
      toneConstraints: clean(input.toneConstraints),
      claimReferences: campaign.claimReferences.map((reference) => ({ ...reference, evidenceIds: [...reference.evidenceIds] })),
      evidenceIds: [...campaign.evidenceIds],
      prohibitedClaims: clean(input.prohibitedClaims),
      destinationId: input.destinationId.trim(),
      format: input.format,
      mediaAssetIds: clean(input.mediaAssetIds),
      ...(input.callToAction?.trim() ? { callToAction: input.callToAction.trim() } : {}),
      externalLinkPolicy: input.externalLinkPolicy,
      hypothesis: input.hypothesis.trim(),
      createdAt: now,
      updatedAt: now,
    };
    const next = { ...workspace, compositionBriefs: [...(workspace.compositionBriefs ?? []), brief], updatedAt: now };
    return this.persist(next);
  }

  async assessCompositionBrief(workspaceId: string, briefId: string): Promise<CompositionAssessment> {
    const [workspace, product] = await Promise.all([this.load(workspaceId), this.requiredProduct(workspaceId)]);
    const brief = required(workspace.compositionBriefs ?? [], briefId, "Composition brief");
    const campaign = required(workspace.campaigns, brief.campaignId, "Campaign");
    const findings: GuidanceFinding[] = [];

    let truth: ReadinessState = "ready";
    try {
      if (campaign.status !== "approved") throw new Error("Parent campaign is not approved");
      this.validateCampaignAuthority(product, campaign);
      this.validateBriefAuthority(product, brief);
    } catch (error) {
      truth = "blocked";
      findings.push(blocking("truth.authority", errorMessage(error), "Revalidate Product Core evidence and the parent campaign before publishing."));
    }

    const audience = brief.primaryAudience.trim() ? "ready" : "blocked";
    if (audience === "blocked") findings.push(blocking("audience.missing", "Primary audience is required."));

    const message = brief.topic.trim() && brief.desiredOutcome.trim() ? "ready" : "blocked";
    if (message === "blocked") findings.push(blocking("message.missing", "Topic and desired outcome are required."));
    if (!brief.hookArchetype) findings.push(warning("message.hook_missing", "No hook archetype is recorded; later hook comparisons will be unavailable."));
    if (requiresCallToAction(brief.objective) && !brief.callToAction) {
      findings.push(warning("message.cta_missing", "This objective normally requires an explicit call to action."));
    }

    const channel = brief.destinationId.trim() ? "ready" : "blocked";
    if (channel === "blocked") findings.push(blocking("channel.destination_missing", "A destination is required."));
    if (["image", "video"].includes(brief.format) && brief.mediaAssetIds.length === 0) {
      findings.push(blocking("channel.media_missing", "The selected format requires at least one media asset."));
    }

    const experiment = brief.hypothesis.trim() ? "ready" : "blocked";
    if (experiment === "blocked") findings.push(blocking("experiment.hypothesis_missing", "An explicit experiment hypothesis is required."));

    const bound = (workspace.publicationExperiments ?? []).some((record) => record.compositionBriefId === brief.id);
    const approval: ReadinessState = bound ? "ready" : "blocked";
    if (!bound) findings.push(blocking("approval.variant_unbound", "No exact approved channel variant is bound to this composition brief.", "Approve a channel variant and bind a publication experiment."));

    return { briefId, readiness: { truth, audience, message, channel, experiment, approval }, findings };
  }

  async bindPublicationExperiment(workspaceId: string, input: Readonly<{
    compositionBriefId: string;
    channelVariantId: string;
    provider: string;
    timezone: string;
    expectedOutcome: string;
    changedVariables: readonly ExperimentVariable[];
  }>): Promise<CampaignWorkspace> {
    requireText(input.provider, "Provider");
    requireText(input.timezone, "Timezone");
    requireText(input.expectedOutcome, "Expected outcome");
    const changedVariables = unique(input.changedVariables);
    if (changedVariables.length === 0) throw new Error("At least one tracked experiment variable is required");

    const [workspace, product] = await Promise.all([this.load(workspaceId), this.requiredProduct(workspaceId)]);
    const brief = required(workspace.compositionBriefs ?? [], input.compositionBriefId, "Composition brief");
    const campaign = required(workspace.campaigns, brief.campaignId, "Campaign");
    if (campaign.status !== "approved") throw new Error("Publication experiment requires an approved campaign");
    this.validateCampaignAuthority(product, campaign);
    this.validateBriefAuthority(product, brief);

    const variant = required(workspace.variants, input.channelVariantId, "Channel variant");
    if (variant.status !== "approved") throw new Error("Publication experiment requires an approved channel variant");
    const asset = required(workspace.assets, variant.canonicalAssetId, "Canonical asset");
    if (asset.status !== "approved" || asset.campaignId !== campaign.id) {
      throw new Error("Channel variant does not belong to the approved composition campaign");
    }
    if ((workspace.publicationExperiments ?? []).some((record) =>
      record.compositionBriefId === brief.id
      && record.channelVariantId === variant.id
      && record.channelVariantVersion === variant.version)) {
      throw new Error("This exact approved channel variant is already bound to the composition brief");
    }

    const now = this.clock().toISOString();
    const experiment: PublicationExperiment = {
      id: this.createId(),
      workspaceId,
      compositionBriefId: brief.id,
      channelVariantId: variant.id,
      channelVariantVersion: variant.version,
      channelVariantBodySha256: await sha256(variant.body),
      destinationId: brief.destinationId,
      provider: input.provider.trim(),
      timezone: input.timezone.trim(),
      expectedOutcome: input.expectedOutcome.trim(),
      changedVariables,
      status: "draft",
      createdAt: now,
      updatedAt: now,
    };
    return this.persist({
      ...workspace,
      publicationExperiments: [...(workspace.publicationExperiments ?? []), experiment],
      updatedAt: now,
    });
  }

  async assessExperimentFreshness(workspaceId: string, experimentId: string): Promise<ExperimentFreshness> {
    const [workspace, product] = await Promise.all([this.load(workspaceId), this.requiredProduct(workspaceId)]);
    const experiment = required(workspace.publicationExperiments ?? [], experimentId, "Publication experiment");
    const brief = required(workspace.compositionBriefs ?? [], experiment.compositionBriefId, "Composition brief");
    const reasons: string[] = [];
    const campaign = workspace.campaigns.find((record) => record.id === brief.campaignId);
    if (!campaign || campaign.status !== "approved") {
      reasons.push("Parent campaign approval is no longer current.");
    } else {
      try {
        this.validateCampaignAuthority(product, campaign);
        this.validateBriefAuthority(product, brief);
      } catch (error) {
        reasons.push(errorMessage(error));
      }
    }
    const variant = workspace.variants.find((record) => record.id === experiment.channelVariantId);
    if (!variant) {
      reasons.push("Bound channel variant no longer exists.");
    } else {
      if (variant.status !== "approved") reasons.push("Bound channel variant is no longer approved.");
      if (variant.version !== experiment.channelVariantVersion) reasons.push("Bound channel variant revision changed.");
      if (await sha256(variant.body) !== experiment.channelVariantBodySha256) reasons.push("Bound channel variant content fingerprint changed.");
    }
    return { experimentId, stale: reasons.length > 0, reasons };
  }

  private async load(workspaceId: string): Promise<CampaignWorkspace> {
    const stored = await this.store.load(workspaceId);
    return stored
      ? {
          ...stored,
          contentBriefs: stored.contentBriefs ?? [],
          compositionBriefs: stored.compositionBriefs ?? [],
          publicationExperiments: stored.publicationExperiments ?? [],
        }
      : {
          workspaceId,
          campaigns: [],
          contentBriefs: [],
          compositionBriefs: [],
          publicationExperiments: [],
          assets: [],
          variants: [],
          exports: [],
          updatedAt: this.clock().toISOString(),
        };
  }

  private async requiredProduct(workspaceId: string): Promise<ProductWorkspace> {
    const product = await this.productStore.load(workspaceId);
    if (!product) throw new Error("Product workspace not found");
    return product;
  }

  private validateCampaignAuthority(product: ProductWorkspace, campaign: CampaignBrief): void {
    if (campaign.audienceKind === "selected_icp") {
      const selected = product.icpHypotheses.find((record) =>
        record.id === campaign.icpHypothesisId
        && record.status === "selected"
        && record.reviewStatus === "reviewed");
      if (!selected) throw new Error("Product Core selected ICP authority changed or requires review");
    }
    this.validateReferences(product, campaign.claimReferences, campaign.evidenceIds);
  }

  private validateBriefAuthority(product: ProductWorkspace, brief: CompositionBrief): void {
    this.validateReferences(product, brief.claimReferences, brief.evidenceIds);
  }

  private validateReferences(
    product: ProductWorkspace,
    references: CompositionBrief["claimReferences"],
    evidenceIds: readonly string[],
  ): void {
    if (evidenceIds.length === 0) throw new Error("Reviewed Product Core evidence is required");
    const reviewed = new Set(product.evidence.filter(isReviewedEvidence).map((record) => record.id));
    if (evidenceIds.some((id) => !reviewed.has(id))) {
      throw new Error("Composition evidence is no longer reviewed Product Core evidence");
    }
    for (const reference of references) {
      const claim = product.claims.find((record) => record.id === reference.claimId);
      if (!claim
        || claim.status !== "approved"
        || claim.revision !== reference.claimRevision
        || claim.statement !== reference.statement) {
        throw new Error("Product Core claim authority changed");
      }
      if (reference.evidenceIds.some((id) => !evidenceIds.includes(id))) {
        throw new Error("Composition evidence no longer covers a required Product Core claim");
      }
    }
  }

  private async persist(workspace: CampaignWorkspace): Promise<CampaignWorkspace> {
    await this.store.save(workspace);
    return workspace;
  }
}

function blocking(ruleId: string, message: string, remediationHint?: string): GuidanceFinding {
  return { id: ruleId, severity: "blocking", ruleId, message, ...(remediationHint ? { remediationHint } : {}) };
}

function warning(ruleId: string, message: string): GuidanceFinding {
  return { id: ruleId, severity: "warning", ruleId, message };
}

function requiresCallToAction(objective: CompositionObjective): boolean {
  return ["release", "repository_growth", "lead_generation", "customer_evidence"].includes(objective);
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
  const value = values.find((record) => record.id === id);
  if (!value) throw new Error(label + " not found");
  return value;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Authority validation failed";
}

async function sha256(value: string): Promise<string> {
  const digest = await globalThis.crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
