import assert from "node:assert/strict";
import test from "node:test";
import type { CampaignWorkspace, ChannelKind } from "../src/campaigns/domain/campaign.js";
import type { CampaignWorkspaceStore } from "../src/campaigns/ports/campaign-workspace-store.js";
import { CampaignRevisionService } from "../src/campaigns/services/campaign-revision-service.js";
import { CampaignService } from "../src/campaigns/services/campaign-service.js";
import { ICP_DIMENSIONS, type IcpHypothesis, type IcpRoles } from "../src/product-core/domain/icp.js";
import type { ProductWorkspace } from "../src/product-core/domain/workspace.js";
import type { ProductWorkspaceStore } from "../src/product-core/ports/product-workspace-store.js";
import { ProductCoreService } from "../src/product-core/services/product-core-service.js";
import { ProductRevisionService } from "../src/product-core/services/product-revision-service.js";

class MemoryProductStore implements ProductWorkspaceStore {
  constructor(public value: ProductWorkspace) {}
  async load(workspaceId: string): Promise<ProductWorkspace | undefined> { return this.value.id === workspaceId ? this.value : undefined; }
  async save(workspace: ProductWorkspace): Promise<void> { this.value = workspace; }
}

class MemoryCampaignStore implements CampaignWorkspaceStore {
  value?: CampaignWorkspace;
  async load(workspaceId: string): Promise<CampaignWorkspace | undefined> { return this.value?.workspaceId === workspaceId ? this.value : undefined; }
  async save(workspace: CampaignWorkspace): Promise<void> { this.value = workspace; }
}

const now = () => new Date("2026-09-24T18:00:00.000Z");
const roles: IcpRoles = {
  users: ["Founder"], economicBuyers: ["Founder"], decisionMakers: ["Founder"], approvers: ["Founder"],
  influencers: [], champions: ["Product lead"], blockers: [], partners: [], maintainers: [], contributors: [],
};
const dimensions = Object.fromEntries(ICP_DIMENSIONS.map((dimension) => [dimension, {
  rating: 3 as const,
  rationale: `${dimension} supported by reviewed evidence`,
  evidenceIds: ["evidence-1"],
  confidence: "high" as const,
}])) as unknown as IcpHypothesis["dimensions"];

function productWorkspace(): ProductWorkspace {
  return {
    id: "workspace-1",
    createdAt: "2026-09-24T12:00:00.000Z",
    createdBy: "Kevin",
    product: {
      identity: { name: "Viable", description: "Local-first marketability OS", lifecycle: "prototype", supportedEnvironments: ["desktop"] },
      capabilities: ["Evidence-backed planning"], limitations: ["No direct publishing"], positioning: "Governed marketability operations",
      alternatives: ["Spreadsheets"], differentiation: ["Named review"], pricing: ["Pilot pricing TBD"], packaging: ["Desktop"],
      offers: ["Internal pilot"], callsToAction: ["Review the pilot"], brandVoice: ["Direct", "Evidence-led"],
      terminology: { ICP: "ideal customer profile" }, accessibilityConstraints: ["Plain language"],
      revision: 2, updatedAt: "2026-09-24T12:00:00.000Z", updatedBy: "Kevin",
    },
    evidence: [{
      id: "evidence-1", title: "Founder interview", summary: "Governed campaign work is valuable", origin: "interview",
      observedAt: "2026-09-20T12:00:00.000Z", freshnessReviewAt: "2026-10-20T12:00:00.000Z", reviewStatus: "reviewed",
      reviewedBy: "Kevin", reviewedAt: "2026-09-20T12:30:00.000Z", confidence: "high",
    }],
    claims: [{
      id: "claim-1", statement: "Viable preserves named human approval", status: "approved", evidenceIds: ["evidence-1"],
      prohibitedContexts: [], revision: 2, reviewedBy: "Kevin", reviewedAt: "2026-09-20T13:00:00.000Z",
    }],
    icpHypotheses: [{
      id: "icp-1", name: "Founder operators", summary: "Small product teams with direct go-to-market ownership", status: "selected",
      origin: "human", reviewStatus: "reviewed", roles, dimensions, disqualifiers: ["No active product"], antiIcpConditions: ["Enterprise-only procurement"],
      assumptions: ["Founder owns go-to-market"], contradictions: [], evidenceIds: ["evidence-1"], confidence: "high", owner: "Kevin",
      lastReviewedAt: "2026-09-21T12:00:00.000Z", nextValidationAction: "Interview three more founders",
      changeConditions: ["Interviews show no urgency"], experiments: [], revision: 2, history: [],
    }],
    assessments: [], actions: [],
  };
}

function services() {
  const products = new MemoryProductStore(productWorkspace());
  const campaigns = new MemoryCampaignStore();
  let id = 0;
  return {
    products,
    campaigns,
    productCore: new ProductCoreService(products, now, () => `id-${++id}`),
    productRevision: new ProductRevisionService(products, now),
    campaignCore: new CampaignService(campaigns, products, now, () => `campaign-id-${++id}`),
    campaignRevision: new CampaignRevisionService(campaigns, products, now),
  };
}

const campaignInput = {
  title: "Governed launch", objective: "Explain the internal pilot", primaryOutcome: "Qualified pilot review",
  primaryAudience: "Founder operators", audienceKind: "selected_icp" as const, icpHypothesisId: "icp-1",
  problem: "Campaign claims drift", trigger: "Product slice ready", offer: "Internal pilot",
  messageHierarchy: ["Product truth", "Evidence", "Approval"], proof: ["Reviewed founder interview"],
  claimIds: ["claim-1"], evidenceIds: ["evidence-1"], callToAction: "Review the pilot",
  channels: ["linkedin", "website", "github_release"] as readonly ChannelKind[], assetPlan: ["Canonical launch note"],
  owner: "Campaign owner", successMeasures: ["One qualified pilot review"], dependencies: ["Approved product truth"],
};

async function approvedCampaignFixture() {
  const value = services();
  let workspace = await value.campaignCore.createBrief("workspace-1", campaignInput);
  const campaignId = workspace.campaigns[0]!.id;
  await value.campaignCore.submitCampaign("workspace-1", campaignId);
  workspace = await value.campaignCore.reviewCampaign("workspace-1", campaignId, "Campaign reviewer", "approved", "Source packet verified");
  return { ...value, workspace, campaignId };
}

test("Product Truth correction preserves prior authority and exposes all modeled fields", async () => {
  const { products, productRevision } = services();
  const current = products.value.product;
  const updated = await productRevision.reviseProductTruth("workspace-1", {
    identity: { ...current.identity, lifecycle: "private_beta", supportedEnvironments: ["desktop", "Windows"] },
    capabilities: current.capabilities, limitations: current.limitations, positioning: current.positioning,
    alternatives: current.alternatives, differentiation: current.differentiation,
    pricing: ["$49 pilot"], packaging: ["Desktop", "Local workspace"], offers: current.offers, callsToAction: current.callsToAction,
    brandVoice: ["Direct", "Evidence-led", "Calm"], terminology: { ICP: "ideal customer profile", evidence: "reviewed evidence" },
    accessibilityConstraints: ["Plain language", "Keyboard usable"], updatedBy: "Kevin", rationale: "Pilot packaging and accessibility are now explicit",
  });
  assert.equal(updated.product.revision, 3);
  assert.equal(updated.product.identity.lifecycle, "private_beta");
  assert.deepEqual(updated.product.pricing, ["$49 pilot"]);
  assert.deepEqual(updated.product.accessibilityConstraints, ["Plain language", "Keyboard usable"]);
  assert.equal(updated.product.history?.length, 1);
  assert.equal(updated.product.history?.[0]?.revision, 2);
  assert.equal(updated.product.history?.[0]?.changedBy, "Kevin");
  assert.ok(updated.product.history?.[0]?.changedFields.includes("pricing"));
  assert.ok(updated.product.history?.[0]?.changedFields.includes("identity.lifecycle"));
  assert.match(updated.icpHypotheses[0]!.contradictions.at(-1)!, /Product truth changed to revision 3/);
  await assert.rejects(() => productRevision.reviseProductTruth("workspace-1", {
    ...updated.product, updatedBy: "Kevin", rationale: "No actual change",
  }), /Change at least one Product Truth field/);
});

test("selected ICP correction preserves history and requires named review before reselection", async () => {
  const { products, productCore, productRevision } = services();
  const current = products.value.icpHypotheses[0]!;
  let workspace = await productRevision.reviseIcp("workspace-1", current.id, {
    editor: "Kevin", rationale: "Interview evidence narrowed the audience", name: "Bootstrapped founder operators",
    summary: current.summary, roles: current.roles, dimensions: current.dimensions, disqualifiers: current.disqualifiers,
    antiIcpConditions: current.antiIcpConditions, assumptions: current.assumptions, contradictions: current.contradictions,
    evidenceIds: current.evidenceIds, confidence: current.confidence, owner: current.owner,
    nextValidationAction: "Interview three bootstrapped founders", changeConditions: current.changeConditions,
  });
  let revised = workspace.icpHypotheses[0]!;
  assert.equal(revised.status, "candidate");
  assert.equal(revised.reviewStatus, "suggested");
  assert.equal(revised.revision, 3);
  assert.equal(revised.lastReviewedAt, undefined);
  assert.equal(revised.history.length, 1);
  assert.deepEqual(revised.history[0]?.changedFields, ["name", "nextValidationAction"]);
  assert.equal(revised.history[0]?.rationale, "Interview evidence narrowed the audience");
  await assert.rejects(() => productCore.selectPrimaryIcp("workspace-1", revised.id, "Reviewer", "Still strongest"), /reviewed/);
  workspace = await productCore.reviewIcp("workspace-1", revised.id, "Reviewer", true);
  workspace = await productCore.selectPrimaryIcp("workspace-1", revised.id, "Reviewer", "Corrected hypothesis remains strongest");
  revised = workspace.icpHypotheses[0]!;
  assert.equal(revised.status, "selected");
  assert.equal(revised.reviewStatus, "reviewed");
  assert.equal(revised.history.length, 2);
});

test("validation experiments progress through planned, active, completed, and cancelled with retained outcome evidence", async () => {
  const { products, productCore, productRevision } = services();
  await productCore.addExperiment("workspace-1", "icp-1", {
    id: "experiment-1", hypothesis: "Founders will request a demo", method: "Three interviews", owner: "Kevin",
    startsAt: "2026-09-24T12:00:00.000Z", observationEndsAt: "2026-10-01T12:00:00.000Z",
    successCriteria: ["Two request demos"], failureCriteria: ["No demo requests"], decisionCriteria: ["Keep or narrow ICP"], status: "planned",
  });
  await assert.rejects(() => productRevision.completeExperiment("workspace-1", "icp-1", "experiment-1", {
    actor: "Kevin", evidence: ["Interview notes"], summary: "Two requested demos", decision: "Continue",
  }), /Only active/);
  await productRevision.startExperiment("workspace-1", "icp-1", "experiment-1", "Kevin");
  let workspace = await productRevision.completeExperiment("workspace-1", "icp-1", "experiment-1", {
    actor: "Kevin", evidence: ["Interview A", "Interview B"], summary: "Two of three founders requested demos", decision: "Continue validation",
  });
  const completed = workspace.icpHypotheses[0]!.experiments[0]!;
  assert.equal(completed.status, "completed");
  assert.equal(completed.startedBy, "Kevin");
  assert.equal(completed.completedBy, "Kevin");
  assert.deepEqual(completed.outcomeEvidence, ["Interview A", "Interview B"]);
  assert.equal(completed.outcomeDecision, "Continue validation");

  await productCore.addExperiment("workspace-1", "icp-1", {
    id: "experiment-2", hypothesis: "Second test", method: "Outreach", owner: "Kevin",
    startsAt: "2026-09-24T12:00:00.000Z", observationEndsAt: "2026-10-02T12:00:00.000Z",
    successCriteria: ["Response"], failureCriteria: ["No response"], decisionCriteria: ["Reframe"], status: "planned",
  });
  workspace = await productRevision.cancelExperiment("workspace-1", "icp-1", "experiment-2", "Kevin", "Superseded by completed interview evidence");
  const cancelled = workspace.icpHypotheses[0]!.experiments[1]!;
  assert.equal(cancelled.status, "cancelled");
  assert.equal(cancelled.cancelledBy, "Kevin");
  assert.equal(cancelled.cancellationRationale, "Superseded by completed interview evidence");
});

test("campaign changes requested can be corrected in place, resubmitted, and approved with revision history", async () => {
  const { campaigns, campaignCore, campaignRevision } = services();
  let workspace = await campaignCore.createBrief("workspace-1", campaignInput);
  const campaignId = workspace.campaigns[0]!.id;
  await campaignCore.submitCampaign("workspace-1", campaignId);
  await campaignCore.reviewCampaign("workspace-1", campaignId, "Reviewer", "changes_requested", "Clarify the offer");
  workspace = await campaignRevision.reviseCampaign("workspace-1", campaignId, {
    ...campaignInput, editor: "Campaign owner", rationale: "Clarified requested offer scope", offer: "30-day internal pilot",
  });
  let campaign = workspace.campaigns[0]!;
  assert.equal(campaign.status, "draft");
  assert.equal(campaign.version, 2);
  assert.equal(campaign.reviewedBy, undefined);
  assert.equal(campaign.history?.[0]?.rationale, "Clarified requested offer scope");
  assert.deepEqual(campaign.history?.[0]?.changedFields, ["offer"]);
  await campaignCore.submitCampaign("workspace-1", campaignId);
  workspace = await campaignCore.reviewCampaign("workspace-1", campaignId, "Approver", "approved", "Correction satisfies review");
  campaign = workspace.campaigns[0]!;
  assert.equal(campaign.status, "approved");
  assert.equal(campaign.reviewedBy, "Approver");
  assert.equal(campaigns.value?.campaigns.length, 1);
});

test("revising an approved campaign invalidates approved descendant authority without rewriting historical exports", async () => {
  const { campaignCore, campaignRevision, campaignId } = await approvedCampaignFixture();
  let workspace = await campaignCore.createContentBrief("workspace-1", {
    campaignId, title: "Content brief", objective: "Explain the pilot", pillars: ["Evidence"], themes: ["Governance"],
    deliverables: ["Website explainer"], sourceNotes: ["Use approved source packet"], owner: "Writer", origin: "human",
  });
  const briefId = workspace.contentBriefs![0]!.id;
  await campaignCore.submitContentBrief("workspace-1", briefId);
  await campaignCore.reviewContentBrief("workspace-1", briefId, "Content reviewer", "approved", "Approved");
  workspace = await campaignCore.createCanonicalAsset("workspace-1", {
    campaignId, title: "Canonical note", body: "Canonical body", owner: "Writer", origin: "human",
    rights: ["Owned copy"], accessibilityRequirements: ["Plain language"], disclosureRequirements: [],
  });
  const assetId = workspace.assets[0]!.id;
  await campaignCore.submitAsset("workspace-1", assetId);
  await campaignCore.reviewAsset("workspace-1", assetId, "Asset reviewer", "approved", "Approved");
  workspace = await campaignCore.createVariant("workspace-1", assetId, "website", "Website body", ["Preserve meaning"]);
  const variantId = workspace.variants[0]!.id;
  await campaignCore.submitVariant("workspace-1", variantId);
  await campaignCore.reviewVariant("workspace-1", variantId, "Variant reviewer", "approved", "Approved");

  workspace = await campaignRevision.reviseCampaign("workspace-1", campaignId, {
    ...campaignInput, editor: "Campaign owner", rationale: "Primary offer changed", offer: "Refined pilot offer",
  });
  assert.equal(workspace.campaigns[0]!.status, "approval_invalidated");
  assert.equal(workspace.contentBriefs?.[0]?.status, "approval_invalidated");
  assert.equal(workspace.assets[0]!.status, "approval_invalidated");
  assert.equal(workspace.variants[0]!.status, "approval_invalidated");
  assert.deepEqual(workspace.exports, []);
});

test("content brief and channel variant corrections return changed records to valid resubmission paths", async () => {
  const { campaignCore, campaignRevision, campaignId } = await approvedCampaignFixture();
  let workspace = await campaignCore.createContentBrief("workspace-1", {
    campaignId, title: "Draft content", objective: "Explain governance", pillars: ["Evidence"], themes: ["Trust"],
    deliverables: ["Website section"], sourceNotes: ["Approved campaign only"], owner: "Writer", origin: "human",
  });
  const briefId = workspace.contentBriefs![0]!.id;
  await campaignCore.submitContentBrief("workspace-1", briefId);
  await campaignCore.reviewContentBrief("workspace-1", briefId, "Reviewer", "changes_requested", "Tighten the objective");
  workspace = await campaignRevision.reviseContentBrief("workspace-1", briefId, {
    editor: "Writer", rationale: "Applied requested objective correction", title: "Draft content", objective: "Explain named human governance",
    pillars: ["Evidence"], themes: ["Trust"], deliverables: ["Website section"], sourceNotes: ["Approved campaign only"], owner: "Writer",
  });
  assert.equal(workspace.contentBriefs?.[0]?.status, "draft");
  assert.equal(workspace.contentBriefs?.[0]?.version, 2);
  assert.equal(workspace.contentBriefs?.[0]?.history?.[0]?.changedBy, "Writer");
  await campaignCore.submitContentBrief("workspace-1", briefId);
  workspace = await campaignCore.reviewContentBrief("workspace-1", briefId, "Reviewer", "approved", "Corrected");
  assert.equal(workspace.contentBriefs?.[0]?.status, "approved");

  workspace = await campaignCore.createCanonicalAsset("workspace-1", {
    campaignId, title: "Canonical", body: "Canonical meaning", owner: "Writer", origin: "human",
    rights: ["Owned"], accessibilityRequirements: ["Plain language"], disclosureRequirements: [],
  });
  const assetId = workspace.assets[0]!.id;
  await campaignCore.submitAsset("workspace-1", assetId);
  await campaignCore.reviewAsset("workspace-1", assetId, "Asset reviewer", "approved", "Approved");
  workspace = await campaignCore.createVariant("workspace-1", assetId, "linkedin", "Initial LinkedIn copy", ["Keep concise"]);
  const variantId = workspace.variants[0]!.id;
  await campaignCore.submitVariant("workspace-1", variantId);
  await campaignCore.reviewVariant("workspace-1", variantId, "Channel reviewer", "changes_requested", "Clarify the CTA");
  workspace = await campaignRevision.reviseVariant("workspace-1", variantId, {
    editor: "Writer", rationale: "Applied requested CTA correction", body: "Revised LinkedIn copy with explicit review CTA", constraints: ["Keep concise"],
  });
  assert.equal(workspace.variants[0]!.status, "draft");
  assert.equal(workspace.variants[0]!.version, 2);
  assert.equal(workspace.variants[0]!.history?.[0]?.rationale, "Applied requested CTA correction");
  await campaignCore.submitVariant("workspace-1", variantId);
  workspace = await campaignCore.reviewVariant("workspace-1", variantId, "Channel reviewer", "approved", "Corrected");
  assert.equal(workspace.variants[0]!.status, "approved");
});

test("selected ICP correction invalidates approved campaigns that depended on that selected authority", async () => {
  const { products, productRevision, campaignRevision, campaignId } = await approvedCampaignFixture();
  const current = products.value.icpHypotheses[0]!;
  await productRevision.reviseIcp("workspace-1", current.id, {
    editor: "Kevin", rationale: "Audience definition changed", name: "Narrow founder operators", summary: current.summary,
    roles: current.roles, dimensions: current.dimensions, disqualifiers: current.disqualifiers, antiIcpConditions: current.antiIcpConditions,
    assumptions: current.assumptions, contradictions: current.contradictions, evidenceIds: current.evidenceIds, confidence: current.confidence,
    owner: current.owner, nextValidationAction: current.nextValidationAction, changeConditions: current.changeConditions,
  });
  const workspace = await campaignRevision.revalidateProductAuthority("workspace-1");
  assert.equal(workspace.campaigns.find((candidate) => candidate.id === campaignId)?.status, "approval_invalidated");
  assert.match(workspace.campaigns[0]!.reviewNote ?? "", /selected ICP authority changed|Product Core/);
});
