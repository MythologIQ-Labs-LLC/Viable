import assert from "node:assert/strict";
import test from "node:test";
import { IcsEventSource } from "../src/event-intelligence/adapters/ics-source.js";
import { GitHubPublicRepositoryGrowthSource } from "../src/repository-growth/adapters/github-public-repository-growth-source.js";
import { GitHubPublicRepositorySource } from "../src/signals/adapters/github-public-repository-source.js";

// Browsers and WebKit webviews reject Window.fetch called with any receiver
// other than the global object ("Illegal invocation"). Node's fetch does not,
// so tests that inject fetchers never exercised the production default. This
// stand-in enforces the browser rule for the adapters' default fetcher.
async function withBrowserReceiverFetch(body: (requested: string[]) => Promise<void>): Promise<void> {
  const original = globalThis.fetch;
  const requested: string[] = [];
  globalThis.fetch = function browserFetch(this: unknown, input: string | URL | Request): Promise<Response> {
    if (this !== undefined && this !== globalThis) throw new TypeError("Failed to execute 'fetch' on 'Window': Illegal invocation");
    requested.push(String(input));
    return Promise.resolve(new Response("unavailable in test", { status: 503 }));
  } as typeof fetch;
  try { await body(requested); } finally { globalThis.fetch = original; }
}

test("Signals GitHub source reaches the network with the runtime's default fetch", async () => {
  await withBrowserReceiverFetch(async (requested) => {
    const outcome = await new GitHubPublicRepositorySource("github", "MythologIQ-Labs-LLC/Viable", "2026-10-06T00:00:00.000Z").collect();
    assert.doesNotMatch(outcome.detail ?? "", /Illegal invocation/);
    assert.equal(outcome.status, "unavailable", "the HTTP 503 is classified, not a transport failure");
    assert.ok(requested.includes("https://api.github.com/repos/MythologIQ-Labs-LLC/Viable"));
  });
});

test("Repository Growth GitHub source reaches the network with the runtime's default fetch", async () => {
  await withBrowserReceiverFetch(async (requested) => {
    const outcome = await new GitHubPublicRepositoryGrowthSource("MythologIQ-Labs-LLC/Viable").collect();
    assert.doesNotMatch(JSON.stringify(outcome), /Illegal invocation/);
    assert.ok(requested.includes("https://api.github.com/repos/MythologIQ-Labs-LLC/Viable"));
  });
});

test("ICS event source reaches the network with the runtime's default fetch", async () => {
  await withBrowserReceiverFetch(async (requested) => {
    const outcome = await new IcsEventSource("ics", "https://example.test/events.ics").collect();
    assert.equal(outcome.status, "unavailable");
    assert.deepEqual(requested, ["https://example.test/events.ics"]);
  });
});
