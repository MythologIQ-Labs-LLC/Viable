export type CampaignStatus =
  | "draft"
  | "in_review"
  | "changes_requested"
  | "approved"
  | "rejected"
  | "approval_invalidated";

export type AssetReviewStatus = CampaignStatus;
export type ChannelKind = "linkedin" | "website" | "github_release";

export type AuthorityRevision = Readonly<{
  version: number;
  changedAt: string;
  changedBy: string;
  rationale: string;
  changedFields: readonly string[];
  snapshot: string;
}>;

export type ClaimReference = Readonly<{
  claimId: string;
  claimRevision: number;
  statement: string;
  evidenceIds: readonly string[];
}>;

export type CampaignBrief = Readonly<{
  id: string;
  workspaceId: string;
  title: string;
  objective: string;
  primaryOutcome: string;
  primaryAudience: string;
  audienceKind: "selected_icp" | "test_audience";
  icpHypothesisId?: string;
  problem: string;
  trigger: string;
  offer: string;
  messageHierarchy: readonly string[];
  proof: readonly string[];
  claimReferences: readonly ClaimReference[];
  evidenceIds: readonly string[];
  callToAction: string;
  channels: readonly ChannelKind[];
  assetPlan: readonly string[];
  owner: string;
  successMeasures: readonly string[];
  dependencies: readonly string[];
  version: number;
  status: CampaignStatus;
  createdAt: string;
  updatedAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNote?: string;
  history?: readonly AuthorityRevision[];
}>;

export type ContentBrief = Readonly<{
  id: string;
  workspaceId: string;
  campaignId: string;
  title: string;
  objective: string;
  audience: string;
  primaryOutcome: string;
  claimReferences: readonly ClaimReference[];
  evidenceIds: readonly string[];
  pillars: readonly string[];
  themes: readonly string[];
  deliverables: readonly string[];
  sourceNotes: readonly string[];
  owner: string;
  origin: "human" | "generated_suggestion";
  status: AssetReviewStatus;
  createdAt: string;
  updatedAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNote?: string;
  version?: number;
  history?: readonly AuthorityRevision[];
}>;

export type AssetVersion = Readonly<{
  version: number;
  body: string;
  changedAt: string;
  changedBy: string;
  changeNote: string;
}>;

export type ReviewComment = Readonly<{
  id: string;
  author: string;
  body: string;
  createdAt: string;
}>;

export type CanonicalAsset = Readonly<{
  id: string;
  workspaceId: string;
  campaignId: string;
  title: string;
  audience: string;
  claimReferences: readonly ClaimReference[];
  evidenceIds: readonly string[];
  rights: readonly string[];
  accessibilityRequirements: readonly string[];
  disclosureRequirements: readonly string[];
  origin: "human" | "generated_suggestion";
  owner: string;
  versions: readonly AssetVersion[];
  comments: readonly ReviewComment[];
  status: AssetReviewStatus;
  createdAt: string;
  updatedAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNote?: string;
}>;

export type ChannelVariant = Readonly<{
  id: string;
  workspaceId: string;
  canonicalAssetId: string;
  channel: ChannelKind;
  body: string;
  constraints: readonly string[];
  version: number;
  status: AssetReviewStatus;
  createdAt: string;
  updatedAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNote?: string;
  history?: readonly AuthorityRevision[];
}>;

export type ManualExportPackage = Readonly<{
  id: string;
  workspaceId: string;
  campaignId: string;
  canonicalAssetId: string;
  variantIds: readonly string[];
  channels?: readonly ChannelKind[];
  createdAt: string;
  createdBy: string;
  status: "manual_export_ready";
  manifest: string;
}>;

export type CampaignWorkspace = Readonly<{
  workspaceId: string;
  campaigns: readonly CampaignBrief[];
  contentBriefs?: readonly ContentBrief[];
  assets: readonly CanonicalAsset[];
  variants: readonly ChannelVariant[];
  exports: readonly ManualExportPackage[];
  updatedAt: string;
}>;