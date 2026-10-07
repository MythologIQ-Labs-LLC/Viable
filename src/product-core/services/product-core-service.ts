import type { MarketabilityAssessment, ReadinessAction, ReadinessFinding } from "../domain/assessment.js";
import type { ProductClaim } from "../domain/claim.js";
import { isReviewedEvidence, type EvidenceRecord } from "../domain/evidence.js";
import { ICP_DIMENSIONS, type IcpDimension, type IcpHypothesis, type IcpRevision, type ValidationExperiment } from "../domain/icp.js";
import type { ProductIdentity, ProductTruth } from "../domain/product.js";
import type { ProductWorkspace } from "../domain/workspace.js";
import type { ProductWorkspaceStore } from "../ports/product-workspace-store.js";

type Clock = () => Date;
type IdFactory = () => string;
type CreateReadinessAction = Readonly<{
  source: ReadinessAction["source"];
  sourceId: string;
  title: string;
  owner: string;
  dueAt?: string;
  kind: ReadinessAction["kind"];
  verification?: string;
}>;

export class ProductCoreService {
  constructor(
    private readonly store: ProductWorkspaceStore,
    private readonly clock: Clock = () => new Date(),
    private readonly createId: IdFactory = () => globalThis.crypto.randomUUID(),
  ) {}

  async createWorkspace(input: Readonly<{ identity: ProductIdentity; createdBy: string }>): Promise<ProductWorkspace> {
    if (!input.identity.name.trim() || !input.identity.description.trim()) throw new Error("Product name and description are required");
    if (!input.createdBy.trim()) throw new Error("A named workspace creator is required");
    const now = this.clock().toISOString();
    const product: ProductTruth = {
      identity: input.identity,
      capabilities: [], limitations: [], positioning: "", alternatives: [], differentiation: [],
      pricing: [], packaging: [], offers: [], callsToAction: [], brandVoice: [], terminology: {},
      accessibilityConstraints: [], revision: 1, updatedAt: now, updatedBy: input.createdBy,
    };
    const workspace: ProductWorkspace = {
      id: this.createId(), createdAt: now, createdBy: input.createdBy, product,
      claims: [], evidence: [], icpHypotheses: [], assessments: [], actions: [],
    };
    await this.store.save(workspace);
    return workspace;
  }

  async updateProductTruth(workspaceId: string, product: Omit<ProductTruth, "revision" | "updatedAt">): Promise<ProductWorkspace> {
    const workspace = await this.required(workspaceId);
    const updated: ProductWorkspace = {
      ...workspace,
      product: { ...product, revision: workspace.product.revision + 1, updatedAt: this.clock().toISOString() },
      icpHypotheses: workspace.icpHypotheses.map((hypothesis) =>
        hypothesis.status === "selected"
          ? { ...hypothesis, contradictions: [...hypothesis.contradictions, `Product truth changed to revision ${workspace.product.revision + 1}; ICP assumptions require review`] }
          : hypothesis,
      ),
    };
    return this.persist(updated);
  }

  async addEvidence(workspaceId: string, evidence: Omit<EvidenceRecord, "id">): Promise<ProductWorkspace> {
    const workspace = await this.required(workspaceId);
    const record: EvidenceRecord = { ...evidence, id: this.createId() };
    if (record.origin === "generated_suggestion" && record.reviewStatus === "reviewed") {
      throw new Error("Generated suggestions cannot be recorded as observed reviewed evidence");
    }
    return this.persist({ ...workspace, evidence: [...workspace.evidence, record] });
  }

  async reviewEvidence(workspaceId: string, evidenceId: string, reviewer: string, accepted: boolean): Promise<ProductWorkspace> {
    if (!reviewer.trim()) throw new Error("A named evidence reviewer is required");
    const workspace = await this.required(workspaceId);
    return this.persist({
      ...workspace,
      evidence: workspace.evidence.map((evidence) => evidence.id === evidenceId ? {
        ...evidence,
        reviewStatus: accepted && evidence.origin !== "generated_suggestion" ? "reviewed" : "rejected",
        reviewedBy: reviewer,
        reviewedAt: this.clock().toISOString(),
      } : evidence),
    });
  }

  /**
   * Records a named person's recheck of reviewed evidence, typically once it
   * reaches its freshness-review date. Confirming keeps it reviewed and sets
   * the next freshness-review date. Withdrawing marks it rejected, returns
   * approved claims that cite it to proposed review (as an edit would), and
   * records a contradiction on ICP hypotheses that rely on it; downstream
   * Campaign, activation, and video revalidation then refuse it as well.
   */
  async recheckEvidence(
    workspaceId: string,
    evidenceId: string,
    input: Readonly<{ reviewer: string; stillValid: boolean; nextFreshnessReviewAt?: string }>,
  ): Promise<ProductWorkspace> {
    if (!input.reviewer.trim()) throw new Error("A named evidence reviewer is required");
    const workspace = await this.required(workspaceId);
    const evidence = workspace.evidence.find((candidate) => candidate.id === evidenceId);
    if (!evidence) throw new Error("Evidence not found");
    if (!isReviewedEvidence(evidence)) throw new Error("Only reviewed, non-generated evidence can be rechecked; review it first");
    const now = this.clock();
    let nextReview: string | undefined;
    if (input.stillValid) {
      const next = Date.parse(input.nextFreshnessReviewAt ?? "");
      if (!Number.isFinite(next) || next <= now.getTime()) throw new Error("Choose a next freshness-review date in the future");
      nextReview = new Date(next).toISOString();
    }
    const rechecked: ProductWorkspace = {
      ...workspace,
      evidence: workspace.evidence.map((candidate): EvidenceRecord => candidate.id !== evidenceId ? candidate : {
        ...candidate,
        ...(nextReview ? { freshnessReviewAt: nextReview } : { reviewStatus: "rejected" }),
        reviewedBy: input.reviewer.trim(),
        reviewedAt: now.toISOString(),
      }),
    };
    return this.persist(nextReview ? rechecked : withdrawDependents(rechecked, evidence));
  }

  async addClaim(workspaceId: string, claim: Omit<ProductClaim, "id" | "revision" | "status">): Promise<ProductWorkspace> {
    const workspace = await this.required(workspaceId);
    const record: ProductClaim = { ...claim, id: this.createId(), revision: 1, status: "proposed" };
    return this.persist({ ...workspace, claims: [...workspace.claims, record] });
  }

  async reviseClaim(workspaceId: string, claimId: string, input: Readonly<{ statement: string; evidenceIds: readonly string[]; prohibitedContexts: readonly string[]; rationale?: string }>): Promise<ProductWorkspace> {
    if (!input.statement.trim()) throw new Error("Claim statement is required");
    const workspace = await this.required(workspaceId);
    const claim = workspace.claims.find((candidate) => candidate.id === claimId);
    if (!claim) throw new Error("Claim not found");
    return this.persist({
      ...workspace,
      claims: workspace.claims.map((candidate): ProductClaim => {
        if (candidate.id !== claimId) return candidate;
        const { rationale: _rationale, reviewedBy: _reviewedBy, reviewedAt: _reviewedAt, ...unreviewed } = candidate;
        return {
          ...unreviewed,
          statement: input.statement,
          evidenceIds: input.evidenceIds,
          prohibitedContexts: input.prohibitedContexts,
          ...(input.rationale ? { rationale: input.rationale } : {}),
          status: "proposed",
          revision: candidate.revision + 1,
        };
      }),
    });
  }

  async rejectClaim(workspaceId: string, claimId: string, reviewer: string): Promise<ProductWorkspace> {
    if (!reviewer.trim()) throw new Error("A named claim reviewer is required");
    const workspace = await this.required(workspaceId);
    if (!workspace.claims.some((candidate) => candidate.id === claimId)) throw new Error("Claim not found");
    return this.persist({
      ...workspace,
      claims: workspace.claims.map((candidate) => candidate.id === claimId ? {
        ...candidate,
        status: "rejected",
        revision: candidate.revision + 1,
        reviewedBy: reviewer,
        reviewedAt: this.clock().toISOString(),
      } : candidate),
    });
  }

  async approveClaim(workspaceId: string, claimId: string, reviewer: string): Promise<ProductWorkspace> {
    if (!reviewer.trim()) throw new Error("A named claim reviewer is required");
    const workspace = await this.required(workspaceId);
    const claim = workspace.claims.find((candidate) => candidate.id === claimId);
    if (!claim) throw new Error("Claim not found");
    const reviewedIds = new Set(workspace.evidence.filter(isReviewedEvidence).map((evidence) => evidence.id));
    if (claim.evidenceIds.length === 0 || claim.evidenceIds.some((id) => !reviewedIds.has(id))) {
      throw new Error("Approved claims require reviewed non-generated evidence");
    }
    return this.persist({ ...workspace, claims: workspace.claims.map((candidate) => candidate.id === claimId ? {
      ...candidate, status: "approved", revision: candidate.revision + 1, reviewedBy: reviewer, reviewedAt: this.clock().toISOString(),
    } : candidate) });
  }

  async addIcpHypothesis(workspaceId: string, hypothesis: Omit<IcpHypothesis, "id" | "revision" | "history">): Promise<ProductWorkspace> {
    const workspace = await this.required(workspaceId);
    validateIcp(hypothesis);
    if (hypothesis.origin === "generated_suggestion" && hypothesis.reviewStatus !== "suggested") {
      throw new Error("Generated ICPs must enter as suggestions");
    }
    const record: IcpHypothesis = { ...hypothesis, id: this.createId(), revision: 1, history: [] };
    return this.persist({ ...workspace, icpHypotheses: [...workspace.icpHypotheses, record] });
  }

  async reviewIcp(workspaceId: string, hypothesisId: string, reviewer: string, accepted: boolean): Promise<ProductWorkspace> {
    if (!reviewer.trim()) throw new Error("A named ICP reviewer is required");
    const workspace = await this.required(workspaceId);
    return this.persist({ ...workspace, icpHypotheses: workspace.icpHypotheses.map((hypothesis) =>
      hypothesis.id === hypothesisId ? {
        ...hypothesis,
        reviewStatus: accepted ? "reviewed" : "rejected",
        status: accepted ? "candidate" : "rejected",
        lastReviewedAt: this.clock().toISOString(),
      } : hypothesis,
    ) });
  }

  async selectPrimaryIcp(workspaceId: string, hypothesisId: string, reviewer: string, rationale: string): Promise<ProductWorkspace> {
    if (!reviewer.trim() || !rationale.trim()) throw new Error("Named reviewer and selection rationale are required");
    const workspace = await this.required(workspaceId);
    const target = workspace.icpHypotheses.find((hypothesis) => hypothesis.id === hypothesisId);
    if (!target) throw new Error("ICP hypothesis not found");
    if (target.reviewStatus !== "reviewed") throw new Error("Only reviewed ICP hypotheses can be selected");
    if (target.disqualifiers.length === 0 || !target.nextValidationAction.trim()) throw new Error("Selected ICP requires disqualifiers and a next validation action");
    const reviewed = new Set(workspace.evidence.filter(isReviewedEvidence).map((evidence) => evidence.id));
    if (target.evidenceIds.length === 0 || !target.evidenceIds.some((id) => reviewed.has(id))) {
      throw new Error("Selected ICP requires reviewed non-generated evidence");
    }
    const changedAt = this.clock().toISOString();
    return this.persist({ ...workspace, icpHypotheses: workspace.icpHypotheses.map((hypothesis) => {
      if (hypothesis.id === hypothesisId) {
        const history: IcpRevision = { revision: hypothesis.revision, changedAt, changedBy: reviewer, rationale, snapshot: JSON.stringify(hypothesis) };
        return { ...hypothesis, status: "selected", revision: hypothesis.revision + 1, lastReviewedAt: changedAt, history: [...hypothesis.history, history] };
      }
      return hypothesis.status === "selected" ? { ...hypothesis, status: "historical" } : hypothesis;
    }) });
  }

  async addExperiment(workspaceId: string, hypothesisId: string, experiment: ValidationExperiment): Promise<ProductWorkspace> {
    validateExperiment(experiment);
    const workspace = await this.required(workspaceId);
    return this.persist({ ...workspace, icpHypotheses: workspace.icpHypotheses.map((hypothesis) =>
      hypothesis.id === hypothesisId ? { ...hypothesis, experiments: [...hypothesis.experiments, experiment] } : hypothesis,
    ) });
  }

  compareIcps(workspace: ProductWorkspace, ids: readonly string[]): Readonly<Record<IcpDimension, readonly Readonly<{ id: string; name: string; assessment: IcpHypothesis["dimensions"][IcpDimension] }>[]>> {
    const selected = workspace.icpHypotheses.filter((hypothesis) => ids.includes(hypothesis.id));
    if (selected.length < 2) throw new Error("Comparison requires at least two ICP hypotheses");
    return Object.fromEntries(ICP_DIMENSIONS.map((dimension) => [dimension, selected.map((hypothesis) => ({ id: hypothesis.id, name: hypothesis.name, assessment: hypothesis.dimensions[dimension] }))])) as unknown as ReturnType<ProductCoreService["compareIcps"]>;
  }

  async recordAssessment(workspaceId: string, findings: readonly ReadinessFinding[]): Promise<ProductWorkspace> {
    const workspace = await this.required(workspaceId);
    const selected = workspace.icpHypotheses.find((hypothesis) => hypothesis.status === "selected");
    if (!selected) throw new Error("A selected ICP is required for marketability assessment");
    if (findings.length === 0) throw new Error("Assessment findings are required");
    for (const finding of findings) {
      if (!finding.rationale.trim() || !finding.recommendation.trim() || !finding.verification.trim()) {
        throw new Error(`Assessment dimension ${finding.dimension} requires rationale, recommendation, and verification`);
      }
    }
    const assessment: MarketabilityAssessment = {
      id: this.createId(), productRevision: workspace.product.revision, selectedIcpId: selected.id,
      createdAt: this.clock().toISOString(), findings,
    };
    return this.persist({ ...workspace, assessments: [...workspace.assessments, assessment] });
  }

  async createAction(workspaceId: string, action: CreateReadinessAction): Promise<ProductWorkspace> {
    if (!action.owner.trim() || !action.title.trim()) throw new Error("Action title and owner are required");
    const workspace = await this.required(workspaceId);
    const verification = action.verification?.trim() || inferredVerification(workspace, action);
    const record: ReadinessAction = {
      ...action,
      title: action.title.trim(),
      owner: action.owner.trim(),
      ...(verification ? { verification } : {}),
      id: this.createId(),
      status: "open",
    };
    return this.persist({ ...workspace, actions: [...workspace.actions, record] });
  }

  async startAction(workspaceId: string, actionId: string, actor: string): Promise<ProductWorkspace> {
    requireNamedActor(actor, "start");
    return this.changeAction(workspaceId, actionId, (action) => {
      if (action.status !== "open") throw new Error("Only open readiness actions can be started");
      const now = this.clock().toISOString();
      return { ...action, status: "in_progress", startedAt: now, startedBy: actor.trim() };
    });
  }

  async assignActionOwner(workspaceId: string, actionId: string, actor: string, owner: string, rationale: string): Promise<ProductWorkspace> {
    requireNamedActor(actor, "reassign");
    if (!owner.trim()) throw new Error("A readiness action owner is required");
    if (!rationale.trim()) throw new Error("Owner reassignment requires a rationale");
    return this.changeAction(workspaceId, actionId, (action) => {
      if (!["open", "in_progress"].includes(action.status)) throw new Error("Only active readiness actions can be reassigned");
      const now = this.clock().toISOString();
      return {
        ...action,
        owner: owner.trim(),
        ownerAssignedAt: now,
        ownerAssignedBy: actor.trim(),
        ownerAssignmentRationale: rationale.trim(),
      };
    });
  }

  async completeAction(workspaceId: string, actionId: string, input: Readonly<{ actor: string; evidence?: string; rationale?: string }>): Promise<ProductWorkspace> {
    requireNamedActor(input.actor, "complete");
    const evidence = input.evidence?.trim();
    const rationale = input.rationale?.trim();
    if (!evidence && !rationale) throw new Error("Completion requires verification evidence or a completion rationale");
    return this.changeAction(workspaceId, actionId, (action) => {
      if (action.status !== "in_progress") throw new Error("A readiness action must be started before completion");
      const now = this.clock().toISOString();
      return {
        ...action,
        status: "completed",
        completedAt: now,
        completedBy: input.actor.trim(),
        ...(evidence ? { completionEvidence: evidence } : {}),
        ...(rationale ? { completionRationale: rationale } : {}),
      };
    });
  }

  async dismissAction(workspaceId: string, actionId: string, actor: string, rationale: string): Promise<ProductWorkspace> {
    requireNamedActor(actor, "dismiss");
    if (!rationale.trim()) throw new Error("Dismissal requires a rationale");
    return this.changeAction(workspaceId, actionId, (action) => {
      if (!["open", "in_progress"].includes(action.status)) throw new Error("Only active readiness actions can be dismissed");
      const now = this.clock().toISOString();
      return {
        ...action,
        status: "dismissed",
        dismissedAt: now,
        dismissedBy: actor.trim(),
        dismissalRationale: rationale.trim(),
      };
    });
  }

  private async changeAction(workspaceId: string, actionId: string, change: (action: ReadinessAction) => ReadinessAction): Promise<ProductWorkspace> {
    const workspace = await this.required(workspaceId);
    const action = workspace.actions.find((candidate) => candidate.id === actionId);
    if (!action) throw new Error("Readiness action not found");
    const changed = change(action);
    return this.persist({
      ...workspace,
      actions: workspace.actions.map((candidate) => candidate.id === actionId ? changed : candidate),
    });
  }

  private async required(id: string): Promise<ProductWorkspace> {
    const workspace = await this.store.load(id);
    if (!workspace) throw new Error("Product workspace not found");
    return workspace;
  }

  private async persist(workspace: ProductWorkspace): Promise<ProductWorkspace> {
    await this.store.save(workspace);
    return workspace;
  }
}

function inferredVerification(workspace: ProductWorkspace, action: CreateReadinessAction): string | undefined {
  if (action.source !== "assessment_gap") return undefined;
  const assessment = workspace.assessments.find((candidate) => candidate.id === action.sourceId);
  if (!assessment) return undefined;
  const dimension = action.title.trim().replace(/^Improve\s+/i, "").toLocaleLowerCase("en-US");
  const finding = assessment.findings.find((candidate) => candidate.dimension.toLocaleLowerCase("en-US") === dimension);
  return finding?.verification.trim() || undefined;
}

function requireNamedActor(actor: string, verb: string): void {
  if (!actor.trim()) throw new Error(`A named actor is required to ${verb} a readiness action`);
}

function validateIcp(hypothesis: Omit<IcpHypothesis, "id" | "revision" | "history">): void {
  if (!hypothesis.name.trim() || !hypothesis.summary.trim() || !hypothesis.owner.trim()) throw new Error("ICP name, summary, and owner are required");
  for (const dimension of ICP_DIMENSIONS) {
    const assessment = hypothesis.dimensions[dimension];
    if (!assessment || !assessment.rationale.trim()) throw new Error(`ICP dimension ${dimension} requires an explained assessment`);
  }
}

function validateExperiment(experiment: ValidationExperiment): void {
  if (!experiment.owner.trim() || !experiment.hypothesis.trim() || !experiment.method.trim()) throw new Error("Experiment hypothesis, method, and owner are required");
  if (experiment.successCriteria.length === 0 || experiment.failureCriteria.length === 0 || experiment.decisionCriteria.length === 0) {
    throw new Error("Experiment success, failure, and decision criteria are required");
  }
  if (Date.parse(experiment.observationEndsAt) <= Date.parse(experiment.startsAt)) throw new Error("Experiment observation window is invalid");
}

// Approved claims citing withdrawn evidence lose their approval, exactly as an
// edit would; ICPs keep their status but carry an explicit contradiction.
function withdrawDependents(workspace: ProductWorkspace, evidence: EvidenceRecord): ProductWorkspace {
  const note = `Evidence "${evidence.title}" was withdrawn on recheck; conclusions that relied on it require review`;
  return {
    ...workspace,
    claims: workspace.claims.map((claim): ProductClaim => {
      if (claim.status !== "approved" || !claim.evidenceIds.includes(evidence.id)) return claim;
      const { reviewedBy: _reviewedBy, reviewedAt: _reviewedAt, ...unreviewed } = claim;
      return { ...unreviewed, status: "proposed", revision: claim.revision + 1 };
    }),
    icpHypotheses: workspace.icpHypotheses.map((hypothesis) => reliesOn(hypothesis, evidence.id)
      ? { ...hypothesis, contradictions: [...hypothesis.contradictions, note] }
      : hypothesis),
  };
}

function reliesOn(hypothesis: IcpHypothesis, evidenceId: string): boolean {
  return hypothesis.evidenceIds.includes(evidenceId)
    || Object.values(hypothesis.dimensions ?? {}).some((dimension) => dimension.evidenceIds.includes(evidenceId));
}
