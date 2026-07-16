import type { StoredEventIntelligenceRun } from "../../event-intelligence/ports/run-store.js";
import type { SourceStatus } from "../../event-intelligence/domain/source-outcome.js";
import type { SignalRecord, SourceCollectionOutcome, SourceRegistration } from "../domain/signal.js";
import type { SignalSource } from "../ports/signal-source.js";

const reviewAt = (value: string): string => {
  const date = new Date(value);
  date.setUTCDate(date.getUTCDate() + 14);
  return date.toISOString();
};

export class EventIntelligenceSignalSource implements SignalSource {
  readonly registration: SourceRegistration;

  constructor(
    readonly id: string,
    private readonly run: StoredEventIntelligenceRun,
    configuredAt: string,
  ) {
    this.registration = {
      id, kind: "event_intelligence", label: "Event Intelligence import", configuredAt,
      capability: "manual_only",
      limitations: ["Imports an existing local Event Intelligence run", "Event scoring is evidence only and has no global authority"],
    };
  }

  async collect(): Promise<SourceCollectionOutcome> {
    const retrievedAt = this.run.run.completedAt;
    if (this.run.run.status === "verified_empty") return { source: this.registration, status: "verified_empty", signals: [], retrievedAt };
    if (this.run.run.status === "failed") {
      const status = this.run.run.sources.find((source) => source.status !== "verified_empty")?.status ?? "unavailable";
      return { source: this.registration, status: status as SourceStatus, signals: [], retrievedAt, detail: "Event Intelligence run did not produce usable evidence" };
    }

    const signals: Omit<SignalRecord, "id" | "workspaceId" | "status" | "evidenceState">[] = this.run.events.map(({ event, score, reasons, profileVersion }) => ({
      fingerprint: `event:${event.provenance.sourceId}:${event.externalId}:${event.startsAt}`,
      sourceId: this.id,
      kind: "event",
      title: event.title,
      summary: event.description ?? `Event opportunity beginning ${event.startsAt}`,
      observedAt: event.startsAt,
      freshnessReviewAt: reviewAt(retrievedAt),
      confidence: "medium",
      limitations: [...this.registration.limitations, "Relevance score requires human review"],
      facts: { startsAt: event.startsAt, score, profileVersion, reasons: reasons.join("; ") },
      provenance: {
        provider: "event_intelligence", sourceId: this.id, retrievedAt,
        sourceUrl: event.url ?? event.provenance.sourceUrl, externalId: event.externalId,
      },
      relationships: [{ kind: "event", targetId: event.externalId, label: event.title }],
      tags: ["event", ...event.tags],
    }));
    return {
      source: this.registration,
      status: this.run.run.status === "partial" ? "partial" : signals.length ? "success" : "verified_empty",
      signals,
      retrievedAt,
      ...(this.run.run.status === "partial" ? { detail: "Usable event evidence preserved alongside source failures" } : {}),
    };
  }
}
