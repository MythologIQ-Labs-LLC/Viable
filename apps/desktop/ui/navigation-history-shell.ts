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

// Views that live inside a navigation page and own their own URL. Their
// shell opens and closes them; history only selects the parent page and never
// overwrites the sub-view's entry with the parent's.
const SUBVIEW_PARENT: Readonly<Record<string, string>> = { "repository-growth": "product" };

function pageOf(nav: string | undefined): string | undefined {
  return nav ? SUBVIEW_PARENT[nav] ?? nav : undefined;
}

function hashNav(): string | undefined {
  const raw = decodeURIComponent(location.hash.replace(/^#/, "")).trim();
  return raw || undefined;
}

function writeHistory(nav: string, mode: "push" | "replace"): void {
  const url = new URL(location.href);
  url.hash = nav;
  const state = { ...(history.state && typeof history.state === "object" ? history.state : {}), viableNav: nav };
  // Browsers may refuse rapid history writes (WebKit throws after 100 in 10 s).
  // Navigation itself already happened; only the history entry is skipped.
  try {
    if (mode === "push") history.pushState(state, "", url); else history.replaceState(state, "", url);
  } catch {
    /* history entry not recorded; the visible view is unaffected */
  }
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
  const page = pageOf(nav)!;
  const button = targetButton(page);
  if (!button) return false;
  if (currentNav() === page) return true;
  applyingHistory = true;
  button.click();
  // Views reload their workspace before rendering, so aria-current changes
  // after the click resolves. Judging the outcome in a microtask saw the old
  // page and overwrote the entry being restored (Back then cycled).
  void navigationSettled(page).then(() => {
    applyingHistory = false;
    const actual = currentNav();
    if (actual !== page && actual) writeHistory(actual, "replace");
  });
  return true;
}

const HISTORY_SETTLE_MS = 3000;

function navigationSettled(nav: string): Promise<void> {
  return new Promise((resolveSettled) => {
    if (currentNav() === nav) { resolveSettled(); return; }
    const done = (): void => { observer.disconnect(); clearTimeout(timer); resolveSettled(); };
    const observer = new MutationObserver(() => { if (currentNav() === nav) done(); });
    const timer = setTimeout(done, HISTORY_SETTLE_MS);
    observer.observe(sidebar ?? document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["aria-current"] });
  });
}

// Record the page the person is on whenever navigation state changes.
function recordCurrent(): void {
  if (applyingHistory) return;
  const current = currentNav();
  if (current && pageOf(hashNav()) !== current) writeHistory(current, "push");
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
