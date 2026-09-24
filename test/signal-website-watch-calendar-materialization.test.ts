import assert from "node:assert/strict";
import test from "node:test";
import type { ActivationLearningWorkspace, CalendarEntry, CalendarEntryKind } from "../src/activation-learning/domain/activation-learning.js";
import type { ProductWorkspace } from "../src/product-core/domain/workspace.js";
import type { ProductWorkspaceStore } from "../src/product-core/ports/product-workspace-store.js";
import type { SignalsInbox } from "../src/signals/domain/signal.js";
import type { SignalsInboxStore } from "../src/signals/ports/signals-inbox-store.js";
import { SignalWorkMaterializationService } from "../src/signals/services/signal-work-materialization-service.js";
import type { WebsiteWatchWorkspace } from "../src/website-watch/domain/website-watch.js";
import type { WebsiteWatchStore } from "../src/website-watch/ports/website-watch-store.js";

class MemorySignalsStore implements SignalsInboxStore {
  constructor(public value: SignalsInbox) {}
  async load(workspaceId: string): Promise<SignalsInbox | undefined> {
    return this.value.workspaceId === workspaceId ? this.value : undefined;
  }
  async save(inbox: SignalsInbox): Promise<void> { this.value = inbox; }
}

class MemoryProductStore implements ProductWorkspaceStore {
  async load(): Promise<ProductWorkspace | undefined> { return undefined; }
  async save(): Promise<void> {}
}

class MemoryWebsiteStore implements WebsiteWatchStore {
  constructor(public value: WebsiteWatchWorkspace) {}
  async load(workspaceId: string): Promise<WebsiteWatchWorkspace | undefined> {
    return this.value.workspaceId === workspaceId ? this.value : undefined;
  }
  async save(workspace: WebsiteWatchWorkspace): Promise<void> { this.value = workspace; }
}

class MemoryPlanningService {
  createCount = 0;
  value: ActivationLearningWorkspace = {
    workspaceId: "workspace-1",
    destinations: [],
    calendarEntries: [],
    packages: [],
    exportOperations: [],
    deliveryOutcomes: [],
    measurementPlans: [],
    performanceImports: [],
    retrospectives: [],
    learningLedger: [],
    updatedAt: "2026-09-23T23:00:00.000Z",
  };

  async load(workspaceId: string): Promise<ActivationLearningWorkspace> {
    assert.equal(workspaceId, this.value.workspaceId);
    return this.value;
  }

  async createPlanningEntry(workspaceId: string, input: Readonly<{
    kind: Exclude<CalendarEntryKind, "external_activation">;
    title: string;
    owner: string;
    startsAt: string;
    endsAt?: string;
    timezone: string;
    notes: string;
    relatedRecordId?: string;
  }>): Promise<ActivationLearningWorkspace> {
    this.createCount += 1;
    const now = "2026-09-23T23:00:00.000Z";
    const entry: CalendarEntry = {
      id: `calendar-${this.createCount}`,
      workspaceId,
      kind: input.kind,
      title: input.title,
      owner: input.owner,
      startsAt: input.startsAt,
      ...(input.endsAt ? { endsAt: input.endsAt } : {}),
      timezone: input.timezone,
      notes: input.notes,
      ...(input.relatedRecordId ? { relatedRecordId: input.relatedRecordId } : {}),
      scheduleStatus: "scheduled",
      activationStatus: "not_applicable",
      createdAt: now,
      updatedAt: now,
    };
    this.value = { ...this.value, calendarEntries: [...this.value.calendarEntries, entry], updatedAt: now };
    return this.value;
  }
}

const now = "2026-09-23T23:00:00.000Z";

const inbox = (): SignalsInbox => ({
  workspaceId: "workspace-1",
  sources: [],
  sourceHealth: [],
  signals: [{
    id: "signal-1",
    fingerprint: "website-change",
    workspaceId: "workspace-1",
    sourceId: "webdog-1",
    kind: "website_change",
    title: "Competitor pricing page changed",
    summary: "A reviewed pricing-page change needs follow-up",
    freshnessReviewAt: now,
    confidence: "high",
    limitations: ["Manual Webdog import"],
    facts: { websiteWatchObservationId: "observation-1" },
    provenance: { provider: "webdog_import", sourceId: "webdog-1", retrievedAt: now },
    relationships: [],
    tags: [],
    owner: "Kevin",
    status: "converted",
    evidenceState: "reviewed",
    reviewedBy: "Kevin",
    reviewedAt: now,
  }],
  conversions: [{
    id: "conversion-1",
    signalId: "signal-1",
    kind: "website_watch_action",
    title: "Review competitor pricing response",
    owner: "Kevin",
    createdAt: now,
    status: "proposed",
  }],
  updatedAt: now,
});

const website = (reviewState: "reviewed" | "rejected" = "reviewed"): WebsiteWatchWorkspace => ({
  workspaceId: "workspace-1",
  sources: [],
  sourceHealth: [],
  sites: [],
  targets: [],
  snapshots: [],
  observations: [{
    id: "observation-1",
    workspaceId: "workspace-1",
    watchedSiteId: "site-1",
    targetId: "target-1",
    currentSnapshotId: "snapshot-1",
    sourceId: "webdog-1",
    changeKind: "page_content",
    diffPreview: "Pricing changed",
    evidenceState: "change_detected",
    confidence: "high",
    limitations: ["Manual Webdog import"],
    reviewState,
    ...(reviewState === "reviewed" ? { reviewedBy: "Kevin", reviewedAt: now } : {}),
    generatedAnalysisIds: [],
    observedAt: now,
    createdAt: now,
  }],
  generatedAnalyses: [],
  updatedAt: now,
});

const input = {
  kind: "follow_up" as const,
  startsAt: "2026-09-24T14:00:00.000Z",
  timezone: "America/New_York",
  notes: "Review the bounded website evidence before deciding a response.",
};

test("Website Watch response conversion materializes into Calendar authority idempotently", async () => {
  const signals = new MemorySignalsStore(inbox());
  const websites = new MemoryWebsiteStore(website());
  const planning = new MemoryPlanningService();
  const service = new SignalWorkMaterializationService(signals, new MemoryProductStore(), () => new Date(now), undefined, websites, planning);

  const first = await service.materializeWebsiteWatchAction("workspace-1", "conversion-1", input);
  assert.equal(first.entry.kind, "follow_up");
  assert.equal(first.entry.title, "Review competitor pricing response");
  assert.equal(first.entry.owner, "Kevin");
  assert.equal(first.entry.relatedRecordId, "signal-conversion:conversion-1");
  assert.match(first.entry.notes, /Website Watch observation: observation-1/);
  assert.equal(first.inbox.conversions[0]!.status, "materialized");
  assert.equal(first.inbox.conversions[0]!.materialization?.context, "calendar");
  assert.equal(first.inbox.conversions[0]!.materialization?.recordId, first.entry.id);
  assert.equal(planning.createCount, 1);

  signals.value = {
    ...signals.value,
    conversions: signals.value.conversions.map((conversion) => conversion.id === "conversion-1"
      ? { id: conversion.id, signalId: conversion.signalId, kind: conversion.kind, title: conversion.title, owner: conversion.owner, createdAt: conversion.createdAt, status: "proposed" as const }
      : conversion),
  };
  const retried = await service.materializeWebsiteWatchAction("workspace-1", "conversion-1", input);
  assert.equal(retried.entry.id, first.entry.id);
  assert.equal(planning.createCount, 1);
  assert.equal(retried.inbox.conversions[0]!.materialization?.recordId, first.entry.id);
});

test("Website Watch response conversion fails closed when observation authority is no longer reviewed", async () => {
  const signals = new MemorySignalsStore(inbox());
  const websites = new MemoryWebsiteStore(website("rejected"));
  const planning = new MemoryPlanningService();
  const service = new SignalWorkMaterializationService(signals, new MemoryProductStore(), () => new Date(now), undefined, websites, planning);

  await assert.rejects(
    () => service.materializeWebsiteWatchAction("workspace-1", "conversion-1", input),
    /currently reviewed Website Watch observation/,
  );
  assert.equal(signals.value.conversions[0]!.status, "materialization_failed");
  assert.match(signals.value.conversions[0]!.materializationFailure?.detail ?? "", /currently reviewed Website Watch observation/);
  assert.equal(planning.createCount, 0);
});
