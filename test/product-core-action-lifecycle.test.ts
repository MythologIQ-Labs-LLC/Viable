import assert from "node:assert/strict";
import test from "node:test";
import type { ProductWorkspace } from "../src/product-core/domain/workspace.js";
import type { ProductWorkspaceStore } from "../src/product-core/ports/product-workspace-store.js";
import { ProductCoreService } from "../src/product-core/services/product-core-service.js";

class MemoryWorkspaceStore implements ProductWorkspaceStore {
  value?: ProductWorkspace;
  async save(workspace: ProductWorkspace): Promise<void> { this.value = workspace; }
  async load(workspaceId: string): Promise<ProductWorkspace | undefined> { return this.value?.id === workspaceId ? this.value : undefined; }
}

function serviceFixture() {
  const store = new MemoryWorkspaceStore();
  let sequence = 0;
  const service = new ProductCoreService(store, () => new Date("2026-09-24T15:30:00.000Z"), () => `id-${++sequence}`);
  return { store, service };
}

async function createWorkspace(service: ProductCoreService): Promise<ProductWorkspace> {
  return service.createWorkspace({
    identity: { name: "Viable", description: "Local-first marketability operating system", lifecycle: "prototype", supportedEnvironments: ["desktop"] },
    createdBy: "Kevin",
  });
}

test("Product Core readiness actions require named lifecycle actors and completion evidence or rationale", async () => {
  const { service, store } = serviceFixture();
  const workspace = await createWorkspace(service);
  await service.createAction(workspace.id, {
    source: "product_gap",
    sourceId: "gap-1",
    title: "Verify onboarding proof",
    owner: "Kevin",
    kind: "action",
    verification: "Review five completed onboarding sessions",
  });
  const actionId = store.value!.actions[0]!.id;

  await assert.rejects(() => service.startAction(workspace.id, actionId, ""), /named actor/i);
  await assert.rejects(() => service.completeAction(workspace.id, actionId, { actor: "Kevin", evidence: "Five sessions reviewed" }), /must be started/i);

  await service.startAction(workspace.id, actionId, "Kevin");
  await service.assignActionOwner(workspace.id, actionId, "Kevin", "Morgan", "Morgan owns onboarding validation");
  await assert.rejects(() => service.completeAction(workspace.id, actionId, { actor: "Morgan" }), /verification evidence or a completion rationale/i);
  const completed = await service.completeAction(workspace.id, actionId, { actor: "Morgan", evidence: "Five sessions reviewed; four completed without intervention" });

  const action = completed.actions[0]!;
  assert.equal(action.status, "completed");
  assert.equal(action.owner, "Morgan");
  assert.equal(action.startedBy, "Kevin");
  assert.equal(action.ownerAssignedBy, "Kevin");
  assert.equal(action.ownerAssignmentRationale, "Morgan owns onboarding validation");
  assert.equal(action.completedBy, "Morgan");
  assert.equal(action.completionEvidence, "Five sessions reviewed; four completed without intervention");
  assert.equal(action.verification, "Review five completed onboarding sessions");
  await assert.rejects(() => service.dismissAction(workspace.id, actionId, "Kevin", "No longer needed"), /Only active readiness actions/i);
});

test("Product Core readiness actions preserve explicit dismissal rationale and prior records", async () => {
  const { service, store } = serviceFixture();
  const workspace = await createWorkspace(service);
  await service.createAction(workspace.id, { source: "signal", sourceId: "conversion-1", title: "Investigate reviewed signal", owner: "Kevin", kind: "action" });
  await service.createAction(workspace.id, { source: "product_gap", sourceId: "gap-2", title: "Retain this action", owner: "Kevin", kind: "action" });
  const [dismissedId, retainedId] = store.value!.actions.map((item) => item.id);

  await assert.rejects(() => service.dismissAction(workspace.id, dismissedId!, "Kevin", ""), /rationale/i);
  const updated = await service.dismissAction(workspace.id, dismissedId!, "Kevin", "Signal is superseded by newer reviewed evidence");

  assert.equal(updated.actions.length, 2);
  assert.equal(updated.actions.find((item) => item.id === dismissedId)?.status, "dismissed");
  assert.equal(updated.actions.find((item) => item.id === dismissedId)?.dismissedBy, "Kevin");
  assert.equal(updated.actions.find((item) => item.id === dismissedId)?.dismissalRationale, "Signal is superseded by newer reviewed evidence");
  assert.equal(updated.actions.find((item) => item.id === retainedId)?.status, "open");
});

test("readiness action lifecycle metadata is additive and legacy active actions remain compatible", async () => {
  const { service, store } = serviceFixture();
  const workspace = await createWorkspace(service);
  store.value = {
    ...workspace,
    actions: [{ id: "legacy-action", source: "product_gap", sourceId: "legacy-gap", title: "Legacy readiness work", owner: "Kevin", kind: "action", status: "open" }],
  };

  const started = await service.startAction(workspace.id, "legacy-action", "Kevin");
  assert.equal(started.actions[0]?.status, "in_progress");
  assert.equal(started.actions[0]?.startedBy, "Kevin");
  assert.equal(started.actions[0]?.verification, undefined);
});
