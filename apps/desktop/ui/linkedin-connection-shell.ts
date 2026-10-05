import type { ActivationLearningWorkspace, DestinationRecord } from "../../../src/activation-learning/domain/activation-learning.js";
import type { LinkedInMemberConnectionRecord, ProviderConnectionWorkspace } from "../../../src/activation-learning/domain/provider-connection.js";
import { LinkedInMemberConnectionService } from "../../../src/activation-learning/services/linkedin-member-connection-service.js";
import { LocalStorageActivationLearningStore } from "./local-storage-activation-learning-store.js";
import { LocalStorageProductWorkspaceStore } from "./local-storage-product-workspace-store.js";
import { LocalStorageProviderConnectionStore } from "./local-storage-provider-connection-store.js";
import { NativeCredentialVaultClient, type NativeCredentialCapability } from "./native-credential-vault.js";
import { NativeLinkedInProviderClient } from "./native-linkedin-provider.js";

const productStore = new LocalStorageProductWorkspaceStore();
const activationStore = new LocalStorageActivationLearningStore();
const connectionStore = new LocalStorageProviderConnectionStore();
const nativeProvider = new NativeLinkedInProviderClient();
const vaultClient = new NativeCredentialVaultClient();
const connectionService = new LinkedInMemberConnectionService(activationStore, connectionStore, nativeProvider);
const live = document.querySelector<HTMLElement>("#live-region");

let activation: ActivationLearningWorkspace | undefined;
let connections: ProviderConnectionWorkspace | undefined;
let vault: NativeCredentialCapability = { status: "runtime_unavailable", canStoreSecrets: false };
let loading = false;
let lastWorkspaceId: string | undefined;
let lastMessage: Readonly<{ tone: "implemented" | "warning" | "error"; text: string }> | undefined;

function announce(message: string): void {
  if (live) live.textContent = message;
}

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function linkedinDestinations(): readonly DestinationRecord[] {
  return (activation?.destinations ?? []).filter(
    (destination) => destination.channel === "linkedin" && destination.status === "active",
  );
}

function connectionFor(destinationId: string): LinkedInMemberConnectionRecord | undefined {
  return connections?.connections.find(
    (connection) => connection.provider === "linkedin_member" && connection.destinationId === destinationId,
  ) as LinkedInMemberConnectionRecord | undefined;
}

function connectionStatus(connection: LinkedInMemberConnectionRecord | undefined): string {
  if (!connection) return "Not connected";
  if (connection.status === "connected") {
    const expiry = connection.tokenExpiresAt
      ? ` Token expiry recorded as ${new Date(connection.tokenExpiresAt).toLocaleString()}.`
      : " Token expiry was not recorded.";
    return `Connected as ${connection.memberUrn}.${expiry}`;
  }
  if (connection.status === "reconnect_required") return "Reconnect required before automated publishing can continue.";
  return "Connection disabled.";
}

function render(): void {
  const workspace = document.querySelector<HTMLElement>(".publication-inventory-workspace");
  if (!workspace) return;

  let section = workspace.querySelector<HTMLElement>("#linkedin-member-connection");
  if (!section) {
    section = document.createElement("section");
    section.id = "linkedin-member-connection";
    section.className = "panel";
    const vaultStatus = workspace.querySelector("#credential-vault-status");
    if (vaultStatus) vaultStatus.insertAdjacentElement("afterend", section);
    else workspace.prepend(section);
  }

  if (loading) {
    section.innerHTML = `<div class="section-heading"><div><p class="eyebrow">Connected publishing</p><h3>LinkedIn member</h3></div><span class="pill warning">Checking</span></div><div class="state loading" role="status"><strong>Checking local LinkedIn setup</strong><span>Reading non-secret connection authority and secure-store capability.</span></div>`;
    return;
  }

  const destinations = linkedinDestinations();
  const enabled = vault.canStoreSecrets && destinations.length > 0;
  const destinationOptions = destinations.map((destination) => {
    const connection = connectionFor(destination.id);
    const label = connection?.status === "connected" ? `${destination.label} · connected` : destination.label;
    return `<option value="${escapeHtml(destination.id)}">${escapeHtml(label)}</option>`;
  }).join("");

  const connectionSummaries = destinations.map((destination) => {
    const connection = connectionFor(destination.id);
    const tone = connection?.status === "connected" ? "implemented" : connection?.status === "reconnect_required" ? "warning" : "offline";
    return `<div class="state ${tone}"><strong>${escapeHtml(destination.label)}</strong><span>${escapeHtml(connectionStatus(connection))}</span></div>`;
  }).join("");

  const vaultWarning = vault.canStoreSecrets ? "" : `<div class="state warning" role="alert"><strong>Secure storage is not ready.</strong><span>Viable will not accept a LinkedIn token until the operating-system credential vault is available.</span></div>`;
  const destinationWarning = destinations.length > 0 ? "" : `<div class="state empty"><strong>Create a LinkedIn destination first.</strong><span>In Calendar, add an active LinkedIn destination and confirm that you control the account. Then return here to connect publishing.</span></div>`;
  const message = lastMessage ? `<div class="state ${lastMessage.tone}" role="status"><strong>${escapeHtml(lastMessage.text)}</strong></div>` : "";

  section.innerHTML = `
    <div class="section-heading">
      <div><p class="eyebrow">Connected publishing</p><h3>LinkedIn member</h3></div>
      <span class="pill ${destinations.some((destination) => connectionFor(destination.id)?.status === "connected") ? "implemented" : "warning"}">${destinations.some((destination) => connectionFor(destination.id)?.status === "connected") ? "Connected" : "Setup required"}</span>
    </div>
    <p>Viable uses LinkedIn's self-service Consumer products for this first proof. The token is accepted once, validated natively, and stored only in your operating-system credential vault.</p>
    ${connectionSummaries}
    ${vaultWarning}
    ${destinationWarning}
    ${message}
    <div class="panel narrow">
      <div class="section-heading"><div><p class="eyebrow">Step 1</p><h4>Enable the two LinkedIn products</h4></div></div>
      <p>In your LinkedIn developer app, enable <strong>Sign in with LinkedIn using OpenID Connect</strong> and <strong>Share on LinkedIn</strong>. These are the self-service products used by this local connection.</p>
      <p><a href="https://www.linkedin.com/developers/apps" target="_blank" rel="noreferrer">Open LinkedIn Developer Apps</a></p>
    </div>
    <div class="panel narrow">
      <div class="section-heading"><div><p class="eyebrow">Step 2</p><h4>Generate a member token</h4></div></div>
      <p>Open LinkedIn's official Token Generator, choose this developer app, and generate a member token with <code>openid</code>, <code>profile</code>, and <code>w_member_social</code>. Copy the token once.</p>
      <p><a href="https://www.linkedin.com/developers/tools/oauth/token-generator" target="_blank" rel="noreferrer">Open LinkedIn Token Generator</a></p>
    </div>
    <div class="panel narrow">
      <div class="section-heading"><div><p class="eyebrow">Step 3</p><h4>Connect Viable</h4></div></div>
      <form data-form="linkedin-member-connection">
        <label>LinkedIn destination
          <select name="destinationId" required ${enabled ? "" : "disabled"}>${destinationOptions}</select>
        </label>
        <label>Member access token
          <input name="accessToken" type="password" required autocomplete="off" spellcheck="false" ${enabled ? "" : "disabled"}>
          <span class="field-help">This value is cleared from the form immediately and is never written to Viable workspace storage.</span>
        </label>
        <label>Token expiration <span class="optional">optional</span>
          <input name="tokenExpiresAt" type="datetime-local" ${enabled ? "" : "disabled"}>
          <span class="field-help">Use the expiration shown by LinkedIn's token details so Viable can fail closed before an expired token is dispatched.</span>
        </label>
        <button type="submit" ${enabled ? "" : "disabled"}>Validate and connect LinkedIn</button>
      </form>
    </div>`;
}

async function refresh(force = false): Promise<void> {
  const workspaceId = productStore.activeWorkspaceId();
  if (!workspaceId) {
    activation = undefined;
    connections = undefined;
    lastWorkspaceId = undefined;
    render();
    return;
  }
  if (!force && loading) return;
  loading = true;
  render();
  try {
    const [nextActivation, nextConnections, nextVault] = await Promise.all([
      activationStore.load(workspaceId),
      connectionStore.load(workspaceId),
      vaultClient.capability(),
    ]);
    activation = nextActivation;
    connections = nextConnections;
    vault = nextVault;
    lastWorkspaceId = workspaceId;
  } catch {
    vault = { status: "platform_failure", canStoreSecrets: false };
    lastMessage = { tone: "error", text: "LinkedIn connection state could not be loaded safely." };
  } finally {
    loading = false;
    render();
  }
}

async function connect(form: HTMLFormElement): Promise<void> {
  const workspaceId = productStore.activeWorkspaceId();
  if (!workspaceId) throw new Error("Create a Product workspace before connecting LinkedIn");
  const data = new FormData(form);
  const destinationId = String(data.get("destinationId") ?? "").trim();
  const tokenInput = form.querySelector<HTMLInputElement>('input[name="accessToken"]');
  const accessToken = String(data.get("accessToken") ?? "").trim();
  if (tokenInput) tokenInput.value = "";
  const localExpiry = String(data.get("tokenExpiresAt") ?? "").trim();
  const tokenExpiresAt = localExpiry ? new Date(localExpiry).toISOString() : undefined;
  lastMessage = undefined;

  const result = await connectionService.connectWithDeveloperPortalToken({
    workspaceId,
    destinationId,
    accessToken,
    ...(tokenExpiresAt ? { tokenExpiresAt } : {}),
  });

  if (result.kind === "connected") {
    lastMessage = { tone: "implemented", text: "LinkedIn is connected. The token is stored in the native credential vault and only the opaque reference remains in Viable data." };
    announce("LinkedIn member publishing connected.");
  } else {
    const tone = result.failureClass === "rate_limited" || result.failureClass === "local_unavailable" ? "warning" : "error";
    lastMessage = { tone, text: result.detail };
    announce(`LinkedIn connection was not completed: ${result.detail}`);
  }
  await refresh(true);
}

new MutationObserver(() => {
  const workspace = document.querySelector(".publication-inventory-workspace");
  if (!workspace) return;
  const workspaceId = productStore.activeWorkspaceId();
  if (!workspace.querySelector("#linkedin-member-connection")) render();
  if (workspaceId && workspaceId !== lastWorkspaceId && !loading) void refresh();
}).observe(document.querySelector("#main") ?? document.body, { childList: true, subtree: true });

document.addEventListener("submit", (event) => {
  const form = event.target as HTMLFormElement;
  if (form.dataset.form !== "linkedin-member-connection") return;
  event.preventDefault();
  event.stopImmediatePropagation();
  const submit = form.querySelector<HTMLButtonElement>('button[type="submit"]');
  if (submit) submit.disabled = true;
  void connect(form).catch((error: unknown) => {
    const message = error instanceof Error ? error.message : "Unknown LinkedIn connection error";
    lastMessage = { tone: "error", text: message };
    announce(`LinkedIn connection failed: ${message}`);
    render();
  }).finally(() => {
    if (submit) submit.disabled = false;
  });
}, true);

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") void refresh(true);
});

void refresh();
