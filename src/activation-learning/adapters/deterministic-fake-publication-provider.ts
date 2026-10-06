import type {
  PublicationProviderOutcome,
  PublicationProviderPort,
  PublicationProviderRequest,
} from "../ports/publication-provider.js";

export class DeterministicFakePublicationProvider implements PublicationProviderPort {
  readonly requests: PublicationProviderRequest[] = [];
  private readonly outcomes: PublicationProviderOutcome[];

  constructor(outcomes: readonly PublicationProviderOutcome[] = []) {
    this.outcomes = [...outcomes];
  }

  async publish(request: PublicationProviderRequest): Promise<PublicationProviderOutcome> {
    this.requests.push(request);
    const configured = this.outcomes[this.requests.length - 1];
    if (configured) return configured;
    const suffix = encodeURIComponent(request.job.idempotencyKey);
    return {
      kind: "published",
      publicationId: `fake-publication-${request.attemptNumber}`,
      providerResponseId: `fake-response-${request.attemptNumber}`,
      deliveryUrl: `https://example.invalid/publications/${suffix}`,
    };
  }
}
