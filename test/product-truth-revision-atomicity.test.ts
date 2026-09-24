import assert from "node:assert/strict";
import test from "node:test";
import { ICP_DIMENSIONS, type IcpHypothesis } from "../src/product-core/domain/icp.js";
import type { ProductWorkspace } from "../src/product-core/domain/workspace.js";
import type { ProductWorkspaceStore } from "../src/product-core/ports/product-workspace-store.js";
import { ProductRevisionService } from "../src/product-core/services/product-revision-service.js";

class CountingStore implements ProductWorkspaceStore {
  saves = 0;
  constructor(public value: ProductWorkspace, private readonly fail = false) {}
  async load(workspaceId: string): Promise<ProductWorkspace | undefined> {
    return this.value.id === workspaceId ? this.value : undefined;
  }
  async save(workspace: ProductWorkspace): Promise<void> {
    this.saves += 1;
    if (this.fail) throw new Error("simulated local save failure");
    this.value = workspace;
  }
}

const dimensions = Object.fromEntries(ICP_DIMENSIONS.map((dimension) => [dimension, {
  rating: 3 as const,
  rationale: `${dimension} rationale`,
  evidenceIds: ["evidence-1"],
  confidence: "high" as const,
}])) as unknown as IcpHypothesis["dimensions"];

function workspace(): ProductWorkspace {
  return {
    id: "workspace-1",
    createdAt: "2026-09-24T12:00:00.000Z",
    createdBy: "Kevin",
    product: {
      identity: { name: "Viable", description: "Local-first marketability OS", lifecycle: "prototype", supportedEnvironments: ["desktop"] },
      capabilities: ["Governed planning"], limitations: ["No direct publishing"], positioning: "Evidence-backed operations",
      alternatives: [], differentiation: ["Named review"], pricing: [], packaging: ["Desktop"], offers: [], callsToAction: [],
      brandVoice: ["Direct"], terminology: { ICP: "ideal customer profile" }, accessibilityConstraints: ["Plain language"],
      revision: 2, updatedAt: "2026-09-24T12:00:00.000Z", updatedBy: "Kevin",
    },
    evidence: [], claims: [], assessments: [], actions: [],
    icpHypotheses: [{
      id: "icp-1", name: "Founder operators", summary: "Small teams", status: "selected", origin: "human", reviewStatus: "reviewed",
      roles: { users: ["Founder"], economicBuyers: [], decisionMakers: [], approvers: [], influencers: [], champions: [], blockers: [], partners: [], maintainers: [], contributors: [] },
      dimensions, disqualifiers: ["No active product"], antiIcpConditions: [], assumptions: [], contradictions: [], evidenceIds: ["evidence-1"],
      confidence: "high", owner: "Kevin", lastReviewedAt: "2026-09-24T12:00:00.000Z", nextValidationAction: "Interview founders",
      changeConditions: ["Evidence changes"], experiments: [], revision: 2, history: [],
    }],
  };
}

const revisionInput = (current: ProductWorkspace["product"]) => ({
  identity: { ...current.identity, lifecycle: "private_beta" as const },
  capabilities: current.capabilities,
  limitations: current.limitations,
  positioning: current.positioning,
  alternatives: current.alternatives,
  differentiation: current.differentiation,
  pricing: current.pricing,
  packaging: current.packaging,
  offers: current.offers,
  callsToAction: current.callsToAction,
  brandVoice: current.brandVoice,
  terminology: current.terminology,
  accessibilityConstraints: current.accessibilityConstraints,
  updatedBy: "Kevin",
  rationale: "Pilot lifecycle changed",
});

test("Product Truth correction and selected-ICP review invalidation persist in one workspace save", async () => {
  const store = new CountingStore(workspace());
  const service = new ProductRevisionService(store, () => new Date("2026-09-24T18:30:00.000Z"));

  const updated = await service.reviseProductTruth("workspace-1", revisionInput(store.value.product));

  assert.equal(store.saves, 1);
  assert.equal(updated.product.revision, 3);
  assert.equal(updated.product.history?.length, 1);
  assert.equal(updated.icpHypotheses[0]?.reviewStatus, "suggested");
  assert.match(updated.icpHypotheses[0]?.contradictions.at(-1) ?? "", /Product truth changed to revision 3/);
});

test("a failed Product Truth save cannot leave Product Truth changed while selected-ICP review remains stale", async () => {
  const initial = workspace();
  const store = new CountingStore(initial, true);
  const service = new ProductRevisionService(store, () => new Date("2026-09-24T18:30:00.000Z"));

  await assert.rejects(() => service.reviseProductTruth("workspace-1", revisionInput(initial.product)), /simulated local save failure/);

  assert.equal(store.saves, 1);
  assert.equal(store.value.product.revision, 2);
  assert.equal(store.value.icpHypotheses[0]?.reviewStatus, "reviewed");
  assert.equal(store.value.icpHypotheses[0]?.contradictions.length, 0);
});
