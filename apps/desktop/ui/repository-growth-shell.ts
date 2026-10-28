import { AcknowledgedPersistenceGate } from "./acknowledged-persistence-gate.js";
import { LocalStorageProductWorkspaceStore } from "./local-storage-product-workspace-store.js";
import { RepositoryGrowthViewController } from "./repository-growth-view.js";

const productStore = new LocalStorageProductWorkspaceStore();
const main = document.querySelector<HTMLElement>("#main");
const live = document.querySelector<HTMLElement>("#live-region");
let active = false;
let controller: RepositoryGrowthViewController | undefined;
const persistenceGate = new AcknowledgedPersistenceGate();

// Repository Growth lives inside Product but has its own address, so reload,
// Back, and Forward keep the person here (navigation-history-shell maps this
// route to the Product page).
const ROUTE = "repository-growth";
const ROUTE_WAIT_MS = 10_000;

function currentRoute(): string {
  return decodeURIComponent(location.hash.replace(/^#/, "")).trim();
}

function pushRoute(route: string): void {
  if (currentRoute() === route) return;
  const url = new URL(location.href);
  url.hash = route;
  const state = { ...(history.state && typeof history.state === "object" ? history.state : {}), viableNav: route };
  // Browsers may refuse rapid history writes; the view itself already changed.
  try { history.pushState(state, "", url); } catch { /* entry not recorded */ }
}

// Opens the view once Product has rendered its entry point (startup and
// history navigation render Product asynchronously).
function openFromRoute(): void {
  const started = Date.now();
  const attempt = (): void => {
    if (active || currentRoute() !== ROUTE) return;
    if (main?.querySelector('[data-repository-action="open"]')) {
      void open(true).catch(reportOpenFailure);
      return;
    }
    if (Date.now() - started < ROUTE_WAIT_MS) setTimeout(attempt, 50);
  };
  attempt();
}

function syncWithRoute(): void {
  const route = currentRoute();
  if (route === ROUTE) { if (!active) openFromRoute(); return; }
  if (!active) return;
  active = false;
  // Leaving to another page is handled by that page's navigation; leaving to
  // Product needs Product rendered again because its nav button is current.
  if (route === "product") document.querySelector<HTMLButtonElement>('#sidebar button[data-nav="product"]')?.click();
}

function reportOpenFailure(error: unknown): void {
  announce(`Repository growth failed: ${error instanceof Error ? error.message : "Unknown error"}`);
  if (main) main.setAttribute("aria-busy", "false");
}

function announce(message: string): void {
  if (live) live.textContent = message;
}

function mutationControlsDisabled(disabled: boolean): void {
  if (!main) return;
  for (const control of main.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | HTMLButtonElement>("input, select, textarea, button")) {
    if (disabled) {
      if (!control.disabled) {
        control.disabled = true;
        control.dataset.persistenceGateDisabled = "true";
      }
    } else if (control.dataset.persistenceGateDisabled === "true") {
      control.disabled = false;
      delete control.dataset.persistenceGateDisabled;
    }
  }
}

function showPersistenceState(state: "pending" | "saved" | "failed", detail?: string): void {
  if (!main) return;
  main.querySelector("[data-persistence-state]")?.remove();
  const section = document.createElement("section");
  section.dataset.persistenceState = state;
  section.className = `state ${state === "failed" ? "error" : state === "pending" ? "loading" : "success"}`;
  section.setAttribute("role", state === "failed" ? "alert" : "status");
  const title = state === "pending" ? "Saving this change…" : state === "saved" ? "Change saved." : "This change was not saved.";
  const body = state === "pending"
    ? "Wait for canonical acknowledgement before starting another repository mutation or leaving this workflow."
    : state === "saved"
      ? "The local repository-growth workspace acknowledged the change."
      : `${detail ?? "The operation failed."} Your entered values remain available so you can correct the problem and retry.`;
  section.innerHTML = `<strong>${escapeHtml(title)}</strong><span>${escapeHtml(body)}</span>`;
  main.prepend(section);
}

async function runAcknowledgedMutation(operation: () => Promise<string | undefined>): Promise<void> {
  if (persistenceGate.state === "pending") {
    announce("A repository change is still being saved. Wait for acknowledgement before starting another mutation.");
    return;
  }
  // Start the controller synchronously so it snapshots FormData before
  // disabling inputs; disabled controls are omitted from FormData.
  const mutation = persistenceGate.run(operation);
  mutationControlsDisabled(true);
  main?.setAttribute("aria-busy", "true");
  showPersistenceState("pending");
  const result = await mutation;
  if (!result.accepted) {
    mutationControlsDisabled(false);
    main?.setAttribute("aria-busy", "false");
    announce("A repository change is still being saved. Wait for acknowledgement before starting another mutation.");
    return;
  }
  if (result.state === "failed") {
    mutationControlsDisabled(false);
    main?.setAttribute("aria-busy", "false");
    const detail = result.error instanceof Error ? result.error.message : "Unknown repository workflow error";
    showPersistenceState("failed", detail);
    announce(`Repository change not saved: ${detail}`);
    return;
  }
  try {
    if (result.value === undefined) {
      persistenceGate.reset();
      main?.querySelector("[data-persistence-state]")?.remove();
      announce("No change was recorded.");
      return;
    }
    render();
    showPersistenceState("saved");
    announce(result.value);
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Unknown view refresh error";
    showPersistenceState("saved");
    announce(`Change acknowledged, but the view could not refresh: ${detail}`);
  } finally {
    mutationControlsDisabled(false);
    main?.setAttribute("aria-busy", "false");
  }
}

function decorateProduct(): void {
  if (!main || active || main.querySelector("#repository-growth-entry")) return;
  const eyebrow = main.querySelector<HTMLElement>(".hero .eyebrow")?.textContent?.trim();
  if (eyebrow !== "Product workflow") return;
  const section = document.createElement("section");
  section.id = "repository-growth-entry";
  section.className = "panel repository-entry";
  section.innerHTML = `<div><p class="eyebrow">Public repository product surface</p><h3>Assess and launch a public repository</h3><p>Import public evidence, prioritize readiness work, and coordinate an approved release without manufacturing engagement.</p></div><button class="primary" type="button" data-repository-action="open">Open repository growth</button>`;
  main.querySelector(".hero")?.insertAdjacentElement("afterend", section);
}

async function open(fromHistory = false): Promise<void> {
  if (!main) return;
  const workspaceId = productStore.activeWorkspaceId();
  active = true;
  if (!fromHistory) pushRoute(ROUTE);
  main.setAttribute("aria-busy", "true");
  if (!workspaceId) {
    main.innerHTML = `<header class="hero compact"><div><p class="eyebrow">Product · Public repositories</p><h2>Create a Product workspace first.</h2><p>Repository growth must remain connected to product truth, reviewed evidence, and approved campaign assets.</p></div></header><section class="state empty"><strong>No active product workspace.</strong><span>Return to Product and create a local workspace before importing a repository.</span></section><button type="button" data-repository-action="return-product">Return to Product</button>`;
    main.setAttribute("aria-busy", "false");
    main.focus();
    return;
  }
  const product = await productStore.load(workspaceId);
  if (!product) throw new Error("Product workspace could not be loaded");
  if (!controller || controller.workspaceId !== workspaceId) controller = new RepositoryGrowthViewController(workspaceId, product.createdBy);
  await controller.load();
  render();
  main.setAttribute("aria-busy", "false");
  main.focus();
}

function render(): void {
  if (!main || !active) return;
  main.innerHTML = controller?.render() ?? `<section class="state loading" role="status"><strong>Loading repository growth workspace</strong></section>`;
  prepareForms();
}

function prepareForms(): void {
  if (!main) return;
  const launch = main.querySelector<HTMLFormElement>('form[data-form="repository-launch-room"]');
  if (launch) {
    const asset = launch.querySelector<HTMLSelectElement>('select[name="canonicalAssetId"]');
    const audience = launch.querySelector<HTMLInputElement>('input[name="primaryAudience"]');
    if (asset && audience) {
      const synchronize = (): void => {
        const option = asset.selectedOptions[0];
        if (option?.dataset.audience) audience.value = option.dataset.audience;
      };
      asset.addEventListener("change", synchronize);
      synchronize();
    }
    const now = new Date();
    setDate(launch, "coverageStartsAt", now);
    setDate(launch, "coverageEndsAt", addHours(now, 8));
    setDate(launch, "observationStartsAt", now);
    setDate(launch, "observationEndsAt", addHours(now, 24 * 14));
    setDate(launch, "retrospectiveAt", addHours(now, 24 * 15));
  }
  const retrospective = main.querySelector<HTMLFormElement>('form[data-form="repository-retrospective"]');
  if (retrospective) setDate(retrospective, "capturedAt", new Date());
}

function setDate(form: HTMLFormElement, name: string, value: Date): void {
  const input = form.querySelector<HTMLInputElement>(`input[name="${name}"]`);
  if (input && !input.value) input.value = localDateTime(value);
}

function localDateTime(value: Date): string {
  const local = new Date(value.getTime() - value.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function addHours(value: Date, hours: number): Date {
  return new Date(value.getTime() + hours * 60 * 60 * 1000);
}

function returnToProduct(): void {
  active = false;
  pushRoute("product");
  const productButton = document.querySelector<HTMLButtonElement>('#sidebar button[data-nav="product"]');
  productButton?.click();
}

new MutationObserver(() => decorateProduct()).observe(main ?? document.body, { childList: true, subtree: true });
decorateProduct();
window.addEventListener("popstate", syncWithRoute);
window.addEventListener("hashchange", syncWithRoute);
syncWithRoute();

document.addEventListener("click", (event) => {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>("button");
  if (!button) return;
  const action = button.dataset.repositoryAction;
  if (persistenceGate.state === "pending" && (action || button.dataset.nav)) {
    event.preventDefault();
    event.stopImmediatePropagation();
    announce("A repository change is still being saved. Navigation and additional mutations are blocked until acknowledgement.");
    return;
  }
  if (action === "open") {
    event.preventDefault();
    event.stopImmediatePropagation();
    void open().catch(reportOpenFailure);
    return;
  }
  if (action === "return-product") {
    event.preventDefault();
    event.stopImmediatePropagation();
    returnToProduct();
    return;
  }
  if (button.dataset.nav && !button.dataset.repositoryAction) {
    // A person choosing Product from inside Repository Growth leaves the
    // sub-view; record that so Back returns here. History-driven clicks
    // already carry the Product address, so pushRoute does nothing for them.
    if (active && button.dataset.nav === "product") pushRoute("product");
    active = false;
  }
  if (!active || !action || !controller) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  void runAcknowledgedMutation(() => controller!.click(button));
}, true);

document.addEventListener("submit", (event) => {
  const form = event.target as HTMLFormElement;
  if (!active || !controller || !form.dataset.form?.startsWith("repository-")) return;
  if (persistenceGate.state === "pending") {
    event.preventDefault();
    event.stopImmediatePropagation();
    announce("A repository change is still being saved. Wait for acknowledgement before submitting another change.");
    return;
  }
  event.preventDefault();
  event.stopImmediatePropagation();
  void runAcknowledgedMutation(() => controller!.submit(form));
}, true);

window.addEventListener("beforeunload", (event) => {
  if (persistenceGate.state !== "pending") return;
  event.preventDefault();
  event.returnValue = "";
});
