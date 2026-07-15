import type { EventCandidate } from "./event.js";

export type SourceStatus =
  | "success"
  | "verified_empty"
  | "partial"
  | "unsupported"
  | "unauthorized"
  | "forbidden"
  | "rate_limited"
  | "unavailable"
  | "validation_failed"
  | "transport_failed"
  | "cancelled";

export type SourceOutcome = Readonly<{
  sourceId: string;
  status: SourceStatus;
  events: readonly EventCandidate[];
  observedAt: string;
  detail?: string;
}>;

export type RunStatus = "success" | "verified_empty" | "partial" | "failed";

export type EventIntelligenceRun = Readonly<{
  runId: string;
  startedAt: string;
  completedAt: string;
  status: RunStatus;
  sources: readonly SourceOutcome[];
}>;

export const hasUsableEvidence = (outcome: SourceOutcome): boolean =>
  (outcome.status === "success" || outcome.status === "partial") && outcome.events.length > 0;

export function classifyRun(outcomes: readonly SourceOutcome[]): RunStatus {
  if (outcomes.length === 0) return "failed";

  const usable = outcomes.some(hasUsableEvidence);
  const allVerifiedEmpty = outcomes.every((outcome) => outcome.status === "verified_empty");
  const allClean = outcomes.every(
    (outcome) => outcome.status === "success" || outcome.status === "verified_empty",
  );

  if (allVerifiedEmpty) return "verified_empty";
  if (usable && allClean) return "success";
  if (usable) return "partial";
  return "failed";
}
