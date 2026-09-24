import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path: string): Promise<string> => readFile(path, "utf8");

test("desktop loads interaction accessibility and history shells after workflow enhancements", async () => {
  const html = await read("apps/desktop/web/index.html");
  const progressive = html.indexOf("progressive-draft-shell.js");
  const accessibility = html.indexOf("interaction-accessibility-shell.js");
  const history = html.indexOf("navigation-history-shell.js");
  assert.ok(progressive >= 0);
  assert.ok(accessibility > progressive);
  assert.ok(history > accessibility);
});

test("native validation failures become visible field-associated repair guidance with focus", async () => {
  const shell = await read("apps/desktop/ui/interaction-accessibility-shell.ts");
  for (const marker of [
    'document.addEventListener("invalid"',
    'aria-invalid',
    'aria-describedby',
    'dataset.uxFieldError',
    'control.validationMessage',
    'document.querySelector<HTMLElement>(\'[aria-invalid="true"]\')?.focus()',
  ]) assert.match(shell, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
});

test("async form failures restore submitted values and expose a focusable visible alert", async () => {
  const shell = await read("apps/desktop/ui/interaction-accessibility-shell.ts");
  assert.match(shell, /new FormData\(form\)/);
  assert.match(shell, /restore\(form, pending\)/);
  assert.match(shell, /This form was not saved/);
  assert.match(shell, /Your entered values have been restored/);
  assert.match(shell, /setAttribute\("role", "alert"\)/);
  assert.match(shell, /alert\.tabIndex = -1/);
  assert.match(shell, /repair\.focus\(\)/);
  assert.doesNotMatch(shell, /ProductCoreService/);
  assert.doesNotMatch(shell, /\.save\(/);
});

test("ambiguous or missing labels receive programmatic names without mutating authority", async () => {
  const shell = await read("apps/desktop/ui/interaction-accessibility-shell.ts");
  assert.match(shell, /controlsInLabel === 1/);
  assert.match(shell, /control\.setAttribute\("aria-label"/);
  assert.match(shell, /contextName\(control\)/);
  assert.match(shell, /humanize\(control\.name/);
});

test("desktop navigation is synchronized with browser history and can recover from back-forward navigation", async () => {
  const shell = await read("apps/desktop/ui/navigation-history-shell.ts");
  assert.match(shell, /history\.pushState/);
  assert.match(shell, /history\.replaceState/);
  assert.match(shell, /window\.addEventListener\("popstate"/);
  assert.match(shell, /window\.addEventListener\("hashchange"/);
  assert.match(shell, /button\.click\(\)/);
  assert.match(shell, /currentNav\(\) !== nav/);
  assert.doesNotMatch(shell, /localStorage/);
  assert.doesNotMatch(shell, /\.save\(/);
});
