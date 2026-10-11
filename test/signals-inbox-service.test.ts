import assert from "node:assert/strict";
import test from "node:test";
import type { MarketScope, SignalRecord, SignalsInbox } from "../src/signals/domain/signal.js";
import type { SignalSource } from "../src/signals/ports/signal-source.js";
import type { SignalsInboxStore } from "../src/signals/ports/signals-inbox-store.js";
import { assessMarketHypothesis, SignalsInboxService } from "../src/signals/services/signals-inbox-service.js";

class MemoryStore implements SignalsInboxStore {
  value?: SignalsInbox;
  async load(workspaceId: string): Promise<SignalsInbox | undefined> {
    return this.value?.workspaceId === workspaceId ? this.value : undefined;
  }
  async save(inbox: SignalsInbox): Promise<void> { this.value = inbox; }
}

const now = "2026-07-16T00:00:00.000Z";
const registration = (id: string) => ({ id, kind: "manual_import" as const, label: id, configuredAt: now, capability: "manual_only" as const, limitations: [] });
const candidate = (sourceId: string, fingerprint = "one") => ({
  fingerprint, sourceId, kind: "manual" as const, title: "Observed demand", summary: "Founder requested a concrete solution",
  freshnessReviewAt: now, confidence: "medium" as const, limitations: [], facts: {},
  provenance: { provider: "manual_import" as const, sourceId, retrievedAt: now },
  relationships: [], tags: [],
});

const scope = (overrides: Partial<MarketScope> = {}): MarketScope => ({
  breadth: "bounded",
  geographies: ["United States"],
  segments: ["small agencies"],
  productCategories: ["marketability software"],
  organizationTypes: ["agency"],
  audiences: ["founders"],
  ...overrides,
});

type SignalCandidate = Omit<SignalRecord, "id" | "workspaceId" | "status" | "evidenceState">;

const scopedCandidate = (
  sourceId: string,
  fingerprint: string,
  overrides: Partial<SignalCandidate> = {},
): SignalCandidate => ({
  ...candidate(sourceId, fingerprint),
  observedAt: "2026-07-15T12:00:00.000Z",
  freshnessReviewAt: "2026-08-16T00:00:00.000Z",
  marketScope: scope(),
  methodology: "Structured founder interview",
  provenance: {
    provider: "manual_import" as const,
    sourceId,
    retrievedAt: now,
    publisher: "Research notebook",
    reuseRights: "citation_only" as const,
  },
  ...overrides,
});

async function reviewedSignalsFixture(
  records: readonly ReturnType<typeof scopedCandidate>[],
): Promise<Readonly<{ store: MemoryStore; service: SignalsInboxService; signalIds: readonly string[] }>> {
  const store = new MemoryStore();
  let sequence = 0;
  const service = new SignalsInboxService(store, () => new Date(now), () => `id-${++sequence}`);
  const source: SignalSource = {
    registration: registration("market"),
    collect: async () => ({
      source: registration("market"),
      status: "success",
      signals: records,
      retrievedAt: now,
    }),
  };
  let inbox = await service.collect("workspace", [source]);
  for (const signal of inbox.signals) inbox = await service.review("workspace", signal.id, "Research reviewer", true);
  return { store, service, signalIds: inbox.signals.map((signal) => signal.id) };
}

test("successful evidence survives another source failure and failure never becomes empty success", async () => {
  const store = new MemoryStore();
  const service = new SignalsInboxService(store, () => new Date(now), (() => { let id = 0; return () => `id-${++id}`; })());
  const good: SignalSource = { registration: registration("good"), collect: async () => ({ source: registration("good"), status: "success", signals: [candidate("good")], retrievedAt: now }) };
  const failed: SignalSource = { registration: registration("failed"), collect: async () => ({ source: registration("failed"), status: "transport_failed", signals: [], retrievedAt: now, detail: "offline" }) };
  const inbox = await service.collect("workspace", [good, failed]);
  assert.equal(inbox.signals.length, 1);
  assert.equal(inbox.sourceHealth.find((health) => health.sourceId === "failed")?.status, "transport_failed");
  assert.notEqual(inbox.sourceHealth.find((health) => health.sourceId === "failed")?.status, "verified_empty");
});

test("collection deduplicates by fingerprint without erasing review state", async () => {
  const store = new MemoryStore();
  const service = new SignalsInboxService(store, () => new Date(now), () => "signal");
  const source: SignalSource = { registration: registration("manual"), collect: async () => ({ source: registration("manual"), status: "success", signals: [candidate("manual")], retrievedAt: now }) };
  await service.collect("workspace", [source]);
  await service.review("workspace", "signal", "Kevin R. Knapp", true);
  const repeated = await service.collect("workspace", [source]);
  assert.equal(repeated.signals.length, 1);
  assert.equal(repeated.signals[0]?.evidenceState, "reviewed");
});

test("only reviewed signals can convert into named proposed work", async () => {
  const store = new MemoryStore();
  const ids = ["signal", "conversion"];
  const service = new SignalsInboxService(store, () => new Date(now), () => ids.shift() ?? "later");
  const source: SignalSource = { registration: registration("manual"), collect: async () => ({ source: registration("manual"), status: "success", signals: [candidate("manual")], retrievedAt: now }) };
  await service.collect("workspace", [source]);
  await assert.rejects(() => service.convert("workspace", "signal", { kind: "product_feedback", title: "Investigate", owner: "Kevin" }), /reviewed/);
  await service.review("workspace", "signal", "Kevin", true);
  const converted = await service.convert("workspace", "signal", { kind: "product_feedback", title: "Investigate", owner: "Kevin" });
  assert.equal(converted.conversions[0]?.status, "proposed");
  assert.equal(converted.signals[0]?.status, "converted");
});

test("narrow reviewed evidence cannot silently support a broad market hypothesis", async () => {
  const { store, service, signalIds } = await reviewedSignalsFixture([
    scopedCandidate("market", "narrow"),
  ]);
  let inbox = await service.createMarketHypothesis("workspace", {
    statement: "All global enterprise software teams urgently need this product",
    scope: scope({
      breadth: "broad",
      geographies: ["Global"],
      segments: ["enterprise software"],
      organizationTypes: ["enterprise"],
    }),
    methodology: "Compare reviewed market observations",
    limitations: ["One bounded source"],
    owner: "Market lead",
    nextValidationAction: "Collect enterprise evidence in additional geographies",
  });
  const hypothesisId = inbox.marketHypotheses![0]!.id;
  inbox = await service.linkMarketHypothesisEvidence("workspace", hypothesisId, {
    signalId: signalIds[0]!,
    relation: "supporting",
    rationale: "The source reports demand, but only in a narrow agency scope",
  });
  assert.equal(inbox.marketHypotheses![0]!.evidenceLinks[0]!.applicability, "out_of_scope");
  inbox = await service.submitMarketHypothesis("workspace", hypothesisId);
  await assert.rejects(
    service.reviewMarketHypothesis("workspace", hypothesisId, {
      reviewer: "Market reviewer",
      outcome: "reviewed",
      note: "Attempt to generalize",
    }),
    /matching supporting observation/,
  );
  assert.equal(store.value!.marketHypotheses![0]!.status, "in_review");
});

test("supporting and contradictory observations remain symmetric and force a disputed review", async () => {
  const { store, service, signalIds } = await reviewedSignalsFixture([
    scopedCandidate("market", "support"),
    scopedCandidate("market", "counter", {
      title: "Observed rejection",
      summary: "Founder rejected the proposed workflow",
    }),
  ]);
  let inbox = await service.createMarketHypothesis("workspace", {
    statement: "Small US agencies show demand for governed marketability workflows",
    scope: scope(),
    methodology: "Compare reviewed founder interviews",
    limitations: ["Small local sample"],
    owner: "Market lead",
    nextValidationAction: "Interview additional agencies",
  });
  const id = inbox.marketHypotheses![0]!.id;
  inbox = await service.linkMarketHypothesisEvidence("workspace", id, {
    signalId: signalIds[0]!, relation: "supporting", rationale: "Explicit demand signal",
  });
  inbox = await service.linkMarketHypothesisEvidence("workspace", id, {
    signalId: signalIds[1]!, relation: "contradictory", rationale: "Explicit rejection signal",
  });
  assert.deepEqual(
    inbox.marketHypotheses![0]!.evidenceLinks.map((link) => link.relation).sort(),
    ["contradictory", "supporting"],
  );
  inbox = await service.submitMarketHypothesis("workspace", id);
  await assert.rejects(
    service.reviewMarketHypothesis("workspace", id, {
      reviewer: "Market reviewer", outcome: "reviewed", note: "Ignore counterevidence",
    }),
    /contradictory evidence/,
  );
  inbox = await service.reviewMarketHypothesis("workspace", id, {
    reviewer: "Market reviewer", outcome: "disputed", note: "Both directions are materially supported",
  });
  assert.equal(inbox.marketHypotheses![0]!.status, "disputed");
  assert.equal(inbox.marketHypotheses![0]!.reviewHistory?.length, 1);
});

test("future-dated market evidence fails closed", async () => {
  const { service, signalIds } = await reviewedSignalsFixture([
    scopedCandidate("market", "future", {
      observedAt: "2026-07-17T00:00:00.000Z",
    }),
  ]);
  const inbox = await service.createMarketHypothesis("workspace", {
    statement: "Small agencies show demand",
    scope: scope(),
    methodology: "Reviewed observations",
    limitations: [],
    owner: "Market lead",
    nextValidationAction: "Collect more evidence",
  });
  await assert.rejects(
    service.linkMarketHypothesisEvidence("workspace", inbox.marketHypotheses![0]!.id, {
      signalId: signalIds[0]!, relation: "supporting", rationale: "Future observation should be unusable",
    }),
    /future-dated/,
  );
});

test("missing reuse rights remain explicit without deleting factual evidence", async () => {
  const { service, signalIds } = await reviewedSignalsFixture([
    scopedCandidate("market", "rights", {
      provenance: { provider: "manual_import" as const, sourceId: "market", retrievedAt: now, publisher: "External analyst" },
    }),
  ]);
  let inbox = await service.createMarketHypothesis("workspace", {
    statement: "Small US agencies show demand for governed workflows",
    scope: scope(),
    methodology: "Reviewed observations",
    limitations: ["Quotation rights not yet established"],
    owner: "Market lead",
    nextValidationAction: "Confirm source reuse terms",
  });
  const id = inbox.marketHypotheses![0]!.id;
  inbox = await service.linkMarketHypothesisEvidence("workspace", id, {
    signalId: signalIds[0]!, relation: "supporting", rationale: "Factual evidence retained independently of quotation rights",
  });
  assert.equal(inbox.marketHypotheses![0]!.evidenceLinks[0]!.reuseRights, "unknown");
  const assessment = assessMarketHypothesis(inbox, inbox.marketHypotheses![0]!, () => new Date(now));
  assert.equal(assessment.unknownReuseRights, 1);
  assert.equal(assessment.supportingMatching, 1);
});

test("re-reviewing linked evidence makes prior hypothesis review stale", async () => {
  const { service, signalIds } = await reviewedSignalsFixture([
    scopedCandidate("market", "stale"),
  ]);
  let inbox = await service.createMarketHypothesis("workspace", {
    statement: "Small US agencies show demand for governed workflows",
    scope: scope(),
    methodology: "Reviewed observations",
    limitations: [],
    owner: "Market lead",
    nextValidationAction: "Repeat interviews next month",
  });
  const id = inbox.marketHypotheses![0]!.id;
  inbox = await service.linkMarketHypothesisEvidence("workspace", id, {
    signalId: signalIds[0]!, relation: "supporting", rationale: "Reviewed matching observation",
  });
  inbox = await service.submitMarketHypothesis("workspace", id);
  inbox = await service.reviewMarketHypothesis("workspace", id, {
    reviewer: "Market reviewer", outcome: "reviewed", note: "Bounded claim follows from reviewed evidence",
  });
  assert.equal(inbox.marketHypotheses![0]!.status, "reviewed");

  inbox = await service.review("workspace", signalIds[0]!, "Second source reviewer", true);
  assert.equal(inbox.marketHypotheses![0]!.status, "stale");
  const assessment = assessMarketHypothesis(inbox, inbox.marketHypotheses![0]!, () => new Date(now));
  assert.ok(assessment.staleReasons.some((reason) => /invalidated|review changed/.test(reason)));
  await assert.rejects(
    service.convertMarketHypothesis("workspace", id, {
      kind: "icp_validation_action", title: "Validate agency demand", owner: "Researcher",
    }),
    /reviewed or explicitly disputed|Stale/,
  );

  inbox = await service.linkMarketHypothesisEvidence("workspace", id, {
    signalId: signalIds[0]!,
    relation: "supporting",
    rationale: "Re-attest the same source after its second named review",
  });
  assert.equal(inbox.marketHypotheses![0]!.status, "proposed");
  inbox = await service.submitMarketHypothesis("workspace", id);
  inbox = await service.reviewMarketHypothesis("workspace", id, {
    reviewer: "Second market reviewer",
    outcome: "reviewed",
    note: "Re-attested source remains in scope after the source review changed",
  });
  assert.equal(inbox.marketHypotheses![0]!.status, "reviewed");
  assert.equal(inbox.marketHypotheses![0]!.reviewHistory?.length, 2);
});

test("reviewed hypothesis conversion preserves hypothesis provenance and does not mutate signal review", async () => {
  const { service, signalIds } = await reviewedSignalsFixture([
    scopedCandidate("market", "convert"),
  ]);
  let inbox = await service.createMarketHypothesis("workspace", {
    statement: "Small US agencies show demand for governed workflows",
    scope: scope(),
    methodology: "Reviewed observations",
    limitations: [],
    owner: "Market lead",
    nextValidationAction: "Run an ICP validation experiment",
  });
  const id = inbox.marketHypotheses![0]!.id;
  inbox = await service.linkMarketHypothesisEvidence("workspace", id, {
    signalId: signalIds[0]!, relation: "supporting", rationale: "Matching reviewed demand observation",
  });
  inbox = await service.submitMarketHypothesis("workspace", id);
  inbox = await service.reviewMarketHypothesis("workspace", id, {
    reviewer: "Market reviewer", outcome: "reviewed", note: "Bounded hypothesis is supported",
  });
  const signalStatus = inbox.signals[0]!.status;
  inbox = await service.convertMarketHypothesis("workspace", id, {
    kind: "icp_validation_action",
    title: "Validate agency segment demand",
    owner: "Researcher",
  });
  assert.equal(inbox.conversions[0]!.hypothesisId, id);
  assert.equal(inbox.conversions[0]!.signalId, signalIds[0]);
  assert.equal(inbox.conversions[0]!.status, "proposed");
  assert.equal(inbox.signals[0]!.status, signalStatus);
  assert.equal(inbox.marketHypotheses![0]!.status, "reviewed");
});

test("absence of evidence does not create contradictory evidence", async () => {
  const store = new MemoryStore();
  const service = new SignalsInboxService(store, () => new Date(now), () => "hypothesis");
  const inbox = await service.createMarketHypothesis("workspace", {
    statement: "Demand may exist",
    scope: scope(),
    methodology: "No evidence collected yet",
    limitations: ["No reviewed evidence"],
    owner: "Market lead",
    nextValidationAction: "Collect evidence",
  });
  const hypothesis = inbox.marketHypotheses![0]!;
  const assessment = assessMarketHypothesis(inbox, hypothesis, () => new Date(now));
  assert.equal(assessment.supportingMatching, 0);
  assert.equal(assessment.contradictoryMatching, 0);
  assert.equal(hypothesis.evidenceLinks.length, 0);
});

test("tag, assignment, and relationships remain explicit local metadata", async () => {
  const store = new MemoryStore();
  const service = new SignalsInboxService(store, () => new Date(now), () => "signal");
  const source: SignalSource = { registration: registration("manual"), collect: async () => ({ source: registration("manual"), status: "success", signals: [candidate("manual")], retrievedAt: now }) };
  await service.collect("workspace", [source]);
  await service.tag("workspace", "signal", ["ICP", "icp", " urgent "]);
  await service.assign("workspace", "signal", "Kevin");
  const connected = await service.connect("workspace", "signal", { kind: "product", targetId: "workspace", label: "Current product" });
  assert.deepEqual(connected.signals[0]?.tags, ["icp", "urgent"]);
  assert.equal(connected.signals[0]?.owner, "Kevin");
  assert.equal(connected.signals[0]?.relationships[0]?.kind, "product");
});
