export type EvidenceOrigin =
  | "observed"
  | "interview"
  | "customer"
  | "sales"
  | "analytics"
  | "public_source"
  | "generated_suggestion";

export type EvidenceReviewStatus = "suggested" | "reviewed" | "rejected";

export type EvidenceRecord = Readonly<{
  id: string;
  title: string;
  summary: string;
  origin: EvidenceOrigin;
  sourceRef?: string;
  observedAt: string;
  freshnessReviewAt: string;
  reviewStatus: EvidenceReviewStatus;
  reviewedBy?: string;
  reviewedAt?: string;
  confidence: "low" | "medium" | "high";
}>;

export const isReviewedEvidence = (evidence: EvidenceRecord): boolean =>
  evidence.reviewStatus === "reviewed" && evidence.origin !== "generated_suggestion";
