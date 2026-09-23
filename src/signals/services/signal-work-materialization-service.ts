import type { ReadinessAction } from "../../product-core/domain/assessment.js";
import type { ProductWorkspace } from "../../product-core/domain/workspace.js";
import type { ProductWorkspaceStore } from "../../product-core/ports/product-workspace-store.js";
import { ProductCoreService } from "../../product-core/services/product-core-service.js";
import type { SignalConversion, SignalsInbox } from "../domain/signal.js";
import type { SignalsInboxStore } from "../ports/signals-inbox-store.js";

type Clock = () => Date;

export type ProductMaterializationResult = Readonly<{
  inbox: SignalsInbox;
  product: ProductWorkspace;
  action: ReadinessAction;
}>;

const productKinds = new Map<SignalConversion["kind"], ReadinessAction["kind"]>([
  ["product_action", "action"],
  ["icp_validation_action", "icp_experiment"],
  ["product_feedback", "product_feedback"],
]);

export const isProductMaterializationKind = (kind: SignalConversion["kind"]): boolean => productKinds.has(kind);

export class SignalWorkMaterializationService {
  private readonly productService: ProductCoreService;

  constructor(
    private readonly signalsStore: SignalsInboxStore,
    private readonly productStore: ProductWorkspaceStore,
    private readonly clock: Clock = () => new Date(),
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

    const product = await this.requiredProduct(workspaceId);
    const existing = product.actions.find((action) => action.source === "signal" && action.sourceId === conversion.id);
    if (existing) {
      const synchronized = conversion.status === "materialized" && conversion.materialization?.recordId === existing.id
        ? inbox
        : await this.recordSuccess(inbox, conversion.id, existing.id);
      return { inbox: synchronized, product, action: existing };
    }

    try {
      const updatedProduct = await this.productService.createAction(workspaceId, {
        source: "signal",
        sourceId: conversion.id,
        title: conversion.title,
        owner: conversion.owner,
        kind: actionKind,
      });
      const action = updatedProduct.actions.find((candidate) => candidate.source === "signal" && candidate.sourceId === conversion.id);
      if (!action) throw new Error("Product Core did not retain the materialized signal action");
      const updatedInbox = await this.recordSuccess(inbox, conversion.id, action.id);
      return { inbox: updatedInbox, product: updatedProduct, action };
    } catch (error) {
      await this.recordFailure(inbox, conversion.id, error);
      throw error;
    }
  }

  private async recordSuccess(inbox: SignalsInbox, conversionId: string, recordId: string): Promise<SignalsInbox> {
    const now = this.clock().toISOString();
    const updated: SignalsInbox = {
      ...inbox,
      conversions: inbox.conversions.map((conversion) => {
        if (conversion.id !== conversionId) return conversion;
        const { materializationFailure: _failure, ...clean } = conversion;
        return {
          ...clean,
          status: "materialized",
          materialization: { context: "product_core", recordId, materializedAt: now },
        };
      }),
      updatedAt: now,
    };
    await this.signalsStore.save(updated);
    return updated;
  }

  private async recordFailure(inbox: SignalsInbox, conversionId: string, error: unknown): Promise<void> {
    const now = this.clock().toISOString();
    const detail = error instanceof Error ? error.message : "Unknown Product Core materialization failure";
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
