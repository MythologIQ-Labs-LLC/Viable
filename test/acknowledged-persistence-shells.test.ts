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
    assert.match(shell, /result\.value === undefined/, "cancelled/no-op actions must not claim a durable write");
    assert.match(shell, /Change acknowledged, but the view could not refresh/, "post-commit refresh failures must not be reported as failed writes");
    const snapshot = shell.indexOf("const mutation = persistenceGate.run(operation)");
    const disable = shell.indexOf("mutationControlsDisabled(true)");
    assert.ok(snapshot >= 0 && disable > snapshot, "controller must snapshot FormData before disabling its inputs");
  });
}

test("Product Core and Signals share the acknowledged mutation boundary", async () => {
  const shell = await read("apps/desktop/ui/app.ts");
  assert.match(shell, /AcknowledgedPersistenceGate/);
  assert.match(shell, /const mutation = persistenceGate\.run\(task\)/);
  assert.match(shell, /entered values remain available to correct and retry/);
  assert.match(shell, /beforeunload/);
  assert.match(shell, /signalsController!\.submit\(formElement\), "Signals change saved", true/);
  assert.match(shell, /signalsController!\.click\(button\), "Signals action saved", true/);
  assert.match(shell, /requiresSavedResult && result\.value === undefined/);
  assert.match(shell, /No change was recorded\./);
  assert.doesNotMatch(shell, /Signal operation failed:[^\n]*\}\);\s*return;/);
});

test("Workspace lifecycle serializes destructive operations through durable acknowledgement", async () => {
  const shell = await read("apps/desktop/ui/workspace-lifecycle-shell.ts");
  assert.match(shell, /durableActionPending/);
  assert.match(shell, /setDurableActionPending\(true\)/);
  assert.match(shell, /setDurableActionPending\(false\)/);
  assert.match(shell, /workspaceStorage\.commit\(\)/);
  assert.match(shell, /beforeunload/);
  assert.match(shell, /Workspace deletion or restore is still pending/);
});

test("Contextual human reviews remain pending until their owning workflow acknowledges the save", async () => {
  const shell = await read("apps/desktop/ui/contextual-review-shell.ts");
  assert.match(shell, /resetReviewFormsAfterFailure/);
  assert.match(shell, /Review decision submitted to the owning workflow\. Durable acknowledgement is pending/);
  assert.match(shell, /Wait for acknowledgement before closing this panel/);
  assert.doesNotMatch(shell, /Review decision sent to the owning workflow for durable recording/);
});

test("Campaign and Studio browser journey preserves a failed form for correction and retry", async () => {
  const smoke = await read("scripts/pwa-smoke.mjs");
  assert.match(smoke, /Smoke no-op revision should remain recoverable/);
  assert.match(smoke, /data-persistence-state='failed'/);
  assert.match(smoke, /entered values remain available/);
  assert.match(smoke, /failed Campaign save remains visibly failed and retains the entered form intent for retry/);
  assert.match(smoke, /Repository Growth failed import remains visibly unsaved with editable input preserved/);
  assert.match(smoke, /Analytics failed cohort evaluation keeps exact form values available for correction/);
  assert.match(smoke, /workspace deletion disables the visible submit control until its durable commit acknowledges/);
});
