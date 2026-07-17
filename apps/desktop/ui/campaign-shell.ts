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

function announce(message: string): void {
  if (live) live.textContent = message;
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
    if (text.startsWith("Campaigns")) activate(button, "campaigns", "Campaigns");
    if (text.startsWith("Studio")) activate(button, "studio", "Studio");
    if (page && button.dataset.nav !== page) button.setAttribute("aria-current", "false");
  }
}

function activate(button: HTMLButtonElement, target: "campaigns" | "studio", text: string): void {
  button.disabled = false;
  button.dataset.nav = target;
  if (button.textContent !== text) button.textContent = text;
  button.setAttribute("aria-current", page === target ? "page" : "false");
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
      main.innerHTML = `<header class="hero compact"><div><p class="eyebrow">${target === "campaigns" ? "Campaigns" : "Studio"}</p><h2>Create a Product workspace first.</h2><p>Campaign and video authority depend on local Product Core truth, reviewed evidence, and approved claims.</p></div></header><section class="state empty"><strong>No active product workspace.</strong><span>Open Product and create a local workspace before entering this workflow.</span></section>`;
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
    main?.setAttribute("aria-busy", "true");
    void videoController.click(button).then((message) => {
      render();
      if (message) announce(message);
    }).catch((error: unknown) => {
      render();
      announce(`Video production action failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }).finally(() => main?.setAttribute("aria-busy", "false"));
    return;
  }
  if (!button.dataset.campaignAction || !controller || !page) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  main?.setAttribute("aria-busy", "true");
  void controller.click(button).then(async (message) => {
    await refreshVideo();
    render();
    if (message) announce(message);
  }).catch((error: unknown) => {
    render();
    announce(`Campaign action failed: ${error instanceof Error ? error.message : "Unknown error"}`);
  }).finally(() => main?.setAttribute("aria-busy", "false"));
}, true);

document.addEventListener("submit", (event) => {
  const form = event.target as HTMLFormElement;
  if (form.dataset.form?.startsWith("video-") && videoController && page === "studio") {
    event.preventDefault();
    event.stopImmediatePropagation();
    if (form.dataset.form === "video-create-brief" && (!form.querySelector('input[name="platforms"]:checked') || !form.querySelector('input[name="aspectRatios"]:checked'))) {
      announce("Select at least one video platform and aspect ratio");
      return;
    }
    main?.setAttribute("aria-busy", "true");
    void videoController.submit(form).then((message) => {
      render();
      if (message) announce(message);
    }).catch((error: unknown) => {
      render();
      announce(`Video production operation failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }).finally(() => main?.setAttribute("aria-busy", "false"));
    return;
  }
  if (!form.dataset.form?.startsWith("campaign-") || !controller || !page) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  if (form.dataset.form === "campaign-create-brief" && !form.querySelector('input[name="channels"]:checked')) {
    announce("Select at least one campaign channel");
    return;
  }
  main?.setAttribute("aria-busy", "true");
  void controller.submit(form).then(async (message) => {
    await refreshVideo();
    render();
    if (message) announce(message);
  }).catch((error: unknown) => {
    render();
    announce(`Campaign operation failed: ${error instanceof Error ? error.message : "Unknown error"}`);
  }).finally(() => main?.setAttribute("aria-busy", "false"));
}, true);
