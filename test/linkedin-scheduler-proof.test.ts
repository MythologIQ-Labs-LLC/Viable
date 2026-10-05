import assert from "node:assert/strict";
import test from "node:test";
import type {
  ActivationLearningWorkspace,
  ActivationSourceSnapshot,
  DestinationRecord,
} from "../src/activation-learning/domain/activation-learning.js";
import type { PublicationExecutionWorkspace } from "../src/activation-learning/domain/publication-execution.js";
import type { PublicationInventoryItem, PublicationPolicy } from "../src/activation-learning/domain/publication-inventory.js";
import type { ProviderConnectionWorkspace } from "../src/activation-learning/domain/provider-connection.js";
import { LinkedInMemberPublicationProvider } from "../src/activation-learning/adapters/linkedin-member-publication-provider.js";
import type { ActivationLearningStore } from "../src/activation-learning/ports/activation-learning-store.js";
import type {
  LinkedInConnectResult,
  LinkedInNativeProviderPort,
  LinkedInPublishResult,
} from "../src/activation-learning/ports/linkedin-native-provider.js";
import type { ProviderConnectionStore } from "../src/activation-learning/ports/provider-connection-store.js";
import type { PublicationSourceAuthorityPort } from "../src/activation-learning/ports/publication-source-authority.js";
import { linkedInOnlyAutomationBlocker } from "../src/activation-learning/services/linkedin-automation-frontier.js";
import { PublicationSchedulerService } from "../src/activation-learning/services/publication-scheduler-service.js";

// Slice D acceptance: a connected LinkedIn provider authority drives the real
// deterministic scheduler. Only the native HTTPS boundary is faked.

const WORKSPACE_ID = "linkedin-proof";
const NOW = "2026-10-05T14:00:00.000Z";
const SECRET = "secret-linkedin-token-value";

class ActivationStore implements ActivationLearningStore {
  constructor(public value: PublicationExecutionWorkspace) {}
  async load(id: string): Promise<ActivationLearningWorkspace | undefined> { return id === WORKSPACE_ID ? this.value : undefined; }
  async save(value: ActivationLearningWorkspace): Promise<void> { this.value = value as PublicationExecutionWorkspace; }
}

class ConnectionStore implements ProviderConnectionStore {
  constructor(public value?: ProviderConnectionWorkspace) {}
  async load(id: string): Promise<ProviderConnectionWorkspace | undefined> { return id === WORKSPACE_ID ? this.value : undefined; }
  async save(value: ProviderConnectionWorkspace): Promise<void> { this.value = value; }
}

class SourceAuthority implements PublicationSourceAuthorityPort {
  async resolve(): Promise<ActivationSourceSnapshot> { return source(); }
}

class NativeProvider implements LinkedInNativeProviderPort {
  results: LinkedInPublishResult[] = [];
  calls: Array<{ credentialReference: string; memberUrn: string; text: string }> = [];
  async connect(): Promise<LinkedInConnectResult> { throw new Error("not used"); }
  async publishText(input: { credentialReference: string; memberUrn: string; text: string }): Promise<LinkedInPublishResult> {
    this.calls.push(input);
    const next = this.results.shift();
    if (!next) throw new Error("unexpected dispatch");
    return next;
  }
}

function source(): ActivationSourceSnapshot {
  return {
    kind: "campaign_variant",
    sourceId: "variant-1",
    sourceVersion: 3,
    title: "Approved LinkedIn variant",
    audience: "Indie founders",
    channel: "linkedin",
    campaignId: "campaign-1",
    canonicalAssetId: "asset-1",
    claimReferences: [],
    evidenceIds: [],
    rights: [],
    accessibilityRequirements: [],
    disclosureRequirements: [],
    body: "Exact approved LinkedIn copy",
    capturedAt: NOW,
  };
}

function destination(id: string, channel: DestinationRecord["channel"]): DestinationRecord {
  return {
    id,
    workspaceId: WORKSPACE_ID,
    label: `${channel} destination`,
    channel,
    accountReference: "account",
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

function policy(destinationId = "linkedin-1"): PublicationPolicy {
  return {
    id: `policy-${destinationId}`,
    workspaceId: WORKSPACE_ID,
    label: "Always on",
    destinationId,
    version: 1,
    timezone: "UTC",
    allowedWeekdays: [0, 1, 2, 3, 4, 5, 6],
    allowedWindows: [{ start: "00:00", end: "23:59" }],
    minimumCooldownMinutes: 0,
    lateToleranceMinutes: 600,
    retryLimit: 2,
    enabled: true,
    createdAt: "2026-10-01T00:00:00.000Z",
    updatedAt: "2026-10-01T00:00:00.000Z",
  };
}

function item(destinationId = "linkedin-1", id = "item-1"): PublicationInventoryItem {
  return {
    id,
    workspaceId: WORKSPACE_ID,
    destinationId,
    destinationUpdatedAt: "2026-10-01T00:00:00.000Z",
    policyId: `policy-${destinationId}`,
    policyVersion: 1,
    source: source(),
    status: "stocked",
    priority: 10,
    availableFrom: "2026-10-01T00:00:00.000Z",
    maxUses: 1,
    useCount: 0,
    reviewedBy: "Kevin",
    reviewedAt: "2026-10-04T12:00:00.000Z",
    reviewNote: "Approved",
    createdAt: "2026-10-04T11:00:00.000Z",
    updatedAt: "2026-10-04T12:00:00.000Z",
  };
}

function workspace(overrides: Partial<PublicationExecutionWorkspace> = {}): PublicationExecutionWorkspace {
  return {
    workspaceId: WORKSPACE_ID,
    destinations: [destination("linkedin-1", "linkedin")],
    calendarEntries: [],
    publicationPolicies: [policy()],
    publicationInventory: [item()],
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
    ...overrides,
  };
}

function connected(): ConnectionStore {
  return new ConnectionStore({
    workspaceId: WORKSPACE_ID,
    connections: [{
      id: "connection-1",
      workspaceId: WORKSPACE_ID,
      destinationId: "linkedin-1",
      provider: "linkedin_member",
      authMode: "developer_portal_token",
      credentialReference: "viable://credential/linkedin/connection-1/access_token",
      memberId: "abc123",
      memberUrn: "urn:li:person:abc123",
      requiredScopes: ["openid", "profile", "w_member_social"],
      status: "connected",
      createdAt: NOW,
      updatedAt: NOW,
    }],
    updatedAt: NOW,
  });
}

function harness(connections = connected(), value = workspace()) {
  const store = new ActivationStore(value);
  const native = new NativeProvider();
  let sequence = 0;
  const scheduler = new PublicationSchedulerService(
    store,
    new SourceAuthority(),
    new LinkedInMemberPublicationProvider(connections, native, () => new Date(NOW)),
    () => new Date(NOW),
    () => `id-${++sequence}`,
  );
  return { store, native, scheduler, connections };
}

test("connected LinkedIn authority drives the real scheduler to provider-evidenced publication", async () => {
  const { store, native, scheduler } = harness();
  native.results.push({ kind: "published", publicationId: "urn:li:share:7", providerResponseId: "urn:li:share:7" });

  const result = await scheduler.runOnce(WORKSPACE_ID, NOW);

  assert.equal(result.action, "published");
  assert.deepEqual(native.calls, [{
    credentialReference: "viable://credential/linkedin/connection-1/access_token",
    memberUrn: "urn:li:person:abc123",
    text: "Exact approved LinkedIn copy",
  }]);
  const job = store.value.publicationJobs?.[0];
  assert.equal(job?.status, "published");
  assert.equal(job?.publicationId, "urn:li:share:7");
  assert.equal(job?.sourceVersion, 3);
  assert.equal(store.value.publicationInventory?.[0]?.status, "depleted");
  assert.doesNotMatch(JSON.stringify(store.value), new RegExp(SECRET));

  assert.equal((await scheduler.runOnce(WORKSPACE_ID, NOW)).action, "none");
  assert.equal(native.calls.length, 1);
});

test("ambiguous LinkedIn outcome is recorded and never retried by later scheduler runs", async () => {
  const { store, native, scheduler } = harness();
  native.results.push({ kind: "outcome_unknown", detail: "LinkedIn did not return a definitive publication outcome." });

  assert.equal((await scheduler.runOnce(WORKSPACE_ID, NOW)).action, "outcome_unknown");
  assert.equal(store.value.publicationJobs?.[0]?.status, "outcome_unknown");
  assert.equal((await scheduler.runOnce(WORKSPACE_ID, "2026-10-05T15:00:00.000Z")).action, "none");
  assert.equal(native.calls.length, 1);
});

test("undispatched LinkedIn connection failure waits for a bounded retry", async () => {
  const { store, native, scheduler } = harness();
  native.results.push({ kind: "not_dispatched", detail: "LinkedIn could not be reached; the publication request was not sent." });

  assert.equal((await scheduler.runOnce(WORKSPACE_ID, NOW)).action, "retry_wait");
  assert.equal(store.value.publicationJobs?.[0]?.failureClass, "linkedin_unreachable");
});

test("revoked LinkedIn authority fails the job and blocks further dispatch until reconnect", async () => {
  const value = workspace({ publicationInventory: [item("linkedin-1", "item-1"), item("linkedin-1", "item-2")] });
  const { store, native, scheduler, connections } = harness(connected(), value);
  native.results.push({ kind: "reconnect_required", detail: "LinkedIn authorization is invalid or expired." });

  assert.equal((await scheduler.runOnce(WORKSPACE_ID, NOW)).action, "failed");
  assert.equal(connections.value?.connections[0]?.status, "reconnect_required");

  const second = await scheduler.runOnce(WORKSPACE_ID, NOW);
  assert.equal(second.action, "failed");
  assert.equal(native.calls.length, 1, "reconnect-required authority must not dispatch");
  assert.equal(store.value.publicationJobs?.[1]?.failureClass, "reconnect_required");
});

test("missing provider connection fails closed without dispatch", async () => {
  const { native, scheduler } = harness(new ConnectionStore());
  assert.equal((await scheduler.runOnce(WORKSPACE_ID, NOW)).action, "failed");
  assert.equal(native.calls.length, 0);
});

test("explicit proof refuses to run while non-LinkedIn automated work exists", () => {
  const destinations = [destination("linkedin-1", "linkedin"), destination("facebook-1", "facebook_page")];
  assert.equal(linkedInOnlyAutomationBlocker(workspace({ destinations })), undefined);

  assert.match(
    linkedInOnlyAutomationBlocker(workspace({ destinations, publicationInventory: [item(), item("facebook-1", "item-fb")] })) ?? "",
    /Non-LinkedIn publication stock/,
  );

  const pendingJob = {
    id: "job-fb",
    workspaceId: WORKSPACE_ID,
    inventoryItemId: "item-fb",
    destinationId: "facebook-1",
    policyId: "policy-facebook-1",
    policyVersion: 1,
    sourceId: "variant-1",
    sourceVersion: 3,
    idempotencyKey: "idem",
    status: "waiting" as const,
    scheduledFor: NOW,
    attemptCount: 0,
    createdAt: NOW,
    updatedAt: NOW,
  };
  assert.match(
    linkedInOnlyAutomationBlocker(workspace({ destinations, publicationJobs: [pendingJob] })) ?? "",
    /non-LinkedIn publication job is pending/,
  );
  assert.equal(
    linkedInOnlyAutomationBlocker(workspace({ destinations, publicationJobs: [{ ...pendingJob, status: "published" }] })),
    undefined,
  );
});

test("LinkedIn adapter refuses a non-LinkedIn destination even if routing is wrong", async () => {
  const value = workspace({
    destinations: [destination("facebook-1", "facebook_page")],
    publicationPolicies: [policy("facebook-1")],
    publicationInventory: [{ ...item("facebook-1"), source: { ...source(), channel: "facebook_page" } }],
  });
  const store = new ActivationStore(value);
  const native = new NativeProvider();
  const scheduler = new PublicationSchedulerService(
    store,
    { resolve: async () => ({ ...source(), channel: "facebook_page" }) },
    new LinkedInMemberPublicationProvider(connected(), native, () => new Date(NOW)),
    () => new Date(NOW),
    () => "id",
  );

  const result = await scheduler.runOnce(WORKSPACE_ID, NOW);
  assert.equal(result.action, "failed");
  assert.equal(native.calls.length, 0);
  assert.equal(store.value.publicationJobs?.[0]?.failureClass, "provider_channel_mismatch");
});
