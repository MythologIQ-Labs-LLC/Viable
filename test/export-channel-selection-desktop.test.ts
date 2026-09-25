import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path: string): Promise<string> => readFile(path, "utf8");

test("Studio exposes package channel selection from approved campaign intent", async () => {
  const source = await read("apps/desktop/ui/campaigns-view.ts");
  assert.match(source, /Prepare an intentional channel package/);
  assert.match(source, /name=\\?"exportChannels\\?"/);
  assert.match(source, /campaign\.channels\.map/);
  assert.match(source, /approvedChannels\.has\(channel\) \? "checked" : "disabled"/);
  assert.match(source, /checkedValues\(form, "exportChannels"\)/);
  assert.match(source, /Create selected-channel package/);
  assert.doesNotMatch(source, /all three required channel variants first/);
});

test("Studio represents legacy all-three packages without mutating them", async () => {
  const source = await read("apps/desktop/ui/campaigns-view.ts");
  assert.match(source, /record\.channels \?\? CHANNELS/);
  assert.match(source, /Legacy all-channel package/);
  assert.match(source, /Included channels:/);
});

test("Campaign service persists included channels and keeps publication and delivery false", async () => {
  const source = await read("src/campaigns/services/campaign-service.ts");
  assert.match(source, /channels: selectedChannels/);
  assert.match(source, /includedChannels: selectedChannels/);
  assert.match(source, /approvedForPublishing: false, delivered: false/);
  assert.match(source, /Manual export channels must be included in the approved campaign intent/);
});

test("Calendar destination compatibility remains independently enforced", async () => {
  const source = await read("src/activation-learning/services/activation-learning-service.ts");
  assert.match(source, /variant\.status !== "approved" \|\| variant\.channel !== channel/);
  assert.match(source, /Destination channel requires its approved campaign variant/);
});