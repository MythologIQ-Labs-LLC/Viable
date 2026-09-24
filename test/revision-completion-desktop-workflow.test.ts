import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path: string): Promise<string> => readFile(path, "utf8");

test("desktop loads the revision completion shell after the cross-workflow shell", async () => {
  const html = await read("apps/desktop/web/index.html");
  const ux = html.indexOf("ux-completion-shell.js");
  const revision = html.indexOf("revision-completion-shell.js");
  assert.ok(ux >= 0);
  assert.ok(revision > ux);
});

test("Product Truth correction exposes every modeled user-controlled field without JSON authoring", async () => {
  const shell = await read("apps/desktop/ui/revision-completion-shell.ts");
  for (const field of [
    "name", "description", "lifecycle", "supportedEnvironments", "capabilities", "limitations", "positioning",
    "alternatives", "differentiation", "pricing", "packaging", "offers", "callsToAction", "brandVoice", "terminology", "accessibilityConstraints",
  ]) assert.match(shell, new RegExp(`name=\\"${field}\\"`));
  assert.match(shell, /Save Product Truth revision/);
  assert.match(shell, /term = preferred wording/);
  assert.doesNotMatch(shell, /JSON\.parse\(String\(data\.get\("terminology"\)/);
  assert.match(shell, /productTruthHistory/);
});

test("ICP correction and validation experiment outcome controls remain inside Product Core authority", async () => {
  const shell = await read("apps/desktop/ui/revision-completion-shell.ts");
  for (const marker of [
    "Save ICP correction for re-review", "Correct ICP and inspect revision history", "Start experiment", "Complete with outcome evidence",
    "Outcome evidence", "Outcome summary", "Decision from this evidence", "Cancel with rationale", "productRevision.reviseIcp",
    "productRevision.startExperiment", "productRevision.completeExperiment", "productRevision.cancelExperiment",
  ]) assert.match(shell, new RegExp(marker, "i"));
  assert.match(shell, /campaignRevision\.revalidateProductAuthority/);
});

test("Campaign, content brief, and channel variant corrections use governed revision services and preserve failed form input", async () => {
  const shell = await read("apps/desktop/ui/revision-completion-shell.ts");
  for (const marker of [
    "Save campaign correction for re-review", "Save content brief correction for re-review", "Save channel correction for re-review",
    "campaignRevision.reviseCampaign", "campaignRevision.reviseContentBrief", "campaignRevision.reviseVariant",
    "Correction was not saved", "Your entered values are still here", "Revision rationale", "revision history",
  ]) assert.match(shell, new RegExp(marker, "i"));
  assert.doesNotMatch(shell, /signalsStore\.save/);
});
