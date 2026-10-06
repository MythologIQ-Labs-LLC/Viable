import assert from "node:assert/strict";
import test from "node:test";
import type { ActivationLearningWorkspace, ActivationSourceSnapshot, DestinationRecord } from "../src/activation-learning/domain/activation-learning.js";
import type { PublicationExecutionWorkspace } from "../src/activation-learning/domain/publication-execution.js";
import type { PublicationInventoryItem, PublicationPolicy } from "../src/activation-learning/domain/publication-inventory.js";
import type { ActivationLearningStore } from "../src/activation-learning/ports/activation-learning-store.js";
import type { PublicationSourceAuthorityPort } from "../src/activation-learning/ports/publication-source-authority.js";
import { PublicationSchedulerService } from "../src/activation-learning/services/publication-scheduler-service.js";

const workspaceId = "policy-workspace";
const destinationUpdatedAt = "2026-10-01T00:00:00.000Z";

class MemoryStore implements ActivationLearningStore {
  constructor(public value: PublicationExecutionWorkspace) {}
  async load(id: string): Promise<ActivationLearningWorkspace | undefined> { return id === workspaceId ? this.value : undefined; }
  async save(value: ActivationLearningWorkspace): Promise<void> { this.value = value as PublicationExecutionWorkspace; }
}

class Authority implements PublicationSourceAuthorityPort {
  constructor(private readonly values: readonly ActivationSourceSnapshot[]) {}
  async resolve(_workspaceId: string, _kind: ActivationSourceSnapshot["kind"], sourceId: string, channel: DestinationRecord["channel"]): Promise<ActivationSourceSnapshot> {
    const value = this.values.find((candidate) => candidate.sourceId === sourceId && candidate.channel === channel);
    if (!value) throw new Error("Source not found");
    return { ...value, capturedAt: "2026-10-04T12:00:00.000Z" };
  }
}

const destination: DestinationRecord = {
  id: "destination-1", workspaceId, label: "LinkedIn", channel: "linkedin", accountReference: "local-test",
  accountOwner: "Kevin", ownershipConfirmed: true, deliveryMode: "manual_only", capabilityNotes: [], rateLimitNotes: "",
  retryPolicy: "", dataHandlingNotes: "", status: "active", createdAt: destinationUpdatedAt, updatedAt: destinationUpdatedAt,
};

function source(id: string): ActivationSourceSnapshot {
  return {
    kind: "campaign_variant", sourceId: id, sourceVersion: 1, title: id, audience: "audience", channel: "linkedin",
    campaignId: "campaign", canonicalAssetId: `asset-${id}`, claimReferences: [], evidenceIds: [], rights: [],
    accessibilityRequirements: [], disclosureRequirements: [], body: id, capturedAt: "2026-10-04T12:00:00.000Z",
  };
}

function policy(overrides: Partial<PublicationPolicy> = {}): PublicationPolicy {
  return {
    id: "policy-1", workspaceId, label: "Policy", destinationId: destination.id, version: 1, timezone: "UTC",
    allowedWeekdays: [0, 1, 2, 3, 4, 5, 6], allowedWindows: [{ start: "00:00", end: "23:59" }],
    minimumCooldownMinutes: 0, lateToleranceMinutes: 30, retryLimit: 1, enabled: true,
    createdAt: destinationUpdatedAt, updatedAt: destinationUpdatedAt, ...overrides,
  };
}

function item(id: string, sourceValue: ActivationSourceSnapshot, overrides: Partial<PublicationInventoryItem> = {}): PublicationInventoryItem {
  return {
    id, workspaceId, destinationId: destination.id, destinationUpdatedAt, policyId: "policy-1", policyVersion: 1,
    source: sourceValue, status: "stocked", priority: 100, availableFrom: "2026-10-01T00:00:00.000Z", maxUses: 1,
    useCount: 0, reviewedBy: "Kevin", reviewedAt: "2026-10-04T12:00:00.000Z", reviewNote: "Approved",
    createdAt: "2026-10-04T11:00:00.000Z", updatedAt: "2026-10-04T12:00:00.000Z", ...overrides,
  };
}

function workspace(items: readonly PublicationInventoryItem[], policyValue = policy()): PublicationExecutionWorkspace {
  return {
    workspaceId, destinations: [destination], calendarEntries: [], publicationPolicies: [policyValue], publicationInventory: items,
    publicationJobs: [], publicationAttempts: [], packages: [], exportOperations: [], deliveryOutcomes: [], measurementPlans: [],
    performanceImports: [], retrospectives: [], learningLedger: [], updatedAt: "2026-10-04T12:00:00.000Z",
  };
}

function scheduler(store: MemoryStore, values: readonly ActivationSourceSnapshot[]): PublicationSchedulerService {
  let sequence = 0;
  return new PublicationSchedulerService(store, new Authority(values), undefined, () => new Date("2026-10-05T12:00:00.000Z"), () => `id-${++sequence}`);
}

test("candidate ordering is priority, expiry, oldest approval, then stable id", async () => {
  const a = source("a"), b = source("b"), c = source("c"), d = source("d"), e = source("e");
  const store = new MemoryStore(workspace([
    item("e", e, { priority: 2, expiresAt: "2026-10-07T00:00:00.000Z" }),
    item("d", d, { priority: 1, expiresAt: "2026-10-08T00:00:00.000Z", reviewedAt: "2026-10-03T12:00:00.000Z" }),
    item("c", c, { priority: 1, expiresAt: "2026-10-07T00:00:00.000Z", reviewedAt: "2026-10-04T12:00:00.000Z" }),
    item("b", b, { priority: 1, expiresAt: "2026-10-07T00:00:00.000Z", reviewedAt: "2026-10-03T12:00:00.000Z" }),
    item("a", a, { priority: 1, expiresAt: "2026-10-07T00:00:00.000Z", reviewedAt: "2026-10-03T12:00:00.000Z" }),
  ]));
  const service = scheduler(store, [a, b, c, d, e]);
  const result = await service.scheduleNext(workspaceId, "2026-10-05T12:00:00.000Z");
  assert.equal(result.action, "scheduled");
  assert.equal(store.value.publicationJobs?.[0]?.inventoryItemId, "a");
});

test("publication window moves scheduling to the next opening", async () => {
  const value = source("window");
  const store = new MemoryStore(workspace([item("window-item", value)], policy({ allowedWindows: [{ start: "09:00", end: "10:00" }] })));
  await scheduler(store, [value]).scheduleNext(workspaceId, "2026-10-05T08:17:31.000Z");
  assert.equal(store.value.publicationJobs?.[0]?.scheduledFor, "2026-10-05T09:00:00.000Z");
});

test("minimum cooldown moves the next job beyond the configured gap", async () => {
  const first = source("first"), second = source("second");
  const store = new MemoryStore(workspace([
    item("first-item", first, { priority: 1 }), item("second-item", second, { priority: 2 }),
  ], policy({ minimumCooldownMinutes: 120 })));
  const service = scheduler(store, [first, second]);
  await service.scheduleNext(workspaceId, "2026-10-05T12:00:00.000Z");
  await service.scheduleNext(workspaceId, "2026-10-05T12:01:00.000Z");
  assert.equal(store.value.publicationJobs?.[0]?.scheduledFor, "2026-10-05T12:00:00.000Z");
  assert.equal(store.value.publicationJobs?.[1]?.scheduledFor, "2026-10-05T14:00:00.000Z");
});

test("weekly maximum moves additional work into the next local week", async () => {
  const first = source("first"), second = source("second");
  const store = new MemoryStore(workspace([
    item("first-item", first, { priority: 1 }), item("second-item", second, { priority: 2 }),
  ], policy({ maximumPerWeek: 1 })));
  const service = scheduler(store, [first, second]);
  await service.scheduleNext(workspaceId, "2026-10-05T12:00:00.000Z");
  await service.scheduleNext(workspaceId, "2026-10-05T12:01:00.000Z");
  assert.equal(store.value.publicationJobs?.[1]?.scheduledFor, "2026-10-12T00:00:00.000Z");
});
