import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path: string): Promise<string> => readFile(path, "utf8");

test("Signals desktop materializes Website Watch response work through existing Calendar authority", async () => {
  const view = await read("apps/desktop/ui/signals-view.ts");
  const materializer = await read("src/signals/services/signal-work-materialization-service.ts");
  const domain = await read("src/signals/domain/signal.ts");

  for (const marker of [
    "signals-materialize-website-action",
    "materializeWebsiteWatchAction",
    "Materialize Website Watch response",
    "Create authoritative Calendar response plan",
    "Website Watch remains authoritative for the reviewed observation; Calendar owns the response plan",
    "does not publish, notify a provider, alter Product Core, or claim delivery",
  ]) assert.match(view, new RegExp(marker));

  assert.match(view, /isWebsiteWatchMaterializationKind/);
  assert.match(view, /signal\.kind !== "website_change"/);
  assert.match(view, /observation\.reviewState !== "reviewed"/);
  assert.match(materializer, /relatedRecordId = `signal-conversion:\$\{conversion\.id\}`/);
  assert.match(materializer, /recordSuccess\(inbox, conversion\.id, "calendar", entry\.id\)/);
  assert.match(domain, /SignalMaterializationContext = "product_core" \| "campaigns" \| "calendar" \| "repository_growth"/);
});

test("Website Watch response materialization coexists with finding-backed Repository Growth binding", async () => {
  const view = await read("apps/desktop/ui/signals-view.ts");
  assert.match(view, /Website Watch response proposals can materialize into authoritative Calendar planning/);
  assert.match(view, /Repository-growth proposals can bind only to an active finding-backed Repository Growth action/);
});
