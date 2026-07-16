import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path: string): Promise<string> => readFile(path, "utf8");

test("desktop exposes bounded Signals and Market workflows", async () => {
  const [app, view] = await Promise.all([
    read("apps/desktop/ui/app.ts"),
    read("apps/desktop/ui/signals-view.ts"),
  ]);
  assert.match(app, /data-nav="signals"/);
  assert.match(app, /data-nav="market"/);
  assert.match(app, /SignalsViewController/);
  for (const marker of [
    "Public GitHub repository",
    "Event Intelligence run",
    "Manual signal import",
    "Source health",
    "Evidence drawer",
    "Accept with named review",
    "Convert to proposed work",
    "Evidence before action",
    "does not calculate ICP truth",
  ]) assert.match(view, new RegExp(marker));
});

test("Signals UI includes failure, verified-empty, partial, offline, and recovery language", async () => {
  const view = await read("apps/desktop/ui/signals-view.ts");
  for (const marker of [
    "Signal operation failed",
    "Partial source health",
    "Verified empty",
    "Manual paths remain available",
    "Return to saved inbox",
    "empty inbox is not evidence",
  ]) assert.match(view, new RegExp(marker, "i"));
});

test("Signals styling supports responsive evidence and health layouts", async () => {
  const css = await read("apps/desktop/web/styles.css");
  assert.match(css, /\.source-forms/);
  assert.match(css, /\.health-grid/);
  assert.match(css, /\.signal-cards/);
  assert.match(css, /@media \(max-width: 72rem\)/);
});
