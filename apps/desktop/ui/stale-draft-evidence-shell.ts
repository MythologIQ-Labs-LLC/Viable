import { MARKETABILITY_DIMENSIONS, type MarketabilityDimension } from "../../../src/product-core/domain/assessment.js";
import { isReviewedEvidence } from "../../../src/product-core/domain/evidence.js";
import { ICP_DIMENSIONS, type IcpDimension } from "../../../src/product-core/domain/icp.js";
import type { ProductWorkspace } from "../../../src/product-core/domain/workspace.js";
import { LocalStorageProductWorkspaceStore } from "./local-storage-product-workspace-store.js";

const store = new LocalStorageProductWorkspaceStore();
const main = document.querySelector<HTMLElement>("#main");
let queued = false;
let enhancing = false;

function queueEnhance(): void {
  if (queued) return;
  queued = true;
  queueMicrotask(() => {
    queued = false;
    void enhance();
  });
}

async function enhance(): Promise<void> {
  if (!main || enhancing) return;
  enhancing = true;
  try {
    const workspaceId = store.activeWorkspaceId();
    if (!workspaceId) return;
    const workspace = await store.load(workspaceId);
    if (!workspace) return;
    const eligible = new Set(workspace.evidence.filter(isReviewedEvidence).map((item) => item.id));
    const title = (id: string): string => workspace.evidence.find((item) => item.id === id)?.title ?? "Previously linked evidence";

    main.querySelectorAll<HTMLFormElement>('form[data-ux-draft-form]').forEach((form) => {
      form.querySelectorAll<HTMLElement>('[data-ux-stale-evidence]').forEach((warning) => {
        const fieldset = warning.closest<HTMLFieldSetElement>("fieldset.dimension");
        if (!fieldset) return;
        const rationale = fieldset.querySelector<HTMLTextAreaElement>('textarea[name$=".rationale"]');
        if (!rationale) return;
        const dimension = rationale.name.slice(0, -".rationale".length);
        const selected = selectedEvidence(workspace, form.dataset.uxDraftForm, dimension);
        const stale = selected.filter((id) => !eligible.has(id));
        if (!stale.length) return;

        const message = warning.querySelector<HTMLElement>("span");
        if (message) message.textContent = "These links are no longer eligible. They remain attached to the saved draft until you explicitly uncheck them, and draft completion stays blocked while an ineligible link remains.";

        for (const id of stale) {
          if (warning.querySelector(`[data-ux-stale-link][data-evidence-id="${cssEscape(id)}"]`)) continue;
          const label = document.createElement("label");
          label.className = "choice";
          label.dataset.uxStaleLink = "true";
          label.dataset.evidenceId = id;
          const input = document.createElement("input");
          input.type = "checkbox";
          input.name = `${dimension}.evidenceIds`;
          input.value = id;
          input.checked = true;
          const text = document.createTextNode(`${title(id)} · no longer eligible; uncheck to remove this saved link`);
          label.append(input, text);
          warning.append(label);
        }
      });
    });
  } finally {
    enhancing = false;
  }
}

function selectedEvidence(workspace: ProductWorkspace, kind: string | undefined, dimension: string): readonly string[] {
  if (kind === "icp" && ICP_DIMENSIONS.includes(dimension as IcpDimension)) {
    return workspace.drafts?.icp?.dimensions[dimension as IcpDimension].evidenceIds ?? [];
  }
  if (kind === "assessment" && MARKETABILITY_DIMENSIONS.includes(dimension as MarketabilityDimension)) {
    return workspace.drafts?.assessment?.findings[dimension as MarketabilityDimension].evidenceIds ?? [];
  }
  return [];
}

function cssEscape(value: string): string {
  return globalThis.CSS?.escape ? globalThis.CSS.escape(value) : value.replaceAll('"', '\\"');
}

new MutationObserver(queueEnhance).observe(main ?? document.body, { childList: true, subtree: true });
queueEnhance();
