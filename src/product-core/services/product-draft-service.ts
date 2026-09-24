import { MARKETABILITY_DIMENSIONS, type MarketabilityAssessment, type ReadinessFinding } from "../domain/assessment.js";
import type { AssessmentDraft, IcpDraft } from "../domain/draft.js";
import { isReviewedEvidence } from "../domain/evidence.js";
import { ICP_DIMENSIONS, type IcpHypothesis } from "../domain/icp.js";
import type { ProductWorkspace } from "../domain/workspace.js";
import type { ProductWorkspaceStore } from "../ports/product-workspace-store.js";

type Clock = () => Date;
type IdFactory = () => string;

type SaveIcpDraftInput = Omit<IcpDraft, "kind" | "updatedAt">;
type SaveAssessmentDraftInput = Omit<AssessmentDraft, "kind" | "updatedAt">;

export class ProductDraftService {
  constructor(
    private readonly store: ProductWorkspaceStore,
    private readonly clock: Clock = () => new Date(),
    private readonly createId: IdFactory = () => globalThis.crypto.randomUUID(),
  ) {}

  async saveIcpDraft(workspaceId: string, input: SaveIcpDraftInput): Promise<ProductWorkspace> {
    const workspace = await this.required(workspaceId);
    const draft: IcpDraft = { ...input, kind: "icp", updatedAt: this.clock().toISOString() };
    return this.persist({ ...workspace, drafts: { ...(workspace.drafts ?? {}), icp: draft } });
  }

  async discardIcpDraft(workspaceId: string): Promise<ProductWorkspace> {
    const workspace = await this.required(workspaceId);
    const { icp: _discarded, ...drafts } = workspace.drafts ?? {};
    return this.persist({ ...workspace, drafts });
  }

  async completeIcpDraft(workspaceId: string): Promise<ProductWorkspace> {
    const workspace = await this.required(workspaceId);
    const draft = workspace.drafts?.icp;
    if (!draft) throw new Error("No ICP draft is available to complete");
    validateIcpDraft(draft);
    const reviewedIds = reviewedEvidenceIds(workspace);
    validateEvidenceLinks(
      ICP_DIMENSIONS.flatMap((dimension) => draft.dimensions[dimension].evidenceIds),
      reviewedIds,
      "ICP draft",
    );
    const evidenceIds = unique(ICP_DIMENSIONS.flatMap((dimension) => draft.dimensions[dimension].evidenceIds));
    const hypothesis: IcpHypothesis = {
      id: this.createId(),
      name: draft.name.trim(),
      summary: draft.summary.trim(),
      status: draft.origin === "generated_suggestion" ? "suggested" : "candidate",
      origin: draft.origin,
      reviewStatus: "suggested",
      roles: cleanRecordArrays(draft.roles),
      dimensions: Object.fromEntries(ICP_DIMENSIONS.map((dimension) => [dimension, {
        ...draft.dimensions[dimension],
        rationale: draft.dimensions[dimension].rationale.trim(),
        evidenceIds: unique(draft.dimensions[dimension].evidenceIds),
      }])) as IcpHypothesis["dimensions"],
      disqualifiers: clean(draft.disqualifiers),
      antiIcpConditions: clean(draft.antiIcpConditions),
      assumptions: clean(draft.assumptions),
      contradictions: clean(draft.contradictions),
      evidenceIds,
      confidence: draft.confidence,
      owner: draft.owner.trim(),
      nextValidationAction: draft.nextValidationAction.trim(),
      changeConditions: clean(draft.changeConditions),
      experiments: [],
      revision: 1,
      history: [],
    };
    const { icp: _completed, ...drafts } = workspace.drafts ?? {};
    return this.persist({ ...workspace, icpHypotheses: [...workspace.icpHypotheses, hypothesis], drafts });
  }

  async saveAssessmentDraft(workspaceId: string, input: SaveAssessmentDraftInput): Promise<ProductWorkspace> {
    const workspace = await this.required(workspaceId);
    const draft: AssessmentDraft = { ...input, kind: "assessment", updatedAt: this.clock().toISOString() };
    return this.persist({ ...workspace, drafts: { ...(workspace.drafts ?? {}), assessment: draft } });
  }

  async discardAssessmentDraft(workspaceId: string): Promise<ProductWorkspace> {
    const workspace = await this.required(workspaceId);
    const { assessment: _discarded, ...drafts } = workspace.drafts ?? {};
    return this.persist({ ...workspace, drafts });
  }

  async completeAssessmentDraft(workspaceId: string): Promise<ProductWorkspace> {
    const workspace = await this.required(workspaceId);
    const draft = workspace.drafts?.assessment;
    if (!draft) throw new Error("No marketability assessment draft is available to complete");
    const selected = workspace.icpHypotheses.find((hypothesis) => hypothesis.status === "selected" && hypothesis.reviewStatus === "reviewed");
    if (!selected) throw new Error("A currently reviewed selected ICP is required to complete a marketability assessment");
    const reviewedIds = reviewedEvidenceIds(workspace);
    const findings: ReadinessFinding[] = MARKETABILITY_DIMENSIONS.map((dimension) => {
      const finding = draft.findings[dimension];
      if (!finding) throw new Error(`Assessment dimension ${dimension} is incomplete`);
      requireText(finding.rationale, `${dimension} rationale`);
      requireText(finding.owner, `${dimension} owner`);
      requireText(finding.verification, `${dimension} verification`);
      requireText(finding.recommendation, `${dimension} recommendation`);
      validateEvidenceLinks(finding.evidenceIds, reviewedIds, `Assessment dimension ${dimension}`);
      return {
        ...finding,
        dimension,
        rationale: finding.rationale.trim(),
        evidenceIds: unique(finding.evidenceIds),
        owner: finding.owner.trim(),
        verification: finding.verification.trim(),
        recommendation: finding.recommendation.trim(),
      };
    });
    const assessment: MarketabilityAssessment = {
      id: this.createId(),
      productRevision: workspace.product.revision,
      selectedIcpId: selected.id,
      createdAt: this.clock().toISOString(),
      findings,
    };
    const { assessment: _completed, ...drafts } = workspace.drafts ?? {};
    return this.persist({ ...workspace, assessments: [...workspace.assessments, assessment], drafts });
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

function validateIcpDraft(draft: IcpDraft): void {
  requireText(draft.name, "ICP name");
  requireText(draft.summary, "ICP summary");
  requireText(draft.owner, "ICP owner");
  requireText(draft.nextValidationAction, "ICP next validation action");
  for (const dimension of ICP_DIMENSIONS) {
    const assessment = draft.dimensions[dimension];
    if (!assessment || !assessment.rationale.trim()) throw new Error(`ICP dimension ${dimension} requires an explained assessment`);
  }
}

function reviewedEvidenceIds(workspace: ProductWorkspace): Set<string> {
  return new Set(workspace.evidence.filter(isReviewedEvidence).map((item) => item.id));
}

function validateEvidenceLinks(evidenceIds: readonly string[], reviewedIds: ReadonlySet<string>, label: string): void {
  const invalid = unique(evidenceIds).filter((id) => !reviewedIds.has(id));
  if (invalid.length) throw new Error(`${label} references evidence that is not currently reviewed non-generated Product Core evidence`);
}

function clean(values: readonly string[]): readonly string[] {
  return values.map((value) => value.trim()).filter(Boolean);
}

function cleanRecordArrays<T extends string>(values: Readonly<Record<T, readonly string[]>>): Readonly<Record<T, readonly string[]>> {
  return Object.fromEntries(Object.entries(values).map(([key, items]) => [key, clean(items as readonly string[])])) as Readonly<Record<T, readonly string[]>>;
}

function unique(values: readonly string[]): readonly string[] {
  return [...new Set(values)];
}

function requireText(value: string, label: string): void {
  if (!value.trim()) throw new Error(`${label} is required`);
}
