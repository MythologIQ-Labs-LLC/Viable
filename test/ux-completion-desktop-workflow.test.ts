import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import type { ReadinessAction } from "../src/product-core/domain/assessment.js";
import { OneShotSurfaceFeedback, selectActiveReadinessAction } from "../src/ui/ux-completion-state.js";

const read = (path: string): Promise<string> => readFile(path, "utf8");
const action = (id: string, status: ReadinessAction["status"]): ReadinessAction => ({
  id,
  source: "product_gap",
  sourceId: `source-${id}`,
  title: `Action ${id}`,
  owner: "Kevin",
  kind: "action",
  status,
});

test("Home action selection prefers work already in progress, then open work, without inventing a value ranking", () => {
  const actions = [action("open-first", "open"), action("closed", "completed"), action("working", "in_progress")];
  assert.equal(selectActiveReadinessAction(actions)?.id, "working");
  assert.equal(selectActiveReadinessAction([action("closed", "completed"), action("open", "open")])?.id, "open");
  assert.equal(selectActiveReadinessAction([action("closed", "completed"), action("dismissed", "dismissed")]), undefined);
});

test("saved feedback is one-shot and isolated by owning surface", () => {
  const feedback = new OneShotSurfaceFeedback();
  feedback.set("product", "Readiness action started");
  feedback.set("campaign", "Content brief submitted for named review");

  assert.equal(feedback.consume("product"), "Readiness action started");
  assert.equal(feedback.consume("product"), undefined);
  assert.equal(feedback.consume("campaign"), "Content brief submitted for named review");
  assert.equal(feedback.consume("campaign"), undefined);
  assert.throws(() => feedback.set("product", "   "), /feedback message/i);
});

test("UX completion shell wires Product Core lifecycle to the executable completion-state helpers", async () => {
  const [shell, html] = await Promise.all([
    read("apps/desktop/ui/ux-completion-shell.ts"),
    read("apps/desktop/web/index.html"),
  ]);
  assert.match(html, /ux-completion-shell\.js/);
  for (const marker of [
    "Product Core authority",
    "Readiness actions",
    "Start action",
    "Assign owner",
    "Complete action",
    "Dismiss with rationale",
    "verification evidence or an explicit rationale",
    "startAction",
    "assignActionOwner",
    "completeAction",
    "dismissAction",
    "Your entered values are still here",
    "Retry from saved state",
    "selectActiveReadinessAction",
    "feedback.consume(\"product\")",
    "feedback.set(\"product\", message)",
  ]) assert.match(shell, new RegExp(marker, "i"));
  assert.doesNotMatch(shell, /\bproductSuccess\b|\bcampaignSuccess\b|\blastSuccess\b/);
  assert.doesNotMatch(shell, /highest-value/i);
});

test("Campaigns exposes Campaign-owned ContentBrief review lifecycle and keeps downstream states distinct", async () => {
  const shell = await read("apps/desktop/ui/ux-completion-shell.ts");
  for (const marker of [
    "Campaign-owned content",
    "Content briefs",
    "Submit for review",
    "Resubmit for review",
    "Request changes",
    "Reject",
    "reviewContentBrief",
    "submitContentBrief",
    "does not create an asset, schedule, export, publication, delivery, or outcome claim",
    "feedback.consume(\"campaign\")",
    "feedback.set(\"campaign\", message)",
  ]) assert.match(shell, new RegExp(marker, "i"));
});

test("materialized Signal conversions retain exact owning-record navigation contracts without exposing the raw identifier", async () => {
  const shell = await read("apps/desktop/ui/ux-completion-shell.ts");
  assert.match(shell, /Open created item/);
  assert.match(shell, /raw\.innerHTML = `<strong>Authoritative destination:<\/strong>/);
  assert.doesNotMatch(shell, /raw\.innerHTML[^\n]*recordId/);
  assert.match(shell, /dataset\.recordId = destination\.recordId/);
  assert.match(shell, /data-ux-product-action/);
  assert.match(shell, /data-ux-content-brief/);
  assert.match(shell, /data-authoritative-record-id/);
  assert.match(shell, /data-activation-action/);
  assert.match(shell, /repository-action-status/);
  for (const context of ["product_core", "campaigns", "calendar", "repository_growth"]) {
    assert.match(shell, new RegExp(context));
  }
});

test("Home surfaces active Product Core work as navigation, not duplicated authority or fabricated prioritization", async () => {
  const shell = await read("apps/desktop/ui/ux-completion-shell.ts");
  assert.match(shell, /Active Product Core action/);
  assert.match(shell, /Open Product Core action/);
  assert.match(shell, /data-context="product_core"/);
  assert.doesNotMatch(shell, /highest-value/i);
  assert.doesNotMatch(shell, /signalsStore\.save/);
  assert.doesNotMatch(shell, /campaignStore\.save/);
});
