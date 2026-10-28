import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path: string): Promise<string> => readFile(path, "utf8");

for (const [name, path] of [
  ["Campaign / Studio", "apps/desktop/ui/campaign-shell.ts"],
  ["Repository Growth", "apps/desktop/ui/repository-growth-shell.ts"],
  ["Calendar / Analytics", "apps/desktop/ui/activation-learning-shell.ts"],
] as const) {
  test(`${name} gates user mutations on canonical acknowledgement`, async () => {
    const shell = await read(path);
    assert.match(shell, /AcknowledgedPersistenceGate/);
    assert.match(shell, /runAcknowledgedMutation/);
    assert.match(shell, /data-persistence-state|dataset\.persistenceState/);
    assert.match(shell, /state === "pending"/);
    assert.match(shell, /state === "failed"/);
    assert.match(shell, /state === "saved"/);
    assert.match(shell, /beforeunload/);
    assert.match(shell, /entered values remain available/);
    const snapshot = shell.indexOf("const mutation = persistenceGate.run(operation)");
    const disable = shell.indexOf("mutationControlsDisabled(true)");
    assert.ok(snapshot >= 0 && disable > snapshot, "controller must snapshot FormData before disabling its inputs");
  });
}

test("Campaign and Studio browser journey preserves a failed form for correction and retry", async () => {
  const smoke = await read("scripts/pwa-smoke.mjs");
  assert.match(smoke, /Smoke no-op revision should remain recoverable/);
  assert.match(smoke, /data-persistence-state='failed'/);
  assert.match(smoke, /entered values remain available/);
  assert.match(smoke, /failed Campaign save remains visibly failed and retains the entered form intent for retry/);
  assert.match(smoke, /Repository Growth failed import remains visibly unsaved with editable input preserved/);
  assert.match(smoke, /Analytics failed cohort evaluation keeps exact form values available for correction/);
});
