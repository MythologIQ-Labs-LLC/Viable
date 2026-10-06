const main = document.querySelector<HTMLElement>("#main");
const live = document.querySelector<HTMLElement>("#live-region");
let failed = false;

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown desktop startup error";
}

function renderFailure(error: unknown): void {
  if (failed) return;
  failed = true;
  const detail = message(error);
  if (main) {
    main.setAttribute("aria-busy", "false");
    main.innerHTML = `<section class="state error" role="alert" aria-labelledby="startup-failure-heading">
      <div><strong id="startup-failure-heading">The local workspace could not be opened.</strong>
      <p>${escapeHtml(detail)}</p>
      <p>The saved profile was not intentionally changed. Open workspace recovery to export unreadable data, restore a backup, or delete the workspace. Nothing changes until you choose.</p></div>
      <button type="button" data-startup-action="recover">Open workspace recovery</button>
    </section>`;
    main.querySelector<HTMLButtonElement>('[data-startup-action="recover"]')?.addEventListener("click", () => openRecovery(detail));
    main.focus();
  }
  if (live) live.textContent = `Viable could not open the local workspace: ${detail}`;
}

// Loads only the Workspace screen, which reads stored data defensively and can
// quarantine, restore, or delete it without the rest of the app.
function openRecovery(detail: string): void {
  import("./workspace-lifecycle-shell.js")
    .then((shell) => shell.openWorkspaceRecovery(detail))
    .catch((error: unknown) => {
      if (live) live.textContent = `Workspace recovery could not be opened: ${message(error)}`;
      const note = document.createElement("p");
      note.setAttribute("role", "alert");
      note.textContent = `Workspace recovery could not be opened: ${message(error)} Your data has not been changed.`;
      main?.append(note);
    });
}

window.addEventListener("error", (event) => renderFailure(event.error ?? event.message));
window.addEventListener("unhandledrejection", (event) => {
  event.preventDefault();
  renderFailure(event.reason);
});

void import("./entry.js").catch(renderFailure);
