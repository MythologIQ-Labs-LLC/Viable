import { ICP_DIMENSIONS, type IcpDimension, type IcpDimensionAssessment, type IcpHypothesis, type IcpRevision, type IcpRoles, type ValidationExperiment } from "../domain/icp.js";
import type { ProductIdentity, ProductTruth, ProductTruthRevision } from "../domain/product.js";
import type { ProductWorkspace } from "../domain/workspace.js";
import type { ProductWorkspaceStore } from "../ports/product-workspace-store.js";
import { ProductCoreService } from "./product-core-service.js";

type Clock = () => Date;

type ProductTruthRevisionInput = Readonly<{
  identity: ProductIdentity;
  capabilities: readonly string[];
  limitations: readonly string[];
  positioning: string;
  alternatives: readonly string[];
  differentiation: readonly string[];
  pricing: readonly string[];
  packaging: readonly string[];
  offers: readonly string[];
  callsToAction: readonly string[];
  brandVoice: readonly string[];
  terminology: Readonly<Record<string, string>>;
  accessibilityConstraints: readonly string[];
  updatedBy: string;
  rationale: string;
}>;

export type IcpCorrectionInput = Readonly<{
  editor: string;
  rationale: string;
  name: string;
  summary: string;
  roles: IcpRoles;
  dimensions: Readonly<Record<IcpDimension, IcpDimensionAssessment>>;
  disqualifiers: readonly string[];
  antiIcpConditions: readonly string[];
  assumptions: readonly string[];
  contradictions: readonly string[];
  evidenceIds: readonly string[];
  confidence: "low" | "medium" | "high";
  owner: string;
  nextValidationAction: string;
  changeConditions: readonly string[];
}>;

export class ProductRevisionService {
  constructor(
    private readonly store: ProductWorkspaceStore,
    private readonly clock: Clock = () => new Date(),
  ) {}

  async reviseProductTruth(workspaceId: string, input: ProductTruthRevisionInput): Promise<ProductWorkspace> {
    requireText(input.updatedBy, "Named Product Truth editor");
    requireText(input.rationale, "Product Truth revision rationale");
    requireText(input.identity.name, "Product name");
    requireText(input.identity.description, "Product description");
    const workspace = await this.required(workspaceId);
    const changedFields = productTruthChangedFields(workspace.product, input);
    if (changedFields.length === 0) throw new Error("Change at least one Product Truth field before saving a revision");
    const now = this.clock().toISOString();
    const { history: _history, ...snapshot } = workspace.product;
    const revision: ProductTruthRevision = {
      revision: workspace.product.revision,
      changedAt: now,
      changedBy: input.updatedBy.trim(),
      rationale: input.rationale.trim(),
      changedFields,
      snapshot: JSON.stringify(snapshot),
    };
    const core = new ProductCoreService(this.store, this.clock);
    const updated = await core.updateProductTruth(workspaceId, {
      identity: {
        name: input.identity.name.trim(),
        description: input.identity.description.trim(),
        lifecycle: input.identity.lifecycle,
        supportedEnvironments: clean(input.identity.supportedEnvironments),
      },
      capabilities: clean(input.capabilities),
      limitations: clean(input.limitations),
      positioning: input.positioning.trim(),
      alternatives: clean(input.alternatives),
      differentiation: clean(input.differentiation),
      pricing: clean(input.pricing),
      packaging: clean(input.packaging),
      offers: clean(input.offers),
      callsToAction: clean(input.callsToAction),
      brandVoice: clean(input.brandVoice),
      terminology: cleanRecord(input.terminology),
      accessibilityConstraints: clean(input.accessibilityConstraints),
      updatedBy: input.updatedBy.trim(),
      history: [...(workspace.product.history ?? []), revision],
    });
    if (!updated.icpHypotheses.some((candidate) => candidate.status === "selected" && candidate.reviewStatus === "reviewed")) return updated;
    return this.persist({
      ...updated,
      icpHypotheses: updated.icpHypotheses.map((candidate) => candidate.status === "selected" && candidate.reviewStatus === "reviewed"
        ? { ...candidate, reviewStatus: "suggested" as const }
        : candidate),
    });
  }

  async reviseIcp(workspaceId: string, hypothesisId: string, input: IcpCorrectionInput): Promise<ProductWorkspace> {
    requireText(input.editor, "Named ICP editor");
    requireText(input.rationale, "ICP revision rationale");
    validateIcpCorrection(input);
    const workspace = await this.required(workspaceId);
    const current = workspace.icpHypotheses.find((candidate) => candidate.id === hypothesisId);
    if (!current) throw new Error("ICP hypothesis not found");
    const changedFields = icpChangedFields(current, input);
    if (changedFields.length === 0) throw new Error("Change at least one ICP field before saving a revision");
    const now = this.clock().toISOString();
    const { history: _history, ...snapshot } = current;
    const revision: IcpRevision = {
      revision: current.revision,
      changedAt: now,
      changedBy: input.editor.trim(),
      rationale: input.rationale.trim(),
      changedFields,
      snapshot: JSON.stringify(snapshot),
    };
    const revised: IcpHypothesis = {
      ...current,
      name: input.name.trim(),
      summary: input.summary.trim(),
      roles: cloneRoles(input.roles),
      dimensions: cloneDimensions(input.dimensions),
      disqualifiers: clean(input.disqualifiers),
      antiIcpConditions: clean(input.antiIcpConditions),
      assumptions: clean(input.assumptions),
      contradictions: clean(input.contradictions),
      evidenceIds: [...input.evidenceIds],
      confidence: input.confidence,
      owner: input.owner.trim(),
      nextValidationAction: input.nextValidationAction.trim(),
      changeConditions: clean(input.changeConditions),
      status: "candidate",
      reviewStatus: "suggested",
      revision: current.revision + 1,
      history: [...current.history, revision],
    };
    const { lastReviewedAt: _lastReviewedAt, ...withoutReviewTime } = revised;
    return this.persist({
      ...workspace,
      icpHypotheses: workspace.icpHypotheses.map((candidate) => candidate.id === hypothesisId ? withoutReviewTime : candidate),
    });
  }

  async startExperiment(workspaceId: string, hypothesisId: string, experimentId: string, actor: string): Promise<ProductWorkspace> {
    requireText(actor, "Named experiment starter");
    return this.changeExperiment(workspaceId, hypothesisId, experimentId, (experiment) => {
      if (experiment.status !== "planned") throw new Error("Only planned experiments can be started");
      return { ...experiment, status: "active", startedAt: this.clock().toISOString(), startedBy: actor.trim() };
    });
  }

  async completeExperiment(workspaceId: string, hypothesisId: string, experimentId: string, input: Readonly<{
    actor: string;
    evidence: readonly string[];
    summary: string;
    decision: string;
  }>): Promise<ProductWorkspace> {
    requireText(input.actor, "Named experiment completer");
    requireText(input.summary, "Experiment outcome summary");
    requireText(input.decision, "Experiment outcome decision");
    const evidence = clean(input.evidence);
    if (evidence.length === 0) throw new Error("Experiment completion requires outcome evidence");
    return this.changeExperiment(workspaceId, hypothesisId, experimentId, (experiment) => {
      if (experiment.status !== "active") throw new Error("Only active experiments can be completed");
      return {
        ...experiment,
        status: "completed",
        completedAt: this.clock().toISOString(),
        completedBy: input.actor.trim(),
        outcomeEvidence: evidence,
        outcomeSummary: input.summary.trim(),
        outcomeDecision: input.decision.trim(),
      };
    });
  }

  async cancelExperiment(workspaceId: string, hypothesisId: string, experimentId: string, actor: string, rationale: string): Promise<ProductWorkspace> {
    requireText(actor, "Named experiment canceller");
    requireText(rationale, "Experiment cancellation rationale");
    return this.changeExperiment(workspaceId, hypothesisId, experimentId, (experiment) => {
      if (!["planned", "active"].includes(experiment.status)) throw new Error("Only planned or active experiments can be cancelled");
      return {
        ...experiment,
        status: "cancelled",
        cancelledAt: this.clock().toISOString(),
        cancelledBy: actor.trim(),
        cancellationRationale: rationale.trim(),
      };
    });
  }

  private async changeExperiment(
    workspaceId: string,
    hypothesisId: string,
    experimentId: string,
    change: (experiment: ValidationExperiment) => ValidationExperiment,
  ): Promise<ProductWorkspace> {
    const workspace = await this.required(workspaceId);
    const hypothesis = workspace.icpHypotheses.find((candidate) => candidate.id === hypothesisId);
    if (!hypothesis) throw new Error("ICP hypothesis not found");
    if (!hypothesis.experiments.some((candidate) => candidate.id === experimentId)) throw new Error("Validation experiment not found");
    return this.persist({
      ...workspace,
      icpHypotheses: workspace.icpHypotheses.map((candidate) => candidate.id === hypothesisId ? {
        ...candidate,
        experiments: candidate.experiments.map((experiment) => experiment.id === experimentId ? change(experiment) : experiment),
      } : candidate),
    });
  }

  private async required(workspaceId: string): Promise<ProductWorkspace> {
    const workspace = await this.store.load(workspaceId);
    if (!workspace) throw new Error("Product workspace not found");
    return workspace;
  }

  private async persist(workspace: ProductWorkspace): Promise<ProductWorkspace> {
    await this.store.save(workspace);
    return workspace;
  }
}

function validateIcpCorrection(input: IcpCorrectionInput): void {
  requireText(input.name, "ICP name");
  requireText(input.summary, "ICP summary");
  requireText(input.owner, "ICP owner");
  requireText(input.nextValidationAction, "ICP next validation action");
  for (const dimension of ICP_DIMENSIONS) {
    const assessment = input.dimensions[dimension];
    if (!assessment || !assessment.rationale.trim()) throw new Error(`ICP dimension ${dimension} requires an explained assessment`);
  }
}

function productTruthChangedFields(current: ProductTruth, input: ProductTruthRevisionInput): string[] {
  const comparisons: readonly [string, unknown, unknown][] = [
    ["identity.name", current.identity.name, input.identity.name],
    ["identity.description", current.identity.description, input.identity.description],
    ["identity.lifecycle", current.identity.lifecycle, input.identity.lifecycle],
    ["identity.supportedEnvironments", current.identity.supportedEnvironments, clean(input.identity.supportedEnvironments)],
    ["capabilities", current.capabilities, clean(input.capabilities)],
    ["limitations", current.limitations, clean(input.limitations)],
    ["positioning", current.positioning, input.positioning.trim()],
    ["alternatives", current.alternatives, clean(input.alternatives)],
    ["differentiation", current.differentiation, clean(input.differentiation)],
    ["pricing", current.pricing, clean(input.pricing)],
    ["packaging", current.packaging, clean(input.packaging)],
    ["offers", current.offers, clean(input.offers)],
    ["callsToAction", current.callsToAction, clean(input.callsToAction)],
    ["brandVoice", current.brandVoice, clean(input.brandVoice)],
    ["terminology", cleanRecord(current.terminology), cleanRecord(input.terminology)],
    ["accessibilityConstraints", current.accessibilityConstraints, clean(input.accessibilityConstraints)],
  ];
  return comparisons.filter(([, before, after]) => JSON.stringify(before) !== JSON.stringify(after)).map(([field]) => field);
}

function icpChangedFields(current: IcpHypothesis, input: IcpCorrectionInput): string[] {
  const comparisons: readonly [string, unknown, unknown][] = [
    ["name", current.name, input.name.trim()],
    ["summary", current.summary, input.summary.trim()],
    ["roles", current.roles, cloneRoles(input.roles)],
    ["dimensions", current.dimensions, cloneDimensions(input.dimensions)],
    ["disqualifiers", current.disqualifiers, clean(input.disqualifiers)],
    ["antiIcpConditions", current.antiIcpConditions, clean(input.antiIcpConditions)],
    ["assumptions", current.assumptions, clean(input.assumptions)],
    ["contradictions", current.contradictions, clean(input.contradictions)],
    ["evidenceIds", current.evidenceIds, input.evidenceIds],
    ["confidence", current.confidence, input.confidence],
    ["owner", current.owner, input.owner.trim()],
    ["nextValidationAction", current.nextValidationAction, input.nextValidationAction.trim()],
    ["changeConditions", current.changeConditions, clean(input.changeConditions)],
  ];
  return comparisons.filter(([, before, after]) => JSON.stringify(before) !== JSON.stringify(after)).map(([field]) => field);
}

function cloneRoles(roles: IcpRoles): IcpRoles {
  return Object.fromEntries(Object.entries(roles).map(([key, values]) => [key, clean(values)])) as IcpRoles;
}

function cloneDimensions(dimensions: Readonly<Record<IcpDimension, IcpDimensionAssessment>>): Readonly<Record<IcpDimension, IcpDimensionAssessment>> {
  return Object.fromEntries(ICP_DIMENSIONS.map((dimension) => [dimension, {
    ...dimensions[dimension],
    rationale: dimensions[dimension].rationale.trim(),
    evidenceIds: [...dimensions[dimension].evidenceIds],
  }])) as Readonly<Record<IcpDimension, IcpDimensionAssessment>>;
}

function clean(values: readonly string[]): readonly string[] {
  return values.map((value) => value.trim()).filter(Boolean);
}

function cleanRecord(values: Readonly<Record<string, string>>): Readonly<Record<string, string>> {
  return Object.fromEntries(Object.entries(values)
    .map(([key, value]) => [key.trim(), value.trim()] as const)
    .filter(([key, value]) => Boolean(key && value))
    .sort(([left], [right]) => left.localeCompare(right)));
}

function requireText(value: string, label: string): void {
  if (!value.trim()) throw new Error(`${label} is required`);
}
