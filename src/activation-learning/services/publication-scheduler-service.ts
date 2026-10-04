import type { ActivationSourceSnapshot, DestinationRecord } from "../domain/activation-learning.js";
import type {
  PublicationAttempt,
  PublicationAutomationStatus,
  PublicationExecutionWorkspace,
  PublicationJob,
  PublicationSchedulerResult,
} from "../domain/publication-execution.js";
import type { PublicationInventoryItem, PublicationPolicy } from "../domain/publication-inventory.js";
import type { ActivationLearningStore } from "../ports/activation-learning-store.js";
import type { PublicationProviderOutcome, PublicationProviderPort } from "../ports/publication-provider.js";
import type { PublicationSourceAuthorityPort } from "../ports/publication-source-authority.js";

type Clock = () => Date;
type IdFactory = () => string;
type ReconcileResult =
  | Readonly<{ changed: false; workspace: PublicationExecutionWorkspace }>
  | Readonly<{ changed: true; workspace: PublicationExecutionWorkspace; jobId: string }>;

const MINUTE_MS = 60_000;
const SCHEDULING_HORIZON_MINUTES = 14 * 24 * 60;
const workspaceLocks = new Map<string, Promise<void>>();

export class PublicationSchedulerService {
  constructor(
    private readonly store: ActivationLearningStore,
    private readonly sourceAuthority: PublicationSourceAuthorityPort,
    private readonly provider?: PublicationProviderPort,
    private readonly clock: Clock = () => new Date(),
    private readonly createId: IdFactory = () => globalThis.crypto.randomUUID(),
  ) {}

  async setPaused(workspaceId: string, paused: boolean, reason?: string): Promise<PublicationAutomationStatus> {
    return withWorkspaceLock(workspaceId, async () => {
      const workspace = await this.load(workspaceId);
      const now = this.clock().toISOString();
      const updated: PublicationExecutionWorkspace = {
        ...workspace,
        publicationAutomation: {
          paused,
          updatedAt: now,
          ...(reason?.trim() ? { reason: reason.trim() } : {}),
        },
        updatedAt: now,
      };
      await this.save(updated);
      return this.statusFromWorkspace(updated);
    });
  }

  async status(workspaceId: string): Promise<PublicationAutomationStatus> {
    return this.statusFromWorkspace(await this.load(workspaceId));
  }

  async scheduleNext(workspaceId: string, at: string): Promise<PublicationSchedulerResult> {
    const instant = requiredDate(at, "Publication scheduling time");
    return withWorkspaceLock(workspaceId, async () => {
      const workspace = await this.load(workspaceId);
      if (workspace.publicationAutomation?.paused) return { action: "paused" };

      for (const item of await this.eligibleStock(workspace, instant)) {
        const policy = requiredPolicy(workspace, item.policyId);
        const slot = findNextSlot(instant, policy, jobs(workspace));
        if (!slot) continue;
        const destination = requiredActiveDestination(workspace, item.destinationId);
        if (policy.destinationId !== destination.id || !await this.authorityCurrent(workspace, item)) continue;

        const now = this.clock().toISOString();
        const job: PublicationJob = {
          id: this.createId(),
          workspaceId,
          inventoryItemId: item.id,
          destinationId: destination.id,
          policyId: policy.id,
          policyVersion: policy.version,
          sourceId: item.source.sourceId,
          sourceVersion: item.source.sourceVersion,
          idempotencyKey: idempotencyKeyFor(item),
          status: "waiting",
          scheduledFor: slot.toISOString(),
          attemptCount: 0,
          createdAt: now,
          updatedAt: now,
        };
        await this.save({
          ...workspace,
          publicationInventory: inventory(workspace).map((candidate) => candidate.id === item.id
            ? { ...candidate, status: "reserved" as const, updatedAt: now }
            : candidate),
          publicationJobs: [...jobs(workspace), job],
          updatedAt: now,
        });
        return { action: "scheduled", jobId: job.id };
      }
      return { action: "none" };
    });
  }

  async executeDue(workspaceId: string, at: string): Promise<PublicationSchedulerResult> {
    const instant = requiredDate(at, "Publication execution time");
    return withWorkspaceLock(workspaceId, async () => {
      let workspace = await this.load(workspaceId);
      if (workspace.publicationAutomation?.paused) return { action: "paused" };

      const reconciled = reconcileExecuting(workspace, this.clock().toISOString());
      if (reconciled.changed) {
        await this.save(reconciled.workspace);
        return {
          action: "outcome_unknown",
          jobId: reconciled.jobId,
          detail: "A previous execution was interrupted after dispatch became possible; automatic retry is blocked.",
        };
      }

      const job = dueJobs(workspace, instant)[0];
      if (!job) return { action: "none" };
      const item = inventory(workspace).find((candidate) => candidate.id === job.inventoryItemId);
      const policy = policies(workspace).find((candidate) => candidate.id === job.policyId);
      if (!item || !policy || policy.version !== job.policyVersion) {
        workspace = invalidateJob(workspace, job, item, this.clock().toISOString(), "Publication authority record is unavailable or changed");
        await this.save(workspace);
        return { action: "authority_invalidated", jobId: job.id };
      }

      const dueAt = new Date(job.status === "retry_wait" && job.nextAttemptAt ? job.nextAttemptAt : job.scheduledFor);
      if (instant.getTime() - dueAt.getTime() > policy.lateToleranceMinutes * MINUTE_MS) {
        workspace = cancelLateJob(workspace, job, item, this.clock().toISOString());
        await this.save(workspace);
        return { action: "cancelled", jobId: job.id, detail: "Publication missed its configured late-tolerance window." };
      }
      if (item.expiresAt && Date.parse(item.expiresAt) <= instant.getTime()) {
        workspace = cancelExpiredJob(workspace, job, item, this.clock().toISOString());
        await this.save(workspace);
        return { action: "cancelled", jobId: job.id, detail: "Publication inventory expired before execution." };
      }
      if (!await this.authorityCurrent(workspace, item)) {
        workspace = invalidateJob(workspace, job, item, this.clock().toISOString(), "Source, destination, or publication policy authority changed");
        await this.save(workspace);
        return { action: "authority_invalidated", jobId: job.id };
      }
      if (!this.provider) return { action: "none", jobId: job.id, detail: "No publication provider is configured." };

      const destination = requiredActiveDestination(workspace, job.destinationId);
      const attemptNumber = job.attemptCount + 1;
      const now = this.clock().toISOString();
      const attempt: PublicationAttempt = {
        id: this.createId(),
        workspaceId,
        jobId: job.id,
        sequence: attemptNumber,
        idempotencyKey: job.idempotencyKey,
        status: "executing",
        startedAt: now,
      };
      const executingJob: PublicationJob = {
        ...job,
        status: "executing",
        attemptCount: attemptNumber,
        updatedAt: now,
      };
      workspace = {
        ...workspace,
        publicationJobs: replaceJob(jobs(workspace), executingJob),
        publicationAttempts: [...attempts(workspace), attempt],
        updatedAt: now,
      };
      await this.save(workspace);

      let outcome: PublicationProviderOutcome;
      try {
        outcome = await this.provider.publish({ job: executingJob, destination, source: item.source, attemptNumber });
      } catch (error) {
        outcome = {
          kind: "outcome_unknown",
          detail: error instanceof Error ? error.message : "Provider execution threw after dispatch became possible",
        };
      }

      workspace = this.applyOutcome(workspace, executingJob, attempt, item, policy, outcome, instant);
      await this.save(workspace);
      const completed = jobs(workspace).find((candidate) => candidate.id === job.id);
      if (!completed) return { action: "failed", jobId: job.id, detail: "Publication job disappeared during execution." };
      return {
        action: resultAction(completed.status),
        jobId: completed.id,
        ...(completed.failureDetail ? { detail: completed.failureDetail } : {}),
      };
    });
  }

  async reconcileRestart(workspaceId: string): Promise<PublicationSchedulerResult> {
    return withWorkspaceLock(workspaceId, async () => {
      const reconciled = reconcileExecuting(await this.load(workspaceId), this.clock().toISOString());
      if (!reconciled.changed) return { action: "none" };
      await this.save(reconciled.workspace);
      return {
        action: "outcome_unknown",
        jobId: reconciled.jobId,
        detail: "Interrupted execution was converted to outcome_unknown; automatic retry is blocked.",
      };
    });
  }

  async cancelJob(workspaceId: string, jobId: string): Promise<PublicationSchedulerResult> {
    return withWorkspaceLock(workspaceId, async () => {
      const workspace = await this.load(workspaceId);
      const job = jobs(workspace).find((candidate) => candidate.id === jobId);
      if (!job) throw new Error("Publication job not found");
      if (!["waiting", "retry_wait", "failed"].includes(job.status)) {
        throw new Error("Only waiting, retry-wait, or confirmed-failed publication jobs can be cancelled");
      }
      const item = inventory(workspace).find((candidate) => candidate.id === job.inventoryItemId);
      const now = this.clock().toISOString();
      let nextItem = item;
      if (item?.status === "reserved") {
        nextItem = await this.authorityCurrent(workspace, item)
          ? { ...item, status: "stocked", updatedAt: now }
          : { ...item, status: "approval_invalidated", reviewNote: "Authority changed while publication job was reserved", updatedAt: now };
      }
      await this.save({
        ...workspace,
        publicationJobs: replaceJob(jobs(workspace), {
          ...job,
          status: "cancelled",
          updatedAt: now,
          failureClass: "cancelled_by_user",
          failureDetail: "Publication job cancelled before a successful provider outcome.",
        }),
        publicationInventory: item && nextItem
          ? inventory(workspace).map((candidate) => candidate.id === item.id ? nextItem! : candidate)
          : inventory(workspace),
        updatedAt: now,
      });
      return { action: "cancelled", jobId };
    });
  }

  async runOnce(workspaceId: string, at: string): Promise<PublicationSchedulerResult> {
    const recovered = await this.reconcileRestart(workspaceId);
    if (recovered.action !== "none") return recovered;
    const due = await this.executeDue(workspaceId, at);
    if (due.action !== "none") return due;
    const scheduled = await this.scheduleNext(workspaceId, at);
    if (scheduled.action !== "scheduled") return scheduled;
    const execution = await this.executeDue(workspaceId, at);
    return execution.action === "none" ? scheduled : execution;
  }

  private applyOutcome(
    workspace: PublicationExecutionWorkspace,
    job: PublicationJob,
    attempt: PublicationAttempt,
    item: PublicationInventoryItem,
    policy: PublicationPolicy,
    outcome: PublicationProviderOutcome,
    instant: Date,
  ): PublicationExecutionWorkspace {
    const now = this.clock().toISOString();
    if (outcome.kind === "published") {
      const nextUseCount = item.useCount + 1;
      return {
        ...workspace,
        publicationJobs: replaceJob(jobs(workspace), {
          ...job,
          status: "published",
          publishedAt: now,
          updatedAt: now,
          publicationId: outcome.publicationId,
          ...(outcome.providerResponseId ? { providerResponseId: outcome.providerResponseId } : {}),
          ...(outcome.deliveryUrl ? { deliveryUrl: outcome.deliveryUrl } : {}),
        }),
        publicationAttempts: replaceAttempt(attempts(workspace), {
          ...attempt,
          status: "published",
          completedAt: now,
          publicationId: outcome.publicationId,
          ...(outcome.providerResponseId ? { providerResponseId: outcome.providerResponseId } : {}),
          ...(outcome.deliveryUrl ? { deliveryUrl: outcome.deliveryUrl } : {}),
        }),
        publicationInventory: inventory(workspace).map((candidate) => candidate.id === item.id
          ? {
              ...candidate,
              useCount: nextUseCount,
              status: nextUseCount >= candidate.maxUses ? "depleted" as const : "stocked" as const,
              updatedAt: now,
            }
          : candidate),
        updatedAt: now,
      };
    }

    if (outcome.kind === "retryable_failure") {
      const completedAttempt: PublicationAttempt = {
        ...attempt,
        status: "retryable_failure",
        completedAt: now,
        failureClass: outcome.failureClass,
        failureDetail: outcome.detail,
      };
      if (attempt.sequence <= policy.retryLimit) {
        const retryAt = findNextWindowInstant(
          new Date(instant.getTime() + retryBackoffMinutes(attempt.sequence) * MINUTE_MS),
          policy,
        );
        if (retryAt) {
          return {
            ...workspace,
            publicationJobs: replaceJob(jobs(workspace), {
              ...job,
              status: "retry_wait",
              nextAttemptAt: retryAt.toISOString(),
              updatedAt: now,
              failureClass: outcome.failureClass,
              failureDetail: outcome.detail,
            }),
            publicationAttempts: replaceAttempt(attempts(workspace), completedAttempt),
            updatedAt: now,
          };
        }
      }
      return {
        ...workspace,
        publicationJobs: replaceJob(jobs(workspace), {
          ...job,
          status: "failed",
          updatedAt: now,
          failureClass: outcome.failureClass,
          failureDetail: outcome.detail,
        }),
        publicationAttempts: replaceAttempt(attempts(workspace), completedAttempt),
        updatedAt: now,
      };
    }

    if (outcome.kind === "terminal_failure") {
      return {
        ...workspace,
        publicationJobs: replaceJob(jobs(workspace), {
          ...job,
          status: "failed",
          updatedAt: now,
          failureClass: outcome.failureClass,
          failureDetail: outcome.detail,
        }),
        publicationAttempts: replaceAttempt(attempts(workspace), {
          ...attempt,
          status: "terminal_failure",
          completedAt: now,
          failureClass: outcome.failureClass,
          failureDetail: outcome.detail,
        }),
        updatedAt: now,
      };
    }

    return {
      ...workspace,
      publicationJobs: replaceJob(jobs(workspace), {
        ...job,
        status: "outcome_unknown",
        updatedAt: now,
        failureClass: "provider_outcome_unknown",
        failureDetail: outcome.detail,
      }),
      publicationAttempts: replaceAttempt(attempts(workspace), {
        ...attempt,
        status: "outcome_unknown",
        completedAt: now,
        failureClass: "provider_outcome_unknown",
        failureDetail: outcome.detail,
      }),
      updatedAt: now,
    };
  }

  private async eligibleStock(workspace: PublicationExecutionWorkspace, at: Date): Promise<PublicationInventoryItem[]> {
    const result: PublicationInventoryItem[] = [];
    for (const item of inventory(workspace)) {
      if (item.status !== "stocked") continue;
      if (item.useCount >= item.maxUses) continue;
      if (Date.parse(item.availableFrom) > at.getTime()) continue;
      if (item.expiresAt && Date.parse(item.expiresAt) <= at.getTime()) continue;
      if (await this.authorityCurrent(workspace, item)) result.push(item);
    }
    return result.sort(compareInventoryItems);
  }

  private async authorityCurrent(workspace: PublicationExecutionWorkspace, item: PublicationInventoryItem): Promise<boolean> {
    try {
      const destination = requiredActiveDestination(workspace, item.destinationId);
      if (destination.updatedAt !== item.destinationUpdatedAt) return false;
      const policy = requiredPolicy(workspace, item.policyId);
      if (!policy.enabled || policy.version !== item.policyVersion || policy.destinationId !== destination.id) return false;
      const current = await this.sourceAuthority.resolve(workspace.workspaceId, item.source.kind, item.source.sourceId, destination.channel);
      return sameSource(item.source, current);
    } catch {
      return false;
    }
  }

  private async load(workspaceId: string): Promise<PublicationExecutionWorkspace> {
    const workspace = await this.store.load(workspaceId);
    if (!workspace) throw new Error("Calendar and Activation workspace not found");
    return normalizeExecutionWorkspace(workspace);
  }

  private async save(workspace: PublicationExecutionWorkspace): Promise<void> {
    await this.store.save(normalizeExecutionWorkspace(workspace));
  }

  private statusFromWorkspace(workspace: PublicationExecutionWorkspace): PublicationAutomationStatus {
    const all = jobs(workspace);
    const count = (status: PublicationJob["status"]): number => all.filter((job) => job.status === status).length;
    return {
      paused: workspace.publicationAutomation?.paused ?? false,
      waiting: count("waiting"),
      executing: count("executing"),
      retryWaiting: count("retry_wait"),
      published: count("published"),
      failed: count("failed"),
      cancelled: count("cancelled"),
      authorityInvalidated: count("authority_invalidated"),
      outcomeUnknown: count("outcome_unknown"),
    };
  }
}

function normalizeExecutionWorkspace(workspace: PublicationExecutionWorkspace): PublicationExecutionWorkspace {
  return { ...workspace, publicationJobs: jobs(workspace), publicationAttempts: attempts(workspace) };
}

function policies(workspace: PublicationExecutionWorkspace): readonly PublicationPolicy[] {
  return workspace.publicationPolicies ?? [];
}
function inventory(workspace: PublicationExecutionWorkspace): readonly PublicationInventoryItem[] {
  return workspace.publicationInventory ?? [];
}
function jobs(workspace: PublicationExecutionWorkspace): readonly PublicationJob[] {
  return workspace.publicationJobs ?? [];
}
function attempts(workspace: PublicationExecutionWorkspace): readonly PublicationAttempt[] {
  return workspace.publicationAttempts ?? [];
}
function requiredPolicy(workspace: PublicationExecutionWorkspace, policyId: string): PublicationPolicy {
  const policy = policies(workspace).find((candidate) => candidate.id === policyId);
  if (!policy) throw new Error("Publication policy not found");
  return policy;
}
function requiredActiveDestination(workspace: PublicationExecutionWorkspace, destinationId: string): DestinationRecord {
  const destination = workspace.destinations.find((candidate) => candidate.id === destinationId);
  if (!destination) throw new Error("Publication destination not found");
  if (destination.status !== "active") throw new Error("Publication destination is not active");
  return destination;
}

function sameSource(left: ActivationSourceSnapshot, right: ActivationSourceSnapshot): boolean {
  const normalize = (value: ActivationSourceSnapshot): string => JSON.stringify({ ...value, capturedAt: "" });
  return normalize(left) === normalize(right);
}

function compareInventoryItems(left: PublicationInventoryItem, right: PublicationInventoryItem): number {
  if (left.priority !== right.priority) return left.priority - right.priority;
  const leftExpiry = left.expiresAt ? Date.parse(left.expiresAt) : Number.POSITIVE_INFINITY;
  const rightExpiry = right.expiresAt ? Date.parse(right.expiresAt) : Number.POSITIVE_INFINITY;
  if (leftExpiry !== rightExpiry) return leftExpiry - rightExpiry;
  const leftReviewed = left.reviewedAt ? Date.parse(left.reviewedAt) : Number.POSITIVE_INFINITY;
  const rightReviewed = right.reviewedAt ? Date.parse(right.reviewedAt) : Number.POSITIVE_INFINITY;
  if (leftReviewed !== rightReviewed) return leftReviewed - rightReviewed;
  return left.id.localeCompare(right.id);
}

function idempotencyKeyFor(item: PublicationInventoryItem): string {
  return [
    "viable-publication",
    item.workspaceId,
    item.id,
    `use-${item.useCount + 1}`,
    `source-${item.source.sourceVersion}`,
    `policy-${item.policyVersion}`,
    `destination-${item.destinationUpdatedAt}`,
  ].join(":");
}

function requiredDate(value: string, label: string): Date {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) throw new Error(`${label} must be a valid date and time`);
  return new Date(timestamp);
}

function dueJobs(workspace: PublicationExecutionWorkspace, at: Date): PublicationJob[] {
  return jobs(workspace)
    .filter((job) => {
      if (job.status === "waiting") return Date.parse(job.scheduledFor) <= at.getTime();
      return job.status === "retry_wait" && Boolean(job.nextAttemptAt) && Date.parse(job.nextAttemptAt!) <= at.getTime();
    })
    .sort((left, right) => dueTime(left) - dueTime(right) || left.id.localeCompare(right.id));
}

function dueTime(job: PublicationJob): number {
  return Date.parse(job.status === "retry_wait" && job.nextAttemptAt ? job.nextAttemptAt : job.scheduledFor);
}

function replaceJob(values: readonly PublicationJob[], replacement: PublicationJob): PublicationJob[] {
  return values.map((candidate) => candidate.id === replacement.id ? replacement : candidate);
}
function replaceAttempt(values: readonly PublicationAttempt[], replacement: PublicationAttempt): PublicationAttempt[] {
  return values.map((candidate) => candidate.id === replacement.id ? replacement : candidate);
}

function reconcileExecuting(workspace: PublicationExecutionWorkspace, now: string): ReconcileResult {
  const interrupted = jobs(workspace).filter((job) => job.status === "executing");
  if (interrupted.length === 0) return { changed: false, workspace };
  const jobId = interrupted[0]!.id;
  const ids = new Set(interrupted.map((job) => job.id));
  return {
    changed: true,
    jobId,
    workspace: {
      ...workspace,
      publicationJobs: jobs(workspace).map((job) => ids.has(job.id) ? {
        ...job,
        status: "outcome_unknown" as const,
        updatedAt: now,
        failureClass: "restart_during_execution",
        failureDetail: "Execution was interrupted after provider dispatch may have begun.",
      } : job),
      publicationAttempts: attempts(workspace).map((attempt) => ids.has(attempt.jobId) && attempt.status === "executing" ? {
        ...attempt,
        status: "outcome_unknown" as const,
        completedAt: now,
        failureClass: "restart_during_execution",
        failureDetail: "Execution was interrupted after provider dispatch may have begun.",
      } : attempt),
      updatedAt: now,
    },
  };
}

function invalidateJob(
  workspace: PublicationExecutionWorkspace,
  job: PublicationJob,
  item: PublicationInventoryItem | undefined,
  now: string,
  detail: string,
): PublicationExecutionWorkspace {
  return {
    ...workspace,
    publicationJobs: replaceJob(jobs(workspace), {
      ...job,
      status: "authority_invalidated",
      updatedAt: now,
      failureClass: "authority_invalidated",
      failureDetail: detail,
    }),
    publicationInventory: item
      ? inventory(workspace).map((candidate) => candidate.id === item.id ? {
          ...candidate,
          status: "approval_invalidated" as const,
          reviewNote: detail,
          updatedAt: now,
        } : candidate)
      : inventory(workspace),
    updatedAt: now,
  };
}

function cancelLateJob(
  workspace: PublicationExecutionWorkspace,
  job: PublicationJob,
  item: PublicationInventoryItem,
  now: string,
): PublicationExecutionWorkspace {
  return {
    ...workspace,
    publicationJobs: replaceJob(jobs(workspace), {
      ...job,
      status: "cancelled",
      updatedAt: now,
      failureClass: "late_tolerance_exceeded",
      failureDetail: "Publication job exceeded its configured late-tolerance window without provider execution.",
    }),
    publicationInventory: inventory(workspace).map((candidate) => candidate.id === item.id && candidate.status === "reserved"
      ? { ...candidate, status: "stocked" as const, updatedAt: now }
      : candidate),
    updatedAt: now,
  };
}

function cancelExpiredJob(
  workspace: PublicationExecutionWorkspace,
  job: PublicationJob,
  item: PublicationInventoryItem,
  now: string,
): PublicationExecutionWorkspace {
  return {
    ...workspace,
    publicationJobs: replaceJob(jobs(workspace), {
      ...job,
      status: "cancelled",
      updatedAt: now,
      failureClass: "inventory_expired",
      failureDetail: "Publication inventory expired before provider execution.",
    }),
    publicationInventory: inventory(workspace).map((candidate) => candidate.id === item.id
      ? { ...candidate, status: "retired" as const, updatedAt: now }
      : candidate),
    updatedAt: now,
  };
}

function resultAction(status: PublicationJob["status"]): PublicationSchedulerResult["action"] {
  switch (status) {
    case "published": return "published";
    case "retry_wait": return "retry_wait";
    case "failed": return "failed";
    case "cancelled": return "cancelled";
    case "authority_invalidated": return "authority_invalidated";
    case "outcome_unknown": return "outcome_unknown";
    default: return "none";
  }
}

function retryBackoffMinutes(attemptSequence: number): number {
  return Math.min(60, 5 * (2 ** Math.max(0, attemptSequence - 1)));
}

function findNextSlot(start: Date, policy: PublicationPolicy, existingJobs: readonly PublicationJob[]): Date | undefined {
  const candidate = ceilToMinute(start);
  for (let offset = 0; offset <= SCHEDULING_HORIZON_MINUTES; offset += 1) {
    const value = new Date(candidate.getTime() + offset * MINUTE_MS);
    if (withinPublicationWindow(value, policy)
      && withinQuota(value, policy, existingJobs)
      && outsideCooldown(value, policy, existingJobs)) return value;
  }
  return undefined;
}

function findNextWindowInstant(start: Date, policy: PublicationPolicy): Date | undefined {
  const candidate = ceilToMinute(start);
  for (let offset = 0; offset <= SCHEDULING_HORIZON_MINUTES; offset += 1) {
    const value = new Date(candidate.getTime() + offset * MINUTE_MS);
    if (withinPublicationWindow(value, policy)) return value;
  }
  return undefined;
}

function ceilToMinute(value: Date): Date {
  return new Date(Math.ceil(value.getTime() / MINUTE_MS) * MINUTE_MS);
}

function withinPublicationWindow(value: Date, policy: PublicationPolicy): boolean {
  const local = localParts(value, policy.timezone);
  if (!policy.allowedWeekdays.includes(local.weekday)) return false;
  return policy.allowedWindows.some((window) => {
    const start = clockMinutes(window.start);
    const end = clockMinutes(window.end);
    return local.minuteOfDay >= start && local.minuteOfDay < end;
  });
}

function withinQuota(value: Date, policy: PublicationPolicy, existingJobs: readonly PublicationJob[]): boolean {
  const counted = existingJobs.filter((job) => job.policyId === policy.id && countsAgainstQuota(job.status));
  if (policy.maximumPerDay !== undefined) {
    const date = localParts(value, policy.timezone).dateKey;
    if (counted.filter((job) => localParts(new Date(job.scheduledFor), policy.timezone).dateKey === date).length >= policy.maximumPerDay) return false;
  }
  if (policy.maximumPerWeek !== undefined) {
    const week = localWeekKey(value, policy.timezone);
    if (counted.filter((job) => localWeekKey(new Date(job.scheduledFor), policy.timezone) === week).length >= policy.maximumPerWeek) return false;
  }
  return true;
}

function outsideCooldown(value: Date, policy: PublicationPolicy, existingJobs: readonly PublicationJob[]): boolean {
  if (policy.minimumCooldownMinutes <= 0) return true;
  const gap = policy.minimumCooldownMinutes * MINUTE_MS;
  return existingJobs
    .filter((job) => job.policyId === policy.id && countsAgainstQuota(job.status))
    .every((job) => Math.abs(Date.parse(job.scheduledFor) - value.getTime()) >= gap);
}

function countsAgainstQuota(status: PublicationJob["status"]): boolean {
  return !["failed", "cancelled", "authority_invalidated"].includes(status);
}

function clockMinutes(value: string): number {
  const [hourText, minuteText] = value.split(":");
  return Number(hourText) * 60 + Number(minuteText);
}

function localParts(value: Date, timezone: string): Readonly<{ dateKey: string; weekday: number; minuteOfDay: number }> {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(value);
  const pick = (type: Intl.DateTimeFormatPartTypes): string => parts.find((part) => part.type === type)?.value ?? "";
  const weekday = new Map([
    ["Sun", 0], ["Mon", 1], ["Tue", 2], ["Wed", 3], ["Thu", 4], ["Fri", 5], ["Sat", 6],
  ]).get(pick("weekday"));
  if (weekday === undefined) throw new Error(`Unable to resolve weekday in timezone ${timezone}`);
  return {
    dateKey: `${pick("year")}-${pick("month")}-${pick("day")}`,
    weekday,
    minuteOfDay: Number(pick("hour")) * 60 + Number(pick("minute")),
  };
}

function localWeekKey(value: Date, timezone: string): string {
  const local = localParts(value, timezone);
  const date = new Date(`${local.dateKey}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() - ((local.weekday + 6) % 7));
  return date.toISOString().slice(0, 10);
}

async function withWorkspaceLock<T>(workspaceId: string, operation: () => Promise<T>): Promise<T> {
  const previous = workspaceLocks.get(workspaceId) ?? Promise.resolve();
  let release!: () => void;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  const tail = previous.then(() => gate);
  workspaceLocks.set(workspaceId, tail);
  await previous;
  try {
    return await operation();
  } finally {
    release();
    void tail.finally(() => {
      if (workspaceLocks.get(workspaceId) === tail) workspaceLocks.delete(workspaceId);
    });
  }
}
