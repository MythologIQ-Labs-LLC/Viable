import type { ClaimReference } from "../../campaigns/domain/campaign.js";

export type VideoReviewStatus =
  | "draft"
  | "in_review"
  | "changes_requested"
  | "approved"
  | "rejected"
  | "approval_invalidated";

export type VideoProviderKind = "llm" | "image" | "video";
export type VideoPlatform = "linkedin" | "instagram_reels" | "youtube_shorts" | "website";
export type VideoAspectRatio = "9:16" | "1:1" | "16:9";
export type ConsentStatus = "not_applicable" | "recorded" | "missing";
export type SensitiveAssetKind = "none" | "likeness" | "voice" | "logo" | "trademark" | "customer_asset" | "copyrighted_asset";

export type VideoProductionToolRecord = Readonly<{
  id: string;
  name: string;
  version: string;
  revision: string;
  sourceUrl: string;
  license: "MIT";
  licenseCopyright: string;
  compatibilityReviewedAt: string;
  runtime: readonly string[];
  supportedOperatingSystems: readonly ("windows" | "linux")[];
  unverifiedOperatingSystems: readonly string[];
  obligations: readonly string[];
  limitations: readonly string[];
}>;

export type VideoProviderSelection = Readonly<{
  kind: VideoProviderKind;
  provider: string;
  model: string;
  estimatedCost: number;
  currency: string;
  dataHandlingNotes: string;
  credentialMode: "user_supplied_external" | "future_os_vault";
  credentialsIncluded: false;
}>;

export type StoryboardScene = Readonly<{
  id: string;
  order: number;
  purpose: string;
  narration: string;
  visualDirection: string;
  shotConstraints: readonly string[];
  durationSeconds: number;
}>;

export type SourceAssetManifestEntry = Readonly<{
  id: string;
  label: string;
  mediaType: string;
  sourceReference: string;
  owner: string;
  rightsBasis: string;
  sensitiveKind: SensitiveAssetKind;
  consentStatus: ConsentStatus;
  allowedUses: readonly string[];
  prohibitedUses: readonly string[];
  disclosureRequirements: readonly string[];
  sha256?: string;
  expiresAt?: string;
}>;

export type VideoBrief = Readonly<{
  id: string;
  workspaceId: string;
  campaignId: string;
  sourceAssetId: string;
  sourceAssetVersion: number;
  title: string;
  objective: string;
  audience: string;
  script: string;
  claimReferences: readonly ClaimReference[];
  evidenceIds: readonly string[];
  durationSeconds: number;
  platforms: readonly VideoPlatform[];
  aspectRatios: readonly VideoAspectRatio[];
  visualStyle: string;
  prohibitedElements: readonly string[];
  captionsRequired: boolean;
  audioDescriptionRequired: boolean;
  accessibilityRequirements: readonly string[];
  disclosureRequirements: readonly string[];
  storyboard: readonly StoryboardScene[];
  sourceAssets: readonly SourceAssetManifestEntry[];
  providers: readonly VideoProviderSelection[];
  owner: string;
  status: VideoReviewStatus;
  createdAt: string;
  updatedAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNote?: string;
}>;

export type VideoProductionPackage = Readonly<{
  id: string;
  workspaceId: string;
  briefId: string;
  packageVersion: "1.0";
  createdAt: string;
  createdBy: string;
  status: "manual_export_ready";
  manifest: string;
}>;

export type VideoRunStageKind =
  | "package_received"
  | "script_loaded"
  | "storyboard_planning"
  | "reference_preparation"
  | "image_generation"
  | "video_generation"
  | "audio_assembly"
  | "caption_generation"
  | "final_assembly"
  | "completed"
  | "failed"
  | "cancelled";

export type VideoRunStage = Readonly<{
  stage: VideoRunStageKind;
  status: "pending" | "running" | "completed" | "failed" | "cancelled";
  observedAt: string;
  detail: string;
}>;

export type ImportedArtifactFile = Readonly<{
  id: string;
  path: string;
  mimeType: string;
  sizeBytes: number;
  sha256: string;
  relationship: "final_render" | "platform_render" | "clip" | "image" | "audio" | "captions" | "artifact_manifest" | "redacted_log";
  sourceBriefId: string;
  sourcePackageId: string;
}>;

export type ImportedVideoArtifact = Readonly<{
  id: string;
  workspaceId: string;
  briefId: string;
  packageId: string;
  sourceToolId: string;
  sourceToolVersion: string;
  runCorrelationId: string;
  renderStatus: "completed" | "partial" | "failed" | "cancelled";
  stages: readonly VideoRunStage[];
  files: readonly ImportedArtifactFile[];
  redactedLog: string;
  importedAt: string;
  importedBy: string;
  reviewStatus: VideoReviewStatus;
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNote?: string;
  failureClass?: string;
  failureDetail?: string;
}>;

export type VideoPlatformVariant = Readonly<{
  id: string;
  workspaceId: string;
  artifactId: string;
  platform: VideoPlatform;
  aspectRatio: VideoAspectRatio;
  fileId: string;
  captionFileId?: string;
  accessibilityNotes: readonly string[];
  disclosureRequirements: readonly string[];
  status: VideoReviewStatus;
  createdAt: string;
  updatedAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNote?: string;
}>;

export type VideoProductionWorkspace = Readonly<{
  workspaceId: string;
  tools: readonly VideoProductionToolRecord[];
  briefs: readonly VideoBrief[];
  packages: readonly VideoProductionPackage[];
  artifacts: readonly ImportedVideoArtifact[];
  variants: readonly VideoPlatformVariant[];
  updatedAt: string;
}>;
