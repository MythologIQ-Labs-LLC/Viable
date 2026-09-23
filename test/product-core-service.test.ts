import assert from "node:assert/strict";
import test from "node:test";
import { ICP_DIMENSIONS, type IcpHypothesis, type IcpRoles } from "../src/product-core/domain/icp.js";
import type { ProductWorkspace } from "../src/product-core/domain/workspace.js";
import type { ProductWorkspaceStore } from "../src/product-core/ports/product-workspace-store.js";
import { ProductCoreService } from "../src/product-core/services/product-core-service.js";

class MemoryWorkspaceStore implements ProductWorkspaceStore {
  value?: ProductWorkspace;
  async save(workspace: ProductWorkspace): Promise<void> { this.value = workspace; }
  async load(workspaceId: string): Promise<ProductWorkspace | undefined> { return this.value?.id === workspaceId ? this.value : undefined; }
}

const roles: IcpRoles = {
  users: ["founder"], economicBuyers: ["founder"], decisionMakers: ["founder"], approvers: [],
  influencers: [], champions: ["product lead"], blockers: ["security reviewer"], partners: [], maintainers: [], contributors: [],
};

const dimensions = Object.fromEntries(ICP_DIMENSIONS.map((dimension) => [dimension, {
  rating: 3 as const,
  rationale: `${dimension} has initial support`,
  evidenceIds: [] as string[],
  confidence: "medium" as const,
}])) as unknown as IcpHypothesis["dimensions"];

const baseIcp = (name: string, evidenceIds: readonly string[] = []): Omit<IcpHypothesis, "id" | "revision" | "history"> => ({
  name, summary: `${name} experiences a costly marketability problem`, status: "candidate", origin: "human", reviewStatus: "reviewed",
  roles, dimensions, disqualifiers: ["No active product"], antiIcpConditions: ["Enterprise procurement required"],
  assumptions: ["Founder owns go-to-market"], contradictions: [], evidenceIds, confidence: "medium", owner: "Kevin R. Knapp",
  lastReviewedAt: "2026-07-15T00:00:00Z", nextValidationAction: "Interview five founders",
  changeConditions: ["Interviews show no urgency"], experiments: [],
});

async function fixture(): Promise<{ service: ProductCoreService; store: MemoryWorkspaceStore; workspace: ProductWorkspace }> {
  const store = new MemoryWorkspaceStore();
  let id = 0;
  const service = new ProductCoreService(store, () => new Date("2026-07-15T00:00:00Z"), () => `id-${++id}`);
  const workspace = await service.createWorkspace({
    identity: { name: "Viable", description: "Local-first marketability operating system", lifecycle: "prototype", supportedEnvironments: ["desktop"] },
    createdBy: "Kevin R. Knapp",
  });
  return { service, store, workspace };
}

test("creates a local product workspace with explicit empty collections", async () => {
  const { workspace } = await fixture();
  assert.equal(workspace.product.revision, 1);
  assert.deepEqual(workspace.icpHypotheses, []);
  assert.deepEqual(workspace.claims, []);
});

test("generated evidence cannot masquerade as reviewed observation", async () => {
  const { service, workspace } = await fixture();
  await assert.rejects(() => service.addEvidence(workspace.id, {
    title: "Suggested segment", summary: "Model output", origin: "generated_suggestion",
    observedAt: "2026-07-15T00:00:00Z", freshnessReviewAt: "2026-08-15T00:00:00Z",
    reviewStatus: "reviewed", confidence: "low",
  }), /cannot be recorded/);
});

test("claims require reviewed non-generated evidence", async () => {
  const { service, store, workspace } = await fixture();
  await service.addEvidence(workspace.id, {
    title: "Founder interview", summary: "Founder verified the workflow", origin: "interview",
    observedAt: "2026-07-15T00:00:00Z", freshnessReviewAt: "2026-08-15T00:00:00Z",
    reviewStatus: "suggested", confidence: "medium",
  });
  const evidenceId = store.value!.evidence[0]!.id;
  await service.addClaim(workspace.id, { statement: "Viable supports founder ICP validation", evidenceIds: [evidenceId], prohibitedContexts: [] });
  const claimId = store.value!.claims[0]!.id;
  await assert.rejects(() => service.approveClaim(workspace.id, claimId, "Kevin R. Knapp"), /reviewed/);
  await service.reviewEvidence(workspace.id, evidenceId, "Kevin R. Knapp", true);
  const approved = await service.approveClaim(workspace.id, claimId, "Kevin R. Knapp");
  assert.equal(approved.claims[0]?.status, "approved");
});

test("generated ICPs remain suggestions until named review", async () => {
  const { service, store, workspace } = await fixture();
  await service.addIcpHypothesis(workspace.id, { ...baseIcp("Suggested ICP"), origin: "generated_suggestion", status: "suggested", reviewStatus: "suggested" });
  const id = store.value!.icpHypotheses[0]!.id;
  await assert.rejects(() => service.selectPrimaryIcp(workspace.id, id, "Kevin R. Knapp", "test"), /reviewed/);
  const reviewed = await service.reviewIcp(workspace.id, id, "Kevin R. Knapp", true);
  assert.equal(reviewed.icpHypotheses[0]?.status, "candidate");
});

test("compares candidates dimension by dimension without a composite score", async () => {
  const { service, store, workspace } = await fixture();
  await service.addIcpHypothesis(workspace.id, baseIcp("Bootstrapped founders"));
  await service.addIcpHypothesis(workspace.id, baseIcp("Open source maintainers"));
  const ids = store.value!.icpHypotheses.map((hypothesis) => hypothesis.id);
  const comparison = service.compareIcps(store.value!, ids);
  assert.equal(comparison.productFit.length, 2);
  assert.equal("score" in comparison, false);
});

test("selecting an ICP requires evidence and preserves revision rationale", async () => {
  const { service, store, workspace } = await fixture();
  await service.addEvidence(workspace.id, {
    title: "Founder interview", summary: "Urgency observed", origin: "interview", observedAt: "2026-07-15T00:00:00Z",
    freshnessReviewAt: "2026-08-15T00:00:00Z", reviewStatus: "reviewed", reviewedBy: "Kevin R. Knapp",
    reviewedAt: "2026-07-15T00:00:00Z", confidence: "high",
  });
  const evidenceId = store.value!.evidence[0]!.id;
  await service.addIcpHypothesis(workspace.id, baseIcp("Bootstrapped founders", [evidenceId]));
  const hypothesisId = store.value!.icpHypotheses[0]!.id;
  const selected = await service.selectPrimaryIcp(workspace.id, hypothesisId, "Kevin R. Knapp", "Strongest urgency and access evidence");
  assert.equal(selected.icpHypotheses[0]?.status, "selected");
  assert.equal(selected.icpHypotheses[0]?.history[0]?.rationale, "Strongest urgency and access evidence");
});

test("product truth changes flag selected ICP review without rewriting it", async () => {
  const { service, store, workspace } = await fixture();
  await service.addEvidence(workspace.id, {
    title: "Interview", summary: "Observed", origin: "interview", observedAt: "2026-07-15T00:00:00Z",
    freshnessReviewAt: "2026-08-15T00:00:00Z", reviewStatus: "reviewed", reviewedBy: "Kevin R. Knapp",
    reviewedAt: "2026-07-15T00:00:00Z", confidence: "high",
  });
  const evidenceId = store.value!.evidence[0]!.id;
  await service.addIcpHypothesis(workspace.id, baseIcp("Founders", [evidenceId]));
  await service.selectPrimaryIcp(workspace.id, store.value!.icpHypotheses[0]!.id, "Kevin R. Knapp", "Evidence supports selection");
  const current = store.value!;
  const updated = await service.updateProductTruth(workspace.id, { ...current.product, updatedBy: "Kevin R. Knapp" });
  assert.equal(updated.icpHypotheses[0]?.status, "selected");
  assert.match(updated.icpHypotheses[0]!.contradictions.at(-1)!, /require review/);
});

test("validation experiments require explicit outcome and decision criteria", async () => {
  const { service, store, workspace } = await fixture();
  await service.addIcpHypothesis(workspace.id, baseIcp("Founders"));
  await assert.rejects(() => service.addExperiment(workspace.id, store.value!.icpHypotheses[0]!.id, {
    id: "experiment-1", hypothesis: "Founders will book interviews", method: "Outreach", owner: "Kevin R. Knapp",
    startsAt: "2026-07-15T00:00:00Z", observationEndsAt: "2026-07-30T00:00:00Z",
    successCriteria: [], failureCriteria: ["No responses"], decisionCriteria: ["Review segment"], status: "planned",
  }), /criteria/);
});

test("marketability findings require explanations and can become owned actions", async () => {
  const { service, store, workspace } = await fixture();
  await service.addEvidence(workspace.id, {
    title: "Interview", summary: "Observed", origin: "interview", observedAt: "2026-07-15T00:00:00Z",
    freshnessReviewAt: "2026-08-15T00:00:00Z", reviewStatus: "reviewed", reviewedBy: "Kevin R. Knapp",
    reviewedAt: "2026-07-15T00:00:00Z", confidence: "high",
  });
  const evidenceId = store.value!.evidence[0]!.id;
  await service.addIcpHypothesis(workspace.id, baseIcp("Founders", [evidenceId]));
  await service.selectPrimaryIcp(workspace.id, store.value!.icpHypotheses[0]!.id, "Kevin R. Knapp", "Evidence supports selection");
  const assessed = await service.recordAssessment(workspace.id, [{
    dimension: "proof", rating: 1, rationale: "Only one reviewed interview", evidenceIds: [evidenceId], confidence: "low",
    freshness: "fresh", owner: "Kevin R. Knapp", verification: "Complete five interviews", recommendation: "Collect four more interviews",
  }]);
  const assessmentId = assessed.assessments[0]!.id;
  const acted = await service.createAction(workspace.id, {
    source: "assessment_gap", sourceId: assessmentId, title: "Complete founder interviews", owner: "Kevin R. Knapp", kind: "icp_experiment",
  });
  assert.equal(acted.actions[0]?.status, "open");
});

test("revising an approved claim invalidates approval and increments revision", async () => {
  const { service, store, workspace } = await fixture();
  await service.addEvidence(workspace.id, {
    title: "Founder interview", summary: "Claim verified", origin: "interview",
    observedAt: "2026-07-15T00:00:00Z", freshnessReviewAt: "2026-08-15T00:00:00Z",
    reviewStatus: "reviewed", reviewedBy: "Kevin R. Knapp", reviewedAt: "2026-07-15T00:00:00Z", confidence: "high",
  });
  const evidenceId = store.value!.evidence[0]!.id;
  await service.addClaim(workspace.id, { statement: "Original claim", evidenceIds: [evidenceId], prohibitedContexts: [] });
  const claimId = store.value!.claims[0]!.id;
  await service.approveClaim(workspace.id, claimId, "Kevin R. Knapp");
  const revised = await service.reviseClaim(workspace.id, claimId, { statement: "Revised claim", evidenceIds: [evidenceId], prohibitedContexts: ["Unverified provider claims"], rationale: "Scope changed" });
  assert.equal(revised.claims[0]?.status, "proposed");
  assert.equal(revised.claims[0]?.revision, 3);
  assert.equal(revised.claims[0]?.reviewedBy, undefined);
  assert.equal(revised.claims[0]?.statement, "Revised claim");
});

test("claim rejection requires and records a named reviewer", async () => {
  const { service, store, workspace } = await fixture();
  await service.addClaim(workspace.id, { statement: "Draft claim", evidenceIds: [], prohibitedContexts: [] });
  const claimId = store.value!.claims[0]!.id;
  await assert.rejects(() => service.rejectClaim(workspace.id, claimId, ""), /named claim reviewer/);
  const rejected = await service.rejectClaim(workspace.id, claimId, "Kevin R. Knapp");
  assert.equal(rejected.claims[0]?.status, "rejected");
  assert.equal(rejected.claims[0]?.reviewedBy, "Kevin R. Knapp");
  assert.equal(rejected.claims[0]?.revision, 2);
});

