import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path: string): Promise<string> => readFile(path, "utf8");

test("desktop loads guided import and media review UX after workspace lifecycle", async () => {
  const html = await read("apps/desktop/web/index.html");
  const workspace = html.indexOf("workspace-lifecycle-shell.js");
  const guided = html.indexOf("guided-import-media-review-shell.js");
  assert.ok(workspace >= 0);
  assert.ok(guided > workspace);
  assert.match(html, /guided-import-media-review\.css/);
});

test("Signals exposes guided ordinary imports and visibly separates raw adapter JSON as advanced", async () => {
  const shell = await read("apps/desktop/ui/guided-import-media-review-shell.ts");
  for (const marker of [
    'data-guided-import="event"',
    'data-guided-import="manual"',
    "Validate and import event evidence",
    "Add unreviewed evidence proposal",
    "Advanced: raw JSON adapter imports",
    "Advanced: paste raw Webdog JSON",
    "buildGuidedManualSignalPayload",
    "parseEventIntelligenceImport",
  ]) assert.match(shell, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
});

test("guided video import derives technical metadata instead of asking ordinary users for hashes and IDs", async () => {
  const shell = await read("apps/desktop/ui/guided-import-media-review-shell.ts");
  assert.match(shell, /Import produced video files/);
  assert.match(shell, /crypto\.randomUUID\(\)/);
  assert.match(shell, /crypto\.subtle\.digest\("SHA-256"/);
  assert.match(shell, /render\.size/);
  assert.match(shell, /render\.type/);
  assert.match(shell, /review\/final-render/);
  assert.match(shell, /Media bytes and local filenames are not persisted/);
  assert.match(shell, /Advanced: technical artifact metadata import/);
  assert.doesNotMatch(shell, /localStorage\.setItem/);
});

test("video approval is gated on a matching local render and required captions while rejection remains available", async () => {
  const shell = await read("apps/desktop/ui/guided-import-media-review-shell.ts");
  assert.match(shell, /data-video-action=\\?"review-artifact\\?"/);
  assert.match(shell, /data-decision=\\?"approved\\?"/);
  assert.match(shell, /approve\.disabled = !verified/);
  assert.match(shell, /selected video does not match the durable artifact hash and byte size/);
  assert.match(shell, /selected caption file does not match the durable artifact hash and byte size/);
  assert.match(shell, /brief\.captionsRequired/);
  assert.doesNotMatch(shell, /data-decision=\\?"changes_requested\\?"[^\n]+disabled/);
  assert.doesNotMatch(shell, /data-decision=\\?"rejected\\?"[^\n]+disabled/);
});

test("media review keeps media session-local while showing playback captions transcript and provenance together", async () => {
  const shell = await read("apps/desktop/ui/guided-import-media-review-shell.ts");
  for (const marker of [
    "URL.createObjectURL",
    "<video controls",
    '<track kind="captions"',
    "Caption transcript",
    "media-provenance",
    "session attachment required",
    "On reopen, reattach the local files",
    "SHA-256",
  ]) assert.match(shell, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(shell, /URL\.revokeObjectURL/);
  assert.doesNotMatch(shell, /writeWorkspaceJson/);
});

test("guided failures identify the repair and retain selected files and entered values", async () => {
  const shell = await read("apps/desktop/ui/guided-import-media-review-shell.ts");
  assert.match(shell, /This input was not imported/);
  assert.match(shell, /Your selected files and entered values remain on this screen/);
  assert.match(shell, /role=\\?"alert\\?"/);
  assert.match(shell, /\.focus\(\)/);
});

test("advanced raw signal adapters reject secret-like content too", async () => {
  const manual = await read("src/signals/adapters/manual-json-signal-source.ts");
  const event = await read("src/signals/adapters/event-intelligence-signal-source.ts");
  assert.match(manual, /assertNoCredentialLikeText\(this\.input/);
  assert.match(event, /assertNoCredentialLikeText\(JSON\.stringify\(this\.run\)/);
});
