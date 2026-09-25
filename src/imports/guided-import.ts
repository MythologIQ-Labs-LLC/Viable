import type { EventCandidate, ScoredEvent } from "../event-intelligence/domain/event.js";
import type { EventIntelligenceRun, SourceOutcome } from "../event-intelligence/domain/source-outcome.js";
import type { StoredEventIntelligenceRun } from "../event-intelligence/ports/run-store.js";

const MAX_EVENT_IMPORT_CHARACTERS = 5_242_880;
const SECRET_PATTERN = /(?:api[_-]?key|access[_-]?token|refresh[_-]?token|client[_-]?secret|password|private[_-]?key|credential)\s*[:=]\s*["']?[A-Za-z0-9_./+\-=]{12,}|\b(?:sk-[A-Za-z0-9_-]{16,}|gh[opusr]_[A-Za-z0-9]{20,})\b/i;
const RUN_STATUSES = new Set(["success", "verified_empty", "partial", "failed"]);
const SOURCE_STATUSES = new Set([
  "success", "verified_empty", "partial", "unsupported", "unauthorized", "forbidden", "rate_limited", "unavailable",
  "validation_failed", "transport_failed", "cancelled",
]);

export type GuidedManualSignalInput = Readonly<{
  title: string;
  summary: string;
  sourceUrl?: string;
  observedAt?: string;
  confidence: "low" | "medium" | "high";
  tags: readonly string[];
}>;

export function assertNoCredentialLikeText(value: string, label: string): void {
  if (SECRET_PATTERN.test(value)) throw new Error(`${label} appears to contain a credential or secret-like value. Remove it before importing evidence.`);
}

export function buildGuidedManualSignalPayload(input: GuidedManualSignalInput): string {
  const title = requiredText(input.title, "Signal title", 200);
  const summary = requiredText(input.summary, "Signal summary", 1500);
  const sourceUrl = optionalHttpUrl(input.sourceUrl, "Source URL");
  const observedAt = optionalDate(input.observedAt, "Observed date");
  const tags = input.tags.map((tag) => cleanText(tag, 60)).filter(Boolean).slice(0, 20);
  const payload = {
    signals: [{
      kind: "manual",
      title,
      summary,
      confidence: input.confidence,
      ...(sourceUrl ? { sourceUrl } : {}),
      ...(observedAt ? { observedAt } : {}),
      tags,
    }],
  };
  const text = JSON.stringify(payload);
  assertNoCredentialLikeText(text, "Manual signal evidence");
  return text;
}

export function parseEventIntelligenceImport(text: string): StoredEventIntelligenceRun {
  if (!text.trim()) throw new Error("Choose a non-empty Event Intelligence JSON export.");
  if (text.length > MAX_EVENT_IMPORT_CHARACTERS) throw new Error("Event Intelligence import is limited to 5 MiB of JSON text.");
  assertNoCredentialLikeText(text, "Event Intelligence import");
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("Event Intelligence file is not valid JSON. Export the run again or use the advanced adapter only with a valid run export.");
  }
  if (!isRecord(parsed)) throw new Error("Event Intelligence import must contain a run object and an events array.");
  const run = parseRun(parsed.run);
  if (!Array.isArray(parsed.events)) throw new Error("Event Intelligence import is missing the events array.");
  if (parsed.events.length > 5_000) throw new Error("Event Intelligence import is limited to 5,000 scored events.");
  const events = parsed.events.map((value, index) => parseScoredEvent(value, index));
  return { run, events };
}

export function readableVttTranscript(text: string): string {
  return text
    .replace(/^\uFEFF?WEBVTT[^\n]*\n?/i, "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !/^\d+$/.test(line) && !/-->/.test(line) && !/^(NOTE|STYLE|REGION)(\s|$)/i.test(line))
    .map((line) => line.replace(/<[^>]+>/g, "").trim())
    .filter(Boolean)
    .join("\n")
    .slice(0, 20_000);
}

function parseRun(value: unknown): EventIntelligenceRun {
  if (!isRecord(value)) throw new Error("Event Intelligence import is missing its run metadata.");
  const runId = requiredText(value.runId, "Run ID", 200);
  const startedAt = requiredDate(value.startedAt, "Run start");
  const completedAt = requiredDate(value.completedAt, "Run completion");
  if (!RUN_STATUSES.has(String(value.status))) throw new Error("Event Intelligence run status is unsupported.");
  if (!Array.isArray(value.sources)) throw new Error("Event Intelligence run is missing source outcomes.");
  const sources = value.sources.map((source, index) => parseSourceOutcome(source, index));
  return { runId, startedAt, completedAt, status: String(value.status) as EventIntelligenceRun["status"], sources };
}

function parseSourceOutcome(value: unknown, index: number): SourceOutcome {
  if (!isRecord(value)) throw new Error(`Event source outcome ${index + 1} must be an object.`);
  const sourceId = requiredText(value.sourceId, `Event source ${index + 1} ID`, 200);
  if (!SOURCE_STATUSES.has(String(value.status))) throw new Error(`Event source ${index + 1} has an unsupported status.`);
  if (!Array.isArray(value.events)) throw new Error(`Event source ${index + 1} is missing its events array.`);
  const events = value.events.map((event, eventIndex) => parseEventCandidate(event, `Event source ${index + 1} event ${eventIndex + 1}`));
  const observedAt = requiredDate(value.observedAt, `Event source ${index + 1} observation time`);
  const detail = typeof value.detail === "string" && value.detail.trim() ? cleanText(value.detail, 1500) : undefined;
  return { sourceId, status: String(value.status) as SourceOutcome["status"], events, observedAt, ...(detail ? { detail } : {}) };
}

function parseScoredEvent(value: unknown, index: number): ScoredEvent {
  if (!isRecord(value)) throw new Error(`Scored event ${index + 1} must be an object.`);
  const event = parseEventCandidate(value.event, `Scored event ${index + 1}`);
  if (typeof value.score !== "number" || !Number.isFinite(value.score)) throw new Error(`Scored event ${index + 1} requires a numeric score.`);
  if (!Array.isArray(value.reasons) || value.reasons.some((reason) => typeof reason !== "string")) throw new Error(`Scored event ${index + 1} requires text scoring reasons.`);
  const profileVersion = requiredText(value.profileVersion, `Scored event ${index + 1} profile version`, 100);
  return { event, score: value.score, reasons: value.reasons.map((reason) => cleanText(reason, 500)), profileVersion };
}

function parseEventCandidate(value: unknown, label: string): EventCandidate {
  if (!isRecord(value)) throw new Error(`${label} must contain an event object.`);
  const externalId = requiredText(value.externalId, `${label} external ID`, 300);
  const title = requiredText(value.title, `${label} title`, 300);
  const startsAt = requiredDate(value.startsAt, `${label} start`);
  const endsAt = value.endsAt === undefined ? undefined : requiredDate(value.endsAt, `${label} end`);
  const description = typeof value.description === "string" && value.description.trim() ? cleanText(value.description, 3000) : undefined;
  const location = typeof value.location === "string" && value.location.trim() ? cleanText(value.location, 500) : undefined;
  const url = optionalHttpUrl(typeof value.url === "string" ? value.url : undefined, `${label} URL`);
  if (!Array.isArray(value.tags) || value.tags.some((tag) => typeof tag !== "string")) throw new Error(`${label} tags must be an array of text values.`);
  if (!isRecord(value.provenance)) throw new Error(`${label} is missing provenance.`);
  const provenance = {
    sourceId: requiredText(value.provenance.sourceId, `${label} provenance source`, 200),
    sourceUrl: optionalHttpUrl(typeof value.provenance.sourceUrl === "string" ? value.provenance.sourceUrl : undefined, `${label} provenance URL`) ?? "",
    retrievedAt: requiredDate(value.provenance.retrievedAt, `${label} provenance retrieval time`),
  };
  if (!provenance.sourceUrl) throw new Error(`${label} provenance requires an HTTP(S) source URL.`);
  return {
    externalId, title, startsAt,
    ...(endsAt ? { endsAt } : {}),
    ...(description ? { description } : {}),
    ...(location ? { location } : {}),
    ...(url ? { url } : {}),
    tags: value.tags.map((tag) => cleanText(tag, 60)).filter(Boolean).slice(0, 30),
    provenance,
  };
}

function requiredText(value: unknown, label: string, limit: number): string {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${label} is required.`);
  const cleaned = cleanText(value, limit);
  assertNoCredentialLikeText(cleaned, label);
  return cleaned;
}

function cleanText(value: string, limit: number): string {
  return value.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, limit);
}

function requiredDate(value: unknown, label: string): string {
  if (typeof value !== "string" || !Number.isFinite(Date.parse(value))) throw new Error(`${label} must be a valid date and time.`);
  return new Date(value).toISOString();
}

function optionalDate(value: string | undefined, label: string): string | undefined {
  if (!value?.trim()) return undefined;
  if (!Number.isFinite(Date.parse(value))) throw new Error(`${label} must be a valid date and time.`);
  return new Date(value).toISOString();
}

function optionalHttpUrl(value: string | undefined, label: string): string | undefined {
  if (!value?.trim()) return undefined;
  let url: URL;
  try { url = new URL(value.trim()); } catch { throw new Error(`${label} must be a valid HTTP(S) URL.`); }
  if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error(`${label} must use HTTP or HTTPS.`);
  if (url.username || url.password) throw new Error(`${label} cannot contain embedded credentials.`);
  const normalized = url.toString().slice(0, 1000);
  assertNoCredentialLikeText(normalized, label);
  return normalized;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
