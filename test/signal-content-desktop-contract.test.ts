import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path: string): Promise<string> => readFile(path, "utf8");

test("Signals desktop exposes Campaign-owned content brief materialization without collapsing it into an asset", async () => {
  const view = await read("apps/desktop/ui/signals-view.ts");

  for (const marker of [
    "signals-materialize-content",
    "materializeContent",
    "Approved campaign",
    "Content objective",
    "Content pillars",
    "Planned deliverables",
    "Source notes",
    "Create governed content brief",
    "Content briefs live in Campaigns and Assets",
    "does not create a canonical asset, channel variant, export, publication, or delivery",
  ]) assert.match(view, new RegExp(marker));

  assert.match(view, /isContentMaterializationKind/);
  assert.match(view, /campaign\.status === "approved"/);
  assert.match(view, /content proposals can become Campaign-owned content briefs under an approved campaign/);
});

test("Signals desktop preserves finding-backed Repository Growth destination authority", async () => {
  const view = await read("apps/desktop/ui/signals-view.ts");
  assert.match(view, /Repository-growth proposals can bind only to an active finding-backed Repository Growth action/);
});
