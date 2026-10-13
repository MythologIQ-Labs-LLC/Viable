// Inline, labelled forms for actions that ask a person for a value (#147).
//
// The owning controllers still ask through prompt(); this shell intercepts the
// click first, shows a form beside the record, and on submit replays the same
// click while answering those prompts, in order, with the entered values. The
// controllers and their domain services, including every named-actor check,
// are unchanged. Named review decisions use contextual-review-shell instead.

import { LocalStorageProductWorkspaceStore } from "./local-storage-product-workspace-store.js";

const main = document.querySelector<HTMLElement>("#main");
const productStore = new LocalStorageProductWorkspaceStore();
const live = document.querySelector<HTMLElement>("#live-region");

// prefillOwner: the controller used to offer the workspace owner as the
// prompt's default; the field starts with that name for the person to confirm.
type InputField = Readonly<{ name: string; label: string; required: boolean; multiline?: boolean; autocomplete?: string; prefillOwner?: boolean }>;
type InputConfig = Readonly<{ heading: string; submitLabel: string; fields: readonly InputField[] }>;

const actor = (label: string, prefillOwner = false): InputField => ({ name: "actor", label, required: true, autocomplete: "name", prefillOwner });

// Fields are listed in the order the controller asks for them.
function inputConfig(button: HTMLButtonElement): InputConfig | undefined {
  const signal = button.dataset.signalAction;
  if (signal === "tag") return { heading: "Tag signal", submitLabel: "Save tags", fields: [{ name: "tags", label: "Tags, separated by commas", required: true }] };
  if (signal === "assign") return { heading: "Assign signal owner", submitLabel: "Assign owner", fields: [actor("Named signal owner", true)] };
  if (signal === "website-delete-snapshot") return { heading: "Delete retained snapshot payload", submitLabel: "Delete payload", fields: [actor("Named deletion actor", true)] };
  if (signal === "website-prune-retention") return { heading: "Prune expired snapshot payloads", submitLabel: "Prune expired payloads", fields: [actor("Named retention actor", true)] };

  const repository = button.dataset.repositoryAction;
  // Reopening a checklist item asks nothing; only verification asks for evidence.
  if (repository === "checklist" && button.dataset.complete !== "true") {
    return { heading: "Verify checklist item", submitLabel: "Record verification", fields: [{ name: "evidence", label: "Verification evidence for this checklist item", required: false, multiline: true }] };
  }
  if (repository === "export") return { heading: "Create manual launch export", submitLabel: "Create and download export", fields: [actor("Named manual export creator", true)] };

  const activation = button.dataset.activationAction;
  if (activation === "cancel-entry") {
    return { heading: "Cancel calendar entry", submitLabel: "Cancel entry", fields: [actor("Named cancellation owner"), { name: "reason", label: "Cancellation reason", required: true, multiline: true }] };
  }
  if (activation === "interrupt-export") return { heading: "Record export interruption", submitLabel: "Record interruption", fields: [{ name: "detail", label: "What interrupted the export?", required: true, multiline: true }] };

  if (button.dataset.publicationAction === "review-publication-item" && button.dataset.decision) {
    return {
      heading: `Review publication inventory: ${button.textContent?.trim() || "decision"}`,
      submitLabel: button.textContent?.trim() || "Record review",
      fields: [actor("Named publication inventory reviewer", true), { name: "note", label: "Review note covering exact content, destination, timing policy, rights, accessibility, and disclosures", required: true, multiline: true }],
    };
  }
  return undefined;
}

const escapeHtml = (value: unknown): string => String(value ?? "")
  .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;").replaceAll("'", "&#039;");

const origins = new WeakMap<HTMLElement, Readonly<{ opener: HTMLButtonElement; config: InputConfig }>>();

function announce(message: string): void {
  if (live) live.textContent = message;
}

function fieldHtml(field: InputField): string {
  const attributes = `name="${escapeHtml(field.name)}"${field.required ? " required" : ""}${field.autocomplete ? ` autocomplete="${escapeHtml(field.autocomplete)}"` : ""}`;
  const control = field.multiline ? `<textarea ${attributes} rows="3"></textarea>` : `<input ${attributes}>`;
  return `<label>${escapeHtml(field.label)}${control}</label>`;
}

function openPanel(button: HTMLButtonElement, config: InputConfig): void {
  // Beside the action row when there is one; otherwise directly after the
  // button (a checklist item, a control inside a disclosure).
  const anchor = button.closest<HTMLElement>(".actions, .section-heading") ?? button;
  anchor.parentElement?.querySelector(":scope > [data-inline-input]")?.remove();
  const panel = document.createElement("section");
  panel.className = "state review-panel";
  panel.dataset.inlineInput = "true";
  panel.setAttribute("aria-label", config.heading);
  panel.innerHTML = `<h5>${escapeHtml(config.heading)}</h5>
    <form data-inline-input-form>${config.fields.map(fieldHtml).join("")}
      <div class="actions"><button class="primary" type="submit">${escapeHtml(config.submitLabel)}</button><button type="button" data-inline-input-cancel>Close without saving</button></div>
    </form>`;
  origins.set(panel, { opener: button, config });
  anchor.insertAdjacentElement("afterend", panel);
  panel.querySelector<HTMLElement>("input, textarea")?.focus();
  prefillOwner(panel, config);
  announce(`${config.heading} opened.`);
}

function prefillOwner(panel: HTMLElement, config: InputConfig): void {
  const names = config.fields.filter((field) => field.prefillOwner).map((field) => field.name);
  const workspaceId = productStore.activeWorkspaceId();
  if (!names.length || !workspaceId) return;
  void productStore.load(workspaceId).then((workspace) => {
    for (const name of names) {
      const input = panel.querySelector<HTMLInputElement>(`input[name="${name}"]`);
      if (input && !input.value && workspace?.createdBy) input.value = workspace.createdBy;
    }
  }, () => undefined);
}

function closePanel(panel: HTMLElement): void {
  const opener = origins.get(panel)?.opener;
  origins.delete(panel);
  panel.remove();
  if (opener?.isConnected) opener.focus();
  announce("Closed without changing the record.");
}

// Answers the controller's prompts with the entered values, in field order.
// An empty optional answer is a declined prompt (null), as before.
function replay(opener: HTMLButtonElement, answers: readonly (string | null)[]): void {
  const originalPrompt = window.prompt;
  const queue = [...answers];
  window.prompt = () => queue.shift() ?? null;
  opener.dataset.inlineInputBypass = "true";
  try {
    opener.click();
  } finally {
    delete opener.dataset.inlineInputBypass;
    window.prompt = originalPrompt;
  }
}

document.addEventListener("click", (event) => {
  const target = event.target as HTMLElement;
  const cancel = target.closest<HTMLButtonElement>("[data-inline-input-cancel]");
  if (cancel) {
    event.preventDefault();
    event.stopImmediatePropagation();
    const panel = cancel.closest<HTMLElement>("[data-inline-input]");
    if (panel) closePanel(panel);
    return;
  }
  const button = target.closest<HTMLButtonElement>("button");
  if (!button || !main?.contains(button) || button.dataset.inlineInputBypass === "true") return;
  const config = inputConfig(button);
  if (!config) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  openPanel(button, config);
}, true);

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  const panel = (event.target as HTMLElement | null)?.closest<HTMLElement>("[data-inline-input]");
  if (!panel) return;
  event.preventDefault();
  closePanel(panel);
});

document.addEventListener("submit", (event) => {
  const form = (event.target as HTMLElement).closest<HTMLFormElement>("form[data-inline-input-form]");
  if (!form) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  const panel = form.closest<HTMLElement>("[data-inline-input]");
  const origin = panel ? origins.get(panel) : undefined;
  if (!panel || !origin?.opener.isConnected) {
    announce("The record changed before this could be saved. Open the action again.");
    panel?.remove();
    return;
  }
  // The browser's required check accepts spaces; a named actor cannot be blank.
  const blank = origin.config.fields
    .filter((field) => field.required)
    .map((field) => form.querySelector<HTMLInputElement | HTMLTextAreaElement>(`[name="${field.name}"]`))
    .find((control) => control && !control.value.trim());
  if (blank) {
    blank.setCustomValidity("Enter a value; spaces alone are not accepted.");
    blank.reportValidity();
    blank.addEventListener("input", () => blank.setCustomValidity(""), { once: true });
    return;
  }
  const data = new FormData(form);
  const answers = origin.config.fields.map((field) => String(data.get(field.name) ?? "").trim() || null);
  // Keep focus on the record while the panel goes away; the replayed click
  // then lets the focus-continuity shell follow the record through re-render.
  origin.opener.focus();
  origins.delete(panel);
  panel.remove();
  replay(origin.opener, answers);
}, true);
