import type { ClaimReference } from "../../campaigns/domain/campaign.js";

export type ActivationSourceKind = "campaign_variant" | "repository_launch" | "video_variant";
export type CalendarEntryKind = "external_activation" | "approval_deadline" | "event_opportunity" | "experiment" | "follow_up";
export type DestinationChannel = "linkedin" | "website" | "github_release" | "instagram_reels" | "youtube_shorts";
export type ScheduleStatus = "draft" | "in_review" | "changes_requested" | "scheduled" | "rejected" | "cancelled" | "approval_invalidated";
export type ActivationStatus = "not_applicable" | "not_ready" | "ready_for_manual_activation" | "delivered" | "failed" | "cancelled" | "outcome_unknown";
export type DeliveryStatus = "delivered" | "failed" | "cancelled" | "unknown";
export type DeliveryEvidenceClassification = "human_recorded" | "provider_evidence" | "provider_verified";
export type MetricEvidenceState = "observed" | "verified_zero" | "delayed" | "partial" | "unavailable" | "not_collected";
export type PerformanceImportStatus = "complete" | "partial" | "delayed" | "unavailable" | "failed";
export type AttributionModel = "manual" | "first_touch" | "last_touch" | "influence" | "unattributed";
export type RetrospectiveDecision = "continue" | "iterate" | "stop" | "inconclusive";
export type ConfidenceEffect = "strengthen" | "weaken" | "no_change" | "unknown";

export type DestinationRecord = Readonly<{
  id: string;
  workspaceId: string;
  label: string;
  channel: DestinationChannel;
  accountReference: string;
  accountOwner: string;
  ownershipConfirmed: boolean;
  deliveryMode: "manual_only";
  capabilityNotes: readonly string[];
  rateLimitNotes: string;
  retryPolicy: string;
  dataHandlingNotes: string;
  status: "active" | "disabled";
  createdAt: string;
  updatedAt: string;
}>;

export type ActivationSourceSnapshot = Readonly<{
  kind: ActivationSourceKind;
  sourceId: string;
  sourceVersion: number;
  title: string;
  audience: string;
  channel: DestinationChannel;
  campaignId: string;
  canonicalAssetId: string;
  claimReferences: readonly ClaimReference[];
  evidenceIds: readonly string[];
  rights: readonly string[];
  accessibilityRequirements: readonly string[];
  disclosureRequirements: readonly string[];
  body?: string;
  fileReference?: string;
  repositoryId?: string;
  launchRoomId?: string;
  videoArtifactId?: string;
  capturedAt: string;
}>;

export type CalendarEntry = Readonly<{
  id: string;
  workspaceId: string;
  kind: CalendarEntryKind;
  title: string;
  owner: string;
  startsAt: string;
  endsAt?: string;
  timezone: string;
  notes: string;
  relatedRecordId?: string;
  destinationId?: string;
  source?: ActivationSourceSnapshot;
  scheduleStatus: ScheduleStatus;
  activationStatus: ActivationStatus;
  createdAt: string;
  updatedAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNote?: string;
}>;

export type ManualActivationPackage = Readonly<{
  id: string;
  workspaceId: string;
  calendarEntryId: string;
  destinationId: string;
  idempotencyKey: string;
  createdAt: string;
  createdBy: string;
  status: "manual_export_ready" | "authority_invalidated";
  credentialsIncluded: false;
  deliveryClaimed: false;
  manifest: string;
}>;

export type ExportOperation = Readonly<{
  id: string;
  workspaceId: string;
  packageId: string;
  status: "ready_for_download" | "downloaded" | "interrupted";
  attempts: number;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  interruptionDetail?: string;
}>;

export type DeliveryOutcome = Readonly<{
  id: string;
  workspaceId: string;
  calendarEntryId: string;
  packageId: string;
  status: DeliveryStatus;
  evidenceClassification: DeliveryEvidenceClassification;
  source: string;
  observedAt: string;
  recordedAt: string;
  recordedBy: string;
  evidenceReferences: readonly string[];
  note: string;
  deliveryUrl?: string;
  publicationId?: string;
  providerResponseId?: string;
  failureClass?: string;
  failureDetail?: string;
}>;

export type MetricObservation = Readonly<{
  id: string;
  metric: string;
  state: MetricEvidenceState;
  windowStartsAt: string;
  windowEndsAt: string;
  capturedAt: string;
  source: string;
  evidenceReference: string;
  value?: number;
  unit?: string;
  limitation?: string;
}>;

export type MeasurementPlan = Readonly<{
  id: string;
  workspaceId: string;
  calendarEntryId: string;
  observationStartsAt: string;
  observationEndsAt: string;
  baseline: readonly MetricObservation[];
  createdAt: string;
  createdBy: string;
}>;

export type PerformanceImport = Readonly<{
  id: string;
  workspaceId: string;
  calendarEntryId: string;
  status: PerformanceImportStatus;
  source: string;
  sourceClassification: "human_recorded" | "provider_export" | "provider_api";
  observations: readonly MetricObservation[];
  importedAt: string;
  importedBy: string;
  notes: string;
}>;

export type MetricComparison = Readonly<{
  metric: string;
  baselineState: MetricEvidenceState;
  outcomeState: MetricEvidenceState;
  baselineValue?: number;
  outcomeValue?: number;
  delta?: number;
  limitation?: string;
}>;

export type Retrospective = Readonly<{
  id: string;
  workspaceId: string;
  calendarEntryId: string;
  completedAt: string;
  completedBy: string;
  summary: string;
  learnings: readonly string[];
  decision: RetrospectiveDecision;
  attributionModel: AttributionModel;
  attributionUncertainty: string;
  evidenceReferences: readonly string[];
  comparisons: readonly MetricComparison[];
  reversibleNextAction: string;
  icpConfidenceEffect: ConfidenceEffect;
  icpConfidenceRationale: string;
  positioningEffect: string;
}>;

export type LearningLedgerEntry = Readonly<{
  id: string;
  workspaceId: string;
  retrospectiveId: string;
  calendarEntryId: string;
  createdAt: string;
  createdBy: string;
  evidence: readonly string[];
  decision: string;
  change: string;
  outcome: string;
  followUp: string;
  reversibleNextAction: string;
  attributionModel: AttributionModel;
  attributionUncertainty: string;
}>;

export type ActivationLearningWorkspace = Readonly<{
  workspaceId: string;
  destinations: readonly DestinationRecord[];
  calendarEntries: readonly CalendarEntry[];
  packages: readonly ManualActivationPackage[];
  exportOperations: readonly ExportOperation[];
  deliveryOutcomes: readonly DeliveryOutcome[];
  measurementPlans: readonly MeasurementPlan[];
  performanceImports: readonly PerformanceImport[];
  retrospectives: readonly Retrospective[];
  learningLedger: readonly LearningLedgerEntry[];
  updatedAt: string;
}>;
