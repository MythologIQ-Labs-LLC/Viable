export type IcpStatus = "suggested" | "candidate" | "selected" | "secondary" | "adjacent" | "rejected" | "historical";

export type IcpRole =
  | "users"
  | "economicBuyers"
  | "decisionMakers"
  | "approvers"
  | "influencers"
  | "champions"
  | "blockers"
  | "partners"
  | "maintainers"
  | "contributors";

export type IcpRoles = Readonly<Record<IcpRole, readonly string[]>>;

export type IcpDimension =
  | "problemIntensity"
  | "urgency"
  | "productFit"
  | "timeToValue"
  | "access"
  | "proof"
  | "adoptionFriction"
  | "commercialViability"
  | "retentionPotential"
  | "strategicFit"
  | "evidenceQuality";

export type IcpDimensionAssessment = Readonly<{
  rating: 0 | 1 | 2 | 3 | 4;
  rationale: string;
  evidenceIds: readonly string[];
  confidence: "low" | "medium" | "high";
}>;

export type ValidationExperiment = Readonly<{
  id: string;
  hypothesis: string;
  method: string;
  owner: string;
  startsAt: string;
  observationEndsAt: string;
  successCriteria: readonly string[];
  failureCriteria: readonly string[];
  decisionCriteria: readonly string[];
  status: "planned" | "active" | "completed" | "cancelled";
}>;

export type IcpRevision = Readonly<{
  revision: number;
  changedAt: string;
  changedBy: string;
  rationale: string;
  snapshot: string;
}>;

export type IcpHypothesis = Readonly<{
  id: string;
  name: string;
  summary: string;
  status: IcpStatus;
  origin: "human" | "generated_suggestion";
  reviewStatus: "suggested" | "reviewed" | "rejected";
  roles: IcpRoles;
  dimensions: Readonly<Record<IcpDimension, IcpDimensionAssessment>>;
  disqualifiers: readonly string[];
  antiIcpConditions: readonly string[];
  assumptions: readonly string[];
  contradictions: readonly string[];
  evidenceIds: readonly string[];
  confidence: "low" | "medium" | "high";
  owner: string;
  lastReviewedAt?: string;
  nextValidationAction: string;
  changeConditions: readonly string[];
  experiments: readonly ValidationExperiment[];
  revision: number;
  history: readonly IcpRevision[];
}>;

export const ICP_DIMENSIONS: readonly IcpDimension[] = [
  "problemIntensity", "urgency", "productFit", "timeToValue", "access", "proof",
  "adoptionFriction", "commercialViability", "retentionPotential", "strategicFit", "evidenceQuality",
];
