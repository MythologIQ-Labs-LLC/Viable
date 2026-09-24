import type { SourceStatus } from "../../event-intelligence/domain/source-outcome.js";

export type SignalKind = "event" | "repository" | "repository_activity" | "website_change" | "manual";
export type SignalStatus = "new" | "accepted" | "saved" | "dismissed" | "converted";
export type EvidenceState = "suggested" | "reviewed" | "rejected";
export type Confidence = "low" | "medium" | "high";
export type RelationshipKind =
  | "product" | "icp_hypothesis" | "event" | "repository" | "person"
  | "organization" | "campaign" | "opportunity" | "topic";

export type SignalRelationship = Readonly<{
  kind: RelationshipKind;
  targetId: string;
  label: string;
}>;

export type SignalProvenance = Readonly<{
  provider: "event_intelligence" | "github_public" | "webdog_import" | "manual_import";
  sourceId: string;
  retrievedAt: string;
  sourceUrl?: string;
  externalId?: string;
}>;

export type SignalRecord = Readonly<{
  id: string;
  fingerprint: string;
  workspaceId: string;
  sourceId: string;
  kind: SignalKind;
  title: string;
  summary: string;
  observedAt?: string;
  freshnessReviewAt: string;
  confidence: Confidence;
  limitations: readonly string[];
  facts: Readonly<Record<string, string | number | boolean | null>>;
  provenance: SignalProvenance;
  relationships: readonly SignalRelationship[];
  tags: readonly string[];
  owner?: string;
  status: SignalStatus;
  evidenceState: EvidenceState;
  reviewedBy?: string;
  reviewedAt?: string;
}>;

export type SourceKind = "event_intelligence" | "github_public" | "webdog_import" | "manual_import";

export type SourceRegistration = Readonly<{
  id: string;
  kind: SourceKind;
  label: string;
  configuredAt: string;
  capability: "available" | "manual_only" | "unsupported";
  limitations: readonly string[];
}>;

export type SourceCollectionOutcome = Readonly<{
  source: SourceRegistration;
  status: SourceStatus;
  signals: readonly Omit<SignalRecord, "id" | "workspaceId" | "status" | "evidenceState">[];
  retrievedAt: string;
  detail?: string;
}>;

export type SourceHealth = Readonly<{
  sourceId: string;
  status: SourceStatus;
  checkedAt: string;
  detail?: string;
}>;

export type ConversionKind =
  | "product_action" | "icp_validation_action" | "campaign_brief"
  | "content_brief" | "repository_growth_action" | "website_watch_action"
  | "product_feedback";

export type SignalConversionStatus = "proposed" | "materialized" | "materialization_failed";
export type SignalMaterializationContext = "product_core" | "campaigns" | "calendar" | "repository_growth";

export type SignalMaterialization = Readonly<{
  context: SignalMaterializationContext;
  recordId: string;
  materializedAt: string;
}>;

export type SignalMaterializationFailure = Readonly<{
  attemptedAt: string;
  detail: string;
}>;

export type SignalConversion = Readonly<{
  id: string;
  signalId: string;
  kind: ConversionKind;
  title: string;
  owner: string;
  createdAt: string;
  status: SignalConversionStatus;
  materialization?: SignalMaterialization;
  materializationFailure?: SignalMaterializationFailure;
}>;

export type SignalsInbox = Readonly<{
  workspaceId: string;
  sources: readonly SourceRegistration[];
  sourceHealth: readonly SourceHealth[];
  signals: readonly SignalRecord[];
  conversions: readonly SignalConversion[];
  updatedAt: string;
}>;
