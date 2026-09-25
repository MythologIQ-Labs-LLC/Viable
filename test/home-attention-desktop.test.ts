import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path: string): Promise<string> => readFile(path, "utf8");

test("desktop loads the read-only cross-workflow Home attention shell", async () => {
  const [html, shell] = await Promise.all([
    read("apps/desktop/web/index.html"),
    read("apps/desktop/ui/home-attention-shell.ts"),
  ]);
  assert.match(html, /home-attention-shell\.js/);
  assert.match(shell, /deriveHomeAttention/);
  assert.match(shell, /Home is read-only/);
  assert.match(shell, /does not approve, mutate, publish, deliver, or invent a business-value score/i);
  assert.doesNotMatch(shell, /\.save\(/);
  assert.doesNotMatch(shell, /approve[A-Z]|review[A-Z]|materialize[A-Z]|markExportDownloaded|recoverExport/);
});

test("Home exposes explicit recovery review blocked action scheduled and learning categories", async () => {
  const [model, shell] = await Promise.all([
    read("src/ui/home-attention.ts"),
    read("apps/desktop/ui/home-attention-shell.ts"),
  ]);
  for (const state of ["recovery", "review", "blocked", "action", "scheduled", "learning"]) {
    assert.match(model, new RegExp(`\\b${state}\\b`));
  }
  for (const label of ["Recovery needed", "Review needed", "Blocked or stale", "Owned action", "Scheduled follow-up", "Learning"]) {
    assert.match(shell, new RegExp(label));
  }
  assert.match(shell, /Missing context is not treated as success or empty work/i);
  assert.match(shell, /No cross-workflow attention is currently recorded/i);
  assert.match(shell, /not evidence that no market or product work exists/i);
});

test("Home attention loads every implemented owning store independently and preserves partial context", async () => {
  const shell = await read("apps/desktop/ui/home-attention-shell.ts");
  for (const marker of [
    "LocalStorageProductWorkspaceStore",
    "LocalStorageSignalsInboxStore",
    "LocalStorageCampaignWorkspaceStore",
    "LocalStorageRepositoryGrowthStore",
    "LocalStorageVideoProductionStore",
    "LocalStorageActivationLearningStore",
    "safeLoad",
    "sourceFailures",
  ]) assert.match(shell, new RegExp(marker));
  assert.match(shell, /Promise\.all/);
  assert.match(shell, /partial local context/i);
});

test("Home attention deep links use owning record identifiers across implemented workflows", async () => {
  const shell = await read("apps/desktop/ui/home-attention-shell.ts");
  for (const marker of [
    "data-ux-product-action",
    "#evidence-heading",
    "#icp-heading",
    ".signal-cards > article.record",
    ".signal-conversion",
    "data-authoritative-record-id",
    "data-ux-content-brief",
    "#asset-list-heading",
    "#variant-heading",
    "#video-brief-list-heading",
    "#video-artifact-heading",
    "#video-variant-heading",
    "repository-action-status",
    "data-repository-action",
    ".calendar-list > article.calendar-card",
    "#measurement-plan-heading",
    "#performance-import-heading",
    "#retrospective-heading",
    "#learning-ledger-heading",
  ]) assert.match(shell, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(shell, /Open exact record/);
  assert.match(shell, /Open prerequisite/);
  assert.match(shell, /requested authoritative record could not be focused/i);
});

test("Home attention coexists with the earlier Product-only Home enhancement without moving authority", async () => {
  const [attention, completion] = await Promise.all([
    read("apps/desktop/ui/home-attention-shell.ts"),
    read("apps/desktop/ui/ux-completion-shell.ts"),
  ]);
  assert.match(attention, /section\.panel\.next/);
  assert.doesNotMatch(attention, /delete .*uxActionSummary|removeAttribute\([^\n]*uxActionSummary/);
  assert.match(completion, /selectActiveReadinessAction/);
  assert.doesNotMatch(attention, /highest-value/i);
  assert.match(attention, /deterministic state order/i);
});
