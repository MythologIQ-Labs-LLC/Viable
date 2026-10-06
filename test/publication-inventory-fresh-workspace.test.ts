import assert from "node:assert/strict";
import test from "node:test";
import type { ActivationLearningWorkspace } from "../src/activation-learning/domain/activation-learning.js";
import type { ActivationLearningStore } from "../src/activation-learning/ports/activation-learning-store.js";
import type { PublicationSourceAuthorityPort } from "../src/activation-learning/ports/publication-source-authority.js";
import { PublicationInventoryService } from "../src/activation-learning/services/publication-inventory-service.js";

class EmptyActivationStore implements ActivationLearningStore {
  value?: ActivationLearningWorkspace;
  async load(): Promise<ActivationLearningWorkspace | undefined> { return this.value; }
  async save(value: ActivationLearningWorkspace): Promise<void> { this.value = value; }
}

const sourceAuthority: PublicationSourceAuthorityPort = {
  async resolve() {
    throw new Error("Fresh inventory load must not resolve publication authority");
  },
};

test("publication inventory loads an empty first-run activation workspace without persisting phantom authority", async () => {
  const store = new EmptyActivationStore();
  const service = new PublicationInventoryService(store, sourceAuthority, () => new Date("2026-10-04T12:00:00.000Z"));

  const workspace = await service.load("workspace-1");

  assert.equal(workspace.workspaceId, "workspace-1");
  assert.deepEqual(workspace.destinations, []);
  assert.deepEqual(workspace.calendarEntries, []);
  assert.deepEqual(workspace.publicationPolicies, []);
  assert.deepEqual(workspace.publicationInventory, []);
  assert.equal(store.value, undefined);
});
