import type { ActivationSourceSnapshot } from "./activation-learning.js";

export type PublicationInventoryStatus =
  | "draft"
  | "in_review"
  | "changes_requested"
  | "stocked"
  | "reserved"
  | "depleted"
  | "rejected"
  | "approval_invalidated"
  | "retired";

export type PublicationInventoryReviewDecision = "approved" | "rejected" | "changes_requested";

export type PublicationWindow = Readonly<{
  start: string;
  end: string;
}>;

export type PublicationPolicy = Readonly<{
  id: string;
  workspaceId: string;
  label: string;
  destinationId: string;
  version: number;
  timezone: string;
  allowedWeekdays: readonly number[];
  allowedWindows: readonly PublicationWindow[];
  minimumCooldownMinutes: number;
  maximumPerDay?: number;
  maximumPerWeek?: number;
  lateToleranceMinutes: number;
  retryLimit: number;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}>;

export type PublicationInventoryItem = Readonly<{
  id: string;
  workspaceId: string;
  destinationId: string;
  destinationUpdatedAt: string;
  policyId: string;
  policyVersion: number;
  source: ActivationSourceSnapshot;
  status: PublicationInventoryStatus;
  priority: number;
  availableFrom: string;
  expiresAt?: string;
  maxUses: number;
  useCount: number;
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNote?: string;
  createdAt: string;
  updatedAt: string;
}>;

export type PublicationInventoryWorkspace = Readonly<{
  workspaceId: string;
  policies: readonly PublicationPolicy[];
  items: readonly PublicationInventoryItem[];
  updatedAt: string;
}>;

export type PublicationInventoryEligibility = Readonly<{
  eligible: boolean;
  reason?:
    | "not_stocked"
    | "not_yet_available"
    | "expired"
    | "depleted"
    | "destination_unavailable"
    | "destination_changed"
    | "policy_unavailable"
    | "policy_changed"
    | "source_authority_changed";
}>;