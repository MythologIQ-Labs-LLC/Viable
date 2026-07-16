import type { SignalRecord, SourceCollectionOutcome, SourceRegistration } from "../domain/signal.js";
import type { SignalSource } from "../ports/signal-source.js";

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;
type Clock = () => Date;

const clean = (value: unknown, limit = 500): string =>
  String(value ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, limit);

const reviewAt = (retrievedAt: string): string => {
  const value = new Date(retrievedAt);
  value.setUTCDate(value.getUTCDate() + 7);
  return value.toISOString();
};

function failureStatus(response: Response): SourceCollectionOutcome["status"] {
  if (response.status === 401) return "unauthorized";
  if (response.status === 403 && response.headers.get("x-ratelimit-remaining") === "0") return "rate_limited";
  if (response.status === 403) return "forbidden";
  if (response.status === 429) return "rate_limited";
  return "unavailable";
}

export class GitHubPublicRepositorySource implements SignalSource {
  readonly registration: SourceRegistration;
  private readonly apiUrl: string;

  constructor(
    readonly id: string,
    repository: string,
    configuredAt: string,
    private readonly fetcher: FetchLike = fetch,
    private readonly clock: Clock = () => new Date(),
  ) {
    if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository)) throw new Error("GitHub repository must use owner/name");
    this.apiUrl = `https://api.github.com/repos/${repository}`;
    this.registration = {
      id, kind: "github_public", label: `GitHub: ${repository}`, configuredAt,
      capability: "available",
      limitations: [
        "Uses unauthenticated public GitHub API access",
        "Rate limits and unavailable metrics remain explicit",
        "Public activity is evidence, not proof of adoption or ICP fit",
      ],
    };
  }

  async collect(signal?: AbortSignal): Promise<SourceCollectionOutcome> {
    const retrievedAt = this.clock().toISOString();
    try {
      const headers = { Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" };
      const [repositoryResponse, activityResponse] = await Promise.all([
        this.fetcher(this.apiUrl, { headers, ...(signal ? { signal } : {}) }),
        this.fetcher(`${this.apiUrl}/events?per_page=10`, { headers, ...(signal ? { signal } : {}) }),
      ]);
      if (!repositoryResponse.ok) {
        return { source: this.registration, status: failureStatus(repositoryResponse), signals: [], retrievedAt, detail: `Repository metadata HTTP ${repositoryResponse.status}` };
      }

      const repository = await repositoryResponse.json() as Record<string, unknown>;
      const fullName = clean(repository.full_name, 160);
      if (!fullName) return { source: this.registration, status: "validation_failed", signals: [], retrievedAt, detail: "Repository metadata omitted full_name" };

      const facts: Record<string, string | number | boolean | null> = {
        visibility: clean(repository.visibility, 40) || "public",
        archived: Boolean(repository.archived),
        fork: Boolean(repository.fork),
      };
      for (const [key, value] of [
        ["stars", repository.stargazers_count], ["forks", repository.forks_count],
        ["openIssues", repository.open_issues_count], ["watchers", repository.subscribers_count],
      ] as const) if (typeof value === "number") facts[key] = value;
      if (typeof repository.pushed_at === "string") facts.lastPushAt = repository.pushed_at;
      if (typeof repository.language === "string") facts.primaryLanguage = clean(repository.language, 80);

      const base: Omit<SignalRecord, "id" | "workspaceId" | "status" | "evidenceState"> = {
        fingerprint: `github-repository:${fullName.toLocaleLowerCase("en-US")}:${clean(repository.updated_at, 80)}`,
        sourceId: this.id,
        kind: "repository",
        title: `Repository snapshot: ${fullName}`,
        summary: clean(repository.description, 700) || "Public repository metadata snapshot",
        ...(typeof repository.pushed_at === "string" ? { observedAt: repository.pushed_at } : {}),
        freshnessReviewAt: reviewAt(retrievedAt),
        confidence: "high",
        limitations: this.registration.limitations,
        facts,
        provenance: {
          provider: "github_public", sourceId: this.id, retrievedAt,
          sourceUrl: clean(repository.html_url, 500) || `https://github.com/${fullName}`,
          externalId: String(repository.id ?? fullName),
        },
        relationships: [{ kind: "repository", targetId: fullName, label: fullName }],
        tags: ["github", "repository"],
      };

      if (!activityResponse.ok) {
        return { source: this.registration, status: "partial", signals: [base], retrievedAt, detail: `Activity HTTP ${activityResponse.status}; repository metadata preserved` };
      }
      const activity = await activityResponse.json() as unknown;
      const events = Array.isArray(activity) ? activity : [];
      const signals = [base];
      if (events.length > 0) {
        const latest = events[0] as Record<string, unknown>;
        signals.push({
          fingerprint: `github-activity:${fullName.toLocaleLowerCase("en-US")}:${clean(latest.id, 120)}`,
          sourceId: this.id,
          kind: "repository_activity",
          title: `Recent public activity: ${fullName}`,
          summary: `${events.length} recent public events retrieved; latest type: ${clean(latest.type, 100) || "unknown"}`,
          ...(typeof latest.created_at === "string" ? { observedAt: latest.created_at } : {}),
          freshnessReviewAt: reviewAt(retrievedAt),
          confidence: "medium",
          limitations: [...this.registration.limitations, "Public events endpoint is a recent sample, not a complete activity ledger"],
          facts: { retrievedEventCount: events.length, latestEventType: clean(latest.type, 100) || "unknown" },
          provenance: { provider: "github_public", sourceId: this.id, retrievedAt, sourceUrl: `${this.apiUrl}/events`, externalId: clean(latest.id, 120) },
          relationships: [{ kind: "repository", targetId: fullName, label: fullName }],
          tags: ["github", "repository", "activity"],
        });
      }
      return { source: this.registration, status: signals.length > 0 ? "success" : "verified_empty", signals, retrievedAt };
    } catch (error) {
      return {
        source: this.registration,
        status: signal?.aborted ? "cancelled" : "transport_failed",
        signals: [],
        retrievedAt,
        detail: error instanceof Error ? error.message : "Unknown GitHub transport failure",
      };
    }
  }
}
