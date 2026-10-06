import assert from "node:assert/strict";
import test from "node:test";
import { LocalStorageActivationLearningStore } from "../apps/desktop/ui/local-storage-activation-learning-store.js";
import type { PublicationExecutionWorkspace } from "../src/activation-learning/domain/publication-execution.js";

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>();
  get length(): number { return this.values.size; }
  clear(): void { this.values.clear(); }
  getItem(key: string): string | null { return this.values.get(key) ?? null; }
  key(index: number): string | null { return [...this.values.keys()][index] ?? null; }
  removeItem(key: string): void { this.values.delete(key); }
  setItem(key: string, value: string): void { this.values.set(key, value); }
}

const workspaceId = "execution-storage";
const storageKey = `viable.activation-learning.${workspaceId}`;
const legacyWorkspace = {
  workspaceId,
  destinations: [],
  calendarEntries: [],
  publicationPolicies: [],
  publicationInventory: [],
  packages: [],
  exportOperations: [],
  deliveryOutcomes: [],
  measurementPlans: [],
  performanceImports: [],
  retrospectives: [],
  learningLedger: [],
  updatedAt: "2026-10-04T00:00:00.000Z",
};

test("Activation storage defaults absent publication execution ledger arrays", async () => {
  const storage = new MemoryStorage();
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: storage });
  storage.setItem(storageKey, JSON.stringify(legacyWorkspace));

  const loaded = await new LocalStorageActivationLearningStore().load(workspaceId) as PublicationExecutionWorkspace | undefined;
  assert.deepEqual(loaded?.publicationJobs, []);
  assert.deepEqual(loaded?.publicationAttempts, []);
  assert.equal(storage.getItem(storageKey), JSON.stringify(legacyWorkspace));
});

test("Activation storage rejects malformed publication execution ledger arrays", async () => {
  const storage = new MemoryStorage();
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: storage });
  const malformed = JSON.stringify({ ...legacyWorkspace, publicationJobs: "not-an-array", publicationAttempts: [] });
  storage.setItem(storageKey, malformed);

  await assert.rejects(
    () => new LocalStorageActivationLearningStore().load(workspaceId),
    /publicationJobs/,
  );
  assert.equal(storage.getItem(storageKey), malformed);
});
