import { MARKETABILITY_DIMENSIONS, type MarketabilityDimension } from "../../../src/product-core/domain/assessment.js";
import type { AssessmentDraft, AssessmentFindingDraft, IcpDimensionDraft, IcpDraft } from "../../../src/product-core/domain/draft.js";
import { isReviewedEvidence, type EvidenceRecord } from "../../../src/product-core/domain/evidence.js";
import { ICP_DIMENSIONS, type IcpDimension, type IcpRole, type IcpRoles } from "../../../src/product-core/domain/icp.js";
import type { ProductWorkspace } from "../../../src/product-core/domain/workspace.js";
import { ProductDraftService } from "../../../src/product-core/services/product-draft-service.js";
import { LocalStorageProductWorkspaceStore } from "./local-storage-product-workspace-store.js";

const store = new LocalStorageProductWorkspaceStore();
const drafts = new ProductDraftService(store);
const main = document.querySelector<HTMLElement>("#main");
const sidebar = document.querySelector<HTMLElement>("#sidebar");
const live = document.querySelector<HTMLElement>("#live-region");

let queued = false;
let enhancing = false;
let dirtyForm: HTMLFormElement | undefined;

const roleFields: readonly [IcpRole, string][] = [
  ["users", "Primary users"], ["economicBuyers", "Economic buyers"], ["decisionMakers", "Decision makers"], ["approvers", "Approvers"],
  ["influencers", "Influencers"], ["champions", "Champions"], ["blockers", "Blockers"], ["partners", "Partners"],
  ["maintainers", "Maintainers"], ["contributors", "Contributors"],
];
const icpLabels: Record<IcpDimension, string> = {
  problemIntensity: "Problem intensity", urgency: "Urgency", productFit: "Product fit", timeToValue: "Time to value", access: "Reachable access", proof: "Available proof",
  adoptionFriction: "Adoption friction", commercialViability: "Commercial viability", retentionPotential: "Retention potential", strategicFit: "Strategic fit", evidenceQuality: "Evidence quality",
};
const assessmentLabels: Record<MarketabilityDimension, string> = {
  productTruth: "Product truth", icpClarity: "ICP clarity", audienceClarity: "Audience clarity", urgency: "Urgency", positioning: "Positioning", offer: "Offer", proof: "Proof",
  discoverability: "Discoverability", content: "Content", distribution: "Distribution", conversion: "Conversion", sales: "Sales readiness", measurement: "Measurement",
};

const escapeHtml = (value: unknown): string => String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
const lines = (value: FormDataEntryValue | null): string[] => String(value ?? "").split(/[,\n]/).map((item) => item.trim()).filter(Boolean);
const checked = (data: FormData, name: string): string[] => data.getAll(name).map(String).filter(Boolean);
const rating = (value: FormDataEntryValue | null): 0 | 1 | 2 | 3 | 4 => {
  const candidate = Number(value);
  return candidate === 0 || candidate === 1 || candidate === 2 || candidate === 3 || candidate === 4 ? candidate : 0;
};
const confidence = (value: FormDataEntryValue | null): "low" | "medium" | "high" => {
  const candidate = String(value);
  return candidate === "low" || candidate === "high" ? candidate : "medium";
};
const freshness = (value: FormDataEntryValue | null): "fresh" | "stale" | "unknown" => {
  const candidate = String(value);
  return candidate === "fresh" || candidate === "stale" ? candidate : "unknown";
};

function rolesFrom(read: (role: IcpRole) => readonly string[]): IcpRoles {
  return {
    users: read("users"), economicBuyers: read("economicBuyers"), decisionMakers: read("decisionMakers"), approvers: read("approvers"), influencers: read("influencers"),
    champions: read("champions"), blockers: read("blockers"), partners: read("partners"), maintainers: read("maintainers"), contributors: read("contributors"),
  };
}

function icpDimensionsFrom(read: (dimension: IcpDimension) => IcpDimensionDraft): IcpDraft["dimensions"] {
  return {
    problemIntensity: read("problemIntensity"), urgency: read("urgency"), productFit: read("productFit"), timeToValue: read("timeToValue"), access: read("access"), proof: read("proof"),
    adoptionFriction: read("adoptionFriction"), commercialViability: read("commercialViability"), retentionPotential: read("retentionPotential"), strategicFit: read("strategicFit"), evidenceQuality: read("evidenceQuality"),
  };
}

function assessmentFindingsFrom(read: (dimension: MarketabilityDimension) => AssessmentFindingDraft): AssessmentDraft["findings"] {
  return {
    productTruth: read("productTruth"), icpClarity: read("icpClarity"), audienceClarity: read("audienceClarity"), urgency: read("urgency"), positioning: read("positioning"), offer: read("offer"), proof: read("proof"),
    discoverability: read("discoverability"), content: read("content"), distribution: read("distribution"), conversion: read("conversion"), sales: read("sales"), measurement: read("measurement"),
  };
}

function queueEnhance(): void {
  if (queued) return;
  queued = true;
  queueMicrotask(() => { queued = false; void enhance(); });
}

async function enhance(): Promise<void> {
  if (!main || enhancing) return;
  enhancing = true;
  try {
    const workspaceId = store.activeWorkspaceId();
    if (!workspaceId) return;
    const workspace = await store.load(workspaceId);
    if (!workspace || activeNav() !== "product") return;
    enhanceIcpDraft(workspace);
    enhanceAssessmentDraft(workspace);
  } finally { enhancing = false; }
}

function enhanceIcpDraft(workspace: ProductWorkspace): void {
  const legacy = main?.querySelector<HTMLFormElement>('form[data-form="add-icp"]');
  const panel = main?.querySelector<HTMLElement>("#icp-heading")?.closest("section.panel");
  if (!legacy || !panel || panel.querySelector("[data-ux-icp-draft]")) return;
  legacy.closest("details")?.setAttribute("hidden", "true");
  const value = workspace.drafts?.icp ?? blankIcpDraft(workspace.createdBy);
  const wrapper = document.createElement("section");
  wrapper.dataset.uxIcpDraft = "true";
  wrapper.className = "draft-workflow";
  wrapper.innerHTML = `<div class="draft-heading"><div><p class="eyebrow">Resumable ICP draft</p><h4>${workspace.drafts?.icp ? "Continue the saved ICP draft" : "Build an ICP in manageable steps"}</h4></div><span class="pill neutral">${workspace.drafts?.icp ? `Saved ${escapeHtml(humanDate(workspace.drafts.icp.updatedAt))}` : "Not saved yet"}</span></div>
    <p class="guidance">Drafts are incomplete working state, never reviewed or selected authority. Reviewed evidence is context until you explicitly link it to a dimension.</p>
    <form data-ux-draft-form="icp" novalidate><div data-ux-draft-error aria-live="polite"></div>
      ${icpIdentityStep(value)}${icpBoundaryStep(value)}
      ${icpDimensionStep("Step 3", "Problem, fit, and proof", ICP_DIMENSIONS.slice(0, 6), value, workspace.evidence)}
      ${icpDimensionStep("Step 4", "Adoption, viability, and evidence quality", ICP_DIMENSIONS.slice(6), value, workspace.evidence)}
      <div class="draft-actions"><button type="submit" data-draft-action="save">Save ICP draft</button><button class="primary" type="submit" data-draft-action="complete">Complete draft as an unreviewed ICP candidate</button><button type="button" data-draft-discard="icp">Discard saved draft</button></div>
    </form>`;
  const cards = panel.querySelector(".icp-cards");
  if (cards) cards.insertAdjacentElement("beforebegin", wrapper); else panel.append(wrapper);
}

function icpIdentityStep(value: Omit<IcpDraft, "kind" | "updatedAt">): string {
  return `<details open><summary><strong>Step 1 · Audience identity</strong><span>Name the audience and the people involved.</span></summary><div class="draft-step">
    <div class="two"><label>Candidate name<input name="name" value="${escapeHtml(value.name)}"></label><label>Owner<input name="owner" value="${escapeHtml(value.owner)}"></label></div>
    <label>Summary<textarea name="summary" rows="3">${escapeHtml(value.summary)}</textarea></label><label>Origin<select name="origin"><option value="human" ${value.origin === "human" ? "selected" : ""}>Human-authored hypothesis</option><option value="generated_suggestion" ${value.origin === "generated_suggestion" ? "selected" : ""}>Generated suggestion requiring review</option></select></label>
    <div class="two">${roleFields.slice(0, 4).map(([role, label]) => roleField(role, label, value.roles[role])).join("")}</div><button type="submit" data-draft-action="save">Save draft and continue</button></div></details>`;
}

function icpBoundaryStep(value: Omit<IcpDraft, "kind" | "updatedAt">): string {
  return `<details><summary><strong>Step 2 · Boundaries and validation</strong><span>Capture who does not fit and what should change your mind.</span></summary><div class="draft-step">
    <div class="two">${roleFields.slice(4).map(([role, label]) => roleField(role, label, value.roles[role])).join("")}</div>
    <div class="two"><label>Disqualifiers<textarea name="disqualifiers" rows="3">${escapeHtml(value.disqualifiers.join("\n"))}</textarea></label><label>Anti-ICP conditions<textarea name="antiIcpConditions" rows="3">${escapeHtml(value.antiIcpConditions.join("\n"))}</textarea></label></div>
    <div class="two"><label>Assumptions<textarea name="assumptions" rows="3">${escapeHtml(value.assumptions.join("\n"))}</textarea></label><label>Known contradictions<textarea name="contradictions" rows="3">${escapeHtml(value.contradictions.join("\n"))}</textarea></label></div>
    <label>Next validation action<input name="nextValidationAction" value="${escapeHtml(value.nextValidationAction)}"></label><label>Evidence or conditions that should change this ICP<textarea name="changeConditions" rows="2">${escapeHtml(value.changeConditions.join("\n"))}</textarea></label>
    <label>Overall confidence<select name="confidence"><option ${value.confidence === "low" ? "selected" : ""}>low</option><option ${value.confidence === "medium" ? "selected" : ""}>medium</option><option ${value.confidence === "high" ? "selected" : ""}>high</option></select></label><button type="submit" data-draft-action="save">Save draft and continue</button></div></details>`;
}

function icpDimensionStep(step: string, title: string, dimensions: readonly IcpDimension[], value: Omit<IcpDraft, "kind" | "updatedAt">, evidence: readonly EvidenceRecord[]): string {
  const eligibleCount = evidence.filter(isReviewedEvidence).length;
  return `<details><summary><strong>${escapeHtml(step)} · ${escapeHtml(title)}</strong><span>Rate each conclusion and deliberately choose its support.</span></summary><div class="draft-step dimension-list">${dimensions.map((dimension) => {
    const current = value.dimensions[dimension];
    return `<fieldset class="dimension"><legend>${escapeHtml(icpLabels[dimension])}</legend><div class="three"><label>Rating<select name="${dimension}.rating">${[0,1,2,3,4].map((item) => `<option value="${item}" ${current.rating === item ? "selected" : ""}>${item}</option>`).join("")}</select></label><label>Confidence<select name="${dimension}.confidence"><option ${current.confidence === "low" ? "selected" : ""}>low</option><option ${current.confidence === "medium" ? "selected" : ""}>medium</option><option ${current.confidence === "high" ? "selected" : ""}>high</option></select></label><span class="context-note">${eligibleCount} reviewed context record${eligibleCount === 1 ? "" : "s"}</span></div><label>Evidence-backed rationale<textarea name="${dimension}.rationale" rows="2">${escapeHtml(current.rationale)}</textarea></label>${evidenceChoices(evidence, `${dimension}.evidenceIds`, current.evidenceIds)}</fieldset>`;
  }).join("")}</div><div class="draft-step"><button type="submit" data-draft-action="save">Save draft and continue</button></div></details>`;
}

function enhanceAssessmentDraft(workspace: ProductWorkspace): void {
  const panel = main?.querySelector<HTMLElement>("#assessment-heading")?.closest("section.panel");
  if (!panel || panel.querySelector("[data-ux-assessment-draft]")) return;
  const legacy = panel.querySelector<HTMLFormElement>('form[data-form="add-assessment"]');
  const selected = workspace.icpHypotheses.find((item) => item.status === "selected" && item.reviewStatus === "reviewed");
  if (legacy) legacy.closest("details")?.setAttribute("hidden", "true");
  const wrapper = document.createElement("section");
  wrapper.dataset.uxAssessmentDraft = "true";
  wrapper.className = "draft-workflow";
  if (!selected) {
    wrapper.innerHTML = `<section class="state warning"><strong>Assessment draft completion is blocked.</strong><span>A currently reviewed selected ICP is required. An older selected ICP whose Product Truth review was invalidated does not satisfy this gate.</span></section>`;
    panel.append(wrapper);
    return;
  }
  const value = workspace.drafts?.assessment ?? blankAssessmentDraft(workspace.createdBy);
  wrapper.innerHTML = `<div class="draft-heading"><div><p class="eyebrow">Resumable marketability assessment</p><h4>${workspace.drafts?.assessment ? "Continue the saved assessment draft" : "Assess the market in smaller groups"}</h4></div><span class="pill neutral">${workspace.drafts?.assessment ? `Saved ${escapeHtml(humanDate(workspace.drafts.assessment.updatedAt))}` : "Not saved yet"}</span></div>
    <p class="guidance">Each finding owns its evidence links. Reviewed evidence is available context, but Viable does not attach it to a finding unless you check it.</p>
    <form data-ux-draft-form="assessment" novalidate><div data-ux-draft-error aria-live="polite"></div>
      ${assessmentStep("Step 1", "Truth and audience", MARKETABILITY_DIMENSIONS.slice(0, 4), value, workspace.evidence)}${assessmentStep("Step 2", "Positioning and proof", MARKETABILITY_DIMENSIONS.slice(4, 7), value, workspace.evidence)}${assessmentStep("Step 3", "Reach and conversion", MARKETABILITY_DIMENSIONS.slice(7, 11), value, workspace.evidence)}${assessmentStep("Step 4", "Sales and measurement", MARKETABILITY_DIMENSIONS.slice(11), value, workspace.evidence)}
      <div class="draft-actions"><button type="submit" data-draft-action="save">Save assessment draft</button><button class="primary" type="submit" data-draft-action="complete">Complete explained assessment</button><button type="button" data-draft-discard="assessment">Discard saved draft</button></div></form>`;
  panel.append(wrapper);
}

function assessmentStep(step: string, title: string, dimensions: readonly MarketabilityDimension[], value: Omit<AssessmentDraft, "kind" | "updatedAt">, evidence: readonly EvidenceRecord[]): string {
  return `<details ${step === "Step 1" ? "open" : ""}><summary><strong>${escapeHtml(step)} · ${escapeHtml(title)}</strong><span>Explain the finding, intended verification, and support.</span></summary><div class="draft-step dimension-list">${dimensions.map((dimension) => {
    const current = value.findings[dimension];
    return `<fieldset class="dimension"><legend>${escapeHtml(assessmentLabels[dimension])}</legend><div class="three"><label>Rating<select name="${dimension}.rating">${[0,1,2,3,4].map((item) => `<option value="${item}" ${current.rating === item ? "selected" : ""}>${item}</option>`).join("")}</select></label><label>Confidence<select name="${dimension}.confidence"><option ${current.confidence === "low" ? "selected" : ""}>low</option><option ${current.confidence === "medium" ? "selected" : ""}>medium</option><option ${current.confidence === "high" ? "selected" : ""}>high</option></select></label><label>Freshness<select name="${dimension}.freshness"><option ${current.freshness === "unknown" ? "selected" : ""}>unknown</option><option ${current.freshness === "fresh" ? "selected" : ""}>fresh</option><option ${current.freshness === "stale" ? "selected" : ""}>stale</option></select></label></div><label>Rationale<textarea name="${dimension}.rationale" rows="2">${escapeHtml(current.rationale)}</textarea></label><div class="two"><label>Owner<input name="${dimension}.owner" value="${escapeHtml(current.owner)}"></label><label>Verification<input name="${dimension}.verification" value="${escapeHtml(current.verification)}"></label></div><label>Recommendation<textarea name="${dimension}.recommendation" rows="2">${escapeHtml(current.recommendation)}</textarea></label>${evidenceChoices(evidence, `${dimension}.evidenceIds`, current.evidenceIds)}</fieldset>`;
  }).join("")}</div><div class="draft-step"><button type="submit" data-draft-action="save">Save draft and continue</button></div></details>`;
}

function evidenceChoices(evidence: readonly EvidenceRecord[], name: string, selected: readonly string[]): string {
  const eligible = evidence.filter(isReviewedEvidence);
  const eligibleIds = new Set(eligible.map((item) => item.id));
  const ineligible = selected.filter((id) => !eligibleIds.has(id));
  const title = (id: string): string => evidence.find((item) => item.id === id)?.title ?? "Previously linked evidence";
  return `<fieldset class="evidence-picker"><legend>Explicit supporting evidence</legend><p class="context-note">Unchecked records remain reviewed context and are not attached to this conclusion.</p>${ineligible.length ? `<section class="state warning" data-ux-stale-evidence><strong>Previously linked evidence is no longer eligible.</strong><span>${ineligible.map((id) => escapeHtml(title(id))).join(", ")}. Saving this draft will remove the ineligible link unless the evidence is reviewed again first.</span></section>` : ""}${eligible.length ? eligible.map((item) => `<label class="choice"><input type="checkbox" name="${escapeHtml(name)}" value="${escapeHtml(item.id)}" ${selected.includes(item.id) ? "checked" : ""}>${escapeHtml(item.title)}</label>`).join("") : `<span>No reviewed non-generated evidence is available. You may keep drafting, but downstream authority safeguards still apply.</span>`}</fieldset>`;
}

function roleField(role: IcpRole, label: string, values: readonly string[]): string {
  return `<label>${escapeHtml(label)}<textarea name="${role}" rows="2">${escapeHtml(values.join("\n"))}</textarea></label>`;
}

function blankIcpDraft(owner: string): Omit<IcpDraft, "kind" | "updatedAt"> {
  return {
    name: "", summary: "", owner, origin: "human", roles: rolesFrom(() => []), dimensions: icpDimensionsFrom(() => ({ rating: 0, rationale: "", evidenceIds: [], confidence: "medium" })),
    disqualifiers: [], antiIcpConditions: [], assumptions: [], contradictions: [], confidence: "medium", nextValidationAction: "", changeConditions: [],
  };
}

function blankAssessmentDraft(owner: string): Omit<AssessmentDraft, "kind" | "updatedAt"> {
  return { findings: assessmentFindingsFrom((dimension) => ({ dimension, rating: 0, rationale: "", evidenceIds: [], confidence: "medium", freshness: "unknown", owner, verification: "", recommendation: "" })) };
}

function parseIcpDraft(form: HTMLFormElement): Omit<IcpDraft, "kind" | "updatedAt"> {
  const data = new FormData(form);
  return {
    name: String(data.get("name") ?? ""), summary: String(data.get("summary") ?? ""), owner: String(data.get("owner") ?? ""), origin: String(data.get("origin")) === "generated_suggestion" ? "generated_suggestion" : "human",
    roles: rolesFrom((role) => lines(data.get(role))),
    dimensions: icpDimensionsFrom((dimension) => ({ rating: rating(data.get(`${dimension}.rating`)), rationale: String(data.get(`${dimension}.rationale`) ?? ""), evidenceIds: checked(data, `${dimension}.evidenceIds`), confidence: confidence(data.get(`${dimension}.confidence`)) })),
    disqualifiers: lines(data.get("disqualifiers")), antiIcpConditions: lines(data.get("antiIcpConditions")), assumptions: lines(data.get("assumptions")), contradictions: lines(data.get("contradictions")), confidence: confidence(data.get("confidence")), nextValidationAction: String(data.get("nextValidationAction") ?? ""), changeConditions: lines(data.get("changeConditions")),
  };
}

function parseAssessmentDraft(form: HTMLFormElement): Omit<AssessmentDraft, "kind" | "updatedAt"> {
  const data = new FormData(form);
  return { findings: assessmentFindingsFrom((dimension) => ({ dimension, rating: rating(data.get(`${dimension}.rating`)), rationale: String(data.get(`${dimension}.rationale`) ?? ""), evidenceIds: checked(data, `${dimension}.evidenceIds`), confidence: confidence(data.get(`${dimension}.confidence`)), freshness: freshness(data.get(`${dimension}.freshness`)), owner: String(data.get(`${dimension}.owner`) ?? ""), verification: String(data.get(`${dimension}.verification`) ?? ""), recommendation: String(data.get(`${dimension}.recommendation`) ?? "") })) };
}

function validateForCompletion(form: HTMLFormElement, kind: "icp" | "assessment"): boolean {
  clearFieldErrors(form);
  const missing: readonly [string, string][] = kind === "icp"
    ? [["name", "Candidate name is required"], ["summary", "Summary is required"], ["owner", "Owner is required"], ["nextValidationAction", "Next validation action is required"], ...ICP_DIMENSIONS.map((dimension) => [`${dimension}.rationale`, `${icpLabels[dimension]} needs an explained rationale`] as [string, string])]
    : MARKETABILITY_DIMENSIONS.flatMap((dimension) => [[`${dimension}.rationale`, `${assessmentLabels[dimension]} needs a rationale`], [`${dimension}.owner`, `${assessmentLabels[dimension]} needs an owner`], [`${dimension}.verification`, `${assessmentLabels[dimension]} needs a verification method`], [`${dimension}.recommendation`, `${assessmentLabels[dimension]} needs a recommendation`]] as readonly [string, string][]);
  let valid = true;
  for (const [name, message] of missing) {
    const control = form.elements.namedItem(name);
    if (!(control instanceof HTMLInputElement || control instanceof HTMLTextAreaElement || control instanceof HTMLSelectElement) || control.value.trim()) continue;
    valid = false;
    control.setAttribute("aria-invalid", "true");
    const note = document.createElement("span");
    note.dataset.uxFieldError = "true";
    note.className = "field-error";
    note.textContent = message;
    control.closest("label")?.append(note);
  }
  if (!valid) {
    inlineFailure(form, new Error("Complete the highlighted fields before turning this draft into authority."));
    form.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  }
  return valid;
}

function clearFieldErrors(form: HTMLFormElement): void {
  form.querySelectorAll("[data-ux-field-error]").forEach((item) => item.remove());
  form.querySelectorAll('[aria-invalid="true"]').forEach((item) => item.removeAttribute("aria-invalid"));
  form.querySelector<HTMLElement>("[data-ux-draft-error]")?.replaceChildren();
}

function inlineFailure(form: HTMLFormElement, error: unknown): void {
  const detail = error instanceof Error ? error.message : "Unknown local draft error";
  const region = form.querySelector<HTMLElement>("[data-ux-draft-error]");
  if (region) region.innerHTML = `<section class="state error" role="alert"><strong>Draft action did not complete.</strong><span>${escapeHtml(detail)} Your entered values are still on this screen.</span></section>`;
  announce(`Draft action failed: ${detail}`);
}

function announce(message: string): void { if (live) live.textContent = message; }
function activeNav(): string | undefined { return sidebar?.querySelector<HTMLButtonElement>('nav button[aria-current="page"]')?.dataset.nav; }
function humanDate(value: string): string { return new Date(value).toLocaleString(); }
function refreshProduct(): void { dirtyForm = undefined; sidebar?.querySelector<HTMLButtonElement>('button[data-nav="product"]')?.click(); }

new MutationObserver(queueEnhance).observe(main ?? document.body, { childList: true, subtree: true });
new MutationObserver(queueEnhance).observe(sidebar ?? document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["aria-current"] });
queueEnhance();

document.addEventListener("input", (event) => {
  const target = event.target;
  if (!(target instanceof Element)) return;
  const form = target.closest<HTMLFormElement>("form[data-ux-draft-form]");
  if (form) dirtyForm = form;
}, true);

document.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof Element)) return;
  const discard = target.closest<HTMLButtonElement>("button[data-draft-discard]");
  if (discard) {
    event.preventDefault(); event.stopImmediatePropagation();
    const workspaceId = store.activeWorkspaceId();
    if (!workspaceId) return;
    const kind = discard.dataset.draftDiscard;
    const task = kind === "icp" ? drafts.discardIcpDraft(workspaceId) : drafts.discardAssessmentDraft(workspaceId);
    void task.then(() => { announce(`${kind === "icp" ? "ICP" : "Assessment"} draft discarded`); refreshProduct(); }).catch((error: unknown) => { const form = discard.closest<HTMLFormElement>("form[data-ux-draft-form]"); if (form) inlineFailure(form, error); });
    return;
  }
  const nav = target.closest<HTMLButtonElement>("button[data-nav]");
  if (!nav || !dirtyForm?.isConnected) return;
  if (!window.confirm("This draft has unsaved changes. Leave this screen without saving them?")) { event.preventDefault(); event.stopImmediatePropagation(); }
}, true);

document.addEventListener("submit", (event) => {
  const form = event.target as HTMLFormElement;
  const kind = form.dataset.uxDraftForm as "icp" | "assessment" | undefined;
  if (!kind) return;
  event.preventDefault(); event.stopImmediatePropagation();
  const workspaceId = store.activeWorkspaceId();
  if (!workspaceId) return;
  const action = (event.submitter as HTMLButtonElement | null)?.dataset.draftAction ?? "save";
  if (action === "complete" && !validateForCompletion(form, kind)) return;
  clearFieldErrors(form);
  const save = kind === "icp" ? drafts.saveIcpDraft(workspaceId, parseIcpDraft(form)) : drafts.saveAssessmentDraft(workspaceId, parseAssessmentDraft(form));
  void save.then(async () => {
    dirtyForm = undefined;
    if (action === "complete") {
      if (kind === "icp") await drafts.completeIcpDraft(workspaceId); else await drafts.completeAssessmentDraft(workspaceId);
      announce(kind === "icp" ? "ICP draft completed as an unreviewed candidate" : "Marketability assessment completed from the saved draft");
    } else announce(kind === "icp" ? "ICP draft saved locally" : "Assessment draft saved locally");
    refreshProduct();
  }).catch((error: unknown) => inlineFailure(form, error));
}, true);

window.addEventListener("beforeunload", (event) => {
  if (!dirtyForm?.isConnected) return;
  event.preventDefault();
  event.returnValue = "";
});
