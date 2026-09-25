import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path: string): Promise<string> => readFile(path, "utf8");

test("desktop loads contextual review before controller capture handlers", async () => {
  const html = await read("apps/desktop/web/index.html");
  const review = html.indexOf("contextual-review-shell.js");
  const campaign = html.indexOf("campaign-shell.js");
  const activation = html.indexOf("activation-learning-shell.js");
  assert.ok(review > 0);
  assert.ok(review < campaign);
  assert.ok(review < activation);
  assert.match(html, /intent-workflow-shell\.js/);
});

test("contextual review panels keep authority in the original owning controller actions", async () => {
  const shell = await read("apps/desktop/ui/contextual-review-shell.ts");
  for (const action of [
    "review-evidence", "reject-evidence", "review-icp", "reject-icp", "approve-claim", "reject-claim",
    "accept", "dismiss", "review-campaign", "review-asset", "review-variant", "review-brief", "review-artifact", "review-entry",
  ]) assert.match(shell, new RegExp(`\\b${action}\\b`));
  assert.match(shell, /option\.button\.click\(\)/);
  assert.match(shell, /contextualReviewBypass/);
  assert.match(shell, /window\.prompt = \(\) => queue\.shift\(\) \?\? null/);
  assert.match(shell, /window\.prompt = originalPrompt/);
  assert.doesNotMatch(shell, /ProductCoreService|CampaignService|SignalsInboxService|VideoProductionService|ActivationLearningService/);
  assert.doesNotMatch(shell, /\.save\(/);
});

test("contextual review shows item evidence prior feedback reviewer decision and durable note where supported", async () => {
  const shell = await read("apps/desktop/ui/contextual-review-shell.ts");
  for (const marker of [
    "Named human review",
    "Item",
    "Evidence and authority context",
    "Prior feedback",
    "Named evidence reviewer",
    "Named ICP reviewer",
    "Named claim reviewer",
    "Named signal reviewer",
    "Named video brief reviewer",
    "Named render reviewer",
    "Named external-action reviewer",
    "Review note",
    "Request changes",
    "Reject",
  ]) assert.match(shell, new RegExp(marker));
  assert.match(shell, /noteRequired: true/);
  assert.match(shell, /current authority model has no separate durable review-note field/i);
  assert.match(shell, /Review decision sent to the owning workflow for durable recording/);
});

test("review action discovery is bound to the exact opened panel and fails closed when state changes", async () => {
  const shell = await read("apps/desktop/ui/contextual-review-shell.ts");
  assert.match(shell, /new WeakMap<HTMLElement, ReviewConfig>/);
  assert.match(shell, /panelReviews\.set\(panel, config\)/);
  assert.match(shell, /panelReviews\.get\(panel\)/);
  assert.match(shell, /queue\.shift\(\) \?\? null/);
  assert.match(shell, /owning review state changed/);
  assert.doesNotMatch(shell, /window\.prompt = originalPrompt;\s*option\.button\.click/s);
});

test("primary navigation uses work language without changing internal route keys", async () => {
  const shell = await read("apps/desktop/ui/intent-workflow-shell.ts");
  for (const label of ["Product & audience", "Review signals", "Market evidence", "Plan campaigns", "Create & review"] ) {
    assert.match(shell, new RegExp(label.replace(/[&]/g, "&")));
  }
  for (const key of ["product", "signals", "market", "campaigns", "studio", "calendar", "analytics"]) {
    assert.match(shell, new RegExp(`${key}:`));
  }
  assert.match(shell, /Product Core truth, evidence, claims, ICP hypotheses, and readiness/);
});

test("Signals leads with review and proposed work while configuration remains on demand", async () => {
  const shell = await read("apps/desktop/ui/intent-workflow-shell.ts");
  const inbox = shell.indexOf('panelFor("#inbox-heading")');
  const work = shell.indexOf('panelFor("#work-heading")');
  const website = shell.indexOf('panelFor("#website-watch-heading")');
  const sources = shell.indexOf('panelFor("#sources-heading")');
  assert.ok(inbox > 0 && work > inbox && website > work && sources > website);
  assert.match(shell, /data-intent-source-management/);
  assert.match(shell, /Manage evidence sources/);
  assert.match(shell, /Start with the evidence waiting for review and the work it can create/);
});

test("Calendar leads with existing work packages and delivery evidence before destination administration", async () => {
  const shell = await read("apps/desktop/ui/intent-workflow-shell.ts");
  const entries = shell.indexOf('panelFor("#calendar-records-heading")');
  const packages = shell.indexOf('panelFor("#activation-packages-heading")');
  const delivery = shell.indexOf('panelFor("#delivery-heading")');
  const planning = shell.indexOf('panelFor("#planning-heading")');
  const destination = shell.indexOf('panelFor("#destination-heading")');
  assert.ok(entries > 0 && packages > entries && delivery > packages && planning > delivery && destination > planning);
  assert.match(shell, /data-intent-destination-management/);
  assert.match(shell, /Manage delivery destinations/);
  assert.match(shell, /Start with scheduled work, packages, and delivery evidence/);
});

test("technical materialization language is translated into user intent while authority context remains available", async () => {
  const shell = await read("apps/desktop/ui/intent-workflow-shell.ts");
  for (const marker of [
    "Create Product action",
    "Retry creating Product action",
    "Create Campaign draft",
    "Create content brief",
    "Create Calendar response plan",
  ]) assert.match(shell, new RegExp(marker));
  assert.match(shell, /Creates the authoritative action in Product Core after destination checks pass/);
});

test("intent enhancement guards repeated DOM writes to remain observer-safe", async () => {
  const shell = await read("apps/desktop/ui/intent-workflow-shell.ts");
  assert.match(shell, /paragraph\.textContent !== signalsHeroCopy/);
  assert.match(shell, /paragraph\.textContent !== calendarHeroCopy/);
  assert.match(shell, /button\.textContent !== text/);
  assert.match(shell, /if \(queued \|\| arranging\) return/);
});
