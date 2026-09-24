import assert from "node:assert/strict";
import test from "node:test";
import { MARKETABILITY_DIMENSIONS } from "../src/product-core/domain/assessment.js";
import type { AssessmentDraft, IcpDraft } from "../src/product-core/domain/draft.js";
import { ICP_DIMENSIONS, type IcpHypothesis, type IcpRoles } from "../src/product-core/domain/icp.js";
import type { ProductWorkspace } from "../src/product-core/domain/workspace.js";
import type { ProductWorkspaceStore } from "../src/product-core/ports/product-workspace-store.js";
import { ProductDraftService } from "../src/product-core/services/product-draft-service.js";

class MemoryStore implements ProductWorkspaceStore {
  saveCount = 0;
  constructor(public value: ProductWorkspace) {}
  async load(workspaceId: string): Promise<ProductWorkspace | undefined> { return this.value.id === workspaceId ? this.value : undefined; }
  async save(workspace: ProductWorkspace): Promise<void> { this.saveCount += 1; this.value = workspace; }
}

const roles: IcpRoles = {
  users: ["Founder"], economicBuyers: ["Founder"], decisionMakers: [], approvers: [], influencers: [], champions: [], blockers: [], partners: [], maintainers: [], contributors: [],
};
const dimensions = Object.fromEntries(ICP_DIMENSIONS.map((dimension) => [dimension, {
  rating: 3 as const, rationale: `${dimension} rationale`, evidenceIds: dimension === "proof" ? ["evidence-1"] : [], confidence: "medium" as const,
}])) as IcpHypothesis["dimensions"];

function workspace(): ProductWorkspace {
  return {
    id: "workspace-1", createdAt: "2026-09-24T12:00:00.000Z", createdBy: "Kevin",
    product: {
      identity: { name: "Viable", description: "Local-first marketability OS", lifecycle: "prototype", supportedEnvironments: ["desktop"] },
      capabilities: ["Governed planning"], limitations: ["No direct publishing"], positioning: "Evidence-backed operations", alternatives: [], differentiation: ["Named review"],
      pricing: [], packaging: ["Desktop"], offers: [], callsToAction: [], brandVoice: ["Direct"], terminology: {}, accessibilityConstraints: ["Plain language"],
      revision: 2, updatedAt: "2026-09-24T12:00:00.000Z", updatedBy: "Kevin",
    },
    evidence: [
      { id: "evidence-1", title: "Interview A", summary: "Founder evidence", origin: "interview", observedAt: "2026-09-20T12:00:00.000Z", freshnessReviewAt: "2026-10-20T12:00:00.000Z", reviewStatus: "reviewed", reviewedBy: "Kevin", reviewedAt: "2026-09-20T13:00:00.000Z", confidence: "high" },
      { id: "evidence-2", title: "Interview B", summary: "Additional context", origin: "interview", observedAt: "2026-09-21T12:00:00.000Z", freshnessReviewAt: "2026-10-21T12:00:00.000Z", reviewStatus: "reviewed", reviewedBy: "Kevin", reviewedAt: "2026-09-21T13:00:00.000Z", confidence: "high" },
      { id: "evidence-unreviewed", title: "Unreviewed note", summary: "Not authority", origin: "interview", observedAt: "2026-09-22T12:00:00.000Z", freshnessReviewAt: "2026-10-22T12:00:00.000Z", reviewStatus: "suggested", confidence: "medium" },
    ],
    claims: [],
    icpHypotheses: [{
      id: "selected-icp", name: "Founder operators", summary: "Small teams", status: "selected", origin: "human", reviewStatus: "reviewed", roles, dimensions,
      disqualifiers: ["No active product"], antiIcpConditions: [], assumptions: [], contradictions: [], evidenceIds: ["evidence-1"], confidence: "high", owner: "Kevin",
      lastReviewedAt: "2026-09-23T12:00:00.000Z", nextValidationAction: "Interview founders", changeConditions: ["Evidence changes"], experiments: [], revision: 2, history: [],
    }],
    assessments: [], actions: [],
  };
}

function completeIcpDraft(overrides: Partial<Omit<IcpDraft, "kind" | "updatedAt">> = {}): Omit<IcpDraft, "kind" | "updatedAt"> {
  return {
    name: "Bootstrapped founder operators", summary: "Founders who own product and go-to-market", owner: "Kevin", origin: "human", roles, dimensions,
    disqualifiers: ["No active product"], antiIcpConditions: [], assumptions: ["Founder owns GTM"], contradictions: [], confidence: "medium",
    nextValidationAction: "Interview three founders", changeConditions: ["No urgency in interviews"], ...overrides,
  };
}

function assessmentDraft(owner = "Kevin"): Omit<AssessmentDraft, "kind" | "updatedAt"> {
  const findings = Object.fromEntries(MARKETABILITY_DIMENSIONS.map((dimension) => [dimension, {
    dimension, rating: 2 as const, rationale: `${dimension} rationale`, evidenceIds: dimension === "proof" ? ["evidence-1"] : [], confidence: "medium" as const,
    freshness: "fresh" as const, owner, verification: `Verify ${dimension}`, recommendation: `Improve ${dimension}`,
  }])) as AssessmentDraft["findings"];
  return { findings };
}

test("incomplete ICP draft persists without becoming ICP authority and remains resumable after failed completion", async () => {
  const store = new MemoryStore(workspace());
  const service = new ProductDraftService(store, () => new Date("2026-09-24T19:00:00.000Z"), () => "new-icp");
  const incomplete = completeIcpDraft({ name: "", dimensions: { ...dimensions, urgency: { ...dimensions.urgency, rationale: "" } } });
  const before = store.value.icpHypotheses.length;
  await service.saveIcpDraft("workspace-1", incomplete);
  assert.equal(store.value.icpHypotheses.length, before);
  assert.equal(store.value.drafts?.icp?.kind, "icp");
  assert.equal(store.value.drafts?.icp?.updatedAt, "2026-09-24T19:00:00.000Z");
  await assert.rejects(() => service.completeIcpDraft("workspace-1"), /ICP name is required/);
  assert.equal(store.value.icpHypotheses.length, before);
  assert.equal(store.value.drafts?.icp?.summary, incomplete.summary);
});

test("completing an ICP draft links only intentionally selected reviewed evidence and clears the draft atomically", async () => {
  const store = new MemoryStore(workspace());
  const service = new ProductDraftService(store, () => new Date("2026-09-24T19:01:00.000Z"), () => "new-icp");
  await service.saveIcpDraft("workspace-1", completeIcpDraft());
  store.saveCount = 0;
  const updated = await service.completeIcpDraft("workspace-1");
  const created = updated.icpHypotheses.find((item) => item.id === "new-icp")!;
  assert.deepEqual(created.evidenceIds, ["evidence-1"]);
  assert.ok(!created.evidenceIds.includes("evidence-2"));
  assert.deepEqual(created.dimensions.proof.evidenceIds, ["evidence-1"]);
  assert.equal(created.reviewStatus, "suggested");
  assert.equal(created.status, "candidate");
  assert.equal(updated.drafts?.icp, undefined);
  assert.equal(store.saveCount, 1);
});

test("draft completion fails closed if a chosen evidence link is no longer reviewed", async () => {
  const store = new MemoryStore(workspace());
  const service = new ProductDraftService(store, () => new Date("2026-09-24T19:02:00.000Z"), () => "new-icp");
  const badDimensions = { ...dimensions, proof: { ...dimensions.proof, evidenceIds: ["evidence-unreviewed"] } };
  await service.saveIcpDraft("workspace-1", completeIcpDraft({ dimensions: badDimensions }));
  await assert.rejects(() => service.completeIcpDraft("workspace-1"), /not currently reviewed non-generated/);
  assert.equal(store.value.drafts?.icp?.dimensions.proof.evidenceIds[0], "evidence-unreviewed");
  assert.ok(!store.value.icpHypotheses.some((item) => item.id === "new-icp"));
});

test("assessment draft is incomplete working state and final assessment preserves per-finding evidence choices", async () => {
  const store = new MemoryStore(workspace());
  const service = new ProductDraftService(store, () => new Date("2026-09-24T19:03:00.000Z"), () => "assessment-1");
  await service.saveAssessmentDraft("workspace-1", assessmentDraft());
  assert.equal(store.value.assessments.length, 0);
  store.saveCount = 0;
  const updated = await service.completeAssessmentDraft("workspace-1");
  assert.equal(updated.assessments.length, 1);
  const assessment = updated.assessments[0]!;
  assert.deepEqual(assessment.findings.find((item) => item.dimension === "proof")?.evidenceIds, ["evidence-1"]);
  assert.deepEqual(assessment.findings.find((item) => item.dimension === "productTruth")?.evidenceIds, []);
  assert.ok(!assessment.findings.some((item) => item.evidenceIds.includes("evidence-2")));
  assert.equal(updated.drafts?.assessment, undefined);
  assert.equal(store.saveCount, 1);
});

test("assessment completion requires a currently reviewed selected ICP while preserving the draft", async () => {
  const value = workspace();
  const store = new MemoryStore({ ...value, icpHypotheses: value.icpHypotheses.map((item) => ({ ...item, reviewStatus: "suggested" as const })) });
  const service = new ProductDraftService(store, () => new Date("2026-09-24T19:04:00.000Z"), () => "assessment-1");
  await service.saveAssessmentDraft("workspace-1", assessmentDraft());
  await assert.rejects(() => service.completeAssessmentDraft("workspace-1"), /currently reviewed selected ICP/);
  assert.equal(store.value.assessments.length, 0);
  assert.equal(store.value.drafts?.assessment?.kind, "assessment");
});
