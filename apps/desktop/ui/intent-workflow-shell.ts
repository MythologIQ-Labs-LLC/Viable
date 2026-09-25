const main = document.querySelector<HTMLElement>("#main");
const sidebar = document.querySelector<HTMLElement>("#sidebar");

const taskLabels: Readonly<Record<string, string>> = {
  home: "Home",
  product: "Product & audience",
  signals: "Review signals",
  market: "Market evidence",
  campaigns: "Plan campaigns",
  studio: "Create & review",
  calendar: "Calendar",
  analytics: "Analytics",
};

let queued = false;
let arranging = false;

function queueEnhance(): void {
  if (queued || arranging) return;
  queued = true;
  queueMicrotask(() => {
    queued = false;
    enhance();
  });
}

function enhance(): void {
  if (arranging) return;
  arranging = true;
  try {
    reframeNavigation();
    if (!main) return;
    if (main.querySelector("#inbox-heading")) arrangeSignals();
    if (main.querySelector("#calendar-heading")) arrangeCalendar();
    replaceTechnicalActionLabels();
  } finally {
    arranging = false;
  }
}

function reframeNavigation(): void {
  if (!sidebar) return;
  for (const button of sidebar.querySelectorAll<HTMLButtonElement>("nav button[data-nav]")) {
    const target = button.dataset.nav ?? "";
    const text = taskLabels[target];
    if (!text || button.textContent === text) continue;
    button.textContent = text;
    button.setAttribute("aria-label", text);
    if (target === "product") button.title = "Product Core truth, evidence, claims, ICP hypotheses, and readiness";
    if (target === "signals") button.title = "Review incoming evidence and turn accepted signals into owned work";
    if (target === "market") button.title = "Read reviewed market evidence and limitations";
    if (target === "campaigns") button.title = "Plan and review governed campaigns";
    if (target === "studio") button.title = "Create and review content, channel variants, exports, and video work";
  }
}

function arrangeSignals(): void {
  if (!main) return;
  const inbox = panelFor("#inbox-heading");
  const work = panelFor("#work-heading");
  const health = panelFor("#health-heading");
  const website = panelFor("#website-watch-heading");
  const sources = panelFor("#sources-heading");
  if (!inbox || !work) return;

  const firstPanel = main.querySelector<HTMLElement>("section.panel");
  if (firstPanel && firstPanel !== inbox) firstPanel.before(inbox, work);
  else if (inbox.nextElementSibling !== work) inbox.insertAdjacentElement("afterend", work);
  if (health && work.nextElementSibling !== health) work.insertAdjacentElement("afterend", health);

  if (website || sources) {
    let management = main.querySelector<HTMLDetailsElement>("details[data-intent-source-management]");
    if (!management) {
      management = document.createElement("details");
      management.dataset.intentSourceManagement = "true";
      management.className = "panel";
      management.innerHTML = `<summary><strong>Manage evidence sources</strong><span>Website monitoring, public repository collection, and advanced imports</span></summary><div data-intent-source-management-body></div>`;
      const anchor = health ?? work;
      anchor.insertAdjacentElement("afterend", management);
    }
    const body = management.querySelector<HTMLElement>("[data-intent-source-management-body]");
    if (body) {
      if (website && website.parentElement !== body) body.append(website);
      if (sources && sources.parentElement !== body) body.append(sources);
    }
  }

  const hero = main.querySelector<HTMLElement>("header.hero");
  if (hero) {
    const paragraph = hero.querySelector("p:not(.eyebrow)");
    if (paragraph) paragraph.textContent = "Start with the evidence waiting for review and the work it can create. Source setup remains available when you need to collect more.";
  }
}

function arrangeCalendar(): void {
  if (!main) return;
  const entries = panelFor("#calendar-records-heading");
  const packages = panelFor("#activation-packages-heading");
  const delivery = panelFor("#delivery-heading");
  const planning = panelFor("#planning-heading");
  const external = panelFor("#external-action-heading");
  const destination = panelFor("#destination-heading");
  if (!entries) return;

  const firstPanel = main.querySelector<HTMLElement>("section.panel");
  if (firstPanel && firstPanel !== entries) firstPanel.before(entries);
  let anchor: HTMLElement = entries;
  for (const panel of [packages, delivery, planning, external]) {
    if (!panel) continue;
    if (anchor.nextElementSibling !== panel) anchor.insertAdjacentElement("afterend", panel);
    anchor = panel;
  }

  if (destination) {
    let management = main.querySelector<HTMLDetailsElement>("details[data-intent-destination-management]");
    if (!management) {
      management = document.createElement("details");
      management.dataset.intentDestinationManagement = "true";
      management.className = "panel";
      management.innerHTML = `<summary><strong>Manage delivery destinations</strong><span>Non-secret account references, ownership, capabilities, and retry policy</span></summary><div data-intent-destination-management-body></div>`;
      anchor.insertAdjacentElement("afterend", management);
    }
    const body = management.querySelector<HTMLElement>("[data-intent-destination-management-body]");
    if (body && destination.parentElement !== body) body.append(destination);
  }

  const hero = main.querySelector<HTMLElement>("header.hero");
  if (hero) {
    const paragraph = hero.querySelector("p:not(.eyebrow)");
    if (paragraph) paragraph.textContent = "Start with scheduled work, packages, and delivery evidence. Planning and destination setup remain available below when the next action needs them.";
  }
}

function replaceTechnicalActionLabels(): void {
  if (!main) return;
  for (const button of main.querySelectorAll<HTMLButtonElement>('button[data-signal-action="materialize-product"]')) {
    const failed = button.textContent?.toLowerCase().includes("retry") ?? false;
    button.textContent = failed ? "Retry creating Product action" : "Create Product action";
    button.title = "Creates the authoritative action in Product Core after destination checks pass";
  }
  for (const summary of main.querySelectorAll<HTMLElement>("details > summary")) {
    const text = summary.textContent?.trim() ?? "";
    if (text === "Materialize Campaign brief") summary.textContent = "Create Campaign draft";
    else if (text === "Retry Campaign materialization") summary.textContent = "Retry creating Campaign draft";
    else if (text === "Materialize content brief") summary.textContent = "Create content brief";
    else if (text === "Retry content brief materialization") summary.textContent = "Retry creating content brief";
    else if (text === "Materialize Website Watch response") summary.textContent = "Create Calendar response plan";
    else if (text === "Retry Website Watch response materialization") summary.textContent = "Retry creating Calendar response plan";
  }
}

function panelFor(selector: string): HTMLElement | undefined {
  return main?.querySelector<HTMLElement>(selector)?.closest<HTMLElement>("section.panel") ?? undefined;
}

new MutationObserver(queueEnhance).observe(main ?? document.body, { childList: true, subtree: true });
new MutationObserver(queueEnhance).observe(sidebar ?? document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["aria-current"] });
queueEnhance();
