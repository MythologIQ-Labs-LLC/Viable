import type { ActivationLearningWorkspace } from "../activation-learning/domain/activation-learning.js";
import type { CampaignWorkspace } from "../campaigns/domain/campaign.js";
import type { ProductWorkspace } from "../product-core/domain/workspace.js";
import type { RepositoryGrowthWorkspace } from "../repository-growth/domain/repository-growth.js";
import type { SignalsInbox } from "../signals/domain/signal.js";
import type { VideoProductionWorkspace } from "../video-production/domain/video-production.js";

export type HomeAttentionCategory = "recovery" | "review" | "blocked" | "action" | "scheduled" | "learning";
export type HomeAttentionSurface = "product" | "signals" | "campaigns" | "studio" | "repository_growth" | "calendar" | "analytics";
export type HomeAttentionSource = "product" | "signals" | "campaigns" | "repository_growth" | "video" | "activation";

export type HomeAttentionTarget = Readonly<{
  surface: HomeAttentionSurface;
  recordKind: string;
  recordId?: string;
}>;

export type HomeAttentionItem = Readonly<{
  id: string;
  category: HomeAttentionCategory;
  surface: HomeAttentionSurface;
  title: string;
  reason: string;
  state: string;
  owner?: string;
  timestamp?: string;
  evidence: readonly string[];
  target: HomeAttentionTarget;
}>;

export type HomeAttentionSourceFailure = Readonly<{
  source: HomeAttentionSource;
  detail: string;
}>;

export type HomeAttentionInput = Readonly<{
  product?: ProductWorkspace;
  signals?: SignalsInbox;
  campaigns?: CampaignWorkspace;
  repositoryGrowth?: RepositoryGrowthWorkspace;
  video?: VideoProductionWorkspace;
  activation?: ActivationLearningWorkspace;
  sourceFailures?: readonly HomeAttentionSourceFailure[];
}>;

export type HomeAttentionSnapshot = Readonly<{
  items: readonly HomeAttentionItem[];
  sourceFailures: readonly HomeAttentionSourceFailure[];
  partial: boolean;
}>;

const categoryOrder: Record<HomeAttentionCategory, number> = {
  recovery: 0,
  review: 1,
  blocked: 2,
  action: 3,
  scheduled: 4,
  learning: 5,
};

const surfaceOrder: Record<HomeAttentionSurface, number> = {
  product: 0,
  signals: 1,
  campaigns: 2,
  studio: 3,
  repository_growth: 4,
  calendar: 5,
  analytics: 6,
};

export function deriveHomeAttention(input: HomeAttentionInput, now = new Date()): HomeAttentionSnapshot {
  const items: HomeAttentionItem[] = [];
  if (input.product) addProductAttention(items, input.product, now);
  if (input.signals) addSignalsAttention(items, input.signals);
  if (input.campaigns) addCampaignAttention(items, input.campaigns);
  if (input.repositoryGrowth) addRepositoryAttention(items, input.repositoryGrowth, now);
  if (input.video) addVideoAttention(items, input.video);
  if (input.activation) addActivationAttention(items, input.activation, now);
  items.sort(compareAttention);
  const sourceFailures = [...(input.sourceFailures ?? [])].sort((left, right) => left.source.localeCompare(right.source));
  return { items, sourceFailures, partial: sourceFailures.length > 0 };
}

function addProductAttention(items: HomeAttentionItem[], workspace: ProductWorkspace, now: Date): void {
  for (const evidence of workspace.evidence) {
    if (evidence.reviewStatus === "rejected" || Date.parse(evidence.freshnessReviewAt) > now.getTime()) continue;
    items.push(item({
      id: `product:evidence:${evidence.id}`,
      category: "blocked",
      surface: "product",
      title: `Recheck stale evidence: ${evidence.title}`,
      reason: "This evidence reached its recorded freshness-review date. Recheck it before relying on dependent product or ICP conclusions.",
      state: "stale evidence",
      timestamp: evidence.freshnessReviewAt,
      evidence: [evidence.summary],
      target: { surface: "product", recordKind: "evidence", recordId: evidence.id },
    }));
  }

  const selected = workspace.icpHypotheses.find((candidate) => candidate.status === "selected");
  if (selected && selected.reviewStatus !== "reviewed") {
    items.push(item({
      id: `product:icp:${selected.id}:review`,
      category: "blocked",
      surface: "product",
      title: `Re-review primary ICP: ${selected.name}`,
      reason: "The selected ICP no longer carries reviewed authority, so dependent campaign and assessment work should not advance until it is reconsidered.",
      state: selected.reviewStatus,
      owner: selected.owner,
      timestamp: selected.lastReviewedAt,
      evidence: selected.contradictions,
      target: { surface: "product", recordKind: "icp", recordId: selected.id },
    }));
  }

  for (const hypothesis of workspace.icpHypotheses) {
    for (const experiment of hypothesis.experiments) {
      if (experiment.status !== "active") continue;
      items.push(item({
        id: `product:experiment:${experiment.id}`,
        category: "action",
        surface: "product",
        title: `Continue ICP validation: ${experiment.hypothesis}`,
        reason: "This validation experiment is active and retains an explicit observation window and decision criteria.",
        state: experiment.status,
        owner: experiment.owner,
        timestamp: experiment.observationEndsAt,
        evidence: [...experiment.successCriteria, ...experiment.failureCriteria],
        target: { surface: "product", recordKind: "icp_experiment", recordId: hypothesis.id },
      }));
    }
  }

  for (const action of workspace.actions) {
    if (action.status !== "open" && action.status !== "in_progress") continue;
    items.push(item({
      id: `product:action:${action.id}`,
      category: "action",
      surface: "product",
      title: action.title,
      reason: action.status === "in_progress"
        ? "Product Core records this owned readiness action as already in progress."
        : "Product Core records this readiness action as open and owned.",
      state: action.status,
      owner: action.owner,
      timestamp: action.dueAt ?? action.startedAt,
      evidence: action.verification ? [action.verification] : [],
      target: { surface: "product", recordKind: "readiness_action", recordId: action.id },
    }));
  }

  if (!workspace.product.positioning?.trim()) {
    items.push(item({
      id: "product:prerequisite:truth",
      category: "action",
      surface: "product",
      title: "Complete product truth",
      reason: "Product positioning is still empty, so downstream marketability work lacks a complete Product Core premise.",
      state: "prerequisite",
      evidence: [`Product Truth revision ${workspace.product.revision}`],
      target: { surface: "product", recordKind: "product_truth" },
    }));
  } else if (workspace.icpHypotheses.length < 2) {
    items.push(item({
      id: "product:prerequisite:icp-options",
      category: "action",
      surface: "product",
      title: "Create another ICP hypothesis",
      reason: "Product truth is present, but the workspace does not yet have two ICP candidates to compare.",
      state: "prerequisite",
      evidence: [`${workspace.icpHypotheses.length} ICP hypotheses recorded`],
      target: { surface: "product", recordKind: "icp_prerequisite" },
    }));
  } else if (!selected) {
    items.push(item({
      id: "product:prerequisite:select-icp",
      category: "review",
      surface: "product",
      title: "Review evidence and select a primary ICP",
      reason: "Multiple ICP hypotheses exist, but none is currently selected as reviewed primary authority.",
      state: "review required",
      evidence: workspace.icpHypotheses.map((candidate) => candidate.name),
      target: { surface: "product", recordKind: "icp_prerequisite" },
    }));
  } else if (workspace.assessments.length === 0) {
    items.push(item({
      id: "product:prerequisite:assessment",
      category: "action",
      surface: "product",
      title: "Run the marketability assessment",
      reason: "Product truth and a primary ICP exist, but the workspace has no marketability assessment yet.",
      state: "prerequisite",
      evidence: [`Primary ICP: ${selected.name}`],
      target: { surface: "product", recordKind: "assessment_prerequisite" },
    }));
  }
}

function addSignalsAttention(items: HomeAttentionItem[], inbox: SignalsInbox): void {
  for (const health of inbox.sourceHealth) {
    if (health.status === "success" || health.status === "verified_empty") continue;
    items.push(item({
      id: `signals:source:${health.sourceId}`,
      category: "recovery",
      surface: "signals",
      title: `Check Signals source: ${health.sourceId}`,
      reason: "This source did not complete as successful or verified-empty. Other successful evidence remains usable, but this source needs explicit recovery or review.",
      state: health.status,
      timestamp: health.checkedAt,
      evidence: health.detail ? [health.detail] : [],
      target: { surface: "signals", recordKind: "source_health", recordId: health.sourceId },
    }));
  }

  for (const conversion of inbox.conversions) {
    if (conversion.status !== "materialization_failed") continue;
    items.push(item({
      id: `signals:conversion:${conversion.id}:failed`,
      category: "recovery",
      surface: "signals",
      title: `Recover failed work materialization: ${conversion.title}`,
      reason: "Reviewed Signal work failed while entering its owning workflow. The proposal remains visible and retryable rather than pretending the destination exists.",
      state: conversion.status,
      owner: conversion.owner,
      timestamp: conversion.materializationFailure?.attemptedAt ?? conversion.createdAt,
      evidence: conversion.materializationFailure?.detail ? [conversion.materializationFailure.detail] : [],
      target: { surface: "signals", recordKind: "conversion", recordId: conversion.id },
    }));
  }

  for (const signal of inbox.signals) {
    if (signal.status !== "new" || signal.evidenceState !== "suggested") continue;
    items.push(item({
      id: `signals:signal:${signal.id}:review`,
      category: "review",
      surface: "signals",
      title: `Review signal: ${signal.title}`,
      reason: "Imported evidence is still a suggestion. Named review is required before it can become accepted evidence or proposed work.",
      state: signal.evidenceState,
      owner: signal.owner,
      timestamp: signal.observedAt ?? signal.provenance.retrievedAt,
      evidence: [signal.summary, ...signal.limitations],
      target: { surface: "signals", recordKind: "signal", recordId: signal.id },
    }));
  }
}

function addCampaignAttention(items: HomeAttentionItem[], workspace: CampaignWorkspace): void {
  for (const campaign of workspace.campaigns) {
    addGovernedReview(items, {
      id: `campaign:campaign:${campaign.id}`,
      surface: "campaigns",
      recordKind: "campaign",
      recordId: campaign.id,
      title: campaign.title,
      owner: campaign.owner,
      status: campaign.status,
      timestamp: campaign.updatedAt,
      reviewNote: campaign.reviewNote,
    });
  }
  for (const brief of workspace.contentBriefs ?? []) {
    addGovernedReview(items, {
      id: `campaign:content:${brief.id}`,
      surface: "campaigns",
      recordKind: "content_brief",
      recordId: brief.id,
      title: brief.title,
      owner: brief.owner,
      status: brief.status,
      timestamp: brief.updatedAt,
      reviewNote: brief.reviewNote,
    });
  }
  for (const asset of workspace.assets) {
    addGovernedReview(items, {
      id: `campaign:asset:${asset.id}`,
      surface: "studio",
      recordKind: "canonical_asset",
      recordId: asset.id,
      title: asset.title,
      owner: asset.owner,
      status: asset.status,
      timestamp: asset.updatedAt,
      reviewNote: asset.reviewNote,
    });
  }
  for (const variant of workspace.variants) {
    addGovernedReview(items, {
      id: `campaign:variant:${variant.id}`,
      surface: "studio",
      recordKind: "channel_variant",
      recordId: variant.id,
      title: `${variant.channel.replaceAll("_", " ")} variant`,
      status: variant.status,
      timestamp: variant.updatedAt,
      reviewNote: variant.reviewNote,
    });
  }
}

function addRepositoryAttention(items: HomeAttentionItem[], workspace: RepositoryGrowthWorkspace, now: Date): void {
  for (const repository of workspace.repositories) {
    if (repository.importStatus !== "partial") continue;
    items.push(item({
      id: `repository:${repository.id}:partial`,
      category: "blocked",
      surface: "repository_growth",
      title: `Review partial repository evidence: ${repository.fullName}`,
      reason: "The repository import preserved usable public evidence but one or more secondary checks were unavailable. Missing evidence is not a verified zero.",
      state: repository.importStatus,
      timestamp: repository.importedAt,
      evidence: repository.limitations,
      target: { surface: "repository_growth", recordKind: "repository", recordId: repository.id },
    }));
  }

  for (const plan of workspace.plans) {
    for (const action of plan.actions) {
      if (action.status !== "open" && action.status !== "in_progress") continue;
      items.push(item({
        id: `repository:action:${action.id}`,
        category: "action",
        surface: "repository_growth",
        title: action.title,
        reason: action.status === "in_progress"
          ? "Repository Growth records this finding-backed action as in progress."
          : "Repository Growth records this finding-backed action as open.",
        state: action.status,
        owner: action.owner,
        evidence: [action.verification, `${action.impact} impact · ${action.effort} effort`],
        target: { surface: "repository_growth", recordKind: "growth_action", recordId: action.id },
      }));
    }
  }

  for (const room of workspace.launchRooms) {
    const retrospective = workspace.retrospectives.find((candidate) => candidate.launchRoomId === room.id);
    const exported = workspace.exports.some((candidate) => candidate.launchRoomId === room.id);
    if (room.status === "draft" && room.checklist.some((entry) => entry.required && !entry.complete)) {
      items.push(item({
        id: `repository:launch:${room.id}:blocked`,
        category: "blocked",
        surface: "repository_growth",
        title: `Finish launch checklist: ${room.title}`,
        reason: "This launch room still has required checklist evidence open, so manual launch export remains intentionally blocked.",
        state: room.status,
        timestamp: room.observationStartsAt,
        evidence: room.checklist.filter((entry) => entry.required && !entry.complete).map((entry) => entry.label),
        target: { surface: "repository_growth", recordKind: "launch_room", recordId: room.id },
      }));
    }
    if (room.status === "ready_for_manual_launch" && !exported) {
      items.push(item({
        id: `repository:launch:${room.id}:export`,
        category: "action",
        surface: "repository_growth",
        title: `Prepare manual repository launch: ${room.title}`,
        reason: "The launch room is ready, but no manual launch package has been created yet.",
        state: room.status,
        timestamp: room.observationStartsAt,
        evidence: room.checklist.filter((entry) => entry.complete).map((entry) => entry.evidence ?? entry.label),
        target: { surface: "repository_growth", recordKind: "launch_room", recordId: room.id },
      }));
    }
    if (!retrospective && Date.parse(room.retrospectiveAt) <= now.getTime() && room.status !== "draft") {
      items.push(item({
        id: `repository:launch:${room.id}:retrospective`,
        category: "learning",
        surface: "repository_growth",
        title: `Complete repository launch retrospective: ${room.title}`,
        reason: "The recorded retrospective time has arrived, but this launch room has no retained outcome comparison and learning record yet.",
        state: "learning due",
        timestamp: room.retrospectiveAt,
        evidence: [`Observation window ended ${room.observationEndsAt}`],
        target: { surface: "repository_growth", recordKind: "launch_room", recordId: room.id },
      }));
    }
  }
}

function addVideoAttention(items: HomeAttentionItem[], workspace: VideoProductionWorkspace): void {
  for (const brief of workspace.briefs) {
    addGovernedReview(items, {
      id: `video:brief:${brief.id}`,
      surface: "studio",
      recordKind: "video_brief",
      recordId: brief.id,
      title: brief.title,
      owner: brief.owner,
      status: brief.status,
      timestamp: brief.updatedAt,
      reviewNote: brief.reviewNote,
    });
    if (brief.status === "approved" && !workspace.packages.some((candidate) => candidate.briefId === brief.id)) {
      items.push(item({
        id: `video:brief:${brief.id}:package`,
        category: "action",
        surface: "studio",
        title: `Prepare video production package: ${brief.title}`,
        reason: "The video brief is approved, but no manual production package exists yet. Production remains external to Viable.",
        state: "approved",
        owner: brief.owner,
        timestamp: brief.updatedAt,
        evidence: [`${brief.platforms.length} platform target(s)`, `${brief.aspectRatios.length} aspect ratio target(s)`],
        target: { surface: "studio", recordKind: "video_brief", recordId: brief.id },
      }));
    }
  }

  for (const artifact of workspace.artifacts) {
    if (artifact.renderStatus === "failed") {
      items.push(item({
        id: `video:artifact:${artifact.id}:failed`,
        category: "recovery",
        surface: "studio",
        title: `Review failed video run: ${artifact.runCorrelationId}`,
        reason: "The separately produced run was imported as failed. Failure evidence remains visible and the artifact cannot be approved as a completed render.",
        state: artifact.renderStatus,
        timestamp: artifact.importedAt,
        evidence: [artifact.failureClass, artifact.failureDetail].filter((value): value is string => Boolean(value)),
        target: { surface: "studio", recordKind: "video_artifact", recordId: artifact.id },
      }));
    } else if (artifact.renderStatus === "partial") {
      items.push(item({
        id: `video:artifact:${artifact.id}:partial`,
        category: "blocked",
        surface: "studio",
        title: `Inspect partial video run: ${artifact.runCorrelationId}`,
        reason: "The imported run is partial, so review should resolve what is usable before downstream platform variants advance.",
        state: artifact.renderStatus,
        timestamp: artifact.importedAt,
        evidence: artifact.stages.filter((stage) => stage.status !== "completed").map((stage) => `${stage.stage}: ${stage.detail}`),
        target: { surface: "studio", recordKind: "video_artifact", recordId: artifact.id },
      }));
    }
    addGovernedReview(items, {
      id: `video:artifact:${artifact.id}:review`,
      surface: "studio",
      recordKind: "video_artifact",
      recordId: artifact.id,
      title: `Video run ${artifact.runCorrelationId}`,
      status: artifact.reviewStatus,
      timestamp: artifact.importedAt,
      reviewNote: artifact.reviewNote,
    });
  }

  for (const variant of workspace.variants) {
    addGovernedReview(items, {
      id: `video:variant:${variant.id}`,
      surface: "studio",
      recordKind: "video_variant",
      recordId: variant.id,
      title: `${variant.platform.replaceAll("_", " ")} video variant`,
      status: variant.status,
      timestamp: variant.updatedAt,
      reviewNote: variant.reviewNote,
    });
  }
}

function addActivationAttention(items: HomeAttentionItem[], workspace: ActivationLearningWorkspace, now: Date): void {
  for (const operation of workspace.exportOperations) {
    if (operation.status !== "interrupted") continue;
    const packageRecord = workspace.packages.find((candidate) => candidate.id === operation.packageId);
    items.push(item({
      id: `activation:export:${operation.id}:interrupted`,
      category: "recovery",
      surface: "calendar",
      title: "Recover interrupted manual export",
      reason: "The export operation was explicitly interrupted. Delivery remains unproven and the package can be recovered without inventing an outcome.",
      state: operation.status,
      timestamp: operation.updatedAt,
      evidence: operation.interruptionDetail ? [operation.interruptionDetail] : [],
      target: { surface: "calendar", recordKind: "calendar_entry", recordId: packageRecord?.calendarEntryId },
    }));
  }

  for (const entry of workspace.calendarEntries) {
    if (entry.scheduleStatus === "in_review" || entry.scheduleStatus === "changes_requested" || entry.scheduleStatus === "approval_invalidated") {
      const category: HomeAttentionCategory = entry.scheduleStatus === "approval_invalidated" ? "blocked" : "review";
      items.push(item({
        id: `activation:entry:${entry.id}:${entry.scheduleStatus}`,
        category,
        surface: "calendar",
        title: `${entry.scheduleStatus === "changes_requested" ? "Correct" : entry.scheduleStatus === "in_review" ? "Review" : "Revalidate"} calendar work: ${entry.title}`,
        reason: entry.scheduleStatus === "approval_invalidated"
          ? "Previously accepted scheduling authority was invalidated by a source or destination change."
          : "This calendar record is waiting on an explicit scheduling review decision or correction.",
        state: entry.scheduleStatus,
        owner: entry.owner,
        timestamp: entry.startsAt,
        evidence: entry.reviewNote ? [entry.reviewNote] : [],
        target: { surface: "calendar", recordKind: "calendar_entry", recordId: entry.id },
      }));
    }

    if (entry.kind !== "external_activation" || entry.scheduleStatus !== "scheduled") continue;
    const packageRecord = workspace.packages.find((candidate) => candidate.calendarEntryId === entry.id && candidate.status === "manual_export_ready");
    if (!packageRecord) {
      items.push(item({
        id: `activation:entry:${entry.id}:package`,
        category: "action",
        surface: "calendar",
        title: `Prepare manual activation package: ${entry.title}`,
        reason: "The external action is scheduled and approved, but no credential-free manual activation package exists yet.",
        state: entry.activationStatus,
        owner: entry.owner,
        timestamp: entry.startsAt,
        evidence: entry.source ? [entry.source.title] : [],
        target: { surface: "calendar", recordKind: "calendar_entry", recordId: entry.id },
      }));
      continue;
    }
    const operation = workspace.exportOperations.find((candidate) => candidate.packageId === packageRecord.id);
    if (operation?.status === "ready_for_download") {
      items.push(item({
        id: `activation:entry:${entry.id}:download`,
        category: "scheduled",
        surface: "calendar",
        title: `Download manual activation package: ${entry.title}`,
        reason: "The package is ready for manual use. Downloading it still does not prove publication or delivery.",
        state: operation.status,
        owner: entry.owner,
        timestamp: entry.startsAt,
        evidence: [packageRecord.idempotencyKey],
        target: { surface: "calendar", recordKind: "calendar_entry", recordId: entry.id },
      }));
    }
    const outcome = workspace.deliveryOutcomes.find((candidate) => candidate.calendarEntryId === entry.id);
    if (operation?.status === "downloaded" && !outcome) {
      items.push(item({
        id: `activation:entry:${entry.id}:delivery-evidence`,
        category: "scheduled",
        surface: "calendar",
        title: `Record delivery or failure evidence: ${entry.title}`,
        reason: "The manual package was downloaded, but Viable has no evidence that the external action was delivered, failed, or cancelled.",
        state: "outcome unknown",
        owner: entry.owner,
        timestamp: entry.startsAt,
        evidence: [`Package downloaded ${operation.completedAt ?? operation.updatedAt}`],
        target: { surface: "calendar", recordKind: "calendar_entry", recordId: entry.id },
      }));
    }
  }

  for (const outcome of workspace.deliveryOutcomes) {
    if (outcome.status !== "failed") continue;
    items.push(item({
      id: `activation:delivery:${outcome.id}:failed`,
      category: "recovery",
      surface: "calendar",
      title: "Review failed external delivery",
      reason: "Delivery failure was explicitly recorded. Any retry should begin from the retained failure evidence rather than assuming publication occurred.",
      state: outcome.status,
      owner: outcome.recordedBy,
      timestamp: outcome.recordedAt,
      evidence: [outcome.failureClass, outcome.failureDetail, ...outcome.evidenceReferences].filter((value): value is string => Boolean(value)),
      target: { surface: "calendar", recordKind: "calendar_entry", recordId: outcome.calendarEntryId },
    }));
  }

  for (const performance of workspace.performanceImports) {
    if (performance.status === "failed") {
      items.push(item({
        id: `analytics:performance:${performance.id}:failed`,
        category: "recovery",
        surface: "analytics",
        title: "Recover failed performance evidence import",
        reason: "Performance evidence failed to import. Missing evidence remains missing and should not be interpreted as zero performance.",
        state: performance.status,
        owner: performance.importedBy,
        timestamp: performance.importedAt,
        evidence: performance.notes ? [performance.notes] : [],
        target: { surface: "analytics", recordKind: "performance_import", recordId: performance.id },
      }));
    } else if (performance.status === "partial" || performance.status === "delayed") {
      items.push(item({
        id: `analytics:performance:${performance.id}:${performance.status}`,
        category: "blocked",
        surface: "analytics",
        title: `${performance.status === "delayed" ? "Wait for or refresh" : "Review partial"} performance evidence`,
        reason: "The recorded evidence is not complete. Viable preserves the limitation instead of filling gaps with assumed values.",
        state: performance.status,
        owner: performance.importedBy,
        timestamp: performance.importedAt,
        evidence: performance.notes ? [performance.notes] : [],
        target: { surface: "analytics", recordKind: "performance_import", recordId: performance.id },
      }));
    }
  }

  for (const plan of workspace.measurementPlans) {
    if (Date.parse(plan.observationEndsAt) > now.getTime()) continue;
    if (workspace.performanceImports.some((candidate) => candidate.calendarEntryId === plan.calendarEntryId)) continue;
    items.push(item({
      id: `analytics:plan:${plan.id}:evidence-due`,
      category: "scheduled",
      surface: "analytics",
      title: "Collect outcome evidence for a completed observation window",
      reason: "The measurement window has ended and no performance import is recorded for this calendar entry yet.",
      state: "evidence due",
      owner: plan.createdBy,
      timestamp: plan.observationEndsAt,
      evidence: plan.baseline.map((metric) => `${metric.metric}: ${metric.state}`),
      target: { surface: "analytics", recordKind: "measurement_plan", recordId: plan.id },
    }));
  }

  for (const outcome of workspace.deliveryOutcomes) {
    if (outcome.status !== "delivered") continue;
    const hasPerformance = workspace.performanceImports.some((candidate) => candidate.calendarEntryId === outcome.calendarEntryId);
    const hasRetrospective = workspace.retrospectives.some((candidate) => candidate.calendarEntryId === outcome.calendarEntryId);
    if (hasPerformance && !hasRetrospective) {
      items.push(item({
        id: `analytics:entry:${outcome.calendarEntryId}:retrospective`,
        category: "learning",
        surface: "analytics",
        title: "Turn delivery evidence into a learning decision",
        reason: "Delivery and performance evidence exist, but no retrospective has recorded a decision, uncertainty, and reversible next action yet.",
        state: "retrospective due",
        owner: outcome.recordedBy,
        timestamp: outcome.recordedAt,
        evidence: outcome.evidenceReferences,
        target: { surface: "analytics", recordKind: "calendar_entry", recordId: outcome.calendarEntryId },
      }));
    }
  }

  const latestLearning = workspace.learningLedger.slice().sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt))[0];
  if (latestLearning) {
    items.push(item({
      id: `analytics:learning:${latestLearning.id}`,
      category: "learning",
      surface: "analytics",
      title: `Learning recorded: ${latestLearning.reversibleNextAction}`,
      reason: "This is the latest retained learning-ledger decision. It is evidence-backed context for the next reversible move, not an automatic instruction.",
      state: "learning recorded",
      owner: latestLearning.createdBy,
      timestamp: latestLearning.createdAt,
      evidence: latestLearning.evidence,
      target: { surface: "analytics", recordKind: "learning", recordId: latestLearning.id },
    }));
  }
}

function addGovernedReview(items: HomeAttentionItem[], value: Readonly<{
  id: string;
  surface: "campaigns" | "studio";
  recordKind: string;
  recordId: string;
  title: string;
  owner?: string;
  status: string;
  timestamp?: string;
  reviewNote?: string;
}>): void {
  if (value.status !== "in_review" && value.status !== "changes_requested" && value.status !== "approval_invalidated") return;
  const invalidated = value.status === "approval_invalidated";
  items.push(item({
    id: value.id,
    category: invalidated ? "blocked" : "review",
    surface: value.surface,
    title: `${value.status === "in_review" ? "Review" : value.status === "changes_requested" ? "Correct and resubmit" : "Revalidate"}: ${value.title}`,
    reason: invalidated
      ? "Previously approved authority was invalidated by a material upstream change. Named re-review is required before downstream use."
      : value.status === "changes_requested"
        ? "A named reviewer requested changes. Correct the owning record and resubmit it through the existing review path."
        : "This record is waiting for a named human review decision.",
    state: value.status,
    owner: value.owner,
    timestamp: value.timestamp,
    evidence: value.reviewNote ? [value.reviewNote] : [],
    target: { surface: value.surface, recordKind: value.recordKind, recordId: value.recordId },
  }));
}

function item(value: HomeAttentionItem): HomeAttentionItem {
  return value;
}

function compareAttention(left: HomeAttentionItem, right: HomeAttentionItem): number {
  const category = categoryOrder[left.category] - categoryOrder[right.category];
  if (category !== 0) return category;
  const leftTime = sortableTime(left.timestamp);
  const rightTime = sortableTime(right.timestamp);
  if (leftTime !== rightTime) return leftTime - rightTime;
  const surface = surfaceOrder[left.surface] - surfaceOrder[right.surface];
  if (surface !== 0) return surface;
  return left.id.localeCompare(right.id);
}

function sortableTime(value?: string): number {
  if (!value) return Number.MAX_SAFE_INTEGER;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : Number.MAX_SAFE_INTEGER;
}
