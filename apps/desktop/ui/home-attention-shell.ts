import type { CampaignWorkspace } from "../../../src/campaigns/domain/campaign.js";
import {
  deriveHomeAttention,
  type HomeAttentionItem,
  type HomeAttentionSnapshot,
  type HomeAttentionSource,
  type HomeAttentionSourceFailure,
} from "../../../src/ui/home-attention.js";
import { LocalStorageActivationLearningStore } from "./local-storage-activation-learning-store.js";
import { LocalStorageCampaignWorkspaceStore } from "./local-storage-campaign-workspace-store.js";
import { LocalStorageProductWorkspaceStore } from "./local-storage-product-workspace-store.js";
import { LocalStorageRepositoryGrowthStore } from "./local-storage-repository-growth-store.js";
import { LocalStorageSignalsInboxStore } from "./local-storage-signals-inbox-store.js";
import { LocalStorageVideoProductionStore } from "./local-storage-video-production-store.js";

const productStore = new LocalStorageProductWorkspaceStore();
const signalsStore = new LocalStorageSignalsInboxStore();
const campaignStore = new LocalStorageCampaignWorkspaceStore();
const repositoryStore = new LocalStorageRepositoryGrowthStore();
const videoStore = new LocalStorageVideoProductionStore();
const activationStore = new LocalStorageActivationLearningStore();
const main = document.querySelector<HTMLElement>("#main");
const sidebar = document.querySelector<HTMLElement>("#sidebar");
const live = document.querySelector<HTMLElement>("#live-region");

let enhancing = false;
let queued = false;
let currentSnapshot: HomeAttentionSnapshot | undefined;

const escapeHtml = (value: unknown): string => String(value ?? "")
  .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;").replaceAll("'", "&#039;");
const label = (value: string): string => value.replaceAll("_", " ");
const categoryLabel = (value: HomeAttentionItem["category"]): string => ({
  recovery: "Recovery needed",
  review: "Review needed",
  blocked: "Blocked or stale",
  action: "Owned action",
  scheduled: "Scheduled follow-up",
  learning: "Learning",
})[value];
const tone = (category: HomeAttentionItem["category"]): string =>
  category === "recovery" ? "error" : category === "review" || category === "blocked" ? "warning" : category === "learning" ? "implemented" : "neutral";
const pill = (item: HomeAttentionItem): string => `<span class="pill ${tone(item.category)}">${escapeHtml(categoryLabel(item.category))}</span>`;

function announce(message: string): void {
  if (live) live.textContent = message;
}

function activeNav(): string | undefined {
  return sidebar?.querySelector<HTMLButtonElement>('nav button[aria-current="page"]')?.dataset.nav;
}

function isHome(): boolean {
  return activeNav() === "home" && main?.querySelector(".hero .eyebrow")?.textContent?.trim() === "Home";
}

function queueEnhance(): void {
  if (queued) return;
  queued = true;
  queueMicrotask(() => {
    queued = false;
    void enhanceHome();
  });
}

async function enhanceHome(): Promise<void> {
  if (!main || enhancing || !isHome()) return;
  enhancing = true;
  try {
    const workspaceId = productStore.activeWorkspaceId();
    if (!workspaceId) return;
    const product = await productStore.load(workspaceId);
    if (!product) return;

    const failures: HomeAttentionSourceFailure[] = [];
    const [signals, campaigns, repositoryGrowth, video, activation] = await Promise.all([
      safeLoad("signals", () => signalsStore.load(workspaceId), failures),
      safeLoad("campaigns", () => campaignStore.load(workspaceId), failures),
      safeLoad("repository_growth", () => repositoryStore.load(workspaceId), failures),
      safeLoad("video", () => videoStore.load(workspaceId), failures),
      safeLoad("activation", () => activationStore.load(workspaceId), failures),
    ]);

    const snapshot = deriveHomeAttention({
      product,
      ...(signals ? { signals } : {}),
      ...(campaigns ? { campaigns } : {}),
      ...(repositoryGrowth ? { repositoryGrowth } : {}),
      ...(video ? { video } : {}),
      ...(activation ? { activation } : {}),
      sourceFailures: failures,
    });
    currentSnapshot = snapshot;
    renderHomeAttention(snapshot);
  } catch (error) {
    renderAttentionFailure(error);
  } finally {
    enhancing = false;
  }
}

async function safeLoad<T>(source: HomeAttentionSource, loader: () => Promise<T>, failures: HomeAttentionSourceFailure[]): Promise<T | undefined> {
  try {
    return await loader();
  } catch (error) {
    failures.push({ source, detail: error instanceof Error ? error.message : "Unknown local store error" });
    return undefined;
  }
}

function renderHomeAttention(snapshot: HomeAttentionSnapshot): void {
  if (!main || !isHome()) return;
  const signature = JSON.stringify({
    items: snapshot.items.map((item) => [item.id, item.state, item.timestamp]),
    failures: snapshot.sourceFailures,
  });
  const existing = main.querySelector<HTMLElement>("[data-home-attention-panel]");
  if (existing?.dataset.homeAttentionSignature === signature) return;

  const next = main.querySelector<HTMLElement>("section.panel.next");
  const top = snapshot.items[0];
  if (next) {
    next.dataset.homeAttentionSummary = top?.id ?? "empty";
    next.innerHTML = top
      ? `<div><p class="eyebrow">What should I do now?</p><h3>${escapeHtml(top.title)}</h3><p>${escapeHtml(top.reason)}</p><small>${escapeHtml(label(top.surface))} · ${escapeHtml(label(top.state))}${top.owner ? ` · Owner: ${escapeHtml(top.owner)}` : ""}</small></div><button class="primary" type="button" data-home-attention-open="${escapeHtml(top.id)}">${top.target.recordId ? "Open exact record" : "Open prerequisite"}</button>`
      : `<div><p class="eyebrow">What should I do now?</p><h3>No recorded attention item is currently waiting.</h3><p>This means the successfully loaded Viable workflows did not expose an explicit recovery, review, blocked, active, scheduled, or learning item. It is not proof that no work exists.</p></div>`;
  }

  const panel = existing ?? document.createElement("section");
  panel.className = "panel";
  panel.dataset.homeAttentionPanel = "true";
  panel.dataset.homeAttentionSignature = signature;
  panel.setAttribute("aria-labelledby", "home-attention-heading");
  panel.innerHTML = attentionMarkup(snapshot);
  if (!existing) next?.insertAdjacentElement("afterend", panel);
}

function attentionMarkup(snapshot: HomeAttentionSnapshot): string {
  const partial = snapshot.partial
    ? `<section class="state warning" role="status"><strong>Home is using partial local context.</strong><span>${snapshot.sourceFailures.map((failure) => `${escapeHtml(label(failure.source))}: ${escapeHtml(failure.detail)}`).join(" · ")} Recommendations below come only from workflows that loaded successfully. Missing context is not treated as success or empty work.</span></section>`
    : "";
  const cards = snapshot.items.length
    ? snapshot.items.slice(0, 12).map((item, index) => `<article class="record" data-home-attention-item="${escapeHtml(item.id)}"><div class="record-top"><h4>${index === 0 ? "Next: " : ""}${escapeHtml(item.title)}</h4>${pill(item)}</div><p>${escapeHtml(item.reason)}</p><dl><div><dt>Workflow</dt><dd>${escapeHtml(label(item.surface))}</dd></div><div><dt>State</dt><dd>${escapeHtml(label(item.state))}</dd></div>${item.owner ? `<div><dt>Owner</dt><dd>${escapeHtml(item.owner)}</dd></div>` : ""}${item.timestamp ? `<div><dt>Recorded time</dt><dd>${escapeHtml(new Date(item.timestamp).toLocaleString())}</dd></div>` : ""}</dl>${item.evidence.length ? `<details><summary>Why this is here</summary><ul>${item.evidence.slice(0, 6).map((entry) => `<li>${escapeHtml(entry)}</li>`).join("")}</ul></details>` : ""}<button type="button" data-home-attention-open="${escapeHtml(item.id)}">${item.target.recordId ? "Open exact record" : "Open prerequisite"}</button></article>`).join("")
    : `<div class="state empty"><strong>No cross-workflow attention is currently recorded.</strong><span>This is not evidence that no market or product work exists. It means no explicit attention state was found in the local workflows that loaded successfully.</span></div>`;
  const overflow = snapshot.items.length > 12 ? `<p class="guidance">Showing the first 12 of ${snapshot.items.length} explicit attention items in deterministic state order. Open the owning workflows for the remaining records.</p>` : "";
  return `<div class="section-heading"><div><p class="eyebrow">Cross-workflow attention</p><h3 id="home-attention-heading">What needs attention, and why</h3></div><span class="pill neutral">${snapshot.items.length} explicit items</span></div><p class="guidance">Home is read-only. It orders existing workflow states as recovery, review, blocked/stale, owned action, scheduled follow-up, then learning. It does not approve, mutate, publish, deliver, or invent a business-value score.</p>${partial}<div class="cards">${cards}</div>${overflow}`;
}

function renderAttentionFailure(error: unknown): void {
  if (!main || !isHome()) return;
  const detail = error instanceof Error ? error.message : "Unknown Home attention error";
  let panel = main.querySelector<HTMLElement>("[data-home-attention-panel]");
  if (!panel) {
    panel = document.createElement("section");
    panel.className = "panel";
    panel.dataset.homeAttentionPanel = "true";
    main.querySelector("section.panel.next")?.insertAdjacentElement("afterend", panel);
  }
  panel.innerHTML = `<section class="state error" role="alert"><div><strong>Cross-workflow attention could not be derived.</strong><p>${escapeHtml(detail)}</p><p>No domain record was changed.</p></div><button type="button" data-home-attention-retry>Retry from saved local state</button></section>`;
}

async function openAttention(item: HomeAttentionItem): Promise<void> {
  if (item.surface === "repository_growth") {
    await openRepositoryTarget(item);
    return;
  }
  const nav = item.surface === "product" || item.surface === "signals" || item.surface === "campaigns" || item.surface === "studio" || item.surface === "calendar" || item.surface === "analytics"
    ? item.surface
    : undefined;
  if (!nav) return;
  const button = await waitFor(() => sidebar?.querySelector<HTMLButtonElement>(`button[data-nav="${nav}"]`) ?? undefined);
  button?.click();
  const target = await waitForAsync(() => focusCandidate(item), 80);
  if (target) focusElement(target, item);
  else announce(`Opened ${label(item.surface)}, but the requested authoritative record could not be focused. No record was changed.`);
}

async function openRepositoryTarget(item: HomeAttentionItem): Promise<void> {
  sidebar?.querySelector<HTMLButtonElement>('button[data-nav="product"]')?.click();
  const open = await waitFor(() => main?.querySelector<HTMLButtonElement>('[data-repository-action="open"]') ?? undefined);
  open?.click();
  await waitFor(() => main?.querySelector<HTMLElement>("#repository-import-heading") ?? undefined, 80);

  const workspaceId = productStore.activeWorkspaceId();
  if (!workspaceId) return;
  const workspace = await repositoryStore.load(workspaceId);
  let repositoryId: string | undefined;
  if (item.target.recordKind === "repository") repositoryId = item.target.recordId;
  if (item.target.recordKind === "growth_action") repositoryId = workspace.plans.find((plan) => plan.actions.some((action) => action.id === item.target.recordId))?.repositoryId;
  if (item.target.recordKind === "launch_room") repositoryId = workspace.launchRooms.find((room) => room.id === item.target.recordId)?.repositoryId;
  if (repositoryId) {
    const select = main?.querySelector<HTMLButtonElement>(`[data-repository-action="select"][data-id="${cssEscape(repositoryId)}"]`);
    select?.click();
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  const target = await waitForAsync(() => focusCandidate(item), 80);
  if (target) focusElement(target, item);
  else announce("Opened Repository Growth, but the requested authoritative record could not be focused. No record was changed.");
}

async function focusCandidate(item: HomeAttentionItem): Promise<HTMLElement | undefined> {
  if (!main || !item.target.recordId && !["product_truth", "icp_prerequisite", "assessment_prerequisite"].includes(item.target.recordKind)) return undefined;
  const workspaceId = productStore.activeWorkspaceId();
  if (!workspaceId) return undefined;

  if (item.surface === "product") {
    const product = await productStore.load(workspaceId);
    if (!product) return undefined;
    if (item.target.recordKind === "readiness_action") return main.querySelector<HTMLElement>(`[data-ux-product-action][data-record-id="${cssEscape(item.target.recordId ?? "")}"]`) ?? undefined;
    if (item.target.recordKind === "product_truth") return main.querySelector<HTMLElement>("#truth-heading")?.closest<HTMLElement>("section.panel") ?? undefined;
    if (item.target.recordKind === "assessment_prerequisite") return main.querySelector<HTMLElement>("#assessment-heading")?.closest<HTMLElement>("section.panel") ?? undefined;
    if (item.target.recordKind === "icp_prerequisite") return main.querySelector<HTMLElement>("#icp-heading")?.closest<HTMLElement>("section.panel") ?? undefined;
    if (item.target.recordKind === "evidence") return indexedCard(product.evidence.map((entry) => entry.id), item.target.recordId, "#evidence-heading");
    if (item.target.recordKind === "icp" || item.target.recordKind === "icp_experiment") return indexedCard(product.icpHypotheses.map((entry) => entry.id), item.target.recordId, "#icp-heading");
  }

  if (item.surface === "signals") {
    const inbox = await signalsStore.load(workspaceId);
    if (!inbox) return undefined;
    if (item.target.recordKind === "signal") return indexedElement(inbox.signals.slice().reverse().map((entry) => entry.id), item.target.recordId, ".signal-cards > article.record");
    if (item.target.recordKind === "conversion") return indexedElement(inbox.conversions.map((entry) => entry.id), item.target.recordId, ".signal-conversion");
    if (item.target.recordKind === "source_health") return [...main.querySelectorAll<HTMLElement>("article, .source-health, .state")].find((entry) => entry.textContent?.includes(item.target.recordId ?? ""));
  }

  if (item.surface === "campaigns" || item.surface === "studio") {
    const [campaigns, videos] = await Promise.all([campaignStore.load(workspaceId), videoStore.load(workspaceId)]);
    if (!campaigns) return undefined;
    if (item.target.recordKind === "campaign") return main.querySelector<HTMLElement>(`[data-authoritative-record-id="${cssEscape(item.target.recordId ?? "")}"]`) ?? indexedCard(campaigns.campaigns.slice().reverse().map((entry) => entry.id), item.target.recordId, "#campaign-list-heading");
    if (item.target.recordKind === "content_brief") return main.querySelector<HTMLElement>(`[data-ux-content-brief][data-record-id="${cssEscape(item.target.recordId ?? "")}"]`) ?? undefined;
    if (item.target.recordKind === "canonical_asset") return indexedCard(campaigns.assets.slice().reverse().map((entry) => entry.id), item.target.recordId, "#asset-list-heading");
    if (item.target.recordKind === "channel_variant") return indexedCard(campaigns.variants.map((entry) => entry.id), item.target.recordId, "#variant-heading");
    if (item.target.recordKind === "video_brief") return indexedSectionArticle(videos.briefs.map((entry) => entry.id), item.target.recordId, "#video-brief-list-heading");
    if (item.target.recordKind === "video_artifact") return indexedSectionArticle(videos.artifacts.map((entry) => entry.id), item.target.recordId, "#video-artifact-heading");
    if (item.target.recordKind === "video_variant") return indexedSectionArticle(videos.variants.map((entry) => entry.id), item.target.recordId, "#video-variant-heading");
  }

  if (item.surface === "repository_growth") {
    const workspace = await repositoryStore.load(workspaceId);
    if (item.target.recordKind === "repository") return main.querySelector<HTMLElement>("#snapshot-heading")?.closest<HTMLElement>("section.panel") ?? undefined;
    if (item.target.recordKind === "growth_action") {
      const input = main.querySelector<HTMLInputElement>(`form[data-form="repository-action-status"] input[name="actionId"][value="${cssEscape(item.target.recordId ?? "")}"]`);
      return input?.closest<HTMLElement>("article.record") ?? undefined;
    }
    if (item.target.recordKind === "launch_room") {
      const visibleRooms = workspace.launchRooms.filter((room) => main.querySelector<HTMLButtonElement>(`[data-repository-action="select"][data-id="${cssEscape(room.repositoryId)}"][aria-pressed="true"]`));
      return indexedElement(visibleRooms.map((room) => room.id), item.target.recordId, ".panel.launch-room");
    }
  }

  if (item.surface === "calendar" || item.surface === "analytics") {
    const activation = await activationStore.load(workspaceId);
    if (!activation) return undefined;
    if (item.surface === "calendar" && item.target.recordKind === "calendar_entry") {
      const ordered = activation.calendarEntries.slice().sort((left, right) => Date.parse(left.startsAt) - Date.parse(right.startsAt));
      return indexedElement(ordered.map((entry) => entry.id), item.target.recordId, ".calendar-list > article.calendar-card");
    }
    if (item.surface === "analytics" && item.target.recordKind === "measurement_plan") return indexedPanelList(activation.measurementPlans.map((entry) => entry.id), item.target.recordId, "#measurement-plan-heading");
    if (item.surface === "analytics" && item.target.recordKind === "performance_import") return indexedPanelList(activation.performanceImports.slice().reverse().map((entry) => entry.id), item.target.recordId, "#performance-import-heading");
    if (item.surface === "analytics" && item.target.recordKind === "learning") return indexedPanelList(activation.learningLedger.slice().reverse().map((entry) => entry.id), item.target.recordId, "#learning-ledger-heading");
    if (item.surface === "analytics" && item.target.recordKind === "calendar_entry") return main.querySelector<HTMLElement>("#retrospective-heading")?.closest<HTMLElement>("section.panel") ?? undefined;
  }
  return undefined;
}

function indexedCard(ids: readonly string[], id: string | undefined, heading: string): HTMLElement | undefined {
  const panel = main?.querySelector(heading)?.closest<HTMLElement>("section.panel");
  const cards = panel ? [...panel.querySelectorAll<HTMLElement>(".cards > article.record")] : [];
  return indexed(ids, id, cards);
}

function indexedSectionArticle(ids: readonly string[], id: string | undefined, heading: string): HTMLElement | undefined {
  const panel = main?.querySelector(heading)?.closest<HTMLElement>("section.panel");
  const cards = panel ? [...panel.querySelectorAll<HTMLElement>(".card-list > article")] : [];
  return indexed(ids, id, cards);
}

function indexedPanelList(ids: readonly string[], id: string | undefined, heading: string): HTMLElement | undefined {
  const panel = main?.querySelector(heading)?.closest<HTMLElement>("section.panel");
  const cards = panel ? [...panel.querySelectorAll<HTMLElement>(".card-list > article")] : [];
  return indexed(ids, id, cards);
}

function indexedElement(ids: readonly string[], id: string | undefined, selector: string): HTMLElement | undefined {
  return indexed(ids, id, [...main?.querySelectorAll<HTMLElement>(selector) ?? []]);
}

function indexed(ids: readonly string[], id: string | undefined, elements: readonly HTMLElement[]): HTMLElement | undefined {
  if (!id) return undefined;
  const index = ids.indexOf(id);
  return index >= 0 ? elements[index] : undefined;
}

function focusElement(target: HTMLElement, item: HomeAttentionItem): void {
  target.tabIndex = -1;
  target.focus({ preventScroll: true });
  target.scrollIntoView({ block: "center", behavior: "smooth" });
  announce(`Opened ${label(item.surface)}: ${item.title}`);
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

async function waitForAsync<T>(find: () => Promise<T | undefined>, attempts = 40): Promise<T | undefined> {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const value = await find();
    if (value) return value;
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  return undefined;
}

new MutationObserver(queueEnhance).observe(main ?? document.body, { childList: true, subtree: true });
new MutationObserver(queueEnhance).observe(sidebar ?? document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["aria-current"] });
queueEnhance();

document.addEventListener("click", (event) => {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>("button");
  if (!button) return;
  if (button.dataset.homeAttentionRetry !== undefined) {
    event.preventDefault();
    event.stopImmediatePropagation();
    void enhanceHome();
    return;
  }
  const id = button.dataset.homeAttentionOpen;
  if (!id) return;
  const item = currentSnapshot?.items.find((candidate) => candidate.id === id);
  if (!item) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  void openAttention(item).catch((error: unknown) => announce(`Home navigation failed: ${error instanceof Error ? error.message : "Unknown error"}`));
}, true);
