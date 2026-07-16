import assert from "node:assert/strict";
import test from "node:test";
import type { SignalsInbox } from "../src/signals/domain/signal.js";
import type { SignalSource } from "../src/signals/ports/signal-source.js";
import type { SignalsInboxStore } from "../src/signals/ports/signals-inbox-store.js";
import { SignalsInboxService } from "../src/signals/services/signals-inbox-service.js";

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
