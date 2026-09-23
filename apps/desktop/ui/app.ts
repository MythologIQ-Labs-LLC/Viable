import { ProductCoreService } from "../../../src/product-core/services/product-core-service.js";
import { ICP_DIMENSIONS, type IcpDimension, type IcpHypothesis, type IcpRoles } from "../../../src/product-core/domain/icp.js";
import type { MarketabilityDimension, ReadinessFinding } from "../../../src/product-core/domain/assessment.js";
import type { ProductWorkspace } from "../../../src/product-core/domain/workspace.js";
import { LocalStorageProductWorkspaceStore } from "./local-storage-product-workspace-store.js";
import { SignalsViewController } from "./signals-view.js";

const store = new LocalStorageProductWorkspaceStore();
const service = new ProductCoreService(store);
function requiredElement(selector: string): HTMLElement {
  const element = document.querySelector<HTMLElement>(selector);
  if (!element) throw new Error(`Desktop shell region ${selector} is missing`);
  return element;
}
const main = requiredElement("#main");
const live = requiredElement("#live-region");

let workspace: ProductWorkspace | undefined;
let page: "home" | "product" | "signals" | "market" = "home";
let signalsController: SignalsViewController | undefined;
let lastFailure: string | undefined;

const dimensionLabels: Record<IcpDimension, string> = {
  problemIntensity: "Problem intensity", urgency: "Urgency", productFit: "Product fit",
  timeToValue: "Time to value", access: "Reachable access", proof: "Available proof",
  adoptionFriction: "Adoption friction", commercialViability: "Commercial viability",
  retentionPotential: "Retention potential", strategicFit: "Strategic fit", evidenceQuality: "Evidence quality",
};
const assessmentDimensions: readonly MarketabilityDimension[] = [
  "productTruth", "icpClarity", "audienceClarity", "urgency", "positioning", "offer", "proof",
  "discoverability", "content", "distribution", "conversion", "sales", "measurement",
];
const assessmentLabels: Record<MarketabilityDimension, string> = {
  productTruth: "Product truth", icpClarity: "ICP clarity", audienceClarity: "Audience clarity",
  urgency: "Urgency", positioning: "Positioning", offer: "Offer", proof: "Proof",
  discoverability: "Discoverability", content: "Content", distribution: "Distribution",
  conversion: "Conversion", sales: "Sales readiness", measurement: "Measurement",
};

const escapeHtml = (value: unknown): string => String(value ?? "")
  .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;").replaceAll("'", "&#039;");
const lines = (value: FormDataEntryValue | null): string[] => String(value ?? "").split("\n").map((item) => item.trim()).filter(Boolean);
const asRating = (value: FormDataEntryValue | null): 0 | 1 | 2 | 3 | 4 => {
  const rating = Number(value);
  return rating >= 0 && rating <= 4 ? rating as 0 | 1 | 2 | 3 | 4 : 0;
};
const humanDate = (value?: string): string => value ? new Date(value).toLocaleDateString() : "Not reviewed";
const isStale = (reviewAt: string): boolean => Date.parse(reviewAt) < Date.now();
const statusPill = (label: string, tone = "neutral"): string => `<span class="pill ${tone}">${escapeHtml(label)}</span>`;

function announce(message: string): void {
  live.textContent = message;
}
function setBusy(busy: boolean): void {
  main.setAttribute("aria-busy", String(busy));
}
async function refresh(): Promise<void> {
  const id = store.activeWorkspaceId();
  workspace = id ? await store.load(id) : undefined;
  if (workspace) {
    if (!signalsController || signalsController.workspaceId !== workspace.id) {
      signalsController = new SignalsViewController(workspace.id, workspace.createdBy);
    }
    await signalsController.load();
  } else {
    signalsController = undefined;
  }
  render();
}
async function act(task: () => Promise<void>, success: string): Promise<void> {
  setBusy(true);
  lastFailure = undefined;
  try {
    await task();
    await refresh();
    announce(success);
  } catch (error) {
    lastFailure = error instanceof Error ? error.message : "Unknown local error";
    render();
    announce(`Action failed: ${lastFailure}`);
  } finally {
    setBusy(false);
  }
}

function nav(): string {
  return `
    <p class="eyebrow">MythologIQ Labs, LLC</p>
    <h1>Viable</h1>
    <p class="tagline">Marketability, grounded in product truth.</p>
    <nav aria-label="Primary">
      <button type="button" data-nav="home" aria-current="${page === "home" ? "page" : "false"}">Home</button>
      <button type="button" data-nav="product" aria-current="${page === "product" ? "page" : "false"}">Product</button>
      <button type="button" data-nav="signals" aria-current="${page === "signals" ? "page" : "false"}">Signals</button>
      <button type="button" data-nav="market" aria-current="${page === "market" ? "page" : "false"}">Market</button>
      <button type="button" disabled>Campaigns <span>Planned</span></button>
      <button type="button" disabled>Studio <span>Planned</span></button>
      <button type="button" disabled>Calendar <span>Planned</span></button>
    </nav>
    <div class="local-note"><strong>Local workspace</strong><span>Data stays in this desktop profile.</span></div>`;
}

function recovery(): string {
  return lastFailure ? `<section class="state error" role="alert"><div><strong>That change was not saved.</strong><p>${escapeHtml(lastFailure)}</p></div><button type="button" data-action="retry-render">Return to the saved workspace</button></section>` : "";
}

function emptyWorkspace(): string {
  return `
    <header class="hero"><div><p class="eyebrow">Product Core</p><h2>Start with what is true.</h2>
    <p>Create one local product workspace. You can revise it without erasing prior ICP decisions.</p></div></header>
    ${recovery()}
    <section class="panel narrow" aria-labelledby="create-heading">
      <div class="section-heading"><div><p class="eyebrow">Step 1</p><h3 id="create-heading">Create a product workspace</h3></div>${statusPill("Empty state", "warning")}</div>
      <form data-form="create-workspace">
        <label>Product name<input name="name" required autocomplete="organization"></label>
        <label>Plain-language description<textarea name="description" required rows="4" placeholder="What does the product help someone accomplish?"></textarea></label>
        <div class="two">
          <label>Lifecycle<select name="lifecycle"><option value="concept">Concept</option><option value="prototype">Prototype</option><option value="private_beta">Private beta</option><option value="public_beta">Public beta</option><option value="general_availability">General availability</option></select></label>
          <label>Named workspace owner<input name="createdBy" required autocomplete="name"></label>
        </div>
        <label>Supported environments, one per line<textarea name="environments" rows="3" placeholder="Windows desktop\nmacOS desktop"></textarea></label>
        <button class="primary" type="submit">Create local workspace</button>
      </form>
    </section>`;
}

function homeView(value: ProductWorkspace): string {
  const selected = value.icpHypotheses.find((item) => item.status === "selected");
  const reviewedEvidence = value.evidence.filter((item) => item.reviewStatus === "reviewed" && item.origin !== "generated_suggestion");
  const stale = value.evidence.filter((item) => isStale(item.freshnessReviewAt));
  const contradictions = value.icpHypotheses.flatMap((item) => item.contradictions);
  const openActions = value.actions.filter((item) => item.status === "open" || item.status === "in_progress");
  const next = !value.product.positioning ? "Complete product truth" : value.icpHypotheses.length < 2 ? "Create a second ICP hypothesis" : !selected ? "Review evidence and select a primary ICP" : value.assessments.length === 0 ? "Run the marketability assessment" : "Work the highest-priority readiness action";
  return `
    <header class="hero"><div><p class="eyebrow">Home</p><h2>${escapeHtml(value.product.identity.name)}</h2>
      <p>${escapeHtml(value.product.identity.description)}</p></div>${statusPill("Local only", "implemented")}</header>
    ${recovery()}
    <section class="state offline"><strong>Offline-ready by design.</strong><span>This workflow uses local authority and does not require an external account.</span></section>
    <section class="metrics" aria-label="Workspace status">
      <article><span>Product truth</span><strong>Revision ${value.product.revision}</strong><small>${value.claims.length} claims</small></article>
      <article><span>ICP hypotheses</span><strong>${value.icpHypotheses.length}</strong><small>${selected ? `Primary: ${escapeHtml(selected.name)}` : "No primary selected"}</small></article>
      <article><span>Reviewed evidence</span><strong>${reviewedEvidence.length}</strong><small>${stale.length} stale</small></article>
      <article><span>Open actions</span><strong>${openActions.length}</strong><small>${value.assessments.length} assessments</small></article>
    </section>
    <section class="panel next"><div><p class="eyebrow">Next highest-value action</p><h3>${escapeHtml(next)}</h3></div><button class="primary" type="button" data-nav="product">Open Product workflow</button></section>
    ${contradictions.length ? `<section class="state contradiction"><div><strong>Contradictions require review</strong><p>${contradictions.map(escapeHtml).join(" · ")}</p></div></section>` : ""}
    ${stale.length ? `<section class="state warning"><div><strong>Stale evidence</strong><p>${stale.map((item) => escapeHtml(item.title)).join(", ")} reached its freshness-review date.</p></div></section>` : ""}`;
}

function productTruth(value: ProductWorkspace): string {
  const p = value.product;
  return `
    <section class="panel" aria-labelledby="truth-heading">
      <div class="section-heading"><div><p class="eyebrow">Step 1</p><h3 id="truth-heading">Verify product truth</h3></div>${statusPill(`Revision ${p.revision}`, "implemented")}</div>
      <form data-form="update-product">
        <div class="two"><label>Product name<input name="name" required value="${escapeHtml(p.identity.name)}"></label>
        <label>Named editor<input name="updatedBy" required value="${escapeHtml(p.updatedBy)}"></label></div>
        <label>Description<textarea name="description" required rows="3">${escapeHtml(p.identity.description)}</textarea></label>
        <div class="two"><label>Capabilities, one per line<textarea name="capabilities" rows="4">${escapeHtml(p.capabilities.join("\n"))}</textarea></label>
        <label>Limitations, one per line<textarea name="limitations" rows="4">${escapeHtml(p.limitations.join("\n"))}</textarea></label></div>
        <label>Positioning<textarea name="positioning" rows="3">${escapeHtml(p.positioning)}</textarea></label>
        <div class="two"><label>Alternatives<textarea name="alternatives" rows="3">${escapeHtml(p.alternatives.join("\n"))}</textarea></label>
        <label>Differentiation<textarea name="differentiation" rows="3">${escapeHtml(p.differentiation.join("\n"))}</textarea></label></div>
        <div class="two"><label>Offers<textarea name="offers" rows="3">${escapeHtml(p.offers.join("\n"))}</textarea></label>
        <label>Calls to action<textarea name="callsToAction" rows="3">${escapeHtml(p.callsToAction.join("\n"))}</textarea></label></div>
        <button class="primary" type="submit">Save product-truth revision</button>
      </form>
    </section>`;
}

function evidenceSection(value: ProductWorkspace): string {
  return `
    <section class="panel" aria-labelledby="evidence-heading">
      <div class="section-heading"><div><p class="eyebrow">Step 2</p><h3 id="evidence-heading">Record and review evidence</h3></div>${statusPill(`${value.evidence.length} records`)}</div>
      <p class="guidance">Generated suggestions are proposals, never observed evidence. Only named review of non-generated evidence can support an approved claim or selected ICP.</p>
      <form data-form="add-evidence">
        <div class="two"><label>Evidence title<input name="title" required></label><label>Origin<select name="origin"><option value="observed">Observed</option><option value="interview">Interview</option><option value="customer">Customer</option><option value="analytics">Analytics</option><option value="public_source">Public source</option><option value="generated_suggestion">Generated suggestion</option></select></label></div>
        <label>What was learned<textarea name="summary" required rows="3"></textarea></label>
        <div class="three"><label>Observed on<input name="observedAt" type="date" required></label><label>Review freshness on<input name="freshnessReviewAt" type="date" required></label><label>Confidence<select name="confidence"><option>low</option><option selected>medium</option><option>high</option></select></label></div>
        <button type="submit">Add unreviewed evidence</button>
      </form>
      <div class="cards">${value.evidence.length ? value.evidence.map((item) => `<article class="record">
        <div class="record-top"><h4>${escapeHtml(item.title)}</h4>${statusPill(item.origin === "generated_suggestion" ? "Generated suggestion" : item.reviewStatus, item.origin === "generated_suggestion" ? "suggested" : item.reviewStatus)}</div>
        <p>${escapeHtml(item.summary)}</p><small>Confidence: ${item.confidence}. Freshness review: ${humanDate(item.freshnessReviewAt)}.</small>
        <div class="actions">${item.reviewStatus === "suggested" && item.origin !== "generated_suggestion" ? `<button type="button" data-action="review-evidence" data-id="${item.id}">Accept with named review</button>` : ""}${item.reviewStatus === "suggested" ? `<button type="button" data-action="reject-evidence" data-id="${item.id}">Reject</button>` : ""}</div>
      </article>`).join("") : `<div class="state empty"><strong>No evidence yet.</strong><span>Record an observation, interview, customer outcome, analytic, or public source.</span></div>`}</div>
    </section>`;
}

function claimSection(value: ProductWorkspace): string {
  const reviewedEvidence = value.evidence.filter((item) => item.reviewStatus === "reviewed" && item.origin !== "generated_suggestion");
  const evidenceName = (id: string): string => value.evidence.find((item) => item.id === id)?.title ?? id;
  return `
    <section class="panel" aria-labelledby="claims-heading">
      <div class="section-heading"><div><p class="eyebrow">Step 3</p><h3 id="claims-heading">Review the claims ledger</h3></div>${statusPill(`${value.claims.length} claims`)}</div>
      <p class="guidance">Claims remain Product Core authority. Approval requires named human review and reviewed non-generated evidence. Editing any claim returns it to proposed review.</p>
      <details><summary>Create a product claim</summary><form data-form="add-claim">
        <label>Claim statement<textarea name="statement" required rows="3" placeholder="What may Viable truthfully claim?"></textarea></label>
        <label>Rationale<textarea name="rationale" rows="2" placeholder="Why is this claim useful and appropriately scoped?"></textarea></label>
        <label>Prohibited contexts, one per line<textarea name="prohibitedContexts" rows="2" placeholder="Contexts where this claim must not be used"></textarea></label>
        <fieldset><legend>Reviewed evidence</legend>
          ${reviewedEvidence.length ? reviewedEvidence.map((item) => `<label class="choice"><input type="checkbox" name="evidenceIds" value="${item.id}">${escapeHtml(item.title)}</label>`).join("") : `<div class="state warning"><strong>No reviewed evidence is available.</strong><span>You may draft a claim, but approval will remain blocked.</span></div>`}
        </fieldset>
        <button class="primary" type="submit">Add proposed claim</button>
      </form></details>
      <div class="cards">${value.claims.length ? value.claims.map((claim) => `<article class="record">
        <div class="record-top"><h4>${escapeHtml(claim.statement)}</h4>${statusPill(`${claim.status} · revision ${claim.revision}`, claim.status)}</div>
        <p>${escapeHtml(claim.rationale || "No rationale recorded")}</p>
        <small>Evidence: ${claim.evidenceIds.length ? claim.evidenceIds.map((id) => escapeHtml(evidenceName(id))).join(", ") : "None selected"}</small>
        <small>Prohibited contexts: ${escapeHtml(claim.prohibitedContexts.join(", ") || "None recorded")}</small>
        ${claim.reviewedBy ? `<small>Last reviewed by ${escapeHtml(claim.reviewedBy)}${claim.reviewedAt ? ` on ${humanDate(claim.reviewedAt)}` : ""}.</small>` : ""}
        <div class="actions">
          ${claim.status === "proposed" ? `<button type="button" data-action="approve-claim" data-id="${claim.id}">Approve claim</button><button type="button" data-action="reject-claim" data-id="${claim.id}">Reject claim</button>` : ""}
        </div>
        <details><summary>Edit claim</summary><form data-form="revise-claim">
          <input type="hidden" name="id" value="${claim.id}">
          <label>Claim statement<textarea name="statement" required rows="3">${escapeHtml(claim.statement)}</textarea></label>
          <label>Rationale<textarea name="rationale" rows="2">${escapeHtml(claim.rationale || "")}</textarea></label>
          <label>Prohibited contexts, one per line<textarea name="prohibitedContexts" rows="2">${escapeHtml(claim.prohibitedContexts.join("\n"))}</textarea></label>
          <fieldset><legend>Reviewed evidence</legend>${reviewedEvidence.length ? reviewedEvidence.map((item) => `<label class="choice"><input type="checkbox" name="evidenceIds" value="${item.id}" ${claim.evidenceIds.includes(item.id) ? "checked" : ""}>${escapeHtml(item.title)}</label>`).join("") : `<span>No reviewed evidence is available.</span>`}</fieldset>
          <button type="submit">Save revision and return to proposed review</button>
        </form></details>
      </article>`).join("") : `<div class="state empty"><strong>No product claims yet.</strong><span>Create claims only after recording the evidence that can support them.</span></div>`}</div>
    </section>`;
}

function dimensionFields(): string {
  return ICP_DIMENSIONS.map((dimension) => `<fieldset class="dimension"><legend>${dimensionLabels[dimension]}</legend>
    <div class="dimension-grid"><label>Rating<select name="${dimension}.rating"><option value="0">0 · Unknown</option><option value="1">1 · Weak</option><option value="2">2 · Mixed</option><option value="3">3 · Strong</option><option value="4">4 · Proven</option></select></label>
    <label>Confidence<select name="${dimension}.confidence"><option>low</option><option selected>medium</option><option>high</option></select></label></div>
    <label>Evidence-backed rationale<textarea name="${dimension}.rationale" required rows="2" placeholder="What makes this rating true or uncertain?"></textarea></label>
  </fieldset>`).join("");
}

function icpSection(value: ProductWorkspace): string {
  const reviewedEvidence = value.evidence.filter((item) => item.reviewStatus === "reviewed" && item.origin !== "generated_suggestion");
  return `
    <section class="panel" aria-labelledby="icp-heading">
      <div class="section-heading"><div><p class="eyebrow">Step 4</p><h3 id="icp-heading">Compare ICP hypotheses</h3></div>${statusPill(`${value.icpHypotheses.length} candidates`)}</div>
      <p class="guidance">A primary ICP requires reviewed evidence, explicit disqualifiers, a next validation action, rationale, and named human review. No composite score is used.</p>
      <details><summary>Create an ICP hypothesis</summary><form data-form="add-icp">
        <div class="two"><label>Candidate name<input name="name" required></label><label>Owner<input name="owner" required value="${escapeHtml(value.createdBy)}"></label></div>
        <label>Summary<textarea name="summary" required rows="3"></textarea></label>
        <div class="two"><label>Primary users<textarea name="users" required rows="2"></textarea></label><label>Economic buyers<textarea name="economicBuyers" rows="2"></textarea></label></div>
        <div class="two"><label>Champions<textarea name="champions" rows="2"></textarea></label><label>Blockers<textarea name="blockers" rows="2"></textarea></label></div>
        <div class="two"><label>Disqualifiers, one per line<textarea name="disqualifiers" required rows="3"></textarea></label><label>Anti-ICP conditions<textarea name="antiIcp" rows="3"></textarea></label></div>
        <div class="two"><label>Assumptions<textarea name="assumptions" rows="3"></textarea></label><label>Known contradictions<textarea name="contradictions" rows="3"></textarea></label></div>
        <label>Next validation action<input name="nextValidationAction" required></label>
        <label>What evidence would cause this ICP to change?<textarea name="changeConditions" required rows="2"></textarea></label>
        <label>Origin<select name="origin"><option value="human">Human-authored hypothesis</option><option value="generated_suggestion">Generated suggestion requiring review</option></select></label>
        <div class="dimension-list">${dimensionFields()}</div>
        <button class="primary" type="submit">Save ICP hypothesis</button>
      </form></details>
      ${reviewedEvidence.length === 0 ? `<div class="state warning"><strong>Selection is intentionally blocked.</strong><span>At least one non-generated evidence record must receive named review first.</span></div>` : ""}
      <div class="cards icp-cards">${value.icpHypotheses.length ? value.icpHypotheses.map((item) => icpCard(item)).join("") : `<div class="state empty"><strong>No ICP hypotheses yet.</strong><span>Create at least two plausible candidates before comparing and selecting.</span></div>`}</div>
      ${value.icpHypotheses.length >= 2 ? comparison(value.icpHypotheses) : ""}
    </section>`;
}

function experimentSurface(item: IcpHypothesis): string {
  return `<div class="experiment-surface">
    <div class="record-top"><strong>Validation experiments</strong>${statusPill(`${item.experiments.length} experiments`)}</div>
    <p class="guidance">Define the hypothesis, observation window, explicit success and failure criteria, and the decision the evidence will drive.</p>
    <details><summary>Add validation experiment</summary><form data-form="add-experiment">
      <input type="hidden" name="hypothesisId" value="${item.id}">
      <label>Experiment hypothesis<textarea name="hypothesis" required rows="2"></textarea></label>
      <label>Method<textarea name="method" required rows="2" placeholder="Interview, landing-page test, outreach, observation, or another bounded method"></textarea></label>
      <div class="three"><label>Owner<input name="owner" required value="${escapeHtml(item.owner)}"></label><label>Starts on<input name="startsAt" type="date" required></label><label>Observation ends<input name="observationEndsAt" type="date" required></label></div>
      <div class="three"><label>Success criteria<textarea name="successCriteria" required rows="3"></textarea></label><label>Failure criteria<textarea name="failureCriteria" required rows="3"></textarea></label><label>Decision criteria<textarea name="decisionCriteria" required rows="3"></textarea></label></div>
      <button type="submit">Add planned experiment</button>
    </form></details>
    ${item.experiments.length ? `<div class="cards">${item.experiments.map((experiment) => `<article class="record"><div class="record-top"><strong>${escapeHtml(experiment.hypothesis)}</strong>${statusPill(experiment.status)}</div><p>${escapeHtml(experiment.method)}</p><small>${humanDate(experiment.startsAt)} through ${humanDate(experiment.observationEndsAt)} · Owner: ${escapeHtml(experiment.owner)}</small><dl><div><dt>Success</dt><dd>${escapeHtml(experiment.successCriteria.join(" · "))}</dd></div><div><dt>Failure</dt><dd>${escapeHtml(experiment.failureCriteria.join(" · "))}</dd></div><div><dt>Decision</dt><dd>${escapeHtml(experiment.decisionCriteria.join(" · "))}</dd></div></dl></article>`).join("")}</div>` : `<div class="state empty"><strong>No validation experiments yet.</strong><span>A next validation action becomes stronger when its outcome and decision criteria are explicit.</span></div>`}
  </div>`;
}

function icpCard(item: IcpHypothesis): string {
  return `<article class="record">
    <div class="record-top"><h4>${escapeHtml(item.name)}</h4><div>${statusPill(item.status, item.status)} ${statusPill(item.origin === "generated_suggestion" ? "Generated" : item.reviewStatus, item.origin === "generated_suggestion" ? "suggested" : item.reviewStatus)}</div></div>
    <p>${escapeHtml(item.summary)}</p>
    <dl><div><dt>Users</dt><dd>${escapeHtml(item.roles.users.join(", ") || "Unspecified")}</dd></div><div><dt>Buyers</dt><dd>${escapeHtml(item.roles.economicBuyers.join(", ") || "Unspecified")}</dd></div><div><dt>Disqualifiers</dt><dd>${escapeHtml(item.disqualifiers.join(", ") || "Missing")}</dd></div><div><dt>Next validation</dt><dd>${escapeHtml(item.nextValidationAction)}</dd></div></dl>
    ${experimentSurface(item)}
    ${item.contradictions.length ? `<div class="inline-warning"><strong>Contradictions:</strong> ${escapeHtml(item.contradictions.join(" · "))}</div>` : ""}
    <div class="actions">
      ${item.reviewStatus === "suggested" ? `<button type="button" data-action="review-icp" data-id="${item.id}">Accept with named review</button><button type="button" data-action="reject-icp" data-id="${item.id}">Reject</button>` : ""}
    </div>
    ${item.reviewStatus === "reviewed" && item.status !== "selected" ? `<form class="select-form" data-form="select-icp"><input type="hidden" name="id" value="${item.id}"><label>Named selector<input name="reviewer" required></label><label>Selection rationale<textarea name="rationale" required rows="2"></textarea></label><button type="submit">Select as primary ICP</button></form>` : ""}
  </article>`;
}

function comparison(items: readonly IcpHypothesis[]): string {
  return `<div class="comparison" tabindex="0" aria-label="Dimension-by-dimension ICP comparison"><h4>Candidate comparison</h4><p>No unexplained composite score is calculated.</p>
    <div class="table-wrap"><table><thead><tr><th scope="col">Dimension</th>${items.map((item) => `<th scope="col">${escapeHtml(item.name)}</th>`).join("")}</tr></thead>
    <tbody>${ICP_DIMENSIONS.map((dimension) => `<tr><th scope="row">${dimensionLabels[dimension]}</th>${items.map((item) => `<td><strong>${item.dimensions[dimension].rating}/4</strong><span>${escapeHtml(item.dimensions[dimension].rationale)}</span><small>${item.dimensions[dimension].confidence} confidence</small></td>`).join("")}</tr>`).join("")}</tbody></table></div></div>`;
}

function assessmentSection(value: ProductWorkspace): string {
  const selected = value.icpHypotheses.find((item) => item.status === "selected");
  return `
    <section class="panel" aria-labelledby="assessment-heading">
      <div class="section-heading"><div><p class="eyebrow">Step 5</p><h3 id="assessment-heading">Assess marketability</h3></div>${statusPill(`${value.assessments.length} assessments`)}</div>
      ${!selected ? `<div class="state warning"><strong>Assessment is blocked.</strong><span>Select a reviewed, evidence-backed primary ICP first.</span></div>` : `<details><summary>Record an explained assessment for ${escapeHtml(selected.name)}</summary><form data-form="add-assessment">
        ${assessmentDimensions.map((dimension) => `<fieldset class="dimension"><legend>${assessmentLabels[dimension]}</legend><div class="three"><label>Rating<select name="${dimension}.rating"><option value="0">0 · Missing</option><option value="1">1 · Weak</option><option value="2">2 · Developing</option><option value="3">3 · Ready</option><option value="4">4 · Proven</option></select></label><label>Confidence<select name="${dimension}.confidence"><option>low</option><option selected>medium</option><option>high</option></select></label><label>Freshness<select name="${dimension}.freshness"><option>unknown</option><option>fresh</option><option>stale</option></select></label></div><label>Rationale<textarea name="${dimension}.rationale" required rows="2"></textarea></label><label>Verification and recommendation<textarea name="${dimension}.verification" required rows="2" placeholder="How was this checked?"></textarea><textarea name="${dimension}.recommendation" required rows="2" placeholder="What should happen next?"></textarea></label></fieldset>`).join("")}
        <label>Assessment owner<input name="owner" required value="${escapeHtml(value.createdBy)}"></label><button class="primary" type="submit">Save explained assessment</button>
      </form></details>`}
      <div class="cards">${value.assessments.slice().reverse().map((assessment) => `<article class="record"><div class="record-top"><h4>Assessment · ${humanDate(assessment.createdAt)}</h4>${statusPill(`Product revision ${assessment.productRevision}`)}</div>${assessment.findings.map((finding) => `<div class="finding"><strong>${assessmentLabels[finding.dimension]} · ${finding.rating}/4</strong><span>${escapeHtml(finding.rationale)}</span><small>${finding.confidence} confidence · ${finding.freshness} · ${escapeHtml(finding.recommendation)}</small>${finding.rating < 3 ? `<button type="button" data-action="create-gap-action" data-assessment="${assessment.id}" data-dimension="${finding.dimension}">Create owned action</button>` : ""}</div>`).join("")}</article>`).join("")}</div>
    </section>`;
}

function productView(value: ProductWorkspace): string {
  return `<header class="hero compact"><div><p class="eyebrow">Product workflow</p><h2>Truth, ICP, readiness.</h2><p>Each conclusion remains explainable, reviewable, and local.</p></div><button type="button" class="danger" data-action="reset-workspace">Reset local workspace</button></header>
    ${recovery()}${productTruth(value)}${evidenceSection(value)}${claimSection(value)}${icpSection(value)}${assessmentSection(value)}`;
}

function render(): void {
  document.querySelector<HTMLElement>("#sidebar")!.innerHTML = nav();
  main.innerHTML = workspace
    ? page === "home"
      ? homeView(workspace)
      : page === "product"
        ? productView(workspace)
        : signalsController?.render(page) ?? '<section class="state loading" role="status"><strong>Loading Signals Inbox</strong></section>'
    : emptyWorkspace();
}

function rolesFrom(form: FormData): IcpRoles {
  return {
    users: lines(form.get("users")), economicBuyers: lines(form.get("economicBuyers")),
    decisionMakers: [], approvers: [], influencers: [], champions: lines(form.get("champions")),
    blockers: lines(form.get("blockers")), partners: [], maintainers: [], contributors: [],
  };
}

document.addEventListener("click", (event) => {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>("button");
  if (!button) return;
  const targetPage = button.dataset.nav;
  if (targetPage === "home" || targetPage === "product" || targetPage === "signals" || targetPage === "market") {
    page = targetPage;
    if (targetPage === "signals" || targetPage === "market") {
      void signalsController?.load().then(() => { render(); main.focus(); });
    } else {
      render();
      main.focus();
    }
    return;
  }
  if (button.dataset.signalAction && signalsController) {
    void signalsController.click(button).then((message) => {
      render();
      if (message) announce(message);
    }).catch((error: unknown) => {
      render();
      announce(`Signal action failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    });
    return;
  }
  const action = button.dataset.action;
  if (action === "retry-render") { lastFailure = undefined; void refresh(); }
  if (action === "reset-workspace") { if (confirm("Delete this local workspace from this desktop profile?")) { store.clearActiveWorkspace(); workspace = undefined; page = "home"; render(); announce("Local workspace deleted"); } }
  if (!workspace || !button.dataset.id) {
    if (action === "create-gap-action" && workspace) {
      const dimension = button.dataset.dimension ?? "readiness";
      void act(async () => { workspace = await service.createAction(workspace!.id, { source: "assessment_gap", sourceId: button.dataset.assessment ?? "", title: `Improve ${dimension}`, owner: workspace!.createdBy, kind: "action" }); }, "Owned readiness action created");
    }
    return;
  }
  const id = button.dataset.id;
  if (action === "review-evidence" || action === "reject-evidence") {
    const reviewer = prompt("Named evidence reviewer");
    if (reviewer) void act(async () => { workspace = await service.reviewEvidence(workspace!.id, id, reviewer, action === "review-evidence"); }, "Evidence review recorded");
  }
  if (action === "review-icp" || action === "reject-icp") {
    const reviewer = prompt("Named ICP reviewer");
    if (reviewer) void act(async () => { workspace = await service.reviewIcp(workspace!.id, id, reviewer, action === "review-icp"); }, "ICP review recorded");
  }
  if (action === "approve-claim" || action === "reject-claim") {
    const reviewer = prompt("Named claim reviewer");
    if (reviewer) void act(async () => {
      workspace = action === "approve-claim"
        ? await service.approveClaim(workspace!.id, id, reviewer)
        : await service.rejectClaim(workspace!.id, id, reviewer);
    }, action === "approve-claim" ? "Claim approved" : "Claim rejected");
  }
});

document.addEventListener("submit", (event) => {
  event.preventDefault();
  const formElement = event.target as HTMLFormElement;
  const kind = formElement.dataset.form;
  const form = new FormData(formElement);
  if (kind?.startsWith("signals-") && signalsController) {
    void signalsController.submit(formElement).then((message) => {
      render();
      if (message) announce(message);
      formElement.reset();
    }).catch((error: unknown) => {
      render();
      announce(`Signal operation failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    });
    return;
  }
  if (kind === "create-workspace") void act(async () => {
    workspace = await service.createWorkspace({ identity: { name: String(form.get("name")), description: String(form.get("description")), lifecycle: String(form.get("lifecycle")) as "concept", supportedEnvironments: lines(form.get("environments")) }, createdBy: String(form.get("createdBy")) });
    page = "product";
  }, "Product workspace created");
  if (!workspace) return;
  if (kind === "update-product") void act(async () => {
    workspace = await service.updateProductTruth(workspace!.id, { identity: { ...workspace!.product.identity, name: String(form.get("name")), description: String(form.get("description")) }, capabilities: lines(form.get("capabilities")), limitations: lines(form.get("limitations")), positioning: String(form.get("positioning")), alternatives: lines(form.get("alternatives")), differentiation: lines(form.get("differentiation")), pricing: workspace!.product.pricing, packaging: workspace!.product.packaging, offers: lines(form.get("offers")), callsToAction: lines(form.get("callsToAction")), brandVoice: workspace!.product.brandVoice, terminology: workspace!.product.terminology, accessibilityConstraints: workspace!.product.accessibilityConstraints, updatedBy: String(form.get("updatedBy")) });
  }, "Product truth revision saved");
  if (kind === "add-evidence") void act(async () => {
    const origin = String(form.get("origin")) as "observed";
    workspace = await service.addEvidence(workspace!.id, { title: String(form.get("title")), summary: String(form.get("summary")), origin, observedAt: new Date(String(form.get("observedAt"))).toISOString(), freshnessReviewAt: new Date(String(form.get("freshnessReviewAt"))).toISOString(), reviewStatus: "suggested", confidence: String(form.get("confidence")) as "medium" });
  }, "Evidence added for review");
  if (kind === "add-claim") void act(async () => {
    const rationale = String(form.get("rationale")).trim();
    workspace = await service.addClaim(workspace!.id, {
      statement: String(form.get("statement")),
      evidenceIds: form.getAll("evidenceIds").map(String),
      prohibitedContexts: lines(form.get("prohibitedContexts")),
      ...(rationale ? { rationale } : {}),
    });
  }, "Proposed claim added");
  if (kind === "revise-claim") void act(async () => {
    const rationale = String(form.get("rationale")).trim();
    workspace = await service.reviseClaim(workspace!.id, String(form.get("id")), {
      statement: String(form.get("statement")),
      evidenceIds: form.getAll("evidenceIds").map(String),
      prohibitedContexts: lines(form.get("prohibitedContexts")),
      ...(rationale ? { rationale } : {}),
    });
  }, "Claim revision saved for review");
  if (kind === "add-icp") void act(async () => {
    const dimensions = Object.fromEntries(ICP_DIMENSIONS.map((dimension) => [dimension, { rating: asRating(form.get(`${dimension}.rating`)), rationale: String(form.get(`${dimension}.rationale`)), evidenceIds: workspace!.evidence.filter((item) => item.reviewStatus === "reviewed" && item.origin !== "generated_suggestion").map((item) => item.id), confidence: String(form.get(`${dimension}.confidence`)) as "medium" }])) as unknown as IcpHypothesis["dimensions"];
    const origin = String(form.get("origin")) as "human" | "generated_suggestion";
    workspace = await service.addIcpHypothesis(workspace!.id, { name: String(form.get("name")), summary: String(form.get("summary")), status: origin === "generated_suggestion" ? "suggested" : "candidate", origin, reviewStatus: "suggested", roles: rolesFrom(form), dimensions, disqualifiers: lines(form.get("disqualifiers")), antiIcpConditions: lines(form.get("antiIcp")), assumptions: lines(form.get("assumptions")), contradictions: lines(form.get("contradictions")), evidenceIds: workspace!.evidence.filter((item) => item.reviewStatus === "reviewed" && item.origin !== "generated_suggestion").map((item) => item.id), confidence: "medium", owner: String(form.get("owner")), nextValidationAction: String(form.get("nextValidationAction")), changeConditions: lines(form.get("changeConditions")), experiments: [] });
  }, "ICP hypothesis added");
  if (kind === "add-experiment") void act(async () => {
    workspace = await service.addExperiment(workspace!.id, String(form.get("hypothesisId")), {
      id: crypto.randomUUID(),
      hypothesis: String(form.get("hypothesis")),
      method: String(form.get("method")),
      owner: String(form.get("owner")),
      startsAt: new Date(String(form.get("startsAt"))).toISOString(),
      observationEndsAt: new Date(String(form.get("observationEndsAt"))).toISOString(),
      successCriteria: lines(form.get("successCriteria")),
      failureCriteria: lines(form.get("failureCriteria")),
      decisionCriteria: lines(form.get("decisionCriteria")),
      status: "planned",
    });
  }, "ICP validation experiment added");
  if (kind === "select-icp") void act(async () => { workspace = await service.selectPrimaryIcp(workspace!.id, String(form.get("id")), String(form.get("reviewer")), String(form.get("rationale"))); }, "Primary ICP selected with revision history");
  if (kind === "add-assessment") void act(async () => {
    const findings: ReadinessFinding[] = assessmentDimensions.map((dimension) => ({ dimension, rating: asRating(form.get(`${dimension}.rating`)), rationale: String(form.get(`${dimension}.rationale`)), evidenceIds: workspace!.evidence.filter((item) => item.reviewStatus === "reviewed").map((item) => item.id), confidence: String(form.get(`${dimension}.confidence`)) as "medium", freshness: String(form.get(`${dimension}.freshness`)) as "unknown", owner: String(form.get("owner")), verification: String(form.get(`${dimension}.verification`)), recommendation: String(form.get(`${dimension}.recommendation`)) }));
    workspace = await service.recordAssessment(workspace!.id, findings);
  }, "Explained marketability assessment saved");
});

void refresh();
