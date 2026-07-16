import { LocalStorageProductWorkspaceStore } from "./local-storage-product-workspace-store.js";
import { RepositoryGrowthViewController } from "./repository-growth-view.js";

const productStore = new LocalStorageProductWorkspaceStore();
const main = document.querySelector<HTMLElement>("#main");
const live = document.querySelector<HTMLElement>("#live-region");
let active = false;
let controller: RepositoryGrowthViewController | undefined;

function announce(message: string): void {
  if (live) live.textContent = message;
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

async function open(): Promise<void> {
  if (!main) return;
  const workspaceId = productStore.activeWorkspaceId();
  active = true;
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
  const productButton = document.querySelector<HTMLButtonElement>('#sidebar button[data-nav="product"]');
  productButton?.click();
}

new MutationObserver(() => decorateProduct()).observe(main ?? document.body, { childList: true, subtree: true });
decorateProduct();

document.addEventListener("click", (event) => {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>("button");
  if (!button) return;
  const action = button.dataset.repositoryAction;
  if (action === "open") {
    event.preventDefault();
    event.stopImmediatePropagation();
    void open().catch((error: unknown) => {
      announce(`Repository growth failed: ${error instanceof Error ? error.message : "Unknown error"}`);
      if (main) main.setAttribute("aria-busy", "false");
    });
    return;
  }
  if (action === "return-product") {
    event.preventDefault();
    event.stopImmediatePropagation();
    returnToProduct();
    return;
  }
  if (button.dataset.nav && !button.dataset.repositoryAction) active = false;
  if (!active || !action || !controller) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  main?.setAttribute("aria-busy", "true");
  void controller.click(button).then((message) => {
    render();
    if (message) announce(message);
  }).catch((error: unknown) => {
    render();
    announce(`Repository action failed: ${error instanceof Error ? error.message : "Unknown error"}`);
  }).finally(() => main?.setAttribute("aria-busy", "false"));
}, true);

document.addEventListener("submit", (event) => {
  const form = event.target as HTMLFormElement;
  if (!active || !controller || !form.dataset.form?.startsWith("repository-")) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  main?.setAttribute("aria-busy", "true");
  void controller.submit(form).then((message) => {
    render();
    if (message) announce(message);
  }).catch((error: unknown) => {
    render();
    announce(`Repository operation failed: ${error instanceof Error ? error.message : "Unknown error"}`);
  }).finally(() => main?.setAttribute("aria-busy", "false"));
}, true);
