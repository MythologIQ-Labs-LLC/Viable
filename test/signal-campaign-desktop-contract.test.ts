import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path: string): Promise<string> => readFile(path, "utf8");

test("Signals desktop exposes governed Campaign materialization without bypassing destination authority", async () => {
  const view = await read("apps/desktop/ui/signals-view.ts");

  for (const marker of [
    "signals-materialize-campaign",
    "materializeCampaign",
    "Approved Product Core claims",
    "Reviewed Product Core evidence",
    "Create governed Campaign draft",
    "does not approve, publish, or deliver anything",
    "primaryOutcome",
    "primaryAudience",
    "messageHierarchy",
    "callToAction",
    "channels",
    "successMeasures",
  ]) assert.match(view, new RegExp(marker));

  assert.match(view, /isCampaignMaterializationKind/);
  assert.match(view, /claim\.status === "approved"/);
  assert.match(view, /isReviewedEvidence/);
  assert.match(view, /icp\.status === "selected" && icp\.reviewStatus === "reviewed"/);
  assert.match(view, /private product: ProductWorkspace \| undefined/);
});

test("Campaign materialization keeps the final unsupported Repository Growth destination visibly proposed", async () => {
  const view = await read("apps/desktop/ui/signals-view.ts");
  assert.match(view, /Repository-growth conversions remain proposed/);
  assert.match(view, /Destination-specific fields and authority checks are still required/);
});
