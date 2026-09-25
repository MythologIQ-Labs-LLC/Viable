import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path: string): Promise<string> => readFile(path, "utf8");

test("desktop loads progressive draft UX after revision and authority shells", async () => {
  const html = await read("apps/desktop/web/index.html");
  const authority = html.indexOf("authority-revalidation-shell.js");
  const progressive = html.indexOf("progressive-draft-shell.js");
  const stale = html.indexOf("stale-draft-evidence-shell.js");
  const continuity = html.indexOf("draft-step-continuity-shell.js");
  assert.ok(authority >= 0);
  assert.ok(progressive > authority);
  assert.ok(stale > progressive);
  assert.ok(continuity > stale);
  assert.match(html, /progressive-drafts\.css/);
});

test("ICP and assessment long forms are replaced by resumable progressive draft surfaces", async () => {
  const shell = await read("apps/desktop/ui/progressive-draft-shell.ts");
  for (const marker of [
    'form[data-form="add-icp"]', 'form[data-form="add-assessment"]', 'data-ux-draft-form="icp"', 'data-ux-draft-form="assessment"',
    "Save draft and continue", "Complete draft as an unreviewed ICP candidate", "Complete explained assessment", "Discard saved draft",
  ]) assert.match(shell, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(shell, /closest\("details"\)\?\.setAttribute\("hidden", "true"\)/);
});

test("draft UX makes evidence selection explicit per conclusion instead of silently attaching all reviewed evidence", async () => {
  const shell = await read("apps/desktop/ui/progressive-draft-shell.ts");
  assert.match(shell, /Explicit supporting evidence/);
  assert.match(shell, /Unchecked records remain reviewed context and are not attached to this conclusion/);
  assert.match(shell, /evidenceChoices\(evidence, `\$\{dimension\}\.evidenceIds`/);
  assert.match(shell, /checked\(data, `\$\{dimension\}\.evidenceIds`\)/);
  assert.doesNotMatch(shell, /reviewStatus === "reviewed"[^\n]+map\(\(item\) => item\.id\)/);
});

test("previously linked evidence that loses authority stays visible and requires deliberate removal", async () => {
  const progressive = await read("apps/desktop/ui/progressive-draft-shell.ts");
  const stale = await read("apps/desktop/ui/stale-draft-evidence-shell.ts");
  assert.match(progressive, /Previously linked evidence is no longer eligible/);
  assert.match(progressive, /data-ux-stale-evidence/);
  assert.match(stale, /They remain attached to the saved draft until you explicitly uncheck them/);
  assert.match(stale, /input\.checked = true/);
  assert.match(stale, /no longer eligible; uncheck to remove this saved link/);
  assert.match(stale, /input\.name = `\$\{dimension\}\.evidenceIds`/);
  assert.doesNotMatch(stale, /\.save\(/);
});

test("save-and-continue restores the next progressive step without moving draft authority into session storage", async () => {
  const continuity = await read("apps/desktop/ui/draft-step-continuity-shell.ts");
  assert.match(continuity, /viable\.draft-step/);
  assert.match(continuity, /Math\.min\(index \+ 1, steps\.length - 1\)/);
  assert.match(continuity, /step\.open = step === target/);
  assert.match(continuity, /View position is optional; draft authority remains persisted in Product Core/);
  assert.doesNotMatch(continuity, /ProductDraftService/);
  assert.doesNotMatch(continuity, /\.save\(/);
});

test("validation failure and navigation recovery preserve entered draft values", async () => {
  const shell = await read("apps/desktop/ui/progressive-draft-shell.ts");
  assert.match(shell, /Your entered values are still on this screen/);
  assert.match(shell, /Complete the highlighted fields before turning this draft into authority/);
  assert.match(shell, /aria-invalid/);
  assert.match(shell, /window\.confirm\("This draft has unsaved changes/);
  assert.match(shell, /beforeunload/);
  assert.match(shell, /dirtyForm/);
});
