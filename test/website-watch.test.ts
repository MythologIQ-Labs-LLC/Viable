import assert from "node:assert/strict";
import test from "node:test";
import { WebdogManualSignalSource, WebdogManualWebsiteWatchSource, materializeWebdogManualImport } from "../src/website-watch/adapters/webdog-manual-import-source.js";
import type { WebsiteWatchWorkspace } from "../src/website-watch/domain/website-watch.js";
import type { WebsiteWatchSource } from "../src/website-watch/ports/website-watch-source.js";
import type { WebsiteWatchStore } from "../src/website-watch/ports/website-watch-store.js";
import { WebsiteWatchService } from "../src/website-watch/services/website-watch-service.js";
import {
  boundedLineDiff,
  computeNextCheckDueAfterSuccess,
  hashSnapshot,
  isTargetCheckDue,
  validatePublicHttpUrl,
} from "../src/website-watch/utilities/website-watch-utilities.js";

const now = "2026-07-16T12:00:00.000Z";
const clock = () => new Date(now);
const options = {
  owner: "Kevin R. Knapp",
  ownership: "competitor" as const,
  purpose: "Monitor public competitor pricing and positioning changes",
  authorizationConfirmed: true,
  retentionClass: "standard" as const,
};

const payload = JSON.stringify({
  type: "webdog_ai.new_alerts",
  version: 1,
  kind: "new_alerts",
  appBaseUrl: "https://watch.example.com",
  site: { id: "site_1", name: "Example competitor", domain: "example.com" },
  alerts: [{
    id: "alert_1",
    targetId: "target_1",
    title: "Pricing page content changed",
    kind: "PAGE_CONTENT",
    aiChangeSummary: "The pro plan appears less expensive.",
    diffPreview: "- $99 per month\n+ $79 per month",
    dashboardUrl: "https://watch.example.com/dashboard/websites/site_1",
  }],
  summaryText: "One new alert",
});

class MemoryStore implements WebsiteWatchStore {
  value: WebsiteWatchWorkspace | undefined;
  async load(): Promise<WebsiteWatchWorkspace | undefined> { return this.value; }
  async save(workspace: WebsiteWatchWorkspace): Promise<void> { this.value = workspace; }
}

test("Website Watch utilities are deterministic and preserve ordered bounded differences", () => {
  assert.equal(hashSnapshot("same"), hashSnapshot("same"));
  assert.notEqual(hashSnapshot("same"), hashSnapshot("different"));
  const diff = boundedLineDiff("alpha\nbeta\ngamma", "alpha\ngamma\ndelta");
  assert.equal(diff.totalAdded, 1);
  assert.equal(diff.totalRemoved, 1);
  assert.match(diff.preview, /- beta/);
  assert.match(diff.preview, /\+ delta/);
  assert.equal(isTargetCheckDue(undefined, Date.parse(now)), true);
  const next = computeNextCheckDueAfterSuccess(undefined, 60, Date.parse(now));
  assert.equal(next, "2026-07-16T13:00:00.000Z");
});

test("Website Watch URL validation rejects credentials and private network targets", () => {
  assert.throws(() => validatePublicHttpUrl("https://user:password@example.com"), /embedded credentials/);
  assert.throws(() => validatePublicHttpUrl("http://127.0.0.1/admin"), /private|loopback/);
  assert.throws(() => validatePublicHttpUrl("http://169.254.169.254/latest/meta-data"), /private|link-local|reserved/);
  assert.throws(() => validatePublicHttpUrl("file:///etc/passwd"), /HTTP or HTTPS/);
  assert.equal(validatePublicHttpUrl("https://example.com/pricing").hostname, "example.com");
});

test("Webdog import produces bounded website evidence and keeps generated summaries separate", async () => {
  const materialized = materializeWebdogManualImport("webdog:manual", payload, now, options, clock);
  assert.equal(materialized.outcome.status, "success_change_detected");
  assert.equal(materialized.outcome.sites.length, 1);
  assert.equal(materialized.outcome.observations[0]?.reviewState, "suggested");
  assert.equal(materialized.outcome.generatedAnalyses[0]?.kind, "generated_change_summary");
  assert.equal(materialized.signals.status, "success");
  assert.equal(materialized.signals.signals[0]?.kind, "website_change");
  assert.match(materialized.signals.signals[0]?.summary ?? "", /\$79 per month/);
  assert.doesNotMatch(materialized.signals.signals[0]?.summary ?? "", /appears less expensive/);
  assert.equal(materialized.signals.signals[0]?.facts.generatedSummaryAvailable, true);
});

test("Webdog adapters expose consistent Website Watch and Signals outcomes", async () => {
  const websiteSource = new WebdogManualWebsiteWatchSource("webdog:manual", payload, now, options, clock);
  const signalSource = new WebdogManualSignalSource("webdog:manual", payload, now, options, clock);
  const website = await websiteSource.collect();
  const signals = await signalSource.collect();
  assert.equal(website.observations[0]?.externalAlertId, signals.signals[0]?.provenance.externalId);
  assert.equal(website.observations[0]?.id, signals.signals[0]?.facts.websiteWatchObservationId);
});

test("Webdog import rejects credential-bearing fields and off-origin dashboard URLs", async () => {
  const withSecret = JSON.stringify({
    ...JSON.parse(payload),
    apiKey: "sk-not-a-real-key-but-still-prohibited",
  });
  const secretOutcome = await new WebdogManualWebsiteWatchSource("webdog:secret", withSecret, now, options, clock).collect();
  assert.equal(secretOutcome.status, "validation_failed");
  assert.match(secretOutcome.detail ?? "", /prohibited credential-bearing field|secret-like material/);

  const parsed = JSON.parse(payload) as { alerts: Array<Record<string, unknown>> };
  parsed.alerts[0] = { ...parsed.alerts[0], dashboardUrl: "https://evil.example.net/alert" };
  const originOutcome = await new WebdogManualWebsiteWatchSource("webdog:origin", JSON.stringify(parsed), now, options, clock).collect();
  assert.equal(originOutcome.status, "validation_failed");
  assert.match(originOutcome.detail ?? "", /source-instance origin/);
});

test("Website Watch service persists imports and requires named review", async () => {
  const store = new MemoryStore();
  const service = new WebsiteWatchService(store, clock, idSequence());
  const source = new WebdogManualWebsiteWatchSource("webdog:manual", payload, now, options, clock);
  const imported = await service.collect("workspace", source);
  assert.equal(imported.sourceHealth[0]?.status, "success_change_detected");
  assert.equal(imported.observations[0]?.reviewState, "suggested");
  await assert.rejects(() => service.reviewObservation("workspace", imported.observations[0]?.id ?? "", "", true), /named/i);
  const reviewed = await service.reviewObservation("workspace", imported.observations[0]?.id ?? "", "Kevin R. Knapp", true);
  assert.equal(reviewed.observations[0]?.reviewState, "reviewed");
  assert.equal(reviewed.observations[0]?.reviewedBy, "Kevin R. Knapp");
});

test("first no-change snapshot becomes an explicit baseline rather than verified no change", async () => {
  const store = new MemoryStore();
  const service = new WebsiteWatchService(store, clock, idSequence());
  const source: WebsiteWatchSource = {
    registration: {
      id: "fixture:no-change",
      provider: "manual_fixture",
      label: "Fixture",
      configuredAt: now,
      capability: "manual_only",
      limitations: [],
    },
    async collect() {
      return {
        source: this.registration,
        status: "verified_no_change" as const,
        checkedAt: now,
        sites: [{
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
          createdAt: now,
          updatedAt: now,
        }],
        targets: [{
          id: "target",
          watchedSiteId: "site",
          kind: "page_content" as const,
          targetUrl: "https://example.com/",
          watchNote: "Claims",
          enabled: true,
          requestedIntervalMinutes: 60,
          adapterId: "fixture:no-change",
          retentionClass: "standard" as const,
          reviewRequired: true as const,
          createdAt: now,
          updatedAt: now,
        }],
        snapshots: [{
          id: "snapshot",
          watchedSiteId: "site",
          targetId: "target",
          kind: "page_markdown" as const,
          provider: "fixture",
          observedUrl: "https://example.com/",
          retrievedAt: now,
          contentHash: hashSnapshot("baseline"),
          payloadReference: "fixture:baseline",
          limitations: [],
          retentionClass: "standard" as const,
          createdAt: now,
        }],
        observations: [],
        generatedAnalyses: [],
        limitations: [],
      };
    },
  };
  const workspace = await service.collect("workspace", source);
  assert.equal(workspace.sourceHealth[0]?.status, "partial");
  assert.equal(workspace.observations[0]?.evidenceState, "baseline");
  assert.match(workspace.observations[0]?.limitations.join(" ") ?? "", /cannot prove/);
});

test("source failures remain failures and never become verified no change", async () => {
  const store = new MemoryStore();
  const service = new WebsiteWatchService(store, clock, idSequence());
  const source: WebsiteWatchSource = {
    registration: {
      id: "fixture:failure",
      provider: "manual_fixture",
      label: "Fixture failure",
      configuredAt: now,
      capability: "manual_only",
      limitations: [],
    },
    async collect() { throw Object.assign(new Error("rate limited"), { status: 429 }); },
  };
  const workspace = await service.collect("workspace", source);
  assert.equal(workspace.sourceHealth[0]?.status, "rate_limited");
  assert.equal(workspace.observations.length, 0);
});

test("snapshot deletion removes payload access while preserving provenance", async () => {
  const store = new MemoryStore();
  const service = new WebsiteWatchService(store, clock, idSequence());
  const imported = await service.collect("workspace", new WebdogManualWebsiteWatchSource("webdog:manual", payload, now, options, clock));
  const snapshotId = imported.snapshots[0]?.id ?? "";
  const deleted = await service.deleteSnapshot("workspace", snapshotId, "Kevin");
  assert.equal(deleted.snapshots[0]?.payloadReference, `deleted:${snapshotId}`);
  assert.equal(deleted.snapshots[0]?.deletedBy, "Kevin");
  assert.equal(deleted.observations[0]?.currentSnapshotId, snapshotId);
});

function idSequence(): () => string {
  let value = 0;
  return () => `id-${++value}`;
}
