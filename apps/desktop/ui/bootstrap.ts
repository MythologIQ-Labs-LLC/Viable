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
      <p>The saved profile was not intentionally changed. Close and reopen Viable after correcting or removing the affected local profile data.</p></div>
    </section>`;
    main.focus();
  }
  if (live) live.textContent = `Viable could not open the local workspace: ${detail}`;
}

window.addEventListener("error", (event) => renderFailure(event.error ?? event.message));
window.addEventListener("unhandledrejection", (event) => {
  event.preventDefault();
  renderFailure(event.reason);
});

void import("./app.js").catch(renderFailure);
