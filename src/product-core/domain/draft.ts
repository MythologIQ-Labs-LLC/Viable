import type { MarketabilityDimension } from "./assessment.js";
import type { IcpDimension, IcpRole } from "./icp.js";

export type DraftEvidenceLink = Readonly<{
  evidenceIds: readonly string[];
}>;

export type IcpDimensionDraft = Readonly<{
  rating: 0 | 1 | 2 | 3 | 4;
  rationale: string;
  evidenceIds: readonly string[];
  confidence: "low" | "medium" | "high";
}>;

export type IcpDraft = Readonly<{
  kind: "icp";
  updatedAt: string;
  name: string;
  summary: string;
  owner: string;
  origin: "human" | "generated_suggestion";
  roles: Readonly<Record<IcpRole, readonly string[]>>;
  dimensions: Readonly<Record<IcpDimension, IcpDimensionDraft>>;
  disqualifiers: readonly string[];
  antiIcpConditions: readonly string[];
  assumptions: readonly string[];
  contradictions: readonly string[];
  confidence: "low" | "medium" | "high";
  nextValidationAction: string;
  changeConditions: readonly string[];
}>;

export type AssessmentFindingDraft = Readonly<{
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

export type AssessmentDraft = Readonly<{
  kind: "assessment";
  updatedAt: string;
  findings: Readonly<Record<MarketabilityDimension, AssessmentFindingDraft>>;
}>;

export type ProductDrafts = Readonly<{
  icp?: IcpDraft;
  assessment?: AssessmentDraft;
}>;
