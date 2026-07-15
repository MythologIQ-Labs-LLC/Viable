import assert from "node:assert/strict";
import test from "node:test";
import { scoreEvent } from "../src/event-intelligence/scoring/deterministic-scorer.js";

test("scoring is deterministic and records reasons", () => {
  const event = {
    externalId: "one",
    title: "SaaS Founder Summit",
    description: "Market validation",
    startsAt: "2026-08-01T12:00:00.000Z",
    tags: ["B2B"],
    provenance: { sourceId: "ics", sourceUrl: "https://example.test/events.ics", retrievedAt: "2026-07-15T00:00:00.000Z" },
  };
  const profile = {
    id: "profile",
    version: "1",
    rules: [
      { id: "founder", field: "title" as const, includes: "founder", weight: 4, reason: "Founder audience" },
      { id: "b2b", field: "tags" as const, includes: "b2b", weight: 2, reason: "B2B relevance" },
    ],
  };

  assert.deepEqual(scoreEvent(event, profile), {
    event,
    score: 6,
    reasons: ["Founder audience", "B2B relevance"],
    profileVersion: "profile@1",
  });
});
