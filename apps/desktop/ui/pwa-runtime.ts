// Loaded only by the PWA build (scripts/build-pwa.mjs injects it); the desktop
// runtime never registers a service worker.
//
// Update contract (ADR-0010): a new build never replaces code under a running
// session. A waiting service worker is activated only after a person confirms.
// Only the tab that requested activation reloads automatically; other open tabs
// stay intact and ask their own user/session to reload when it is safe.

const live = document.querySelector<HTMLElement>("#live-region");
let reloading = false;
let activationRequestedHere = false;

function removeUpdateBanner(): void {
  document.querySelector("[data-pwa-update]")?.remove();
}

function showUpdateBanner(worker: ServiceWorker): void {
  if (document.querySelector("[data-pwa-update]")) return;
  const banner = document.createElement("section");
  banner.className = "state offline pwa-update";
  banner.setAttribute("role", "status");
  banner.dataset.pwaUpdate = "";
  banner.innerHTML = `<strong>A new version of Viable is ready.</strong><span>Your local data stays on this device. Save any open form, then update.</span><div class="actions"><button type="button" data-pwa-action="update">Update now</button><button type="button" data-pwa-action="later">Later</button></div>`;
  banner.addEventListener("click", (event) => {
    const action = (event.target as HTMLElement).closest<HTMLButtonElement>("button[data-pwa-action]")?.dataset.pwaAction;
    if (action === "update") {
      activationRequestedHere = true;
      worker.postMessage({ type: "VIABLE_ACTIVATE_UPDATE" });
    }
    if (action === "update" || action === "later") banner.remove();
  });
  document.body.prepend(banner);
  if (live) live.textContent = "A new version of Viable is ready to install.";
}

function showActivatedElsewhereBanner(): void {
  removeUpdateBanner();
  if (document.querySelector("[data-pwa-update-active]")) return;
  const banner = document.createElement("section");
  banner.className = "state offline pwa-update";
  banner.setAttribute("role", "status");
  banner.dataset.pwaUpdateActive = "";
  banner.innerHTML = `<strong>Viable was updated in another tab.</strong><span>This tab has not been reloaded. Save any open form, then reload when you are ready.</span><div class="actions"><button type="button" data-pwa-action="reload">Reload now</button><button type="button" data-pwa-action="later">Later</button></div>`;
  banner.addEventListener("click", (event) => {
    const action = (event.target as HTMLElement).closest<HTMLButtonElement>("button[data-pwa-action]")?.dataset.pwaAction;
    if (action === "reload") {
      reloading = true;
      window.location.reload();
    }
    if (action === "later") banner.remove();
  });
  document.body.prepend(banner);
  if (live) live.textContent = "Viable was updated in another tab. Reload this tab when your open work is saved.";
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
    if (hadController && !reloading) {
      if (activationRequestedHere) {
        reloading = true;
        window.location.reload();
      } else {
        // Service-worker activation is origin-wide. Another tab may have
        // confirmed it, but that is not permission to discard this tab's
        // unsaved form state.
        showActivatedElsewhereBanner();
      }
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
