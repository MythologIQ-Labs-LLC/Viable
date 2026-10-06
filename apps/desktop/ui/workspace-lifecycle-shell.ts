import {
  PRODUCT_ACTIVE_KEY,
  WORKSPACE_CONTEXTS,
  WorkspaceLifecycleService,
  workspaceScopedKeys,
  type RecoveryPointDecision,
  type WorkspaceImportPreview,
  type WorkspaceScopePreview,
} from "../../../src/workspace-lifecycle/workspace-lifecycle-service.js";
import { RETENTION_POLICY } from "../../../src/workspace-lifecycle/retention-policy.js";
import { decodeStoredWorkspace } from "../../../src/workspace-lifecycle/workspace-storage-schema.js";
import { purgeLegacyWorkspaceRecords, workspaceStorage } from "./workspace-storage.js";

const lifecycle = new WorkspaceLifecycleService(workspaceStorage);
const sidebar = document.querySelector<HTMLElement>("#sidebar");
const main = document.querySelector<HTMLElement>("#main");
const live = document.querySelector<HTMLElement>("#live-region");

let pageOpen = false;
let selectedWorkspaceId: string | undefined;
let pendingImportText: string | undefined;
let pendingImport: WorkspaceImportPreview | undefined;
let importFailure: string | undefined;
let actionFailure: string | undefined;
let quarantineExportedFor: string | undefined;
// The recovery point downloaded in this session; valid only while the
// workspace's stored state still matches its fingerprint.
let recoveryPointFor: Readonly<{ workspaceId: string; fingerprint: string }> | undefined;
// Set when startup failed and only this screen is running (recovery mode).
let startupFailure: string | undefined;

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function announce(message: string): void {
  if (live) live.textContent = message;
}

function knownWorkspaceIds(): string[] {
  return [...lifecycle.knownWorkspaceIds()].sort();
}

function currentWorkspaceId(): string | undefined {
  const active = workspaceStorage.getItem(PRODUCT_ACTIVE_KEY) ?? undefined;
  const known = knownWorkspaceIds();
  if (selectedWorkspaceId && known.includes(selectedWorkspaceId)) return selectedWorkspaceId;
  if (active && known.includes(active)) return active;
  return known[0];
}

function productName(workspaceId: string): string {
  const product = WORKSPACE_CONTEXTS.find((context) => context.name === "product");
  if (!product) return workspaceId;
  const raw = workspaceStorage.getItem(`${product.prefix}${workspaceId}`);
  if (!raw) return workspaceId;
  try {
    // Only retained schema versions are read; newer or invalid envelopes show the ID.
    const decoded = decodeStoredWorkspace(JSON.parse(raw));
    if (decoded.status !== "decoded") return workspaceId;
    const name = (decoded.workspace as { product?: { identity?: { name?: unknown } } } | null)?.product?.identity?.name;
    return typeof name === "string" && name.trim() ? name : workspaceId;
  } catch {
    return workspaceId;
  }
}

function activateNavigation(): void {
  if (!sidebar) return;
  const nav = sidebar.querySelector("nav");
  if (!nav) return;
  let button = nav.querySelector<HTMLButtonElement>('button[data-nav="workspace"]');
  if (!button) {
    button = document.createElement("button");
    button.type = "button";
    button.dataset.nav = "workspace";
    button.textContent = "Workspace";
    nav.append(button);
  }
  button.disabled = false;
  button.setAttribute("aria-current", pageOpen ? "page" : "false");
  if (pageOpen) {
    for (const other of nav.querySelectorAll<HTMLButtonElement>('button[data-nav]:not([data-nav="workspace"])')) other.setAttribute("aria-current", "false");
  }

  const legacyReset = main?.querySelector<HTMLButtonElement>('button[data-action="reset-workspace"]');
  if (legacyReset) {
    delete legacyReset.dataset.action;
    legacyReset.dataset.nav = "workspace";
    legacyReset.classList.remove("danger");
    legacyReset.textContent = "Manage workspace";
  }
}

function scopeTable(preview: WorkspaceScopePreview): string {
  return `<div class="card-list" data-workspace-scope>${preview.contexts.map((context) => `
    <article class="card">
      <div class="section-heading"><strong>${escapeHtml(context.label)}</strong><span class="pill ${context.status === "present" ? "implemented" : context.status === "corrupt" ? "warning" : "neutral"}">${escapeHtml(context.status)}</span></div>
      <p>${context.status === "present" ? `${context.recordCount} local record${context.recordCount === 1 ? "" : "s"}` : context.status === "absent" ? "No local context stored for this workspace." : escapeHtml(context.issue ?? "Stored context could not be validated.")}</p>
    </article>`).join("")}</div>`;
}

function workspacePicker(ids: readonly string[], current: string): string {
  if (ids.length <= 1) return "";
  return `<section class="state warning"><div><strong>Multiple workspace IDs exist in this desktop profile.</strong><p>Choose which workspace to inspect. Viable will not silently combine them.</p></div><label>Workspace to manage<select data-workspace-select>${ids.map((id) => `<option value="${escapeHtml(id)}" ${id === current ? "selected" : ""}>${escapeHtml(productName(id))} · ${escapeHtml(id)}</option>`).join("")}</select></label></section>`;
}

function recoveryPointStatus(workspaceId: string): "current" | "stale" | "none" {
  if (recoveryPointFor?.workspaceId !== workspaceId) return "none";
  return recoveryPointFor.fingerprint === lifecycle.stateFingerprint(workspaceId) ? "current" : "stale";
}

/** Explicit decision for a destructive action, or undefined when none was made. */
function recoveryDecision(workspaceId: string, declined: boolean): RecoveryPointDecision | undefined {
  if (declined) return { kind: "declined" };
  if (recoveryPointFor?.workspaceId === workspaceId) return { kind: "downloaded", fingerprint: recoveryPointFor.fingerprint };
  return undefined;
}

function recoveryPointControls(workspaceId: string, backupBlocked: boolean, declineField: string): string {
  const status = recoveryPointStatus(workspaceId);
  const message = status === "current"
    ? "A recovery point of the current state was downloaded. Restoring that file brings this workspace back."
    : status === "stale"
      ? "This workspace changed after the last recovery point was downloaded. Download a new one, or continue without one."
      : backupBlocked
        ? "A recovery point cannot be created while a normal backup is blocked. Continuing means no restorable copy of this state will exist."
        : "Before this cannot be undone, download a recovery point: a normal workspace backup of exactly the current state.";
  return `<fieldset class="recovery-point" data-recovery-point="${status}">
      <legend>Recovery point</legend>
      <p>${message} Viable keeps no hidden internal copy; the file is yours to keep or delete.</p>
      <div class="actions"><button type="button" data-workspace-action="recovery-point" data-workspace-id="${escapeHtml(workspaceId)}" ${backupBlocked ? "disabled" : ""}>Download recovery point</button></div>
      <label class="choice"><input type="checkbox" ${declineField}> Continue without a recovery point</label>
    </fieldset>`;
}

const DELETION_EFFECT: Readonly<Record<string, string>> = {
  removed: "Removed",
  kept: "Kept",
  not_workspace_data: "Not workspace data",
};

function retentionSection(): string {
  return `<section class="panel" aria-labelledby="retention-heading" data-workspace-retention>
    <div class="section-heading"><div><p class="eyebrow">Retention</p><h3 id="retention-heading">How long Viable keeps data</h3></div></div>
    <p class="guidance">Viable never deletes or expires data on its own. Data stays until you change, replace, or delete it. Dates such as retention deadlines only make data eligible for a removal that a person runs.</p>
    <details><summary><strong>Review what is kept, where, and for how long</strong></summary>
      <table><thead><tr><th scope="col">Data</th><th scope="col">Where</th><th scope="col">Kept until</th><th scope="col">Workspace deletion</th></tr></thead>
      <tbody>${RETENTION_POLICY.map((rule) => `<tr data-retention-rule="${escapeHtml(rule.id)}"><th scope="row">${escapeHtml(rule.data)}</th><td>${escapeHtml(rule.location)}</td><td>${escapeHtml(rule.keptUntil)}</td><td>${escapeHtml(DELETION_EFFECT[rule.workspaceDeletion])}</td></tr>`).join("")}</tbody></table>
    </details>
  </section>`;
}

function backupSection(preview: WorkspaceScopePreview): string {
  const blocked = preview.hasCorruptData;
  return `<section class="panel" aria-labelledby="backup-heading">
    <div class="section-heading"><div><p class="eyebrow">Backup</p><h3 id="backup-heading">Export the complete local workspace</h3></div><span class="pill neutral">7 contexts</span></div>
    <p class="guidance">The backup contains Product Core plus every workspace-scoped downstream context. Credential-like fields are rejected rather than exported. The checksum detects accidental modification or truncation; it is not a digital signature.</p>
    ${blocked ? `<section class="state warning"><strong>Normal backup is blocked by corrupt local context.</strong><span>Export the quarantine package first so the unreadable raw data is preserved without mutating it.</span></section>` : ""}
    <div class="actions">
      <button type="button" data-workspace-action="backup" ${blocked ? "disabled" : ""}>Download workspace backup</button>
      ${blocked ? `<button type="button" data-workspace-action="quarantine">Export quarantine data</button>` : ""}
    </div>
  </section>`;
}

function restoreSection(): string {
  const preview = pendingImport;
  const quarantineBlocked = Boolean(preview?.requiresQuarantineExport && quarantineExportedFor !== preview.backup.workspaceId);
  return `<section class="panel" aria-labelledby="restore-heading">
    <div class="section-heading"><div><p class="eyebrow">Restore</p><h3 id="restore-heading">Restore a Viable workspace backup</h3></div></div>
    <p class="guidance">Choose a backup file. Viable validates format, version, checksum, context identity, required shapes, and credential-like fields before enabling any mutation.</p>
    <label>Workspace backup file<input type="file" accept="application/json,.json" data-workspace-import></label>
    ${importFailure ? `<section class="state error" role="alert" tabindex="-1" data-workspace-import-error><strong>Backup was not accepted.</strong><span>${escapeHtml(importFailure)} No local workspace data was changed.</span></section>` : ""}
    ${preview ? `<section class="state ${preview.conflict ? "warning" : "offline"}" data-workspace-import-preview><div><strong>Backup validated for ${escapeHtml(productNameFromBackup(preview))}.</strong><p>Workspace ID: ${escapeHtml(preview.backup.workspaceId)} · created ${escapeHtml(new Date(preview.backup.createdAt).toLocaleString())}</p>${preview.conflict ? `<p>${escapeHtml(preview.conflict)}</p>` : ""}${quarantineBlocked ? `<p data-workspace-restore-quarantine>The current workspace contains corrupt or newer-version data that this restore would overwrite. Export quarantine data above before replacing it.</p>` : ""}</div></section>
      ${preview.canReplaceCurrentWorkspace && !preview.canRestoreIntoEmptyProfile && !quarantineBlocked ? recoveryPointControls(preview.backup.workspaceId, lifecycle.inspect(preview.backup.workspaceId).hasCorruptData, "data-workspace-restore-decline") : ""}
      <div class="actions">
        <button type="button" data-workspace-action="restore-empty" ${preview.canRestoreIntoEmptyProfile ? "" : "disabled"}>Restore into empty profile</button>
        <button type="button" data-workspace-action="restore-replace" ${preview.canReplaceCurrentWorkspace && !preview.canRestoreIntoEmptyProfile && !quarantineBlocked ? "" : "disabled"}>Replace current workspace from backup</button>
      </div>` : ""}
  </section>`;
}

function productNameFromBackup(preview: WorkspaceImportPreview): string {
  const product = preview.backup.contexts.product as { product?: { identity?: { name?: unknown } } } | null;
  const name = product?.product?.identity?.name;
  return typeof name === "string" && name.trim() ? name : preview.backup.workspaceId;
}

function deleteSection(preview: WorkspaceScopePreview): string {
  const corruptBlocked = preview.hasCorruptData && quarantineExportedFor !== preview.workspaceId;
  return `<section class="panel danger-zone" aria-labelledby="delete-heading">
    <div class="section-heading"><div><p class="eyebrow">Destructive action</p><h3 id="delete-heading">Delete or reset this workspace</h3></div><span class="pill warning">Local and product-wide</span></div>
    <p>This removes all seven workspace-scoped contexts and the active workspace pointer from this desktop profile. It does not delete exported backup, recovery-point, or quarantine files outside Viable, provider credentials in the operating system's credential vault, application files, or unrelated desktop/browser preferences. See “How long Viable keeps data” for everything Viable stores. Nothing is anonymized or silently retained inside a hidden Viable tombstone.</p>
    <details><summary><strong>Review exact deletion scope</strong><span>${preview.totalRecords} counted local records across the contexts below.</span></summary>${scopeTable(preview)}<h4>Retained outside workspace deletion</h4><ul>${preview.retainedOutsideWorkspace.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul><h4>Anonymized</h4><p>None. Workspace-scoped records are deleted rather than converted into anonymous copies.</p></details>
    ${corruptBlocked ? `<section class="state warning"><strong>Deletion is blocked until corrupt raw data is exported.</strong><span>Use “Export quarantine data” above. This avoids destroying the only recoverable copy of unreadable local context.</span></section>` : ""}
    <form data-workspace-delete>
      ${recoveryPointControls(preview.workspaceId, preview.hasCorruptData, 'name="declineRecoveryPoint"')}
      <label class="choice"><input type="checkbox" name="scopeConfirmed" required> I reviewed the product-wide deletion scope above.</label>
      <label>Type DELETE to confirm<input name="confirmation" autocomplete="off" required></label>
      <button class="danger" type="submit" ${corruptBlocked ? "disabled" : ""}>Delete all workspace-scoped local data</button>
    </form>
  </section>`;
}

function recoveryBanner(): string {
  if (!startupFailure) return "";
  return `<section class="state warning" role="alert" data-workspace-recovery-mode><div><strong>Recovery mode: only the Workspace screen is running.</strong>
    <p>Viable could not start: ${escapeHtml(startupFailure)}</p>
    <p>Nothing has been changed. Export quarantine data to keep a copy of anything unreadable, then restore a backup or delete the workspace. Reload Viable when you are done.</p></div>
    <button type="button" data-workspace-action="reload-app">Reload Viable</button></section>`;
}

function renderWorkspace(): void {
  if (!main || !pageOpen) return;
  const ids = knownWorkspaceIds();
  const workspaceId = currentWorkspaceId();
  main.setAttribute("aria-busy", "false");
  if (!workspaceId) {
    main.innerHTML = `${recoveryBanner()}<header class="hero compact"><div><p class="eyebrow">Workspace</p><h2>Backup, restore, and local data lifecycle.</h2><p>This desktop profile does not currently contain a Viable workspace.</p></div></header>
      ${actionFailure ? `<section class="state error" role="alert"><strong>Workspace action failed.</strong><span>${escapeHtml(actionFailure)}</span></section>` : ""}
      ${restoreSection()}
      ${retentionSection()}
      <section class="panel" data-runtime-capabilities aria-labelledby="runtime-heading"></section>`;
    activateNavigation();
    main.focus();
    return;
  }

  const preview = lifecycle.inspect(workspaceId);
  selectedWorkspaceId = workspaceId;
  main.innerHTML = `${recoveryBanner()}<header class="hero compact"><div><p class="eyebrow">Workspace</p><h2>${escapeHtml(productName(workspaceId))}</h2><p>Manage the complete local workspace without pretending Product Core is the whole application.</p></div><span class="pill ${preview.hasCorruptData ? "warning" : "implemented"}">${preview.hasCorruptData ? "Needs recovery" : "Local workspace"}</span></header>
    ${workspacePicker(ids, workspaceId)}
    ${actionFailure ? `<section class="state error" role="alert" tabindex="-1" data-workspace-action-error><strong>Workspace action failed.</strong><span>${escapeHtml(actionFailure)}</span></section>` : ""}
    <section class="metrics" aria-label="Workspace lifecycle summary"><article><span>Workspace contexts</span><strong>${preview.contexts.filter((item) => item.status === "present").length}/7</strong><small>${preview.contexts.filter((item) => item.status === "absent").length} absent</small></article><article><span>Counted records</span><strong>${preview.totalRecords}</strong><small>Across workspace-scoped stores</small></article><article><span>Corrupt contexts</span><strong>${preview.contexts.filter((item) => item.status === "corrupt").length}</strong><small>${preview.hasCorruptData ? "Quarantine before deletion" : "No detected corruption"}</small></article><article><span>Active</span><strong>${preview.active ? "Yes" : "No"}</strong><small>${escapeHtml(workspaceId)}</small></article></section>
    <section class="panel" data-runtime-capabilities aria-labelledby="runtime-heading"></section>
    <section class="panel" aria-labelledby="scope-heading"><div class="section-heading"><div><p class="eyebrow">Scope preview</p><h3 id="scope-heading">What belongs to this workspace</h3></div></div>${scopeTable(preview)}</section>
    ${backupSection(preview)}
    ${restoreSection()}
    ${retentionSection()}
    ${deleteSection(preview)}`;
  activateNavigation();
  main.focus();
}

function openWorkspace(): void {
  pageOpen = true;
  actionFailure = undefined;
  activateNavigation();
  renderWorkspace();
}

/**
 * Recovery mode: called by the startup guard when Viable could not start,
 * typically because stored workspace data is unreadable. Only this screen
 * runs, so the person can export quarantine data, restore, or delete without
 * developer tools. It changes nothing by itself.
 */
export function openWorkspaceRecovery(reason: string): void {
  startupFailure = reason;
  openWorkspace();
}

function closeWorkspace(): void {
  pageOpen = false;
  activateNavigation();
}

function downloadText(filename: string, text: string): void {
  const blob = new Blob([text], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.hidden = true;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function filename(prefix: string, workspaceId: string): string {
  const stamp = new Date().toISOString().replaceAll(":", "-").replace(/\.\d{3}Z$/, "Z");
  return `viable-${prefix}-${workspaceId}-${stamp}.json`;
}

async function readImport(input: HTMLInputElement): Promise<void> {
  importFailure = undefined;
  pendingImport = undefined;
  pendingImportText = undefined;
  const file = input.files?.[0];
  if (!file) { renderWorkspace(); return; }
  try {
    const text = await file.text();
    pendingImport = lifecycle.previewImport(text);
    pendingImportText = text;
    announce("Workspace backup validated. Review the restore preview before continuing.");
  } catch (error) {
    importFailure = error instanceof Error ? error.message : "Unknown backup validation error";
    announce(`Workspace backup rejected: ${importFailure}`);
  }
  renderWorkspace();
  main?.querySelector<HTMLElement>(importFailure ? "[data-workspace-import-error]" : "[data-workspace-import-preview]")?.focus();
}

async function performRestore(mode: "empty_profile" | "replace_current"): Promise<void> {
  if (!pendingImportText || !pendingImport) return;
  const wording = mode === "replace_current"
    ? "Replace the current local workspace with this validated backup? Existing workspace-scoped data for this workspace ID will be overwritten."
    : "Restore this validated backup into the empty desktop profile?";
  const target = pendingImport.backup.workspaceId;
  const recoveryPoint = mode === "replace_current"
    ? recoveryDecision(target, main?.querySelector<HTMLInputElement>("[data-workspace-restore-decline]")?.checked === true)
    : undefined;
  if (mode === "replace_current" && !recoveryPoint) {
    actionFailure = "Download a recovery point of the current workspace, or choose to continue without one, before replacing it.";
    renderWorkspace();
    main?.querySelector<HTMLElement>("[data-workspace-action-error]")?.focus();
    return;
  }
  if (!window.confirm(wording)) return;
  actionFailure = undefined;
  try {
    const restored = lifecycle.restoreBackup(pendingImportText, mode, {
      quarantineExported: quarantineExportedFor === target,
      ...(recoveryPoint ? { recoveryPoint } : {}),
    });
    // Restore is only reported once every restored context is durable.
    await workspaceStorage.commit();
    selectedWorkspaceId = restored.workspaceId;
    pendingImport = undefined;
    pendingImportText = undefined;
    importFailure = undefined;
    quarantineExportedFor = undefined;
    recoveryPointFor = undefined;
    announce(`Workspace ${restored.workspaceId} restored successfully`);
  } catch (error) {
    actionFailure = error instanceof Error ? error.message : "Unknown restore error";
    announce(`Workspace restore failed: ${actionFailure}`);
  }
  renderWorkspace();
}

new MutationObserver(() => activateNavigation()).observe(sidebar ?? document.body, { childList: true, subtree: true });
new MutationObserver(() => { if (!pageOpen) activateNavigation(); }).observe(main ?? document.body, { childList: true, subtree: true });
activateNavigation();

document.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof Element)) return;
  const button = target.closest<HTMLButtonElement>("button");
  if (!button) return;

  if (button.dataset.action === "reset-workspace" || button.dataset.nav === "workspace") {
    event.preventDefault();
    event.stopImmediatePropagation();
    openWorkspace();
    return;
  }

  if (button.dataset.nav && button.dataset.nav !== "workspace") {
    closeWorkspace();
    return;
  }

  const action = button.dataset.workspaceAction;
  if (!action) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  const workspaceId = currentWorkspaceId();
  actionFailure = undefined;

  try {
    if (action === "backup" && workspaceId) {
      downloadText(filename("backup", workspaceId), lifecycle.createBackup(workspaceId));
      announce("Complete workspace backup downloaded");
    }
    if (action === "recovery-point") {
      const target = button.dataset.workspaceId ?? workspaceId;
      if (target) {
        const point = lifecycle.createRecoveryPoint(target);
        downloadText(filename("recovery-point", target), point.backup);
        recoveryPointFor = { workspaceId: target, fingerprint: point.fingerprint };
        announce("Recovery point downloaded. It restores this workspace exactly as it is now.");
        renderWorkspace();
      }
    }
    if (action === "quarantine" && workspaceId) {
      downloadText(filename("quarantine", workspaceId), lifecycle.exportQuarantine(workspaceId));
      quarantineExportedFor = workspaceId;
      announce("Corrupt raw workspace data exported to a quarantine file");
      renderWorkspace();
    }
    if (action === "reload-app") window.location.reload();
    if (action === "restore-empty") void performRestore("empty_profile");
    if (action === "restore-replace") void performRestore("replace_current");
  } catch (error) {
    actionFailure = error instanceof Error ? error.message : "Unknown workspace lifecycle error";
    announce(`Workspace action failed: ${actionFailure}`);
    renderWorkspace();
    main?.querySelector<HTMLElement>("[data-workspace-action-error]")?.focus();
  }
}, true);

document.addEventListener("change", (event) => {
  const target = event.target;
  if (target instanceof HTMLSelectElement && target.matches("[data-workspace-select]")) {
    selectedWorkspaceId = target.value;
    quarantineExportedFor = undefined;
    recoveryPointFor = undefined;
    actionFailure = undefined;
    renderWorkspace();
    return;
  }
  if (target instanceof HTMLInputElement && target.matches("[data-workspace-import]")) void readImport(target);
}, true);

document.addEventListener("submit", (event) => {
  const form = event.target;
  if (!(form instanceof HTMLFormElement) || !form.matches("[data-workspace-delete]")) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  const workspaceId = currentWorkspaceId();
  if (!workspaceId) return;
  const preview = lifecycle.inspect(workspaceId);
  if (preview.hasCorruptData && quarantineExportedFor !== workspaceId) {
    actionFailure = "Export the corrupt raw context to quarantine before deleting this workspace.";
    renderWorkspace();
    return;
  }
  const data = new FormData(form);
  if (data.get("scopeConfirmed") !== "on" || String(data.get("confirmation") ?? "").trim() !== "DELETE") {
    actionFailure = "Review the scope checkbox and type DELETE exactly before destructive deletion.";
    renderWorkspace();
    return;
  }
  const recoveryPoint = recoveryDecision(workspaceId, data.get("declineRecoveryPoint") === "on");
  if (!recoveryPoint) {
    actionFailure = "Download a recovery point, or choose to continue without one, before deleting this workspace.";
    renderWorkspace();
    return;
  }
  if (!window.confirm(`Permanently delete all workspace-scoped local data for ${productName(workspaceId)} from this desktop profile?`)) return;
  void deleteDurably(workspaceId, recoveryPoint);
}, true);

async function deleteDurably(workspaceId: string, recoveryPoint: RecoveryPointDecision): Promise<void> {
  try {
    lifecycle.deleteWorkspace(workspaceId, { recoveryPoint });
    await workspaceStorage.commit();
    // Only after the authoritative deletion is durable: the pre-migration
    // legacy copy must not silently retain the deleted workspace.
    purgeLegacyWorkspaceRecords(workspaceScopedKeys(workspaceId), { key: PRODUCT_ACTIVE_KEY, value: workspaceId });
    selectedWorkspaceId = undefined;
    quarantineExportedFor = undefined;
    recoveryPointFor = undefined;
    pendingImport = undefined;
    pendingImportText = undefined;
    importFailure = undefined;
    actionFailure = undefined;
    announce("Product-wide local workspace deletion completed");
  } catch (error) {
    actionFailure = error instanceof Error ? error.message : "Unknown workspace deletion error";
    announce(`Workspace deletion failed: ${actionFailure}`);
  }
  renderWorkspace();
}
