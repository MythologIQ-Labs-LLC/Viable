import type { SignalRecord, SourceCollectionOutcome, SourceRegistration } from "../../signals/domain/signal.js";
import type { SignalSource } from "../../signals/ports/signal-source.js";
import type {
  WatchTarget,
  WatchedSite,
  WebsiteChangeKind,
  WebsiteChangeObservation,
  WebsiteSnapshot,
  WebsiteWatchGeneratedAnalysis,
  WebsiteWatchSourceOutcome,
  WebsiteWatchSourceRegistration,
} from "../domain/website-watch.js";
import type { WebsiteWatchSource } from "../ports/website-watch-source.js";
import {
  assertNoSecretMaterial,
  assertSameOrigin,
  hashSnapshot,
  normalizeDomain,
  validatePublicHttpUrl,
} from "../utilities/website-watch-utilities.js";

type Clock = () => Date;

type ImportOptions = Readonly<{
  owner: string;
  ownership: WatchedSite["ownership"];
  purpose: string;
  authorizationConfirmed: boolean;
  retentionClass?: WatchedSite["retentionClass"];
}>;

type ParsedAlert = Readonly<{
  id: string;
  targetId: string;
  title: string;
  kind?: "NEW_LINK" | "REMOVED_LINK" | "PAGE_CONTENT" | "PRODUCT_PRICE";
  aiChangeSummary?: string;
  diffPreview?: string;
  dashboardUrl: string;
  suppressed?: boolean;
  suppressionReason?: string;
}>;

type ParsedPayload = Readonly<{
  type: "webdog_ai.new_alerts";
  version: 1;
  kind: "new_alerts";
  appBaseUrl: string;
  site: Readonly<{ id: string; name: string; domain: string }>;
  alerts: readonly ParsedAlert[];
  summaryText?: string;
}>;

type MaterializedWebdogImport = Readonly<{
  outcome: WebsiteWatchSourceOutcome;
  signals: SourceCollectionOutcome;
}>;

const commonLimitations = [
  "Imported from the documented Webdog outbound alert payload rather than a live source-health API",
  "The payload does not contain complete previous and current page snapshots",
  "The payload does not contain screenshot evidence or the complete provider response",
  "The bounded diff preview may omit changed content and is not a semantic or positional proof",
  "Generated summaries and relevance recommendations are not reviewed evidence",
  "DNS resolution and redirect targets were not exercised by the manual import",
] as const;

export class WebdogManualWebsiteWatchSource implements WebsiteWatchSource {
  readonly registration: WebsiteWatchSourceRegistration;

  constructor(
    readonly id: string,
    private readonly input: string,
    configuredAt: string,
    private readonly options: ImportOptions,
    private readonly clock: Clock = () => new Date(),
  ) {
    this.registration = websiteRegistration(id, configuredAt);
  }

  async collect(): Promise<WebsiteWatchSourceOutcome> {
    return materialize(this.id, this.input, this.registration.configuredAt, this.options, this.clock).outcome;
  }
}

export class WebdogManualSignalSource implements SignalSource {
  readonly registration: SourceRegistration;

  constructor(
    readonly id: string,
    private readonly input: string,
    configuredAt: string,
    private readonly options: ImportOptions,
    private readonly clock: Clock = () => new Date(),
  ) {
    this.registration = signalRegistration(id, configuredAt);
  }

  async collect(): Promise<SourceCollectionOutcome> {
    return materialize(this.id, this.input, this.registration.configuredAt, this.options, this.clock).signals;
  }
}

export function materializeWebdogManualImport(
  id: string,
  input: string,
  configuredAt: string,
  options: ImportOptions,
  clock: Clock = () => new Date(),
): MaterializedWebdogImport {
  return materialize(id, input, configuredAt, options, clock);
}

function materialize(
  id: string,
  input: string,
  configuredAt: string,
  options: ImportOptions,
  clock: Clock,
): MaterializedWebdogImport {
  const checkedAt = clock().toISOString();
  const websiteSource = websiteRegistration(id, configuredAt);
  const signalSource = signalRegistration(id, configuredAt);
  try {
    const payload = parsePayload(input);
    if (!options.authorizationConfirmed) throw new Error("Webdog import requires explicit confirmation of a legitimate monitoring purpose");
    const owner = cleanText(options.owner, "Webdog import owner", 160);
    const purpose = cleanText(options.purpose, "Webdog import purpose", 500);
    assertNoSecretMaterial(options);
    const sourceInstance = validatePublicHttpUrl(payload.appBaseUrl, "Webdog source instance");
    const normalizedDomain = normalizeDomain(payload.site.domain);
    const canonicalSiteUrl = validatePublicHttpUrl(`https://${normalizedDomain}/`, "Webdog watched-site URL").toString();
    const retentionClass = options.retentionClass ?? "standard";
    const siteId = stableId("site", `${id}:${payload.site.id}:${normalizedDomain}`);
    const now = checkedAt;
    const site: Omit<WatchedSite, "workspaceId"> = {
      id: siteId,
      displayName: cleanText(payload.site.name, "Webdog site name", 160),
      canonicalUrl: canonicalSiteUrl,
      normalizedDomain,
      ownership: options.ownership,
      purpose,
      authorizationConfirmed: true,
      retentionClass,
      owner,
      status: "active",
      createdAt: now,
      updatedAt: now,
    };

    const targets: Omit<WatchTarget, "workspaceId">[] = [];
    const snapshots: Omit<WebsiteSnapshot, "workspaceId">[] = [];
    const observations: Omit<WebsiteChangeObservation, "workspaceId">[] = [];
    const generatedAnalyses: Omit<WebsiteWatchGeneratedAnalysis, "workspaceId">[] = [];
    const signalCandidates: Omit<SignalRecord, "id" | "workspaceId" | "status" | "evidenceState">[] = [];

    for (const alert of payload.alerts) {
      const dashboard = assertSameOrigin(alert.dashboardUrl, sourceInstance.origin, "Webdog alert dashboard URL");
      const changeKind = classifyChangeKind(alert);
      const targetKind = targetKindForChange(changeKind);
      const targetId = stableId("target", `${id}:${payload.site.id}:${alert.targetId}`);
      const snapshotId = stableId("snapshot", `${id}:${alert.id}`);
      const observationId = stableId("observation", `${id}:${alert.id}`);
      const generatedIds: string[] = [];
      const target: Omit<WatchTarget, "workspaceId"> = {
        id: targetId,
        watchedSiteId: siteId,
        kind: targetKind,
        ...(targetKind === "site_links" ? { linkScope: changeKind === "links_added" ? "added" : changeKind === "links_removed" ? "removed" : "both" } : { targetUrl: canonicalSiteUrl }),
        watchNote: cleanText(alert.title, "Webdog alert title", 300),
        enabled: true,
        requestedIntervalMinutes: 60,
        adapterId: id,
        retentionClass,
        reviewRequired: true,
        createdAt: now,
        updatedAt: now,
      };
      targets.push(target);

      const evidenceText = [alert.title, alert.diffPreview ?? "", dashboard.toString()].join("\n");
      const deleteAfter = retentionDeadline(now, retentionClass);
      const snapshot: Omit<WebsiteSnapshot, "workspaceId"> = {
        id: snapshotId,
        watchedSiteId: siteId,
        targetId,
        kind: "webdog_alert",
        provider: "webdog_import",
        observedUrl: canonicalSiteUrl,
        retrievedAt: now,
        correlationReference: `${payload.site.id}:${alert.targetId}:${alert.id}`,
        contentHash: hashSnapshot(evidenceText),
        payloadReference: `bounded:webdog-alert:${alert.id}`,
        limitations: [...commonLimitations, "The monitored page URL is not present in the documented Webdog alert payload; the watched-site canonical URL is retained instead"],
        retentionClass,
        ...(deleteAfter ? { deleteAfter } : {}),
        createdAt: now,
      };
      snapshots.push(snapshot);

      if (alert.aiChangeSummary) {
        const analysisId = stableId("analysis", `${id}:${alert.id}:summary`);
        generatedIds.push(analysisId);
        generatedAnalyses.push({
          id: analysisId,
          observationId,
          kind: "generated_change_summary",
          content: alert.aiChangeSummary,
          provider: "webdog",
          generatedAt: now,
          limitations: ["Imported generated summary; provider model and prompt are not present in the Webdog outbound payload", "Generated text is not reviewed evidence"],
        });
      }
      if (alert.suppressed || alert.suppressionReason) {
        const analysisId = stableId("analysis", `${id}:${alert.id}:relevance`);
        generatedIds.push(analysisId);
        generatedAnalyses.push({
          id: analysisId,
          observationId,
          kind: "generated_relevance_recommendation",
          content: alert.suppressionReason ?? "Webdog marked this alert as suppressed noise",
          provider: "webdog",
          generatedAt: now,
          limitations: ["Imported relevance recommendation is advisory and does not replace named human review"],
        });
      }

      const diffPreview = alert.diffPreview ?? "";
      const observationLimitations = [...commonLimitations];
      if (!diffPreview) observationLimitations.push("No bounded diff preview was included in the Webdog payload");
      const observation: Omit<WebsiteChangeObservation, "workspaceId"> = {
        id: observationId,
        watchedSiteId: siteId,
        targetId,
        currentSnapshotId: snapshotId,
        sourceId: id,
        externalAlertId: alert.id,
        changeKind,
        diffPreview,
        evidenceState: "change_detected",
        confidence: diffPreview ? "medium" : "low",
        limitations: observationLimitations,
        reviewState: "suggested",
        generatedAnalysisIds: generatedIds,
        observedAt: now,
        createdAt: now,
      };
      observations.push(observation);

      const summary = diffPreview
        ? `${alert.title}\n${diffPreview}`.slice(0, 1500)
        : `${alert.title}. The import did not include a diff preview.`;
      signalCandidates.push({
        fingerprint: `webdog:${sourceInstance.origin}:${payload.site.id}:${alert.id}`,
        sourceId: id,
        kind: "website_change",
        title: alert.title,
        summary,
        observedAt: now,
        freshnessReviewAt: now,
        confidence: diffPreview ? "medium" : "low",
        limitations: observationLimitations,
        facts: {
          websiteWatchObservationId: observationId,
          webdogSiteId: payload.site.id,
          webdogTargetId: alert.targetId,
          webdogAlertId: alert.id,
          sourceInstance: sourceInstance.origin,
          dashboardUrl: dashboard.toString(),
          changeKind,
          diffPreview,
          generatedSummaryAvailable: Boolean(alert.aiChangeSummary),
          generatedRelevanceAvailable: Boolean(alert.suppressed || alert.suppressionReason),
        },
        provenance: {
          provider: "webdog_import",
          sourceId: id,
          retrievedAt: now,
          sourceUrl: dashboard.toString(),
          externalId: alert.id,
        },
        relationships: [{ kind: "organization", targetId: siteId, label: site.displayName }],
        tags: ["website-watch", changeKind, options.ownership],
      });
    }

    return {
      outcome: {
        source: websiteSource,
        status: "success_change_detected",
        checkedAt,
        sites: [site],
        targets: dedupeById(targets),
        snapshots,
        observations,
        generatedAnalyses,
        limitations: [...commonLimitations],
      },
      signals: {
        source: signalSource,
        status: "success",
        signals: signalCandidates,
        retrievedAt: checkedAt,
      },
    };
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Invalid Webdog import";
    return {
      outcome: {
        source: websiteSource,
        status: "validation_failed",
        checkedAt,
        sites: [],
        targets: [],
        snapshots: [],
        observations: [],
        generatedAnalyses: [],
        limitations: [...commonLimitations],
        detail,
      },
      signals: {
        source: signalSource,
        status: "validation_failed",
        signals: [],
        retrievedAt: checkedAt,
        detail,
      },
    };
  }
}

function parsePayload(input: string): ParsedPayload {
  if (input.length > 524_288) throw new Error("Webdog import is limited to 512 KiB");
  const parsed = JSON.parse(input) as unknown;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("Webdog import must be a JSON object");
  assertNoSecretMaterial(parsed);
  const value = parsed as Record<string, unknown>;
  assertAllowedKeys(value, ["type", "version", "kind", "appBaseUrl", "site", "alerts", "summaryText"], "Webdog payload");
  if (value.type !== "webdog_ai.new_alerts" || value.version !== 1 || value.kind !== "new_alerts") {
    throw new Error("Webdog import requires type webdog_ai.new_alerts, version 1, and kind new_alerts");
  }
  const appBaseUrl = cleanText(value.appBaseUrl, "Webdog appBaseUrl", 500);
  const siteValue = object(value.site, "Webdog site");
  assertAllowedKeys(siteValue, ["id", "name", "domain"], "Webdog site");
  const site = {
    id: cleanText(siteValue.id, "Webdog site id", 200),
    name: cleanText(siteValue.name, "Webdog site name", 160),
    domain: cleanText(siteValue.domain, "Webdog site domain", 253),
  };
  if (!Array.isArray(value.alerts) || value.alerts.length < 1 || value.alerts.length > 100) {
    throw new Error("Webdog import requires between 1 and 100 alerts");
  }
  const alerts = value.alerts.map((item, index): ParsedAlert => {
    const alert = object(item, `Webdog alert ${index + 1}`);
    assertAllowedKeys(alert, ["id", "targetId", "title", "kind", "aiChangeSummary", "diffPreview", "dashboardUrl", "suppressed", "suppressionReason"], `Webdog alert ${index + 1}`);
    const kind = alert.kind === undefined ? undefined : allowedAlertKind(alert.kind, index);
    const aiChangeSummary = optionalText(alert.aiChangeSummary, `Webdog alert ${index + 1} generated summary`, 3000);
    const diffPreview = optionalText(alert.diffPreview, `Webdog alert ${index + 1} diff preview`, 5000);
    const suppressionReason = optionalText(alert.suppressionReason, `Webdog alert ${index + 1} suppression reason`, 1000);
    if (alert.suppressed !== undefined && typeof alert.suppressed !== "boolean") throw new Error(`Webdog alert ${index + 1} suppressed must be boolean`);
    return {
      id: cleanText(alert.id, `Webdog alert ${index + 1} id`, 200),
      targetId: cleanText(alert.targetId, `Webdog alert ${index + 1} target id`, 200),
      title: cleanText(alert.title, `Webdog alert ${index + 1} title`, 300),
      ...(kind ? { kind } : {}),
      ...(aiChangeSummary ? { aiChangeSummary } : {}),
      ...(diffPreview ? { diffPreview } : {}),
      dashboardUrl: cleanText(alert.dashboardUrl, `Webdog alert ${index + 1} dashboard URL`, 500),
      ...(typeof alert.suppressed === "boolean" ? { suppressed: alert.suppressed } : {}),
      ...(suppressionReason ? { suppressionReason } : {}),
    };
  });
  const summaryText = optionalText(value.summaryText, "Webdog summaryText", 3000);
  return {
    type: "webdog_ai.new_alerts",
    version: 1,
    kind: "new_alerts",
    appBaseUrl,
    site,
    alerts,
    ...(summaryText ? { summaryText } : {}),
  };
}

function websiteRegistration(id: string, configuredAt: string): WebsiteWatchSourceRegistration {
  return {
    id,
    provider: "webdog_import",
    label: "Webdog compatible manual import",
    configuredAt,
    capability: "manual_only",
    limitations: [...commonLimitations],
  };
}

function signalRegistration(id: string, configuredAt: string): SourceRegistration {
  return {
    id,
    kind: "webdog_import",
    label: "Webdog website-change import",
    configuredAt,
    capability: "manual_only",
    limitations: [...commonLimitations],
  };
}

function classifyChangeKind(alert: ParsedAlert): WebsiteChangeKind {
  if (alert.kind === "NEW_LINK") return "links_added";
  if (alert.kind === "REMOVED_LINK") return "links_removed";
  if (alert.kind === "PRODUCT_PRICE") return "product_price";
  if (alert.kind === "PAGE_CONTENT") return "page_content";
  const title = alert.title.toLocaleLowerCase("en-US");
  if (title.includes("price")) return "product_price";
  if (title.includes("new link")) return "links_added";
  if (title.includes("removed link")) return "links_removed";
  return "external_alert";
}

function targetKindForChange(changeKind: WebsiteChangeKind): WatchTarget["kind"] {
  if (changeKind === "links_added" || changeKind === "links_removed") return "site_links";
  if (changeKind === "product_price") return "product_price";
  return "page_content";
}

function allowedAlertKind(value: unknown, index: number): ParsedAlert["kind"] {
  if (value === "NEW_LINK" || value === "REMOVED_LINK" || value === "PAGE_CONTENT" || value === "PRODUCT_PRICE") return value;
  throw new Error(`Webdog alert ${index + 1} kind is unsupported`);
}

function retentionDeadline(now: string, retentionClass: WatchedSite["retentionClass"]): string | undefined {
  if (retentionClass === "extended") return undefined;
  const days = retentionClass === "ephemeral" ? 14 : 90;
  return new Date(Date.parse(now) + days * 86_400_000).toISOString();
}

function stableId(prefix: string, value: string): string {
  return `${prefix}:${hashSnapshot(value).slice(0, 24)}`;
}

function cleanText(value: unknown, label: string, limit: number): string {
  if (typeof value !== "string") throw new Error(`${label} is required`);
  const normalized = value.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim();
  if (!normalized) throw new Error(`${label} is required`);
  if (normalized.length > limit) throw new Error(`${label} exceeds ${limit} characters`);
  return normalized;
}

function optionalText(value: unknown, label: string, limit: number): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  return cleanText(value, label, limit);
}

function object(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${label} must be an object`);
  return value as Record<string, unknown>;
}

function assertAllowedKeys(value: Record<string, unknown>, allowed: readonly string[], label: string): void {
  const unexpected = Object.keys(value).filter((key) => !allowed.includes(key));
  if (unexpected.length) throw new Error(`${label} contains unsupported fields: ${unexpected.join(", ")}`);
}

function dedupeById<T extends { id: string }>(items: readonly T[]): T[] {
  return [...new Map(items.map((item) => [item.id, item])).values()];
}
