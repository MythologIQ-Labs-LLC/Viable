import type { ActivationLearningWorkspace } from "../../../src/activation-learning/domain/activation-learning.js";
import { ActivationLearningService } from "../../../src/activation-learning/services/activation-learning-service.js";
import type { CampaignWorkspace } from "../../../src/campaigns/domain/campaign.js";
import { CampaignRevisionService } from "../../../src/campaigns/services/campaign-revision-service.js";
import type { ProductWorkspace } from "../../../src/product-core/domain/workspace.js";
import { LocalStorageActivationLearningStore } from "./local-storage-activation-learning-store.js";
import { LocalStorageCampaignWorkspaceStore } from "./local-storage-campaign-workspace-store.js";
import { LocalStorageProductWorkspaceStore } from "./local-storage-product-workspace-store.js";
import { LocalStorageRepositoryGrowthStore } from "./local-storage-repository-growth-store.js";
import { LocalStorageVideoProductionStore } from "./local-storage-video-production-store.js";

const productStore = new LocalStorageProductWorkspaceStore();
const campaignStore = new LocalStorageCampaignWorkspaceStore();
const revision = new CampaignRevisionService(campaignStore, productStore);
const activationStore = new LocalStorageActivationLearningStore();
// Campaign -> Calendar: scheduled external work whose source lost approval
// must stop reading "ready for manual activation" without a manual recheck.
const activation = new ActivationLearningService(
  activationStore,
  productStore,
  campaignStore,
  new LocalStorageRepositoryGrowthStore(),
  new LocalStorageVideoProductionStore(),
);
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
    const [product, before] = await Promise.all([productStore.load(workspaceId), campaignStore.load(workspaceId)]);
    if (!product || !before) return;
    const signature = authoritySignature(product, before);
    if (signature === lastSignature) return;
    const updated = await revision.revalidateProductAuthority(workspaceId);
    const changed = changedAuthorityCount(before, updated);
    const scheduled = await activationStore.load(workspaceId);
    const invalidatedEntries = scheduled ? invalidatedEntryCount(scheduled, await activation.detectAuthorityImpact(workspaceId)) : 0;
    lastSignature = authoritySignature(product, updated);
    if (changed === 0 && invalidatedEntries === 0) return;
    const messages = [
      ...(changed ? [`${changed} dependent Campaign record${changed === 1 ? "" : "s"} require re-review because current Product Core or selected-ICP authority no longer supports approval.`] : []),
      ...(invalidatedEntries ? [`${invalidatedEntries} scheduled Calendar item${invalidatedEntries === 1 ? " is" : "s are"} no longer ready: the approved source or destination changed.`] : []),
    ];
    if (live) live.textContent = messages.join(" ");
    const nav = sidebar?.querySelector<HTMLButtonElement>('nav button[aria-current="page"]')?.dataset.nav;
    if (nav && ["home", "campaigns", "studio", "calendar", "analytics"].includes(nav)) sidebar?.querySelector<HTMLButtonElement>(`button[data-nav="${nav}"]`)?.click();
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Unknown local revalidation error";
    if (live) live.textContent = `Dependent Campaign authority could not be revalidated: ${detail}. No revalidation success is recorded; reopen Product Core or Campaigns to retry.`;
  } finally {
    running = false;
  }
}

function authoritySignature(product: ProductWorkspace, campaigns: CampaignWorkspace): string {
  return JSON.stringify({
    workspaceId: product.id,
    productRevision: product.product.revision,
    claims: product.claims.map((claim) => [claim.id, claim.revision, claim.status]),
    evidence: product.evidence.map((evidence) => [evidence.id, evidence.reviewStatus, evidence.reviewedAt]),
    icps: product.icpHypotheses.map((icp) => [icp.id, icp.revision, icp.status, icp.reviewStatus]),
    campaignUpdatedAt: campaigns.updatedAt,
    campaigns: campaigns.campaigns.map((record) => [record.id, record.version, record.status]),
    contentBriefs: (campaigns.contentBriefs ?? []).map((record) => [record.id, record.version ?? 1, record.status]),
    assets: campaigns.assets.map((record) => [record.id, record.versions.length, record.status]),
    variants: campaigns.variants.map((record) => [record.id, record.version, record.status]),
  });
}

function invalidatedEntryCount(before: ActivationLearningWorkspace, after: ActivationLearningWorkspace): number {
  const previous = new Map(before.calendarEntries.map((entry) => [entry.id, entry.scheduleStatus]));
  return after.calendarEntries.filter((entry) => entry.scheduleStatus === "approval_invalidated" && previous.get(entry.id) !== "approval_invalidated").length;
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
