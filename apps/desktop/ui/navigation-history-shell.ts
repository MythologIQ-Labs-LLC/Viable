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

// Only history events (initial load, back/forward, hash edits) navigate from
// the URL. A page shell updating aria-current is navigation the person already
// made; it is recorded in history, never "corrected" from a stale hash. Doing
// the latter trapped people on a page (e.g. Workspace) because aria-current
// changes before history can be written.
function restoreFromHistory(): boolean {
  const nav = hashNav();
  if (!nav) {
    const current = currentNav();
    if (current) writeHistory(current, "replace");
    return Boolean(current);
  }
  const button = targetButton(nav);
  if (!button) return false;
  if (currentNav() === nav) return true;
  applyingHistory = true;
  button.click();
  queueMicrotask(() => {
    applyingHistory = false;
    const actual = currentNav();
    if (actual !== nav && actual) writeHistory(actual, "replace");
  });
  return true;
}

// Record the page the person is on whenever navigation state changes.
function recordCurrent(): void {
  if (applyingHistory) return;
  const current = currentNav();
  if (current && hashNav() !== current) writeHistory(current, "push");
}

// The sidebar is rendered asynchronously by several shells. Until the initial
// URL has been applied, retry when navigation appears; afterwards only record.
let initialApplied = false;
function onNavigationMutation(): void {
  if (queued) return;
  queued = true;
  queueMicrotask(() => {
    queued = false;
    if (!initialApplied) {
      initialApplied = restoreFromHistory();
      return;
    }
    recordCurrent();
  });
}

window.addEventListener("popstate", () => { restoreFromHistory(); });
window.addEventListener("hashchange", () => { restoreFromHistory(); });
new MutationObserver(onNavigationMutation).observe(sidebar ?? document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["aria-current"] });
onNavigationMutation();
