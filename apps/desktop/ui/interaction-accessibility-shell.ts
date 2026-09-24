const main = document.querySelector<HTMLElement>("#main");
const live = document.querySelector<HTMLElement>("#live-region");

type FormSnapshot = Readonly<{
  locator: string;
  entries: readonly Readonly<[string, string]>[];
  activeName?: string;
}>;

let pending: FormSnapshot | undefined;
let queued = false;
let invalidFocusQueued = false;

const escapeHtml = (value: unknown): string => String(value ?? "")
  .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;").replaceAll("'", "&#039;");

function cssEscape(value: string): string {
  return globalThis.CSS?.escape ? globalThis.CSS.escape(value) : value.replaceAll('"', '\\"');
}

function formLocator(form: HTMLFormElement): string | undefined {
  if (form.dataset.form) return `form[data-form="${cssEscape(form.dataset.form)}"]`;
  if (form.id) return `form#${cssEscape(form.id)}`;
  return undefined;
}

function shouldOwnRecovery(form: HTMLFormElement): boolean {
  return !form.dataset.uxDraftForm && !form.dataset.uxRevisionForm;
}

function snapshot(form: HTMLFormElement): FormSnapshot | undefined {
  const locator = formLocator(form);
  if (!locator) return undefined;
  const entries = [...new FormData(form).entries()]
    .filter(([, value]) => typeof value === "string")
    .map(([name, value]) => [name, String(value)] as const);
  const active = document.activeElement;
  const activeName = active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement || active instanceof HTMLSelectElement
    ? active.name || undefined
    : undefined;
  return { locator, entries, ...(activeName ? { activeName } : {}) };
}

function restore(form: HTMLFormElement, value: FormSnapshot): void {
  const grouped = new Map<string, string[]>();
  for (const [name, entry] of value.entries) grouped.set(name, [...(grouped.get(name) ?? []), entry]);

  for (const control of form.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>("input[name], textarea[name], select[name]")) {
    if (control instanceof HTMLInputElement && (control.type === "checkbox" || control.type === "radio")) {
      control.checked = (grouped.get(control.name) ?? []).includes(control.value);
      continue;
    }
    const entries = grouped.get(control.name);
    if (!entries?.length) continue;
    if (control instanceof HTMLSelectElement && control.multiple) {
      const selected = new Set(entries);
      for (const option of control.options) option.selected = selected.has(option.value);
    } else {
      control.value = entries[0] ?? "";
    }
  }
}

function humanize(value: string): string {
  return value
    .replaceAll(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replaceAll(/[._-]+/g, " ")
    .replaceAll(/\s+/g, " ")
    .trim()
    .toLocaleLowerCase("en-US");
}

function visibleLabel(control: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement): string {
  const wrapping = control.closest<HTMLLabelElement>("label");
  if (wrapping) {
    const copy = wrapping.cloneNode(true) as HTMLLabelElement;
    copy.querySelectorAll("input, textarea, select, button, [data-ux-field-error]").forEach((item) => item.remove());
    const text = copy.textContent?.replaceAll(/\s+/g, " ").trim();
    if (text) return text;
  }
  if (control.id) {
    const external = document.querySelector<HTMLLabelElement>(`label[for="${cssEscape(control.id)}"]`);
    const text = external?.textContent?.replaceAll(/\s+/g, " ").trim();
    if (text) return text;
  }
  return humanize(control.name || control.id || "field");
}

function contextName(control: HTMLElement): string {
  const legend = control.closest("fieldset")?.querySelector(":scope > legend")?.textContent?.trim();
  if (legend) return legend;
  const form = control.closest<HTMLFormElement>("form");
  if (form?.dataset.form) return humanize(form.dataset.form);
  if (form?.dataset.uxDraftForm) return `${humanize(form.dataset.uxDraftForm)} draft`;
  if (form?.dataset.uxRevisionForm) return `${humanize(form.dataset.uxRevisionForm)} revision`;
  const heading = control.closest("section")?.querySelector("h2, h3, h4")?.textContent?.trim();
  return heading ?? "Viable form";
}

function ensureProgrammaticLabels(root: ParentNode): void {
  root.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>("input, textarea, select").forEach((control) => {
    if (control instanceof HTMLInputElement && control.type === "hidden") return;
    if (control.getAttribute("aria-label") || control.getAttribute("aria-labelledby")) return;
    const wrapping = control.closest<HTMLLabelElement>("label");
    const controlsInLabel = wrapping?.querySelectorAll("input, textarea, select").length ?? 0;
    const hasExternal = Boolean(control.id && document.querySelector(`label[for="${cssEscape(control.id)}"]`));
    if (controlsInLabel === 1 || hasExternal) return;
    control.setAttribute("aria-label", `${contextName(control)}: ${humanize(control.name || visibleLabel(control))}`);
  });
}

function errorId(control: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement): string {
  if (!control.id) control.id = `viable-field-${Math.random().toString(36).slice(2, 10)}`;
  return `${control.id}-error`;
}

function associateError(control: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement, message: string): HTMLElement {
  const id = errorId(control);
  let error = document.getElementById(id);
  if (!error) {
    error = document.createElement("span");
    error.id = id;
    error.className = "field-error";
    error.dataset.uxFieldError = "true";
    const label = control.closest("label");
    if (label) label.append(error); else control.insertAdjacentElement("afterend", error);
  }
  error.textContent = message;
  control.setAttribute("aria-invalid", "true");
  const describedBy = new Set((control.getAttribute("aria-describedby") ?? "").split(/\s+/).filter(Boolean));
  describedBy.add(id);
  control.setAttribute("aria-describedby", [...describedBy].join(" "));
  return error;
}

function clearAssociatedError(control: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement): void {
  const id = control.id ? `${control.id}-error` : undefined;
  if (id) document.getElementById(id)?.remove();
  control.removeAttribute("aria-invalid");
  if (id) {
    const describedBy = (control.getAttribute("aria-describedby") ?? "").split(/\s+/).filter((item) => item && item !== id);
    if (describedBy.length) control.setAttribute("aria-describedby", describedBy.join(" ")); else control.removeAttribute("aria-describedby");
  }
}

function inferRepairControl(form: HTMLFormElement, message: string): HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | undefined {
  const lower = message.toLocaleLowerCase("en-US");
  const controls = [...form.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>("input[name], textarea[name], select[name]")]
    .filter((control) => !(control instanceof HTMLInputElement && control.type === "hidden"));

  for (const control of controls) {
    const label = visibleLabel(control).toLocaleLowerCase("en-US");
    const name = humanize(control.name);
    if ((label.length >= 4 && lower.includes(label)) || (name.length >= 4 && lower.includes(name))) return control;
  }

  const keywordTargets: readonly [RegExp, string][] = [
    [/evidence/, "evidenceIds"], [/reviewer/, "reviewer"], [/rationale/, "rationale"], [/owner/, "owner"], [/title/, "title"],
    [/description/, "description"], [/summary/, "summary"], [/name/, "name"], [/verification/, "verification"], [/recommendation/, "recommendation"],
  ];
  for (const [pattern, name] of keywordTargets) {
    if (!pattern.test(lower)) continue;
    const direct = controls.find((control) => control.name === name || control.name.endsWith(`.${name}`));
    if (direct) return direct;
  }
  return undefined;
}

function inlineFormFailure(form: HTMLFormElement, message: string): void {
  form.querySelector("[data-ux-recovered-form-error]")?.remove();
  const alert = document.createElement("section");
  alert.className = "state error form-recovery-error";
  alert.dataset.uxRecoveredFormError = "true";
  alert.setAttribute("role", "alert");
  alert.tabIndex = -1;
  alert.innerHTML = `<strong>This form was not saved.</strong><span>${escapeHtml(message)} Your entered values have been restored.</span>`;
  form.prepend(alert);

  const repair = inferRepairControl(form, message);
  if (repair) {
    associateError(repair, message);
    repair.focus();
  } else {
    alert.focus();
  }
}

function recoverPending(message: string): void {
  if (!pending || !main) {
    focusVisibleAlert();
    return;
  }
  const form = main.querySelector<HTMLFormElement>(pending.locator);
  if (!form) {
    focusVisibleAlert();
    return;
  }
  restore(form, pending);
  inlineFormFailure(form, message.replace(/^.*?failed:\s*/i, ""));
  pending = undefined;
}

function focusVisibleAlert(): void {
  const alert = main?.querySelector<HTMLElement>('[role="alert"]:not(.sr-only)');
  if (!alert) return;
  if (!alert.hasAttribute("tabindex")) alert.tabIndex = -1;
  alert.focus();
}

function queueEnhance(): void {
  if (queued) return;
  queued = true;
  queueMicrotask(() => {
    queued = false;
    if (main) ensureProgrammaticLabels(main);
  });
}

document.addEventListener("submit", (event) => {
  const form = event.target;
  if (!(form instanceof HTMLFormElement) || !shouldOwnRecovery(form)) return;
  pending = snapshot(form);
}, true);

document.addEventListener("invalid", (event) => {
  const control = event.target;
  if (!(control instanceof HTMLInputElement || control instanceof HTMLTextAreaElement || control instanceof HTMLSelectElement)) return;
  associateError(control, control.validationMessage || "This field needs attention.");
  if (invalidFocusQueued) return;
  invalidFocusQueued = true;
  queueMicrotask(() => {
    invalidFocusQueued = false;
    document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  });
}, true);

document.addEventListener("input", (event) => {
  const control = event.target;
  if (control instanceof HTMLInputElement || control instanceof HTMLTextAreaElement || control instanceof HTMLSelectElement) clearAssociatedError(control);
}, true);

document.addEventListener("change", (event) => {
  const control = event.target;
  if (control instanceof HTMLInputElement || control instanceof HTMLTextAreaElement || control instanceof HTMLSelectElement) clearAssociatedError(control);
}, true);

if (live) new MutationObserver(() => {
  const message = live.textContent?.trim() ?? "";
  if (!message) return;
  if (/failed|not saved|did not complete/i.test(message)) recoverPending(message);
  else pending = undefined;
}).observe(live, { childList: true, subtree: true, characterData: true });

new MutationObserver(queueEnhance).observe(main ?? document.body, { childList: true, subtree: true });
queueEnhance();
