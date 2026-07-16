import assert from "node:assert/strict";
import test from "node:test";
import { GitHubPublicRepositoryGrowthSource } from "../src/repository-growth/adapters/github-public-repository-growth-source.js";

type Fixture = Readonly<{ status?: number; body?: unknown; headers?: Record<string, string> }>;

function fetcher(fixtures: Record<string, Fixture>) {
  return async (input: string): Promise<Response> => {
    const fixture = fixtures[input];
    if (!fixture) return new Response("missing fixture", { status: 500 });
    return new Response(fixture.body === undefined ? "" : JSON.stringify(fixture.body), {
      status: fixture.status ?? 200,
      headers: { "content-type": "application/json", ...(fixture.headers ?? {}) },
    });
  };
}

const api = "https://api.github.com/repos/MythologIQ-Labs-LLC/Viable";
const completeFixtures = (): Record<string, Fixture> => ({
  [api]: { body: {
    id: 1, full_name: "MythologIQ-Labs-LLC/Viable", name: "Viable", visibility: "public",
    owner: { login: "MythologIQ-Labs-LLC" }, html_url: "https://github.com/MythologIQ-Labs-LLC/Viable",
    description: "Local-first marketability operating system", homepage: "https://example.test/viable",
    topics: ["marketability", "desktop", "github"], default_branch: "main", language: "TypeScript",
    license: { spdx_id: "NOASSERTION" }, archived: false, fork: false,
    pushed_at: "2026-07-16T00:00:00.000Z", stargazers_count: 10, forks_count: 2,
    subscribers_count: 3, open_issues_count: 0,
  } },
  [`${api}/readme`]: { body: { content: Buffer.from("# Viable\n\nQuick start installation, demo, documentation, limitations, alternatives, and use cases.").toString("base64") } },
  [`${api}/community/profile`]: { body: {
    health_percentage: 70, documentation: "https://example.test/docs",
    files: { license: {}, contributing: {}, code_of_conduct: {}, issue_template: {}, pull_request_template: {}, readme: {} },
  } },
  [`${api}/releases?per_page=5`]: { body: [{
    tag_name: "v0.1.0", published_at: "2026-07-15T00:00:00.000Z", body: "Useful release notes",
    assets: [{ download_count: 4 }, { download_count: 6 }],
  }] },
  [`${api}/contents/CHANGELOG.md`]: { status: 404 },
  [`${api}/contents/SECURITY.md`]: { body: { name: "SECURITY.md" } },
  [`${api}/contents/SUPPORT.md`]: { status: 404 },
  [`${api}/contributors?per_page=100&anon=1`]: { body: [{ login: "one" }, { login: "two" }] },
});

test("public collector preserves observed, verified-zero, and unavailable metric states", async () => {
  const source = new GitHubPublicRepositoryGrowthSource(
    "MythologIQ-Labs-LLC/Viable",
    fetcher(completeFixtures()),
    () => new Date("2026-07-16T12:00:00.000Z"),
  );
  const outcome = await source.collect();
  assert.equal(outcome.status, "success");
  const snapshot = outcome.snapshot!;
  assert.equal(snapshot.fullName, "MythologIQ-Labs-LLC/Viable");
  assert.equal(snapshot.frontDoor.quickStartPresent, true);
  assert.equal(snapshot.community.securityPresent, true);
  assert.equal(snapshot.frontDoor.changelogPresent, false);
  assert.equal(snapshot.metrics.find((item) => item.kind === "open_issues")!.state, "verified_zero");
  assert.equal(snapshot.metrics.find((item) => item.kind === "release_downloads")!.value, 10);
  assert.equal(snapshot.metrics.find((item) => item.kind === "views")!.state, "unavailable");
});

test("secondary collection failure produces partial evidence without discarding repository metadata", async () => {
  const fixtures = completeFixtures();
  fixtures[`${api}/community/profile`] = { status: 500 };
  const source = new GitHubPublicRepositoryGrowthSource(
    "MythologIQ-Labs-LLC/Viable",
    fetcher(fixtures),
    () => new Date("2026-07-16T12:00:00.000Z"),
  );
  const outcome = await source.collect();
  assert.equal(outcome.status, "partial");
  assert.equal(outcome.snapshot!.importStatus, "partial");
  assert.ok(outcome.snapshot!.limitations.some((item) => item.includes("Community profile")));
});

test("rate-limited metadata import cannot become an empty successful repository", async () => {
  const fixtures = completeFixtures();
  fixtures[api] = { status: 403, headers: { "x-ratelimit-remaining": "0" } };
  const source = new GitHubPublicRepositoryGrowthSource(
    "MythologIQ-Labs-LLC/Viable",
    fetcher(fixtures),
    () => new Date("2026-07-16T12:00:00.000Z"),
  );
  const outcome = await source.collect();
  assert.equal(outcome.status, "rate_limited");
  assert.equal(outcome.snapshot, undefined);
});
