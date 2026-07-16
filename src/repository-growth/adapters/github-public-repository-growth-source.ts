import type {
  RepositoryImportOutcome,
  RepositoryMetricKind,
  RepositoryMetricObservation,
} from "../domain/repository-growth.js";

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;
type Clock = () => Date;

const headers = { Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" };
const clean = (value: unknown, limit = 1000): string => String(value ?? "")
  .replace(/[\u0000-\u001f\u007f]/g, " ")
  .replace(/\s+/g, " ")
  .trim()
  .slice(0, limit);

const rawText = (value: unknown, limit = 50_000): string => String(value ?? "")
  .replace(/\u0000/g, "")
  .slice(0, limit);

function failureStatus(response: Response): RepositoryImportOutcome["status"] {
  if (response.status === 401) return "unauthorized";
  if (response.status === 403 && response.headers.get("x-ratelimit-remaining") === "0") return "rate_limited";
  if (response.status === 403) return "forbidden";
  if (response.status === 429) return "rate_limited";
  return "unavailable";
}

function observedMetric(kind: RepositoryMetricKind, value: number, capturedAt: string, source: string, limitation?: string): RepositoryMetricObservation {
  return {
    kind,
    state: value === 0 ? "verified_zero" : "observed",
    value,
    capturedAt,
    source,
    ...(limitation ? { limitation } : {}),
  };
}

function unavailableMetric(kind: RepositoryMetricKind, capturedAt: string, limitation: string): RepositoryMetricObservation {
  return { kind, state: "unavailable", capturedAt, source: "github_public", limitation };
}

function decodeContent(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) return "";
  try {
    const binary = globalThis.atob(value.replace(/\s+/g, ""));
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    return rawText(new TextDecoder().decode(bytes));
  } catch {
    return "";
  }
}

function filePresent(files: Record<string, unknown>, key: string): boolean {
  const value = files[key];
  return Boolean(value && typeof value === "object");
}

export class GitHubPublicRepositoryGrowthSource {
  private readonly apiUrl: string;
  private readonly fullName: string;

  constructor(
    repository: string,
    private readonly fetcher: FetchLike = fetch,
    private readonly clock: Clock = () => new Date(),
  ) {
    if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository)) throw new Error("GitHub repository must use owner/name");
    this.fullName = repository;
    this.apiUrl = `https://api.github.com/repos/${repository}`;
  }

  async collect(signal?: AbortSignal): Promise<RepositoryImportOutcome> {
    const retrievedAt = this.clock().toISOString();
    const request = (path = ""): Promise<Response> => this.fetcher(`${this.apiUrl}${path}`, { headers, ...(signal ? { signal } : {}) });
    try {
      const [repositoryResponse, readmeResponse, communityResponse, releasesResponse, changelogResponse, securityResponse, supportResponse, contributorsResponse] = await Promise.all([
        request(),
        request("/readme"),
        request("/community/profile"),
        request("/releases?per_page=5"),
        request("/contents/CHANGELOG.md"),
        request("/contents/SECURITY.md"),
        request("/contents/SUPPORT.md"),
        request("/contributors?per_page=100&anon=1"),
      ]);

      if (!repositoryResponse.ok) {
        return { status: failureStatus(repositoryResponse), retrievedAt, detail: `Repository metadata HTTP ${repositoryResponse.status}` };
      }

      const repository = await repositoryResponse.json() as Record<string, unknown>;
      const fullName = clean(repository.full_name, 160);
      if (!fullName) return { status: "validation_failed", retrievedAt, detail: "Repository metadata omitted full_name" };
      if (clean(repository.visibility, 40) !== "public") return { status: "validation_failed", retrievedAt, detail: "Repository import requires public visibility" };

      const limitations = [
        "Uses unauthenticated read-only GitHub API access",
        "Repository traffic, referrals, popular content, clones, dependents, integrations, and commercial inquiries require separate evidence",
        "Stars, forks, watchers, downloads, and contributor counts are activity signals, not proof of adoption or ICP fit",
      ];
      let partial = false;
      const noteFailure = (label: string, response: Response): void => {
        if (response.ok || response.status === 404) return;
        partial = true;
        limitations.push(`${label} could not be collected: HTTP ${response.status}`);
      };
      noteFailure("README", readmeResponse);
      noteFailure("Community profile", communityResponse);
      noteFailure("Release sample", releasesResponse);
      noteFailure("Changelog check", changelogResponse);
      noteFailure("SECURITY check", securityResponse);
      noteFailure("SUPPORT check", supportResponse);
      noteFailure("Contributor sample", contributorsResponse);

      const readmeJson = readmeResponse.ok ? await readmeResponse.json() as Record<string, unknown> : {};
      const readmeText = decodeContent(readmeJson.content);
      const readmeLower = readmeText.toLocaleLowerCase("en-US");
      const communityJson = communityResponse.ok ? await communityResponse.json() as Record<string, unknown> : {};
      const files = communityJson.files && typeof communityJson.files === "object" ? communityJson.files as Record<string, unknown> : {};
      const releasesJson = releasesResponse.ok ? await releasesResponse.json() as unknown : [];
      const releases = Array.isArray(releasesJson) ? releasesJson as Record<string, unknown>[] : [];
      const latestRelease = releases[0];
      let releaseDownloads = 0;
      for (const release of releases) {
        const assets = Array.isArray(release.assets) ? release.assets as Record<string, unknown>[] : [];
        for (const asset of assets) if (typeof asset.download_count === "number") releaseDownloads += asset.download_count;
      }
      const contributorJson = contributorsResponse.ok ? await contributorsResponse.json() as unknown : [];
      const contributors = Array.isArray(contributorJson) ? contributorJson.length : 0;

      const metrics: RepositoryMetricObservation[] = [];
      for (const [kind, value] of [
        ["stars", repository.stargazers_count],
        ["forks", repository.forks_count],
        ["watchers", repository.subscribers_count],
        ["open_issues", repository.open_issues_count],
      ] as const) if (typeof value === "number") metrics.push(observedMetric(kind, value, retrievedAt, "github_public"));
      metrics.push(observedMetric("release_downloads", releaseDownloads, retrievedAt, "github_public", "Download total covers the five most recent releases and their assets"));
      metrics.push(observedMetric("contributors", contributors, retrievedAt, "github_public", "Contributor count is a first-page sample capped at 100"));
      for (const kind of [
        "views", "unique_visitors", "clones", "unique_cloners", "referrals", "popular_content",
        "discussions", "dependents", "integrations", "commercial_inquiries",
      ] as const) metrics.push(unavailableMetric(kind, retrievedAt, "Not available through the unauthenticated public repository import"));

      const owner = clean((repository.owner as Record<string, unknown> | undefined)?.login, 100) || fullName.split("/")[0]!;
      const name = clean(repository.name, 100) || fullName.split("/")[1]!;
      const topics = Array.isArray(repository.topics) ? repository.topics.map((value) => clean(value, 60)).filter(Boolean).slice(0, 20) : [];
      const description = clean(repository.description, 700);
      const homepage = clean(repository.homepage, 500);
      const license = repository.license && typeof repository.license === "object"
        ? clean((repository.license as Record<string, unknown>).spdx_id, 80)
        : "";
      const releaseAssets = latestRelease && Array.isArray(latestRelease.assets) ? latestRelease.assets.length > 0 : false;
      const releaseNotes = latestRelease ? clean(latestRelease.body, 500).length > 0 : false;

      return {
        status: partial ? "partial" : "success",
        retrievedAt,
        snapshot: {
          fullName,
          owner,
          name,
          url: clean(repository.html_url, 500) || `https://github.com/${fullName}`,
          visibility: "public",
          description,
          ...(homepage ? { homepage } : {}),
          topics,
          defaultBranch: clean(repository.default_branch, 100) || "main",
          ...(typeof repository.language === "string" && clean(repository.language, 80) ? { primaryLanguage: clean(repository.language, 80) } : {}),
          ...(license ? { license } : {}),
          archived: Boolean(repository.archived),
          fork: Boolean(repository.fork),
          ...(typeof repository.pushed_at === "string" ? { pushedAt: repository.pushed_at } : {}),
          importedAt: retrievedAt,
          importStatus: partial ? "partial" : "success",
          limitations,
          frontDoor: {
            readmePresent: readmeResponse.ok,
            readmeText,
            quickStartPresent: /(quick[ -]?start|get started|getting started|installation|install\b)/i.test(readmeText),
            demoPresent: /(demo|screenshot|video|try it|example)/i.test(readmeText),
            documentationPresent: Boolean(clean(communityJson.documentation, 500)) || /(documentation|docs\b)/i.test(readmeText),
            changelogPresent: changelogResponse.ok,
            socialPreviewState: "unavailable",
          },
          community: {
            ...(typeof communityJson.health_percentage === "number" ? { healthPercentage: communityJson.health_percentage } : {}),
            licensePresent: filePresent(files, "license") || Boolean(license),
            securityPresent: securityResponse.ok,
            contributingPresent: filePresent(files, "contributing"),
            codeOfConductPresent: filePresent(files, "code_of_conduct"),
            supportPresent: supportResponse.ok,
            issueTemplatePresent: filePresent(files, "issue_template"),
            pullRequestTemplatePresent: filePresent(files, "pull_request_template"),
          },
          releases: {
            sampledReleaseCount: releases.length,
            ...(latestRelease && typeof latestRelease.tag_name === "string" ? { latestTag: clean(latestRelease.tag_name, 100) } : {}),
            ...(latestRelease && typeof latestRelease.published_at === "string" ? { latestPublishedAt: latestRelease.published_at } : {}),
            releaseNotesPresent: releaseNotes,
            releaseAssetsPresent: releaseAssets,
          },
          metrics,
        },
      };
    } catch (error) {
      return {
        status: signal?.aborted ? "cancelled" : "transport_failed",
        retrievedAt,
        detail: error instanceof Error ? error.message : "Unknown GitHub repository import failure",
      };
    }
  }
}
