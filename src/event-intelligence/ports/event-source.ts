import type { SourceOutcome } from "../domain/source-outcome.js";

export interface EventSource {
  readonly id: string;
  collect(signal?: AbortSignal): Promise<SourceOutcome>;
}
