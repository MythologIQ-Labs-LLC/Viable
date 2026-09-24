import assert from "node:assert/strict";
import test from "node:test";
import type { CampaignWorkspace } from "../src/campaigns/domain/campaign.js";
import type { CampaignWorkspaceStore } from "../src/campaigns/ports/campaign-workspace-store.js";
import { CampaignService } from "../src/campaigns/services/campaign-service.js";
import type { ProductWorkspace } from "../src/product-core/domain/workspace.js";
import type { ProductWorkspaceStore } from "../src/product-core/ports/product-workspace-store.js";
import { ProductCoreService } from "../src/product-core/services/product-core-service.js";

class MemoryProductStore implements ProductWorkspaceStore {
  value?: ProductWorkspace;
  async load(workspaceId: string): Promise<ProductWorkspace | undefined> { return this.value?.id === workspaceId ? this.value : undefined; }
  async save(workspace: ProductWorkspace): Promise<void> { this.value = workspace; }
}

class MemoryCampaignStore implements CampaignWorkspaceStore {
  value?: CampaignWorkspace;
  async load(workspaceId: string): Promise<CampaignWorkspace | undefined> { return this.value?.workspaceId === workspaceId ? this.value : undefined; }
  async save(workspace: CampaignWorkspace): Promise<void> { this.value = workspace; }
}

const now = "2026-09-24T15:45:00.000Z";

async function fixture() {
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
    title: "Reviewed demand",
    summary: "Users need evidence-backed campaign operations",
    origin: "observed",
    observedAt: now,
    freshnessReviewAt: now,
    reviewStatus: "suggested",
    confidence: "high",
  });
  const evidenceId = updated.evidence[0]!.id;
  await productService.reviewEvidence(product.id, evidenceId, "Kevin", true);
  updated = await productService.addClaim(product.id, {
    statement: "Viable preserves evidence provenance across campaign work",
    evidenceIds: [evidenceId],
    prohibitedContexts: [],
  });
  const claimId = updated.claims[0]!.id;
  await productService.approveClaim(product.id, claimId, "Kevin");

  const service = new CampaignService(campaigns, products, () => new Date(now), nextId);
  let workspace = await service.createBrief(product.id, {
    title: "Governed education",
    objective: "Explain the evidence-to-work journey",
    primaryOutcome: "Qualified product review",
    primaryAudience: "Small product teams",
    audienceKind: "test_audience",
    problem: "Evidence becomes detached from execution",
    trigger: "Reviewed user demand",
    offer: "A local-first governed workflow",
    messageHierarchy: ["Evidence before action"],
    proof: ["Reviewed demand"],
    claimIds: [claimId],
    evidenceIds: [evidenceId],
    callToAction: "Review the workflow",
    channels: ["website"],
    assetPlan: ["Website explainer"],
    owner: "Kevin",
    successMeasures: ["Qualified review"],
    dependencies: [],
  });
  const campaignId = workspace.campaigns[0]!.id;
  await service.submitCampaign(product.id, campaignId);
  await service.reviewCampaign(product.id, campaignId, "Campaign reviewer", "approved", "Source packet verified");
  workspace = await service.createContentBrief(product.id, {
    campaignId,
    title: "Evidence-to-work explainer",
    objective: "Explain governed cross-workflow conversion",
    pillars: ["Evidence before action"],
    themes: ["Governance"],
    deliverables: ["Website explainer"],
    sourceNotes: ["Use the approved campaign packet"],
    owner: "Kevin",
    origin: "human",
  });
  return { service, campaigns, workspaceId: product.id, briefId: workspace.contentBriefs![0]!.id };
}

test("Campaign-owned content brief supports changes requested, resubmission, and named approval", async () => {
  const { service, campaigns, workspaceId, briefId } = await fixture();
  await assert.rejects(() => service.reviewContentBrief(workspaceId, briefId, "Reviewer", "approved", "Too early"), /must be in review/i);

  let workspace = await service.submitContentBrief(workspaceId, briefId);
  assert.equal(workspace.contentBriefs?.[0]?.status, "in_review");
  workspace = await service.reviewContentBrief(workspaceId, briefId, "Reviewer", "changes_requested", "Clarify the evidence boundary");
  assert.equal(workspace.contentBriefs?.[0]?.status, "changes_requested");
  assert.equal(workspace.contentBriefs?.[0]?.reviewedBy, "Reviewer");

  workspace = await service.submitContentBrief(workspaceId, briefId);
  workspace = await service.reviewContentBrief(workspaceId, briefId, "Approver", "approved", "Campaign packet and Product Core references revalidated");
  assert.equal(workspace.contentBriefs?.[0]?.status, "approved");
  assert.equal(workspace.contentBriefs?.[0]?.reviewedBy, "Approver");
  assert.equal(workspace.contentBriefs?.[0]?.reviewNote, "Campaign packet and Product Core references revalidated");
  assert.equal(campaigns.value?.contentBriefs?.length, 1);
});

test("content brief review requires named reviewer and note and does not create downstream authority", async () => {
  const { service, campaigns, workspaceId, briefId } = await fixture();
  await service.submitContentBrief(workspaceId, briefId);
  await assert.rejects(() => service.reviewContentBrief(workspaceId, briefId, "", "approved", "Valid note"), /reviewer/i);
  await assert.rejects(() => service.reviewContentBrief(workspaceId, briefId, "Reviewer", "approved", ""), /note/i);
  await service.reviewContentBrief(workspaceId, briefId, "Reviewer", "rejected", "The brief is not appropriate for this campaign");

  assert.equal(campaigns.value?.contentBriefs?.[0]?.status, "rejected");
  assert.equal(campaigns.value?.assets.length, 0);
  assert.equal(campaigns.value?.variants.length, 0);
  assert.equal(campaigns.value?.exports.length, 0);
});
