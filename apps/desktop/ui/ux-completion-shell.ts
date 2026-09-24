import type { ContentBrief } from "../../../src/campaigns/domain/campaign.js";
import { CampaignService } from "../../../src/campaigns/services/campaign-service.js";
import type { ReadinessAction } from "../../../src/product-core/domain/assessment.js";
import { ProductCoreService } from "../../../src/product-core/services/product-core-service.js";
import type { SignalConversion, SignalMaterializationContext } from "../../../src/signals/domain/signal.js";
import { LocalStorageCampaignWorkspaceStore } from "./local-storage-campaign-workspace-store.js";
import { LocalStorageProductWorkspaceStore } from "./local-storage-product-workspace-store.js";
import { LocalStorageSignalsInboxStore } from "./local-storage-signals-inbox-store.js";

const productStore = new LocalStorageProductWorkspaceStore();
const campaignStore = new LocalStorageCampaignWorkspaceStore();
const signalsStore = new LocalStorageSignalsInboxStore();
const productService = new ProductCoreService(productStore);
const campaignService = new CampaignService(campaignStore, productStore);
const main = document.querySelector<HTMLElement>("#main");
const sidebar = document.querySelector<HTMLElement>("#sidebar");
const live = document.querySelector<HTMLElement>("#live-region");

type DestinationKind = SignalConversion["kind"];
type DestinationTarget = Readonly<{ context: SignalMaterializationContext; recordId: string; kind: DestinationKind }>;

let pendingTarget: DestinationTarget | undefined;
let enhancing = false;
let queued = false;
let productSuccess: string | undefined;
let campaignSuccess: string | undefined;

const escapeHtml = (value: unknown): string => String(value ?? "")
  .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;").replaceAll("'", "&#039;");
const humanDate = (value?: string): string => value ? new Date(value).toLocaleString() : "Not recorded";
const label = (value: string): string => value.replaceAll("_", " ");
const tone = (status: string): string =>
  ["completed", "approved"].includes(status) ? "implemented"
    : ["open", "in_progress", "draft", "in_review", "changes_requested", "approval_invalidated"].includes(status) ? "warning"
      : ["dismissed", "cancelled", "rejected"].includes(status) ? "error"
        : "neutral";
const pill = (status: string): string => `<span class="pill ${tone(status)}">${escapeHtml(label(status))}</span>`;

function announce(message: string): void {
  if (live) live.textContent = message;
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
    await replaceSignalDestinationIdentifiers();
    await decorateHomeNextWork();
    await renderProductActions();
    await renderContentBriefs();
    await focusPendingTarget();
  } finally {
    enhancing = false;
  }
}

function activeNav(): string | undefined {
  return sidebar?.querySelector<HTMLButtonElement>('nav button[aria-current="page"]')?.dataset.nav;
}

function isProductSurface(): boolean {
  return activeNav() === "product" && main?.querySelector(".hero .eyebrow")?.textContent?.trim() === "Product workflow";
}

function isHomeSurface(): boolean {
  return activeNav() === "home" && main?.querySelector(".hero .eyebrow")?.textContent?.trim() === "Home";
}

function isCampaignSurface(): boolean {
  return activeNav() === "campaigns" && main?.querySelector(".hero .eyebrow")?.textContent?.trim() === "Campaigns";
}

function isSignalsSurface(): boolean {
  return activeNav() === "signals" && main?.querySelector(".hero .eyebrow")?.textContent?.trim() === "Signals Inbox";
}

async function decorateHomeNextWork(): Promise<void> {
  if (!main || !isHomeSurface()) return;
  const workspaceId = productStore.activeWorkspaceId();
  if (!workspaceId) return;
  const workspace = await productStore.load(workspaceId);
  if (!workspace) return;
  const action = workspace.actions.find((candidate) => candidate.status === "in_progress")
    ?? workspace.actions.find((candidate) => candidate.status === "open");
  if (!action) return;
  const next = main.querySelector<HTMLElement>("section.panel.next");
  if (!next || next.dataset.uxActionSummary === action.id) return;
  next.dataset.uxActionSummary = action.id;
  next.innerHTML = `<div><p class="eyebrow">Next highest-value Product Core action</p><h3>${escapeHtml(action.title)}</h3><p>Owner: ${escapeHtml(action.owner)} · ${escapeHtml(label(action.status))}${action.verification ? ` · Verify: ${escapeHtml(action.verification)}` : ""}</p></div><button class="primary" type="button" data-ux-action="open-destination" data-context="product_core" data-kind="product_action" data-record-id="${escapeHtml(action.id)}">Open Product Core action</button>`;
}

async function renderProductActions(): Promise<void> {
  if (!main || !isProductSurface() || main.querySelector("[data-ux-readiness-panel]")) return;
  const panel = document.createElement("section");
  panel.className = "panel";
  panel.dataset.uxReadinessPanel = "true";
  panel.innerHTML = `<div class="state loading" role="status"><strong>Loading Product Core actions</strong><span>Reading the authoritative local action lifecycle.</span></div>`;
  main.append(panel);
  const workspaceId = productStore.activeWorkspaceId();
  if (!workspaceId) {
    panel.innerHTML = `<div class="state empty"><strong>No active Product workspace.</strong><span>Readiness actions remain owned by Product Core.</span></div>`;
    return;
  }
  try {
    const workspace = await productStore.load(workspaceId);
    if (!workspace) throw new Error("Product workspace could not be loaded");
    panel.innerHTML = productActionsMarkup(workspace.actions);
  } catch (error) {
    panel.innerHTML = recoveryMarkup("Product Core actions could not be loaded", error, "retry-product-actions");
  }
}

function productActionsMarkup(actions: readonly ReadinessAction[]): string {
  const active = actions.filter((item) => item.status === "open" || item.status === "in_progress");
  const closed = actions.filter((item) => !active.includes(item));
  return `<div class="section-heading"><div><p class="eyebrow">Product Core authority</p><h3>Readiness actions</h3></div>${pill(`${active.length} active`)}</div>
    <p class="guidance">Product Core owns readiness action state. Starting, reassignment, completion, and dismissal require a named human. Completion requires verification evidence or an explicit rationale.</p>
    ${productSuccess ? `<section class="state" data-ux-success><strong>Saved.</strong><span>${escapeHtml(productSuccess)}</span></section>` : ""}
    <div class="cards" data-ux-action-list>${actions.length ? [...active, ...closed].map(actionCard).join("") : `<div class="state empty"><strong>No readiness actions yet.</strong><span>Create one from an assessment gap or materialize reviewed Signal work into Product Core.</span></div>`}</div>`;
}

function actionCard(action: ReadinessAction): string {
  const active = action.status === "open" || action.status === "in_progress";
  return `<article class="record" tabindex="-1" data-ux-product-action data-record-id="${escapeHtml(action.id)}">
    <div class="record-top"><h4>${escapeHtml(action.title)}</h4>${pill(action.status)}</div>
    <dl><div><dt>Owner</dt><dd>${escapeHtml(action.owner)}</dd></div><div><dt>Kind</dt><dd>${escapeHtml(label(action.kind))}</dd></div><div><dt>Source</dt><dd>${escapeHtml(label(action.source))}</dd></div><div><dt>Verification</dt><dd>${escapeHtml(action.verification ?? "Record completion evidence or rationale when this work closes")}</dd></div></dl>
    ${action.startedAt ? `<p class="guidance">Started ${humanDate(action.startedAt)} by ${escapeHtml(action.startedBy ?? "Unknown actor")}</p>` : ""}
    ${action.ownerAssignedAt ? `<p class="guidance">Owner reassigned ${humanDate(action.ownerAssignedAt)} by ${escapeHtml(action.ownerAssignedBy ?? "Unknown actor")}: ${escapeHtml(action.ownerAssignmentRationale ?? "No rationale retained")}</p>` : ""}
    ${action.completedAt ? `<p class="guidance"><strong>Completed ${humanDate(action.completedAt)} by ${escapeHtml(action.completedBy ?? "Unknown actor")}.</strong>${action.completionEvidence ? ` Evidence: ${escapeHtml(action.completionEvidence)}.` : ""}${action.completionRationale ? ` Rationale: ${escapeHtml(action.completionRationale)}.` : ""}</p>` : ""}
    ${action.dismissedAt ? `<p class="guidance"><strong>Dismissed ${humanDate(action.dismissedAt)} by ${escapeHtml(action.dismissedBy ?? "Unknown actor")}.</strong> ${escapeHtml(action.dismissalRationale ?? "No rationale retained")}</p>` : ""}
    <div data-ux-inline-error aria-live="polite"></div>
    ${action.status === "open" ? `<form data-ux-form="start-action"><input type="hidden" name="actionId" value="${escapeHtml(action.id)}"><label>Named actor<input name="actor" required value="${escapeHtml(action.owner)}"></label><button class="primary" type="submit">Start action</button></form>` : ""}
    ${active ? `<details><summary>Assign owner</summary><form data-ux-form="assign-action"><input type="hidden" name="actionId" value="${escapeHtml(action.id)}"><div class="two"><label>Named actor<input name="actor" required value="${escapeHtml(action.owner)}"></label><label>Assigned owner<input name="owner" required value="${escapeHtml(action.owner)}"></label></div><label>Assignment rationale<textarea name="rationale" required rows="2"></textarea></label><button type="submit">Save owner assignment</button></form></details>` : ""}
    ${action.status === "in_progress" ? `<details><summary>Complete action</summary><form data-ux-form="complete-action"><input type="hidden" name="actionId" value="${escapeHtml(action.id)}"><label>Named completer<input name="actor" required value="${escapeHtml(action.owner)}"></label><label>Verification or completion evidence<textarea name="evidence" rows="3" placeholder="What was checked or produced?"></textarea></label><label>Completion rationale<textarea name="rationale" rows="3" placeholder="Why is this action complete? Use this when external evidence is not applicable."></textarea></label><button class="primary" type="submit">Complete action</button></form></details>` : ""}
    ${active ? `<details><summary>Dismiss action</summary><form data-ux-form="dismiss-action"><input type="hidden" name="actionId" value="${escapeHtml(action.id)}"><label>Named actor<input name="actor" required value="${escapeHtml(action.owner)}"></label><label>Dismissal rationale<textarea name="rationale" required rows="3"></textarea></label><button type="submit">Dismiss with rationale</button></form></details>` : ""}
  </article>`;
}

async function renderContentBriefs(): Promise<void> {
  if (!main || !isCampaignSurface() || main.querySelector("[data-ux-content-briefs]")) return;
  const section = document.createElement("section");
  section.className = "panel";
  section.dataset.uxContentBriefs = "true";
  section.innerHTML = `<div class="state loading" role="status"><strong>Loading Campaign content briefs</strong><span>Reading Campaign-owned source packets and review state.</span></div>`;
  main.append(section);
  const workspaceId = productStore.activeWorkspaceId();
  if (!workspaceId) {
    section.innerHTML = `<div class="state empty"><strong>No active Product workspace.</strong><span>Campaign content remains attached to a local Product workspace.</span></div>`;
    return;
  }
  try {
    const workspace = await campaignStore.load(workspaceId);
    const briefs = workspace?.contentBriefs ?? [];
    annotateCampaignCards(workspace?.campaigns ?? []);
    section.innerHTML = `<div class="section-heading"><div><p class="eyebrow">Campaign-owned content</p><h3>Content briefs</h3></div>${pill(`${briefs.length} records`)}</div>
      <p class="guidance">A content brief inherits an approved Campaign source packet. Named review can approve, request changes, or reject the brief. Approval here does not create an asset, schedule, export, publication, delivery, or outcome claim.</p>
      ${campaignSuccess ? `<section class="state" data-ux-success><strong>Saved.</strong><span>${escapeHtml(campaignSuccess)}</span></section>` : ""}
      <div class="cards">${briefs.length ? briefs.slice().reverse().map((brief) => contentBriefCard(brief, workspace?.campaigns.find((item) => item.id === brief.campaignId)?.title)).join("") : `<div class="state empty"><strong>No content briefs yet.</strong><span>Materialize reviewed content work from Signals under an approved Campaign.</span></div>`}</div>`;
  } catch (error) {
    section.innerHTML = recoveryMarkup("Campaign content briefs could not be loaded", error, "retry-content-briefs");
  }
}

function contentBriefCard(brief: ContentBrief, campaignTitle?: string): string {
  const canSubmit = ["draft", "changes_requested", "approval_invalidated"].includes(brief.status);
  return `<article class="record" tabindex="-1" data-ux-content-brief data-record-id="${escapeHtml(brief.id)}">
    <div class="record-top"><h4>${escapeHtml(brief.title)}</h4><div>${pill(brief.status)} ${pill(brief.origin)}</div></div>
    <p>${escapeHtml(brief.objective)}</p>
    <dl><div><dt>Campaign</dt><dd>${escapeHtml(campaignTitle ?? "Campaign reference unavailable")}</dd></div><div><dt>Audience</dt><dd>${escapeHtml(brief.audience)}</dd></div><div><dt>Primary outcome</dt><dd>${escapeHtml(brief.primaryOutcome)}</dd></div><div><dt>Owner</dt><dd>${escapeHtml(brief.owner)}</dd></div><div><dt>Claims</dt><dd>${brief.claimReferences.length}</dd></div><div><dt>Reviewed evidence</dt><dd>${brief.evidenceIds.length}</dd></div></dl>
    <details><summary>Content plan and provenance</summary><p><strong>Pillars:</strong> ${escapeHtml(brief.pillars.join(" · "))}</p><p><strong>Themes:</strong> ${escapeHtml(brief.themes.join(" · ") || "None recorded")}</p><p><strong>Deliverables:</strong> ${escapeHtml(brief.deliverables.join(" · "))}</p><p><strong>Source notes:</strong> ${escapeHtml(brief.sourceNotes.join(" · ") || "None recorded")}</p></details>
    ${brief.reviewedAt ? `<p class="guidance">Review ${humanDate(brief.reviewedAt)} by ${escapeHtml(brief.reviewedBy ?? "Unknown reviewer")}: ${escapeHtml(brief.reviewNote ?? "No note retained")}</p>` : ""}
    <div data-ux-inline-error aria-live="polite"></div>
    ${canSubmit ? `<button type="button" data-ux-action="submit-content-brief" data-record-id="${escapeHtml(brief.id)}">${brief.status === "changes_requested" ? "Resubmit for review" : "Submit for review"}</button>` : ""}
    ${brief.status === "in_review" ? `<form data-ux-form="review-content-brief"><input type="hidden" name="briefId" value="${escapeHtml(brief.id)}"><label>Named reviewer<input name="reviewer" required></label><label>Review note<textarea name="note" required rows="3"></textarea></label><div class="actions"><button class="primary" type="submit" name="decision" value="approved">Approve</button><button type="submit" name="decision" value="changes_requested">Request changes</button><button type="submit" name="decision" value="rejected">Reject</button></div></form>` : ""}
  </article>`;
}

function annotateCampaignCards(campaigns: readonly { id: string }[]): void {
  if (!main) return;
  const heading = main.querySelector("#campaign-list-heading");
  const panel = heading?.closest("section.panel");
  if (!panel) return;
  const cards = panel.querySelectorAll<HTMLElement>(".cards > article.record");
  const ordered = [...campaigns].reverse();
  cards.forEach((card, index) => {
    const campaign = ordered[index];
    if (!campaign) return;
    card.dataset.authoritativeRecordId = campaign.id;
    card.tabIndex = -1;
  });
}

async function replaceSignalDestinationIdentifiers(): Promise<void> {
  if (!main || !isSignalsSurface()) return;
  const workspaceId = productStore.activeWorkspaceId();
  if (!workspaceId) return;
  const inbox = await signalsStore.load(workspaceId);
  if (!inbox) return;
  const cards = main.querySelectorAll<HTMLElement>(".signal-conversion");
  cards.forEach((card, index) => {
    const conversion = inbox.conversions[index];
    const destination = conversion?.materialization;
    if (!conversion || !destination || card.querySelector("[data-ux-open-created-item]")) return;
    const raw = [...card.querySelectorAll<HTMLParagraphElement>("p")].find((candidate) => candidate.querySelector("strong")?.textContent?.includes("Authoritative destination"));
    if (raw) raw.innerHTML = `<strong>Authoritative destination:</strong> ${escapeHtml(destinationLabel(destination.context))} · created ${humanDate(destination.materializedAt)}`;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "primary";
    button.dataset.uxAction = "open-destination";
    button.dataset.uxOpenCreatedItem = "true";
    button.dataset.context = destination.context;
    button.dataset.kind = conversion.kind;
    button.dataset.recordId = destination.recordId;
    button.textContent = "Open created item";
    raw?.insertAdjacentElement("afterend", button);
  });
}

function destinationLabel(context: SignalMaterializationContext): string {
  if (context === "product_core") return "Product Core";
  if (context === "campaigns") return "Campaigns";
  if (context === "calendar") return "Calendar";
  return "Repository Growth";
}

async function openDestination(target: DestinationTarget): Promise<void> {
  pendingTarget = target;
  if (target.context === "product_core") {
    sidebar?.querySelector<HTMLButtonElement>('button[data-nav="product"]')?.click();
    queueEnhance();
    return;
  }
  if (target.context === "campaigns") {
    const button = await waitFor(() => sidebar?.querySelector<HTMLButtonElement>('button[data-nav="campaigns"]') ?? undefined);
    button?.click();
    return;
  }
  if (target.context === "calendar") {
    const button = await waitFor(() => sidebar?.querySelector<HTMLButtonElement>('button[data-nav="calendar"]') ?? undefined);
    button?.click();
    return;
  }
  await openRepositoryGrowth();
}

async function openRepositoryGrowth(): Promise<void> {
  sidebar?.querySelector<HTMLButtonElement>('button[data-nav="product"]')?.click();
  const button = await waitFor(() => main?.querySelector<HTMLButtonElement>('[data-repository-action="open"]') ?? undefined);
  button?.click();
}

async function focusPendingTarget(): Promise<void> {
  if (!main || !pendingTarget) return;
  let target: HTMLElement | null = null;
  if (pendingTarget.context === "product_core" && isProductSurface()) {
    target = main.querySelector<HTMLElement>(`[data-ux-product-action][data-record-id="${cssEscape(pendingTarget.recordId)}"]`);
  }
  if (pendingTarget.context === "campaigns" && isCampaignSurface()) {
    target = pendingTarget.kind === "content_brief"
      ? main.querySelector<HTMLElement>(`[data-ux-content-brief][data-record-id="${cssEscape(pendingTarget.recordId)}"]`)
      : main.querySelector<HTMLElement>(`[data-authoritative-record-id="${cssEscape(pendingTarget.recordId)}"]`);
  }
  if (pendingTarget.context === "calendar" && activeNav() === "calendar") {
    const control = main.querySelector<HTMLElement>(`[data-activation-action][data-id="${cssEscape(pendingTarget.recordId)}"]`);
    target = control?.closest<HTMLElement>(".calendar-card") ?? null;
  }
  if (pendingTarget.context === "repository_growth" && main.querySelector('form[data-form="repository-action-status"]')) {
    const input = main.querySelector<HTMLInputElement>(`form[data-form="repository-action-status"] input[name="actionId"][value="${cssEscape(pendingTarget.recordId)}"]`);
    target = input?.closest<HTMLElement>("article.record") ?? null;
  }
  if (!target) return;
  target.tabIndex = -1;
  target.focus({ preventScroll: true });
  target.scrollIntoView({ block: "center", behavior: "smooth" });
  announce(`Opened authoritative ${destinationLabel(pendingTarget.context)} record`);
  pendingTarget = undefined;
}

function cssEscape(value: string): string {
  return globalThis.CSS?.escape ? globalThis.CSS.escape(value) : value.replaceAll('"', '\\"');
}

async function waitFor<T>(find: () => T | undefined, attempts = 40): Promise<T | undefined> {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const value = find();
    if (value) return value;
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  return undefined;
}

function recoveryMarkup(title: string, error: unknown, action: string): string {
  const detail = error instanceof Error ? error.message : "Unknown local workflow error";
  return `<section class="state error" role="alert"><div><strong>${escapeHtml(title)}.</strong><p>${escapeHtml(detail)}</p><p>The saved authority record was not intentionally changed.</p></div><button type="button" data-ux-action="${action}">Retry from saved state</button></section>`;
}

function inlineFailure(element: HTMLElement, error: unknown): void {
  const card = element.closest<HTMLElement>("article.record");
  const region = card?.querySelector<HTMLElement>("[data-ux-inline-error]");
  if (!region) return;
  const detail = error instanceof Error ? error.message : "Unknown local workflow error";
  region.innerHTML = `<section class="state error" role="alert"><strong>That change was not saved.</strong><span>${escapeHtml(detail)} Your entered values are still here.</span></section>`;
  announce(`Action failed: ${detail}`);
}

async function refreshProductPanel(message: string): Promise<void> {
  productSuccess = message;
  main?.querySelector("[data-ux-readiness-panel]")?.remove();
  await renderProductActions();
  await focusPendingTarget();
  announce(message);
}

async function refreshContentBriefs(message: string): Promise<void> {
  campaignSuccess = message;
  main?.querySelector("[data-ux-content-briefs]")?.remove();
  await renderContentBriefs();
  await focusPendingTarget();
  announce(message);
}

new MutationObserver(queueEnhance).observe(main ?? document.body, { childList: true, subtree: true });
new MutationObserver(queueEnhance).observe(sidebar ?? document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["aria-current"] });
queueEnhance();

document.addEventListener("click", (event) => {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>("button");
  if (!button?.dataset.uxAction) return;
  const action = button.dataset.uxAction;
  event.preventDefault();
  event.stopImmediatePropagation();
  if (action === "open-destination") {
    const context = button.dataset.context as SignalMaterializationContext | undefined;
    const kind = button.dataset.kind as DestinationKind | undefined;
    const recordId = button.dataset.recordId;
    if (context && kind && recordId) void openDestination({ context, kind, recordId });
    return;
  }
  if (action === "submit-content-brief" && button.dataset.recordId) {
    const workspaceId = productStore.activeWorkspaceId();
    if (!workspaceId) return;
    void campaignService.submitContentBrief(workspaceId, button.dataset.recordId)
      .then(() => refreshContentBriefs("Content brief submitted for named review"))
      .catch((error: unknown) => inlineFailure(button, error));
    return;
  }
  if (action === "retry-product-actions") {
    main?.querySelector("[data-ux-readiness-panel]")?.remove();
    void renderProductActions();
    return;
  }
  if (action === "retry-content-briefs") {
    main?.querySelector("[data-ux-content-briefs]")?.remove();
    void renderContentBriefs();
  }
}, true);

document.addEventListener("submit", (event) => {
  const form = event.target as HTMLFormElement;
  const kind = form.dataset.uxForm;
  if (!kind) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  const workspaceId = productStore.activeWorkspaceId();
  if (!workspaceId) return;
  const data = new FormData(form);
  if (kind === "start-action") {
    void productService.startAction(workspaceId, String(data.get("actionId")), String(data.get("actor")))
      .then(() => refreshProductPanel("Readiness action started"))
      .catch((error: unknown) => inlineFailure(form, error));
    return;
  }
  if (kind === "assign-action") {
    void productService.assignActionOwner(workspaceId, String(data.get("actionId")), String(data.get("actor")), String(data.get("owner")), String(data.get("rationale")))
      .then(() => refreshProductPanel("Readiness action owner updated with rationale"))
      .catch((error: unknown) => inlineFailure(form, error));
    return;
  }
  if (kind === "complete-action") {
    void productService.completeAction(workspaceId, String(data.get("actionId")), { actor: String(data.get("actor")), evidence: String(data.get("evidence")), rationale: String(data.get("rationale")) })
      .then(() => refreshProductPanel("Readiness action completed with explicit verification evidence or rationale"))
      .catch((error: unknown) => inlineFailure(form, error));
    return;
  }
  if (kind === "dismiss-action") {
    void productService.dismissAction(workspaceId, String(data.get("actionId")), String(data.get("actor")), String(data.get("rationale")))
      .then(() => refreshProductPanel("Readiness action dismissed with named rationale"))
      .catch((error: unknown) => inlineFailure(form, error));
    return;
  }
  if (kind === "review-content-brief") {
    const submitter = (event as SubmitEvent).submitter as HTMLButtonElement | null;
    const decision = submitter?.value as "approved" | "changes_requested" | "rejected" | undefined;
    if (!decision) return;
    void campaignService.reviewContentBrief(workspaceId, String(data.get("briefId")), String(data.get("reviewer")), decision, String(data.get("note")))
      .then(() => refreshContentBriefs(`Content brief review recorded: ${label(decision)}`))
      .catch((error: unknown) => inlineFailure(form, error));
  }
}, true);
