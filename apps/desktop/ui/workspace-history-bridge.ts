function pointsToWorkspace(target: Element): boolean {
  const button = target.closest<HTMLButtonElement>("button");
  return button?.dataset.nav === "workspace" || button?.dataset.action === "reset-workspace";
}

function writeWorkspaceHistory(): void {
  if (decodeURIComponent(location.hash.replace(/^#/, "")) === "workspace") return;
  const url = new URL(location.href);
  url.hash = "workspace";
  const state = { ...(history.state && typeof history.state === "object" ? history.state : {}), viableNav: "workspace" };
  history.pushState(state, "", url);
}

document.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof Element) || !pointsToWorkspace(target)) return;
  writeWorkspaceHistory();
}, true);
