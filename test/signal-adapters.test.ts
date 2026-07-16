import assert from "node:assert/strict";
import test from "node:test";
import { EventIntelligenceSignalSource } from "../src/signals/adapters/event-intelligence-signal-source.js";
import { GitHubPublicRepositorySource } from "../src/signals/adapters/github-public-repository-source.js";
import { ManualJsonSignalSource } from "../src/signals/adapters/manual-json-signal-source.js";

const now = "2026-07-16T00:00:00.000Z";
const clock = () => new Date(now);

test("GitHub adapter preserves missing metrics and partial activity failure", async () => {
  const fetcher = async (url: string): Promise<Response> => url.endsWith("/events?per_page=10")
    ? new Response("", { status: 503 })
    : new Response(JSON.stringify({ id: 7, full_name: "MythologIQ-Labs-LLC/Viable", description: "Marketability OS", html_url: "https://github.com/MythologIQ-Labs-LLC/Viable", updated_at: now, pushed_at: now, stargazers_count: 12 }), { status: 200, headers: { "content-type": "application/json" } });
  const source = new GitHubPublicRepositorySource("github", "MythologIQ-Labs-LLC/Viable", now, fetcher, clock);
  const outcome = await source.collect();
  assert.equal(outcome.status, "partial");
  assert.equal(outcome.signals.length, 1);
  assert.equal(outcome.signals[0]?.facts.stars, 12);
  assert.equal("forks" in (outcome.signals[0]?.facts ?? {}), false);
});

test("GitHub rate limit is explicit and cannot become verified empty", async () => {
  const source = new GitHubPublicRepositorySource("github", "owner/repo", now, async () => new Response("", { status: 403, headers: { "x-ratelimit-remaining": "0" } }), clock);
  const outcome = await source.collect();
  assert.equal(outcome.status, "rate_limited");
  assert.equal(outcome.signals.length, 0);
});

test("manual import rejects malformed data instead of silently succeeding", async () => {
  const source = new ManualJsonSignalSource("manual", "{\"signals\":\"not-an-array\"}", now, clock);
  const outcome = await source.collect();
  assert.equal(outcome.status, "validation_failed");
  assert.equal(outcome.signals.length, 0);
});

test("manual import creates untrusted suggested evidence with limitations", async () => {
  const source = new ManualJsonSignalSource("manual", JSON.stringify({ signals: [{ title: "Possible demand", summary: "A founder asked for help", confidence: "high" }] }), now, clock);
  const outcome = await source.collect();
  assert.equal(outcome.status, "success");
  assert.equal(outcome.signals[0]?.provenance.provider, "manual_import");
  assert.match(outcome.signals[0]?.limitations.join(" ") ?? "", /untrusted/);
});

test("failed Event Intelligence run preserves its source failure", async () => {
  const source = new EventIntelligenceSignalSource("events", {
    run: { runId: "run", startedAt: now, completedAt: now, status: "failed", sources: [{ sourceId: "calendar", status: "transport_failed", events: [], observedAt: now }] },
    events: [],
  }, now);
  const outcome = await source.collect();
  assert.equal(outcome.status, "transport_failed");
  assert.equal(outcome.signals.length, 0);
});
