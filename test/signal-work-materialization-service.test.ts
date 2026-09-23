import assert from "node:assert/strict";
import test from "node:test";
import type { ProductWorkspace } from "../src/product-core/domain/workspace.js";
import type { ProductWorkspaceStore } from "../src/product-core/ports/product-workspace-store.js";
import { ProductCoreService } from "../src/product-core/services/product-core-service.js";
import type { SignalsInbox } from "../src/signals/domain/signal.js";
import type { SignalSource } from "../src/signals/ports/signal-source.js";
import type { SignalsInboxStore } from "../src/signals/ports/signals-inbox-store.js";
import { SignalsInboxService } from "../src/signals/services/signals-inbox-service.js";
import { SignalWorkMaterializationService } from "../src/signals/services/signal-work-materialization-service.js";

class MemorySignalsStore implements SignalsInboxStore {
  value?: SignalsInbox;
  async load(workspaceId: string): Promise<SignalsInbox | undefined> {
    return this.value?.workspaceId === workspaceId ? this.value : undefined;
  }
  async save(inbox: SignalsInbox): Promise<void> { this.value = inbox; }
}

class MemoryProductStore implements ProductWorkspaceStore {
  value?: ProductWorkspace;
  async load(workspaceId: string): Promise<ProductWorkspace | undefined> {
    return this.value?.id === workspaceId ? this.value : undefined;
  }
  async save(workspace: ProductWorkspace): Promise<void> { this.value = workspace; }
}

const now = "2026-09-23T20:00:00.000Z";
const source: SignalSource = {
  registration: { id: "manual", kind: "manual_import", label: "Manual", configuredAt: now, capability: "manual_only", limitations: [] },
  collect: async () => ({
    source: { id: "manual", kind: "manual_import", label: "Manual", configuredAt: now, capability: "manual_only", limitations: [] },
    status: "success",
    retrievedAt: now,
    signals: [{
      fingerprint: "demand-1",
      sourceId: "manual",
      kind: "manual",
      title: "Observed demand",
      summary: "Founder requested a concrete solution",
      freshnessReviewAt: now,
      confidence: "medium",
      limitations: [],
      facts: {},
      provenance: { provider: "manual_import", sourceId: "manual", retrievedAt: now },
      relationships: [],
      tags: [],
    }],
  }),
};

async function createReviewedConversion(kind: "product_action" | "icp_validation_action" | "product_feedback") {
  const signals = new MemorySignalsStore();
  const products = new MemoryProductStore();
  let sequence = 0;
  const ids = () => `id-${++sequence}`;
  const inboxService = new SignalsInboxService(signals, () => new Date(now), ids);
  const productService = new ProductCoreService(products, () => new Date(now), () => "workspace");
  await productService.createWorkspace({
    identity: { name: "Viable", description: "Local-first marketability operating system", lifecycle: "development", supportedEnvironments: ["desktop"] },
    createdBy: "Kevin",
  });
  await inboxService.collect("workspace", [source]);
  const signalId = signals.value!.signals[0]!.id;
  await inboxService.review("workspace", signalId, "Kevin", true);
  await inboxService.convert("workspace", signalId, { kind, title: `Materialize ${kind}`, owner: "Kevin" });
  return { signals, products, conversionId: signals.value!.conversions[0]!.id };
}

for (const [conversionKind, actionKind] of [
  ["product_action", "action"],
  ["icp_validation_action", "icp_experiment"],
  ["product_feedback", "product_feedback"],
] as const) {
  test(`${conversionKind} materializes into Product Core exactly once`, async () => {
    const { signals, products, conversionId } = await createReviewedConversion(conversionKind);
    const service = new SignalWorkMaterializationService(signals, products, () => new Date(now));
    const first = await service.materializeProductCore("workspace", conversionId);
    const second = await service.materializeProductCore("workspace", conversionId);

    assert.equal(first.action.kind, actionKind);
    assert.equal(first.action.source, "signal");
    assert.equal(first.action.sourceId, conversionId);
    assert.equal(second.action.id, first.action.id);
    assert.equal(products.value!.actions.length, 1);
    assert.equal(signals.value!.conversions[0]!.status, "materialized");
    assert.equal(signals.value!.conversions[0]!.materialization?.recordId, first.action.id);
  });
}

test("Product Core materialization failure remains visible and can be retried", async () => {
  const signals = new MemorySignalsStore();
  const products = new MemoryProductStore();
  let sequence = 0;
  const inboxService = new SignalsInboxService(signals, () => new Date(now), () => `id-${++sequence}`);
  await inboxService.collect("workspace", [source]);
  const signalId = signals.value!.signals[0]!.id;
  await inboxService.review("workspace", signalId, "Kevin", true);
  await inboxService.convert("workspace", signalId, { kind: "product_action", title: "Investigate signal", owner: "Kevin" });
  const conversionId = signals.value!.conversions[0]!.id;
  const materializer = new SignalWorkMaterializationService(signals, products, () => new Date(now));

  await assert.rejects(() => materializer.materializeProductCore("workspace", conversionId), /Product workspace not found/);
  assert.equal(signals.value!.conversions[0]!.status, "materialization_failed");
  assert.match(signals.value!.conversions[0]!.materializationFailure?.detail ?? "", /Product workspace not found/);

  const productService = new ProductCoreService(products, () => new Date(now), () => "workspace");
  await productService.createWorkspace({
    identity: { name: "Viable", description: "Local-first marketability operating system", lifecycle: "development", supportedEnvironments: ["desktop"] },
    createdBy: "Kevin",
  });
  const retried = await materializer.materializeProductCore("workspace", conversionId);
  assert.equal(retried.inbox.conversions[0]!.status, "materialized");
  assert.equal(retried.inbox.conversions[0]!.materializationFailure, undefined);
});

test("destination-specific conversion kinds remain proposed rather than fabricating records", async () => {
  const signals = new MemorySignalsStore();
  const products = new MemoryProductStore();
  const inbox: SignalsInbox = {
    workspaceId: "workspace",
    sources: [], sourceHealth: [], signals: [], updatedAt: now,
    conversions: [{ id: "campaign-conversion", signalId: "signal", kind: "campaign_brief", title: "Campaign", owner: "Kevin", createdAt: now, status: "proposed" }],
  };
  await signals.save(inbox);
  const service = new SignalWorkMaterializationService(signals, products, () => new Date(now));
  await assert.rejects(() => service.materializeProductCore("workspace", "campaign-conversion"), /destination-specific authority input/);
  assert.equal(signals.value!.conversions[0]!.status, "proposed");
});
