const sidebar = document.querySelector<HTMLElement>("#sidebar");
let queued = false;
let applyingHistory = false;

function cssEscape(value: string): string {
  return globalThis.CSS?.escape ? globalThis.CSS.escape(value) : value.replaceAll('"', '\\"');
}

function currentNav(): string | undefined {
  return sidebar?.querySelector<HTMLButtonElement>('button[data-nav][aria-current="page"]')?.dataset.nav;
}

function targetButton(nav: string): HTMLButtonElement | undefined {
  return sidebar?.querySelector<HTMLButtonElement>(`button[data-nav="${cssEscape(nav)}"]:not(:disabled)`) ?? undefined;
}

function hashNav(): string | undefined {
  const raw = decodeURIComponent(location.hash.replace(/^#/, "")).trim();
  return raw || undefined;
}

function writeHistory(nav: string, mode: "push" | "replace"): void {
  const url = new URL(location.href);
  url.hash = nav;
  const state = { ...(history.state && typeof history.state === "object" ? history.state : {}), viableNav: nav };
  if (mode === "push") history.pushState(state, "", url); else history.replaceState(state, "", url);
}

function restoreFromHistory(): void {
  const nav = hashNav();
  if (!nav) {
    const current = currentNav();
    if (current) writeHistory(current, "replace");
    return;
  }
  const button = targetButton(nav);
  if (!button) {
    const current = currentNav();
    if (current) writeHistory(current, "replace");
    return;
  }
  if (currentNav() === nav) return;
  applyingHistory = true;
  button.click();
  queueMicrotask(() => {
    applyingHistory = false;
    const actual = currentNav();
    if (actual !== nav && actual) writeHistory(actual, "replace");
  });
}

function queueRestore(): void {
  if (queued) return;
  queued = true;
  queueMicrotask(() => {
    queued = false;
    restoreFromHistory();
  });
}

document.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof Element)) return;
  const button = target.closest<HTMLButtonElement>("button[data-nav]:not(:disabled)");
  const nav = button?.dataset.nav;
  if (!button || !nav || applyingHistory) return;
  queueMicrotask(() => {
    if (currentNav() !== nav) return;
    if (hashNav() === nav) return;
    writeHistory(nav, "push");
  });
});

window.addEventListener("popstate", restoreFromHistory);
window.addEventListener("hashchange", restoreFromHistory);
new MutationObserver(queueRestore).observe(sidebar ?? document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["aria-current"] });
queueRestore();
