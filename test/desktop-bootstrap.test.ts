import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const bootstrap = await readFile("apps/desktop/ui/bootstrap.ts", "utf8");
const index = await readFile("apps/desktop/web/index.html", "utf8");

test("desktop entry point loads Product Core through the guarded bootstrap", () => {
  assert.match(index, /generated\/apps\/desktop\/ui\/bootstrap\.js/);
  assert.doesNotMatch(index, /generated\/apps\/desktop\/ui\/app\.js/);
  assert.match(bootstrap, /import\("\.\/app\.js"\)\.catch\(renderFailure\)/);
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
