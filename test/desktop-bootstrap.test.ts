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
