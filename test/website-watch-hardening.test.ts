import assert from "node:assert/strict";
import test from "node:test";
import type { WebsiteWatchWorkspace } from "../src/website-watch/domain/website-watch.js";
import type { WebsiteWatchSource } from "../src/website-watch/ports/website-watch-source.js";
import type { WebsiteWatchStore } from "../src/website-watch/ports/website-watch-store.js";
import { WebsiteWatchService } from "../src/website-watch/services/website-watch-service.js";
import { classifyProviderError, hashSnapshot } from "../src/website-watch/utilities/website-watch-utilities.js";

const firstNow = "2026-07-16T12:00:00.000Z";
const secondNow = "2026-07-16T13:00:00.000Z";

class MemoryStore implements WebsiteWatchStore {
  value: WebsiteWatchWorkspace | undefined;
  async load(): Promise<WebsiteWatchWorkspace | undefined> { return this.value; }
  async save(workspace: WebsiteWatchWorkspace): Promise<void> { this.value = workspace; }
}

const registration = (id: string) => ({
  id,
  provider: "manual_fixture" as const,
  label: id,
  configuredAt: firstNow,
  capability: "manual_only" as const,
  limitations: [] as const,
});

const site = {
  id: "site",
  displayName: "Example",
  canonicalUrl: "https://example.com/",
  normalizedDomain: "example.com",
  ownership: "owned" as const,
  purpose: "Monitor public product claims",
  authorizationConfirmed: true,
  retentionClass: "standard" as const,
  owner: "Kevin",
  status: "active" as const,
  createdAt: firstNow,
  updatedAt: firstNow,
};

const target = (id: string) => ({
  id,
  watchedSiteId: "site",
  kind: "page_content" as const,
  targetUrl: `https://example.com/${id}`,
  watchNote: id,
  enabled: true,
  requestedIntervalMinutes: 60,
  adapterId: "fixture",
  retentionClass: "standard" as const,
  reviewRequired: true as const,
  createdAt: firstNow,
  updatedAt: firstNow,
});

const snapshot = (id: string, targetId: string, createdAt: string, screenshotReference?: string) => ({
  id,
  watchedSiteId: "site",
  targetId,
  kind: "page_markdown" as const,
  provider: "fixture",
  observedUrl: `https://example.com/${targetId}`,
  retrievedAt: createdAt,
  contentHash: hashSnapshot(id),
  payloadReference: `fixture:${id}`,
  ...(screenshotReference ? { screenshotReference } : {}),
  limitations: [] as const,
  retentionClass: "standard" as const,
  createdAt,
});

test("a first snapshot for a new target on an existing site remains a baseline", async () => {
  const store = new MemoryStore();
  let clockValue = firstNow;
  const service = new WebsiteWatchService(store, () => new Date(clockValue));
  const firstSource: WebsiteWatchSource = {
    registration: registration("fixture:first"),
    async collect() {
      return {
        source: this.registration,
        status: "verified_no_change" as const,
        checkedAt: firstNow,
        sites: [site],
        targets: [target("target-one")],
        snapshots: [snapshot("snapshot-one", "target-one", firstNow)],
        observations: [],
        generatedAnalyses: [],
        limitations: [],
      };
    },
  };
  const first = await service.collect("workspace", firstSource);
  assert.equal(first.observations[0]?.evidenceState, "baseline");

  clockValue = secondNow;
  const secondSource: WebsiteWatchSource = {
    registration: registration("fixture:second"),
    async collect() {
      return {
        source: this.registration,
        status: "verified_no_change" as const,
        checkedAt: secondNow,
        sites: [site],
        targets: [target("target-two")],
        snapshots: [snapshot("snapshot-two", "target-two", secondNow)],
        observations: [],
        generatedAnalyses: [],
        limitations: [],
      };
    },
  };
  const second = await service.collect("workspace", secondSource);
  const newTargetBaseline = second.observations.find((observation) => observation.targetId === "target-two");
  assert.equal(newTargetBaseline?.evidenceState, "baseline");
  assert.equal(second.sourceHealth.find((health) => health.sourceId === "fixture:second")?.status, "partial");
});

test("partial content evidence survives a screenshot failure without becoming failed", async () => {
  const store = new MemoryStore();
  const service = new WebsiteWatchService(store, () => new Date(firstNow));
  const source: WebsiteWatchSource = {
    registration: registration("fixture:screenshot-partial"),
    async collect() {
      return {
        source: this.registration,
        status: "partial" as const,
        checkedAt: firstNow,
        sites: [site],
        targets: [target("pricing")],
        snapshots: [snapshot("snapshot-partial", "pricing", firstNow)],
        observations: [{
          id: "observation-partial",
          watchedSiteId: "site",
          targetId: "pricing",
          currentSnapshotId: "snapshot-partial",
          sourceId: this.registration.id,
          changeKind: "page_content" as const,
          diffPreview: "+ public price changed",
          evidenceState: "partial" as const,
          confidence: "medium" as const,
          limitations: ["Content evidence succeeded, but screenshot capture failed"],
          reviewState: "suggested" as const,
          generatedAnalysisIds: [],
          observedAt: firstNow,
          createdAt: firstNow,
        }],
        generatedAnalyses: [],
        limitations: ["Screenshot capture failed"],
      };
    },
  };
  const workspace = await service.collect("workspace", source);
  assert.equal(workspace.sourceHealth[0]?.status, "partial");
  assert.equal(workspace.observations[0]?.evidenceState, "partial");
  assert.match(workspace.observations[0]?.limitations.join(" ") ?? "", /screenshot capture failed/i);
});

test("provider error classification preserves every explicit failure class", () => {
  assert.equal(classifyProviderError(Object.assign(new Error("unauthorized"), { status: 401 })), "authentication_failed");
  assert.equal(classifyProviderError(Object.assign(new Error("forbidden"), { status: 403 })), "authentication_failed");
  assert.equal(classifyProviderError(Object.assign(new Error("rate limited"), { status: 429 })), "rate_limited");
  assert.equal(classifyProviderError(Object.assign(new Error("invalid"), { status: 422 })), "validation_failed");
  assert.equal(classifyProviderError(Object.assign(new Error("provider down"), { status: 503 })), "unavailable");
  assert.equal(classifyProviderError(new TypeError("network failed")), "transport_failed");
  assert.equal(classifyProviderError(new Error("cancelled"), true), "cancelled");
  assert.equal(classifyProviderError(new Error("offline"), false, true), "offline");
});

test("snapshot deletion removes screenshot access while retaining observation provenance", async () => {
  const store = new MemoryStore();
  const service = new WebsiteWatchService(store, () => new Date(firstNow));
  const source: WebsiteWatchSource = {
    registration: registration("fixture:screenshot"),
    async collect() {
      return {
        source: this.registration,
        status: "success_change_detected" as const,
        checkedAt: firstNow,
        sites: [site],
        targets: [target("pricing")],
        snapshots: [snapshot("snapshot-with-shot", "pricing", firstNow, "https://cdn.example.com/shot.png")],
        observations: [{
          id: "observation-with-shot",
          watchedSiteId: "site",
          targetId: "pricing",
          currentSnapshotId: "snapshot-with-shot",
          sourceId: this.registration.id,
          changeKind: "page_content" as const,
          diffPreview: "+ changed",
          evidenceState: "change_detected" as const,
          confidence: "high" as const,
          limitations: [],
          reviewState: "suggested" as const,
          generatedAnalysisIds: [],
          observedAt: firstNow,
          createdAt: firstNow,
        }],
        generatedAnalyses: [],
        limitations: [],
      };
    },
  };
  const imported = await service.collect("workspace", source);
  assert.equal(imported.snapshots[0]?.screenshotReference, "https://cdn.example.com/shot.png");
  const deleted = await service.deleteSnapshot("workspace", "snapshot-with-shot", "Kevin");
  assert.equal(deleted.snapshots[0]?.screenshotReference, undefined);
  assert.equal(deleted.snapshots[0]?.payloadReference, "deleted:snapshot-with-shot");
  assert.equal(deleted.observations[0]?.currentSnapshotId, "snapshot-with-shot");
});
