import {
  describeRuntimeCapabilities,
  type RuntimeObservation,
  type StoragePersistence,
} from "../../../src/runtime/runtime-capabilities.js";
import {
  serializeSupportDiagnosticReport,
  type SupportDiagnosticBuildInfo,
} from "../../../src/runtime/support-diagnostics.js";
import { NativeCredentialVaultClient } from "./native-credential-vault.js";
import { workspaceStorageStatus } from "./workspace-storage.js";

// Truthful runtime capability panel for the Workspace page (ADR-0010).

type BuildInfo = SupportDiagnosticBuildInfo;

const vault = new NativeCredentialVaultClient();
const main = document.querySelector<HTMLElement>("#main");
const live = document.querySelector<HTMLElement>("#live-region");
let observation: RuntimeObservation | undefined;
let buildInfo: BuildInfo | undefined;
let storageUsage: string | undefined;
let storageMessage: string | undefined;
let refreshing = false;

function isNativeRuntime(): boolean {
  return Boolean((globalThis as { __TAURI__?: unknown }).__TAURI__);
}

async function storagePersistence(): Promise<StoragePersistence> {
  try {
    if (!navigator.storage?.persisted) return "unknown";
    return (await navigator.storage.persisted()) ? "persisted" : "best_effort";
  } catch {
    return "unknown";
  }
}

async function loadBuildInfo(): Promise<BuildInfo | undefined> {
  try {
    const response = await fetch("build-info.json", { cache: "no-store" });
    if (!response.ok) return undefined;
    const value = await response.json() as Partial<BuildInfo>;
    return typeof value.buildId === "string" && typeof value.version === "string" && typeof value.commit === "string"
      ? { buildId: value.buildId, version: value.version, commit: value.commit }
      : undefined;
  } catch {
    return undefined;
  }
}

async function loadStorageUsage(): Promise<string | undefined> {
  try {
    const estimate = await navigator.storage?.estimate?.();
    if (!estimate?.usage || !estimate.quota) return undefined;
    return `${(estimate.usage / 1024).toFixed(0)} KB used of about ${(estimate.quota / 1024 / 1024).toFixed(0)} MB available to this origin`;
  } catch {
    return undefined;
  }
}

async function refresh(): Promise<void> {
  if (refreshing) return;
  refreshing = true;
  try {
    const native = isNativeRuntime();
    const [vaultState, persistence, info, usage] = await Promise.all([
      vault.capability().then((value) => value.status).catch(() => "platform_failure" as const),
      native ? Promise.resolve<StoragePersistence>("unknown") : storagePersistence(),
      loadBuildInfo(),
      native ? Promise.resolve(undefined) : loadStorageUsage(),
    ]);
    observation = {
      runtime: native ? "native" : "browser",
      credentialVault: vaultState,
      linkedInTransport: native,
      storagePersistence: persistence,
      storageEngine: workspaceStorageStatus.engine,
      offlineShell: Boolean(navigator.serviceWorker?.controller),
    };
    buildInfo = info;
    storageUsage = usage;
  } finally {
    refreshing = false;
    render();
  }
}

function escapeHtml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}

function storageEngineText(): string {
  const status = workspaceStorageStatus;
  if (status.engine === "unavailable") return `Saved workspace data could not be opened: ${status.fallbackReason ?? "storage unavailable"}. Nothing was changed.`;
  if (status.engine === "localStorage") return `Workspace data is in fallback browser storage: ${status.fallbackReason ?? "IndexedDB is unavailable"}`;
  const migrated = status.migration.status === "migrated" ? ` ${status.migration.keys} saved records were copied from older browser storage; the original copy was left untouched.` : "";
  return `Workspace data is stored in IndexedDB on this device and saved in atomic transactions.${migrated}`;
}

function markup(value: RuntimeObservation): string {
  const runtimeLabel = value.runtime === "native" ? "Viable desktop runtime" : "Viable in the browser";
  const build = buildInfo
    ? `Build ${escapeHtml(buildInfo.version)} · ${escapeHtml(buildInfo.buildId.slice(0, 12))} · source ${escapeHtml(buildInfo.commit.slice(0, 12))}`
    : value.runtime === "native" ? "Desktop build" : "Development build (no build identity)";
  const rows = describeRuntimeCapabilities(value).map((capability) => {
    const tone = capability.state === "available" ? "implemented" : capability.state === "limited" ? "warning" : "neutral";
    return `<tr data-capability="${capability.id}"><th scope="row">${escapeHtml(capability.label)}</th><td><span class="pill ${tone}">${capability.state}</span></td><td>${escapeHtml(capability.detail)}</td></tr>`;
  }).join("");
  const canRequestPersistence = value.runtime === "browser" && value.storagePersistence === "best_effort";
  return `<div class="section-heading"><div><p class="eyebrow">Runtime</p><h3 id="runtime-heading">${runtimeLabel}</h3></div><span class="pill neutral">${build}</span></div>
    <p class="guidance">Viable keeps the same product in every runtime. A capability is limited only where this runtime genuinely cannot provide it, and the reason is shown here.</p>
    <p class="guidance" data-storage-engine="${workspaceStorageStatus.engine}" data-storage-persistence="${value.storagePersistence}">${escapeHtml(storageEngineText())}</p>
    ${storageUsage ? `<p class="guidance">${escapeHtml(storageUsage)}.</p>` : ""}
    ${storageMessage ? `<section class="state warning" role="status"><span>${escapeHtml(storageMessage)}</span></section>` : ""}
    <p class="guidance" data-support-diagnostics-scope>Support diagnostics contain build, runtime, storage-state, capability-state, and browser user-agent facts only. They do not include workspace IDs or content, provider account metadata, tokens, logs, prompts, or raw failure text.</p>
    <div class="actions">
      ${canRequestPersistence ? `<button type="button" data-runtime-action="persist-storage">Ask the browser to keep Viable data</button>` : ""}
      <button type="button" data-runtime-action="download-diagnostics">Download support diagnostics</button>
    </div>
    <div class="table-wrap"><table><thead><tr><th scope="col">Capability</th><th scope="col">State</th><th scope="col">Why</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}

function downloadSupportDiagnostics(): void {
  if (!observation) return;
  const text = serializeSupportDiagnosticReport({
    generatedAt: new Date().toISOString(),
    observation,
    ...(buildInfo ? { build: buildInfo } : {}),
    userAgent: navigator.userAgent,
  });
  const blob = new Blob([text], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  const stamp = new Date().toISOString().replaceAll(":", "-").replace(/\.\d{3}Z$/, "Z");
  anchor.href = url;
  anchor.download = `viable-support-diagnostics-${stamp}.json`;
  anchor.hidden = true;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

// Results that only change the panel visually are also announced (#161).
function announce(message: string): void {
  if (live) live.textContent = message;
}

function render(): void {
  const host = main?.querySelector<HTMLElement>("[data-runtime-capabilities]");
  if (!host) return;
  const html = observation ? markup(observation) : `<div class="state loading" role="status"><strong>Checking this runtime</strong></div>`;
  // Rendered from a MutationObserver on #main: only write when content changes,
  // otherwise the write re-triggers the observer indefinitely.
  if (host.dataset.renderedHtml === html) return;
  host.dataset.renderedHtml = html;
  host.innerHTML = html;
}

document.addEventListener("click", (event) => {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>("button[data-runtime-action]");
  if (!button) return;
  if (button.dataset.runtimeAction === "download-diagnostics") {
    downloadSupportDiagnostics();
    if (observation) announce("Support diagnostics downloaded. The file contains runtime facts only, no workspace content.");
    return;
  }
  if (button.dataset.runtimeAction !== "persist-storage") return;
  button.disabled = true;
  void (async () => {
    let granted = false;
    try { granted = Boolean(await navigator.storage?.persist?.()); } catch { granted = false; }
    storageMessage = granted
      ? undefined
      : "The browser did not grant persistent storage. Installing Viable or using it regularly can help; keep regular backups either way.";
    await refresh();
    announce(granted
      ? "The browser agreed to keep Viable data unless you clear it."
      : "The browser did not grant persistent storage. Keep regular backups.");
  })();
});

if (main) {
  new MutationObserver(() => {
    const host = main.querySelector<HTMLElement>("[data-runtime-capabilities]");
    if (!host) return;
    if (!host.dataset.renderedHtml) {
      if (observation) render(); else void refresh();
    }
  }).observe(main, { childList: true, subtree: true });
}

navigator.serviceWorker?.addEventListener?.("controllerchange", () => void refresh());
