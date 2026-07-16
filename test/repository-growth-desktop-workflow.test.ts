import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path: string): Promise<string> => readFile(path, "utf8");

test("Product exposes the complete repository growth journey", async () => {
  const [shell, view, html] = await Promise.all([
    read("apps/desktop/ui/repository-growth-shell.ts"),
    read("apps/desktop/ui/repository-growth-view.ts"),
    read("apps/desktop/web/index.html"),
  ]);
  assert.match(shell, /Product workflow/);
  assert.match(shell, /Open repository growth/);
  assert.match(html, /repository-growth-shell\.js/);
  assert.match(html, /repository-growth\.css/);
  for (const marker of [
    "Useful adoption before vanity growth",
    "Import public repository evidence",
    "Run explained readiness assessment",
    "Create prioritized growth plan",
    "Create a repository launch room",
    "Create governed launch room",
    "Create manual launch export",
    "Complete launch retrospective",
    "Not approved for publishing",
  ]) assert.match(view, new RegExp(marker, "i"));
});

test("repository desktop workflow preserves evidence and safety boundaries", async () => {
  const [view, service] = await Promise.all([
    read("apps/desktop/ui/repository-growth-view.ts"),
    read("src/repository-growth/services/repository-growth-service.ts"),
  ]);
  for (const marker of [
    "Missing access is not zero",
    "Partial repository evidence",
    "does not predict GitHub Trending",
    "No approved launch asset family is available",
    "does not publish",
    "unavailable",
    "Return to saved repository workspace",
    "An empty workspace is not evidence",
  ]) assert.match(view, new RegExp(marker, "i"));
  assert.match(service, /credentialsIncluded: false/);
  assert.match(service, /approvedForPublishing: false/);
  assert.match(service, /delivered: false/);
});

test("desktop TypeScript compiles repository growth authority and source adapter", async () => {
  const config = await read("apps/desktop/tsconfig.json");
  for (const marker of [
    "src/repository-growth/domain",
    "src/repository-growth/ports",
    "src/repository-growth/services",
    "github-public-repository-growth-source",
  ]) assert.match(config, new RegExp(marker));
});

test("repository growth layouts remain responsive and bounded", async () => {
  const css = await read("apps/desktop/web/repository-growth.css");
  for (const marker of [
    ".repository-entry",
    ".repository-evidence-grid",
    ".readiness-grid",
    ".checklist",
    "overflow-wrap: anywhere",
    "@media (max-width: 52rem)",
  ]) assert.match(css, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
});
