export type WebsiteOwnershipClassification =
  | "owned"
  | "competitor"
  | "partner"
  | "regulator"
  | "community"
  | "other";

export type WebsiteWatchTargetKind = "site_links" | "page_content" | "product_price";
export type WebsiteWatchLinkScope = "added" | "removed" | "both";
export type WebsiteWatchRetentionClass = "ephemeral" | "standard" | "extended";
export type WebsiteWatchReviewState = "suggested" | "reviewed" | "rejected";
export type WebsiteWatchConfidence = "low" | "medium" | "high";
export type WebsiteWatchGeneratedKind = "generated_change_summary" | "generated_relevance_recommendation";
export type WebsiteWatchEvidenceState = "baseline" | "change_detected" | "verified_no_change" | "partial";
export type WebsiteWatchSourceStatus =
  | "success_change_detected"
  | "verified_no_change"
  | "partial"
  | "unavailable"
  | "rate_limited"
  | "authentication_failed"
  | "validation_failed"
  | "transport_failed"
  | "offline"
  | "cancelled";

export type WatchedSite = Readonly<{
  id: string;
  workspaceId: string;
  displayName: string;
  canonicalUrl: string;
  normalizedDomain: string;
  ownership: WebsiteOwnershipClassification;
  purpose: string;
  authorizationConfirmed: boolean;
  retentionClass: WebsiteWatchRetentionClass;
  owner: string;
  status: "active" | "disabled";
  createdAt: string;
  updatedAt: string;
}>;

export type WatchTarget = Readonly<{
  id: string;
  workspaceId: string;
  watchedSiteId: string;
  kind: WebsiteWatchTargetKind;
  targetUrl?: string;
  linkScope?: WebsiteWatchLinkScope;
  watchNote: string;
  enabled: boolean;
  requestedIntervalMinutes: number;
  nextCheckDueAt?: string;
  adapterId: string;
  retentionClass: WebsiteWatchRetentionClass;
  reviewRequired: true;
  createdAt: string;
  updatedAt: string;
}>;

export type WebsiteSnapshotKind = "sitemap_links" | "page_markdown" | "product" | "webdog_alert";

export type WebsiteSnapshot = Readonly<{
  id: string;
  workspaceId: string;
  watchedSiteId: string;
  targetId: string;
  kind: WebsiteSnapshotKind;
  provider: string;
  observedUrl: string;
  retrievedAt: string;
  correlationReference?: string;
  contentHash: string;
  payloadReference: string;
  screenshotReference?: string;
  limitations: readonly string[];
  retentionClass: WebsiteWatchRetentionClass;
  deleteAfter?: string;
  deletedAt?: string;
  deletedBy?: string;
  createdAt: string;
}>;

export type WebsiteChangeKind = "links_added" | "links_removed" | "page_content" | "product_price" | "external_alert" | "no_change" | "baseline";

export type WebsiteChangeObservation = Readonly<{
  id: string;
  workspaceId: string;
  watchedSiteId: string;
  targetId: string;
  previousSnapshotId?: string;
  currentSnapshotId: string;
  sourceId: string;
  externalAlertId?: string;
  changeKind: WebsiteChangeKind;
  diffPreview: string;
  totalAddedLines?: number;
  totalRemovedLines?: number;
  addedLinkCount?: number;
  removedLinkCount?: number;
  previousPrice?: number;
  currentPrice?: number;
  currency?: string;
  evidenceState: WebsiteWatchEvidenceState;
  confidence: WebsiteWatchConfidence;
  limitations: readonly string[];
  reviewState: WebsiteWatchReviewState;
  reviewedBy?: string;
  reviewedAt?: string;
  generatedAnalysisIds: readonly string[];
  observedAt: string;
  createdAt: string;
}>;

export type WebsiteWatchGeneratedAnalysis = Readonly<{
  id: string;
  workspaceId: string;
  observationId: string;
  kind: WebsiteWatchGeneratedKind;
  content: string;
  provider: string;
  model?: string;
  generatedAt: string;
  limitations: readonly string[];
}>;

export type WebsiteWatchSourceRegistration = Readonly<{
  id: string;
  provider: "webdog_import" | "manual_fixture" | "context_dev" | "webdog_service";
  label: string;
  configuredAt: string;
  capability: "manual_only" | "available" | "unsupported";
  limitations: readonly string[];
}>;

export type WebsiteWatchSourceHealth = Readonly<{
  sourceId: string;
  status: WebsiteWatchSourceStatus;
  checkedAt: string;
  detail?: string;
  limitations: readonly string[];
}>;

export type WebsiteWatchSourceOutcome = Readonly<{
  source: WebsiteWatchSourceRegistration;
  status: WebsiteWatchSourceStatus;
  checkedAt: string;
  sites: readonly Omit<WatchedSite, "workspaceId">[];
  targets: readonly Omit<WatchTarget, "workspaceId">[];
  snapshots: readonly Omit<WebsiteSnapshot, "workspaceId">[];
  observations: readonly Omit<WebsiteChangeObservation, "workspaceId">[];
  generatedAnalyses: readonly Omit<WebsiteWatchGeneratedAnalysis, "workspaceId">[];
  limitations: readonly string[];
  detail?: string;
}>;

export type WebsiteWatchWorkspace = Readonly<{
  workspaceId: string;
  sources: readonly WebsiteWatchSourceRegistration[];
  sourceHealth: readonly WebsiteWatchSourceHealth[];
  sites: readonly WatchedSite[];
  targets: readonly WatchTarget[];
  snapshots: readonly WebsiteSnapshot[];
  observations: readonly WebsiteChangeObservation[];
  generatedAnalyses: readonly WebsiteWatchGeneratedAnalysis[];
  updatedAt: string;
}>;
