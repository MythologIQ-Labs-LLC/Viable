import assert from "node:assert/strict";
import test from "node:test";
import type {
  ActivationLearningWorkspace,
  ActivationSourceSnapshot,
  DestinationChannel,
} from "../src/activation-learning/domain/activation-learning.js";
import type { PublicationInventoryWorkspace } from "../src/activation-learning/domain/publication-inventory.js";
import type { ActivationLearningStore } from "../src/activation-learning/ports/activation-learning-store.js";
import type { PublicationInventoryStore } from "../src/activation-learning/ports/publication-inventory-store.js";
import type { PublicationSourceAuthorityPort } from "../src/activation-learning/ports/publication-source-authority.js";
import { PublicationInventoryService } from "../src/activation-learning/services/publication-inventory-service.js";

class ActivationStore implements ActivationLearningStore {
  constructor(public value: ActivationLearningWorkspace) {}
  async load(): Promise<ActivationLearningWorkspace | undefined> { return this.value; }
  async save(value: ActivationLearningWorkspace): Promise<void> { this.value = value; }
}

class InventoryStore implements PublicationInventoryStore {
  value?: PublicationInventoryWorkspace;
  async load(): Promise<PublicationInventoryWorkspace | undefined> { return this.value; }
  async save(value: PublicationInventoryWorkspace): Promise<void> { this.value = value; }
}

class SourceAuthority implements PublicationSourceAuthorityPort {
  constructor(public value: ActivationSourceSnapshot) {}
  async resolve(_workspaceId: string, _kind: ActivationSourceSnapshot["kind"], _sourceId: string, channel: DestinationChannel): Promise<ActivationSourceSnapshot> {
    if (channel !== this.value.channel) throw new Error("Channel authority mismatch");
    return this.value;
  }
}

const now = "2026-10-04T12:00:00.000Z";

const activationWorkspace = (): ActivationLearningWorkspace => ({
  workspaceId: "workspace-1",
  destinations: [{
    id: "destination-1",
    workspaceId: "workspace-1",
    label: "MythologIQ LinkedIn",
    channel: "linkedin",
    accountReference: "mythologiq-linkedin",
    accountOwner: "Kevin",
    ownershipConfirmed: true,
    deliveryMode: "manual_only",
    capabilityNotes: [],
    rateLimitNotes: "Provider limits apply",
    retryPolicy: "Manual fallback",
    dataHandlingNotes: "No credentials in workspace",
    status: "active",
    createdAt: now,
    updatedAt: now,
  }],
  calendarEntries: [],
  packages: [],
  exportOperations: [],
  deliveryOutcomes: [],
  measurementPlans: [],
  performanceImports: [],
  retrospectives: [],
  learningLedger: [],
  updatedAt: now,
});

const sourceSnapshot = (version = 1): ActivationSourceSnapshot => ({
  kind: "campaign_variant",
  sourceId: "variant-1",
  sourceVersion: version,
  title: "CoreForge launch note",
  audience: "AI builders",
  channel: "linkedin",
  campaignId: "campaign-1",
  canonicalAssetId: "asset-1",
  claimReferences: [],
  evidenceIds: [],
  rights: [],
  accessibilityRequirements: [],
  disclosureRequirements: [],
  body: "Approved publication body",
  capturedAt: now,
});

const createHarness = () => {
  const activation = new ActivationStore(activationWorkspace());
  const inventory = new InventoryStore();
  const authority = new SourceAuthority(sourceSnapshot());
  let nextId = 0;
  const service = new PublicationInventoryService(
    inventory,
    activation,
    authority,
    () => new Date(now),
    () => `id-${++nextId}`,
  );
  return { activation, inventory, authority, service };
};

const createPolicyAndItem = async (service: PublicationInventoryService) => {
  let workspace = await service.createPolicy("workspace-1", {
    label: "LinkedIn weekday stock",
    destinationId: "destination-1",
    timezone: "America/New_York",
    allowedWeekdays: [1, 2, 3, 4, 5],
    allowedWindows: [{ start: "09:00", end: "11:00" }],
    minimumCooldownMinutes: 1440,
    maximumPerDay: 1,
    maximumPerWeek: 3,
    lateToleranceMinutes: 30,
    retryLimit: 2,
  });
  const policyId = workspace.policies[0]!.id;
  workspace = await service.createInventoryItem("workspace-1", {
    destinationId: "destination-1",
    policyId,
    sourceKind: "campaign_variant",
    sourceId: "variant-1",
    priority: 10,
    availableFrom: "2026-10-04T00:00:00.000Z",
    expiresAt: "2026-10-10T00:00:00.000Z",
  });
  return { workspace, policyId, itemId: workspace.items[0]!.id };
};

test("publication inventory requires named review before content becomes eligible", async () => {
  const { service } = createHarness();
  const { itemId } = await createPolicyAndItem(service);

  assert.equal((await service.eligibleItems("workspace-1", now)).length, 0);

  let workspace = await service.submitInventoryItem("workspace-1", itemId);
  assert.equal(workspace.items[0]!.status, "in_review");
  assert.equal((await service.eligibleItems("workspace-1", now)).length, 0);

  workspace = await service.reviewInventoryItem("workspace-1", itemId, "Kevin", "approved", "Approved exact copy for the named destination");
  assert.equal(workspace.items[0]!.status, "stocked");
  assert.equal(workspace.items[0]!.reviewedBy, "Kevin");

  const eligible = await service.eligibleItems("workspace-1", now);
  assert.equal(eligible.length, 1);
  assert.equal(eligible[0]!.id, itemId);
  assert.equal(eligible[0]!.maxUses, 1);
});

test("source authority drift invalidates stocked inventory", async () => {
  const { service, authority } = createHarness();
  const { itemId } = await createPolicyAndItem(service);
  await service.submitInventoryItem("workspace-1", itemId);
  await service.reviewInventoryItem("workspace-1", itemId, "Kevin", "approved", "Approved exact copy");

  authority.value = { ...sourceSnapshot(2), capturedAt: "2026-10-05T00:00:00.000Z" };

  assert.equal((await service.eligibleItems("workspace-1", now)).length, 0);
  const workspace = await service.detectAuthorityImpact("workspace-1");
  assert.equal(workspace.items[0]!.status, "approval_invalidated");
});

test("destination or policy disablement blocks stocked inventory", async () => {
  const { service, activation } = createHarness();
  const { itemId, policyId } = await createPolicyAndItem(service);
  await service.submitInventoryItem("workspace-1", itemId);
  await service.reviewInventoryItem("workspace-1", itemId, "Kevin", "approved", "Approved exact copy");

  await service.setPolicyEnabled("workspace-1", policyId, false);
  assert.equal((await service.eligibleItems("workspace-1", now)).length, 0);

  await service.setPolicyEnabled("workspace-1", policyId, true);
  activation.value = {
    ...activation.value,
    destinations: activation.value.destinations.map((destination) => ({ ...destination, status: "disabled" as const })),
  };
  assert.equal((await service.eligibleItems("workspace-1", now)).length, 0);
});

test("inventory eligibility enforces availability, expiry, and deterministic priority ordering", async () => {
  const { service } = createHarness();
  let workspace = await service.createPolicy("workspace-1", {
    label: "LinkedIn stock",
    destinationId: "destination-1",
    timezone: "America/New_York",
    allowedWeekdays: [0, 1, 2, 3, 4, 5, 6],
    allowedWindows: [{ start: "00:00", end: "23:59" }],
    minimumCooldownMinutes: 0,
    lateToleranceMinutes: 0,
    retryLimit: 0,
  });
  const policyId = workspace.policies[0]!.id;

  for (const [priority, sourceId] of [[20, "variant-later"], [5, "variant-first"]] as const) {
    workspace = await service.createInventoryItem("workspace-1", {
      destinationId: "destination-1",
      policyId,
      sourceKind: "campaign_variant",
      sourceId,
      priority,
      availableFrom: "2026-10-04T00:00:00.000Z",
      expiresAt: "2026-10-05T00:00:00.000Z",
    });
    const itemId = workspace.items.at(-1)!.id;
    await service.submitInventoryItem("workspace-1", itemId);
    await service.reviewInventoryItem("workspace-1", itemId, "Kevin", "approved", `Approved ${sourceId}`);
  }

  const eligible = await service.eligibleItems("workspace-1", now);
  assert.deepEqual(eligible.map((item) => item.priority), [5, 20]);
  assert.equal((await service.eligibleItems("workspace-1", "2026-10-05T00:00:00.000Z")).length, 0);
});

test("secret-like material is rejected from review records", async () => {
  const { service } = createHarness();
  const { itemId } = await createPolicyAndItem(service);
  await service.submitInventoryItem("workspace-1", itemId);

  await assert.rejects(
    service.reviewInventoryItem("workspace-1", itemId, "Kevin", "approved", "access_token=definitely-not-allowed"),
    /secret material/i,
  );
});