import type { CampaignWorkspace } from "../../../src/campaigns/domain/campaign.js";
import type { IcpRevision } from "../../../src/product-core/domain/icp.js";
import type { ProductTruthRevision } from "../../../src/product-core/domain/product.js";
import type { ProductWorkspace } from "../../../src/product-core/domain/workspace.js";
import { summarizeRevisionSnapshot, type RevisionHistoryKind } from "../../../src/ui/revision-history-summary.js";
import { LocalStorageCampaignWorkspaceStore } from "./local-storage-campaign-workspace-store.js";
import { LocalStorageProductWorkspaceStore } from "./local-storage-product-workspace-store.js";

const productStore = new LocalStorageProductWorkspaceStore();
const campaignStore = new LocalStorageCampaignWorkspaceStore();
const main = document.querySelector<HTMLElement>("#main");
const sidebar = document.querySelector<HTMLElement>("#sidebar");
let queued = false;
let enhancing = false;

const escapeHtml = (value: unknown): string => String(value ?? "")
  .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;").replaceAll("'", "&#039;");

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
    const workspaceId = productStore.activeWorkspaceId();
    if (!workspaceId) return;
    const [product, campaigns] = await Promise.all([productStore.load(workspaceId), campaignStore.load(workspaceId)]);
    if (product) {
      enhanceProductTruth(product);
      enhanceIcps(product);
    }
    if (campaigns) enhanceCampaigns({ ...campaigns, contentBriefs: campaigns.contentBriefs ?? [] });
  } finally {
    enhancing = false;
  }
}

function enhanceProductTruth(workspace: ProductWorkspace): void {
  const container = main?.querySelector<HTMLElement>("[data-ux-revision-history]");
  if (!container) return;
  appendSnapshots(container.querySelectorAll<HTMLElement>(":scope > article.record"), [...(workspace.product.history ?? [])].reverse(), "product_truth");
}

function enhanceIcps(workspace: ProductWorkspace): void {
  main?.querySelectorAll<HTMLElement>("[data-ux-icp-id]").forEach((card) => {
    const hypothesis = workspace.icpHypotheses.find((candidate) => candidate.id === card.dataset.uxIcpId);
    const container = card.querySelector<HTMLElement>("[data-ux-icp-revision] [data-ux-history-list]");
    if (!hypothesis || !container) return;
    appendSnapshots(container.querySelectorAll<HTMLElement>(":scope > article.record"), [...hypothesis.history].reverse(), "icp");
  });
}

function enhanceCampaigns(workspace: CampaignWorkspace): void {
  main?.querySelectorAll<HTMLElement>("[data-authoritative-record-id]").forEach((card) => {
    const campaign = workspace.campaigns.find((candidate) => candidate.id === card.dataset.authoritativeRecordId);
    const container = card.querySelector<HTMLElement>("[data-ux-campaign-revision] [data-ux-history-list]");
    if (campaign && container) appendSnapshots(container.querySelectorAll<HTMLElement>(":scope > article.record"), [...(campaign.history ?? [])].reverse(), "campaign");
  });

  main?.querySelectorAll<HTMLElement>("[data-ux-content-brief][data-record-id]").forEach((card) => {
    const brief = (workspace.contentBriefs ?? []).find((candidate) => candidate.id === card.dataset.recordId);
    const container = card.querySelector<HTMLElement>("[data-ux-content-revision] [data-ux-history-list]");
    if (brief && container) appendSnapshots(container.querySelectorAll<HTMLElement>(":scope > article.record"), [...(brief.history ?? [])].reverse(), "content_brief");
  });

  main?.querySelectorAll<HTMLElement>("[data-ux-variant-id]").forEach((card) => {
    const variant = workspace.variants.find((candidate) => candidate.id === card.dataset.uxVariantId);
    const container = card.querySelector<HTMLElement>("[data-ux-variant-revision] [data-ux-history-list]");
    if (variant && container) appendSnapshots(container.querySelectorAll<HTMLElement>(":scope > article.record"), [...(variant.history ?? [])].reverse(), "variant");
  });
}

type SnapshotRevision = Pick<ProductTruthRevision | IcpRevision, "snapshot">;

function appendSnapshots(elements: NodeListOf<HTMLElement>, revisions: readonly SnapshotRevision[], kind: RevisionHistoryKind): void {
  elements.forEach((element, index) => {
    if (element.querySelector("[data-ux-prior-snapshot]")) return;
    const revision = revisions[index];
    if (!revision) return;
    const summary = summarizeRevisionSnapshot(revision.snapshot, kind);
    const details = document.createElement("details");
    details.dataset.uxPriorSnapshot = "true";
    details.innerHTML = summary.available
      ? `<summary>View prior version values</summary><dl>${summary.fields.map((field) => `<div><dt>${escapeHtml(field.label)}</dt><dd>${escapeHtml(field.value)}</dd></div>`).join("")}</dl>`
      : `<summary>Prior version values unavailable</summary><p>${escapeHtml(summary.message ?? "Revision metadata remains available.")}</p>`;
    element.append(details);
  });
}

new MutationObserver(queueEnhance).observe(main ?? document.body, { childList: true, subtree: true });
new MutationObserver(queueEnhance).observe(sidebar ?? document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["aria-current"] });
queueEnhance();
