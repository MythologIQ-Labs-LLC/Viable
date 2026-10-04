import type { ActivationLearningWorkspace } from "./activation-learning.js";

export type PublicationJobStatus =
  | "waiting"
  | "executing"
  | "retry_wait"
  | "published"
  | "failed"
  | "cancelled"
  | "authority_invalidated"
  | "outcome_unknown";

export type PublicationAttemptStatus =
  | "executing"
  | "published"
  | "retryable_failure"
  | "terminal_failure"
  | "outcome_unknown";

export type PublicationAutomationState = Readonly<{
  paused: boolean;
  updatedAt: string;
  reason?: string;
}>;

export type PublicationJob = Readonly<{
  id: string;
  workspaceId: string;
  inventoryItemId: string;
  destinationId: string;
  policyId: string;
  policyVersion: number;
  sourceId: string;
  sourceVersion: number;
  idempotencyKey: string;
  status: PublicationJobStatus;
  scheduledFor: string;
  attemptCount: number;
  createdAt: string;
  updatedAt: string;
  nextAttemptAt?: string;
  publishedAt?: string;
  publicationId?: string;
  providerResponseId?: string;
  deliveryUrl?: string;
  failureClass?: string;
  failureDetail?: string;
}>;

export type PublicationAttempt = Readonly<{
  id: string;
  workspaceId: string;
  jobId: string;
  sequence: number;
  idempotencyKey: string;
  status: PublicationAttemptStatus;
  startedAt: string;
  completedAt?: string;
  providerResponseId?: string;
  publicationId?: string;
  deliveryUrl?: string;
  failureClass?: string;
  failureDetail?: string;
}>;

export type PublicationExecutionWorkspace = ActivationLearningWorkspace & Readonly<{
  publicationJobs?: readonly PublicationJob[];
  publicationAttempts?: readonly PublicationAttempt[];
  publicationAutomation?: PublicationAutomationState;
}>;

export type PublicationAutomationStatus = Readonly<{
  paused: boolean;
  waiting: number;
  executing: number;
  retryWaiting: number;
  published: number;
  failed: number;
  cancelled: number;
  authorityInvalidated: number;
  outcomeUnknown: number;
}>;

export type PublicationSchedulerResult = Readonly<{
  action: "none" | "scheduled" | "published" | "retry_wait" | "failed" | "cancelled" | "authority_invalidated" | "outcome_unknown" | "paused";
  jobId?: string;
  detail?: string;
}>;
