import {
  PRODUCT_ACTIVE_KEY,
  WORKSPACE_CONTEXTS,
  WorkspaceLifecycleService,
  type WorkspaceImportPreview,
  type WorkspaceScopePreview,
} from "../../../src/workspace-lifecycle/workspace-lifecycle-service.js";

const lifecycle = new WorkspaceLifecycleService(localStorage);
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
  const active = localStorage.getItem(PRODUCT_ACTIVE_KEY) ?? undefined;
  const known = knownWorkspaceIds();
  if (selectedWorkspaceId && known.includes(selectedWorkspaceId)) return selectedWorkspaceId;
  if (active && known.includes(active)) return active;
  return known[0];
}

function productName(workspaceId: string): string {
  const product = WORKSPACE_CONTEXTS.find((context) => context.name === "product");
  if (!product) return workspaceId;
  const raw = localStorage.getItem(`${product.prefix}${workspaceId}`);
  if (!raw) return workspaceId;
  try {
    const parsed = JSON.parse(raw) as { product?: { identity?: { name?: unknown } } };
    const name = parsed.product?.identity?.name;
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
  return `<section class="panel" aria-labelledby="restore-heading">
    <div class="section-heading"><div><p class="eyebrow">Restore</p><h3 id="restore-heading">Restore a Viable workspace backup</h3></div></div>
    <p class="guidance">Choose a backup file. Viable validates format, version, checksum, context identity, required shapes, and credential-like fields before enabling any mutation.</p>
    <label>Workspace backup file<input type="file" accept="application/json,.json" data-workspace-import></label>
    ${importFailure ? `<section class="state error" role="alert" tabindex="-1" data-workspace-import-error><strong>Backup was not accepted.</strong><span>${escapeHtml(importFailure)} No local workspace data was changed.</span></section>` : ""}
    ${preview ? `<section class="state ${preview.conflict ? "warning" : "offline"}" data-workspace-import-preview><div><strong>Backup validated for ${escapeHtml(productNameFromBackup(preview))}.</strong><p>Workspace ID: ${escapeHtml(preview.backup.workspaceId)} · created ${escapeHtml(new Date(preview.backup.createdAt).toLocaleString())}</p>${preview.conflict ? `<p>${escapeHtml(preview.conflict)}</p>` : ""}</div></section>
      <div class="actions">
        <button type="button" data-workspace-action="restore-empty" ${preview.canRestoreIntoEmptyProfile ? "" : "disabled"}>Restore into empty profile</button>
        <button type="button" data-workspace-action="restore-replace" ${preview.canReplaceCurrentWorkspace && !preview.canRestoreIntoEmptyProfile ? "" : "disabled"}>Replace current workspace from backup</button>
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
    <p>This removes all seven workspace-scoped contexts and the active workspace pointer from this desktop profile. It does not delete exported backup/quarantine files outside Viable, application files, or unrelated desktop/browser preferences. Nothing is anonymized or silently retained inside a hidden Viable tombstone.</p>
    <details><summary><strong>Review exact deletion scope</strong><span>${preview.totalRecords} counted local records across the contexts below.</span></summary>${scopeTable(preview)}<h4>Retained outside workspace deletion</h4><ul>${preview.retainedOutsideWorkspace.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul><h4>Anonymized</h4><p>None. Workspace-scoped records are deleted rather than converted into anonymous copies.</p></details>
    ${corruptBlocked ? `<section class="state warning"><strong>Deletion is blocked until corrupt raw data is exported.</strong><span>Use “Export quarantine data” above. This avoids destroying the only recoverable copy of unreadable local context.</span></section>` : ""}
    <form data-workspace-delete>
      <label class="choice"><input type="checkbox" name="scopeConfirmed" required> I reviewed the product-wide deletion scope above.</label>
      <label>Type DELETE to confirm<input name="confirmation" autocomplete="off" required></label>
      <button class="danger" type="submit" ${corruptBlocked ? "disabled" : ""}>Delete all workspace-scoped local data</button>
    </form>
  </section>`;
}

function renderWorkspace(): void {
  if (!main || !pageOpen) return;
  const ids = knownWorkspaceIds();
  const workspaceId = currentWorkspaceId();
  main.setAttribute("aria-busy", "false");
  if (!workspaceId) {
    main.innerHTML = `<header class="hero compact"><div><p class="eyebrow">Workspace</p><h2>Backup, restore, and local data lifecycle.</h2><p>This desktop profile does not currently contain a Viable workspace.</p></div></header>
      ${actionFailure ? `<section class="state error" role="alert"><strong>Workspace action failed.</strong><span>${escapeHtml(actionFailure)}</span></section>` : ""}
      ${restoreSection()}`;
    activateNavigation();
    main.focus();
    return;
  }

  const preview = lifecycle.inspect(workspaceId);
  selectedWorkspaceId = workspaceId;
  main.innerHTML = `<header class="hero compact"><div><p class="eyebrow">Workspace</p><h2>${escapeHtml(productName(workspaceId))}</h2><p>Manage the complete local workspace without pretending Product Core is the whole application.</p></div><span class="pill ${preview.hasCorruptData ? "warning" : "implemented"}">${preview.hasCorruptData ? "Needs recovery" : "Local workspace"}</span></header>
    ${workspacePicker(ids, workspaceId)}
    ${actionFailure ? `<section class="state error" role="alert" tabindex="-1" data-workspace-action-error><strong>Workspace action failed.</strong><span>${escapeHtml(actionFailure)}</span></section>` : ""}
    <section class="metrics" aria-label="Workspace lifecycle summary"><article><span>Workspace contexts</span><strong>${preview.contexts.filter((item) => item.status === "present").length}/7</strong><small>${preview.contexts.filter((item) => item.status === "absent").length} absent</small></article><article><span>Counted records</span><strong>${preview.totalRecords}</strong><small>Across workspace-scoped stores</small></article><article><span>Corrupt contexts</span><strong>${preview.contexts.filter((item) => item.status === "corrupt").length}</strong><small>${preview.hasCorruptData ? "Quarantine before deletion" : "No detected corruption"}</small></article><article><span>Active</span><strong>${preview.active ? "Yes" : "No"}</strong><small>${escapeHtml(workspaceId)}</small></article></section>
    <section class="panel" aria-labelledby="scope-heading"><div class="section-heading"><div><p class="eyebrow">Scope preview</p><h3 id="scope-heading">What belongs to this workspace</h3></div></div>${scopeTable(preview)}</section>
    ${backupSection(preview)}
    ${restoreSection()}
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

function performRestore(mode: "empty_profile" | "replace_current"): void {
  if (!pendingImportText || !pendingImport) return;
  const wording = mode === "replace_current"
    ? "Replace the current local workspace with this validated backup? Existing workspace-scoped data for this workspace ID will be overwritten."
    : "Restore this validated backup into the empty desktop profile?";
  if (!window.confirm(wording)) return;
  actionFailure = undefined;
  try {
    const restored = lifecycle.restoreBackup(pendingImportText, mode);
    selectedWorkspaceId = restored.workspaceId;
    pendingImport = undefined;
    pendingImportText = undefined;
    importFailure = undefined;
    quarantineExportedFor = undefined;
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
    if (action === "quarantine" && workspaceId) {
      downloadText(filename("quarantine", workspaceId), lifecycle.exportQuarantine(workspaceId));
      quarantineExportedFor = workspaceId;
      announce("Corrupt raw workspace data exported to a quarantine file");
      renderWorkspace();
    }
    if (action === "restore-empty") performRestore("empty_profile");
    if (action === "restore-replace") performRestore("replace_current");
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
  if (!window.confirm(`Permanently delete all workspace-scoped local data for ${productName(workspaceId)} from this desktop profile?`)) return;
  try {
    lifecycle.deleteWorkspace(workspaceId);
    selectedWorkspaceId = undefined;
    quarantineExportedFor = undefined;
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
}, true);
