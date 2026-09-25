import type { MarketabilityAssessment, ReadinessAction } from "./assessment.js";
import type { ProductClaim } from "./claim.js";
import type { ProductDrafts } from "./draft.js";
import type { EvidenceRecord } from "./evidence.js";
import type { IcpHypothesis } from "./icp.js";
import type { ProductTruth } from "./product.js";

export type ProductWorkspace = Readonly<{
  id: string;
  createdAt: string;
  createdBy: string;
  product: ProductTruth;
  claims: readonly ProductClaim[];
  evidence: readonly EvidenceRecord[];
  icpHypotheses: readonly IcpHypothesis[];
  assessments: readonly MarketabilityAssessment[];
  actions: readonly ReadinessAction[];
  drafts?: ProductDrafts;
}>;
