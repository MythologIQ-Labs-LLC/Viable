import { LocalStorageProductWorkspaceStore } from "./local-storage-product-workspace-store.js";

const store = new LocalStorageProductWorkspaceStore();
const main = document.querySelector<HTMLElement>("#main");
let queued = false;

function key(kind: string): string | undefined {
  const workspaceId = store.activeWorkspaceId();
  return workspaceId ? `viable.draft-step.${workspaceId}.${kind}` : undefined;
}

function remember(kind: string, index: number): void {
  const storageKey = key(kind);
  if (!storageKey) return;
  try { sessionStorage.setItem(storageKey, String(index)); } catch { /* View position is optional; draft authority remains persisted in Product Core. */ }
}

function forget(kind: string): void {
  const storageKey = key(kind);
  if (!storageKey) return;
  try { sessionStorage.removeItem(storageKey); } catch { /* View position is optional. */ }
}

function recalled(kind: string): number | undefined {
  const storageKey = key(kind);
  if (!storageKey) return undefined;
  try {
    const raw = sessionStorage.getItem(storageKey);
    if (raw === null) return undefined;
    const value = Number(raw);
    return Number.isInteger(value) && value >= 0 ? value : undefined;
  } catch {
    return undefined;
  }
}

function queueRestore(): void {
  if (queued) return;
  queued = true;
  queueMicrotask(() => {
    queued = false;
    restore();
  });
}

function restore(): void {
  if (!main) return;
  main.querySelectorAll<HTMLFormElement>('form[data-ux-draft-form]').forEach((form) => {
    if (form.dataset.uxStepRestored === "true") return;
    const kind = form.dataset.uxDraftForm;
    if (!kind) return;
    const index = recalled(kind);
    if (index === undefined) return;
    const steps = [...form.querySelectorAll<HTMLDetailsElement>(":scope > details")];
    const target = steps[Math.min(index, Math.max(steps.length - 1, 0))];
    if (!target) return;
    for (const step of steps) step.open = step === target;
    form.dataset.uxStepRestored = "true";
  });
}

document.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof Element)) return;
  const form = target.closest<HTMLFormElement>('form[data-ux-draft-form]');
  if (!form) return;
  const kind = form.dataset.uxDraftForm;
  if (!kind) return;

  const action = target.closest<HTMLButtonElement>('button[data-draft-action]')?.dataset.draftAction;
  if (action === "complete") {
    forget(kind);
    return;
  }
  if (target.closest<HTMLButtonElement>('button[data-draft-discard]')) {
    forget(kind);
    return;
  }
  if (action !== "save") return;

  const current = target.closest<HTMLDetailsElement>("details");
  if (!current) return;
  const steps = [...form.querySelectorAll<HTMLDetailsElement>(":scope > details")];
  const index = steps.indexOf(current);
  if (index < 0) return;
  remember(kind, Math.min(index + 1, steps.length - 1));
}, true);

new MutationObserver(queueRestore).observe(main ?? document.body, { childList: true, subtree: true });
queueRestore();
