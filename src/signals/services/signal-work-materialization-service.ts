import type { CampaignBrief, CampaignWorkspace, ChannelKind } from "../../campaigns/domain/campaign.js";
import type { CampaignWorkspaceStore } from "../../campaigns/ports/campaign-workspace-store.js";
import { CampaignService } from "../../campaigns/services/campaign-service.js";
import type { ReadinessAction } from "../../product-core/domain/assessment.js";
import type { ProductWorkspace } from "../../product-core/domain/workspace.js";
import type { ProductWorkspaceStore } from "../../product-core/ports/product-workspace-store.js";
import { ProductCoreService } from "../../product-core/services/product-core-service.js";
import type { SignalConversion, SignalMaterializationContext, SignalsInbox } from "../domain/signal.js";
import type { SignalsInboxStore } from "../ports/signals-inbox-store.js";

type Clock = () => Date;

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

const productKinds = new Map<SignalConversion["kind"], ReadinessAction["kind"]>([
  ["product_action", "action"],
  ["icp_validation_action", "icp_experiment"],
  ["product_feedback", "product_feedback"],
]);

export const isProductMaterializationKind = (kind: SignalConversion["kind"]): boolean => productKinds.has(kind);
export const isCampaignMaterializationKind = (kind: SignalConversion["kind"]): boolean => kind === "campaign_brief";

export class SignalWorkMaterializationService {
  private readonly productService: ProductCoreService;

  constructor(
    private readonly signalsStore: SignalsInboxStore,
    private readonly productStore: ProductWorkspaceStore,
    private readonly clock: Clock = () => new Date(),
    private readonly campaignStore?: CampaignWorkspaceStore,
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
