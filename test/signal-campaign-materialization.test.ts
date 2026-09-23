import assert from "node:assert/strict";
import test from "node:test";
import type { CampaignWorkspace } from "../src/campaigns/domain/campaign.js";
import type { CampaignWorkspaceStore } from "../src/campaigns/ports/campaign-workspace-store.js";
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

class MemoryCampaignStore implements CampaignWorkspaceStore {
  value?: CampaignWorkspace;
  async load(workspaceId: string): Promise<CampaignWorkspace | undefined> {
    return this.value?.workspaceId === workspaceId ? this.value : undefined;
  }
  async save(workspace: CampaignWorkspace): Promise<void> { this.value = workspace; }
}

const now = "2026-09-23T22:00:00.000Z";
const source: SignalSource = {
  registration: { id: "manual", kind: "manual_import", label: "Manual", configuredAt: now, capability: "manual_only", limitations: [] },
  collect: async () => ({
    source: { id: "manual", kind: "manual_import", label: "Manual", configuredAt: now, capability: "manual_only", limitations: [] },
    status: "success",
    retrievedAt: now,
    signals: [{
      fingerprint: "campaign-demand",
      sourceId: "manual",
      kind: "manual",
      title: "Observed campaign opportunity",
      summary: "A reviewed market signal suggests a focused campaign test",
      freshnessReviewAt: now,
      confidence: "high",
      limitations: [],
      facts: {},
      provenance: { provider: "manual_import", sourceId: "manual", retrievedAt: now },
      relationships: [],
      tags: [],
    }],
  }),
};

async function fixture() {
  const signals = new MemorySignalsStore();
  const products = new MemoryProductStore();
  const campaigns = new MemoryCampaignStore();
  let id = 0;
  const nextId = () => `id-${++id}`;
  const productService = new ProductCoreService(products, () => new Date(now), nextId);
  await productService.createWorkspace({
    identity: { name: "Viable", description: "Local-first marketability operating system", lifecycle: "prototype", supportedEnvironments: ["desktop"] },
    createdBy: "Kevin",
  });
  await productService.addEvidence("id-1", {
    title: "Observed demand",
    summary: "Founders asked for a governed marketability workflow",
    origin: "observed",
    observedAt: now,
    freshnessReviewAt: now,
    reviewStatus: "suggested",
    confidence: "high",
  });
  await productService.reviewEvidence("id-1", "id-2", "Kevin", true);
  await productService.addClaim("id-1", {
    statement: "Viable keeps product truth authoritative across marketability work",
    evidenceIds: ["id-2"],
    prohibitedContexts: [],
  });
  await productService.approveClaim("id-1", "id-3", "Kevin");

  const inboxService = new SignalsInboxService(signals, () => new Date(now), nextId);
  await inboxService.collect("id-1", [source]);
  const signalId = signals.value!.signals[0]!.id;
  await inboxService.review("id-1", signalId, "Kevin", true);
  await inboxService.convert("id-1", signalId, { kind: "campaign_brief", title: "Focused founder campaign", owner: "Kevin" });

  return { signals, products, campaigns, conversionId: signals.value!.conversions[0]!.id };
}

const campaignInput = {
  objective: "Test whether governed marketability messaging creates qualified interest",
  primaryOutcome: "Qualified founder conversations",
  primaryAudience: "Small technical product teams",
  audienceKind: "test_audience" as const,
  problem: "Teams have fragmented product and market evidence",
  trigger: "A reviewed signal indicates active demand",
  offer: "A local-first governed marketability workflow",
  messageHierarchy: ["Keep product truth authoritative", "Turn reviewed evidence into governed work"],
  proof: ["Reviewed observed demand"],
  claimIds: ["id-3"],
  evidenceIds: ["id-2"],
  callToAction: "Review the product workflow",
  channels: ["website" as const],
  assetPlan: ["Landing-page message test"],
  successMeasures: ["Qualified founder conversations"],
  dependencies: [],
};

test("campaign signal conversion materializes through Campaign authority exactly once", async () => {
  const { signals, products, campaigns, conversionId } = await fixture();
  const service = new SignalWorkMaterializationService(signals, products, () => new Date(now), campaigns);

  const first = await service.materializeCampaign("id-1", conversionId, campaignInput);
  const second = await service.materializeCampaign("id-1", conversionId, campaignInput);

  assert.equal(first.campaign.status, "draft");
  assert.equal(first.campaign.id, `signal-campaign-${conversionId}`);
  assert.equal(first.campaign.claimReferences[0]?.claimId, "id-3");
  assert.equal(first.campaign.evidenceIds[0], "id-2");
  assert.equal(second.campaign.id, first.campaign.id);
  assert.equal(campaigns.value!.campaigns.length, 1);
  assert.equal(signals.value!.conversions[0]!.status, "materialized");
  assert.equal(signals.value!.conversions[0]!.materialization?.context, "campaigns");
  assert.equal(signals.value!.conversions[0]!.materialization?.recordId, first.campaign.id);
});

test("campaign authority rejection remains visible and retryable", async () => {
  const { signals, products, campaigns, conversionId } = await fixture();
  const service = new SignalWorkMaterializationService(signals, products, () => new Date(now), campaigns);

  await assert.rejects(() => service.materializeCampaign("id-1", conversionId, {
    ...campaignInput,
    claimIds: ["missing-claim"],
  }), /approved in Product Core/);
  assert.equal(signals.value!.conversions[0]!.status, "materialization_failed");
  assert.match(signals.value!.conversions[0]!.materializationFailure?.detail ?? "", /approved in Product Core/);

  const retried = await service.materializeCampaign("id-1", conversionId, campaignInput);
  assert.equal(retried.inbox.conversions[0]!.status, "materialized");
  assert.equal(retried.inbox.conversions[0]!.materializationFailure, undefined);
  assert.equal(campaigns.value!.campaigns.length, 1);
});
