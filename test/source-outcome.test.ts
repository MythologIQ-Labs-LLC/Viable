import assert from "node:assert/strict";
import test from "node:test";
import { classifyRun } from "../src/event-intelligence/domain/source-outcome.js";

const base = { sourceId: "source", events: [], observedAt: "2026-07-15T00:00:00.000Z" } as const;

test("failed sources never become verified empty", () => {
  assert.equal(classifyRun([{ ...base, status: "transport_failed" }]), "failed");
  assert.equal(classifyRun([{ ...base, status: "unauthorized" }]), "failed");
});

test("verified empty requires every source to be verified empty", () => {
  assert.equal(classifyRun([{ ...base, status: "verified_empty" }]), "verified_empty");
  assert.equal(
    classifyRun([
      { ...base, sourceId: "a", status: "verified_empty" },
      { ...base, sourceId: "b", status: "unavailable" },
    ]),
    "failed",
  );
});

test("usable evidence plus a failed source is partial", () => {
  const event = {
    externalId: "one",
    title: "Founder forum",
    startsAt: "2026-08-01T12:00:00.000Z",
    tags: [],
    provenance: { sourceId: "a", sourceUrl: "https://example.test", retrievedAt: base.observedAt },
  };
  assert.equal(
    classifyRun([
      { ...base, sourceId: "a", status: "success", events: [event] },
      { ...base, sourceId: "b", status: "rate_limited" },
    ]),
    "partial",
  );
});
