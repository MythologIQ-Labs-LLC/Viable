import assert from "node:assert/strict";
import test from "node:test";
import type { EvidenceRecord } from "../src/product-core/domain/evidence.js";
import type { ProductWorkspace } from "../src/product-core/domain/workspace.js";
import type { ProductWorkspaceStore } from "../src/product-core/ports/product-workspace-store.js";
import { ProductCoreService } from "../src/product-core/services/product-core-service.js";
import { deriveHomeAttention } from "../src/ui/home-attention.js";

const now = new Date("2026-10-07T12:00:00.000Z");

class MemoryWorkspaceStore implements ProductWorkspaceStore {
  value?: ProductWorkspace;
  async save(workspace: ProductWorkspace): Promise<void> { this.value = workspace; }
  async load(workspaceId: string): Promise<ProductWorkspace | undefined> { return this.value?.id === workspaceId ? this.value : undefined; }
}

const evidence = (overrides: Partial<EvidenceRecord>): EvidenceRecord => ({
  id: "evidence-stale", title: "Agency pricing objection notes", summary: "Owners objected to per-seat pricing.",
  origin: "interview", observedAt: "2026-06-01T12:00:00.000Z", freshnessReviewAt: "2026-09-19T12:00:00.000Z",
  reviewStatus: "reviewed", reviewedBy: "Sam Okafor", reviewedAt: "2026-06-02T12:00:00.000Z", confidence: "medium",
  ...overrides,
});

function setup(record: EvidenceRecord = evidence({})): { store: MemoryWorkspaceStore; service: ProductCoreService } {
  const store = new MemoryWorkspaceStore();
  store.value = {
    id: "ws", createdAt: "2026-06-01T12:00:00.000Z", createdBy: "Morgan Reyes",
    product: { revision: 1 } as ProductWorkspace["product"],
    claims: [], evidence: [record], icpHypotheses: [], assessments: [], actions: [],
  };
  return { store, service: new ProductCoreService(store, () => now) };
}

test("stale reviewed evidence is a Home blocker labelled with its freshness-review date", () => {
  const { store } = setup();
  const item = deriveHomeAttention({ product: store.value! }, now).items.find((candidate) => candidate.id === "product:evidence:evidence-stale");
  assert.ok(item, "stale evidence must reach Home");
  assert.equal(item.timestampLabel, "Freshness review due", "a review due date is not the time something was recorded");
});

test("a named recheck that confirms stale evidence keeps it reviewed and clears the Home blocker", async () => {
  const { store, service } = setup();
  const updated = await service.recheckEvidence("ws", "evidence-stale", { reviewer: " Sam Okafor ", stillValid: true, nextFreshnessReviewAt: "2027-04-01T12:00:00.000Z" });
  const record = updated.evidence[0]!;
  assert.equal(record.reviewStatus, "reviewed");
  assert.equal(record.freshnessReviewAt, "2027-04-01T12:00:00.000Z");
  assert.equal(record.reviewedBy, "Sam Okafor");
  assert.equal(record.reviewedAt, now.toISOString());
  assert.equal(record.summary, "Owners objected to per-seat pricing.", "a recheck never rewrites what was observed");
  assert.equal(deriveHomeAttention({ product: store.value! }, now).items.some((item) => item.id === "product:evidence:evidence-stale"), false);
});

test("a recheck that finds evidence no longer valid withdraws it instead of keeping stale authority", async () => {
  const { store, service } = setup();
  const updated = await service.recheckEvidence("ws", "evidence-stale", { reviewer: "Sam Okafor", stillValid: false });
  assert.equal(updated.evidence[0]!.reviewStatus, "rejected");
  assert.equal(updated.evidence[0]!.freshnessReviewAt, "2026-09-19T12:00:00.000Z");
  assert.equal(deriveHomeAttention({ product: store.value! }, now).items.some((item) => item.id === "product:evidence:evidence-stale"), false);
});

test("evidence recheck requires a named reviewer, a future review date, and reviewed non-generated evidence", async () => {
  const { store, service } = setup();
  await assert.rejects(service.recheckEvidence("ws", "evidence-stale", { reviewer: "  ", stillValid: true, nextFreshnessReviewAt: "2027-04-01T12:00:00.000Z" }), /named evidence reviewer/);
  await assert.rejects(service.recheckEvidence("ws", "evidence-stale", { reviewer: "Sam", stillValid: true }), /future/);
  await assert.rejects(service.recheckEvidence("ws", "evidence-stale", { reviewer: "Sam", stillValid: true, nextFreshnessReviewAt: "2026-10-01T12:00:00.000Z" }), /future/);
  await assert.rejects(service.recheckEvidence("ws", "missing", { reviewer: "Sam", stillValid: false }), /not found/);
  assert.equal(store.value!.evidence[0]!.reviewStatus, "reviewed", "a refused recheck changes nothing");
  const suggested = setup(evidence({ reviewStatus: "suggested" }));
  await assert.rejects(suggested.service.recheckEvidence("ws", "evidence-stale", { reviewer: "Sam", stillValid: false }), /review it first/);
  const generated = setup(evidence({ origin: "generated_suggestion" }));
  await assert.rejects(generated.service.recheckEvidence("ws", "evidence-stale", { reviewer: "Sam", stillValid: false }), /review it first/);
});

test("withdrawing evidence returns approved claims that cite it to proposed review and flags ICPs that rely on it", async () => {
  const { store, service } = setup();
  store.value = {
    ...store.value!,
    claims: [
      { id: "claim-cites", statement: "Studios avoid per-seat pricing", evidenceIds: ["evidence-stale"], prohibitedContexts: [], status: "approved", revision: 2, reviewedBy: "Sam Okafor", reviewedAt: "2026-06-03T12:00:00.000Z" },
      { id: "claim-other", statement: "Unrelated", evidenceIds: ["evidence-other"], prohibitedContexts: [], status: "approved", revision: 1, reviewedBy: "Sam Okafor", reviewedAt: "2026-06-03T12:00:00.000Z" },
    ],
    icpHypotheses: [
      { id: "icp-direct", evidenceIds: ["evidence-stale"], contradictions: [], dimensions: {} },
      { id: "icp-dimension", evidenceIds: [], contradictions: [], dimensions: { urgency: { rating: 2, rationale: "r", evidenceIds: ["evidence-stale"], confidence: "medium" } } },
      { id: "icp-unrelated", evidenceIds: ["evidence-other"], contradictions: [], dimensions: {} },
    ] as unknown as ProductWorkspace["icpHypotheses"],
  };
  const updated = await service.recheckEvidence("ws", "evidence-stale", { reviewer: "Sam Okafor", stillValid: false });
  const cites = updated.claims.find((claim) => claim.id === "claim-cites")!;
  assert.equal(cites.status, "proposed");
  assert.equal(cites.revision, 3, "losing approval is a new claim revision");
  assert.equal(cites.reviewedBy, undefined);
  assert.equal(updated.claims.find((claim) => claim.id === "claim-other")!.status, "approved");
  const flagged = (id: string) => updated.icpHypotheses.find((icp) => icp.id === id)!.contradictions.some((note) => note.includes("Agency pricing objection notes"));
  assert.equal(flagged("icp-direct"), true);
  assert.equal(flagged("icp-dimension"), true);
  assert.equal(flagged("icp-unrelated"), false);
});

test("confirming evidence on recheck leaves dependent claims and ICPs unchanged", async () => {
  const { store, service } = setup();
  store.value = { ...store.value!, claims: [{ id: "claim-cites", statement: "s", evidenceIds: ["evidence-stale"], prohibitedContexts: [], status: "approved", revision: 2, reviewedBy: "Sam", reviewedAt: "2026-06-03T12:00:00.000Z" }] };
  const updated = await service.recheckEvidence("ws", "evidence-stale", { reviewer: "Sam", stillValid: true, nextFreshnessReviewAt: "2027-04-01T12:00:00.000Z" });
  assert.equal(updated.claims[0]!.status, "approved");
  assert.equal(updated.claims[0]!.revision, 2);
});
