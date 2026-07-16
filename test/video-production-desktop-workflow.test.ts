import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path: string): Promise<string> => readFile(path, "utf8");

test("Studio exposes the complete manual video production journey", async () => {
  const [view, shell, html] = await Promise.all([
    read("apps/desktop/ui/video-production-view.ts"),
    read("apps/desktop/ui/campaign-shell.ts"),
    read("apps/desktop/web/index.html"),
  ]);
  for (const marker of [
    "Prepare an approved script for production",
    "Create draft video brief",
    "Download JSON package",
    "Import run as unapproved artifact",
    "Imported artifacts",
    "Prepare an approved render for a platform",
    "Calendar handoff is not implemented",
  ]) assert.match(view, new RegExp(marker, "i"));
  assert.match(shell, /VideoProductionViewController/);
  assert.match(shell, /dataset\.videoAction/);
  assert.match(shell, /startsWith\("video-"\)/);
  assert.match(html, /video-production\.css/);
});

test("video Studio preserves authority, credential, and execution boundaries", async () => {
  const [view, guarded, adapter] = await Promise.all([
    read("apps/desktop/ui/video-production-view.ts"),
    read("src/video-production/services/guarded-video-production-service.ts"),
    read("src/video-production/adapters/vimax-v1-1-manual-adapter.ts"),
  ]);
  for (const marker of [
    "does not execute ViMax",
    "does not execute",
    "No approved canonical script is available",
    "approval stays here",
    "No credentials",
    "macOS unverified",
    "Render completion will still begin in draft review state",
  ]) assert.match(view, new RegExp(marker, "i"));
  assert.match(guarded, /validateCurrentAuthority/);
  assert.match(guarded, /Product Core claim authority changed/);
  assert.match(adapter, /credentialsIncluded: false/);
  assert.match(adapter, /api_key:/);
});

test("desktop TypeScript compiles the video production authority", async () => {
  const config = await read("apps/desktop/tsconfig.json");
  for (const marker of [
    "src/video-production/domain",
    "src/video-production/ports",
    "src/video-production/services",
    "vimax-v1-1-manual-adapter",
  ]) assert.match(config, new RegExp(marker));
});

test("video production layout remains responsive and reduced-motion safe", async () => {
  const css = await read("apps/desktop/web/video-production.css");
  for (const marker of [
    ".video-workspace",
    ".video-tool-grid",
    ".provider-grid",
    ".stage-list",
    "overflow-wrap: anywhere",
    "@media (max-width: 52rem)",
    "prefers-reduced-motion",
  ]) assert.match(css, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
});
