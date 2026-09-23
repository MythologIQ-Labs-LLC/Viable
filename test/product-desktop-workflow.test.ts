import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path: string): Promise<string> => readFile(path, "utf8");

test("desktop workflow loads Product Core through the guarded bootstrap", async () => {
  const [html, bootstrap, app] = await Promise.all([
    read("apps/desktop/web/index.html"),
    read("apps/desktop/ui/bootstrap.ts"),
    read("apps/desktop/ui/app.ts"),
  ]);
  assert.match(html, /id="main"/);
  assert.match(html, /aria-live="polite"/);
  assert.match(html, /generated\/apps\/desktop\/ui\/bootstrap\.js/);
  assert.doesNotMatch(html, /generated\/apps\/desktop\/ui\/app\.js/);
  assert.match(bootstrap, /import\("\.\/app\.js"\)\.catch\(renderFailure\)/);
  assert.match(app, /new ProductCoreService/);
  assert.match(app, /service\.createWorkspace/);
  assert.match(app, /service\.updateProductTruth/);
  assert.match(app, /service\.addEvidence/);
  assert.match(app, /service\.reviewEvidence/);
  assert.match(app, /service\.addClaim/);
  assert.match(app, /service\.reviseClaim/);
  assert.match(app, /service\.approveClaim/);
  assert.match(app, /service\.rejectClaim/);
  assert.match(app, /service\.addIcpHypothesis/);
  assert.match(app, /service\.addExperiment/);
  assert.match(app, /service\.reviewIcp/);
  assert.match(app, /service\.selectPrimaryIcp/);
  assert.match(app, /service\.recordAssessment/);
  assert.match(app, /service\.createAction/);
});

test("claim forms omit absent optional rationale rather than persisting undefined", async () => {
  const app = await read("apps/desktop/ui/app.ts");
  assert.match(app, /\.\.\.\(rationale \? \{ rationale \} : \{\}\)/);
  assert.doesNotMatch(app, /rationale:\s*String\(form\.get\("rationale"\)\)\s*\|\|\s*undefined/);
});

test("desktop workflow visibly represents required state and authority boundaries", async () => {
  const [app, bootstrap, html] = await Promise.all([
    read("apps/desktop/ui/app.ts"),
    read("apps/desktop/ui/bootstrap.ts"),
    read("apps/desktop/web/index.html"),
  ]);
  const surface = `${html}\n${bootstrap}\n${app}`;
  for (const marker of [
    "Loading local workspace",
    "Empty state",
    "Offline-ready by design",
    "Stale evidence",
    "Contradictions require review",
    "That change was not saved",
    "The local workspace could not be opened",
    "Generated suggestion",
    "Selection is intentionally blocked",
    "No unexplained composite score",
    "Named selector",
    "Review the claims ledger",
    "Approve claim",
    "Editing any claim returns it to proposed review",
    "Validation experiments",
    "Success criteria",
    "Failure criteria",
    "Decision criteria",
  ]) assert.match(surface, new RegExp(marker));
});

test("desktop styles preserve keyboard, text-scale, reduced-motion, and non-color status support", async () => {
  const css = await read("apps/desktop/web/styles.css");
  assert.match(css, /:focus-visible/);
  assert.match(css, /font-size: 100%/);
  assert.match(css, /prefers-reduced-motion/);
  assert.match(css, /border-left: \.35rem solid/);
  assert.match(css, /@media \(max-width:/);
});
