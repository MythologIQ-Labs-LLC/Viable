import type { EventIntelligenceRun } from "../domain/source-outcome.js";
import type { ScoredEvent } from "../domain/event.js";

export type StoredEventIntelligenceRun = Readonly<{
  run: EventIntelligenceRun;
  events: readonly ScoredEvent[];
}>;

export interface RunStore {
  save(value: StoredEventIntelligenceRun): Promise<void>;
  latest(): Promise<StoredEventIntelligenceRun | undefined>;
}
