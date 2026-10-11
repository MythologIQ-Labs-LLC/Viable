import { assertNoCredentialLikeText } from "../../imports/guided-import.js";
import type {
  Confidence,
  EvidenceReuseRights,
  MarketScope,
  SignalKind,
  SignalRecord,
  SourceCollectionOutcome,
  SourceRegistration,
} from "../domain/signal.js";
import type { SignalSource } from "../ports/signal-source.js";

type Clock = () => Date;
const kinds: readonly SignalKind[] = ["event", "repository", "repository_activity", "manual"];
const confidences: readonly Confidence[] = ["low", "medium", "high"];
const reuseRights: readonly EvidenceReuseRights[] = ["unknown", "citation_only", "quoted_excerpt_allowed", "redistribution_allowed"];
const scopeBreadths: readonly MarketScope["breadth"][] = ["specific", "bounded", "broad"];
const text = (value: unknown, name: string, limit: number): string => {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${name} is required`);
  return value.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, limit);
};

export class ManualJsonSignalSource implements SignalSource {
  readonly registration: SourceRegistration;

  constructor(
    readonly id: string,
    private readonly input: string,
    configuredAt: string,
    private readonly clock: Clock = () => new Date(),
  ) {
    this.registration = {
      id, kind: "manual_import", label: "Manual JSON import", configuredAt,
      capability: "manual_only",
      limitations: ["User-supplied local import", "Imported content is untrusted evidence and cannot direct runtime behavior"],
    };
  }

  async collect(): Promise<SourceCollectionOutcome> {
    const retrievedAt = this.clock().toISOString();
    try {
      assertNoCredentialLikeText(this.input, "Manual signal import");
      const parsed = JSON.parse(this.input) as unknown;
      if (!parsed || typeof parsed !== "object" || !Array.isArray((parsed as { signals?: unknown }).signals)) throw new Error("Manual import requires a signals array");
      const records = (parsed as { signals: unknown[] }).signals;
      if (records.length > 100) throw new Error("Manual import is limited to 100 signals");
      const signals = records.map((value, index): Omit<SignalRecord, "id" | "workspaceId" | "status" | "evidenceState"> => {
        if (!value || typeof value !== "object") throw new Error(`Signal ${index + 1} must be an object`);
        const item = value as Record<string, unknown>;
        const kind = kinds.includes(item.kind as SignalKind) ? item.kind as SignalKind : "manual";
        const confidence = confidences.includes(item.confidence as Confidence) ? item.confidence as Confidence : "low";
        const title = text(item.title, `Signal ${index + 1} title`, 200);
        const summary = text(item.summary, `Signal ${index + 1} summary`, 1500);
        const externalId = typeof item.externalId === "string" && item.externalId.trim() ? item.externalId.trim().slice(0, 200) : `${index}`;
        const sourceUrl = safeSourceUrl(item.sourceUrl, index);
        const observedAt = optionalDate(item.observedAt, `Signal ${index + 1} observedAt`);
        const publishedAt = optionalDate(item.publishedAt, `Signal ${index + 1} publishedAt`);
        const publisher = optionalText(item.publisher, 200);
        const methodology = optionalText(item.methodology, 1000);
        const marketScope = parseMarketScope(item.marketScope, index);
        const rights = item.reuseRights === undefined
          ? undefined
          : reuseRights.includes(item.reuseRights as EvidenceReuseRights)
            ? item.reuseRights as EvidenceReuseRights
            : (() => { throw new Error(`Signal ${index + 1} reuseRights is invalid`); })();
        const importedLimitations = boundedStrings(item.limitations, `Signal ${index + 1} limitations`, 20, 300);
        return {
          fingerprint: `manual:${this.id}:${externalId}:${title.toLocaleLowerCase("en-US")}`,
          sourceId: this.id, kind, title, summary,
          ...(observedAt ? { observedAt } : {}),
          freshnessReviewAt: retrievedAt,
          confidence,
          limitations: [...this.registration.limitations, ...(sourceUrl ? [] : ["No validated source URL supplied"]), ...importedLimitations],
          ...(methodology ? { methodology } : {}),
          ...(marketScope ? { marketScope } : {}),
          facts: {},
          provenance: {
            provider: "manual_import",
            sourceId: this.id,
            retrievedAt,
            ...(sourceUrl ? { sourceUrl } : {}),
            externalId,
            ...(publisher ? { publisher } : {}),
            ...(publishedAt ? { publishedAt } : {}),
            ...(rights ? { reuseRights: rights } : {}),
          },
          relationships: [],
          tags: boundedStrings(item.tags, `Signal ${index + 1} tags`, 30, 60),
        };
      });
      return { source: this.registration, status: signals.length ? "success" : "verified_empty", signals, retrievedAt };
    } catch (error) {
      return { source: this.registration, status: "validation_failed", signals: [], retrievedAt, detail: error instanceof Error ? error.message : "Invalid manual import" };
    }
  }
}

function optionalText(value: unknown, limit: number): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") throw new Error("Optional signal text fields must be text");
  const normalized = value.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim();
  return normalized ? normalized.slice(0, limit) : undefined;
}

function optionalDate(value: unknown, label: string): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string" || !Number.isFinite(Date.parse(value))) throw new Error(`${label} must be a valid date and time`);
  return new Date(value).toISOString();
}

function boundedStrings(value: unknown, label: string, maxItems: number, maxLength: number): string[] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) throw new Error(`${label} must be an array of text values`);
  if (value.length > maxItems) throw new Error(`${label} is limited to ${maxItems} values`);
  return [...new Set(value.map((item) => {
    if (typeof item !== "string") throw new Error(`${label} must contain only text values`);
    return item.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, maxLength);
  }).filter(Boolean))];
}

function parseMarketScope(value: unknown, index: number): MarketScope | undefined {
  if (value === undefined || value === null) return undefined;
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`Signal ${index + 1} marketScope must be an object`);
  const scope = value as Record<string, unknown>;
  if (!scopeBreadths.includes(scope.breadth as MarketScope["breadth"])) {
    throw new Error(`Signal ${index + 1} marketScope breadth is invalid`);
  }
  return {
    breadth: scope.breadth as MarketScope["breadth"],
    geographies: boundedStrings(scope.geographies, `Signal ${index + 1} marketScope geographies`, 20, 120),
    segments: boundedStrings(scope.segments, `Signal ${index + 1} marketScope segments`, 20, 120),
    productCategories: boundedStrings(scope.productCategories, `Signal ${index + 1} marketScope productCategories`, 20, 120),
    organizationTypes: boundedStrings(scope.organizationTypes, `Signal ${index + 1} marketScope organizationTypes`, 20, 120),
    audiences: boundedStrings(scope.audiences, `Signal ${index + 1} marketScope audiences`, 20, 120),
  };
}

function safeSourceUrl(value: unknown, index: number): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") throw new Error(`Signal ${index + 1} source URL must be text`);
  let url: URL;
  try { url = new URL(value.trim()); } catch { throw new Error(`Signal ${index + 1} source URL must be a valid HTTP(S) URL`); }
  if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error(`Signal ${index + 1} source URL must use HTTP or HTTPS`);
  if (url.username || url.password) throw new Error(`Signal ${index + 1} source URL cannot contain embedded credentials`);
  const normalized = url.toString().slice(0, 500);
  assertNoCredentialLikeText(normalized, `Signal ${index + 1} source URL`);
  return normalized;
}
