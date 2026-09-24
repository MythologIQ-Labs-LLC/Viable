import assert from "node:assert/strict";
import test from "node:test";
import { MARKETABILITY_DIMENSIONS } from "../src/product-core/domain/assessment.js";
import type { AssessmentDraft } from "../src/product-core/domain/draft.js";
import { ICP_DIMENSIONS, type IcpHypothesis } from "../src/product-core/domain/icp.js";
import type { ProductWorkspace } from "../src/product-core/domain/workspace.js";
import type { ProductWorkspaceStore } from "../src/product-core/ports/product-workspace-store.js";
import { ProductDraftService } from "../src/product-core/services/product-draft-service.js";

class MemoryStore implements ProductWorkspaceStore {
  constructor(public value: ProductWorkspace) {}
  async load(workspaceId: string): Promise<ProductWorkspace | undefined> { return workspaceId === this.value.id ? this.value : undefined; }
  async save(workspace: ProductWorkspace): Promise<void> { this.value = workspace; }
}

const icpDimensions = Object.fromEntries(ICP_DIMENSIONS.map((dimension) => [dimension, {
  rating: 3 as const, rationale: `${dimension} rationale`, evidenceIds: ["evidence-1"], confidence: "high" as const,
}])) as unknown as IcpHypothesis["dimensions"];

function workspace(): ProductWorkspace {
  return {
    id: "workspace-1", createdAt: "2026-09-24T12:00:00.000Z", createdBy: "Kevin",
    product: {
      identity: { name: "Viable", description: "Local-first marketability OS", lifecycle: "prototype", supportedEnvironments: ["desktop"] },
      capabilities: [], limitations: [], positioning: "", alternatives: [], differentiation: [], pricing: [], packaging: [], offers: [], callsToAction: [], brandVoice: [], terminology: {}, accessibilityConstraints: [],
      revision: 2, updatedAt: "2026-09-24T12:00:00.000Z", updatedBy: "Kevin",
    },
    claims: [],
    evidence: [{
      id: "evidence-1", title: "Interview", summary: "Previously reviewed evidence", origin: "interview", observedAt: "2026-09-20T12:00:00.000Z", freshnessReviewAt: "2026-10-20T12:00:00.000Z",
      reviewStatus: "rejected", reviewedBy: "Kevin", reviewedAt: "2026-09-24T12:00:00.000Z", confidence: "high",
    }],
    icpHypotheses: [{
      id: "icp-1", name: "Founder operators", summary: "Small teams", status: "selected", origin: "human", reviewStatus: "reviewed",
      roles: { users: ["Founder"], economicBuyers: [], decisionMakers: [], approvers: [], influencers: [], champions: [], blockers: [], partners: [], maintainers: [], contributors: [] },
      dimensions: icpDimensions, disqualifiers: ["No active product"], antiIcpConditions: [], assumptions: [], contradictions: [], evidenceIds: ["evidence-1"], confidence: "high", owner: "Kevin",
      lastReviewedAt: "2026-09-23T12:00:00.000Z", nextValidationAction: "Interview founders", changeConditions: ["Evidence changes"], experiments: [], revision: 2, history: [],
    }],
    assessments: [], actions: [],
  };
}

function draft(): Omit<AssessmentDraft, "kind" | "updatedAt"> {
  const findings = Object.fromEntries(MARKETABILITY_DIMENSIONS.map((dimension) => [dimension, {
    dimension, rating: 2 as const, rationale: `${dimension} rationale`, evidenceIds: [], confidence: "medium" as const, freshness: "unknown" as const,
    owner: "Kevin", verification: `Verify ${dimension}`, recommendation: `Improve ${dimension}`,
  }])) as unknown as AssessmentDraft["findings"];
  return { findings };
}

test("assessment draft completion fails when selected ICP evidence is no longer reviewed even if ICP review status is stale-reviewed", async () => {
  const store = new MemoryStore(workspace());
  const service = new ProductDraftService(store, () => new Date("2026-09-24T19:30:00.000Z"), () => "assessment-1");
  await service.saveAssessmentDraft("workspace-1", draft());
  await assert.rejects(() => service.completeAssessmentDraft("workspace-1"), /selected ICP no longer has current reviewed Product Core evidence/);
  assert.equal(store.value.assessments.length, 0);
  assert.equal(store.value.drafts?.assessment?.kind, "assessment");
});
