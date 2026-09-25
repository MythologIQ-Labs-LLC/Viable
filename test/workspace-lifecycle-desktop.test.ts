import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path: string): Promise<string> => readFile(path, "utf8");

test("desktop loads workspace history bridge and lifecycle surface after accessibility navigation", async () => {
  const html = await read("apps/desktop/web/index.html");
  const history = html.indexOf("navigation-history-shell.js");
  const bridge = html.indexOf("workspace-history-bridge.js");
  const lifecycle = html.indexOf("workspace-lifecycle-shell.js");
  assert.ok(history >= 0);
  assert.ok(bridge > history);
  assert.ok(lifecycle > bridge);
});

test("legacy Product reset is converted into intentional workspace management", async () => {
  const shell = await read("apps/desktop/ui/workspace-lifecycle-shell.ts");
  assert.match(shell, /button\[data-action=\\?"reset-workspace\\?"\]/);
  assert.match(shell, /legacyReset\.dataset\.nav = "workspace"/);
  assert.match(shell, /delete legacyReset\.dataset\.action/);
  assert.match(shell, /legacyReset\.textContent = "Manage workspace"/);
  assert.match(shell, /button\.dataset\.action === "reset-workspace"/);
});

test("workspace surface previews all local contexts before destructive deletion", async () => {
  const shell = await read("apps/desktop/ui/workspace-lifecycle-shell.ts");
  for (const marker of [
    "What belongs to this workspace",
    "Review exact deletion scope",
    "Retained outside workspace deletion",
    "Nothing is anonymized",
    "Type DELETE to confirm",
    "Delete all workspace-scoped local data",
  ]) assert.match(shell, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(shell, /lifecycle\.deleteWorkspace\(workspaceId\)/);
  assert.match(shell, /preview\.hasCorruptData && quarantineExportedFor !== preview\.workspaceId/);
});

test("backup and restore use generated files and a file picker rather than JSON authoring", async () => {
  const shell = await read("apps/desktop/ui/workspace-lifecycle-shell.ts");
  assert.match(shell, /Download workspace backup/);
  assert.match(shell, /type=\\?"file\\?"/);
  assert.match(shell, /accept=\\?"application\/json,\.json\\?"/);
  assert.match(shell, /lifecycle\.previewImport\(text\)/);
  assert.match(shell, /lifecycle\.restoreBackup\(pendingImportText, mode\)/);
  assert.match(shell, /URL\.createObjectURL/);
  assert.doesNotMatch(shell, /<textarea[^>]*data-workspace-import/);
});

test("corrupt local data has an explicit non-mutating quarantine path before deletion", async () => {
  const shell = await read("apps/desktop/ui/workspace-lifecycle-shell.ts");
  assert.match(shell, /Export quarantine data/);
  assert.match(shell, /lifecycle\.exportQuarantine\(workspaceId\)/);
  assert.match(shell, /quarantineExportedFor = workspaceId/);
  assert.match(shell, /Deletion is blocked until corrupt raw data is exported/);
});

test("Workspace navigation participates in URL history before the lifecycle shell intercepts legacy reset", async () => {
  const bridge = await read("apps/desktop/ui/workspace-history-bridge.ts");
  assert.match(bridge, /dataset\.nav === "workspace"/);
  assert.match(bridge, /dataset\.action === "reset-workspace"/);
  assert.match(bridge, /history\.pushState/);
  assert.match(bridge, /url\.hash = "workspace"/);
});
