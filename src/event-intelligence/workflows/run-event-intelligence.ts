import { randomUUID } from "node:crypto";
import type { ScoredEvent } from "../domain/event.js";
import { classifyRun, type SourceOutcome } from "../domain/source-outcome.js";
import type { ScoringProfile } from "../domain/profile.js";
import type { EventSource } from "../ports/event-source.js";
import type { RunStore, StoredEventIntelligenceRun } from "../ports/run-store.js";
import { scoreEvent } from "../scoring/deterministic-scorer.js";

export type RunDependencies = Readonly<{
  sources: readonly EventSource[];
  profile: ScoringProfile;
  store: RunStore;
  clock?: () => Date;
  createId?: () => string;
}>;

export async function runEventIntelligence(
  dependencies: RunDependencies,
  signal?: AbortSignal,
): Promise<StoredEventIntelligenceRun> {
  const clock = dependencies.clock ?? (() => new Date());
  const startedAt = clock().toISOString();
  const outcomes: SourceOutcome[] = [];

  for (const source of dependencies.sources) {
    try {
      outcomes.push(await source.collect(signal));
    } catch (error) {
      outcomes.push({
        sourceId: source.id,
        status: signal?.aborted ? "cancelled" : "transport_failed",
        events: [],
        observedAt: clock().toISOString(),
        detail: error instanceof Error ? error.message : "Unhandled source failure",
      });
    }
  }

  const unique = new Map<string, ScoredEvent>();
  for (const outcome of outcomes) {
    for (const event of outcome.events) {
      const key = `${event.title.trim().toLocaleLowerCase("en-US")}|${event.startsAt}`;
      const scored = scoreEvent(event, dependencies.profile);
      const existing = unique.get(key);
      if (!existing || scored.score > existing.score) unique.set(key, scored);
    }
  }

  const value: StoredEventIntelligenceRun = {
    run: {
      runId: (dependencies.createId ?? randomUUID)(),
      startedAt,
      completedAt: clock().toISOString(),
      status: classifyRun(outcomes),
      sources: outcomes,
    },
    events: [...unique.values()].sort((left, right) => right.score - left.score),
  };
  await dependencies.store.save(value);
  return value;
}
