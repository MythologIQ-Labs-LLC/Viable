import type { CampaignWorkspace } from "../../../src/campaigns/domain/campaign.js";
import { CampaignRevisionService } from "../../../src/campaigns/services/campaign-revision-service.js";
import type { ProductWorkspace } from "../../../src/product-core/domain/workspace.js";
import { LocalStorageCampaignWorkspaceStore } from "./local-storage-campaign-workspace-store.js";
import { LocalStorageProductWorkspaceStore } from "./local-storage-product-workspace-store.js";

const productStore = new LocalStorageProductWorkspaceStore();
const campaignStore = new LocalStorageCampaignWorkspaceStore();
const revision = new CampaignRevisionService(campaignStore, productStore);
const main = document.querySelector<HTMLElement>("#main");
const sidebar = document.querySelector<HTMLElement>("#sidebar");
const live = document.querySelector<HTMLElement>("#live-region");

let queued = false;
let running = false;
let lastSignature: string | undefined;

function queueRevalidation(): void {
  if (queued) return;
  queued = true;
  queueMicrotask(() => {
    queued = false;
    void revalidate();
  });
}

async function revalidate(): Promise<void> {
  if (running) return;
  running = true;
  try {
    const workspaceId = productStore.activeWorkspaceId();
    if (!workspaceId) return;
    const product = await productStore.load(workspaceId);
    if (!product) return;
    const signature = authoritySignature(product);
    if (signature === lastSignature) return;
    lastSignature = signature;
    const before = await campaignStore.load(workspaceId);
    if (!before) return;
    const updated = await revision.revalidateProductAuthority(workspaceId);
    const changed = changedAuthorityCount(before, updated);
    if (changed === 0) return;
    if (live) live.textContent = `${changed} dependent Campaign record${changed === 1 ? "" : "s"} require re-review after Product Core authority changed.`;
    const nav = sidebar?.querySelector<HTMLButtonElement>('nav button[aria-current="page"]')?.dataset.nav;
    if (nav === "campaigns" || nav === "studio") sidebar?.querySelector<HTMLButtonElement>(`button[data-nav="${nav}"]`)?.click();
  } finally {
    running = false;
  }
}

function authoritySignature(product: ProductWorkspace): string {
  return JSON.stringify({
    workspaceId: product.id,
    productRevision: product.product.revision,
    claims: product.claims.map((claim) => [claim.id, claim.revision, claim.status]),
    evidence: product.evidence.map((evidence) => [evidence.id, evidence.reviewStatus, evidence.reviewedAt]),
    icps: product.icpHypotheses.map((icp) => [icp.id, icp.revision, icp.status, icp.reviewStatus]),
  });
}

function changedAuthorityCount(before: CampaignWorkspace, after: CampaignWorkspace): number {
  const statusMap = (workspace: CampaignWorkspace): Map<string, string> => new Map([
    ...workspace.campaigns.map((record) => [`campaign:${record.id}`, record.status] as const),
    ...(workspace.contentBriefs ?? []).map((record) => [`content:${record.id}`, record.status] as const),
    ...workspace.assets.map((record) => [`asset:${record.id}`, record.status] as const),
    ...workspace.variants.map((record) => [`variant:${record.id}`, record.status] as const),
  ]);
  const previous = statusMap(before);
  return [...statusMap(after)].filter(([key, status]) => previous.get(key) !== status).length;
}

new MutationObserver(queueRevalidation).observe(main ?? document.body, { childList: true, subtree: true });
new MutationObserver(queueRevalidation).observe(sidebar ?? document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["aria-current"] });
queueRevalidation();
