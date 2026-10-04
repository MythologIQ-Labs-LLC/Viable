import { LocalStorageProductWorkspaceStore } from "./local-storage-product-workspace-store.js";
import { ActivationLearningViewController } from "./activation-learning-view.js";
import { PublicationInventoryViewController } from "./publication-inventory-view.js";

const productStore = new LocalStorageProductWorkspaceStore();
const sidebar = document.querySelector<HTMLElement>("#sidebar");
const main = document.querySelector<HTMLElement>("#main");
const live = document.querySelector<HTMLElement>("#live-region");
let page: "calendar" | "analytics" | undefined;
let controller: ActivationLearningViewController | undefined;
let inventoryController: PublicationInventoryViewController | undefined;

function announce(message: string): void {
  if (live) live.textContent = message;
}

function activateNavigation(): void {
  if (!sidebar) return;
  const nav = sidebar.querySelector("nav");
  if (!nav) return;
  let calendar = nav.querySelector<HTMLButtonElement>('button[data-nav="calendar"]');
  if (!calendar) {
    calendar = [...nav.querySelectorAll<HTMLButtonElement>("button")].find((item) => item.textContent?.trim().startsWith("Calendar")) ?? null;
  }
  if (calendar) activate(calendar, "calendar", "Calendar");
  let analytics = nav.querySelector<HTMLButtonElement>('button[data-nav="analytics"]');
  if (!analytics) {
    analytics = document.createElement("button");
    analytics.type = "button";
    analytics.dataset.nav = "analytics";
    analytics.textContent = "Analytics";
    nav.append(analytics);
  }
  activate(analytics, "analytics", "Analytics");
  for (const button of nav.querySelectorAll<HTMLButtonElement>("button")) {
    if (page && button.dataset.nav !== page && ["calendar", "analytics"].includes(button.dataset.nav ?? "")) button.setAttribute("aria-current", "false");
  }
}

function activate(button: HTMLButtonElement, target: "calendar" | "analytics", text: string): void {
  button.disabled = false;
  button.dataset.nav = target;
  if (button.textContent !== text) button.textContent = text;
  button.setAttribute("aria-current", page === target ? "page" : "false");
}

async function open(target: "calendar" | "analytics"): Promise<void> {
  if (!main) return;
  const workspaceId = productStore.activeWorkspaceId();
  page = target;
  activateNavigation();
  main.setAttribute("aria-busy", "true");
  if (!workspaceId) {
    main.innerHTML = `<header class="hero compact"><div><p class="eyebrow">${target === "calendar" ? "Calendar" : "Analytics"}</p><h2>Create a Product workspace first.</h2><p>Activation and learning must remain connected to local Product Core authority.</p></div></header><section class="state empty"><strong>No active product workspace.</strong><span>Open Product and create a local workspace before scheduling or measuring work.</span></section>`;
    main.setAttribute("aria-busy", "false");
    main.focus();
    return;
  }
  const product = await productStore.load(workspaceId);
  if (!product) throw new Error("Product workspace could not be loaded");
  if (!controller || controller.workspaceId !== workspaceId) controller = new ActivationLearningViewController(workspaceId, product.createdBy);
  if (!inventoryController || inventoryController.workspaceId !== workspaceId) inventoryController = new PublicationInventoryViewController(workspaceId, product.createdBy);
  await refreshControllers();
  render();
  main.setAttribute("aria-busy", "false");
  main.focus();
}

async function refreshControllers(): Promise<void> {
  const loads: Promise<void>[] = [];
  if (controller) loads.push(controller.load());
  if (inventoryController) loads.push(inventoryController.load());
  await Promise.all(loads);
}

function render(): void {
  if (!main || !page) return;
  const primary = controller?.render(page) ?? `<section class="state loading" role="status"><strong>Loading Calendar and Analytics</strong></section>`;
  const inventory = page === "calendar" ? inventoryController?.render() ?? "" : "";
  main.innerHTML = primary + inventory;
  prepareForms();
  activateNavigation();
}

function prepareForms(): void {
  if (!main) return;
  const now = new Date();
  for (const form of main.querySelectorAll<HTMLFormElement>("form")) {
    for (const name of ["startsAt", "observedAt", "capturedAt", "observationStartsAt", "windowStartsAt", "availableFrom"]) setDate(form, name, now);
    for (const name of ["endsAt", "observationEndsAt", "windowEndsAt", "expiresAt"]) setDate(form, name, addDays(now, 14));
    setDate(form, "baselineStartsAt", addDays(now, -14));
    setDate(form, "baselineEndsAt", addDays(now, -1));
  }
  extendDestinationChannels();
  const external = main.querySelector<HTMLFormElement>('form[data-form="activation-external-entry"]');
  if (external) synchronizeSourceOptions(external);
  const inventory = main.querySelector<HTMLFormElement>('form[data-form="publication-inventory-item"]');
  if (inventory) synchronizePublicationSourceOptions(inventory);
  const delivery = main.querySelector<HTMLFormElement>('form[data-form="activation-delivery-outcome"]');
  if (delivery) synchronizeDeliveryEntry(delivery);
}

function extendDestinationChannels(): void {
  const select = main?.querySelector<HTMLSelectElement>('form[data-form="activation-destination"] select[name="channel"]');
  if (!select) return;
  const additions = [
    ["facebook_page", "Facebook Page"],
    ["instagram_feed", "Instagram Feed"],
  ] as const;
  for (const [value, text] of additions) {
    if ([...select.options].some((option) => option.value === value)) continue;
    const option = document.createElement("option");
    option.value = value;
    option.textContent = text;
    select.append(option);
  }
}

function synchronizeSourceOptions(form: HTMLFormElement): void {
  const destination = form.querySelector<HTMLSelectElement>('select[name="destinationId"]');
  const source = form.querySelector<HTMLSelectElement>('select[name="source"]');
  if (!destination || !source) return;
  const synchronize = (): void => {
    const channel = destination.selectedOptions[0]?.dataset.channel;
    let first: HTMLOptionElement | undefined;
    for (const option of source.options) {
      const matches = option.dataset.channel === channel;
      option.hidden = !matches;
      option.disabled = !matches;
      if (matches && !first) first = option;
    }
    if (first) source.value = first.value;
  };
  destination.addEventListener("change", synchronize);
  synchronize();
}

function synchronizePublicationSourceOptions(form: HTMLFormElement): void {
  const policy = form.querySelector<HTMLSelectElement>('select[name="policyId"]');
  const destination = form.querySelector<HTMLInputElement>('input[name="destinationId"]');
  const source = form.querySelector<HTMLSelectElement>('select[name="source"]');
  if (!policy || !destination || !source) return;
  const synchronize = (): void => {
    const selected = policy.selectedOptions[0];
    const channel = selected?.dataset.channel;
    destination.value = selected?.dataset.destinationId ?? "";
    let first: HTMLOptionElement | undefined;
    for (const option of source.options) {
      const matches = option.dataset.channel === channel;
      option.hidden = !matches;
      option.disabled = !matches;
      if (matches && !first) first = option;
    }
    if (first) source.value = first.value;
  };
  policy.addEventListener("change", synchronize);
  synchronize();
}

function synchronizeDeliveryEntry(form: HTMLFormElement): void {
  const packageSelect = form.querySelector<HTMLSelectElement>('select[name="packageId"]');
  const entry = form.querySelector<HTMLInputElement>('input[name="calendarEntryId"]');
  if (!packageSelect || !entry) return;
  const synchronize = (): void => { entry.value = packageSelect.selectedOptions[0]?.dataset.entryId ?? ""; };
  packageSelect.addEventListener("change", synchronize);
  synchronize();
}

function setDate(form: HTMLFormElement, name: string, value: Date): void {
  const input = form.querySelector<HTMLInputElement>(`input[name="${name}"]`);
  if (input && !input.value) input.value = localDateTime(value);
}

function localDateTime(value: Date): string {
  const local = new Date(value.getTime() - value.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function addDays(value: Date, days: number): Date {
  return new Date(value.getTime() + days * 24 * 60 * 60 * 1000);
}

new MutationObserver(() => activateNavigation()).observe(sidebar ?? document.body, { childList: true, subtree: true });
activateNavigation();

document.addEventListener("click", (event) => {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>("button");
  if (!button) return;
  const target = button.dataset.nav;
  if (target === "calendar" || target === "analytics") {
    event.preventDefault();
    event.stopImmediatePropagation();
    void open(target).catch((error: unknown) => {
      announce(`Calendar or Analytics failed: ${error instanceof Error ? error.message : "Unknown error"}`);
      main?.setAttribute("aria-busy", "false");
    });
    return;
  }
  if (target && !["calendar", "analytics"].includes(target)) page = undefined;
  if (!page) return;
  const activationAction = button.dataset.activationAction;
  const publicationAction = button.dataset.publicationAction;
  if (!activationAction && !publicationAction) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  main?.setAttribute("aria-busy", "true");
  const operation = activationAction
    ? controller?.click(button)
    : inventoryController?.click(button);
  if (!operation) {
    main?.setAttribute("aria-busy", "false");
    return;
  }
  void operation.then(async (message) => {
    await refreshControllers();
    render();
    if (message) announce(message);
  }).catch((error: unknown) => {
    render();
    announce(`Calendar or Analytics action failed: ${error instanceof Error ? error.message : "Unknown error"}`);
  }).finally(() => main?.setAttribute("aria-busy", "false"));
}, true);

document.addEventListener("submit", (event) => {
  const form = event.target as HTMLFormElement;
  const formKind = form.dataset.form ?? "";
  if (!page || (!formKind.startsWith("activation-") && !formKind.startsWith("publication-"))) return;
  const operation = formKind.startsWith("publication-")
    ? inventoryController?.submit(form)
    : controller?.submit(form);
  if (!operation) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  main?.setAttribute("aria-busy", "true");
  void operation.then(async (message) => {
    await refreshControllers();
    render();
    if (message) announce(message);
  }).catch((error: unknown) => {
    render();
    announce(`Calendar or Analytics operation failed: ${error instanceof Error ? error.message : "Unknown error"}`);
  }).finally(() => main?.setAttribute("aria-busy", "false"));
}, true);
