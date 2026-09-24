import assert from "node:assert/strict";
import test from "node:test";
import { summarizeRevisionSnapshot } from "../src/ui/revision-history-summary.js";

test("campaign prior-version history exposes meaningful values without internal identifiers", () => {
  const summary = summarizeRevisionSnapshot(JSON.stringify({
    id: "campaign-secret-id",
    title: "Prior launch",
    objective: "Explain the pilot",
    primaryOutcome: "Pilot review",
    primaryAudience: "Founder operators",
    audienceKind: "selected_icp",
    problem: "Campaign drift",
    trigger: "Pilot ready",
    offer: "Pilot",
    messageHierarchy: ["Truth", "Evidence"],
    proof: ["Interview"],
    callToAction: "Review the pilot",
    channels: ["linkedin", "website"],
    assetPlan: ["Launch note"],
    owner: "Kevin",
    successMeasures: ["One review"],
    dependencies: [],
    status: "approved",
    reviewedBy: "Reviewer",
    reviewNote: "Verified",
  }), "campaign");

  assert.equal(summary.available, true);
  const labels = summary.fields.map((field) => field.label);
  assert.ok(labels.includes("Title"));
  assert.ok(labels.includes("Review note"));
  assert.equal(summary.fields.some((field) => field.value.includes("campaign-secret-id")), false);
});

test("ICP history includes prior review state and reconsideration conditions", () => {
  const summary = summarizeRevisionSnapshot(JSON.stringify({
    name: "Founder operators",
    summary: "Small teams",
    status: "selected",
    reviewStatus: "reviewed",
    owner: "Kevin",
    confidence: "high",
    disqualifiers: ["No active product"],
    assumptions: ["Founder owns go-to-market"],
    contradictions: [],
    nextValidationAction: "Interview three founders",
    changeConditions: ["Interviews show no urgency"],
    lastReviewedAt: "2026-09-21T12:00:00.000Z",
  }), "icp");

  assert.equal(summary.available, true);
  assert.equal(summary.fields.find((field) => field.label === "Review state")?.value, "reviewed");
  assert.match(summary.fields.find((field) => field.label === "Change conditions")?.value ?? "", /no urgency/);
});

test("malformed or non-record historical snapshots remain explicit and non-destructive", () => {
  const malformed = summarizeRevisionSnapshot("{broken", "content_brief");
  assert.equal(malformed.available, false);
  assert.match(malformed.message ?? "", /could not be read/);

  const array = summarizeRevisionSnapshot("[]", "variant");
  assert.equal(array.available, false);
  assert.match(array.message ?? "", /not a readable record/);
});
