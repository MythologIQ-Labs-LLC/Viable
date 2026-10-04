import assert from "node:assert/strict";
import test from "node:test";
import type {
  ActivationLearningWorkspace,
  ActivationSourceSnapshot,
  DestinationRecord,
} from "../src/activation-learning/domain/activation-learning.js";
import type {
  PublicationExecutionWorkspace,
  PublicationJob,
} from "../src/activation-learning/domain/publication-execution.js";
import type { PublicationInventoryItem, PublicationPolicy } from "../src/activation-learning/domain/publication-inventory.js";
import { DeterministicFakePublicationProvider } from "../src/activation-learning/adapters/deterministic-fake-publication-provider.js";
import type { ActivationLearningStore } from "../src/activation-learning/ports/activation-learning-store.js";
import type { PublicationSourceAuthorityPort } from "../src/activation-learning/ports/publication-source-authority.js";
import { PublicationSchedulerService } from "../src/activation-learning/services/publication-scheduler-service.js";

const WORKSPACE_ID = "workspace-1";
const NOW = "2026-10-05T14:00:00.000Z";

class MemoryStore implements ActivationLearningStore {
  constructor(public value: PublicationExecutionWorkspace) {}
  async load(workspaceId: string): Promise<ActivationLearningWorkspace | undefined> {
    return workspaceId === this.value.workspaceId ? this.value : undefined;
  }
  async save(value: ActivationLearningWorkspace): Promise<void> {
    this.value = value as PublicationExecutionWorkspace;
  }
}

class SourceAuthority implements PublicationSourceAuthorityPort {
  readonly snapshots = new Map<string, ActivationSourceSnapshot>();

  constructor(values: readonly ActivationSourceSnapshot[]) {
    for (const value of values) this.snapshots.set(value.sourceId, value);
  }

  async resolve(
    _workspaceId: string,
    _kind: ActivationSourceSnapshot["kind"],
    sourceId: string,
    channel: DestinationRecord["channel"],
  ): Promise<ActivationSourceSnapshot> {
    const value = this.snapshots.get(sourceId);
    if (!value) throw new Error("Source not found");
    if (value.channel !== channel) throw new Error("Source channel mismatch");
    return { ...value, capturedAt: new Date().toISOString() };
  }
}

function source(id = "source-1", version = 1): ActivationSourceSnapshot {
  return {
    kind: "campaign_variant",
    sourceId: id,
    sourceVersion: version,
    title: `Source ${id}`,
    audience: "Test audience",
    channel: "linkedin",
    campaignId: "campaign-1",
    canonicalAssetId: `asset-${id}`,
    claimReferences: [],
    evidenceIds: [],
    rights: [],
    accessibilityRequirements: [],
    disclosureRequirements: [],
    body: `Body ${id} v${version}`,
    capturedAt: NOW,
  };
}

function destination(): DestinationRecord {
  return {
    id: "destination-1",
    workspaceId: WORKSPACE_ID,
    label: "LinkedIn test destination",
    channel: "linkedin",
    accountReference: "account-ref",
    accountOwner: "Kevin",
    ownershipConfirmed: true,
    deliveryMode: "manual_only",
    capabilityNotes: [],
    rateLimitNotes: "",
    retryPolicy: "",
    dataHandlingNotes: "",
    status: "active",
    createdAt: "2026-10-01T00:00:00.000Z",
    updatedAt: "2026-10-01T00:00:00.000Z",
  };
}

function policy(overrides: Partial<PublicationPolicy> = {}): PublicationPolicy {
  return {
    id: "policy-1",
    workspaceId: WORKSPACE_ID,
    label: "Always-on test policy",
    destinationId: "destination-1",
    version: 1,
    timezone: "UTC",
    allowedWeekdays: [0, 1, 2, 3, 4, 5, 6],
    allowedWindows: [{ start: "00:00", end: "23:59" }],
    minimumCooldownMinutes: 0,
    lateToleranceMinutes: 10,
    retryLimit: 1,
    enabled: true,
    createdAt: "2026-10-01T00:00:00.000Z",
    updatedAt: "2026-10-01T00:00:00.000Z",
    ...overrides,
  };
}

function item(id = "item-1", sourceValue = source(), overrides: Partial<PublicationInventoryItem> = {}): PublicationInventoryItem {
  return {
    id,
    workspaceId: WORKSPACE_ID,
    destinationId: "destination-1",
    destinationUpdatedAt: "2026-10-01T00:00:00.000Z",
    policyId: "policy-1",
    policyVersion: 1,
    source: sourceValue,
    status: "stocked",
    priority: 10,
    availableFrom: "2026-10-01T00:00:00.000Z",
    maxUses: 1,
    useCount: 0,
    reviewedBy: "Kevin",
    reviewedAt: "2026-10-04T12:00:00.000Z",
    reviewNote: "Approved for deterministic scheduler test",
    createdAt: "2026-10-04T11:00:00.000Z",
    updatedAt: "2026-10-04T12:00:00.000Z",
    ...overrides,
  };
}

function workspace(items: readonly PublicationInventoryItem[] = [item()], policyValue: PublicationPolicy = policy()): PublicationExecutionWorkspace {
  return {
    workspaceId: WORKSPACE_ID,
    destinations: [destination()],
    calendarEntries: [],
    publicationPolicies: [policyValue],
    publicationInventory: items,
    publicationJobs: [],
    publicationAttempts: [],
    packages: [],
    exportOperations: [],
    deliveryOutcomes: [],
    measurementPlans: [],
    performanceImports: [],
    retrospectives: [],
    learningLedger: [],
    updatedAt: NOW,
  };
}

function ids(prefix = "id"): () => string {
  let sequence = 0;
  return () => `${prefix}-${++sequence}`;
}

function service(
  store: MemoryStore,
  authority: SourceAuthority,
  provider = new DeterministicFakePublicationProvider(),
): PublicationSchedulerService {
  return new PublicationSchedulerService(
    store,
    authority,
    provider,
    () => new Date(NOW),
    ids(),
  );
}

test("publishes one approved inventory item exactly once", async () => {
  const sourceValue = source();
  const store = new MemoryStore(workspace([item("item-1", sourceValue)]));
  const authority = new SourceAuthority([sourceValue]);
  const provider = new DeterministicFakePublicationProvider();
  const scheduler = service(store, authority, provider);

  const result = await scheduler.runOnce(WORKSPACE_ID, NOW);
  assert.equal(result.action, "published");
  assert.equal(provider.requests.length, 1);
  assert.equal(store.value.publicationJobs?.[0]?.status, "published");
  assert.equal(store.value.publicationInventory?.[0]?.status, "depleted");
  assert.equal(store.value.publicationInventory?.[0]?.useCount, 1);

  const second = await scheduler.runOnce(WORKSPACE_ID, "2026-10-05T14:01:00.000Z");
  assert.equal(second.action, "none");
  assert.equal(provider.requests.length, 1);
});

test("empty inventory creates no publication job", async () => {
  const store = new MemoryStore(workspace([]));
  const authority = new SourceAuthority([]);
  const provider = new DeterministicFakePublicationProvider();
  const scheduler = service(store, authority, provider);

  const result = await scheduler.runOnce(WORKSPACE_ID, NOW);
  assert.equal(result.action, "none");
  assert.equal(store.value.publicationJobs?.length, 0);
  assert.equal(provider.requests.length, 0);
});

test("concurrent scheduling cannot reserve one item twice", async () => {
  const sourceValue = source();
  const store = new MemoryStore(workspace([item("item-1", sourceValue)]));
  const authority = new SourceAuthority([sourceValue]);
  const schedulerA = service(store, authority);
  const schedulerB = service(store, authority);

  const results = await Promise.all([
    schedulerA.scheduleNext(WORKSPACE_ID, NOW),
    schedulerB.scheduleNext(WORKSPACE_ID, NOW),
  ]);

  assert.deepEqual(results.map((result) => result.action).sort(), ["none", "scheduled"]);
  assert.equal(store.value.publicationJobs?.length, 1);
  assert.equal(store.value.publicationInventory?.[0]?.status, "reserved");
});

test("safe retry reuses the same idempotency key and then publishes", async () => {
  const sourceValue = source();
  const store = new MemoryStore(workspace([item("item-1", sourceValue)]));
  const authority = new SourceAuthority([sourceValue]);
  const provider = new DeterministicFakePublicationProvider([
    { kind: "retryable_failure", failureClass: "rate_limited", detail: "Safe to retry" },
    { kind: "published", publicationId: "publication-2", providerResponseId: "response-2" },
  ]);
  const scheduler = service(store, authority, provider);

  const first = await scheduler.runOnce(WORKSPACE_ID, NOW);
  assert.equal(first.action, "retry_wait");
  assert.equal(store.value.publicationJobs?.[0]?.nextAttemptAt, "2026-10-05T14:05:00.000Z");

  const second = await scheduler.runOnce(WORKSPACE_ID, "2026-10-05T14:05:00.000Z");
  assert.equal(second.action, "published");
  assert.equal(provider.requests.length, 2);
  assert.equal(provider.requests[0]?.job.idempotencyKey, provider.requests[1]?.job.idempotencyKey);
  assert.equal(store.value.publicationAttempts?.length, 2);
});

test("unknown provider outcome blocks blind retry", async () => {
  const sourceValue = source();
  const store = new MemoryStore(workspace([item("item-1", sourceValue)]));
  const authority = new SourceAuthority([sourceValue]);
  const provider = new DeterministicFakePublicationProvider([
    { kind: "outcome_unknown", detail: "Connection dropped after request dispatch" },
  ]);
  const scheduler = service(store, authority, provider);

  const first = await scheduler.runOnce(WORKSPACE_ID, NOW);
  assert.equal(first.action, "outcome_unknown");
  assert.equal(store.value.publicationJobs?.[0]?.status, "outcome_unknown");

  const second = await scheduler.runOnce(WORKSPACE_ID, "2026-10-05T15:00:00.000Z");
  assert.equal(second.action, "none");
  assert.equal(provider.requests.length, 1);
  assert.equal(store.value.publicationInventory?.[0]?.status, "reserved");
});

test("restart reconciliation converts executing work to outcome_unknown", async () => {
  const sourceValue = source();
  const base = workspace([item("item-1", sourceValue, { status: "reserved" })]);
  const runningJob: PublicationJob = {
    id: "job-1",
    workspaceId: WORKSPACE_ID,
    inventoryItemId: "item-1",
    destinationId: "destination-1",
    policyId: "policy-1",
    policyVersion: 1,
    sourceId: sourceValue.sourceId,
    sourceVersion: sourceValue.sourceVersion,
    idempotencyKey: "stable-key",
    status: "executing",
    scheduledFor: NOW,
    attemptCount: 1,
    createdAt: NOW,
    updatedAt: NOW,
  };
  const store = new MemoryStore({
    ...base,
    publicationJobs: [runningJob],
    publicationAttempts: [{
      id: "attempt-1",
      workspaceId: WORKSPACE_ID,
      jobId: "job-1",
      sequence: 1,
      idempotencyKey: "stable-key",
      status: "executing",
      startedAt: NOW,
    }],
  });
  const authority = new SourceAuthority([sourceValue]);
  const provider = new DeterministicFakePublicationProvider();
  const scheduler = service(store, authority, provider);

  const result = await scheduler.reconcileRestart(WORKSPACE_ID);
  assert.equal(result.action, "outcome_unknown");
  assert.equal(store.value.publicationJobs?.[0]?.status, "outcome_unknown");
  assert.equal(store.value.publicationAttempts?.[0]?.status, "outcome_unknown");
  assert.equal(provider.requests.length, 0);
});

test("authority drift invalidates a reserved job before provider execution", async () => {
  const original = source();
  const store = new MemoryStore(workspace([item("item-1", original)]));
  const authority = new SourceAuthority([original]);
  const provider = new DeterministicFakePublicationProvider();
  const scheduler = service(store, authority, provider);

  const scheduled = await scheduler.scheduleNext(WORKSPACE_ID, NOW);
  assert.equal(scheduled.action, "scheduled");
  authority.snapshots.set(original.sourceId, source(original.sourceId, 2));

  const result = await scheduler.executeDue(WORKSPACE_ID, NOW);
  assert.equal(result.action, "authority_invalidated");
  assert.equal(provider.requests.length, 0);
  assert.equal(store.value.publicationInventory?.[0]?.status, "approval_invalidated");
  assert.equal(store.value.publicationJobs?.[0]?.status, "authority_invalidated");
});

test("late jobs are cancelled without provider execution", async () => {
  const sourceValue = source();
  const store = new MemoryStore(workspace([item("item-1", sourceValue)], policy({ lateToleranceMinutes: 10 })));
  const authority = new SourceAuthority([sourceValue]);
  const provider = new DeterministicFakePublicationProvider();
  const scheduler = service(store, authority, provider);

  await scheduler.scheduleNext(WORKSPACE_ID, NOW);
  const result = await scheduler.executeDue(WORKSPACE_ID, "2026-10-05T14:11:00.000Z");
  assert.equal(result.action, "cancelled");
  assert.equal(provider.requests.length, 0);
  assert.equal(store.value.publicationInventory?.[0]?.status, "stocked");
});

test("daily quota schedules the next approved item on the next eligible day", async () => {
  const firstSource = source("source-1");
  const secondSource = source("source-2");
  const limitedPolicy = policy({ maximumPerDay: 1 });
  const store = new MemoryStore(workspace([
    item("item-1", firstSource, { priority: 1 }),
    item("item-2", secondSource, { priority: 2 }),
  ], limitedPolicy));
  const authority = new SourceAuthority([firstSource, secondSource]);
  const provider = new DeterministicFakePublicationProvider();
  const scheduler = service(store, authority, provider);

  const first = await scheduler.runOnce(WORKSPACE_ID, NOW);
  assert.equal(first.action, "published");

  const second = await scheduler.scheduleNext(WORKSPACE_ID, "2026-10-05T14:01:00.000Z");
  assert.equal(second.action, "scheduled");
  const secondJob = store.value.publicationJobs?.find((job) => job.inventoryItemId === "item-2");
  assert.equal(secondJob?.scheduledFor, "2026-10-06T00:00:00.000Z");
});

test("paused automation neither schedules nor executes", async () => {
  const sourceValue = source();
  const store = new MemoryStore(workspace([item("item-1", sourceValue)]));
  const authority = new SourceAuthority([sourceValue]);
  const provider = new DeterministicFakePublicationProvider();
  const scheduler = service(store, authority, provider);

  const status = await scheduler.setPaused(WORKSPACE_ID, true, "Operator pause");
  assert.equal(status.paused, true);
  const result = await scheduler.runOnce(WORKSPACE_ID, NOW);
  assert.equal(result.action, "paused");
  assert.equal(store.value.publicationJobs?.length, 0);
  assert.equal(provider.requests.length, 0);
});
