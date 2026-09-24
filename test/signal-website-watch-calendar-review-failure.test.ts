import assert from "node:assert/strict";
import test from "node:test";
import type { ActivationLearningWorkspace, CalendarEntryKind } from "../src/activation-learning/domain/activation-learning.js";
import type { ProductWorkspace } from "../src/product-core/domain/workspace.js";
import type { ProductWorkspaceStore } from "../src/product-core/ports/product-workspace-store.js";
import type { SignalsInbox } from "../src/signals/domain/signal.js";
import type { SignalsInboxStore } from "../src/signals/ports/signals-inbox-store.js";
import { SignalWorkMaterializationService } from "../src/signals/services/signal-work-materialization-service.js";
import type { WebsiteWatchWorkspace } from "../src/website-watch/domain/website-watch.js";
import type { WebsiteWatchStore } from "../src/website-watch/ports/website-watch-store.js";

class SignalsStore implements SignalsInboxStore {
  constructor(public value: SignalsInbox) {}
  async load(): Promise<SignalsInbox> { return this.value; }
  async save(value: SignalsInbox): Promise<void> { this.value = value; }
}

class ProductStore implements ProductWorkspaceStore {
  async load(): Promise<ProductWorkspace | undefined> { return undefined; }
  async save(): Promise<void> {}
}

class WebsiteStore implements WebsiteWatchStore {
  async load(): Promise<WebsiteWatchWorkspace | undefined> { return undefined; }
  async save(): Promise<void> {}
}

class PlanningService {
  async load(): Promise<ActivationLearningWorkspace> {
    throw new Error("Calendar should not be read when signal review authority is withdrawn");
  }
  async createPlanningEntry(_workspaceId: string, _input: Readonly<{
    kind: Exclude<CalendarEntryKind, "external_activation">;
    title: string;
    owner: string;
    startsAt: string;
    endsAt?: string;
    timezone: string;
    notes: string;
    relatedRecordId?: string;
  }>): Promise<ActivationLearningWorkspace> {
    throw new Error("Calendar should not be written when signal review authority is withdrawn");
  }
}

const now = "2026-09-24T13:15:00.000Z";

test("Website Watch materialization records failure when Signals review authority was withdrawn", async () => {
  const signals = new SignalsStore({
    workspaceId: "workspace-1",
    sources: [],
    sourceHealth: [],
    signals: [{
      id: "signal-1",
      fingerprint: "website-change",
      workspaceId: "workspace-1",
      sourceId: "webdog-1",
      kind: "website_change",
      title: "Pricing changed",
      summary: "Previously reviewed evidence",
      freshnessReviewAt: now,
      confidence: "high",
      limitations: [],
      facts: { websiteWatchObservationId: "observation-1" },
      provenance: { provider: "webdog_import", sourceId: "webdog-1", retrievedAt: now },
      relationships: [],
      tags: [],
      status: "dismissed",
      evidenceState: "rejected",
      reviewedBy: "Kevin",
      reviewedAt: now,
    }],
    conversions: [{
      id: "conversion-1",
      signalId: "signal-1",
      kind: "website_watch_action",
      title: "Review pricing response",
      owner: "Kevin",
      createdAt: now,
      status: "proposed",
    }],
    updatedAt: now,
  });
  const service = new SignalWorkMaterializationService(
    signals,
    new ProductStore(),
    () => new Date(now),
    undefined,
    new WebsiteStore(),
    new PlanningService(),
  );

  await assert.rejects(
    () => service.materializeWebsiteWatchAction("workspace-1", "conversion-1", {
      kind: "follow_up",
      startsAt: "2026-09-25T14:00:00.000Z",
      timezone: "America/New_York",
      notes: "Review before responding",
    }),
    /reviewed website-change signal/,
  );

  assert.equal(signals.value.conversions[0]!.status, "materialization_failed");
  assert.match(signals.value.conversions[0]!.materializationFailure?.detail ?? "", /reviewed website-change signal/);
});
