import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path: string): Promise<string> => readFile(path, "utf8");

test("Signals desktop exposes the provider-neutral Website Watch journey", async () => {
  const [view, store, html] = await Promise.all([
    read("apps/desktop/ui/signals-view.ts"),
    read("apps/desktop/ui/local-storage-website-watch-store.ts"),
    read("apps/desktop/web/index.html"),
  ]);
  for (const marker of [
    "Create watched site",
    "Record watch target",
    "Import Webdog alerts",
    "webdog_ai.new_alerts",
    "Source limitations",
    "Generated analysis, not evidence",
    "Snapshot provenance",
    "Delete retained snapshot payload",
    "Prune expired snapshots",
    "No live provider is required",
  ]) assert.match(view, new RegExp(marker));
  assert.match(store, /viable\.website-watch\./);
  assert.match(html, /website-watch\.css/);
});

test("Website Watch review synchronizes Signals and permits only reviewed Calendar follow-up", async () => {
  const view = await read("apps/desktop/ui/signals-view.ts");
  assert.match(view, /websiteService\.reviewObservation/);
  assert.match(view, /service\.review/);
  assert.match(view, /createPlanningEntry/);
  assert.match(view, /relatedRecordId: observation\.id/);
  assert.match(view, /Calendar follow-up requires a reviewed website-change signal/);
  assert.match(view, /Calendar follow-up requires a reviewed Website Watch observation/);
  assert.match(view, /Scheduling|Calendar planning|authoritative Calendar/i);
});

test("Website Watch presentation includes explicit evidence, failure, and recovery states", async () => {
  const [view, css] = await Promise.all([
    read("apps/desktop/ui/signals-view.ts"),
    read("apps/desktop/web/website-watch.css"),
  ]);
  for (const marker of [
    "success_change_detected",
    "verified_no_change",
    "baseline",
    "partial",
    "rate_limited",
    "authentication_failed",
    "validation_failed",
    "transport_failed",
    "offline",
    "cancelled",
    "Configuration alone does not imply a successful source check",
  ]) assert.match(view, new RegExp(marker));
  assert.match(css, /\.website-watch/);
  assert.match(css, /\.diff-preview/);
  assert.match(css, /@media \(max-width: 48rem\)/);
  assert.match(css, /prefers-reduced-motion/);
});

test("browser Website Watch dependency graph excludes Node-only imports", async () => {
  const utilities = await read("src/website-watch/utilities/website-watch-utilities.ts");
  assert.doesNotMatch(utilities, /node:crypto|node:net/);
  assert.match(utilities, /TextEncoder/);
  assert.match(utilities, /parseIpv4/);
  assert.match(utilities, /parseIpv6/);
});
