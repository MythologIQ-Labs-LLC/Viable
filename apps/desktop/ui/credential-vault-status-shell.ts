import {
  NativeCredentialVaultClient,
  type NativeCredentialCapability,
} from "./native-credential-vault.js";

const client = new NativeCredentialVaultClient();
let capability: NativeCredentialCapability = {
  status: "runtime_unavailable",
  canStoreSecrets: false,
};
let refreshInFlight: Promise<void> | undefined;

function statusCopy(value: NativeCredentialCapability): Readonly<{
  tone: "offline" | "warning" | "error" | "implemented";
  heading: string;
  detail: string;
}> {
  switch (value.status) {
    case "available":
      return {
        tone: "implemented",
        heading: "Native credential vault ready.",
        detail: "Provider secrets can be stored in the operating system secure store. Viable workspace data keeps only opaque references.",
      };
    case "inaccessible":
      return {
        tone: "warning",
        heading: "Secure credential storage is currently inaccessible.",
        detail: "Unlock or restore the operating system credential service, then retry. Live provider activation remains disabled until secure storage is available.",
      };
    case "unsupported":
      return {
        tone: "warning",
        heading: "Secure credential storage is unsupported in this environment.",
        detail: "Viable will not fall back to plaintext credential storage. Live provider activation remains disabled.",
      };
    case "platform_failure":
      return {
        tone: "error",
        heading: "The native credential store could not be initialized.",
        detail: "No provider secret has been stored outside the operating system vault. Retry after the platform credential service is healthy.",
      };
    case "runtime_unavailable":
      return {
        tone: "offline",
        heading: "Credential vault status requires the Viable desktop runtime.",
        detail: "Browser/test rendering cannot access the operating system credential store and cannot enable live provider activation.",
      };
  }
}

function render(): void {
  const workspace = document.querySelector<HTMLElement>(".publication-inventory-workspace");
  if (!workspace) return;
  const copy = statusCopy(capability);
  let section = workspace.querySelector<HTMLElement>("#credential-vault-status");
  if (!section) {
    section = document.createElement("section");
    section.id = "credential-vault-status";
    const hero = workspace.querySelector(".hero");
    hero?.insertAdjacentElement("afterend", section);
    if (!hero) workspace.prepend(section);
  }
  // render() runs from a subtree MutationObserver on #main. Writing identical
  // markup would itself mutate #main and re-trigger the observer forever, so
  // only touch the DOM when the rendered state actually changes.
  const className = `state ${copy.tone}`;
  const role = capability.canStoreSecrets ? "status" : "alert";
  const html = `<strong>${escapeHtml(copy.heading)}</strong><span>${escapeHtml(copy.detail)}</span>`;
  if (section.className !== className) section.className = className;
  if (section.getAttribute("role") !== role) section.setAttribute("role", role);
  if (section.innerHTML !== html) section.innerHTML = html;
}

async function refresh(): Promise<void> {
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = client.capability()
    .then((next) => { capability = next; })
    .catch(() => { capability = { status: "platform_failure", canStoreSecrets: false }; })
    .finally(() => {
      refreshInFlight = undefined;
      render();
    });
  return refreshInFlight;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

new MutationObserver(() => render()).observe(document.querySelector("#main") ?? document.body, {
  childList: true,
  subtree: true,
});

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") void refresh();
});

void refresh();
