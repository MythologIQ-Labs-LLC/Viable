import { assertNoCredentialLikeText } from "../../imports/guided-import.js";
import type { Confidence, SignalKind, SignalRecord, SourceCollectionOutcome, SourceRegistration } from "../domain/signal.js";
import type { SignalSource } from "../ports/signal-source.js";

type Clock = () => Date;
const kinds: readonly SignalKind[] = ["event", "repository", "repository_activity", "manual"];
const confidences: readonly Confidence[] = ["low", "medium", "high"];
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
        const observedAt = typeof item.observedAt === "string" && !Number.isNaN(Date.parse(item.observedAt)) ? new Date(item.observedAt).toISOString() : undefined;
        return {
          fingerprint: `manual:${this.id}:${externalId}:${title.toLocaleLowerCase("en-US")}`,
          sourceId: this.id, kind, title, summary,
          ...(observedAt ? { observedAt } : {}),
          freshnessReviewAt: retrievedAt,
          confidence,
          limitations: [...this.registration.limitations, ...(sourceUrl ? [] : ["No validated source URL supplied"])],
          facts: {},
          provenance: { provider: "manual_import", sourceId: this.id, retrievedAt, ...(sourceUrl ? { sourceUrl } : {}), externalId },
          relationships: [],
          tags: Array.isArray(item.tags) ? item.tags.filter((tag): tag is string => typeof tag === "string").map((tag) => tag.trim().slice(0, 60)).filter(Boolean) : [],
        };
      });
      return { source: this.registration, status: signals.length ? "success" : "verified_empty", signals, retrievedAt };
    } catch (error) {
      return { source: this.registration, status: "validation_failed", signals: [], retrievedAt, detail: error instanceof Error ? error.message : "Invalid manual import" };
    }
  }
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
