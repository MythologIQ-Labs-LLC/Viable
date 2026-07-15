export type EvidenceSuggestion = Readonly<{
  id: string;
  origin: "event_intelligence" | "signals" | "campaigns" | "leads" | "sales" | "analytics";
  canonicalIcpHypothesisId: string;
  summary: string;
  status: "generated" | "reviewed" | "rejected";
}>;

export type CanonicalIcpMutation = Readonly<{
  canonicalIcpHypothesisId: string;
  proposedRevision: number;
  approvedBy: string;
  approvedAt: string;
}>;

export function rejectDownstreamIcpMutation(origin: EvidenceSuggestion["origin"]): never {
  throw new Error(`${origin} may contribute evidence but may not mutate canonical ICP state`);
}
