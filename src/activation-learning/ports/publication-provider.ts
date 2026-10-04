import type { ActivationSourceSnapshot, DestinationRecord } from "../domain/activation-learning.js";
import type { PublicationJob } from "../domain/publication-execution.js";

export type PublicationProviderRequest = Readonly<{
  job: PublicationJob;
  destination: DestinationRecord;
  source: ActivationSourceSnapshot;
  attemptNumber: number;
}>;

export type PublicationProviderOutcome =
  | Readonly<{
      kind: "published";
      publicationId: string;
      providerResponseId?: string;
      deliveryUrl?: string;
    }>
  | Readonly<{
      kind: "retryable_failure";
      failureClass: string;
      detail: string;
    }>
  | Readonly<{
      kind: "terminal_failure";
      failureClass: string;
      detail: string;
    }>
  | Readonly<{
      kind: "outcome_unknown";
      detail: string;
    }>;

export interface PublicationProviderPort {
  publish(request: PublicationProviderRequest): Promise<PublicationProviderOutcome>;
}
