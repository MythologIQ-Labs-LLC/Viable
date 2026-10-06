import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

// Shell load order lives in the single desktop entry module.
const entry = await readFile("apps/desktop/ui/entry.ts", "utf8");

const read = (path: string): Promise<string> => readFile(path, "utf8");

test("Calendar exposes destination scheduling export and delivery evidence journey", async () => {
  const [view, shell, html] = await Promise.all([
    read("apps/desktop/ui/activation-learning-view.ts"),
    read("apps/desktop/ui/activation-learning-shell.ts"),
    read("apps/desktop/web/index.html"),
  ]);
  for (const marker of [
    "Record non-secret account and ownership context",
    "Schedule internal deadlines, opportunities, experiments, and follow-ups",
    "Bind approved work to a destination and time",
    "Submit for destination review",
    "Create manual activation package",
    "Download package and record handoff",
    "Record publication, failure, cancellation, or unknown outcome",
    "delivery remains unproven",
  ]) assert.match(view, new RegExp(marker, "i"));
  assert.match(shell, /data-nav="calendar"/);
  assert.match(shell, /data-nav = "analytics"|dataset\.nav = "analytics"/);
  assert.match(shell, /synchronizeSourceOptions/);
  assert.match(shell, /synchronizeDeliveryEntry/);
  assert.match(html, /activation-learning\.css/);
  assert.match(entry, /activation-learning-shell\.js/);
});

test("Calendar composes publication inventory as additive activation authority", async () => {
  const [inventory, shell, store] = await Promise.all([
    read("apps/desktop/ui/publication-inventory-view.ts"),
    read("apps/desktop/ui/activation-learning-shell.ts"),
    read("apps/desktop/ui/local-storage-activation-learning-store.ts"),
  ]);
  for (const marker of [
    "Approve content once. Hold exact publication intent as stock",
    "Stocking never publishes by itself",
    "Create publication policy",
    "Create draft inventory item",
    "Submit for inventory review",
    "Approve and stock",
    "Recheck inventory authority",
    "Empty inventory will always mean publish nothing",
  ]) assert.match(inventory, new RegExp(marker, "i"));
  assert.match(shell, /PublicationInventoryViewController/);
  assert.match(shell, /page === "calendar"/);
  assert.match(shell, /synchronizePublicationSourceOptions/);
  assert.match(store, /publicationPolicies/);
  assert.match(store, /publicationInventory/);
  assert.match(store, /defaultArrays/);
});

test("Analytics exposes baseline explicit evidence retrospective and learning journey", async () => {
  const view = await read("apps/desktop/ui/activation-learning-view.ts");
  for (const marker of [
    "Record what was true before the outcome window",
    "Import one explicit metric observation",
    "Verified zero",
    "Delayed",
    "Unavailable",
    "Choose what changes because of the evidence",
    "Attribution uncertainty",
    "One reversible next action",
    "Evidence, decision, change, outcome, and follow-up",
  ]) assert.match(view, new RegExp(marker, "i"));
});

test("desktop workflow preserves approval outcome and Product Core boundaries", async () => {
  const [view, service] = await Promise.all([
    read("apps/desktop/ui/activation-learning-view.ts"),
    read("src/activation-learning/services/activation-learning-service.ts"),
  ]);
  for (const marker of [
    "Timing intent, approval, and delivery evidence remain separate",
    "No publishing API is connected",
    "No credentials. No direct publishing. No delivery claim",
    "Human recorded",
    "Provider verified",
    "Missing evidence stays missing",
  ]) assert.match(view, new RegExp(marker, "i"));
  assert.match(service, /Scheduled work cannot become delivered without a completed manual export handoff/);
  assert.match(service, /Provider-verified outcome requires a provider response identifier/);
  assert.match(service, /Retrospectives may propose|icpConfidenceEffect/);
  assert.match(service, /Activation source Product Core claim authority changed/);
});

test("Calendar supports interrupted export and recovery states", async () => {
  const [view, service] = await Promise.all([
    read("apps/desktop/ui/activation-learning-view.ts"),
    read("src/activation-learning/services/activation-learning-service.ts"),
  ]);
  assert.match(view, /Record interruption/);
  assert.match(view, /Recover export/);
  assert.match(service, /markExportInterrupted/);
  assert.match(service, /recoverExport/);
  assert.match(service, /Only interrupted exports can be recovered/);
});

test("Calendar and Analytics layout remains responsive and reduced-motion safe", async () => {
  const css = await read("apps/desktop/web/activation-learning.css");
  for (const marker of [
    ".activation-workspace",
    ".calendar-list",
    ".calendar-meta",
    ".learning-grid",
    ".metric-evidence",
    "overflow-wrap: anywhere",
    "@media (max-width: 52rem)",
    "prefers-reduced-motion",
  ]) assert.match(css, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
});

test("desktop TypeScript compiles activation and learning authority", async () => {
  const config = await read("apps/desktop/tsconfig.json");
  for (const marker of [
    "src/activation-learning/domain",
    "src/activation-learning/ports",
    "src/activation-learning/services",
  ]) assert.match(config, new RegExp(marker));
});
