export type MarketabilityDimension =
  | "productTruth"
  | "icpClarity"
  | "audienceClarity"
  | "urgency"
  | "positioning"
  | "offer"
  | "proof"
  | "discoverability"
  | "content"
  | "distribution"
  | "conversion"
  | "sales"
  | "measurement";

export type ReadinessFinding = Readonly<{
  dimension: MarketabilityDimension;
  rating: 0 | 1 | 2 | 3 | 4;
  rationale: string;
  evidenceIds: readonly string[];
  confidence: "low" | "medium" | "high";
  freshness: "fresh" | "stale" | "unknown";
  owner: string;
  verification: string;
  recommendation: string;
}>;

export type MarketabilityAssessment = Readonly<{
  id: string;
  productRevision: number;
  selectedIcpId: string;
  createdAt: string;
  findings: readonly ReadinessFinding[];
}>;

export type ReadinessAction = Readonly<{
  id: string;
  source: "product_gap" | "icp_gap" | "assessment_gap";
  sourceId: string;
  title: string;
  owner: string;
  dueAt?: string;
  kind: "action" | "icp_experiment" | "campaign" | "product_feedback";
  status: "open" | "in_progress" | "completed" | "cancelled";
}>;
