import assert from "node:assert/strict";
import test from "node:test";
import type { CampaignWorkspace } from "../src/campaigns/domain/campaign.js";
import type { CampaignWorkspaceStore } from "../src/campaigns/ports/campaign-workspace-store.js";
import { CampaignService } from "../src/campaigns/services/campaign-service.js";
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

const now = "2026-09-23T23:00:00.000Z";
const source: SignalSource = {
  registration: { id: "manual", kind: "manual_import", label: "Manual", configuredAt: now, capability: "manual_only", limitations: [] },
  collect: async () => ({
    source: { id: "manual", kind: "manual_import", label: "Manual", configuredAt: now, capability: "manual_only", limitations: [] },
    status: "success",
    retrievedAt: now,
    signals: [{
      fingerprint: "content-demand",
      sourceId: "manual",
      kind: "manual",
      title: "Observed content opportunity",
      summary: "Founders need a concise evidence-backed explanation of the workflow",
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
  let sequence = 0;
  const nextId = () => `id-${++sequence}`;
  const productService = new ProductCoreService(products, () => new Date(now), nextId);
  const product = await productService.createWorkspace({
    identity: { name: "Viable", description: "Local-first marketability operating system", lifecycle: "prototype", supportedEnvironments: ["desktop"] },
    createdBy: "Kevin",
  });
  let updated = await productService.addEvidence(product.id, {
    title: "Observed demand",
    summary: "Founders asked for governed marketability guidance",
    origin: "observed",
    observedAt: now,
    freshnessReviewAt: now,
    reviewStatus: "suggested",
    confidence: "high",
  });
  const evidenceId = updated.evidence[0]!.id;
  updated = await productService.reviewEvidence(product.id, evidenceId, "Kevin", true);
  updated = await productService.addClaim(product.id, {
    statement: "Viable keeps reviewed evidence attached to downstream work",
    evidenceIds: [evidenceId],
    prohibitedContexts: [],
  });
  const claimId = updated.claims[0]!.id;
  await productService.approveClaim(product.id, claimId, "Kevin");

  const campaignService = new CampaignService(campaigns, products, () => new Date(now), nextId);
  let campaignWorkspace = await campaignService.createBrief(product.id, {
    title: "Founder education",
    objective: "Explain the governed evidence-to-work loop",
    primaryOutcome: "Qualified product exploration",
    primaryAudience: "Small technical product teams",
    audienceKind: "test_audience",
    problem: "Teams lose provenance between research and execution",
    trigger: "Reviewed demand evidence",
    offer: "A local-first governed workflow",
    messageHierarchy: ["Evidence before action"],
    proof: ["Reviewed observed demand"],
    claimIds: [claimId],
    evidenceIds: [evidenceId],
    callToAction: "Review the workflow",
    channels: ["website"],
    assetPlan: ["Educational page"],
    owner: "Kevin",
    successMeasures: ["Qualified product exploration"],
    dependencies: [],
  });
  const campaignId = campaignWorkspace.campaigns[0]!.id;
  campaignWorkspace = await campaignService.submitCampaign(product.id, campaignId);
  campaignWorkspace = await campaignService.reviewCampaign(product.id, campaignId, "Kevin", "approved", "Evidence and audience authority verified");

  const inboxService = new SignalsInboxService(signals, () => new Date(now), nextId);
  await inboxService.collect(product.id, [source]);
  const signalId = signals.value!.signals[0]!.id;
  await inboxService.review(product.id, signalId, "Kevin", true);
  await inboxService.convert(product.id, signalId, { kind: "content_brief", title: "Evidence-to-work explainer", owner: "Kevin" });

  return { signals, products, campaigns, productId: product.id, campaignId, conversionId: signals.value!.conversions[0]!.id };
}

const contentInput = (campaignId: string) => ({
  campaignId,
  objective: "Explain why reviewed evidence should remain attached to downstream work",
  pillars: ["Evidence before action", "Authority remains explicit"],
  themes: ["Governance", "Local-first workflows"],
  deliverables: ["Website explainer", "Reusable source packet"],
  sourceNotes: ["Use only the approved campaign claim and reviewed evidence packet"],
  origin: "human" as const,
});

test("content signal conversion materializes into a Campaign-owned content brief exactly once", async () => {
  const { signals, products, campaigns, productId, campaignId, conversionId } = await fixture();
  const service = new SignalWorkMaterializationService(signals, products, () => new Date(now), campaigns);

  const first = await service.materializeContent(productId, conversionId, contentInput(campaignId));
  const second = await service.materializeContent(productId, conversionId, contentInput(campaignId));

  assert.equal(first.contentBrief.status, "draft");
  assert.equal(first.contentBrief.id, `signal-content-${conversionId}`);
  assert.equal(first.contentBrief.campaignId, campaignId);
  assert.equal(first.contentBrief.audience, "Small technical product teams");
  assert.equal(first.contentBrief.primaryOutcome, "Qualified product exploration");
  assert.equal(first.contentBrief.claimReferences.length, 1);
  assert.equal(first.contentBrief.evidenceIds.length, 1);
  assert.equal(second.contentBrief.id, first.contentBrief.id);
  assert.equal(campaigns.value!.contentBriefs?.length, 1);
  assert.equal(signals.value!.conversions[0]!.status, "materialized");
  assert.equal(signals.value!.conversions[0]!.materialization?.context, "campaigns");
  assert.equal(signals.value!.conversions[0]!.materialization?.recordId, first.contentBrief.id);
});

test("content materialization rejects lost campaign authority and recovers without duplication", async () => {
  const { signals, products, campaigns, productId, campaignId, conversionId } = await fixture();
  const approved = campaigns.value!;
  campaigns.value = {
    ...approved,
    campaigns: approved.campaigns.map((campaign) => campaign.id === campaignId ? { ...campaign, status: "approval_invalidated" as const } : campaign),
  };
  const service = new SignalWorkMaterializationService(signals, products, () => new Date(now), campaigns);

  await assert.rejects(() => service.materializeContent(productId, conversionId, contentInput(campaignId)), /approved campaign/);
  assert.equal(signals.value!.conversions[0]!.status, "materialization_failed");
  assert.match(signals.value!.conversions[0]!.materializationFailure?.detail ?? "", /approved campaign/);

  campaigns.value = approved;
  const retried = await service.materializeContent(productId, conversionId, contentInput(campaignId));
  assert.equal(retried.inbox.conversions[0]!.status, "materialized");
  assert.equal(retried.inbox.conversions[0]!.materializationFailure, undefined);
  assert.equal(campaigns.value!.contentBriefs?.length, 1);
});

test("content authority normalizes a legacy Campaign workspace that has no contentBriefs collection", async () => {
  const { products, campaigns, productId, campaignId } = await fixture();
  const current = campaigns.value!;
  const { contentBriefs: _contentBriefs, ...legacyWorkspace } = current;
  campaigns.value = legacyWorkspace as CampaignWorkspace;

  const service = new CampaignService(campaigns, products, () => new Date(now), () => "legacy-content-brief");
  const updated = await service.createContentBrief(productId, {
    campaignId,
    title: "Legacy workspace content brief",
    objective: "Prove additive content-brief compatibility",
    pillars: ["Backward-compatible authority"],
    themes: ["Migration safety"],
    deliverables: ["Content source packet"],
    sourceNotes: ["Legacy workspace intentionally omitted contentBriefs"],
    owner: "Kevin",
    origin: "human",
  });

  assert.equal(updated.contentBriefs?.length, 1);
  assert.equal(updated.contentBriefs?.[0]?.id, "legacy-content-brief");
  assert.equal(updated.contentBriefs?.[0]?.campaignId, campaignId);
  assert.equal(campaigns.value!.contentBriefs?.length, 1);
});
