import type { ActivationLearningWorkspace, CalendarEntry, CalendarEntryKind } from "../../activation-learning/domain/activation-learning.js";
import type { CampaignBrief, CampaignWorkspace, ChannelKind, ContentBrief } from "../../campaigns/domain/campaign.js";
import type { CampaignWorkspaceStore } from "../../campaigns/ports/campaign-workspace-store.js";
import { CampaignService } from "../../campaigns/services/campaign-service.js";
import type { ReadinessAction } from "../../product-core/domain/assessment.js";
import type { ProductWorkspace } from "../../product-core/domain/workspace.js";
import type { ProductWorkspaceStore } from "../../product-core/ports/product-workspace-store.js";
import { ProductCoreService } from "../../product-core/services/product-core-service.js";
import type { WebsiteWatchStore } from "../../website-watch/ports/website-watch-store.js";
import type { SignalConversion, SignalMaterializationContext, SignalsInbox } from "../domain/signal.js";
import type { SignalsInboxStore } from "../ports/signals-inbox-store.js";

type Clock = () => Date;
type PlanningKind = Exclude<CalendarEntryKind, "external_activation">;
type CalendarPlanningService = Readonly<{
  load(workspaceId: string): Promise<ActivationLearningWorkspace>;
  createPlanningEntry(workspaceId: string, input: Readonly<{
    kind: PlanningKind;
    title: string;
    owner: string;
    startsAt: string;
    endsAt?: string;
    timezone: string;
    notes: string;
    relatedRecordId?: string;
  }>): Promise<ActivationLearningWorkspace>;
}>;

export type ProductMaterializationResult = Readonly<{
  inbox: SignalsInbox;
  product: ProductWorkspace;
  action: ReadinessAction;
}>;

export type CampaignMaterializationInput = Readonly<{
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
  successMeasures: readonly string[];
  dependencies: readonly string[];
}>;

export type CampaignMaterializationResult = Readonly<{
  inbox: SignalsInbox;
  campaigns: CampaignWorkspace;
  campaign: CampaignBrief;
}>;

export type ContentMaterializationInput = Readonly<{
  campaignId: string;
  objective: string;
  pillars: readonly string[];
  themes: readonly string[];
  deliverables: readonly string[];
  sourceNotes: readonly string[];
  origin: "human" | "generated_suggestion";
}>;

export type ContentMaterializationResult = Readonly<{
  inbox: SignalsInbox;
  campaigns: CampaignWorkspace;
  contentBrief: ContentBrief;
}>;

export type WebsiteWatchActionMaterializationInput = Readonly<{
  kind: PlanningKind;
  startsAt: string;
  endsAt?: string;
  timezone: string;
  notes: string;
}>;

export type WebsiteWatchActionMaterializationResult = Readonly<{
  inbox: SignalsInbox;
  calendar: ActivationLearningWorkspace;
  entry: CalendarEntry;
}>;

const productKinds = new Map<SignalConversion["kind"], ReadinessAction["kind"]>([
  ["product_action", "action"],
  ["icp_validation_action", "icp_experiment"],
  ["product_feedback", "product_feedback"],
]);

export const isProductMaterializationKind = (kind: SignalConversion["kind"]): boolean => productKinds.has(kind);
export const isCampaignMaterializationKind = (kind: SignalConversion["kind"]): boolean => kind === "campaign_brief";
export const isContentMaterializationKind = (kind: SignalConversion["kind"]): boolean => kind === "content_brief";
export const isWebsiteWatchMaterializationKind = (kind: SignalConversion["kind"]): boolean => kind === "website_watch_action";

export class SignalWorkMaterializationService {
  private readonly productService: ProductCoreService;

  constructor(
    private readonly signalsStore: SignalsInboxStore,
    private readonly productStore: ProductWorkspaceStore,
    private readonly clock: Clock = () => new Date(),
    private readonly campaignStore?: CampaignWorkspaceStore,
    private readonly websiteStore?: WebsiteWatchStore,
    private readonly planningService?: CalendarPlanningService,
  ) {
    this.productService = new ProductCoreService(productStore, clock);
  }

  async materializeProductCore(workspaceId: string, conversionId: string): Promise<ProductMaterializationResult> {
    const inbox = await this.requiredInbox(workspaceId);
    const conversion = this.requiredConversion(inbox, conversionId);
    const actionKind = productKinds.get(conversion.kind);
    if (!actionKind) {
      throw new Error(`Conversion kind ${conversion.kind} requires destination-specific authority input before materialization`);
    }

    try {
      const product = await this.requiredProduct(workspaceId);
      const existing = product.actions.find((action) => action.source === "signal" && action.sourceId === conversion.id);
      if (existing) {
        const synchronized = conversion.status === "materialized" && conversion.materialization?.recordId === existing.id
          ? inbox
          : await this.recordSuccess(inbox, conversion.id, "product_core", existing.id);
        return { inbox: synchronized, product, action: existing };
      }

      const updatedProduct = await this.productService.createAction(workspaceId, {
        source: "signal",
        sourceId: conversion.id,
        title: conversion.title,
        owner: conversion.owner,
        kind: actionKind,
      });
      const action = updatedProduct.actions.find((candidate) => candidate.source === "signal" && candidate.sourceId === conversion.id);
      if (!action) throw new Error("Product Core did not retain the materialized signal action");
      const updatedInbox = await this.recordSuccess(inbox, conversion.id, "product_core", action.id);
      return { inbox: updatedInbox, product: updatedProduct, action };
    } catch (error) {
      await this.recordFailure(inbox, conversion.id, error);
      throw error;
    }
  }

  async materializeCampaign(
    workspaceId: string,
    conversionId: string,
    input: CampaignMaterializationInput,
  ): Promise<CampaignMaterializationResult> {
    const inbox = await this.requiredInbox(workspaceId);
    const conversion = this.requiredConversion(inbox, conversionId);
    if (conversion.kind !== "campaign_brief") throw new Error("Signal conversion is not a campaign brief");
    if (!this.campaignStore) throw new Error("Campaign materialization is not configured");

    const campaignId = `signal-campaign-${conversion.id}`;
    try {
      const existingWorkspace = await this.campaignStore.load(workspaceId);
      const existing = existingWorkspace?.campaigns.find((campaign) => campaign.id === campaignId);
      if (existing && existingWorkspace) {
        const synchronized = conversion.status === "materialized" && conversion.materialization?.recordId === existing.id
          ? inbox
          : await this.recordSuccess(inbox, conversion.id, "campaigns", existing.id);
        return { inbox: synchronized, campaigns: existingWorkspace, campaign: existing };
      }

      const campaignService = new CampaignService(
        this.campaignStore,
        this.productStore,
        this.clock,
        () => campaignId,
      );
      const updatedCampaigns = await campaignService.createBrief(workspaceId, {
        title: conversion.title,
        objective: input.objective,
        primaryOutcome: input.primaryOutcome,
        primaryAudience: input.primaryAudience,
        audienceKind: input.audienceKind,
        ...(input.icpHypothesisId ? { icpHypothesisId: input.icpHypothesisId } : {}),
        problem: input.problem,
        trigger: input.trigger,
        offer: input.offer,
        messageHierarchy: input.messageHierarchy,
        proof: input.proof,
        claimIds: input.claimIds,
        evidenceIds: input.evidenceIds,
        callToAction: input.callToAction,
        channels: input.channels,
        assetPlan: input.assetPlan,
        owner: conversion.owner,
        successMeasures: input.successMeasures,
        dependencies: input.dependencies,
      });
      const campaign = updatedCampaigns.campaigns.find((candidate) => candidate.id === campaignId);
      if (!campaign) throw new Error("Campaign authority did not retain the materialized signal brief");
      const updatedInbox = await this.recordSuccess(inbox, conversion.id, "campaigns", campaign.id);
      return { inbox: updatedInbox, campaigns: updatedCampaigns, campaign };
    } catch (error) {
      await this.recordFailure(inbox, conversion.id, error);
      throw error;
    }
  }

  async materializeContent(
    workspaceId: string,
    conversionId: string,
    input: ContentMaterializationInput,
  ): Promise<ContentMaterializationResult> {
    const inbox = await this.requiredInbox(workspaceId);
    const conversion = this.requiredConversion(inbox, conversionId);
    if (conversion.kind !== "content_brief") throw new Error("Signal conversion is not a content brief");
    if (!this.campaignStore) throw new Error("Content materialization is not configured");

    const briefId = `signal-content-${conversion.id}`;
    try {
      const existingWorkspace = await this.campaignStore.load(workspaceId);
      const existing = existingWorkspace?.contentBriefs?.find((brief) => brief.id === briefId);
      if (existing && existingWorkspace) {
        const synchronized = conversion.status === "materialized" && conversion.materialization?.recordId === existing.id
          ? inbox
          : await this.recordSuccess(inbox, conversion.id, "campaigns", existing.id);
        return { inbox: synchronized, campaigns: existingWorkspace, contentBrief: existing };
      }

      const campaignService = new CampaignService(
        this.campaignStore,
        this.productStore,
        this.clock,
        () => briefId,
      );
      const updatedCampaigns = await campaignService.createContentBrief(workspaceId, {
        campaignId: input.campaignId,
        title: conversion.title,
        objective: input.objective,
        pillars: input.pillars,
        themes: input.themes,
        deliverables: input.deliverables,
        sourceNotes: input.sourceNotes,
        owner: conversion.owner,
        origin: input.origin,
      });
      const contentBrief = updatedCampaigns.contentBriefs?.find((candidate) => candidate.id === briefId);
      if (!contentBrief) throw new Error("Campaign authority did not retain the materialized content brief");
      const updatedInbox = await this.recordSuccess(inbox, conversion.id, "campaigns", contentBrief.id);
      return { inbox: updatedInbox, campaigns: updatedCampaigns, contentBrief };
    } catch (error) {
      await this.recordFailure(inbox, conversion.id, error);
      throw error;
    }
  }

  async materializeWebsiteWatchAction(
    workspaceId: string,
    conversionId: string,
    input: WebsiteWatchActionMaterializationInput,
  ): Promise<WebsiteWatchActionMaterializationResult> {
    const inbox = await this.requiredInbox(workspaceId);
    const conversion = this.requiredConversion(inbox, conversionId);
    if (conversion.kind !== "website_watch_action") throw new Error("Signal conversion is not a Website Watch response action");
    if (!this.websiteStore || !this.planningService) throw new Error("Website Watch Calendar materialization is not configured");

    const relatedRecordId = `signal-conversion:${conversion.id}`;
    try {
      const signal = inbox.signals.find((candidate) => candidate.id === conversion.signalId);
      if (!signal || signal.kind !== "website_change" || signal.evidenceState !== "reviewed") {
        throw new Error("Website Watch response materialization requires a reviewed website-change signal");
      }
      const observationId = signal.facts.websiteWatchObservationId;
      if (typeof observationId !== "string" || !observationId) {
        throw new Error("Website-change signal is missing its Website Watch observation reference");
      }

      const website = await this.websiteStore.load(workspaceId);
      const observation = website?.observations.find((candidate) => candidate.id === observationId);
      if (!observation || observation.reviewState !== "reviewed") {
        throw new Error("Website Watch response materialization requires a currently reviewed Website Watch observation");
      }

      const existingCalendar = await this.planningService.load(workspaceId);
      const existing = existingCalendar.calendarEntries.find((entry) => entry.relatedRecordId === relatedRecordId);
      if (existing) {
        const synchronized = conversion.status === "materialized" && conversion.materialization?.recordId === existing.id
          ? inbox
          : await this.recordSuccess(inbox, conversion.id, "calendar", existing.id);
        return { inbox: synchronized, calendar: existingCalendar, entry: existing };
      }

      const notes = [input.notes.trim(), `Website Watch observation: ${observation.id}`].filter(Boolean).join("\n");
      const updatedCalendar = await this.planningService.createPlanningEntry(workspaceId, {
        kind: input.kind,
        title: conversion.title,
        owner: conversion.owner,
        startsAt: input.startsAt,
        ...(input.endsAt ? { endsAt: input.endsAt } : {}),
        timezone: input.timezone,
        notes,
        relatedRecordId,
      });
      const entry = updatedCalendar.calendarEntries.find((candidate) => candidate.relatedRecordId === relatedRecordId);
      if (!entry) throw new Error("Calendar authority did not retain the materialized Website Watch response plan");
      const updatedInbox = await this.recordSuccess(inbox, conversion.id, "calendar", entry.id);
      return { inbox: updatedInbox, calendar: updatedCalendar, entry };
    } catch (error) {
      await this.recordFailure(inbox, conversion.id, error);
      throw error;
    }
  }

  private async recordSuccess(
    inbox: SignalsInbox,
    conversionId: string,
    context: SignalMaterializationContext,
    recordId: string,
  ): Promise<SignalsInbox> {
    const now = this.clock().toISOString();
    const updated: SignalsInbox = {
      ...inbox,
      conversions: inbox.conversions.map((conversion) => {
        if (conversion.id !== conversionId) return conversion;
        const { materializationFailure: _failure, ...clean } = conversion;
        return {
          ...clean,
          status: "materialized",
          materialization: { context, recordId, materializedAt: now },
        };
      }),
      updatedAt: now,
    };
    await this.signalsStore.save(updated);
    return updated;
  }

  private async recordFailure(inbox: SignalsInbox, conversionId: string, error: unknown): Promise<void> {
    const now = this.clock().toISOString();
    const detail = error instanceof Error ? error.message : "Unknown materialization failure";
    await this.signalsStore.save({
      ...inbox,
      conversions: inbox.conversions.map((conversion) => conversion.id === conversionId ? {
        ...conversion,
        status: "materialization_failed",
        materializationFailure: { attemptedAt: now, detail },
      } : conversion),
      updatedAt: now,
    });
  }

  private async requiredInbox(workspaceId: string): Promise<SignalsInbox> {
    const inbox = await this.signalsStore.load(workspaceId);
    if (!inbox) throw new Error("Signals Inbox not found");
    return inbox;
  }

  private async requiredProduct(workspaceId: string): Promise<ProductWorkspace> {
    const product = await this.productStore.load(workspaceId);
    if (!product) throw new Error("Product workspace not found");
    return product;
  }

  private requiredConversion(inbox: SignalsInbox, conversionId: string): SignalConversion {
    const conversion = inbox.conversions.find((candidate) => candidate.id === conversionId);
    if (!conversion) throw new Error("Signal conversion not found");
    return conversion;
  }
}
