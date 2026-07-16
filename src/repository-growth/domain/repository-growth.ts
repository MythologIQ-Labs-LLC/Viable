export type RepositoryReadinessDimension =
  | "problem_clarity"
  | "product_credibility"
  | "time_to_value"
  | "discoverability"
  | "differentiation"
  | "trust"
  | "community_readiness"
  | "release_discipline"
  | "distribution"
  | "adoption"
  | "sustainability"
  | "commercial_path";

export type RepositoryMetricKind =
  | "stars"
  | "forks"
  | "watchers"
  | "open_issues"
  | "release_downloads"
  | "views"
  | "unique_visitors"
  | "clones"
  | "unique_cloners"
  | "referrals"
  | "popular_content"
  | "discussions"
  | "contributors"
  | "dependents"
  | "integrations"
  | "commercial_inquiries";

export type MetricEvidenceState = "observed" | "verified_zero" | "unavailable" | "not_collected";
export type RepositoryImportStatus = "success" | "partial" | "unauthorized" | "forbidden" | "rate_limited" | "unavailable" | "validation_failed" | "transport_failed" | "cancelled";
export type FindingImpact = "low" | "medium" | "high";
export type FindingEffort = "small" | "medium" | "large";
export type FindingConfidence = "low" | "medium" | "high";

export type RepositoryMetricObservation = Readonly<{
  kind: RepositoryMetricKind;
  state: MetricEvidenceState;
  capturedAt: string;
  source: string;
  value?: number;
  limitation?: string;
}>;

export type RepositoryFrontDoor = Readonly<{
  readmePresent: boolean;
  readmeText: string;
  quickStartPresent: boolean;
  demoPresent: boolean;
  documentationPresent: boolean;
  changelogPresent: boolean;
  socialPreviewState: "available" | "unavailable" | "not_checked";
}>;

export type RepositoryCommunityProfile = Readonly<{
  healthPercentage?: number;
  licensePresent: boolean;
  securityPresent: boolean;
  contributingPresent: boolean;
  codeOfConductPresent: boolean;
  supportPresent: boolean;
  issueTemplatePresent: boolean;
  pullRequestTemplatePresent: boolean;
}>;

export type RepositoryReleaseProfile = Readonly<{
  sampledReleaseCount: number;
  latestTag?: string;
  latestPublishedAt?: string;
  releaseNotesPresent: boolean;
  releaseAssetsPresent: boolean;
}>;

export type PublicRepositorySnapshot = Readonly<{
  id: string;
  workspaceId: string;
  fullName: string;
  owner: string;
  name: string;
  url: string;
  visibility: "public";
  description: string;
  homepage?: string;
  topics: readonly string[];
  defaultBranch: string;
  primaryLanguage?: string;
  license?: string;
  archived: boolean;
  fork: boolean;
  pushedAt?: string;
  importedAt: string;
  importStatus: "success" | "partial";
  limitations: readonly string[];
  frontDoor: RepositoryFrontDoor;
  community: RepositoryCommunityProfile;
  releases: RepositoryReleaseProfile;
  metrics: readonly RepositoryMetricObservation[];
}>;

export type RepositoryImportOutcome = Readonly<{
  status: RepositoryImportStatus;
  retrievedAt: string;
  snapshot?: Omit<PublicRepositorySnapshot, "id" | "workspaceId">;
  detail?: string;
}>;

export type RepositoryReadinessFinding = Readonly<{
  id: string;
  dimension: RepositoryReadinessDimension;
  rating: 0 | 1 | 2 | 3 | 4;
  evidence: readonly string[];
  confidence: FindingConfidence;
  impact: FindingImpact;
  effort: FindingEffort;
  recommendation: string;
  owner: string;
  verification: string;
}>;

export type RepositoryReadinessAssessment = Readonly<{
  id: string;
  repositoryId: string;
  createdAt: string;
  createdBy: string;
  findings: readonly RepositoryReadinessFinding[];
}>;

export type RepositoryGrowthActionStatus = "open" | "in_progress" | "completed" | "dismissed";

export type RepositoryGrowthAction = Readonly<{
  id: string;
  findingId: string;
  title: string;
  owner: string;
  impact: FindingImpact;
  effort: FindingEffort;
  verification: string;
  status: RepositoryGrowthActionStatus;
}>;

export type RepositoryGrowthPlan = Readonly<{
  id: string;
  repositoryId: string;
  assessmentId: string;
  owner: string;
  createdAt: string;
  actions: readonly RepositoryGrowthAction[];
}>;

export type LaunchChecklistItem = Readonly<{
  id: string;
  label: string;
  required: boolean;
  complete: boolean;
  evidence?: string;
}>;

export type MaintainerCoverage = Readonly<{
  owner: string;
  responsibility: string;
  startsAt: string;
  endsAt: string;
}>;

export type RepositoryLaunchRoomStatus = "draft" | "ready_for_manual_launch" | "retrospective_complete";

export type RepositoryLaunchRoom = Readonly<{
  id: string;
  repositoryId: string;
  title: string;
  primaryAudience: string;
  desiredOutcome: string;
  releaseTag: string;
  campaignId: string;
  canonicalAssetId: string;
  variantIds: readonly string[];
  checklist: readonly LaunchChecklistItem[];
  maintainerCoverage: readonly MaintainerCoverage[];
  observationStartsAt: string;
  observationEndsAt: string;
  retrospectiveAt: string;
  baseline: readonly RepositoryMetricObservation[];
  status: RepositoryLaunchRoomStatus;
  createdAt: string;
  createdBy: string;
}>;

export type RepositoryManualExport = Readonly<{
  id: string;
  launchRoomId: string;
  repositoryId: string;
  createdAt: string;
  createdBy: string;
  status: "manual_export_ready";
  manifest: string;
}>;

export type RepositoryMetricComparison = Readonly<{
  kind: RepositoryMetricKind;
  baselineState: MetricEvidenceState;
  outcomeState: MetricEvidenceState;
  baselineValue?: number;
  outcomeValue?: number;
  delta?: number;
}>;

export type RepositoryLaunchRetrospective = Readonly<{
  id: string;
  launchRoomId: string;
  repositoryId: string;
  completedAt: string;
  completedBy: string;
  summary: string;
  learnings: readonly string[];
  nextAction: string;
  outcomes: readonly RepositoryMetricObservation[];
  comparisons: readonly RepositoryMetricComparison[];
}>;

export type RepositoryGrowthWorkspace = Readonly<{
  workspaceId: string;
  repositories: readonly PublicRepositorySnapshot[];
  assessments: readonly RepositoryReadinessAssessment[];
  plans: readonly RepositoryGrowthPlan[];
  launchRooms: readonly RepositoryLaunchRoom[];
  exports: readonly RepositoryManualExport[];
  retrospectives: readonly RepositoryLaunchRetrospective[];
  updatedAt: string;
}>;
