import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path: string): Promise<string> => readFile(path, "utf8");

test("UX completion shell exposes Product Core readiness lifecycle without taking authority", async () => {
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
  ]) assert.match(shell, new RegExp(marker, "i"));
  assert.match(shell, /productSuccess/);
  assert.match(shell, /campaignSuccess/);
  assert.doesNotMatch(shell, /\blastSuccess\b/);
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
  ]) assert.match(shell, new RegExp(marker, "i"));
});

test("materialized Signal conversions replace raw destination identifiers with exact owning-record navigation", async () => {
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

test("Home surfaces active Product Core work as navigation, not duplicated authority", async () => {
  const shell = await read("apps/desktop/ui/ux-completion-shell.ts");
  assert.match(shell, /Next highest-value Product Core action/);
  assert.match(shell, /Open Product Core action/);
  assert.match(shell, /data-context="product_core"/);
  assert.doesNotMatch(shell, /signalsStore\.save/);
  assert.doesNotMatch(shell, /campaignStore\.save/);
});
