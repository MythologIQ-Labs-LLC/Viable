// Loaded only by the PWA build (scripts/build-pwa.mjs injects it); the desktop
// runtime never registers a service worker.
//
// Update contract (ADR-0010): a new build never replaces code under a running
// session. A waiting service worker is activated only after the person
// confirms, and the page reloads once the new worker takes control.

const live = document.querySelector<HTMLElement>("#live-region");
let reloading = false;

function showUpdateBanner(worker: ServiceWorker): void {
  if (document.querySelector("[data-pwa-update]")) return;
  const banner = document.createElement("section");
  banner.className = "state offline pwa-update";
  banner.setAttribute("role", "status");
  banner.dataset.pwaUpdate = "";
  banner.innerHTML = `<strong>A new version of Viable is ready.</strong><span>Your local data stays on this device. Save any open form, then update.</span><div class="actions"><button type="button" data-pwa-action="update">Update now</button><button type="button" data-pwa-action="later">Later</button></div>`;
  banner.addEventListener("click", (event) => {
    const action = (event.target as HTMLElement).closest<HTMLButtonElement>("button[data-pwa-action]")?.dataset.pwaAction;
    if (action === "update") worker.postMessage({ type: "VIABLE_ACTIVATE_UPDATE" });
    if (action === "update" || action === "later") banner.remove();
  });
  document.body.prepend(banner);
  if (live) live.textContent = "A new version of Viable is ready to install.";
}

function watchForWaiting(registration: ServiceWorkerRegistration): void {
  if (registration.waiting && navigator.serviceWorker.controller) showUpdateBanner(registration.waiting);
  registration.addEventListener("updatefound", () => {
    const installing = registration.installing;
    installing?.addEventListener("statechange", () => {
      // First install (no controller) needs no prompt; only updates do.
      if (installing.state === "installed" && navigator.serviceWorker.controller) showUpdateBanner(installing);
    });
  });
}

if ("serviceWorker" in navigator && window.isSecureContext) {
  let hadController = Boolean(navigator.serviceWorker.controller);
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    // Reload only when an existing session was upgraded at the person's request.
    if (hadController && !reloading) {
      reloading = true;
      window.location.reload();
    }
    hadController = true;
  });
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js", { scope: "./" })
      .then((registration) => {
        watchForWaiting(registration);
        // Check for a new build when the person returns to Viable.
        document.addEventListener("visibilitychange", () => {
          if (document.visibilityState === "visible") void registration.update().catch(() => undefined);
        });
      })
      .catch(() => {
        if (live) live.textContent = "Offline support could not be enabled in this browser. Viable still works while online.";
      });
  });
}
