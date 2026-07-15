export type EventProvenance = Readonly<{
  sourceId: string;
  sourceUrl: string;
  retrievedAt: string;
}>;

export type EventCandidate = Readonly<{
  externalId: string;
  title: string;
  description?: string;
  startsAt: string;
  endsAt?: string;
  location?: string;
  url?: string;
  tags: readonly string[];
  provenance: EventProvenance;
}>;

export type ScoredEvent = Readonly<{
  event: EventCandidate;
  score: number;
  reasons: readonly string[];
  profileVersion: string;
}>;
