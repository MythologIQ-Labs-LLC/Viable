export type ClaimStatus = "proposed" | "approved" | "rejected" | "retired";

export type ProductClaim = Readonly<{
  id: string;
  statement: string;
  status: ClaimStatus;
  evidenceIds: readonly string[];
  prohibitedContexts: readonly string[];
  revision: number;
  rationale?: string;
  reviewedBy?: string;
  reviewedAt?: string;
}>;
