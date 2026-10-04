import type {
  ActivationLearningWorkspace,
  ActivationSourceKind,
  DestinationChannel,
} from "../../../src/activation-learning/domain/activation-learning.js";
import type {
  PublicationExecutionWorkspace,
  PublicationJob,
} from "../../../src/activation-learning/domain/publication-execution.js";
import type { PublicationInventoryReviewDecision } from "../../../src/activation-learning/domain/publication-inventory.js";
import { ActivationLearningService } from "../../../src/activation-learning/services/activation-learning-service.js";
import { PublicationInventoryService } from "../../../src/activation-learning/services/publication-inventory-service.js";
import { PublicationSchedulerService } from "../../../src/activation-learning/services/publication-scheduler-service.js";
import type { CampaignWorkspace } from "../../../src/campaigns/domain/campaign.js";
import type { RepositoryGrowthWorkspace } from "../../../src/repository-growth/domain/repository-growth.js";
import type { VideoProductionWorkspace } from "../../../src/video-production/domain/video-production.js";
import { LocalStorageActivationLearningStore } from "./local-storage-activation-learning-store.js";
import { LocalStorageCampaignWorkspaceStore } from "./local-storage-campaign-workspace-store.js";
import { LocalStorageProductWorkspaceStore } from "./local-storage-product-workspace-store.js";
import { LocalStorageRepositoryGrowthStore } from "./local-storage-repository-growth-store.js";
import { LocalStorageVideoProductionStore } from "./local-storage-video-production-store.js";

const escapeHtml = (value: unknown): string => String(value ?? "")
  .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;").replaceAll("'", "&#039;");
const label = (value: string): string => value.replaceAll("_", " ");
const humanDate = (value?: string): string => value ? new Date(value).toLocaleString() : "Not recorded";
const tone = (value: string): string =>
  ["stocked", "enabled", "published", "ready"].includes(value) ? "implemented"
    : ["draft", "in_review", "changes_requested", "approval_invalidated", "waiting", "retry_wait", "executing", "outcome_unknown", "paused"].includes(value) ? "warning"
      : ["rejected", "retired", "disabled", "failed", "cancelled", "authority_invalidated"].includes(value) ? "error" : "neutral";
const pill = (value: string): string => `<span class="pill ${tone(value)}">${escapeHtml(label(value))}</span>`;
const toIso = (value: FormDataEntryValue | null, name: string): string => {
  const date = new Date(String(value ?? ""));
  if (!Number.isFinite(date.getTime())) throw new Error(`${name} must be a valid date and time`);
  return date.toISOString();
};
const optionalPositiveInteger = (value: FormDataEntryValue | null): number | undefined => {
  const text = String(value ?? "").trim();
  if (!text) return undefined;
  const parsed = Number(text);
  if (!Number.isInteger(parsed) || parsed <= 0) throw new Error("Optional limits must be positive whole numbers");
  return parsed;
};

type SourceOption = Readonly<{
  kind: ActivationSourceKind;
  id: string;
  channel: DestinationChannel;
  title: string;
  detail: string;
}>;

export class PublicationInventoryViewController {
  private readonly activationStore = new LocalStorageActivationLearningStore();
  private readonly productStore = new LocalStorageProductWorkspaceStore();
  private readonly campaignStore = new LocalStorageCampaignWorkspaceStore();
  private readonly repositoryStore = new LocalStorageRepositoryGrowthStore();
  private readonly videoStore = new LocalStorageVideoProductionStore();
  private readonly sourceAuthority = new ActivationLearningService(
    this.activationStore,
    this.productStore,
    this.campaignStore,
    this.repositoryStore,
    this.videoStore,
  );
  private readonly service = new PublicationInventoryService(this.activationStore, this.sourceAuthority);
  private readonly scheduler = new PublicationSchedulerService(this.activationStore, this.sourceAuthority);
  private activation?: PublicationExecutionWorkspace;
  private campaigns?: CampaignWorkspace;
  private repositories?: RepositoryGrowthWorkspace;
  private videos?: VideoProductionWorkspace;
  private failure?: string;

  constructor(readonly workspaceId: string, private readonly defaultOwner: string) {}

  async load(): Promise<void> {
    const [activation, campaigns, repositories, videos] = await Promise.all([
      this.service.load(this.workspaceId),
      this.campaignStore.load(this.workspaceId),
      this.repositoryStore.load(this.workspaceId),
      this.videoStore.load(this.workspaceId),
    ]);
    this.activation = activation as PublicationExecutionWorkspace;
    this.campaigns = campaigns;
    this.repositories = repositories;
    this.videos = videos;
  }

  render(): string {
    if (!this.activation) {
      return `<section class="state loading" role="status"><strong>Loading publication inventory</strong><span>Reading approved stock and policy authority.</span></section>`;
    }
    const policies = this.activation.publicationPolicies ?? [];
    const items = this.activation.publicationInventory ?? [];
    const jobs = this.activation.publicationJobs ?? [];
    const stocked = items.filter((item) => item.status === "stocked");
    const activeDestinations = this.activation.destinations.filter((item) => item.status === "active");
    const sources = this.sourceOptions();
    return `<section class="activation-workspace publication-inventory-workspace" aria-labelledby="publication-inventory-heading">
      <header class="hero compact"><div><p class="eyebrow">Publication inventory</p><h2 id="publication-inventory-heading">Approve content once. Hold exact publication intent as stock.</h2><p>Inventory is local activation authority for deterministic publishing. Stocking never publishes by itself.</p></div>${pill("provider neutral")}</header>
      ${this.failureState()}
      <section class="state offline"><strong>Live provider execution is not connected yet.</strong><span>The deterministic scheduler, reservation rules, retry ledger, restart recovery, and fail-closed outcome handling exist locally. Real social-provider adapters remain evidence-gated.</span></section>
      <section class="metrics" aria-label="Publication inventory status">
        <article><span>Policies</span><strong>${policies.length}</strong><small>${policies.filter((item) => item.enabled).length} enabled</small></article>
        <article><span>Inventory items</span><strong>${items.length}</strong><small>${stocked.length} stocked</small></article>
        <article><span>In review</span><strong>${items.filter((item) => item.status === "in_review").length}</strong><small>Named human required</small></article>
        <article><span>Publication jobs</span><strong>${jobs.length}</strong><small>${jobs.filter((job) => job.status === "published").length} published</small></article>
      </section>
      ${this.automationSection(jobs)}
      ${this.policySection(activeDestinations)}
      ${this.inventorySection(policies.filter((item) => item.enabled), sources)}
      ${this.stockSection(items)}
    </section>`;
  }

  async submit(formElement: HTMLFormElement): Promise<string | undefined> {
    const form = new FormData(formElement);
    const kind = formElement.dataset.form;
    delete this.failure;
    try {
      if (kind === "publication-policy") {
        const maximumPerDay = optionalPositiveInteger(form.get("maximumPerDay"));
        const maximumPerWeek = optionalPositiveInteger(form.get("maximumPerWeek"));
        this.activation = await this.service.createPolicy(this.workspaceId, {
          label: String(form.get("label")),
          destinationId: String(form.get("destinationId")),
          timezone: String(form.get("timezone")),
          allowedWeekdays: form.getAll("weekday").map(Number),
          allowedWindows: [{ start: String(form.get("windowStart")), end: String(form.get("windowEnd")) }],
          minimumCooldownMinutes: Number(form.get("minimumCooldownMinutes")),
          ...(maximumPerDay !== undefined ? { maximumPerDay } : {}),
          ...(maximumPerWeek !== undefined ? { maximumPerWeek } : {}),
          lateToleranceMinutes: Number(form.get("lateToleranceMinutes")),
          retryLimit: Number(form.get("retryLimit")),
        }) as PublicationExecutionWorkspace;
        return "Publication policy created without granting publication authority";
      }
      if (kind === "publication-inventory-item") {
        const [sourceKind, sourceId] = String(form.get("source")).split("|") as [ActivationSourceKind, string];
        const expiresAt = String(form.get("expiresAt")).trim();
        this.activation = await this.service.createInventoryItem(this.workspaceId, {
          destinationId: String(form.get("destinationId")),
          policyId: String(form.get("policyId")),
          sourceKind,
          sourceId,
          priority: Number(form.get("priority")),
          availableFrom: toIso(form.get("availableFrom"), "Inventory availability"),
          ...(expiresAt ? { expiresAt: toIso(expiresAt, "Inventory expiration") } : {}),
          maxUses: Number(form.get("maxUses")) || 1,
        }) as PublicationExecutionWorkspace;
        return "Draft publication inventory item created; it is not publishable until named review";
      }
      return undefined;
    } catch (error) {
      this.failure = error instanceof Error ? error.message : "Unknown Publication Inventory error";
      throw error;
    }
  }

  async click(button: HTMLButtonElement): Promise<string | undefined> {
    const action = button.dataset.publicationAction;
    const id = button.dataset.id;
    delete this.failure;
    try {
      if (action === "recover-inventory") { await this.load(); return "Saved publication inventory restored"; }
      if (action === "recheck-inventory-authority") {
        this.activation = await this.service.detectAuthorityImpact(this.workspaceId) as PublicationExecutionWorkspace;
        return "Publication source, destination, and policy authority rechecked";
      }
      if (action === "toggle-publication-automation") {
        const paused = this.activation?.publicationAutomation?.paused ?? false;
        await this.scheduler.setPaused(this.workspaceId, !paused, paused ? "Operator resumed automation" : "Operator paused automation");
        await this.load();
        return paused ? "Publication automation resumed" : "Publication automation paused";
      }
      if (action === "cancel-publication-job" && id) {
        await this.scheduler.cancelJob(this.workspaceId, id);
        await this.load();
        return "Publication job cancelled without claiming delivery";
      }
      if (action === "toggle-publication-policy" && id) {
        const current = (this.activation?.publicationPolicies ?? []).find((item) => item.id === id);
        if (!current) throw new Error("Publication policy not found");
        this.activation = await this.service.setPolicyEnabled(this.workspaceId, id, !current.enabled) as PublicationExecutionWorkspace;
        return `Publication policy ${current.enabled ? "disabled" : "enabled"}`;
      }
      if (action === "submit-publication-item" && id) {
        this.activation = await this.service.submitInventoryItem(this.workspaceId, id) as PublicationExecutionWorkspace;
        return "Publication inventory item submitted for named review";
      }
      if (action === "review-publication-item" && id) {
        return this.reviewItem(id, button.dataset.decision as PublicationInventoryReviewDecision | undefined);
      }
      if (action === "retire-publication-item" && id) {
        this.activation = await this.service.retireInventoryItem(this.workspaceId, id) as PublicationExecutionWorkspace;
        return "Publication inventory item retired";
      }
      return undefined;
    } catch (error) {
      this.failure = error instanceof Error ? error.message : "Unknown Publication Inventory error";
      throw error;
    }
  }

  private failureState(): string {
    return this.failure ? `<section class="state error" role="alert"><div><strong>The inventory operation was not saved.</strong><p>${escapeHtml(this.failure)}</p></div><button type="button" data-publication-action="recover-inventory">Return to saved publication inventory</button></section>` : "";
  }

  private automationSection(jobs: readonly PublicationJob[]): string {
    const paused = this.activation?.publicationAutomation?.paused ?? false;
    const count = (status: PublicationJob["status"]): number => jobs.filter((job) => job.status === status).length;
    return `<section class="panel" aria-labelledby="publication-automation-heading"><div class="section-heading"><div><p class="eyebrow">Automation control</p><h3 id="publication-automation-heading">Deterministic scheduler state</h3></div>${pill(paused ? "paused" : "ready")}</div>
      <div class="metrics" aria-label="Publication automation status">
        <article><span>Waiting</span><strong>${count("waiting")}</strong><small>Reserved for a scheduled slot</small></article>
        <article><span>Retry wait</span><strong>${count("retry_wait")}</strong><small>Same idempotency key retained</small></article>
        <article><span>Published</span><strong>${count("published")}</strong><small>Provider-confirmed only</small></article>
        <article><span>Needs attention</span><strong>${count("failed") + count("outcome_unknown") + count("authority_invalidated")}</strong><small>Never silently retried</small></article>
      </div>
      <div class="actions"><button type="button" data-publication-action="toggle-publication-automation">${paused ? "Resume" : "Pause"} automation</button></div>
      <div class="card-list">${jobs.length ? jobs.slice().reverse().map((job) => this.jobCard(job)).join("") : `<div class="state empty"><strong>No publication jobs yet.</strong><span>The scheduler creates jobs only from stocked inventory. No stock means no job.</span></div>`}</div>
    </section>`;
  }

  private jobCard(job: PublicationJob): string {
    const item = (this.activation?.publicationInventory ?? []).find((candidate) => candidate.id === job.inventoryItemId);
    const destination = this.activation?.destinations.find((candidate) => candidate.id === job.destinationId);
    const cancellable = ["waiting", "retry_wait", "failed"].includes(job.status);
    return `<article><div class="card-heading"><div><h4>${escapeHtml(item?.source.title ?? job.sourceId)}</h4><p>${escapeHtml(destination?.label ?? job.destinationId)} · ${escapeHtml(humanDate(job.scheduledFor))}</p></div>${pill(job.status)}</div>
      <div class="calendar-meta"><span><strong>Attempts</strong>${job.attemptCount}</span><span><strong>Source</strong>v${job.sourceVersion}</span><span><strong>Policy</strong>v${job.policyVersion}</span><span><strong>Updated</strong>${escapeHtml(humanDate(job.updatedAt))}</span></div>
      ${job.nextAttemptAt ? `<small>Next safe retry window ${escapeHtml(humanDate(job.nextAttemptAt))}.</small>` : ""}
      ${job.failureDetail ? `<p><strong>Execution note:</strong> ${escapeHtml(job.failureDetail)}</p>` : ""}
      ${job.publicationId ? `<p><strong>Publication:</strong> ${escapeHtml(job.publicationId)}</p>` : ""}
      ${cancellable ? `<div class="actions"><button type="button" data-publication-action="cancel-publication-job" data-id="${job.id}">Cancel job</button></div>` : ""}</article>`;
  }

  private policySection(destinations: ActivationLearningWorkspace["destinations"]): string {
    const policies = this.activation?.publicationPolicies ?? [];
    return `<section class="panel" aria-labelledby="publication-policy-heading"><div class="section-heading"><div><p class="eyebrow">Publication policy</p><h3 id="publication-policy-heading">Bound when approved stock may later be considered</h3></div>${pill(`${policies.length} policies`)}</div>
      ${destinations.length ? `<form data-form="publication-policy">
        <div class="three"><label>Policy label<input name="label" required placeholder="Weekday LinkedIn stock"></label><label>Destination<select name="destinationId" required>${destinations.map((item) => `<option value="${item.id}">${escapeHtml(item.label)} · ${escapeHtml(label(item.channel))}</option>`).join("")}</select></label><label>Timezone<input name="timezone" required value="America/New_York"></label></div>
        <fieldset><legend>Allowed weekdays</legend><div class="choice-grid">${weekdayChoices()}</div></fieldset>
        <div class="three"><label>Window start<input name="windowStart" type="time" required value="09:00"></label><label>Window end<input name="windowEnd" type="time" required value="17:00"></label><label>Minimum cooldown, minutes<input name="minimumCooldownMinutes" type="number" min="0" step="1" required value="1440"></label></div>
        <div class="four"><label>Maximum per day<input name="maximumPerDay" type="number" min="1" step="1" value="1"></label><label>Maximum per week<input name="maximumPerWeek" type="number" min="1" step="1" value="3"></label><label>Late tolerance, minutes<input name="lateToleranceMinutes" type="number" min="0" step="1" required value="30"></label><label>Retry limit<input name="retryLimit" type="number" min="0" step="1" required value="2"></label></div>
        <button type="submit">Create publication policy</button>
      </form>` : `<section class="state warning"><strong>Publication policy is blocked.</strong><span>Create an active destination first. Provider credentials are not required.</span></section>`}
      <div class="card-list">${policies.map((policy) => {
        const destination = this.activation?.destinations.find((item) => item.id === policy.destinationId);
        return `<article><div class="card-heading"><div><h4>${escapeHtml(policy.label)}</h4><p>${escapeHtml(destination?.label ?? policy.destinationId)} · ${escapeHtml(policy.timezone)}</p></div>${pill(policy.enabled ? "enabled" : "disabled")}</div><p>${escapeHtml(policy.allowedWindows.map((window) => `${window.start}–${window.end}`).join(", "))} · ${policy.allowedWeekdays.length} weekdays</p><small>Cooldown ${policy.minimumCooldownMinutes}m${policy.maximumPerDay ? ` · max ${policy.maximumPerDay}/day` : ""}${policy.maximumPerWeek ? ` · max ${policy.maximumPerWeek}/week` : ""}. The deterministic scheduler enforces these limits before reservation and execution.</small><div class="actions"><button type="button" data-publication-action="toggle-publication-policy" data-id="${policy.id}">${policy.enabled ? "Disable" : "Enable"} policy</button></div></article>`;
      }).join("")}</div>
    </section>`;
  }

  private inventorySection(
    policies: readonly NonNullable<ActivationLearningWorkspace["publicationPolicies"]>[number][],
    sources: readonly SourceOption[],
  ): string {
    if (!policies.length || !sources.length) {
      return `<section class="state warning"><strong>New inventory is blocked.</strong><span>Create an enabled publication policy and approve a Campaign, Repository Launch, or Video source first.</span></section>`;
    }
    const options = policies.map((policy) => {
      const destination = this.activation?.destinations.find((item) => item.id === policy.destinationId);
      return `<option value="${policy.id}" data-destination-id="${policy.destinationId}" data-channel="${destination?.channel ?? ""}">${escapeHtml(policy.label)} · ${escapeHtml(destination?.label ?? policy.destinationId)}</option>`;
    }).join("");
    return `<section class="panel" aria-labelledby="inventory-builder-heading"><div class="section-heading"><div><p class="eyebrow">Stock content</p><h3 id="inventory-builder-heading">Bind exact approved content to one destination and policy</h3></div>${pill("draft first")}</div>
      <form data-form="publication-inventory-item">
        <div class="two"><label>Publication policy<select name="policyId" required>${options}</select></label><label>Destination<input name="destinationId" readonly required value="${policies[0]?.destinationId ?? ""}"></label></div>
        <label>Approved source<select name="source" required>${sources.map((item) => `<option value="${item.kind}|${item.id}" data-channel="${item.channel}">${escapeHtml(item.title)} · ${escapeHtml(item.detail)}</option>`).join("")}</select></label>
        <div class="four"><label>Priority<input name="priority" type="number" required value="100"></label><label>Available from<input name="availableFrom" type="datetime-local" required></label><label>Expires, optional<input name="expiresAt" type="datetime-local"></label><label>Maximum uses<input name="maxUses" type="number" min="1" step="1" required value="1"></label></div>
        <button class="primary" type="submit">Create draft inventory item</button>
      </form>
    </section>`;
  }

  private stockSection(items: readonly NonNullable<ActivationLearningWorkspace["publicationInventory"]>[number][]): string {
    return `<section class="panel" aria-labelledby="publication-stock-heading"><div class="section-heading"><div><p class="eyebrow">Inventory stock</p><h3 id="publication-stock-heading">Named approval controls what becomes publishable stock</h3></div><button type="button" data-publication-action="recheck-inventory-authority">Recheck inventory authority</button></div>
      <div class="card-list">${items.length ? items.slice().reverse().map((item) => this.inventoryCard(item)).join("") : `<div class="state empty"><strong>No publication inventory yet.</strong><span>Create a draft from an approved source. Empty inventory will always mean publish nothing.</span></div>`}</div>
    </section>`;
  }

  private inventoryCard(item: NonNullable<ActivationLearningWorkspace["publicationInventory"]>[number]): string {
    const destination = this.activation?.destinations.find((candidate) => candidate.id === item.destinationId);
    const policy = (this.activation?.publicationPolicies ?? []).find((candidate) => candidate.id === item.policyId);
    const actions: string[] = [];
    if (["draft", "changes_requested", "approval_invalidated"].includes(item.status)) {
      actions.push(`<button type="button" data-publication-action="submit-publication-item" data-id="${item.id}">Submit for inventory review</button>`);
    }
    if (item.status === "in_review") {
      actions.push(`<button class="primary" type="button" data-publication-action="review-publication-item" data-id="${item.id}" data-decision="approved">Approve and stock</button>`);
      actions.push(`<button type="button" data-publication-action="review-publication-item" data-id="${item.id}" data-decision="changes_requested">Request changes</button>`);
      actions.push(`<button type="button" data-publication-action="review-publication-item" data-id="${item.id}" data-decision="rejected">Reject</button>`);
    }
    if (!["reserved", "depleted", "retired"].includes(item.status)) {
      actions.push(`<button type="button" data-publication-action="retire-publication-item" data-id="${item.id}">Retire</button>`);
    }
    return `<article><div class="card-heading"><div><h4>${escapeHtml(item.source.title)}</h4><p>${escapeHtml(destination?.label ?? item.destinationId)} · ${escapeHtml(policy?.label ?? item.policyId)}</p></div>${pill(item.status)}</div>
      <p>${escapeHtml(item.source.body ?? item.source.fileReference ?? "Approved media source")}</p>
      <div class="calendar-meta"><span><strong>Priority</strong>${item.priority}</span><span><strong>Available</strong>${humanDate(item.availableFrom)}</span><span><strong>Uses</strong>${item.useCount}/${item.maxUses}</span><span><strong>Review</strong>${item.reviewedBy ? escapeHtml(`${item.reviewedBy} · ${humanDate(item.reviewedAt)}`) : "Not reviewed"}</span></div>
      ${item.expiresAt ? `<small>Expires ${escapeHtml(humanDate(item.expiresAt))}</small>` : `<small>No expiration. Source, destination, and policy authority are still revalidated before eligibility.</small>`}
      ${item.reviewNote ? `<p><strong>Review note:</strong> ${escapeHtml(item.reviewNote)}</p>` : ""}
      ${actions.length ? `<div class="actions">${actions.join("")}</div>` : ""}</article>`;
  }

  private sourceOptions(): readonly SourceOption[] {
    const campaigns = this.campaigns;
    if (!campaigns) return [];
    const options: SourceOption[] = [];
    for (const variant of campaigns.variants) {
      const asset = campaigns.assets.find((item) => item.id === variant.canonicalAssetId);
      const campaign = asset ? campaigns.campaigns.find((item) => item.id === asset.campaignId) : undefined;
      if (variant.status === "approved" && asset?.status === "approved" && campaign?.status === "approved") {
        options.push({ kind: "campaign_variant", id: variant.id, channel: variant.channel, title: asset.title, detail: `Campaign · ${label(variant.channel)} · v${variant.version}` });
      }
    }
    for (const launch of this.repositories?.launchRooms ?? []) {
      if (!["ready_for_manual_launch", "retrospective_complete"].includes(launch.status)) continue;
      for (const variantId of launch.variantIds) {
        const variant = campaigns.variants.find((item) => item.id === variantId && item.status === "approved");
        if (variant) options.push({ kind: "repository_launch", id: launch.id, channel: variant.channel, title: launch.title, detail: `Repository launch · ${label(variant.channel)}` });
      }
    }
    for (const variant of this.videos?.variants ?? []) {
      if (variant.status !== "approved") continue;
      const artifact = this.videos?.artifacts.find((item) => item.id === variant.artifactId && item.reviewStatus === "approved");
      const brief = artifact ? this.videos?.briefs.find((item) => item.id === artifact.briefId && item.status === "approved") : undefined;
      if (brief) options.push({ kind: "video_variant", id: variant.id, channel: variant.platform, title: brief.title, detail: `Video · ${label(variant.platform)} · ${variant.aspectRatio}` });
    }
    return options;
  }

  private async reviewItem(id: string, decision?: PublicationInventoryReviewDecision): Promise<string | undefined> {
    if (!decision) return undefined;
    const reviewer = prompt("Named publication inventory reviewer", this.defaultOwner);
    const note = reviewer ? prompt("Review note covering exact content, destination, timing policy, rights, accessibility, and disclosures") : null;
    if (!reviewer || !note) return undefined;
    this.activation = await this.service.reviewInventoryItem(this.workspaceId, id, reviewer, decision, note) as PublicationExecutionWorkspace;
    return decision === "approved" ? "Exact publication intent approved and stocked; nothing has been published" : `Publication inventory marked ${label(decision)}`;
  }
}

function weekdayChoices(): string {
  const values = [
    [1, "Monday"], [2, "Tuesday"], [3, "Wednesday"], [4, "Thursday"], [5, "Friday"], [6, "Saturday"], [0, "Sunday"],
  ] as const;
  return values.map(([value, name]) => `<label class="choice"><input type="checkbox" name="weekday" value="${value}"${value >= 1 && value <= 5 ? " checked" : ""}>${name}</label>`).join("");
}
