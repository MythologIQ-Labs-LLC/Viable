import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path: string): Promise<string> => readFile(path, "utf8");

test("Signals desktop binds repository work only to existing finding-backed Repository Growth authority", async () => {
  const view = await read("apps/desktop/ui/signals-view.ts");
  const materializer = await read("src/signals/services/signal-work-materialization-service.ts");
  const domain = await read("src/signals/domain/signal.ts");

  for (const marker of [
    "signals-materialize-repository-growth",
    "materializeRepositoryGrowthAction",
    "isRepositoryGrowthMaterializationKind",
    "Bind to Repository Growth action",
    "Finding-backed Repository Growth action",
    "Bind to authoritative Repository Growth action",
    "Repository Growth owns readiness findings and actions",
    "Signals will not overwrite",
  ]) assert.match(view, new RegExp(marker));

  assert.match(view, /\["repository", "repository_activity"\]\.includes\(signal\.kind\)/);
  assert.match(view, /action\.status === "open" \|\| action\.status === "in_progress"/);
  assert.match(materializer, /relationship\.targetId\.toLocaleLowerCase\("en-US"\) === repository\.fullName\.toLocaleLowerCase\("en-US"\)/);
  assert.match(materializer, /action\.title !== finding\.recommendation/);
  assert.match(materializer, /action\.impact !== finding\.impact/);
  assert.match(materializer, /action\.effort !== finding\.effort/);
  assert.match(materializer, /action\.verification !== finding\.verification/);
  assert.match(materializer, /recordSuccess\(inbox, conversion\.id, "repository_growth", action\.id\)/);
  assert.match(domain, /SignalMaterializationContext = "product_core" \| "campaigns" \| "calendar" \| "repository_growth"/);
});

test("Repository Growth desktop binding does not fabricate or mutate destination action authority", async () => {
  const view = await read("apps/desktop/ui/signals-view.ts");
  assert.match(view, /Select an existing active action for the same repository/);
  assert.match(view, /finding-derived recommendation, impact, effort, verification, owner, or status/);
  assert.doesNotMatch(view, /Create Repository Growth action/);
});
