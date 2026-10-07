import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const bootstrap = await readFile("apps/desktop/ui/bootstrap.ts", "utf8");
const index = await readFile("apps/desktop/web/index.html", "utf8");

test("desktop entry point loads Product Core through the guarded bootstrap", () => {
  assert.match(index, /generated\/apps\/desktop\/ui\/bootstrap\.js/);
  assert.doesNotMatch(index, /generated\/apps\/desktop\/ui\/app\.js/);
  assert.match(bootstrap, /import\("\.\/entry\.js"\)\.catch\(renderFailure\)/);
});

test("desktop UI loads as one module graph so shared top-level awaits order the same in every engine", async () => {
  // Separate <script type="module"> tags sharing workspace-storage's pending
  // top-level await broke WebKit (TDZ errors) and hung Firefox (#114).
  const scripts = index.match(/<script\b[^>]*type="module"/g) ?? [];
  assert.equal(scripts.length, 1, "index.html loads only the guarded bootstrap");
  const entry = await readFile("apps/desktop/ui/entry.ts", "utf8");
  const imports = [...entry.matchAll(/^import "\.\/([\w-]+)\.js";$/gm)].map((match) => match[1]);
  assert.ok(imports.length >= 20, "every desktop shell is imported by the entry module");
  assert.equal(imports.at(-1), "app", "app.js is evaluated after the shells that wrap its controllers");
});

test("desktop bootstrap handles synchronous and asynchronous failures without claiming data deletion", () => {
  assert.match(bootstrap, /window\.addEventListener\("error"/);
  assert.match(bootstrap, /window\.addEventListener\("unhandledrejection"/);
  assert.match(bootstrap, /event\.preventDefault\(\)/);
  assert.match(bootstrap, /saved profile was not intentionally changed/i);
  assert.match(bootstrap, /aria-busy", "false"/);
  assert.match(bootstrap, /role="alert"/);
  assert.match(bootstrap, /main\.focus\(\)/);
});

test("a startup failure offers recovery mode that loads only the Workspace screen and changes nothing", async () => {
  assert.match(bootstrap, /data-startup-action="recover"/);
  assert.match(bootstrap, /import\("\.\/workspace-lifecycle-shell\.js"\)\s*\.then\(\(shell\) => shell\.openWorkspaceRecovery\(detail\)\)/);
  assert.match(bootstrap, /Workspace recovery could not be opened/);
  const shell = await readFile("apps/desktop/ui/workspace-lifecycle-shell.ts", "utf8");
  const recovery = shell.slice(shell.indexOf("export function openWorkspaceRecovery"), shell.indexOf("function closeWorkspace"));
  assert.match(recovery, /startupFailure = reason;\s*openWorkspace\(\);/);
  assert.doesNotMatch(recovery, /setItem|removeItem|commit|delete|restore/, "opening recovery mode must not change stored data");
  assert.match(shell, /data-workspace-recovery-mode/);
  // Recovery mode reuses the screen's existing gates rather than bypassing them.
  assert.doesNotMatch(shell, /startupFailure[^\n]*(quarantineExported|recoveryPoint)/);
});
