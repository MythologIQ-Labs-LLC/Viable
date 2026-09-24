import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path: string): Promise<string> => readFile(path, "utf8");

test("desktop loads readable prior-version history after revision controls", async () => {
  const html = await read("apps/desktop/web/index.html");
  const revision = html.indexOf("revision-completion-shell.js");
  const history = html.indexOf("revision-history-shell.js");
  assert.ok(revision >= 0);
  assert.ok(history > revision);
});

test("history shell reads owning stores and exposes prior values without taking mutation authority", async () => {
  const shell = await read("apps/desktop/ui/revision-history-shell.ts");
  for (const marker of [
    "View prior version values",
    "Prior version values unavailable",
    "Review canonical asset versions",
    "data-ux-canonical-version-history",
    "summarizeRevisionSnapshot",
    "data-ux-prior-snapshot",
    "product_truth",
    "content_brief",
    "variant",
  ]) assert.match(shell, new RegExp(marker, "i"));
  assert.match(shell, /version\.body/);
  assert.match(shell, /version\.changeNote/);
  assert.doesNotMatch(shell, /\.save\(/);
  assert.doesNotMatch(shell, /JSON\.parse/);
});
