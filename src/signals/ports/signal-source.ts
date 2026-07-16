import type { SourceCollectionOutcome, SourceRegistration } from "../domain/signal.js";

export interface SignalSource {
  readonly registration: SourceRegistration;
  collect(signal?: AbortSignal): Promise<SourceCollectionOutcome>;
}
