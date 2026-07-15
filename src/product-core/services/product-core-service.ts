import { randomUUID } from "node:crypto";
import type { MarketabilityAssessment, ReadinessAction, ReadinessFinding } from "../domain/assessment.js";
import type { ProductClaim } from "../domain/claim.js";
import { isReviewedEvidence, type EvidenceRecord } from "../domain/evidence.js";
import { ICP_DIMENSIONS, type IcpDimension, type IcpHypothesis, type IcpRevision, type ValidationExperiment } from "../domain/icp.js";
import type { ProductIdentity, ProductTruth } from "../domain/product.js";
import type { ProductWorkspace } from "../domain/workspace.js";
import type { ProductWorkspaceStore } from "../ports/product-workspace-store.js";

type Clock = () => Date;
type IdFactory = () => string;

export class ProductCoreService {
  constructor(
    private readonly store: ProductWorkspaceStore,
    private readonly clock: Clock = () => new Date(),
    private readonly createId: IdFactory = randomUUID,
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

  async addClaim(workspaceId: string, claim: Omit<ProductClaim, "id" | "revision" | "status">): Promise<ProductWorkspace> {
    const workspace = await this.required(workspaceId);
    const record: ProductClaim = { ...claim, id: this.createId(), revision: 1, status: "proposed" };
    return this.persist({ ...workspace, claims: [...workspace.claims, record] });
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

  async createAction(workspaceId: string, action: Omit<ReadinessAction, "id" | "status">): Promise<ProductWorkspace> {
    if (!action.owner.trim() || !action.title.trim()) throw new Error("Action title and owner are required");
    const workspace = await this.required(workspaceId);
    return this.persist({ ...workspace, actions: [...workspace.actions, { ...action, id: this.createId(), status: "open" }] });
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
