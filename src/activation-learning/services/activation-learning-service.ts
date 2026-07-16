import { isReviewedEvidence } from "../../product-core/domain/evidence.js";
import type { ProductWorkspace } from "../../product-core/domain/workspace.js";
import type { ProductWorkspaceStore } from "../../product-core/ports/product-workspace-store.js";
import type { CampaignWorkspaceStore } from "../../campaigns/ports/campaign-workspace-store.js";
import type { ClaimReference, ChannelKind } from "../../campaigns/domain/campaign.js";
import type { RepositoryGrowthStore } from "../../repository-growth/ports/repository-growth-store.js";
import type { VideoProductionStore } from "../../video-production/ports/video-production-store.js";
import type { VideoPlatform } from "../../video-production/domain/video-production.js";
import type {
  ActivationLearningWorkspace,
  ActivationSourceKind,
  ActivationSourceSnapshot,
  AttributionModel,
  CalendarEntry,
  CalendarEntryKind,
  ConfidenceEffect,
  DeliveryEvidenceClassification,
  DeliveryOutcome,
  DeliveryStatus,
  DestinationChannel,
  DestinationRecord,
  ExportOperation,
  LearningLedgerEntry,
  ManualActivationPackage,
  MeasurementPlan,
  MetricComparison,
  MetricEvidenceState,
  MetricObservation,
  PerformanceImport,
  PerformanceImportStatus,
  Retrospective,
  RetrospectiveDecision,
  ScheduleStatus,
} from "../domain/activation-learning.js";
import type { ActivationLearningStore } from "../ports/activation-learning-store.js";

type Clock = () => Date;
type IdFactory = () => string;
type ReviewDecision = "approved" | "rejected" | "changes_requested";
type PlanningKind = Exclude<CalendarEntryKind, "external_activation">;

export class ActivationLearningService {
  constructor(
    private readonly store: ActivationLearningStore,
    private readonly productStore: ProductWorkspaceStore,
    private readonly campaignStore: CampaignWorkspaceStore,
    private readonly repositoryStore: RepositoryGrowthStore,
    private readonly videoStore: VideoProductionStore,
    private readonly clock: Clock = () => new Date(),
    private readonly createId: IdFactory = () => globalThis.crypto.randomUUID(),
  ) {}

  async load(workspaceId: string): Promise<ActivationLearningWorkspace> {
    return await this.store.load(workspaceId) ?? emptyWorkspace(workspaceId, this.clock().toISOString());
  }

  async createDestination(workspaceId: string, input: Readonly<{
    label: string;
    channel: DestinationChannel;
    accountReference: string;
    accountOwner: string;
    ownershipConfirmed: boolean;
    capabilityNotes: readonly string[];
    rateLimitNotes: string;
    retryPolicy: string;
    dataHandlingNotes: string;
  }>): Promise<ActivationLearningWorkspace> {
    requireText(input.label, "Destination label");
    requireText(input.accountReference, "Non-secret account reference");
    requireText(input.accountOwner, "Destination account owner");
    requireText(input.retryPolicy, "Manual retry policy");
    requireText(input.dataHandlingNotes, "Destination data-handling notes");
    rejectSecrets([input.label, input.accountReference, input.accountOwner, input.rateLimitNotes, input.retryPolicy, input.dataHandlingNotes, ...input.capabilityNotes]);
    if (!input.ownershipConfirmed) throw new Error("Destination account ownership must be explicitly confirmed");
    const workspace = await this.load(workspaceId);
    if (workspace.destinations.some((item) => item.channel === input.channel && item.accountReference === input.accountReference.trim() && item.status === "active")) {
      throw new Error("An active destination already uses this channel and account reference");
    }
    const now = this.clock().toISOString();
    const destination: DestinationRecord = {
      id: this.createId(),
      workspaceId,
      label: input.label.trim(),
      channel: input.channel,
      accountReference: input.accountReference.trim(),
      accountOwner: input.accountOwner.trim(),
      ownershipConfirmed: true,
      deliveryMode: "manual_only",
      capabilityNotes: clean(input.capabilityNotes),
      rateLimitNotes: input.rateLimitNotes.trim(),
      retryPolicy: input.retryPolicy.trim(),
      dataHandlingNotes: input.dataHandlingNotes.trim(),
      status: "active",
      createdAt: now,
      updatedAt: now,
    };
    return this.persist({ ...workspace, destinations: [...workspace.destinations, destination], updatedAt: now });
  }

  async setDestinationStatus(workspaceId: string, destinationId: string, status: "active" | "disabled"): Promise<ActivationLearningWorkspace> {
    const workspace = await this.load(workspaceId);
    if (!workspace.destinations.some((item) => item.id === destinationId)) throw new Error("Destination not found");
    const now = this.clock().toISOString();
    return this.persist({
      ...workspace,
      destinations: workspace.destinations.map((item) => item.id === destinationId ? { ...item, status, updatedAt: now } : item),
      updatedAt: now,
    });
  }

  async createPlanningEntry(workspaceId: string, input: Readonly<{
    kind: PlanningKind;
    title: string;
    owner: string;
    startsAt: string;
    endsAt?: string;
    timezone: string;
    notes: string;
    relatedRecordId?: string;
  }>): Promise<ActivationLearningWorkspace> {
    requireText(input.title, "Calendar title");
    requireText(input.owner, "Calendar owner");
    requireText(input.timezone, "Calendar timezone");
    validateWindow(input.startsAt, input.endsAt, "Calendar window");
    rejectSecrets([input.title, input.owner, input.timezone, input.notes, input.relatedRecordId ?? ""]);
    const workspace = await this.load(workspaceId);
    const now = this.clock().toISOString();
    const entry: CalendarEntry = {
      id: this.createId(),
      workspaceId,
      kind: input.kind,
      title: input.title.trim(),
      owner: input.owner.trim(),
      startsAt: normalizedDate(input.startsAt, "Calendar start"),
      ...(input.endsAt ? { endsAt: normalizedDate(input.endsAt, "Calendar end") } : {}),
      timezone: input.timezone.trim(),
      notes: input.notes.trim(),
      ...(input.relatedRecordId ? { relatedRecordId: input.relatedRecordId.trim() } : {}),
      scheduleStatus: "scheduled",
      activationStatus: "not_applicable",
      createdAt: now,
      updatedAt: now,
    };
    return this.persist({ ...workspace, calendarEntries: [...workspace.calendarEntries, entry], updatedAt: now });
  }

  async createExternalEntry(workspaceId: string, input: Readonly<{
    title: string;
    owner: string;
    startsAt: string;
    endsAt?: string;
    timezone: string;
    notes: string;
    destinationId: string;
    sourceKind: ActivationSourceKind;
    sourceId: string;
  }>): Promise<ActivationLearningWorkspace> {
    requireText(input.title, "External action title");
    requireText(input.owner, "External action owner");
    requireText(input.timezone, "External action timezone");
    validateWindow(input.startsAt, input.endsAt, "External action window");
    rejectSecrets([input.title, input.owner, input.timezone, input.notes]);
    const workspace = await this.load(workspaceId);
    const destination = required(workspace.destinations, input.destinationId, "Destination");
    if (destination.status !== "active") throw new Error("External action requires an active destination");
    const source = await this.resolveSource(workspaceId, input.sourceKind, input.sourceId, destination.channel);
    const now = this.clock().toISOString();
    const entry: CalendarEntry = {
      id: this.createId(),
      workspaceId,
      kind: "external_activation",
      title: input.title.trim(),
      owner: input.owner.trim(),
      startsAt: normalizedDate(input.startsAt, "External action start"),
      ...(input.endsAt ? { endsAt: normalizedDate(input.endsAt, "External action end") } : {}),
      timezone: input.timezone.trim(),
      notes: input.notes.trim(),
      destinationId: destination.id,
      source,
      scheduleStatus: "draft",
      activationStatus: "not_ready",
      createdAt: now,
      updatedAt: now,
    };
    return this.persist({ ...workspace, calendarEntries: [...workspace.calendarEntries, entry], updatedAt: now });
  }

  async submitExternalEntry(workspaceId: string, calendarEntryId: string): Promise<ActivationLearningWorkspace> {
    const workspace = await this.load(workspaceId);
    const entry = required(workspace.calendarEntries, calendarEntryId, "Calendar entry");
    requireExternalEntry(entry);
    if (!["draft", "changes_requested", "approval_invalidated"].includes(entry.scheduleStatus)) {
      throw new Error("Only draft, changed, or invalidated external actions can enter review");
    }
    const destination = required(workspace.destinations, entry.destinationId, "Destination");
    if (destination.status !== "active") throw new Error("External action destination is not active");
    const source = await this.resolveSource(workspaceId, entry.source.kind, entry.source.sourceId, destination.channel);
    const now = this.clock().toISOString();
    return this.persist({
      ...workspace,
      calendarEntries: workspace.calendarEntries.map((item) => item.id === entry.id
        ? { ...item, source, scheduleStatus: "in_review" as const, activationStatus: "not_ready" as const, updatedAt: now }
        : item),
      updatedAt: now,
    });
  }

  async reviewExternalEntry(workspaceId: string, calendarEntryId: string, reviewer: string, decision: ReviewDecision, note: string): Promise<ActivationLearningWorkspace> {
    requireText(reviewer, "Named external-action reviewer");
    requireText(note, "External-action review note");
    rejectSecrets([reviewer, note]);
    const workspace = await this.load(workspaceId);
    const entry = required(workspace.calendarEntries, calendarEntryId, "Calendar entry");
    requireExternalEntry(entry);
    if (entry.scheduleStatus !== "in_review") throw new Error("External action must be in review");
    const destination = required(workspace.destinations, entry.destinationId, "Destination");
    if (destination.status !== "active") throw new Error("External action destination is not active");
    const current = await this.resolveSource(workspaceId, entry.source.kind, entry.source.sourceId, destination.channel);
    if (!sameSource(entry.source, current)) throw new Error("External-action source authority changed during review");
    const now = this.clock().toISOString();
    const scheduleStatus: ScheduleStatus = decision === "approved" ? "scheduled" : decision;
    return this.persist({
      ...workspace,
      calendarEntries: workspace.calendarEntries.map((item) => item.id === entry.id ? {
        ...item,
        scheduleStatus,
        activationStatus: "not_ready" as const,
        reviewedBy: reviewer.trim(),
        reviewedAt: now,
        reviewNote: note.trim(),
        updatedAt: now,
      } : item),
      updatedAt: now,
    });
  }

  async cancelCalendarEntry(workspaceId: string, calendarEntryId: string, owner: string, note: string): Promise<ActivationLearningWorkspace> {
    requireText(owner, "Cancellation owner");
    requireText(note, "Cancellation note");
    const workspace = await this.load(workspaceId);
    const entry = required(workspace.calendarEntries, calendarEntryId, "Calendar entry");
    if (entry.activationStatus === "delivered") throw new Error("Delivered external action cannot be cancelled");
    const now = this.clock().toISOString();
    return this.persist({
      ...workspace,
      calendarEntries: workspace.calendarEntries.map((item) => item.id === entry.id ? {
        ...item,
        scheduleStatus: "cancelled" as const,
        activationStatus: item.kind === "external_activation" ? "cancelled" as const : "not_applicable" as const,
        reviewNote: `${owner.trim()}: ${note.trim()}`,
        updatedAt: now,
      } : item),
      updatedAt: now,
    });
  }

  async createManualPackage(workspaceId: string, calendarEntryId: string, creator: string): Promise<ActivationLearningWorkspace> {
    requireText(creator, "Named manual-export creator");
    const workspace = await this.load(workspaceId);
    const entry = required(workspace.calendarEntries, calendarEntryId, "Calendar entry");
    requireExternalEntry(entry);
    if (entry.scheduleStatus !== "scheduled") throw new Error("Manual activation package requires a reviewed and scheduled external action");
    if (!entry.reviewedBy || !entry.reviewedAt) throw new Error("Manual activation package requires named external-action approval");
    const destination = required(workspace.destinations, entry.destinationId, "Destination");
    if (destination.status !== "active") throw new Error("Manual activation destination is not active");
    const current = await this.resolveSource(workspaceId, entry.source.kind, entry.source.sourceId, destination.channel);
    if (!sameSource(entry.source, current)) throw new Error("External-action source authority changed before export");
    if (workspace.packages.some((item) => item.calendarEntryId === entry.id && item.status === "manual_export_ready")) {
      throw new Error("A current manual activation package already exists for this calendar entry");
    }
    const now = this.clock().toISOString();
    const packageId = this.createId();
    const idempotencyKey = `manual:${workspaceId}:${entry.id}:${current.sourceVersion}`;
    const manifest = JSON.stringify({
      schemaVersion: "1.0",
      calendar: {
        id: entry.id,
        title: entry.title,
        startsAt: entry.startsAt,
        ...(entry.endsAt ? { endsAt: entry.endsAt } : {}),
        timezone: entry.timezone,
        owner: entry.owner,
      },
      approval: {
        status: entry.scheduleStatus,
        reviewedBy: entry.reviewedBy,
        reviewedAt: entry.reviewedAt,
        reviewNote: entry.reviewNote,
      },
      destination: {
        id: destination.id,
        label: destination.label,
        channel: destination.channel,
        accountReference: destination.accountReference,
        accountOwner: destination.accountOwner,
        deliveryMode: destination.deliveryMode,
        retryPolicy: destination.retryPolicy,
        dataHandlingNotes: destination.dataHandlingNotes,
      },
      source: current,
      manualActivation: {
        idempotencyKey,
        credentialsIncluded: false,
        directPublishingAvailable: false,
        deliveryClaimed: false,
        providerVerified: false,
        instructions: [
          "Use the approved payload only at the named destination.",
          "Do not add unsupported claims or unapproved assets.",
          "Record the delivery URL, publication identifier, or explicit failure evidence in Viable.",
        ],
      },
    }, null, 2);
    rejectSecrets([manifest]);
    const record: ManualActivationPackage = {
      id: packageId,
      workspaceId,
      calendarEntryId: entry.id,
      destinationId: destination.id,
      idempotencyKey,
      createdAt: now,
      createdBy: creator.trim(),
      status: "manual_export_ready",
      credentialsIncluded: false,
      deliveryClaimed: false,
      manifest,
    };
    const operation: ExportOperation = {
      id: this.createId(),
      workspaceId,
      packageId,
      status: "ready_for_download",
      attempts: 0,
      createdAt: now,
      updatedAt: now,
    };
    return this.persist({
      ...workspace,
      packages: [...workspace.packages, record],
      exportOperations: [...workspace.exportOperations, operation],
      calendarEntries: workspace.calendarEntries.map((item) => item.id === entry.id ? { ...item, activationStatus: "ready_for_manual_activation" as const, updatedAt: now } : item),
      updatedAt: now,
    });
  }

  async markExportInterrupted(workspaceId: string, operationId: string, detail: string): Promise<ActivationLearningWorkspace> {
    requireText(detail, "Export interruption detail");
    rejectSecrets([detail]);
    return this.changeExportOperation(workspaceId, operationId, (operation) => {
      if (operation.status === "downloaded") throw new Error("Completed export cannot be interrupted");
      const now = this.clock().toISOString();
      return { ...operation, status: "interrupted", attempts: operation.attempts + 1, interruptionDetail: detail.trim(), updatedAt: now };
    });
  }

  async recoverExport(workspaceId: string, operationId: string): Promise<ActivationLearningWorkspace> {
    return this.changeExportOperation(workspaceId, operationId, (operation) => {
      if (operation.status !== "interrupted") throw new Error("Only interrupted exports can be recovered");
      const { interruptionDetail: _ignored, completedAt: _completed, ...rest } = operation;
      return { ...rest, status: "ready_for_download", updatedAt: this.clock().toISOString() };
    });
  }

  async markExportDownloaded(workspaceId: string, operationId: string): Promise<ActivationLearningWorkspace> {
    return this.changeExportOperation(workspaceId, operationId, (operation) => {
      if (operation.status !== "ready_for_download") throw new Error("Export must be ready before download completion is recorded");
      const now = this.clock().toISOString();
      return { ...operation, status: "downloaded", attempts: operation.attempts + 1, completedAt: now, updatedAt: now };
    });
  }

  async recordDeliveryOutcome(workspaceId: string, input: Readonly<{
    calendarEntryId: string;
    packageId: string;
    status: DeliveryStatus;
    evidenceClassification: DeliveryEvidenceClassification;
    source: string;
    observedAt: string;
    recordedBy: string;
    evidenceReferences: readonly string[];
    note: string;
    deliveryUrl?: string;
    publicationId?: string;
    providerResponseId?: string;
    failureClass?: string;
    failureDetail?: string;
  }>): Promise<ActivationLearningWorkspace> {
    requireText(input.source, "Delivery evidence source");
    requireText(input.recordedBy, "Delivery outcome recorder");
    requireText(input.note, "Delivery outcome note");
    if (input.evidenceReferences.length === 0) throw new Error("Delivery outcome requires at least one evidence reference");
    normalizedDate(input.observedAt, "Delivery observation time");
    rejectSecrets([
      input.source, input.recordedBy, input.note, input.deliveryUrl ?? "", input.publicationId ?? "", input.providerResponseId ?? "",
      input.failureClass ?? "", input.failureDetail ?? "", ...input.evidenceReferences,
    ]);
    const workspace = await this.load(workspaceId);
    const entry = required(workspace.calendarEntries, input.calendarEntryId, "Calendar entry");
    requireExternalEntry(entry);
    const packageRecord = required(workspace.packages, input.packageId, "Manual activation package");
    if (packageRecord.calendarEntryId !== entry.id) throw new Error("Delivery outcome package does not belong to the calendar entry");
    const operation = workspace.exportOperations.find((item) => item.packageId === packageRecord.id && item.status === "downloaded");
    if (!operation) throw new Error("Scheduled work cannot become delivered without a completed manual export handoff");
    validateDeliveryEvidence(input);
    const now = this.clock().toISOString();
    const outcome: DeliveryOutcome = {
      id: this.createId(),
      workspaceId,
      calendarEntryId: entry.id,
      packageId: packageRecord.id,
      status: input.status,
      evidenceClassification: input.evidenceClassification,
      source: input.source.trim(),
      observedAt: normalizedDate(input.observedAt, "Delivery observation time"),
      recordedAt: now,
      recordedBy: input.recordedBy.trim(),
      evidenceReferences: clean(input.evidenceReferences),
      note: input.note.trim(),
      ...(input.deliveryUrl ? { deliveryUrl: input.deliveryUrl.trim() } : {}),
      ...(input.publicationId ? { publicationId: input.publicationId.trim() } : {}),
      ...(input.providerResponseId ? { providerResponseId: input.providerResponseId.trim() } : {}),
      ...(input.failureClass ? { failureClass: input.failureClass.trim() } : {}),
      ...(input.failureDetail ? { failureDetail: input.failureDetail.trim() } : {}),
    };
    const activationStatus = input.status === "unknown" ? "outcome_unknown" : input.status;
    return this.persist({
      ...workspace,
      deliveryOutcomes: [...workspace.deliveryOutcomes, outcome],
      calendarEntries: workspace.calendarEntries.map((item) => item.id === entry.id ? { ...item, activationStatus, updatedAt: now } : item),
      updatedAt: now,
    });
  }

  async createMeasurementPlan(workspaceId: string, input: Readonly<{
    calendarEntryId: string;
    observationStartsAt: string;
    observationEndsAt: string;
    baseline: readonly Omit<MetricObservation, "id">[];
    createdBy: string;
  }>): Promise<ActivationLearningWorkspace> {
    requireText(input.createdBy, "Measurement-plan owner");
    validateWindow(input.observationStartsAt, input.observationEndsAt, "Observation window");
    if (input.baseline.length === 0) throw new Error("Measurement plan requires at least one baseline observation");
    const workspace = await this.load(workspaceId);
    required(workspace.calendarEntries, input.calendarEntryId, "Calendar entry");
    if (workspace.measurementPlans.some((item) => item.calendarEntryId === input.calendarEntryId)) {
      throw new Error("A measurement plan already exists for this calendar entry");
    }
    const baseline = input.baseline.map((item) => this.metricObservation(item));
    const now = this.clock().toISOString();
    const plan: MeasurementPlan = {
      id: this.createId(),
      workspaceId,
      calendarEntryId: input.calendarEntryId,
      observationStartsAt: normalizedDate(input.observationStartsAt, "Observation start"),
      observationEndsAt: normalizedDate(input.observationEndsAt, "Observation end"),
      baseline,
      createdAt: now,
      createdBy: input.createdBy.trim(),
    };
    return this.persist({ ...workspace, measurementPlans: [...workspace.measurementPlans, plan], updatedAt: now });
  }

  async importPerformance(workspaceId: string, input: Readonly<{
    calendarEntryId: string;
    status: PerformanceImportStatus;
    source: string;
    sourceClassification: "human_recorded" | "provider_export" | "provider_api";
    observations: readonly Omit<MetricObservation, "id">[];
    importedBy: string;
    notes: string;
  }>): Promise<ActivationLearningWorkspace> {
    requireText(input.source, "Performance source");
    requireText(input.importedBy, "Performance importer");
    requireText(input.notes, "Performance import notes");
    if (input.observations.length === 0) throw new Error("Performance import requires explicit metric evidence states");
    rejectSecrets([input.source, input.importedBy, input.notes]);
    const workspace = await this.load(workspaceId);
    required(workspace.calendarEntries, input.calendarEntryId, "Calendar entry");
    const observations = input.observations.map((item) => this.metricObservation(item));
    validateImportStatus(input.status, observations);
    const now = this.clock().toISOString();
    const record: PerformanceImport = {
      id: this.createId(),
      workspaceId,
      calendarEntryId: input.calendarEntryId,
      status: input.status,
      source: input.source.trim(),
      sourceClassification: input.sourceClassification,
      observations,
      importedAt: now,
      importedBy: input.importedBy.trim(),
      notes: input.notes.trim(),
    };
    return this.persist({ ...workspace, performanceImports: [...workspace.performanceImports, record], updatedAt: now });
  }

  async completeRetrospective(workspaceId: string, input: Readonly<{
    calendarEntryId: string;
    completedBy: string;
    summary: string;
    learnings: readonly string[];
    decision: RetrospectiveDecision;
    attributionModel: AttributionModel;
    attributionUncertainty: string;
    evidenceReferences: readonly string[];
    reversibleNextAction: string;
    icpConfidenceEffect: ConfidenceEffect;
    icpConfidenceRationale: string;
    positioningEffect: string;
    learningChange: string;
    learningOutcome: string;
    learningFollowUp: string;
  }>): Promise<ActivationLearningWorkspace> {
    requireText(input.completedBy, "Retrospective owner");
    requireText(input.summary, "Retrospective summary");
    requireText(input.attributionUncertainty, "Attribution uncertainty");
    requireText(input.reversibleNextAction, "Reversible next action");
    requireText(input.icpConfidenceRationale, "ICP confidence rationale");
    requireText(input.positioningEffect, "Positioning effect");
    requireText(input.learningChange, "Learning-ledger change");
    requireText(input.learningOutcome, "Learning-ledger outcome");
    requireText(input.learningFollowUp, "Learning-ledger follow-up");
    if (input.learnings.length === 0 || input.evidenceReferences.length === 0) {
      throw new Error("Retrospective requires learnings and evidence references");
    }
    rejectSecrets([
      input.completedBy, input.summary, input.attributionUncertainty, input.reversibleNextAction, input.icpConfidenceRationale,
      input.positioningEffect, input.learningChange, input.learningOutcome, input.learningFollowUp, ...input.learnings, ...input.evidenceReferences,
    ]);
    const workspace = await this.load(workspaceId);
    const entry = required(workspace.calendarEntries, input.calendarEntryId, "Calendar entry");
    if (workspace.retrospectives.some((item) => item.calendarEntryId === entry.id)) throw new Error("Retrospective already exists for this calendar entry");
    const plan = workspace.measurementPlans.find((item) => item.calendarEntryId === entry.id);
    if (!plan) throw new Error("Retrospective requires a pre-recorded measurement plan and baseline");
    const outcomes = workspace.deliveryOutcomes.filter((item) => item.calendarEntryId === entry.id);
    if (entry.kind === "external_activation" && outcomes.length === 0) throw new Error("External-action retrospective requires delivery or failure evidence");
    const imports = workspace.performanceImports.filter((item) => item.calendarEntryId === entry.id);
    if (imports.length === 0) throw new Error("Retrospective requires a performance import, including explicit unavailable evidence when metrics are missing");
    const comparisons = compareMetrics(plan.baseline, latestObservations(imports));
    const now = this.clock().toISOString();
    const retrospectiveId = this.createId();
    const retrospective: Retrospective = {
      id: retrospectiveId,
      workspaceId,
      calendarEntryId: entry.id,
      completedAt: now,
      completedBy: input.completedBy.trim(),
      summary: input.summary.trim(),
      learnings: clean(input.learnings),
      decision: input.decision,
      attributionModel: input.attributionModel,
      attributionUncertainty: input.attributionUncertainty.trim(),
      evidenceReferences: clean(input.evidenceReferences),
      comparisons,
      reversibleNextAction: input.reversibleNextAction.trim(),
      icpConfidenceEffect: input.icpConfidenceEffect,
      icpConfidenceRationale: input.icpConfidenceRationale.trim(),
      positioningEffect: input.positioningEffect.trim(),
    };
    const evidence = unique([
      ...input.evidenceReferences,
      ...outcomes.flatMap((item) => item.evidenceReferences),
      ...imports.flatMap((item) => item.observations.map((observation) => observation.evidenceReference)),
    ]);
    const learning: LearningLedgerEntry = {
      id: this.createId(),
      workspaceId,
      retrospectiveId,
      calendarEntryId: entry.id,
      createdAt: now,
      createdBy: input.completedBy.trim(),
      evidence,
      decision: `${input.decision}: ${input.summary.trim()}`,
      change: input.learningChange.trim(),
      outcome: input.learningOutcome.trim(),
      followUp: input.learningFollowUp.trim(),
      reversibleNextAction: input.reversibleNextAction.trim(),
      attributionModel: input.attributionModel,
      attributionUncertainty: input.attributionUncertainty.trim(),
    };
    return this.persist({
      ...workspace,
      retrospectives: [...workspace.retrospectives, retrospective],
      learningLedger: [...workspace.learningLedger, learning],
      updatedAt: now,
    });
  }

  async detectAuthorityImpact(workspaceId: string): Promise<ActivationLearningWorkspace> {
    const workspace = await this.load(workspaceId);
    const now = this.clock().toISOString();
    const invalidated = new Set<string>();
    const entries: CalendarEntry[] = [];
    for (const entry of workspace.calendarEntries) {
      if (entry.kind !== "external_activation" || !entry.source || !entry.destinationId) {
        entries.push(entry);
        continue;
      }
      const destination = workspace.destinations.find((item) => item.id === entry.destinationId);
      try {
        if (!destination || destination.status !== "active") throw new Error("Destination unavailable");
        const current = await this.resolveSource(workspaceId, entry.source.kind, entry.source.sourceId, destination.channel);
        if (!sameSource(entry.source, current)) throw new Error("Source authority changed");
        entries.push(entry);
      } catch {
        if (["scheduled", "in_review"].includes(entry.scheduleStatus)) invalidated.add(entry.id);
        entries.push(["scheduled", "in_review"].includes(entry.scheduleStatus) ? {
          ...entry,
          scheduleStatus: "approval_invalidated",
          activationStatus: entry.activationStatus === "delivered" ? "delivered" : "not_ready",
          reviewNote: "Source or destination authority changed",
          updatedAt: now,
        } : entry);
      }
    }
    const packages = workspace.packages.map((item) => invalidated.has(item.calendarEntryId) && item.status === "manual_export_ready"
      ? { ...item, status: "authority_invalidated" as const }
      : item);
    return this.persist({ ...workspace, calendarEntries: entries, packages, updatedAt: now });
  }

  private metricObservation(input: Omit<MetricObservation, "id">): MetricObservation {
    requireText(input.metric, "Metric name");
    requireText(input.source, "Metric source");
    requireText(input.evidenceReference, "Metric evidence reference");
    validateWindow(input.windowStartsAt, input.windowEndsAt, "Metric window");
    normalizedDate(input.capturedAt, "Metric capture time");
    rejectSecrets([input.metric, input.source, input.evidenceReference, input.unit ?? "", input.limitation ?? ""]);
    validateMetricState(input.state, input.value, input.limitation);
    return {
      id: this.createId(),
      metric: input.metric.trim(),
      state: input.state,
      windowStartsAt: normalizedDate(input.windowStartsAt, "Metric window start"),
      windowEndsAt: normalizedDate(input.windowEndsAt, "Metric window end"),
      capturedAt: normalizedDate(input.capturedAt, "Metric capture time"),
      source: input.source.trim(),
      evidenceReference: input.evidenceReference.trim(),
      ...(input.value !== undefined ? { value: input.value } : {}),
      ...(input.unit ? { unit: input.unit.trim() } : {}),
      ...(input.limitation ? { limitation: input.limitation.trim() } : {}),
    };
  }

  private async resolveSource(workspaceId: string, kind: ActivationSourceKind, sourceId: string, channel: DestinationChannel): Promise<ActivationSourceSnapshot> {
    const [product, campaignWorkspace] = await Promise.all([
      this.requiredProduct(workspaceId),
      this.campaignStore.load(workspaceId),
    ]);
    if (!campaignWorkspace) throw new Error("Campaign workspace not found");
    const capturedAt = this.clock().toISOString();
    if (kind === "campaign_variant") {
      const variant = required(campaignWorkspace.variants, sourceId, "Approved campaign variant");
      if (variant.status !== "approved" || variant.channel !== channel) throw new Error("Destination channel requires its approved campaign variant");
      const asset = required(campaignWorkspace.assets, variant.canonicalAssetId, "Approved canonical asset");
      const campaign = required(campaignWorkspace.campaigns, asset.campaignId, "Approved campaign");
      if (asset.status !== "approved" || campaign.status !== "approved") throw new Error("Campaign activation source authority is not approved");
      this.validateProductAuthority(product, asset.claimReferences, asset.evidenceIds, channel);
      return {
        kind,
        sourceId: variant.id,
        sourceVersion: variant.version,
        title: asset.title,
        audience: asset.audience,
        channel,
        campaignId: campaign.id,
        canonicalAssetId: asset.id,
        claimReferences: asset.claimReferences,
        evidenceIds: asset.evidenceIds,
        rights: asset.rights,
        accessibilityRequirements: asset.accessibilityRequirements,
        disclosureRequirements: asset.disclosureRequirements,
        body: variant.body,
        capturedAt,
      };
    }
    if (kind === "repository_launch") {
      const repositoryWorkspace = await this.repositoryStore.load(workspaceId);
      if (!repositoryWorkspace) throw new Error("Repository Growth workspace not found");
      const launch = required(repositoryWorkspace.launchRooms, sourceId, "Repository launch room");
      if (!["ready_for_manual_launch", "retrospective_complete"].includes(launch.status)) throw new Error("Repository launch room is not ready for activation");
      if (launch.checklist.some((item) => item.required && !item.complete)) throw new Error("Repository launch checklist is incomplete");
      const asset = required(campaignWorkspace.assets, launch.canonicalAssetId, "Approved launch asset");
      const campaign = required(campaignWorkspace.campaigns, launch.campaignId, "Approved launch campaign");
      const variant = campaignWorkspace.variants.find((item) => launch.variantIds.includes(item.id) && item.channel === channel && item.status === "approved");
      if (!variant || asset.status !== "approved" || campaign.status !== "approved") throw new Error("Repository launch requires a matching approved channel variant");
      this.validateProductAuthority(product, asset.claimReferences, asset.evidenceIds, channel);
      return {
        kind,
        sourceId: launch.id,
        sourceVersion: variant.version,
        title: launch.title,
        audience: launch.primaryAudience,
        channel,
        campaignId: campaign.id,
        canonicalAssetId: asset.id,
        claimReferences: asset.claimReferences,
        evidenceIds: asset.evidenceIds,
        rights: asset.rights,
        accessibilityRequirements: asset.accessibilityRequirements,
        disclosureRequirements: asset.disclosureRequirements,
        body: variant.body,
        repositoryId: launch.repositoryId,
        launchRoomId: launch.id,
        capturedAt,
      };
    }
    const videoWorkspace = await this.videoStore.load(workspaceId);
    if (!videoWorkspace) throw new Error("Video Production workspace not found");
    const platform = destinationToVideoPlatform(channel);
    const variant = required(videoWorkspace.variants, sourceId, "Approved video platform variant");
    if (variant.status !== "approved" || variant.platform !== platform) throw new Error("Destination channel requires its approved video platform variant");
    const artifact = required(videoWorkspace.artifacts, variant.artifactId, "Approved video artifact");
    const brief = required(videoWorkspace.briefs, artifact.briefId, "Approved video brief");
    if (artifact.reviewStatus !== "approved" || brief.status !== "approved") throw new Error("Video activation source is not approved");
    const asset = required(campaignWorkspace.assets, brief.sourceAssetId, "Approved source script");
    const campaign = required(campaignWorkspace.campaigns, brief.campaignId, "Approved video campaign");
    if (asset.status !== "approved" || campaign.status !== "approved" || asset.versions.length !== brief.sourceAssetVersion) {
      throw new Error("Video campaign or source-script authority changed");
    }
    this.validateProductAuthority(product, brief.claimReferences, brief.evidenceIds, channel);
    for (const sourceAsset of brief.sourceAssets) {
      if (sourceAsset.consentStatus === "missing") throw new Error("Video source asset consent is missing");
      if (sourceAsset.expiresAt && Date.parse(sourceAsset.expiresAt) <= this.clock().getTime()) throw new Error("Video source asset rights expired");
    }
    const file = required(artifact.files, variant.fileId, "Approved video file");
    return {
      kind,
      sourceId: variant.id,
      sourceVersion: brief.sourceAssetVersion,
      title: brief.title,
      audience: brief.audience,
      channel,
      campaignId: campaign.id,
      canonicalAssetId: asset.id,
      claimReferences: brief.claimReferences,
      evidenceIds: brief.evidenceIds,
      rights: brief.sourceAssets.map((item) => `${item.label}: ${item.rightsBasis}`),
      accessibilityRequirements: unique([
        ...brief.accessibilityRequirements,
        ...variant.accessibilityNotes,
        ...(variant.captionFileId ? ["Approved caption file required"] : []),
      ]),
      disclosureRequirements: variant.disclosureRequirements,
      fileReference: file.path,
      videoArtifactId: artifact.id,
      capturedAt,
    };
  }

  private validateProductAuthority(product: ProductWorkspace, references: readonly ClaimReference[], evidenceIds: readonly string[], channel: DestinationChannel): void {
    if (references.length === 0 || evidenceIds.length === 0) throw new Error("Activation source requires approved Product Core claims and reviewed evidence");
    const reviewed = new Set(product.evidence.filter(isReviewedEvidence).map((item) => item.id));
    if (evidenceIds.some((id) => !reviewed.has(id))) throw new Error("Activation source Product Core evidence is no longer reviewed");
    for (const reference of references) {
      const claim = product.claims.find((item) => item.id === reference.claimId);
      if (!claim || claim.status !== "approved" || claim.revision !== reference.claimRevision || claim.statement !== reference.statement) {
        throw new Error("Activation source Product Core claim authority changed");
      }
      if (claim.prohibitedContexts.includes(channel)) throw new Error("A Product Core claim is prohibited for the destination channel");
      if (reference.evidenceIds.some((id) => !evidenceIds.includes(id))) throw new Error("Activation source is missing claim evidence");
    }
  }

  private async requiredProduct(workspaceId: string): Promise<ProductWorkspace> {
    const product = await this.productStore.load(workspaceId);
    if (!product) throw new Error("Product workspace not found");
    return product;
  }

  private async changeExportOperation(workspaceId: string, operationId: string, change: (record: ExportOperation) => ExportOperation): Promise<ActivationLearningWorkspace> {
    const workspace = await this.load(workspaceId);
    if (!workspace.exportOperations.some((item) => item.id === operationId)) throw new Error("Export operation not found");
    const updated = { ...workspace, exportOperations: workspace.exportOperations.map((item) => item.id === operationId ? change(item) : item), updatedAt: this.clock().toISOString() };
    return this.persist(updated);
  }

  private async persist(workspace: ActivationLearningWorkspace): Promise<ActivationLearningWorkspace> {
    await this.store.save(workspace);
    return workspace;
  }
}

function emptyWorkspace(workspaceId: string, now: string): ActivationLearningWorkspace {
  return {
    workspaceId,
    destinations: [],
    calendarEntries: [],
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

function requireExternalEntry(entry: CalendarEntry): asserts entry is CalendarEntry & Required<Pick<CalendarEntry, "destinationId" | "source">> {
  if (entry.kind !== "external_activation" || !entry.destinationId || !entry.source) throw new Error("Calendar entry is not an external action");
}

function requireText(value: string, label: string): void {
  if (!value.trim()) throw new Error(`${label} is required`);
}

function clean(values: readonly string[]): readonly string[] {
  return values.map((value) => value.trim()).filter(Boolean);
}

function unique<T>(values: readonly T[]): readonly T[] {
  return [...new Set(values)];
}

function required<T extends { id: string }>(values: readonly T[], id: string, label: string): T {
  const value = values.find((item) => item.id === id);
  if (!value) throw new Error(`${label} not found`);
  return value;
}

function normalizedDate(value: string, label: string): string {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) throw new Error(`${label} must be a valid date and time`);
  return new Date(timestamp).toISOString();
}

function validateWindow(startsAt: string, endsAt: string | undefined, label: string): void {
  const start = Date.parse(startsAt);
  if (!Number.isFinite(start)) throw new Error(`${label} start must be a valid date and time`);
  if (endsAt === undefined) return;
  const end = Date.parse(endsAt);
  if (!Number.isFinite(end) || end <= start) throw new Error(`${label} end must be after its start`);
}

function validateDeliveryEvidence(input: Readonly<{
  status: DeliveryStatus;
  evidenceClassification: DeliveryEvidenceClassification;
  evidenceReferences: readonly string[];
  deliveryUrl?: string;
  publicationId?: string;
  providerResponseId?: string;
  failureClass?: string;
  failureDetail?: string;
}>): void {
  if (input.status === "delivered" && !input.deliveryUrl && !input.publicationId && !input.providerResponseId) {
    throw new Error("Delivered outcome requires a delivery URL, publication identifier, or provider response identifier");
  }
  if (input.status === "failed" && (!input.failureClass || !input.failureDetail)) {
    throw new Error("Failed outcome requires failure class and detail");
  }
  if (input.evidenceClassification === "provider_verified" && !input.providerResponseId) {
    throw new Error("Provider-verified outcome requires a provider response identifier");
  }
  if (input.evidenceClassification !== "human_recorded" && input.evidenceReferences.length === 0) {
    throw new Error("Provider evidence requires evidence references");
  }
}

function validateMetricState(state: MetricEvidenceState, value: number | undefined, limitation: string | undefined): void {
  if (state === "observed") {
    if (value === undefined || !Number.isFinite(value) || value === 0) throw new Error("Observed metric requires a finite non-zero value; use verified_zero for an evidenced zero");
    return;
  }
  if (state === "verified_zero") {
    if (value !== 0) throw new Error("Verified-zero metric requires value 0");
    return;
  }
  if (state === "partial") {
    if (!limitation?.trim()) throw new Error("Partial metric requires a limitation");
    if (value !== undefined && !Number.isFinite(value)) throw new Error("Partial metric value must be finite when present");
    return;
  }
  if (value !== undefined) throw new Error(`${state} metric cannot include a numeric value`);
  if (!limitation?.trim()) throw new Error(`${state} metric requires a limitation`);
}

function validateImportStatus(status: PerformanceImportStatus, observations: readonly MetricObservation[]): void {
  const states = new Set(observations.map((item) => item.state));
  if (status === "complete" && [...states].some((state) => !["observed", "verified_zero"].includes(state))) {
    throw new Error("Complete performance import may contain only observed or verified-zero metrics");
  }
  if (status === "delayed" && !states.has("delayed")) throw new Error("Delayed import requires a delayed metric state");
  if (status === "unavailable" && [...states].some((state) => !["unavailable", "not_collected"].includes(state))) {
    throw new Error("Unavailable import may contain only unavailable or not-collected metric states");
  }
  if (status === "partial" && ![...states].some((state) => ["partial", "delayed", "unavailable", "not_collected"].includes(state))) {
    throw new Error("Partial import requires at least one incomplete metric state");
  }
}

function latestObservations(imports: readonly PerformanceImport[]): readonly MetricObservation[] {
  const latest = new Map<string, MetricObservation>();
  for (const record of imports) {
    for (const observation of record.observations) {
      const current = latest.get(observation.metric);
      if (!current || Date.parse(observation.capturedAt) >= Date.parse(current.capturedAt)) latest.set(observation.metric, observation);
    }
  }
  return [...latest.values()];
}

function compareMetrics(baseline: readonly MetricObservation[], outcomes: readonly MetricObservation[]): readonly MetricComparison[] {
  const byMetric = new Map(outcomes.map((item) => [item.metric, item]));
  return baseline.map((base) => {
    const outcome = byMetric.get(base.metric);
    if (!outcome) return { metric: base.metric, baselineState: base.state, outcomeState: "not_collected", limitation: "No outcome observation was imported" };
    const numeric = ["observed", "verified_zero"];
    if (numeric.includes(base.state) && numeric.includes(outcome.state) && base.value !== undefined && outcome.value !== undefined) {
      return {
        metric: base.metric,
        baselineState: base.state,
        outcomeState: outcome.state,
        baselineValue: base.value,
        outcomeValue: outcome.value,
        delta: outcome.value - base.value,
      };
    }
    return {
      metric: base.metric,
      baselineState: base.state,
      outcomeState: outcome.state,
      ...(base.value !== undefined ? { baselineValue: base.value } : {}),
      ...(outcome.value !== undefined ? { outcomeValue: outcome.value } : {}),
      limitation: outcome.limitation ?? "Metric states are not compatible for a numeric comparison",
    };
  });
}

function sameSource(left: ActivationSourceSnapshot, right: ActivationSourceSnapshot): boolean {
  const normalize = (value: ActivationSourceSnapshot): string => JSON.stringify({ ...value, capturedAt: "" });
  return normalize(left) === normalize(right);
}

function destinationToVideoPlatform(channel: DestinationChannel): VideoPlatform {
  if (["linkedin", "website", "instagram_reels", "youtube_shorts"].includes(channel)) return channel as VideoPlatform;
  throw new Error("Destination channel is not supported by a video platform variant");
}

const secretPatterns: readonly RegExp[] = [
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/i,
  /\bBearer\s+[A-Za-z0-9._~+/=-]{8,}/i,
  /\b(?:api[_-]?key|access[_-]?token|client[_-]?secret|password)\s*[:=]\s*\S+/i,
  /\b(?:sk|ghp|github_pat)_[A-Za-z0-9_-]{8,}/i,
];

function rejectSecrets(values: readonly string[]): void {
  if (values.some((value) => secretPatterns.some((pattern) => pattern.test(value)))) {
    throw new Error("Credentials and secret material are prohibited in Calendar, activation, outcome, metric, and learning records");
  }
}
