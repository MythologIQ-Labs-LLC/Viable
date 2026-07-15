import assert from "node:assert/strict";
import test from "node:test";
import type { StoredEventIntelligenceRun, RunStore } from "../src/event-intelligence/ports/run-store.js";
import { runEventIntelligence } from "../src/event-intelligence/workflows/run-event-intelligence.js";

class MemoryStore implements RunStore {
  value?: StoredEventIntelligenceRun;
  async save(value: StoredEventIntelligenceRun): Promise<void> { this.value = value; }
  async latest(): Promise<StoredEventIntelligenceRun | undefined> { return this.value; }
}

test("workflow preserves partial evidence, deduplicates, scores, and persists", async () => {
  const store = new MemoryStore();
  const event = {
    externalId: "one",
    title: "Founder Forum",
    startsAt: "2026-08-01T12:00:00.000Z",
    tags: [],
    provenance: { sourceId: "a", sourceUrl: "https://example.test/a", retrievedAt: "2026-07-15T00:00:00.000Z" },
  };
  const sourceA = { id: "a", collect: async () => ({ sourceId: "a", status: "success" as const, events: [event], observedAt: event.provenance.retrievedAt }) };
  const sourceB = { id: "b", collect: async () => { throw new Error("offline"); } };
  const moments = [new Date("2026-07-15T00:00:00.000Z"), new Date("2026-07-15T00:00:01.000Z"), new Date("2026-07-15T00:00:02.000Z")];

  const result = await runEventIntelligence({
    sources: [sourceA, sourceB],
    profile: { id: "p", version: "1", rules: [{ id: "r", field: "title", includes: "founder", weight: 5, reason: "ICP evidence" }] },
    store,
    createId: () => "run-1",
    clock: () => moments.shift() ?? new Date("2026-07-15T00:00:03.000Z"),
  });

  assert.equal(result.run.status, "partial");
  assert.equal(result.run.sources[1]?.status, "transport_failed");
  assert.equal(result.events[0]?.score, 5);
  assert.deepEqual(store.value, result);
});
