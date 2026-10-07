import test from "node:test";
import assert from "node:assert/strict";
import type { ActivationLearningWorkspace, ActivationSourceSnapshot, DestinationRecord } from "../src/activation-learning/domain/activation-learning.js";
import type { PublicationJob } from "../src/activation-learning/domain/publication-execution.js";
import type { ProviderConnectionWorkspace } from "../src/activation-learning/domain/provider-connection.js";
import { LinkedInMemberPublicationProvider } from "../src/activation-learning/adapters/linkedin-member-publication-provider.js";
import { LinkedInMemberConnectionService } from "../src/activation-learning/services/linkedin-member-connection-service.js";
import type { ActivationLearningStore } from "../src/activation-learning/ports/activation-learning-store.js";
import type {
  LinkedInConnectResult,
  LinkedInNativeProviderPort,
  LinkedInPublishResult,
} from "../src/activation-learning/ports/linkedin-native-provider.js";
import type { ProviderConnectionStore } from "../src/activation-learning/ports/provider-connection-store.js";

const WORKSPACE_ID = "linkedin-workspace";
const NOW = "2026-10-05T02:00:00.000Z";
const destination: DestinationRecord = {
  id: "linkedin-destination",
  workspaceId: WORKSPACE_ID,
  label: "Kevin LinkedIn",
  channel: "linkedin",
  accountReference: "kevin-member",
  accountOwner: "Kevin",
  ownershipConfirmed: true,
  deliveryMode: "manual_only",
  capabilityNotes: [],
  rateLimitNotes: "provider-classified",
  retryPolicy: "scheduler-bounded",
  dataHandlingNotes: "no provider secret in workspace",
  status: "active",
  createdAt: NOW,
  updatedAt: NOW,
};

class ActivationStore implements ActivationLearningStore {
  constructor(public value: ActivationLearningWorkspace = workspace()) {}
  async load(id: string): Promise<ActivationLearningWorkspace | undefined> { return id === WORKSPACE_ID ? this.value : undefined; }
  async save(value: ActivationLearningWorkspace): Promise<void> { this.value = value; }
}

class ConnectionStore implements ProviderConnectionStore {
  value: ProviderConnectionWorkspace | undefined;
  throwOnSave = false;
  throwOnDelete = false;
  async load(id: string): Promise<ProviderConnectionWorkspace | undefined> { return id === WORKSPACE_ID ? this.value : undefined; }
  async save(value: ProviderConnectionWorkspace): Promise<void> {
    if (this.throwOnSave) throw new Error("simulated connection save failure");
    this.value = value;
  }
  async delete(id: string): Promise<void> {
    if (this.throwOnDelete) throw new Error("simulated connection delete failure");
    if (id === WORKSPACE_ID) this.value = undefined;
  }
}

class NativeProvider implements LinkedInNativeProviderPort {
  connectResult: LinkedInConnectResult = { kind: "connected", memberId: "abc123", memberUrn: "urn:li:person:abc123" };
  publishResult: LinkedInPublishResult = { kind: "published", publicationId: "urn:li:ugcPost:42", providerResponseId: "urn:li:ugcPost:42" };
  connectInputs: Array<{ credentialReference: string; accessToken: string }> = [];
  publishInputs: Array<{ credentialReference: string; memberUrn: string; text: string }> = [];
  disconnectInputs: Array<{ credentialReference: string }> = [];
  throwOnPublish = false;
  throwOnDisconnect = false;

  async connect(input: { credentialReference: string; accessToken: string }): Promise<LinkedInConnectResult> {
    this.connectInputs.push(input);
    return this.connectResult;
  }

  async publishText(input: { credentialReference: string; memberUrn: string; text: string }): Promise<LinkedInPublishResult> {
    this.publishInputs.push(input);
    if (this.throwOnPublish) throw new Error("socket vanished");
    return this.publishResult;
  }

  async disconnect(input: { credentialReference: string }): Promise<void> {
    this.disconnectInputs.push(input);
    if (this.throwOnDisconnect) throw new Error("simulated vault delete failure");
  }
}

test("developer portal token bootstrap persists only opaque authority metadata", async () => {
  const activation = new ActivationStore();
  const connections = new ConnectionStore();
  const native = new NativeProvider();
  const service = new LinkedInMemberConnectionService(
    activation,
    connections,
    native,
    () => new Date(NOW),
    () => "connection-1",
  );

  const result = await service.connectWithDeveloperPortalToken({
    workspaceId: WORKSPACE_ID,
    destinationId: destination.id,
    accessToken: "  very-secret-linkedin-token  ",
    tokenExpiresAt: "2026-12-01T00:00:00.000Z",
  });

  assert.equal(result.kind, "connected");
  if (result.kind !== "connected") return;
  assert.equal(result.connection.credentialReference, "viable://credential/linkedin/connection-1/access_token");
  assert.equal(result.connection.memberUrn, "urn:li:person:abc123");
  assert.deepEqual(result.connection.requiredScopes, ["openid", "profile", "w_member_social"]);
  assert.equal(native.connectInputs[0]?.accessToken, "very-secret-linkedin-token");
  assert.doesNotMatch(JSON.stringify(connections.value), /very-secret-linkedin-token/);
  assert.doesNotMatch(JSON.stringify(result), /very-secret-linkedin-token/);
});

test("failed replacement token preserves an existing working connection record", async () => {
  const activation = new ActivationStore();
  const connections = connectedStore();
  const before = connections.value?.connections[0];
  const native = new NativeProvider();
  native.connectResult = {
    kind: "rejected",
    failureClass: "invalid_token",
    detail: "LinkedIn rejected the access token.",
  };
  const service = new LinkedInMemberConnectionService(
    activation,
    connections,
    native,
    () => new Date(NOW),
    () => "unused-new-id",
  );

  const result = await service.connectWithDeveloperPortalToken({
    workspaceId: WORKSPACE_ID,
    destinationId: destination.id,
    accessToken: "bad-replacement-token",
  });

  assert.equal(result.kind, "rejected");
  assert.deepEqual(connections.value?.connections[0], before);
});

test("disconnect removes the vault credential before clearing local connection metadata", async () => {
  const activation = new ActivationStore();
  const connections = connectedStore();
  const native = new NativeProvider();
  const service = new LinkedInMemberConnectionService(activation, connections, native, () => new Date(NOW));

  await service.disconnect(WORKSPACE_ID, destination.id);

  assert.deepEqual(native.disconnectInputs, [{ credentialReference: "viable://credential/linkedin/connection-1/access_token" }]);
  assert.equal(connections.value, undefined);
});

test("failed vault deletion leaves local connection metadata intact", async () => {
  const activation = new ActivationStore();
  const connections = connectedStore();
  const before = connections.value;
  const native = new NativeProvider();
  native.throwOnDisconnect = true;
  const service = new LinkedInMemberConnectionService(activation, connections, native, () => new Date(NOW));

  await assert.rejects(() => service.disconnect(WORKSPACE_ID, destination.id), /vault delete failure/);

  assert.deepEqual(connections.value, before);
});

test("failed local connection persistence cleans up the newly stored vault credential", async () => {
  const activation = new ActivationStore();
  const connections = new ConnectionStore();
  connections.throwOnSave = true;
  const native = new NativeProvider();
  const service = new LinkedInMemberConnectionService(
    activation,
    connections,
    native,
    () => new Date(NOW),
    () => "connection-cleanup",
  );

  await assert.rejects(() => service.connectWithDeveloperPortalToken({
    workspaceId: WORKSPACE_ID,
    destinationId: destination.id,
    accessToken: "temporary-token",
  }), /connection save failure/);

  assert.deepEqual(native.disconnectInputs, [{
    credentialReference: "viable://credential/linkedin/connection-cleanup/access_token",
  }]);
  assert.equal(connections.value, undefined);
});

test("successful token replacement stages a new vault slot and retires the old credential after local commit", async () => {
  const activation = new ActivationStore();
  const connections = connectedStore();
  const native = new NativeProvider();
  const service = new LinkedInMemberConnectionService(
    activation,
    connections,
    native,
    () => new Date(NOW),
    () => "replacement-slot",
  );

  const result = await service.connectWithDeveloperPortalToken({
    workspaceId: WORKSPACE_ID,
    destinationId: destination.id,
    accessToken: "replacement-token",
  });

  assert.equal(result.kind, "connected");
  if (result.kind !== "connected") return;
  assert.equal(result.connection.id, "connection-1", "logical connection identity stays stable");
  assert.equal(result.connection.credentialReference, "viable://credential/linkedin/replacement-slot/access_token");
  assert.deepEqual(native.disconnectInputs, [{
    credentialReference: "viable://credential/linkedin/connection-1/access_token",
  }]);
  assert.deepEqual(result.connection.supersededCredentialReferences, undefined);
});

test("replacement metadata save failure cleans only the staged credential and preserves the old connection record", async () => {
  const activation = new ActivationStore();
  const connections = connectedStore();
  const before = structuredClone(connections.value);
  connections.throwOnSave = true;
  const native = new NativeProvider();
  const service = new LinkedInMemberConnectionService(
    activation,
    connections,
    native,
    () => new Date(NOW),
    () => "replacement-failed-save",
  );

  await assert.rejects(() => service.connectWithDeveloperPortalToken({
    workspaceId: WORKSPACE_ID,
    destinationId: destination.id,
    accessToken: "replacement-token",
  }), /connection save failure/);

  assert.deepEqual(connections.value, before);
  assert.deepEqual(native.disconnectInputs, [{
    credentialReference: "viable://credential/linkedin/replacement-failed-save/access_token",
  }]);
  assert.notEqual(
    native.disconnectInputs[0]?.credentialReference,
    before?.connections[0]?.credentialReference,
    "the old working vault reference is never deleted when replacement metadata fails to save",
  );
});

test("failed cleanup of an old replacement credential remains explicit metadata for later retry", async () => {
  const activation = new ActivationStore();
  const connections = connectedStore();
  const native = new NativeProvider();
  native.throwOnDisconnect = true;
  const service = new LinkedInMemberConnectionService(
    activation,
    connections,
    native,
    () => new Date(NOW),
    () => "replacement-cleanup-pending",
  );

  const result = await service.connectWithDeveloperPortalToken({
    workspaceId: WORKSPACE_ID,
    destinationId: destination.id,
    accessToken: "replacement-token",
  });

  assert.equal(result.kind, "connected");
  if (result.kind !== "connected") return;
  assert.deepEqual(result.connection.supersededCredentialReferences, [
    "viable://credential/linkedin/connection-1/access_token",
  ]);
  assert.deepEqual(connections.value?.connections[0]?.supersededCredentialReferences, [
    "viable://credential/linkedin/connection-1/access_token",
  ]);
});

test("connection bootstrap rejects non-LinkedIn destinations before native secret handling", async () => {
  const activation = new ActivationStore({
    ...workspace(),
    destinations: [{ ...destination, channel: "facebook_page" }],
  });
  const native = new NativeProvider();
  const service = new LinkedInMemberConnectionService(activation, new ConnectionStore(), native, () => new Date(NOW), () => "connection-1");

  await assert.rejects(
    () => service.connectWithDeveloperPortalToken({
      workspaceId: WORKSPACE_ID,
      destinationId: destination.id,
      accessToken: "token",
    }),
    /requires a LinkedIn destination/,
  );
  assert.equal(native.connectInputs.length, 0);
});

test("published response preserves LinkedIn provider receipt without exposing credential material", async () => {
  const connections = connectedStore();
  const native = new NativeProvider();
  const provider = new LinkedInMemberPublicationProvider(connections, native, () => new Date(NOW));

  const outcome = await provider.publish(request());

  assert.deepEqual(outcome, {
    kind: "published",
    publicationId: "urn:li:ugcPost:42",
    providerResponseId: "urn:li:ugcPost:42",
  });
  assert.deepEqual(native.publishInputs, [{
    credentialReference: "viable://credential/linkedin/connection-1/access_token",
    memberUrn: "urn:li:person:abc123",
    text: "Approved LinkedIn post",
  }]);
});

test("rate limits remain scheduler-bounded retryable failures", async () => {
  const connections = connectedStore();
  const native = new NativeProvider();
  native.publishResult = { kind: "rate_limited", detail: "LinkedIn rate limited the request." };
  const provider = new LinkedInMemberPublicationProvider(connections, native, () => new Date(NOW));

  assert.deepEqual(await provider.publish(request()), {
    kind: "retryable_failure",
    failureClass: "linkedin_rate_limited",
    detail: "LinkedIn rate limited the request.",
  });
});

test("revoked authorization becomes reconnect-required and updates connection authority", async () => {
  const connections = connectedStore();
  const native = new NativeProvider();
  native.publishResult = { kind: "reconnect_required", detail: "LinkedIn authorization is invalid or expired." };
  const provider = new LinkedInMemberPublicationProvider(connections, native, () => new Date(NOW));

  const outcome = await provider.publish(request());

  assert.deepEqual(outcome, {
    kind: "terminal_failure",
    failureClass: "reconnect_required",
    detail: "LinkedIn authorization is invalid or expired.",
  });
  assert.equal(connections.value?.connections[0]?.status, "reconnect_required");
});

test("ambiguous native dispatch failures become outcome_unknown and never retryable", async () => {
  const connections = connectedStore();
  const native = new NativeProvider();
  native.throwOnPublish = true;
  const provider = new LinkedInMemberPublicationProvider(connections, native, () => new Date(NOW));

  const outcome = await provider.publish(request());
  assert.equal(outcome.kind, "outcome_unknown");
});

test("expired metadata blocks dispatch and marks reconnect-required", async () => {
  const connections = connectedStore("2026-10-05T01:59:00.000Z");
  const native = new NativeProvider();
  const provider = new LinkedInMemberPublicationProvider(connections, native, () => new Date(NOW));

  const outcome = await provider.publish(request());

  assert.equal(outcome.kind, "terminal_failure");
  if (outcome.kind === "terminal_failure") assert.equal(outcome.failureClass, "reconnect_required");
  assert.equal(native.publishInputs.length, 0);
  assert.equal(connections.value?.connections[0]?.status, "reconnect_required");
});

function connectedStore(tokenExpiresAt = "2026-12-01T00:00:00.000Z"): ConnectionStore {
  const store = new ConnectionStore();
  store.value = {
    workspaceId: WORKSPACE_ID,
    connections: [{
      id: "connection-1",
      workspaceId: WORKSPACE_ID,
      destinationId: destination.id,
      provider: "linkedin_member",
      authMode: "developer_portal_token",
      credentialReference: "viable://credential/linkedin/connection-1/access_token",
      memberId: "abc123",
      memberUrn: "urn:li:person:abc123",
      requiredScopes: ["openid", "profile", "w_member_social"],
      status: "connected",
      tokenExpiresAt,
      createdAt: NOW,
      updatedAt: NOW,
    }],
    updatedAt: NOW,
  };
  return store;
}

function request(): {
  job: PublicationJob;
  destination: DestinationRecord;
  source: ActivationSourceSnapshot;
  attemptNumber: number;
} {
  return {
    job: {
      id: "job-1",
      workspaceId: WORKSPACE_ID,
      inventoryItemId: "inventory-1",
      destinationId: destination.id,
      policyId: "policy-1",
      policyVersion: 1,
      sourceId: "source-1",
      sourceVersion: 1,
      idempotencyKey: "idem-1",
      status: "executing",
      scheduledFor: NOW,
      attemptCount: 1,
      createdAt: NOW,
      updatedAt: NOW,
    },
    destination,
    source: {
      kind: "campaign_variant",
      sourceId: "source-1",
      sourceVersion: 1,
      title: "Approved",
      audience: "operators",
      channel: "linkedin",
      campaignId: "campaign-1",
      canonicalAssetId: "asset-1",
      claimReferences: [],
      evidenceIds: [],
      rights: [],
      accessibilityRequirements: [],
      disclosureRequirements: [],
      body: "Approved LinkedIn post",
      capturedAt: NOW,
    },
    attemptNumber: 1,
  };
}

function workspace(): ActivationLearningWorkspace {
  return {
    workspaceId: WORKSPACE_ID,
    destinations: [destination],
    calendarEntries: [],
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

test("connection failures before dispatch are bounded retryable, not outcome_unknown", async () => {
  const connections = connectedStore();
  const native = new NativeProvider();
  native.publishResult = { kind: "not_dispatched", detail: "LinkedIn could not be reached; the publication request was not sent." };
  const provider = new LinkedInMemberPublicationProvider(connections, native, () => new Date(NOW));

  assert.deepEqual(await provider.publish(request()), {
    kind: "retryable_failure",
    failureClass: "linkedin_unreachable",
    detail: "LinkedIn could not be reached; the publication request was not sent.",
  });
  assert.equal(connections.value?.connections[0]?.status, "connected");
});

test("an in-flight 401 does not overwrite a connection the user reconnected meanwhile", async () => {
  const connections = connectedStore();
  const native = new NativeProvider();
  native.publishResult = { kind: "reconnect_required", detail: "LinkedIn authorization is invalid or expired." };
  const original = native.publishText.bind(native);
  native.publishText = async (input) => {
    const result = await original(input);
    const current = connections.value!;
    connections.value = {
      ...current,
      connections: current.connections.map((connection) => ({
        ...connection,
        memberUrn: "urn:li:person:fresh",
        status: "connected" as const,
        updatedAt: "2026-10-05T02:00:30.000Z",
      })),
    };
    return result;
  };
  const provider = new LinkedInMemberPublicationProvider(connections, native, () => new Date(NOW));

  const outcome = await provider.publish(request());

  assert.equal(outcome.kind, "terminal_failure");
  assert.equal(connections.value?.connections[0]?.status, "connected");
  assert.equal(connections.value?.connections[0]?.memberUrn, "urn:li:person:fresh");
});
