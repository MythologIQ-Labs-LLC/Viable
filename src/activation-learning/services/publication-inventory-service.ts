import type {
  ActivationLearningWorkspace,
  ActivationSourceKind,
  ActivationSourceSnapshot,
  DestinationRecord,
} from "../domain/activation-learning.js";
import type {
  PublicationInventoryItem,
  PublicationInventoryReviewDecision,
  PublicationPolicy,
  PublicationWindow,
} from "../domain/publication-inventory.js";
import type { ActivationLearningStore } from "../ports/activation-learning-store.js";
import type { PublicationSourceAuthorityPort } from "../ports/publication-source-authority.js";

type Clock = () => Date;
type IdFactory = () => string;

export class PublicationInventoryService {
  constructor(
    private readonly store: ActivationLearningStore,
    private readonly sourceAuthority: PublicationSourceAuthorityPort,
    private readonly clock: Clock = () => new Date(),
    private readonly createId: IdFactory = () => globalThis.crypto.randomUUID(),
  ) {}

  async load(workspaceId: string): Promise<ActivationLearningWorkspace> {
    const workspace = await this.store.load(workspaceId);
    return normalizedWorkspace(workspace ?? emptyWorkspace(workspaceId, this.clock().toISOString()));
  }

  async createPolicy(workspaceId: string, input: Readonly<{
    label: string;
    destinationId: string;
    timezone: string;
    allowedWeekdays: readonly number[];
    allowedWindows: readonly PublicationWindow[];
    minimumCooldownMinutes: number;
    maximumPerDay?: number;
    maximumPerWeek?: number;
    lateToleranceMinutes: number;
    retryLimit: number;
  }>): Promise<ActivationLearningWorkspace> {
    requireText(input.label, "Publication policy label");
    requireText(input.timezone, "Publication policy timezone");
    rejectSecrets([input.label, input.timezone]);
    validateWeekdays(input.allowedWeekdays);
    validatePublicationWindows(input.allowedWindows);
    requireNonNegativeInteger(input.minimumCooldownMinutes, "Minimum cooldown minutes");
    requireOptionalPositiveInteger(input.maximumPerDay, "Maximum publications per day");
    requireOptionalPositiveInteger(input.maximumPerWeek, "Maximum publications per week");
    requireNonNegativeInteger(input.lateToleranceMinutes, "Late tolerance minutes");
    requireNonNegativeInteger(input.retryLimit, "Retry limit");

    const workspace = await this.load(workspaceId);
    const destination = requiredActiveDestination(workspace, input.destinationId);
    const now = this.clock().toISOString();
    const policy: PublicationPolicy = {
      id: this.createId(),
      workspaceId,
      label: input.label.trim(),
      destinationId: destination.id,
      version: 1,
      timezone: input.timezone.trim(),
      allowedWeekdays: [...new Set(input.allowedWeekdays)].sort((left, right) => left - right),
      allowedWindows: input.allowedWindows.map((window) => ({ start: window.start, end: window.end })),
      minimumCooldownMinutes: input.minimumCooldownMinutes,
      ...(input.maximumPerDay !== undefined ? { maximumPerDay: input.maximumPerDay } : {}),
      ...(input.maximumPerWeek !== undefined ? { maximumPerWeek: input.maximumPerWeek } : {}),
      lateToleranceMinutes: input.lateToleranceMinutes,
      retryLimit: input.retryLimit,
      enabled: true,
      createdAt: now,
      updatedAt: now,
    };
    return this.persist({
      ...workspace,
      publicationPolicies: [...publicationPolicies(workspace), policy],
      updatedAt: now,
    });
  }

  async setPolicyEnabled(workspaceId: string, policyId: string, enabled: boolean): Promise<ActivationLearningWorkspace> {
    const workspace = await this.load(workspaceId);
    const policies = publicationPolicies(workspace);
    if (!policies.some((policy) => policy.id === policyId)) throw new Error("Publication policy not found");
    const now = this.clock().toISOString();
    return this.persist({
      ...workspace,
      publicationPolicies: policies.map((policy) => policy.id === policyId ? { ...policy, enabled, updatedAt: now } : policy),
      updatedAt: now,
    });
  }

  async createInventoryItem(workspaceId: string, input: Readonly<{
    destinationId: string;
    policyId: string;
    sourceKind: ActivationSourceKind;
    sourceId: string;
    priority: number;
    availableFrom: string;
    expiresAt?: string;
    maxUses?: number;
  }>): Promise<ActivationLearningWorkspace> {
    requireFiniteNumber(input.priority, "Publication inventory priority");
    const availableFrom = normalizedDate(input.availableFrom, "Inventory availability start");
    const expiresAt = input.expiresAt ? normalizedDate(input.expiresAt, "Inventory expiration") : undefined;
    if (expiresAt && Date.parse(expiresAt) <= Date.parse(availableFrom)) {
      throw new Error("Inventory expiration must be after availability start");
    }
    const maxUses = input.maxUses ?? 1;
    requirePositiveInteger(maxUses, "Publication inventory maximum uses");

    const workspace = await this.load(workspaceId);
    const destination = requiredActiveDestination(workspace, input.destinationId);
    const policy = requiredPolicy(workspace, input.policyId);
    if (!policy.enabled) throw new Error("Publication inventory requires an enabled publication policy");
    if (policy.destinationId !== destination.id) throw new Error("Publication policy does not belong to the selected destination");
    const source = await this.sourceAuthority.resolve(workspaceId, input.sourceKind, input.sourceId, destination.channel);
    const now = this.clock().toISOString();
    const item: PublicationInventoryItem = {
      id: this.createId(),
      workspaceId,
      destinationId: destination.id,
      destinationUpdatedAt: destination.updatedAt,
      policyId: policy.id,
      policyVersion: policy.version,
      source,
      status: "draft",
      priority: input.priority,
      availableFrom,
      ...(expiresAt ? { expiresAt } : {}),
      maxUses,
      useCount: 0,
      createdAt: now,
      updatedAt: now,
    };
    return this.persist({
      ...workspace,
      publicationInventory: [...publicationInventory(workspace), item],
      updatedAt: now,
    });
  }

  async submitInventoryItem(workspaceId: string, itemId: string): Promise<ActivationLearningWorkspace> {
    const workspace = await this.load(workspaceId);
    const items = publicationInventory(workspace);
    const item = requiredItem(workspace, itemId);
    if (!["draft", "changes_requested", "approval_invalidated"].includes(item.status)) {
      throw new Error("Only draft, changed, or invalidated inventory can enter review");
    }
    const destination = requiredActiveDestination(workspace, item.destinationId);
    const policy = requiredPolicy(workspace, item.policyId);
    if (!policy.enabled) throw new Error("Publication policy is disabled");
    if (policy.destinationId !== destination.id) throw new Error("Publication policy destination changed");
    const source = await this.sourceAuthority.resolve(workspaceId, item.source.kind, item.source.sourceId, destination.channel);
    const now = this.clock().toISOString();
    return this.persist({
      ...workspace,
      publicationInventory: items.map((candidate) => candidate.id === item.id ? {
        ...candidate,
        destinationUpdatedAt: destination.updatedAt,
        policyVersion: policy.version,
        source,
        status: "in_review" as const,
        reviewedBy: undefined,
        reviewedAt: undefined,
        reviewNote: undefined,
        updatedAt: now,
      } : candidate),
      updatedAt: now,
    });
  }

  async reviewInventoryItem(
    workspaceId: string,
    itemId: string,
    reviewer: string,
    decision: PublicationInventoryReviewDecision,
    note: string,
  ): Promise<ActivationLearningWorkspace> {
    requireText(reviewer, "Publication inventory reviewer");
    requireText(note, "Publication inventory review note");
    rejectSecrets([reviewer, note]);
    const workspace = await this.load(workspaceId);
    const items = publicationInventory(workspace);
    const item = requiredItem(workspace, itemId);
    if (item.status !== "in_review") throw new Error("Publication inventory item must be in review");
    const destination = requiredActiveDestination(workspace, item.destinationId);
    const policy = requiredPolicy(workspace, item.policyId);
    if (!policy.enabled) throw new Error("Publication policy is disabled");
    if (policy.destinationId !== destination.id || policy.version !== item.policyVersion) {
      throw new Error("Publication policy authority changed during review");
    }
    if (destination.updatedAt !== item.destinationUpdatedAt) {
      throw new Error("Publication destination authority changed during review");
    }
    const current = await this.sourceAuthority.resolve(workspaceId, item.source.kind, item.source.sourceId, destination.channel);
    if (!sameSource(item.source, current)) throw new Error("Publication source authority changed during review");
    const now = this.clock().toISOString();
    const status = decision === "approved" ? "stocked" : decision;
    return this.persist({
      ...workspace,
      publicationInventory: items.map((candidate) => candidate.id === item.id ? {
        ...candidate,
        status,
        reviewedBy: reviewer.trim(),
        reviewedAt: now,
        reviewNote: note.trim(),
        updatedAt: now,
      } : candidate),
      updatedAt: now,
    });
  }

  async retireInventoryItem(workspaceId: string, itemId: string): Promise<ActivationLearningWorkspace> {
    const workspace = await this.load(workspaceId);
    const items = publicationInventory(workspace);
    const item = requiredItem(workspace, itemId);
    if (item.status === "reserved") throw new Error("Reserved publication inventory cannot be retired until its reservation is resolved");
    if (item.status === "depleted") throw new Error("Depleted publication inventory is already exhausted");
    const now = this.clock().toISOString();
    return this.persist({
      ...workspace,
      publicationInventory: items.map((candidate) => candidate.id === item.id ? { ...candidate, status: "retired" as const, updatedAt: now } : candidate),
      updatedAt: now,
    });
  }

  async detectAuthorityImpact(workspaceId: string): Promise<ActivationLearningWorkspace> {
    const workspace = await this.load(workspaceId);
    const now = this.clock().toISOString();
    const items: PublicationInventoryItem[] = [];
    for (const item of publicationInventory(workspace)) {
      if (!["in_review", "stocked"].includes(item.status)) {
        items.push(item);
        continue;
      }
      const valid = await this.isAuthorityCurrent(workspaceId, workspace, item);
      items.push(valid ? item : { ...item, status: "approval_invalidated", reviewNote: "Source, destination, or publication policy authority changed", updatedAt: now });
    }
    return this.persist({ ...workspace, publicationInventory: items, updatedAt: now });
  }

  async eligibleItems(workspaceId: string, at: string): Promise<readonly PublicationInventoryItem[]> {
    const instant = Date.parse(at);
    if (!Number.isFinite(instant)) throw new Error("Publication eligibility time must be a valid date and time");
    const workspace = await this.load(workspaceId);
    const eligible: PublicationInventoryItem[] = [];
    for (const item of publicationInventory(workspace)) {
      if (item.status !== "stocked") continue;
      if (item.useCount >= item.maxUses) continue;
      if (Date.parse(item.availableFrom) > instant) continue;
      if (item.expiresAt && Date.parse(item.expiresAt) <= instant) continue;
      if (!await this.isAuthorityCurrent(workspaceId, workspace, item)) continue;
      eligible.push(item);
    }
    return eligible.sort(compareInventoryItems);
  }

  private async isAuthorityCurrent(
    workspaceId: string,
    workspace: ActivationLearningWorkspace,
    item: PublicationInventoryItem,
  ): Promise<boolean> {
    try {
      const destination = requiredActiveDestination(workspace, item.destinationId);
      if (destination.updatedAt !== item.destinationUpdatedAt) return false;
      const policy = requiredPolicy(workspace, item.policyId);
      if (!policy.enabled || policy.version !== item.policyVersion || policy.destinationId !== destination.id) return false;
      const current = await this.sourceAuthority.resolve(workspaceId, item.source.kind, item.source.sourceId, destination.channel);
      return sameSource(item.source, current);
    } catch {
      return false;
    }
  }

  private async persist(workspace: ActivationLearningWorkspace): Promise<ActivationLearningWorkspace> {
    const normalized = normalizedWorkspace(workspace);
    await this.store.save(normalized);
    return normalized;
  }
}

function emptyWorkspace(workspaceId: string, now: string): ActivationLearningWorkspace {
  return {
    workspaceId,
    destinations: [],
    calendarEntries: [],
    publicationPolicies: [],
    publicationInventory: [],
    packages: [],
    exportOperations: [],
    deliveryOutcomes: [],
    measurementPlans: [],
    performanceImports: [],
    retrospectives: [],
    learningLedger: [],
    updatedAt: now,
  };
}

function normalizedWorkspace(workspace: ActivationLearningWorkspace): ActivationLearningWorkspace {
  return {
    ...workspace,
    publicationPolicies: publicationPolicies(workspace),
    publicationInventory: publicationInventory(workspace),
  };
}

function publicationPolicies(workspace: ActivationLearningWorkspace): readonly PublicationPolicy[] {
  return workspace.publicationPolicies ?? [];
}

function publicationInventory(workspace: ActivationLearningWorkspace): readonly PublicationInventoryItem[] {
  return workspace.publicationInventory ?? [];
}

function requiredActiveDestination(workspace: ActivationLearningWorkspace, destinationId: string): DestinationRecord {
  const destination = workspace.destinations.find((candidate) => candidate.id === destinationId);
  if (!destination) throw new Error("Publication destination not found");
  if (destination.status !== "active") throw new Error("Publication destination is not active");
  return destination;
}

function requiredPolicy(workspace: ActivationLearningWorkspace, policyId: string): PublicationPolicy {
  const policy = publicationPolicies(workspace).find((candidate) => candidate.id === policyId);
  if (!policy) throw new Error("Publication policy not found");
  return policy;
}

function requiredItem(workspace: ActivationLearningWorkspace, itemId: string): PublicationInventoryItem {
  const item = publicationInventory(workspace).find((candidate) => candidate.id === itemId);
  if (!item) throw new Error("Publication inventory item not found");
  return item;
}

function requireText(value: string, label: string): void {
  if (!value.trim()) throw new Error(`${label} is required`);
}

function requireFiniteNumber(value: number, label: string): void {
  if (!Number.isFinite(value)) throw new Error(`${label} must be finite`);
}

function requirePositiveInteger(value: number, label: string): void {
  if (!Number.isInteger(value) || value <= 0) throw new Error(`${label} must be a positive integer`);
}

function requireNonNegativeInteger(value: number, label: string): void {
  if (!Number.isInteger(value) || value < 0) throw new Error(`${label} must be a non-negative integer`);
}

function requireOptionalPositiveInteger(value: number | undefined, label: string): void {
  if (value !== undefined) requirePositiveInteger(value, label);
}

function validateWeekdays(values: readonly number[]): void {
  if (values.length === 0) throw new Error("Publication policy requires at least one allowed weekday");
  if (values.some((value) => !Number.isInteger(value) || value < 0 || value > 6)) {
    throw new Error("Publication policy weekdays must be integers from 0 through 6");
  }
}

function validatePublicationWindows(values: readonly PublicationWindow[]): void {
  if (values.length === 0) throw new Error("Publication policy requires at least one allowed time window");
  for (const window of values) {
    if (!/^\d{2}:\d{2}$/.test(window.start) || !/^\d{2}:\d{2}$/.test(window.end)) {
      throw new Error("Publication policy windows must use HH:MM values");
    }
    const start = minutesOfDay(window.start);
    const end = minutesOfDay(window.end);
    if (start < 0 || end < 0 || end <= start) throw new Error("Publication policy window end must be after its start");
  }
}

function minutesOfDay(value: string): number {
  const [hourText, minuteText] = value.split(":");
  const hour = Number(hourText);
  const minute = Number(minuteText);
  if (!Number.isInteger(hour) || !Number.isInteger(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59) return -1;
  return hour * 60 + minute;
}

function normalizedDate(value: string, label: string): string {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) throw new Error(`${label} must be a valid date and time`);
  return new Date(timestamp).toISOString();
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

const secretPatterns: readonly RegExp[] = [
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/i,
  /\bBearer\s+[A-Za-z0-9._~+/=-]{8,}/i,
  /\b(?:api[_-]?key|access[_-]?token|client[_-]?secret|password)\s*[:=]\s*\S+/i,
  /\b(?:sk|ghp|github_pat)_[A-Za-z0-9_-]{8,}/i,
];

function rejectSecrets(values: readonly string[]): void {
  if (values.some((value) => secretPatterns.some((pattern) => pattern.test(value)))) {
    throw new Error("Credentials and secret material are prohibited in publication inventory records");
  }
}
