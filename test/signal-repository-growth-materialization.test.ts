import assert from "node:assert/strict";
import test from "node:test";
import type { ProductWorkspace } from "../src/product-core/domain/workspace.js";
import type { ProductWorkspaceStore } from "../src/product-core/ports/product-workspace-store.js";
import type { RepositoryGrowthWorkspace } from "../src/repository-growth/domain/repository-growth.js";
import type { RepositoryGrowthStore } from "../src/repository-growth/ports/repository-growth-store.js";
import type { SignalsInbox } from "../src/signals/domain/signal.js";
import type { SignalsInboxStore } from "../src/signals/ports/signals-inbox-store.js";
import { SignalWorkMaterializationService } from "../src/signals/services/signal-work-materialization-service.js";

class SignalsStore implements SignalsInboxStore {
  constructor(public value: SignalsInbox) {}
  async load(workspaceId: string): Promise<SignalsInbox | undefined> {
    return workspaceId === this.value.workspaceId ? this.value : undefined;
  }
  async save(value: SignalsInbox): Promise<void> { this.value = value; }
}

class ProductStore implements ProductWorkspaceStore {
  async load(): Promise<ProductWorkspace | undefined> { return undefined; }
  async save(): Promise<void> {}
}

class GrowthStore implements RepositoryGrowthStore {
  constructor(public value: RepositoryGrowthWorkspace) {}
  async load(workspaceId: string): Promise<RepositoryGrowthWorkspace | undefined> {
    return workspaceId === this.value.workspaceId ? this.value : undefined;
  }
  async save(value: RepositoryGrowthWorkspace): Promise<void> { this.value = value; }
}

const now = "2026-09-24T14:00:00.000Z";

const inbox = (repositoryTarget = "MythologIQ-Labs-LLC/Viable"): SignalsInbox => ({
  workspaceId: "workspace-1",
  sources: [],
  sourceHealth: [],
  signals: [{
    id: "signal-1",
    fingerprint: "repository-snapshot",
    workspaceId: "workspace-1",
    sourceId: "github:mythologiq-labs-llc/viable",
    kind: "repository",
    title: "Repository snapshot: MythologIQ-Labs-LLC/Viable",
    summary: "Reviewed repository evidence",
    freshnessReviewAt: now,
    confidence: "high",
    limitations: ["Public evidence"],
    facts: { stars: 1 },
    provenance: {
      provider: "github_public",
      sourceId: "github:mythologiq-labs-llc/viable",
      retrievedAt: now,
      sourceUrl: "https://github.com/MythologIQ-Labs-LLC/Viable",
    },
    relationships: [{ kind: "repository", targetId: repositoryTarget, label: repositoryTarget }],
    tags: ["github", "repository"],
    status: "converted",
    evidenceState: "reviewed",
    reviewedBy: "Kevin",
    reviewedAt: now,
  }],
  conversions: [{
    id: "conversion-1",
    signalId: "signal-1",
    kind: "repository_growth_action",
    title: "Improve repository front door",
    owner: "Kevin",
    createdAt: now,
    status: "proposed",
  }],
  updatedAt: now,
});

const growthWorkspace = (overrides?: Partial<RepositoryGrowthWorkspace["plans"][number]["actions"][number]>): RepositoryGrowthWorkspace => ({
  workspaceId: "workspace-1",
  repositories: [{
    id: "repository-1",
    workspaceId: "workspace-1",
    fullName: "MythologIQ-Labs-LLC/Viable",
    owner: "MythologIQ-Labs-LLC",
    name: "Viable",
    url: "https://github.com/MythologIQ-Labs-LLC/Viable",
    visibility: "public",
    description: "Marketability operating system",
    topics: [],
    defaultBranch: "main",
    archived: false,
    fork: false,
    importedAt: now,
    importStatus: "success",
    limitations: ["Public evidence"],
    frontDoor: {
      readmePresent: true,
      readmeText: "Viable",
      quickStartPresent: true,
      demoPresent: false,
      documentationPresent: true,
      changelogPresent: false,
      socialPreviewState: "not_checked",
    },
    community: {
      licensePresent: true,
      securityPresent: true,
      contributingPresent: true,
      codeOfConductPresent: false,
      supportPresent: true,
      issueTemplatePresent: false,
      pullRequestTemplatePresent: false,
    },
    releases: {
      sampledReleaseCount: 0,
      releaseNotesPresent: false,
      releaseAssetsPresent: false,
    },
    metrics: [],
  }],
  assessments: [{
    id: "assessment-1",
    repositoryId: "repository-1",
    createdAt: now,
    createdBy: "Kevin",
    findings: [{
      id: "finding-1",
      dimension: "discoverability",
      rating: 2,
      evidence: ["Social preview was not checked"],
      confidence: "medium",
      impact: "medium",
      effort: "small",
      recommendation: "Review repository social preview and discovery metadata",
      owner: "Kevin",
      verification: "Repository front door exposes reviewed discovery metadata",
    }],
  }],
  plans: [{
    id: "plan-1",
    repositoryId: "repository-1",
    assessmentId: "assessment-1",
    owner: "Kevin",
    createdAt: now,
    actions: [{
      id: "action-1",
      findingId: "finding-1",
      title: "Review repository social preview and discovery metadata",
      owner: "Kevin",
      impact: "medium",
      effort: "small",
      verification: "Repository front door exposes reviewed discovery metadata",
      status: "open",
      ...overrides,
    }],
  }],
  launchRooms: [],
  exports: [],
  retrospectives: [],
  updatedAt: now,
});

const service = (signals: SignalsStore, growth: GrowthStore) => new SignalWorkMaterializationService(
  signals,
  new ProductStore(),
  () => new Date(now),
  undefined,
  undefined,
  undefined,
  growth,
);

test("Repository Growth conversion binds to an active finding-backed action idempotently", async () => {
  const signals = new SignalsStore(inbox());
  const growth = new GrowthStore(growthWorkspace());
  const materializer = service(signals, growth);

  const first = await materializer.materializeRepositoryGrowthAction("workspace-1", "conversion-1", {
    planId: "plan-1",
    actionId: "action-1",
  });
  assert.equal(first.action.id, "action-1");
  assert.equal(first.action.findingId, "finding-1");
  assert.equal(first.inbox.conversions[0]!.status, "materialized");
  assert.equal(first.inbox.conversions[0]!.materialization?.context, "repository_growth");
  assert.equal(first.inbox.conversions[0]!.materialization?.recordId, "action-1");

  const retried = await materializer.materializeRepositoryGrowthAction("workspace-1", "conversion-1", {
    planId: "plan-1",
    actionId: "action-1",
  });
  assert.equal(retried.action.id, "action-1");
  assert.equal(retried.inbox.conversions[0]!.materialization?.recordId, "action-1");
  assert.equal(growth.value.plans[0]!.actions.length, 1);
});

test("Repository Growth materialization fails when the signal belongs to another repository", async () => {
  const signals = new SignalsStore(inbox("someone/else"));
  const growth = new GrowthStore(growthWorkspace());

  await assert.rejects(
    () => service(signals, growth).materializeRepositoryGrowthAction("workspace-1", "conversion-1", {
      planId: "plan-1",
      actionId: "action-1",
    }),
    /does not match the repository owned by the selected growth plan/,
  );
  assert.equal(signals.value.conversions[0]!.status, "materialization_failed");
});

test("Repository Growth materialization fails closed when action fields drift from the governing finding", async () => {
  const signals = new SignalsStore(inbox());
  const growth = new GrowthStore(growthWorkspace({ verification: "Unrelated verification" }));

  await assert.rejects(
    () => service(signals, growth).materializeRepositoryGrowthAction("workspace-1", "conversion-1", {
      planId: "plan-1",
      actionId: "action-1",
    }),
    /no longer matches its governing readiness finding/,
  );
  assert.equal(signals.value.conversions[0]!.status, "materialization_failed");
});

test("Repository Growth materialization does not bind completed or dismissed work", async () => {
  const signals = new SignalsStore(inbox());
  const growth = new GrowthStore(growthWorkspace({ status: "completed" }));

  await assert.rejects(
    () => service(signals, growth).materializeRepositoryGrowthAction("workspace-1", "conversion-1", {
      planId: "plan-1",
      actionId: "action-1",
    }),
    /active open or in-progress action/,
  );
  assert.equal(signals.value.conversions[0]!.status, "materialization_failed");
});
