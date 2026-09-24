import { ICP_DIMENSIONS, type IcpDimension, type IcpHypothesis, type IcpRoles } from "../../../src/product-core/domain/icp.js";
import type { ProductWorkspace } from "../../../src/product-core/domain/workspace.js";
import { ProductRevisionService } from "../../../src/product-core/services/product-revision-service.js";
import type { CampaignBrief, CampaignWorkspace, ChannelKind, ContentBrief } from "../../../src/campaigns/domain/campaign.js";
import { CampaignRevisionService } from "../../../src/campaigns/services/campaign-revision-service.js";
import { LocalStorageCampaignWorkspaceStore } from "./local-storage-campaign-workspace-store.js";
import { LocalStorageProductWorkspaceStore } from "./local-storage-product-workspace-store.js";

const productStore = new LocalStorageProductWorkspaceStore();
const campaignStore = new LocalStorageCampaignWorkspaceStore();
const productRevision = new ProductRevisionService(productStore);
const campaignRevision = new CampaignRevisionService(campaignStore, productStore);
const main = document.querySelector<HTMLElement>("#main");
const sidebar = document.querySelector<HTMLElement>("#sidebar");
const live = document.querySelector<HTMLElement>("#live-region");

let enhancing = false;
let queued = false;

const dimensionLabels: Record<IcpDimension, string> = {
  problemIntensity: "Problem intensity",
  urgency: "Urgency",
  productFit: "Product fit",
  timeToValue: "Time to value",
  access: "Reachable access",
  proof: "Available proof",
  adoptionFriction: "Adoption friction",
  commercialViability: "Commercial viability",
  retentionPotential: "Retention potential",
  strategicFit: "Strategic fit",
  evidenceQuality: "Evidence quality",
};
const channels: readonly ChannelKind[] = ["linkedin", "website", "github_release"];
const channelLabels: Record<ChannelKind, string> = { linkedin: "LinkedIn", website: "Website", github_release: "GitHub release" };

const escapeHtml = (value: unknown): string => String(value ?? "")
  .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;").replaceAll("'", "&#039;");
const label = (value: string): string => value.replaceAll("_", " ");
const lines = (value: FormDataEntryValue | null): string[] => String(value ?? "").split(/[,\n]/).map((item) => item.trim()).filter(Boolean);
const checked = (form: FormData, name: string): string[] => form.getAll(name).map(String).filter(Boolean);
const humanDate = (value?: string): string => value ? new Date(value).toLocaleString() : "Not recorded";

function announce(message: string): void {
  if (live) live.textContent = message;
}

function activeNav(): string | undefined {
  return sidebar?.querySelector<HTMLButtonElement>('nav button[aria-current="page"]')?.dataset.nav;
}

function queueEnhance(): void {
  if (queued) return;
  queued = true;
  queueMicrotask(() => {
    queued = false;
    void enhance();
  });
}

async function enhance(): Promise<void> {
  if (!main || enhancing) return;
  enhancing = true;
  try {
    const workspaceId = productStore.activeWorkspaceId();
    if (!workspaceId) return;
    const product = await productStore.load(workspaceId);
    if (!product) return;
    const nav = activeNav();
    if (nav === "product") enhanceProduct(product);
    if (nav === "campaigns" || nav === "studio") {
      const campaigns = await campaignStore.load(workspaceId);
      if (campaigns) enhanceCampaigns(product, { ...campaigns, contentBriefs: campaigns.contentBriefs ?? [] }, nav);
    }
  } finally {
    enhancing = false;
  }
}

function enhanceProduct(workspace: ProductWorkspace): void {
  enhanceProductTruth(workspace);
  enhanceIcps(workspace);
}

function enhanceProductTruth(workspace: ProductWorkspace): void {
  if (!main) return;
  const panel = main.querySelector<HTMLElement>('section[aria-labelledby="truth-heading"]');
  if (!panel || panel.querySelector("[data-ux-product-truth-revision]")) return;
  const legacy = panel.querySelector<HTMLFormElement>('form[data-form="update-product"]');
  if (legacy) legacy.hidden = true;
  const p = workspace.product;
  const wrapper = document.createElement("div");
  wrapper.dataset.uxProductTruthRevision = "true";
  wrapper.innerHTML = `<div class="state"><strong>Revision-aware Product Truth editor</strong><span>Every modeled user-controlled field is editable here. Saving records who changed what and why without rewriting prior authority.</span></div>
    <form data-ux-revision-form="product-truth">
      <div data-ux-revision-error aria-live="polite"></div>
      <div class="two"><label>Product name<input name="name" required value="${escapeHtml(p.identity.name)}"></label><label>Named editor<input name="editor" required value="${escapeHtml(p.updatedBy || workspace.createdBy)}"></label></div>
      <label>Revision rationale<textarea name="rationale" required rows="2" placeholder="Why is Product Truth changing now?"></textarea></label>
      <label>Description<textarea name="description" required rows="3">${escapeHtml(p.identity.description)}</textarea></label>
      <div class="two"><label>Lifecycle<select name="lifecycle">${["concept", "prototype", "private_beta", "public_beta", "general_availability", "retired"].map((value) => `<option value="${value}" ${p.identity.lifecycle === value ? "selected" : ""}>${escapeHtml(label(value))}</option>`).join("")}</select></label><label>Supported environments<textarea name="supportedEnvironments" rows="3">${escapeHtml(p.identity.supportedEnvironments.join("\n"))}</textarea></label></div>
      <div class="two"><label>Capabilities<textarea name="capabilities" rows="4">${escapeHtml(p.capabilities.join("\n"))}</textarea></label><label>Limitations<textarea name="limitations" rows="4">${escapeHtml(p.limitations.join("\n"))}</textarea></label></div>
      <label>Positioning<textarea name="positioning" rows="3">${escapeHtml(p.positioning)}</textarea></label>
      <div class="two"><label>Alternatives<textarea name="alternatives" rows="3">${escapeHtml(p.alternatives.join("\n"))}</textarea></label><label>Differentiation<textarea name="differentiation" rows="3">${escapeHtml(p.differentiation.join("\n"))}</textarea></label></div>
      <div class="two"><label>Pricing<textarea name="pricing" rows="3">${escapeHtml(p.pricing.join("\n"))}</textarea></label><label>Packaging<textarea name="packaging" rows="3">${escapeHtml(p.packaging.join("\n"))}</textarea></label></div>
      <div class="two"><label>Offers<textarea name="offers" rows="3">${escapeHtml(p.offers.join("\n"))}</textarea></label><label>Calls to action<textarea name="callsToAction" rows="3">${escapeHtml(p.callsToAction.join("\n"))}</textarea></label></div>
      <div class="two"><label>Brand voice<textarea name="brandVoice" rows="3">${escapeHtml(p.brandVoice.join("\n"))}</textarea></label><label>Accessibility constraints<textarea name="accessibilityConstraints" rows="3">${escapeHtml(p.accessibilityConstraints.join("\n"))}</textarea></label></div>
      <label>Terminology, one term = preferred wording per line<textarea name="terminology" rows="4" placeholder="ICP = ideal customer profile">${escapeHtml(Object.entries(p.terminology).map(([term, wording]) => `${term} = ${wording}`).join("\n"))}</textarea></label>
      <button class="primary" type="submit">Save Product Truth revision</button>
    </form>${productTruthHistory(workspace)}`;
  if (legacy) legacy.insertAdjacentElement("afterend", wrapper); else panel.append(wrapper);
}

function productTruthHistory(workspace: ProductWorkspace): string {
  const history = workspace.product.history ?? [];
  return `<details data-ux-revision-history><summary>Product Truth revision history (${history.length})</summary>${history.length
    ? [...history].reverse().map((revision) => `<article class="record"><strong>Revision ${revision.revision}</strong><p>${escapeHtml(revision.rationale)}</p><small>${humanDate(revision.changedAt)} · ${escapeHtml(revision.changedBy)} · Changed: ${escapeHtml(revision.changedFields.join(", "))}</small></article>`).join("")
    : `<p>No prior Product Truth revisions are recorded yet.</p>`}</details>`;
}

function enhanceIcps(workspace: ProductWorkspace): void {
  if (!main) return;
  const container = main.querySelector<HTMLElement>(".icp-cards");
  if (!container) return;
  const cards = container.querySelectorAll<HTMLElement>(":scope > article.record");
  cards.forEach((card, index) => {
    const hypothesis = workspace.icpHypotheses[index];
    if (!hypothesis) return;
    card.dataset.uxIcpId = hypothesis.id;
    if (!card.querySelector("[data-ux-icp-revision]")) card.insertAdjacentHTML("beforeend", icpRevisionSurface(workspace, hypothesis));
    enhanceExperimentCards(card, hypothesis);
  });
}

function roleField(name: keyof IcpRoles, labelText: string, values: readonly string[]): string {
  return `<label>${escapeHtml(labelText)}<textarea name="${name}" rows="2">${escapeHtml(values.join("\n"))}</textarea></label>`;
}

function icpRevisionSurface(workspace: ProductWorkspace, hypothesis: IcpHypothesis): string {
  const history = hypothesis.history ?? [];
  const reviewedEvidence = workspace.evidence.filter((item) => item.reviewStatus === "reviewed" && item.origin !== "generated_suggestion");
  return `<details data-ux-icp-revision><summary>Correct ICP and inspect revision history</summary>
    <p class="guidance">Editing a selected ICP does not silently replace selected authority. The corrected hypothesis returns to candidate review and must receive named review before selection again.</p>
    <form data-ux-revision-form="icp" data-record-id="${escapeHtml(hypothesis.id)}"><div data-ux-revision-error aria-live="polite"></div>
      <div class="two"><label>Candidate name<input name="name" required value="${escapeHtml(hypothesis.name)}"></label><label>Owner<input name="owner" required value="${escapeHtml(hypothesis.owner)}"></label></div>
      <label>Named editor<input name="editor" required value="${escapeHtml(workspace.createdBy)}"></label><label>Revision rationale<textarea name="rationale" required rows="2"></textarea></label>
      <label>Summary<textarea name="summary" required rows="3">${escapeHtml(hypothesis.summary)}</textarea></label>
      <div class="two">${roleField("users", "Primary users", hypothesis.roles.users)}${roleField("economicBuyers", "Economic buyers", hypothesis.roles.economicBuyers)}</div>
      <div class="two">${roleField("decisionMakers", "Decision makers", hypothesis.roles.decisionMakers)}${roleField("approvers", "Approvers", hypothesis.roles.approvers)}</div>
      <div class="two">${roleField("influencers", "Influencers", hypothesis.roles.influencers)}${roleField("champions", "Champions", hypothesis.roles.champions)}</div>
      <div class="two">${roleField("blockers", "Blockers", hypothesis.roles.blockers)}${roleField("partners", "Partners", hypothesis.roles.partners)}</div>
      <div class="two">${roleField("maintainers", "Maintainers", hypothesis.roles.maintainers)}${roleField("contributors", "Contributors", hypothesis.roles.contributors)}</div>
      <div class="two"><label>Disqualifiers<textarea name="disqualifiers" required rows="3">${escapeHtml(hypothesis.disqualifiers.join("\n"))}</textarea></label><label>Anti-ICP conditions<textarea name="antiIcpConditions" rows="3">${escapeHtml(hypothesis.antiIcpConditions.join("\n"))}</textarea></label></div>
      <div class="two"><label>Assumptions<textarea name="assumptions" rows="3">${escapeHtml(hypothesis.assumptions.join("\n"))}</textarea></label><label>Known contradictions<textarea name="contradictions" rows="3">${escapeHtml(hypothesis.contradictions.join("\n"))}</textarea></label></div>
      <fieldset><legend>Reviewed evidence references</legend>${reviewedEvidence.map((item) => `<label class="choice"><input type="checkbox" name="evidenceIds" value="${escapeHtml(item.id)}" ${hypothesis.evidenceIds.includes(item.id) ? "checked" : ""}>${escapeHtml(item.title)}</label>`).join("") || `<span>No reviewed evidence is available.</span>`}</fieldset>
      <div class="two"><label>Confidence<select name="confidence">${["low", "medium", "high"].map((value) => `<option ${hypothesis.confidence === value ? "selected" : ""}>${value}</option>`).join("")}</select></label><label>Next validation action<input name="nextValidationAction" required value="${escapeHtml(hypothesis.nextValidationAction)}"></label></div>
      <label>Change conditions<textarea name="changeConditions" rows="2">${escapeHtml(hypothesis.changeConditions.join("\n"))}</textarea></label>
      <div class="dimension-list">${ICP_DIMENSIONS.map((dimension) => dimensionMarkup(dimension, hypothesis)).join("")}</div>
      <button type="submit">Save ICP correction for re-review</button>
    </form>
    <div data-ux-history-list>${history.length ? [...history].reverse().map((revision) => `<article class="record"><strong>Revision ${revision.revision}</strong><p>${escapeHtml(revision.rationale)}</p><small>${humanDate(revision.changedAt)} · ${escapeHtml(revision.changedBy)}${revision.changedFields?.length ? ` · Changed: ${escapeHtml(revision.changedFields.join(", "))}` : ""}</small></article>`).join("") : `<p>No prior ICP correction history is recorded.</p>`}</div>
  </details>`;
}

function dimensionMarkup(dimension: IcpDimension, hypothesis: IcpHypothesis): string {
  const value = hypothesis.dimensions[dimension];
  return `<fieldset class="dimension"><legend>${dimensionLabels[dimension]}</legend><div class="three"><label>Rating<select name="${dimension}.rating">${[0, 1, 2, 3, 4].map((rating) => `<option value="${rating}" ${value.rating === rating ? "selected" : ""}>${rating}</option>`).join("")}</select></label><label>Confidence<select name="${dimension}.confidence">${["low", "medium", "high"].map((confidence) => `<option ${value.confidence === confidence ? "selected" : ""}>${confidence}</option>`).join("")}</select></label><label>Evidence references<input value="${escapeHtml(value.evidenceIds.length)} linked" disabled></label></div><label>Rationale<textarea name="${dimension}.rationale" required rows="2">${escapeHtml(value.rationale)}</textarea></label></fieldset>`;
}

function enhanceExperimentCards(card: HTMLElement, hypothesis: IcpHypothesis): void {
  const experimentCards = card.querySelectorAll<HTMLElement>(".experiment-surface .cards > article.record");
  experimentCards.forEach((experimentCard, index) => {
    const experiment = hypothesis.experiments[index];
    if (!experiment || experimentCard.querySelector("[data-ux-experiment-lifecycle]")) return;
    experimentCard.dataset.uxExperimentId = experiment.id;
    experimentCard.insertAdjacentHTML("beforeend", experimentLifecycleMarkup(hypothesis.id, experiment));
  });
}

function experimentLifecycleMarkup(hypothesisId: string, experiment: IcpHypothesis["experiments"][number]): string {
  if (experiment.status === "completed") return `<div data-ux-experiment-lifecycle class="state"><strong>Outcome recorded</strong><span>${escapeHtml(experiment.outcomeSummary ?? "No summary recorded")}</span><small>Evidence: ${escapeHtml(experiment.outcomeEvidence?.join(" · ") ?? "None")} · Decision: ${escapeHtml(experiment.outcomeDecision ?? "None")} · ${escapeHtml(experiment.completedBy ?? "Unknown actor")}</small></div>`;
  if (experiment.status === "cancelled") return `<div data-ux-experiment-lifecycle class="state warning"><strong>Experiment cancelled</strong><span>${escapeHtml(experiment.cancellationRationale ?? "No rationale recorded")}</span><small>${escapeHtml(experiment.cancelledBy ?? "Unknown actor")} · ${humanDate(experiment.cancelledAt)}</small></div>`;
  return `<div data-ux-experiment-lifecycle>
    ${experiment.status === "planned" ? `<form data-ux-revision-form="experiment-start" data-hypothesis-id="${escapeHtml(hypothesisId)}" data-record-id="${escapeHtml(experiment.id)}"><div data-ux-revision-error aria-live="polite"></div><label>Named starter<input name="actor" required value="${escapeHtml(experiment.owner)}"></label><button type="submit">Start experiment</button></form>` : ""}
    ${experiment.status === "active" ? `<form data-ux-revision-form="experiment-complete" data-hypothesis-id="${escapeHtml(hypothesisId)}" data-record-id="${escapeHtml(experiment.id)}"><div data-ux-revision-error aria-live="polite"></div><label>Named completer<input name="actor" required value="${escapeHtml(experiment.owner)}"></label><label>Outcome evidence, one item per line<textarea name="evidence" required rows="3"></textarea></label><label>Outcome summary<textarea name="summary" required rows="3"></textarea></label><label>Decision from this evidence<textarea name="decision" required rows="2"></textarea></label><button class="primary" type="submit">Complete with outcome evidence</button></form>` : ""}
    <details><summary>Cancel experiment</summary><form data-ux-revision-form="experiment-cancel" data-hypothesis-id="${escapeHtml(hypothesisId)}" data-record-id="${escapeHtml(experiment.id)}"><div data-ux-revision-error aria-live="polite"></div><label>Named actor<input name="actor" required value="${escapeHtml(experiment.owner)}"></label><label>Cancellation rationale<textarea name="rationale" required rows="2"></textarea></label><button type="submit">Cancel with rationale</button></form></details>
  </div>`;
}

function enhanceCampaigns(product: ProductWorkspace, workspace: CampaignWorkspace, nav: string): void {
  if (nav === "campaigns") {
    enhanceCampaignCards(product, workspace);
    enhanceContentBriefCards(workspace);
  }
  if (nav === "studio") enhanceVariantCards(product, workspace);
}

function enhanceCampaignCards(product: ProductWorkspace, workspace: CampaignWorkspace): void {
  if (!main) return;
  const panel = main.querySelector("#campaign-list-heading")?.closest("section.panel");
  if (!panel) return;
  const cards = panel.querySelectorAll<HTMLElement>(".cards > article.record");
  const ordered = [...workspace.campaigns].reverse();
  cards.forEach((card, index) => {
    const campaign = ordered[index];
    if (!campaign || card.querySelector("[data-ux-campaign-revision]")) return;
    card.dataset.authoritativeRecordId = campaign.id;
    card.insertAdjacentHTML("beforeend", campaignRevisionMarkup(product, campaign));
  });
}

function campaignRevisionMarkup(product: ProductWorkspace, campaign: CampaignBrief): string {
  const reviewedEvidence = product.evidence.filter((item) => item.reviewStatus === "reviewed" && item.origin !== "generated_suggestion");
  const approvedClaims = product.claims.filter((item) => item.status === "approved");
  const selectedIcps = product.icpHypotheses.filter((item) => item.status === "selected" && item.reviewStatus === "reviewed");
  return `<details data-ux-campaign-revision><summary>Correct campaign and inspect revision history</summary>
    <p class="guidance">A correction creates a new Campaign version. Approved authority is invalidated until the corrected version receives named re-review.</p>
    <form data-ux-revision-form="campaign" data-record-id="${escapeHtml(campaign.id)}"><div data-ux-revision-error aria-live="polite"></div>
      <div class="two"><label>Campaign title<input name="title" required value="${escapeHtml(campaign.title)}"></label><label>Named editor<input name="editor" required value="${escapeHtml(campaign.owner)}"></label></div><label>Revision rationale<textarea name="rationale" required rows="2"></textarea></label>
      <label>Objective<textarea name="objective" required rows="2">${escapeHtml(campaign.objective)}</textarea></label><div class="two"><label>Primary outcome<input name="primaryOutcome" required value="${escapeHtml(campaign.primaryOutcome)}"></label><label>Primary audience<input name="primaryAudience" required value="${escapeHtml(campaign.primaryAudience)}"></label></div>
      <div class="two"><label>Audience authority<select name="audienceKind"><option value="test_audience" ${campaign.audienceKind === "test_audience" ? "selected" : ""}>Deliberate test audience</option><option value="selected_icp" ${campaign.audienceKind === "selected_icp" ? "selected" : ""}>Selected ICP</option></select></label><label>Selected ICP reference<select name="icpHypothesisId"><option value="">No ICP reference</option>${selectedIcps.map((item) => `<option value="${escapeHtml(item.id)}" ${campaign.icpHypothesisId === item.id ? "selected" : ""}>${escapeHtml(item.name)}</option>`).join("")}</select></label></div>
      <div class="two"><label>Problem<textarea name="problem" required rows="2">${escapeHtml(campaign.problem)}</textarea></label><label>Trigger<textarea name="trigger" required rows="2">${escapeHtml(campaign.trigger)}</textarea></label></div><div class="two"><label>Offer<textarea name="offer" required rows="2">${escapeHtml(campaign.offer)}</textarea></label><label>Call to action<textarea name="callToAction" required rows="2">${escapeHtml(campaign.callToAction)}</textarea></label></div>
      <div class="two"><label>Message hierarchy<textarea name="messageHierarchy" required rows="3">${escapeHtml(campaign.messageHierarchy.join("\n"))}</textarea></label><label>Proof points<textarea name="proof" rows="3">${escapeHtml(campaign.proof.join("\n"))}</textarea></label></div>
      <fieldset><legend>Approved Product Core claims</legend>${approvedClaims.map((claim) => `<label class="choice"><input type="checkbox" name="claimIds" value="${escapeHtml(claim.id)}" ${campaign.claimReferences.some((reference) => reference.claimId === claim.id) ? "checked" : ""}>${escapeHtml(claim.statement)}</label>`).join("") || `<span>No approved claims are currently available.</span>`}</fieldset>
      <fieldset><legend>Reviewed evidence packet</legend>${reviewedEvidence.map((item) => `<label class="choice"><input type="checkbox" name="evidenceIds" value="${escapeHtml(item.id)}" ${campaign.evidenceIds.includes(item.id) ? "checked" : ""}>${escapeHtml(item.title)}</label>`).join("") || `<span>No reviewed evidence is currently available.</span>`}</fieldset>
      <fieldset><legend>Channels</legend>${channels.map((channel) => `<label class="choice"><input type="checkbox" name="channels" value="${channel}" ${campaign.channels.includes(channel) ? "checked" : ""}>${channelLabels[channel]}</label>`).join("")}</fieldset>
      <div class="two"><label>Asset plan<textarea name="assetPlan" rows="3">${escapeHtml(campaign.assetPlan.join("\n"))}</textarea></label><label>Success measures<textarea name="successMeasures" required rows="3">${escapeHtml(campaign.successMeasures.join("\n"))}</textarea></label></div><div class="two"><label>Dependencies<textarea name="dependencies" rows="3">${escapeHtml(campaign.dependencies.join("\n"))}</textarea></label><label>Owner<input name="owner" required value="${escapeHtml(campaign.owner)}"></label></div>
      <button type="submit">Save campaign correction for re-review</button>
    </form>${authorityHistory(campaign.history ?? [], "campaign")}
  </details>`;
}

function enhanceContentBriefCards(workspace: CampaignWorkspace): void {
  if (!main) return;
  main.querySelectorAll<HTMLElement>("[data-ux-content-brief]").forEach((card) => {
    const brief = workspace.contentBriefs?.find((candidate) => candidate.id === card.dataset.recordId);
    if (!brief || card.querySelector("[data-ux-content-revision]")) return;
    card.insertAdjacentHTML("beforeend", contentRevisionMarkup(brief));
  });
}

function contentRevisionMarkup(brief: ContentBrief): string {
  return `<details data-ux-content-revision><summary>Correct content brief and inspect revision history</summary><form data-ux-revision-form="content-brief" data-record-id="${escapeHtml(brief.id)}"><div data-ux-revision-error aria-live="polite"></div><div class="two"><label>Title<input name="title" required value="${escapeHtml(brief.title)}"></label><label>Owner<input name="owner" required value="${escapeHtml(brief.owner)}"></label></div><label>Named editor<input name="editor" required value="${escapeHtml(brief.owner)}"></label><label>Revision rationale<textarea name="rationale" required rows="2"></textarea></label><label>Objective<textarea name="objective" required rows="2">${escapeHtml(brief.objective)}</textarea></label><div class="two"><label>Pillars<textarea name="pillars" required rows="3">${escapeHtml(brief.pillars.join("\n"))}</textarea></label><label>Themes<textarea name="themes" rows="3">${escapeHtml(brief.themes.join("\n"))}</textarea></label></div><div class="two"><label>Deliverables<textarea name="deliverables" required rows="3">${escapeHtml(brief.deliverables.join("\n"))}</textarea></label><label>Source notes<textarea name="sourceNotes" rows="3">${escapeHtml(brief.sourceNotes.join("\n"))}</textarea></label></div><button type="submit">Save content brief correction for re-review</button></form>${authorityHistory(brief.history ?? [], "content brief")}</details>`;
}

function enhanceVariantCards(product: ProductWorkspace, workspace: CampaignWorkspace): void {
  if (!main) return;
  const panel = main.querySelector("#variant-heading")?.closest("section.panel");
  if (!panel) return;
  panel.querySelectorAll<HTMLElement>(".cards > article.record").forEach((card, index) => {
    const variant = workspace.variants[index];
    if (!variant || card.querySelector("[data-ux-variant-revision]")) return;
    card.dataset.uxVariantId = variant.id;
    card.insertAdjacentHTML("beforeend", `<details data-ux-variant-revision><summary>Correct channel variant and inspect revision history</summary><form data-ux-revision-form="variant" data-record-id="${escapeHtml(variant.id)}"><div data-ux-revision-error aria-live="polite"></div><label>Named editor<input name="editor" required value="${escapeHtml(product.createdBy)}"></label><label>Revision rationale<textarea name="rationale" required rows="2"></textarea></label><label>Channel body<textarea name="body" required rows="6">${escapeHtml(variant.body)}</textarea></label><label>Constraints<textarea name="constraints" required rows="3">${escapeHtml(variant.constraints.join("\n"))}</textarea></label><button type="submit">Save channel correction for re-review</button></form>${authorityHistory(variant.history ?? [], "channel variant")}</details>`);
  });
}

function authorityHistory(history: readonly { version: number; changedAt: string; changedBy: string; rationale: string; changedFields: readonly string[] }[], kind: string): string {
  return `<div data-ux-history-list>${history.length ? [...history].reverse().map((revision) => `<article class="record"><strong>${escapeHtml(kind)} version ${revision.version}</strong><p>${escapeHtml(revision.rationale)}</p><small>${humanDate(revision.changedAt)} · ${escapeHtml(revision.changedBy)} · Changed: ${escapeHtml(revision.changedFields.join(", "))}</small></article>`).join("") : `<p>No prior ${escapeHtml(kind)} correction history is recorded.</p>`}</div>`;
}

function rolesFrom(form: FormData): IcpRoles {
  return {
    users: lines(form.get("users")), economicBuyers: lines(form.get("economicBuyers")), decisionMakers: lines(form.get("decisionMakers")), approvers: lines(form.get("approvers")),
    influencers: lines(form.get("influencers")), champions: lines(form.get("champions")), blockers: lines(form.get("blockers")), partners: lines(form.get("partners")),
    maintainers: lines(form.get("maintainers")), contributors: lines(form.get("contributors")),
  };
}

function parseTerminology(value: FormDataEntryValue | null): Readonly<Record<string, string>> {
  const entries = String(value ?? "").split("\n").map((entry) => entry.trim()).filter(Boolean).map((entry) => {
    const separator = entry.indexOf("=");
    if (separator <= 0 || separator === entry.length - 1) throw new Error("Terminology lines must use term = preferred wording");
    return [entry.slice(0, separator).trim(), entry.slice(separator + 1).trim()] as const;
  });
  return Object.fromEntries(entries);
}

function asRating(value: FormDataEntryValue | null): 0 | 1 | 2 | 3 | 4 {
  const rating = Number(value);
  if (rating === 0 || rating === 1 || rating === 2 || rating === 3 || rating === 4) return rating;
  throw new Error("ICP dimension rating must be between 0 and 4");
}

function inlineFailure(form: HTMLFormElement, error: unknown): void {
  const region = form.querySelector<HTMLElement>("[data-ux-revision-error]");
  const detail = error instanceof Error ? error.message : "Unknown local revision error";
  if (region) region.innerHTML = `<section class="state error" role="alert"><strong>Correction was not saved.</strong><span>${escapeHtml(detail)} Your entered values are still here.</span></section>`;
  announce(`Correction failed: ${detail}`);
}

function inlineSavedRevalidationFailure(form: HTMLFormElement, error: unknown, subject: string): void {
  const region = form.querySelector<HTMLElement>("[data-ux-revision-error]");
  const detail = error instanceof Error ? error.message : "Unknown local revalidation error";
  if (region) region.innerHTML = `<section class="state warning" role="alert"><strong>${escapeHtml(subject)} was saved, but dependent Campaign approval revalidation did not complete.</strong><span>${escapeHtml(detail)} The saved correction is intact. Reopen Product Core or Campaigns to retry revalidation.</span></section>`;
  announce(`${subject} saved; dependent Campaign approval revalidation failed: ${detail}`);
}

function triggerProductRefresh(): void {
  const button = document.createElement("button");
  button.type = "button";
  button.hidden = true;
  button.dataset.action = "retry-render";
  document.body.append(button);
  button.click();
  button.remove();
}

function triggerCampaignRefresh(): void {
  const nav = activeNav();
  if (nav === "campaigns" || nav === "studio") sidebar?.querySelector<HTMLButtonElement>(`button[data-nav="${nav}"]`)?.click();
}

new MutationObserver(queueEnhance).observe(main ?? document.body, { childList: true, subtree: true });
new MutationObserver(queueEnhance).observe(sidebar ?? document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["aria-current"] });
queueEnhance();

document.addEventListener("submit", (event) => {
  const form = event.target as HTMLFormElement;
  const kind = form.dataset.uxRevisionForm;
  if (!kind) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  const workspaceId = productStore.activeWorkspaceId();
  if (!workspaceId) return;
  const data = new FormData(form);
  const id = form.dataset.recordId;
  const hypothesisId = form.dataset.hypothesisId;

  if (kind === "product-truth") {
    void Promise.resolve().then(() => productRevision.reviseProductTruth(workspaceId, {
      identity: {
        name: String(data.get("name")), description: String(data.get("description")),
        lifecycle: String(data.get("lifecycle")) as ProductWorkspace["product"]["identity"]["lifecycle"], supportedEnvironments: lines(data.get("supportedEnvironments")),
      },
      capabilities: lines(data.get("capabilities")), limitations: lines(data.get("limitations")), positioning: String(data.get("positioning")), alternatives: lines(data.get("alternatives")), differentiation: lines(data.get("differentiation")),
      pricing: lines(data.get("pricing")), packaging: lines(data.get("packaging")), offers: lines(data.get("offers")), callsToAction: lines(data.get("callsToAction")), brandVoice: lines(data.get("brandVoice")),
      terminology: parseTerminology(data.get("terminology")), accessibilityConstraints: lines(data.get("accessibilityConstraints")), updatedBy: String(data.get("editor")), rationale: String(data.get("rationale")),
    })).then(() => campaignRevision.revalidateProductAuthority(workspaceId).then(() => {
      announce("Product Truth revision saved with history; dependent Campaign authority was revalidated");
      triggerProductRefresh();
    }, (error: unknown) => inlineSavedRevalidationFailure(form, error, "Product Truth revision")))
      .catch((error: unknown) => inlineFailure(form, error));
    return;
  }

  if (kind === "icp" && id) {
    void productStore.load(workspaceId).then((workspace) => {
      const hypothesis = workspace?.icpHypotheses.find((candidate) => candidate.id === id);
      if (!workspace || !hypothesis) throw new Error("ICP hypothesis not found");
      const dimensions = Object.fromEntries(ICP_DIMENSIONS.map((dimension) => [dimension, {
        rating: asRating(data.get(`${dimension}.rating`)),
        rationale: String(data.get(`${dimension}.rationale`)),
        evidenceIds: hypothesis.dimensions[dimension].evidenceIds,
        confidence: String(data.get(`${dimension}.confidence`)) as "low" | "medium" | "high",
      }])) as unknown as IcpHypothesis["dimensions"];
      return productRevision.reviseIcp(workspaceId, id, {
        editor: String(data.get("editor")), rationale: String(data.get("rationale")), name: String(data.get("name")), summary: String(data.get("summary")), roles: rolesFrom(data), dimensions,
        disqualifiers: lines(data.get("disqualifiers")), antiIcpConditions: lines(data.get("antiIcpConditions")), assumptions: lines(data.get("assumptions")), contradictions: lines(data.get("contradictions")),
        evidenceIds: checked(data, "evidenceIds"), confidence: String(data.get("confidence")) as "low" | "medium" | "high", owner: String(data.get("owner")), nextValidationAction: String(data.get("nextValidationAction")), changeConditions: lines(data.get("changeConditions")),
      });
    }).then(() => campaignRevision.revalidateProductAuthority(workspaceId).then(() => {
      announce("ICP correction saved for named re-review; dependent Campaign authority was revalidated");
      triggerProductRefresh();
    }, (error: unknown) => inlineSavedRevalidationFailure(form, error, "ICP correction")))
      .catch((error: unknown) => inlineFailure(form, error));
    return;
  }

  if (kind === "experiment-start" && id && hypothesisId) {
    void productRevision.startExperiment(workspaceId, hypothesisId, id, String(data.get("actor"))).then(() => { announce("Validation experiment started"); triggerProductRefresh(); }).catch((error: unknown) => inlineFailure(form, error));
    return;
  }
  if (kind === "experiment-complete" && id && hypothesisId) {
    void productRevision.completeExperiment(workspaceId, hypothesisId, id, { actor: String(data.get("actor")), evidence: lines(data.get("evidence")), summary: String(data.get("summary")), decision: String(data.get("decision")) }).then(() => { announce("Validation experiment completed with outcome evidence"); triggerProductRefresh(); }).catch((error: unknown) => inlineFailure(form, error));
    return;
  }
  if (kind === "experiment-cancel" && id && hypothesisId) {
    void productRevision.cancelExperiment(workspaceId, hypothesisId, id, String(data.get("actor")), String(data.get("rationale"))).then(() => { announce("Validation experiment cancelled with rationale"); triggerProductRefresh(); }).catch((error: unknown) => inlineFailure(form, error));
    return;
  }

  if (kind === "campaign" && id) {
    const audienceKind = String(data.get("audienceKind")) as "selected_icp" | "test_audience";
    const icpHypothesisId = String(data.get("icpHypothesisId") ?? "").trim();
    void campaignRevision.reviseCampaign(workspaceId, id, {
      editor: String(data.get("editor")), rationale: String(data.get("rationale")), title: String(data.get("title")), objective: String(data.get("objective")), primaryOutcome: String(data.get("primaryOutcome")), primaryAudience: String(data.get("primaryAudience")), audienceKind,
      ...(audienceKind === "selected_icp" && icpHypothesisId ? { icpHypothesisId } : {}), problem: String(data.get("problem")), trigger: String(data.get("trigger")), offer: String(data.get("offer")), messageHierarchy: lines(data.get("messageHierarchy")), proof: lines(data.get("proof")),
      claimIds: checked(data, "claimIds"), evidenceIds: checked(data, "evidenceIds"), callToAction: String(data.get("callToAction")), channels: checked(data, "channels") as ChannelKind[], assetPlan: lines(data.get("assetPlan")), owner: String(data.get("owner")), successMeasures: lines(data.get("successMeasures")), dependencies: lines(data.get("dependencies")),
    }).then(() => { announce("Campaign correction saved for named re-review"); triggerCampaignRefresh(); }).catch((error: unknown) => inlineFailure(form, error));
    return;
  }
  if (kind === "content-brief" && id) {
    void campaignRevision.reviseContentBrief(workspaceId, id, { editor: String(data.get("editor")), rationale: String(data.get("rationale")), title: String(data.get("title")), objective: String(data.get("objective")), pillars: lines(data.get("pillars")), themes: lines(data.get("themes")), deliverables: lines(data.get("deliverables")), sourceNotes: lines(data.get("sourceNotes")), owner: String(data.get("owner")) }).then(() => { announce("Content brief correction saved for named re-review"); triggerCampaignRefresh(); }).catch((error: unknown) => inlineFailure(form, error));
    return;
  }
  if (kind === "variant" && id) {
    void campaignRevision.reviseVariant(workspaceId, id, { editor: String(data.get("editor")), rationale: String(data.get("rationale")), body: String(data.get("body")), constraints: lines(data.get("constraints")) }).then(() => { announce("Channel variant correction saved for named re-review"); triggerCampaignRefresh(); }).catch((error: unknown) => inlineFailure(form, error));
  }
}, true);