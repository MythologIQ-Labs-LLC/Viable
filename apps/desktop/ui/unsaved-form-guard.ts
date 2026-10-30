// Warns before leaving a screen with typed but unsaved form input (Studio
// corrections, new campaign/asset/variant forms, Calendar and Analytics
// records). Forms with their own guard (ICP / assessment drafts) and the short
// contextual review panel are excluded. Only navigation the person starts is
// guarded: the app's own re-render clicks are not interrupted.
const main = document.querySelector<HTMLElement>("#main");
const dirty = new Set<HTMLFormElement>();

const TYPED_INPUTS = new Set(["text", "url", "email", "number", "date", "datetime-local", "time"]);

function guardedForm(target: EventTarget | null): HTMLFormElement | undefined {
  if (!(target instanceof HTMLTextAreaElement) && !(target instanceof HTMLInputElement && TYPED_INPUTS.has(target.type))) return undefined;
  const form = target.closest<HTMLFormElement>("form");
  if (!form || !main?.contains(form)) return undefined;
  if (form.matches("[data-ux-draft-form], [data-contextual-review-form]")) return undefined;
  return form;
}

function hasUnsavedInput(): boolean {
  for (const form of dirty) if (!form.isConnected) dirty.delete(form);
  return dirty.size > 0;
}

document.addEventListener("input", (event) => {
  const form = guardedForm(event.target);
  if (form) dirty.add(form);
}, true);

document.addEventListener("submit", (event) => {
  if (event.target instanceof HTMLFormElement) dirty.delete(event.target);
}, true);

document.addEventListener("click", (event) => {
  if (!event.isTrusted) return;
  const target = event.target;
  if (!(target instanceof Element) || !target.closest("button[data-nav]")) return;
  if (!hasUnsavedInput()) return;
  if (window.confirm("You have typed changes that are not saved. Leave this screen and discard them?")) {
    dirty.clear();
    return;
  }
  event.preventDefault();
  event.stopImmediatePropagation();
}, true);

window.addEventListener("beforeunload", (event) => {
  if (!hasUnsavedInput()) return;
  event.preventDefault();
  event.returnValue = "";
});
