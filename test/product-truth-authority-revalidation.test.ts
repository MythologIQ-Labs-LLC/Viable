import assert from "node:assert/strict";
import test from "node:test";
import type { CampaignWorkspace } from "../src/campaigns/domain/campaign.js";
import type { CampaignWorkspaceStore } from "../src/campaigns/ports/campaign-workspace-store.js";
import { CampaignRevisionService } from "../src/campaigns/services/campaign-revision-service.js";
import { ICP_DIMENSIONS, type IcpHypothesis } from "../src/product-core/domain/icp.js";
import type { ProductWorkspace } from "../src/product-core/domain/workspace.js";
import type { ProductWorkspaceStore } from "../src/product-core/ports/product-workspace-store.js";
import { ProductRevisionService } from "../src/product-core/services/product-revision-service.js";

class ProductStore implements ProductWorkspaceStore {
  constructor(public value: ProductWorkspace) {}
  async load(): Promise<ProductWorkspace | undefined> { return this.value; }
  async save(workspace: ProductWorkspace): Promise<void> { this.value = workspace; }
}
class CampaignStore implements CampaignWorkspaceStore {
  constructor(public value: CampaignWorkspace) {}
  async load(): Promise<CampaignWorkspace | undefined> { return this.value; }
  async save(workspace: CampaignWorkspace): Promise<void> { this.value = workspace; }
}

const dimensionValues = Object.fromEntries(ICP_DIMENSIONS.map((dimension) => [dimension, {
  rating: 3 as const, rationale: "Reviewed evidence", evidenceIds: ["evidence-1"], confidence: "high" as const,
}])) as unknown as IcpHypothesis["dimensions"];

const product: ProductWorkspace = {
  id: "workspace-1", createdAt: "2026-09-24T12:00:00.000Z", createdBy: "Kevin",
  product: {
    identity: { name: "Viable", description: "Marketability OS", lifecycle: "prototype", supportedEnvironments: ["desktop"] },
    capabilities: ["Governed workflows"], limitations: ["No publishing"], positioning: "Local-first",
    alternatives: [], differentiation: ["Named review"], pricing: [], packaging: ["Desktop"], offers: ["Pilot"], callsToAction: ["Review"],
    brandVoice: ["Direct"], terminology: {}, accessibilityConstraints: ["Plain language"], revision: 1,
    updatedAt: "2026-09-24T12:00:00.000Z", updatedBy: "Kevin",
  },
  evidence: [{ id: "evidence-1", title: "Interview", summary: "Observed", origin: "interview", observedAt: "2026-09-20T12:00:00.000Z", freshnessReviewAt: "2026-10-20T12:00:00.000Z", reviewStatus: "reviewed", reviewedBy: "Kevin", reviewedAt: "2026-09-20T13:00:00.000Z", confidence: "high" }],
  claims: [{ id: "claim-1", statement: "Named review is preserved", status: "approved", evidenceIds: ["evidence-1"], prohibitedContexts: [], revision: 1, reviewedBy: "Kevin", reviewedAt: "2026-09-20T13:00:00.000Z" }],
  icpHypotheses: [{
    id: "icp-1", name: "Founder operators", summary: "Founders", status: "selected", origin: "human", reviewStatus: "reviewed",
    roles: { users: ["Founder"], economicBuyers: ["Founder"], decisionMakers: ["Founder"], approvers: [], influencers: [], champions: [], blockers: [], partners: [], maintainers: [], contributors: [] },
    dimensions: dimensionValues, disqualifiers: ["No product"], antiIcpConditions: [], assumptions: [], contradictions: [], evidenceIds: ["evidence-1"], confidence: "high",
    owner: "Kevin", lastReviewedAt: "2026-09-20T13:00:00.000Z", nextValidationAction: "Interview more founders", changeConditions: ["No urgency"], experiments: [], revision: 1, history: [],
  }],
  assessments: [], actions: [],
};

const campaigns: CampaignWorkspace = {
  workspaceId: "workspace-1", updatedAt: "2026-09-24T13:00:00.000Z", contentBriefs: [], assets: [], variants: [], exports: [],
  campaigns: [{
    id: "campaign-1", workspaceId: "workspace-1", title: "Launch", objective: "Explain pilot", primaryOutcome: "Review", primaryAudience: "Founder operators",
    audienceKind: "selected_icp", icpHypothesisId: "icp-1", problem: "Drift", trigger: "Pilot ready", offer: "Pilot", messageHierarchy: ["Truth"], proof: ["Interview"],
    claimReferences: [{ claimId: "claim-1", claimRevision: 1, statement: "Named review is preserved", evidenceIds: ["evidence-1"] }], evidenceIds: ["evidence-1"],
    callToAction: "Review", channels: ["website"], assetPlan: ["Page"], owner: "Kevin", successMeasures: ["One review"], dependencies: [], version: 1,
    status: "approved", createdAt: "2026-09-24T12:30:00.000Z", updatedAt: "2026-09-24T13:00:00.000Z", reviewedBy: "Reviewer", reviewedAt: "2026-09-24T13:00:00.000Z", reviewNote: "Approved",
  }],
};

test("Product Truth correction invalidates selected ICP review and dependent campaign approval", async () => {
  const productStore = new ProductStore(product);
  const campaignStore = new CampaignStore(campaigns);
  const productRevision = new ProductRevisionService(productStore, () => new Date("2026-09-24T18:00:00.000Z"));
  const campaignRevision = new CampaignRevisionService(campaignStore, productStore, () => new Date("2026-09-24T18:00:00.000Z"));

  const revised = await productRevision.reviseProductTruth("workspace-1", {
    identity: { ...product.product.identity, lifecycle: "private_beta" }, capabilities: product.product.capabilities, limitations: product.product.limitations,
    positioning: product.product.positioning, alternatives: product.product.alternatives, differentiation: product.product.differentiation,
    pricing: product.product.pricing, packaging: product.product.packaging, offers: product.product.offers, callsToAction: product.product.callsToAction,
    brandVoice: product.product.brandVoice, terminology: product.product.terminology, accessibilityConstraints: product.product.accessibilityConstraints,
    updatedBy: "Kevin", rationale: "Product lifecycle advanced",
  });
  assert.equal(revised.icpHypotheses[0]?.status, "selected");
  assert.equal(revised.icpHypotheses[0]?.reviewStatus, "suggested");
  assert.match(revised.icpHypotheses[0]?.contradictions.at(-1) ?? "", /require review/);

  const revalidated = await campaignRevision.revalidateProductAuthority("workspace-1");
  assert.equal(revalidated.campaigns[0]?.status, "approval_invalidated");
  assert.match(revalidated.campaigns[0]?.reviewNote ?? "", /selected ICP authority changed|Product Core/);
});
