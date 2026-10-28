import { AcknowledgedPersistenceGate } from "./acknowledged-persistence-gate.js";
import { LocalStorageProductWorkspaceStore } from "./local-storage-product-workspace-store.js";
import { CampaignsViewController } from "./campaigns-view.js";
import { VideoProductionViewController } from "./video-production-view.js";

const productStore = new LocalStorageProductWorkspaceStore();
const sidebar = document.querySelector<HTMLElement>("#sidebar");
const main = document.querySelector<HTMLElement>("#main");
const live = document.querySelector<HTMLElement>("#live-region");

let page: "campaigns" | "studio" | undefined;
let controller: CampaignsViewController | undefined;
let videoController: VideoProductionViewController | undefined;
const persistenceGate = new AcknowledgedPersistenceGate();

function announce(message: string): void {
  if (live) live.textContent = message;
}

function mutationControlsDisabled(disabled: boolean): void {
  if (!main) return;
  const controls = main.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | HTMLButtonElement>(
    "input, select, textarea, button",
  );
  for (const control of controls) {
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
  const title = state === "pending"
    ? "Saving this change…"
    : state === "saved"
      ? "Change saved."
      : "This change was not saved.";
  const body = state === "pending"
    ? "Wait for canonical acknowledgement before starting another mutation or leaving this workflow."
    : state === "saved"
      ? "The local workspace acknowledged the change."
      : `${detail ?? "The operation failed."} Your entered values remain available so you can correct the problem and retry.`;
  section.innerHTML = `<strong>${escapeHtml(title)}</strong><span>${escapeHtml(body)}</span>`;
  main.prepend(section);
}

async function runAcknowledgedMutation(
  operation: () => Promise<string | undefined>,
  options: Readonly<{ refreshVideo?: boolean }> = {},
): Promise<void> {
  if (persistenceGate.state === "pending") {
    announce("A change is still being saved. Wait for acknowledgement before starting another mutation.");
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
    announce("A change is still being saved. Wait for acknowledgement before starting another mutation.");
    return;
  }
  if (result.state === "failed") {
    mutationControlsDisabled(false);
    main?.setAttribute("aria-busy", "false");
    const detail = result.error instanceof Error ? result.error.message : "Unknown local workflow error";
    showPersistenceState("failed", detail);
    announce(`Change not saved: ${detail}`);
    return;
  }
  if (options.refreshVideo) await refreshVideo();
  render();
  mutationControlsDisabled(false);
  main?.setAttribute("aria-busy", "false");
  showPersistenceState("saved");
  if (result.value) announce(result.value);
}

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function activateNavigation(): void {
  if (!sidebar) return;
  for (const button of sidebar.querySelectorAll<HTMLButtonElement>("nav button")) {
    const text = button.textContent?.trim() ?? "";
    // Match the stable data-nav identity first: other shells relabel these
    // buttons (e.g. "Plan campaigns"), and text-only matching then left no
    // navigation item marked current.
    const nav = button.dataset.nav;
    if (nav === "campaigns" || (!nav && text.startsWith("Campaigns"))) activate(button, "campaigns", "Campaigns");
    else if (nav === "studio" || (!nav && text.startsWith("Studio"))) activate(button, "studio", "Studio");
    else if (page && button.getAttribute("aria-current") !== "false") button.setAttribute("aria-current", "false");
  }
}

function activate(button: HTMLButtonElement, target: "campaigns" | "studio", text: string): void {
  button.disabled = false;
  button.dataset.nav = target;
  // Keep any richer label another shell applied; only fill in a missing one.
  if (!button.textContent?.trim()) button.textContent = text;
  const current = page === target ? "page" : "false";
  if (button.getAttribute("aria-current") !== current) button.setAttribute("aria-current", current);
}

function prepareForms(): void {
  if (!main) return;
  for (const label of main.querySelectorAll<HTMLLabelElement>("label")) {
    if (label.querySelector('input[type="checkbox"]')) label.classList.add("choice");
  }
  const form = main.querySelector<HTMLFormElement>('form[data-form="campaign-create-brief"]');
  if (!form) return;
  for (const evidence of form.querySelectorAll<HTMLInputElement>('input[name="evidenceIds"]')) evidence.checked = true;
  const audience = form.querySelector<HTMLSelectElement>('select[name="audienceKind"]');
  const icp = form.querySelector<HTMLSelectElement>('select[name="icpHypothesisId"]');
  if (!audience || !icp) return;
  const synchronize = (): void => {
    const usesSelectedIcp = audience.value === "selected_icp";
    icp.disabled = !usesSelectedIcp;
    if (usesSelectedIcp && !icp.value) {
      const option = [...icp.options].find((candidate) => Boolean(candidate.value));
      if (option) icp.value = option.value;
    }
  };
  audience.addEventListener("change", synchronize);
  synchronize();
}

async function open(target: "campaigns" | "studio"): Promise<void> {
  if (!main) return;
  const workspaceId = productStore.activeWorkspaceId();
  page = target;
  activateNavigation();
  main.setAttribute("aria-busy", "true");
  try {
    if (!workspaceId) {
      main.innerHTML = `<header class="hero compact"><div><p class="eyebrow">${target === "campaigns" ? "Campaigns" : "Studio"}</p><h2>Create a Product workspace first.</h2><p>Campaign and video authority depend on local Product Core truth, reviewed evidence, and approved claims.</p></div></header><section class="state empty"><strong>No active product workspace.</strong><span>Open Product and create a local workspace before entering this workflow.</span><button class="primary" type="button" data-nav="product">Open Product to create or restore a workspace</button></section>`;
      main.focus();
      return;
    }
    const product = await productStore.load(workspaceId);
    if (!product) {
      main.innerHTML = `<section class="state error" role="alert"><strong>Product workspace could not be loaded.</strong><span>Return to Home and recover the local workspace before continuing.</span></section>`;
      main.focus();
      return;
    }
    if (!controller || controller.workspaceId !== workspaceId) controller = new CampaignsViewController(workspaceId, product.createdBy);
    if (!videoController || videoController.workspaceId !== workspaceId) videoController = new VideoProductionViewController(workspaceId, product.createdBy);
    await Promise.all([controller.load(), videoController.load()]);
    render();
    main.focus();
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Unknown local workflow error";
    main.innerHTML = `<section class="state error" role="alert"><div><strong>${target === "campaigns" ? "Campaigns" : "Studio"} could not be opened.</strong><p>${escapeHtml(detail)}</p><p>The saved workspace was not intentionally changed.</p></div><button type="button" data-nav="${target}">Retry this workflow</button></section>`;
    main.focus();
    announce(`${target === "campaigns" ? "Campaigns" : "Studio"} workflow failed: ${detail}`);
  } finally {
    main.setAttribute("aria-busy", "false");
  }
}

function render(): void {
  if (!main || !page) return;
  const campaignHtml = controller?.render(page) ?? `<section class="state loading" role="status"><strong>Loading campaign workflow</strong></section>`;
  const videoHtml = page === "studio" ? videoController?.render() ?? `<section class="state loading" role="status"><strong>Loading video production workflow</strong></section>` : "";
  main.innerHTML = campaignHtml + videoHtml;
  prepareForms();
  activateNavigation();
}

async function refreshVideo(): Promise<void> {
  if (videoController) await videoController.load();
}

new MutationObserver(() => activateNavigation()).observe(sidebar ?? document.body, { childList: true, subtree: true });
activateNavigation();

document.addEventListener("click", (event) => {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>("button");
  if (!button) return;
  const target = button.dataset.nav;
  if (persistenceGate.state === "pending" && (target || button.dataset.videoAction || button.dataset.campaignAction)) {
    event.preventDefault();
    event.stopImmediatePropagation();
    announce("A change is still being saved. Navigation and additional mutations are blocked until acknowledgement.");
    return;
  }
  if (target === "campaigns" || target === "studio") {
    event.preventDefault();
    event.stopImmediatePropagation();
    void open(target);
    return;
  }
  if (target === "home" || target === "product" || target === "signals" || target === "market") page = undefined;
  if (button.dataset.videoAction && videoController && page === "studio") {
    event.preventDefault();
    event.stopImmediatePropagation();
    void runAcknowledgedMutation(() => videoController!.click(button));
    return;
  }
  if (!button.dataset.campaignAction || !controller || !page) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  void runAcknowledgedMutation(() => controller!.click(button), { refreshVideo: true });
}, true);

document.addEventListener("submit", (event) => {
  const form = event.target as HTMLFormElement;
  if (persistenceGate.state === "pending" && (form.dataset.form?.startsWith("video-") || form.dataset.form?.startsWith("campaign-"))) {
    event.preventDefault();
    event.stopImmediatePropagation();
    announce("A change is still being saved. Wait for acknowledgement before submitting another change.");
    return;
  }
  if (form.dataset.form?.startsWith("video-") && videoController && page === "studio") {
    event.preventDefault();
    event.stopImmediatePropagation();
    if (form.dataset.form === "video-create-brief" && (!form.querySelector('input[name="platforms"]:checked') || !form.querySelector('input[name="aspectRatios"]:checked'))) {
      announce("Select at least one video platform and aspect ratio");
      return;
    }
    void runAcknowledgedMutation(() => videoController!.submit(form));
    return;
  }
  if (!form.dataset.form?.startsWith("campaign-") || !controller || !page) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  if (form.dataset.form === "campaign-create-brief" && !form.querySelector('input[name="channels"]:checked')) {
    announce("Select at least one campaign channel");
    return;
  }
  void runAcknowledgedMutation(() => controller!.submit(form), { refreshVideo: true });
}, true);

window.addEventListener("beforeunload", (event) => {
  if (persistenceGate.state !== "pending") return;
  event.preventDefault();
  event.returnValue = "";
});
