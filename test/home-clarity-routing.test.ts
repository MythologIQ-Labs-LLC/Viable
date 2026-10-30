import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path: string) => readFile(path, "utf8");

test("Home recommendations identify the task and route to its owning Product section", async () => {
  const app = await read("apps/desktop/ui/app.ts");
  for (const [action, target] of [
    ["Describe your product", "truth-heading"],
    ["Compare customer profiles", "icp-heading"],
    ["Review audience evidence", "icp-heading"],
    ["Start marketability assessment", "assessment-heading"],
    ["Review readiness actions", "assessment-heading"],
    ["Review product readiness", "assessment-heading"],
  ]) {
    assert.ok(app.includes('action: "' + action + '", target: "' + target + '"'), action);
  }
  assert.match(app, /data-home-section="\$\{nextStep\.target\}"/);
  assert.match(app, /nextStep\.why/);
  assert.doesNotMatch(app, />Open Product workflow<\/button>/);
});

test("Home subsection navigation reloads authoritative data before moving focus", async () => {
  const app = await read("apps/desktop/ui/app.ts");
  const start = app.indexOf("function reload(): void");
  const end = app.indexOf("function rolesFrom(", start);
  assert.ok(start >= 0 && end > start);
  const reload = app.slice(start, end);
  assert.match(reload, /refresh\(\)\.then/);
  assert.match(reload, /pendingHomeSection = undefined/);
  assert.match(reload, /heading\.focus\(\{ preventScroll: true \}\)/);
  assert.match(reload, /heading\.scrollIntoView/);
  assert.match(reload, /main\.focus\(\)/);
  assert.match(app, /\["truth-heading", "icp-heading", "assessment-heading"\]\.includes\(button\.dataset\.homeSection/);
});

test("Readiness action exact-record routing remains owned by the existing UX completion shell", async () => {
  const shell = await read("apps/desktop/ui/ux-completion-shell.ts");
  assert.match(shell, /selectActiveReadinessAction/);
  assert.match(shell, /data-context="product_core"/);
  assert.match(shell, /data-kind="product_action"/);
  assert.match(shell, /data-record-id="\$\{escapeHtml\(action\.id\)\}"/);
});
