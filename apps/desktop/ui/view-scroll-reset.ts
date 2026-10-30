// A newly opened view starts at its top. Without this, the window kept the
// previous view's scroll offset, so leaving a long screen landed the person
// thousands of pixels into the next one with its heading out of sight.
// Navigations that reveal a specific record move focus to it first; those
// keep their position.
const sidebar = document.querySelector<HTMLElement>("#sidebar");
let currentView = sidebar?.querySelector<HTMLElement>('[aria-current="page"]')?.dataset.nav;

function startAtTop(): void {
  const view = sidebar?.querySelector<HTMLElement>('[aria-current="page"]')?.dataset.nav;
  if (!view || view === currentView) return;
  currentView = view;
  const focused = document.activeElement;
  const revealed = focused && focused !== document.body && focused.id !== "main" && !focused.closest("#sidebar");
  if (!revealed) window.scrollTo({ top: 0, behavior: "instant" });
}

if (sidebar) new MutationObserver(startAtTop).observe(sidebar, { subtree: true, childList: true, attributes: true, attributeFilter: ["aria-current"] });
