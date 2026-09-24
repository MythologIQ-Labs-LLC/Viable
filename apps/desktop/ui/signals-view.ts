import type { CampaignWorkspace, ChannelKind } from "../../../src/campaigns/domain/campaign.js";
import type { StoredEventIntelligenceRun } from "../../../src/event-intelligence/ports/run-store.js";
import { isReviewedEvidence } from "../../../src/product-core/domain/evidence.js";
import type { ProductWorkspace } from "../../../src/product-core/domain/workspace.js";
import type { RepositoryGrowthWorkspace } from "../../../src/repository-growth/domain/repository-growth.js";
import { ActivationLearningService } from "../../../src/activation-learning/services/activation-learning-service.js";
import { EventIntelligenceSignalSource } from "../../../src/signals/adapters/event-intelligence-signal-source.js";
import { GitHubPublicRepositorySource } from "../../../src/signals/adapters/github-public-repository-source.js";
import { ManualJsonSignalSource } from "../../../src/signals/adapters/manual-json-signal-source.js";
import type { ConversionKind, SignalConversion, SignalRecord, SignalsInbox, SourceHealth } from "../../../src/signals/domain/signal.js";
import { SignalsInboxService } from "../../../src/signals/services/signals-inbox-service.js";
import { isCampaignMaterializationKind, isContentMaterializationKind, isProductMaterializationKind, isRepositoryGrowthMaterializationKind, isWebsiteWatchMaterializationKind, SignalWorkMaterializationService } from "../../../src/signals/services/signal-work-materialization-service.js";
import { WebdogManualSignalSource, WebdogManualWebsiteWatchSource } from "../../../src/website-watch/adapters/webdog-manual-import-source.js";
import type {
  WatchTarget,
  WatchedSite,
  WebsiteChangeObservation,
  WebsiteSnapshot,
  WebsiteWatchGeneratedAnalysis,
  WebsiteWatchWorkspace,
} from "../../../src/website-watch/domain/website-watch.js";
import { WebsiteWatchService } from "../../../src/website-watch/services/website-watch-service.js";
import { LocalStorageActivationLearningStore } from "./local-storage-activation-learning-store.js";
import { LocalStorageCampaignWorkspaceStore } from "./local-storage-campaign-workspace-store.js";
import { LocalStorageProductWorkspaceStore } from "./local-storage-product-workspace-store.js";
import { LocalStorageRepositoryGrowthStore } from "./local-storage-repository-growth-store.js";
import { LocalStorageSignalsInboxStore } from "./local-storage-signals-inbox-store.js";
import { LocalStorageVideoProductionStore } from "./local-storage-video-production-store.js";
import { LocalStorageWebsiteWatchStore } from "./local-storage-website-watch-store.js";

const escapeHtml = (value: unknown): string => String(value ?? "")
  .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;").replaceAll("'", "&#039;");
const humanDate = (value?: string): string => value ? new Date(value).toLocaleString() : "Unknown";
const lineValues = (value: FormDataEntryValue | null): string[] =>
  String(value ?? "").split(/[,\n]/).map((item) => item.trim()).filter(Boolean);
const statusTone = (status: string): string =>
  ["success", "success_change_detected", "accepted", "reviewed", "converted", "change_detected", "scheduled", "materialized"].includes(status) ? "implemented"
    : ["partial", "rate_limited", "saved", "suggested", "verified_empty", "verified_no_change", "baseline", "offline", "cancelled"].includes(status) ? "warning"
      : ["transport_failed", "validation_failed", "authentication_failed", "unavailable", "forbidden", "unauthorized", "dismissed", "rejected", "disabled", "materialization_failed"].includes(status) ? "error"
        : "neutral";
const pill = (value: string): string => `<span class="pill ${statusTone(value)}">${escapeHtml(value.replaceAll("_", " "))}</span>`;
const asBoolean = (value: FormDataEntryValue | null): boolean => value === "on";
const toIso = (value: FormDataEntryValue | null, label: string): string => {
  const date = new Date(String(value ?? ""));
  if (!Number.isFinite(date.getTime())) throw new Error(`${label} must be a valid date and time`);
  return date.toISOString();
};
const localDateTime = (value: Date): string => {
  const local = new Date(value.getTime() - value.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
};

export class SignalsViewController {
  private readonly signalsStore = new LocalStorageSignalsInboxStore();
  private readonly websiteStore = new LocalStorageWebsiteWatchStore();
  private readonly productStore = new LocalStorageProductWorkspaceStore();
  private readonly campaignStore = new LocalStorageCampaignWorkspaceStore();
  private readonly repositoryStore = new LocalStorageRepositoryGrowthStore();
  private readonly service = new SignalsInboxService(this.signalsStore);
  private readonly websiteService = new WebsiteWatchService(this.websiteStore);
  private readonly activationService = new ActivationLearningService(
    new LocalStorageActivationLearningStore(),
    this.productStore,
    this.campaignStore,
    this.repositoryStore,
    new LocalStorageVideoProductionStore(),
  );
  private readonly materializationService = new SignalWorkMaterializationService(
    this.signalsStore,
    this.productStore,
    undefined,
    this.campaignStore,
    this.websiteStore,
    this.activationService,
    this.repositoryStore,
  );
  private inbox?: SignalsInbox;
  private website?: WebsiteWatchWorkspace;
  private product: ProductWorkspace | undefined;
  private campaigns: CampaignWorkspace | undefined;
  private repositoryGrowth: RepositoryGrowthWorkspace | undefined;
  private failure: string | undefined;

  constructor(
    readonly workspaceId: string,
    private readonly defaultOwner: string,
  ) {}

  async load(): Promise<void> {
    const [inbox, website, product, campaigns, repositoryGrowth] = await Promise.all([
      this.service.load(this.workspaceId),
      this.websiteService.load(this.workspaceId),
      this.productStore.load(this.workspaceId),
      this.campaignStore.load(this.workspaceId),
      this.repositoryStore.load(this.workspaceId),
    ]);
    this.inbox = inbox;
    this.website = website;
    this.product = product;
    this.campaigns = campaigns;
    this.repositoryGrowth = repositoryGrowth;
  }

  render(page: "signals" | "market"): string {
    if (!this.inbox || !this.website) return `<section class="state loading" role="status"><strong>Loading Signals Inbox</strong><span>Reading local evidence, Website Watch records, and source health.</span></section>`;
    return page === "market" ? this.renderMarket() : this.renderSignals();
  }

  async submit(formElement: HTMLFormElement): Promise<string | undefined> {
    const form = new FormData(formElement);
    const kind = formElement.dataset.form;
    this.failure = undefined;
    try {
      if (kind === "signals-github") {
        const repository = String(form.get("repository")).trim();
        const source = new GitHubPublicRepositorySource(`github:${repository.toLocaleLowerCase("en-US")}`, repository, new Date().toISOString());
        this.inbox = await this.service.collect(this.workspaceId, [source]);
        return "Public GitHub repository evidence collected";
      }
      if (kind === "signals-event-import") {
        const value = JSON.parse(String(form.get("payload"))) as StoredEventIntelligenceRun;
        const source = new EventIntelligenceSignalSource(`event-import:${value.run.runId}`, value, new Date().toISOString());
        this.inbox = await this.service.collect(this.workspaceId, [source]);
        return "Event Intelligence evidence imported";
      }
      if (kind === "signals-manual-import") {
        const source = new ManualJsonSignalSource(`manual:${Date.now()}`, String(form.get("payload")), new Date().toISOString());
        this.inbox = await this.service.collect(this.workspaceId, [source]);
        return "Manual evidence import evaluated";
      }
      if (kind === "signals-website-site") {
        this.website = await this.websiteService.createSite(this.workspaceId, {
          displayName: String(form.get("displayName")),
          canonicalUrl: String(form.get("canonicalUrl")),
          ownership: String(form.get("ownership")) as WatchedSite["ownership"],
          purpose: String(form.get("purpose")),
          authorizationConfirmed: asBoolean(form.get("authorizationConfirmed")),
          retentionClass: String(form.get("retentionClass")) as WatchedSite["retentionClass"],
          owner: String(form.get("owner")),
        });
        return "Watched site created with explicit purpose and retention";
      }
      if (kind === "signals-website-target") {
        const targetUrl = String(form.get("targetUrl") ?? "").trim();
        const linkScope = String(form.get("linkScope") ?? "").trim();
        this.website = await this.websiteService.createTarget(this.workspaceId, {
          watchedSiteId: String(form.get("watchedSiteId")),
          kind: String(form.get("targetKind")) as WatchTarget["kind"],
          ...(targetUrl ? { targetUrl } : {}),
          ...(linkScope ? { linkScope: linkScope as WatchTarget["linkScope"] } : {}),
          watchNote: String(form.get("watchNote")),
          requestedIntervalMinutes: Number(form.get("requestedIntervalMinutes")),
          adapterId: "manual-intent",
          retentionClass: String(form.get("retentionClass")) as WatchTarget["retentionClass"],
        });
        return "Website watch target recorded as provider-neutral schedule intent";
      }
      if (kind === "signals-webdog-import") {
        const payload = await importPayload(form);
        const sourceId = `webdog:${Date.now()}`;
        const configuredAt = new Date().toISOString();
        const options = {
          owner: String(form.get("owner")),
          ownership: String(form.get("ownership")) as WatchedSite["ownership"],
          purpose: String(form.get("purpose")),
          authorizationConfirmed: asBoolean(form.get("authorizationConfirmed")),
          retentionClass: String(form.get("retentionClass")) as WatchedSite["retentionClass"],
        };
        const websiteSource = new WebdogManualWebsiteWatchSource(sourceId, payload, configuredAt, options);
        const signalSource = new WebdogManualSignalSource(sourceId, payload, configuredAt, options);
        this.website = await this.websiteService.collect(this.workspaceId, websiteSource);
        this.inbox = await this.service.collect(this.workspaceId, [signalSource]);
        return "Webdog website-change evidence imported for named review";
      }
      if (kind === "signals-calendar-follow-up") {
        const signal = this.requiredSignal(String(form.get("signalId")));
        if (signal.evidenceState !== "reviewed") throw new Error("Calendar follow-up requires a reviewed website-change signal");
        const observationId = websiteObservationId(signal);
        const observation = this.requiredObservation(observationId);
        if (observation.reviewState !== "reviewed") throw new Error("Calendar follow-up requires a reviewed Website Watch observation");
        await this.activationService.createPlanningEntry(this.workspaceId, {
          kind: String(form.get("calendarKind")) as "follow_up" | "experiment" | "event_opportunity" | "approval_deadline",
          title: String(form.get("title")),
          owner: String(form.get("owner")),
          startsAt: toIso(form.get("startsAt"), "Calendar start"),
          timezone: String(form.get("timezone")),
          notes: String(form.get("notes")),
          relatedRecordId: observation.id,
        });
        return "Reviewed website change added to authoritative Calendar planning";
      }
      if (kind === "signals-convert") {
        this.inbox = await this.service.convert(this.workspaceId, String(form.get("signalId")), {
          kind: String(form.get("kind")) as ConversionKind,
          title: String(form.get("title")),
          owner: String(form.get("owner")),
        });
        return "Reviewed signal converted into proposed owned work";
      }
      if (kind === "signals-materialize-campaign") {
        const audienceKind = String(form.get("audienceKind")) as "selected_icp" | "test_audience";
        const icpHypothesisId = String(form.get("icpHypothesisId") ?? "").trim();
        const result = await this.materializationService.materializeCampaign(this.workspaceId, String(form.get("conversionId")), {
          objective: String(form.get("objective")),
          primaryOutcome: String(form.get("primaryOutcome")),
          primaryAudience: String(form.get("primaryAudience")),
          audienceKind,
          ...(audienceKind === "selected_icp" && icpHypothesisId ? { icpHypothesisId } : {}),
          problem: String(form.get("problem")),
          trigger: String(form.get("trigger")),
          offer: String(form.get("offer")),
          messageHierarchy: lineValues(form.get("messageHierarchy")),
          proof: lineValues(form.get("proof")),
          claimIds: form.getAll("claimIds").map(String),
          evidenceIds: form.getAll("evidenceIds").map(String),
          callToAction: String(form.get("callToAction")),
          channels: form.getAll("channels").map(String) as ChannelKind[],
          assetPlan: lineValues(form.get("assetPlan")),
          successMeasures: lineValues(form.get("successMeasures")),
          dependencies: lineValues(form.get("dependencies")),
        });
        this.inbox = result.inbox;
        return "Signal work materialized into an authoritative Campaign draft";
      }
      if (kind === "signals-materialize-content") {
        const result = await this.materializationService.materializeContent(this.workspaceId, String(form.get("conversionId")), {
          campaignId: String(form.get("campaignId")),
          objective: String(form.get("objective")),
          pillars: lineValues(form.get("pillars")),
          themes: lineValues(form.get("themes")),
          deliverables: lineValues(form.get("deliverables")),
          sourceNotes: lineValues(form.get("sourceNotes")),
          origin: String(form.get("origin")) as "human" | "generated_suggestion",
        });
        this.inbox = result.inbox;
        this.campaigns = result.campaigns;
        return "Signal work materialized into an authoritative content brief";
      }
      if (kind === "signals-materialize-repository-growth") {
        const [planId, actionId] = String(form.get("growthTarget") ?? "").split("::");
        if (!planId || !actionId) throw new Error("Choose an active Repository Growth action");
        const result = await this.materializationService.materializeRepositoryGrowthAction(this.workspaceId, String(form.get("conversionId")), { planId, actionId });
        this.inbox = result.inbox;
        this.repositoryGrowth = result.repositoryGrowth;
        return "Signal work bound to authoritative Repository Growth action";
      }
      if (kind === "signals-materialize-website-action") {
        const endsAt = String(form.get("endsAt") ?? "").trim();
        const result = await this.materializationService.materializeWebsiteWatchAction(this.workspaceId, String(form.get("conversionId")), {
          kind: String(form.get("calendarKind")) as "follow_up" | "experiment" | "event_opportunity" | "approval_deadline",
          startsAt: toIso(form.get("startsAt"), "Calendar start"),
          ...(endsAt ? { endsAt: toIso(endsAt, "Calendar end") } : {}),
          timezone: String(form.get("timezone")),
          notes: String(form.get("notes")),
        });
        this.inbox = result.inbox;
        return "Website Watch response materialized into authoritative Calendar planning";
      }
      if (kind === "signals-connect") {
        this.inbox = await this.service.connect(this.workspaceId, String(form.get("signalId")), {
          kind: String(form.get("relationshipKind")) as "product",
          targetId: String(form.get("targetId")),
          label: String(form.get("label")),
        });
        return "Signal relationship recorded";
      }
      return undefined;
    } catch (error) {
      this.failure = error instanceof Error ? error.message : "Unknown Signals Inbox error";
      throw error;
    }
  }

  async click(button: HTMLButtonElement): Promise<string | undefined> {
    const action = button.dataset.signalAction;
    const id = button.dataset.id;
    if (!action || !id) return undefined;
    this.failure = undefined;
    try {
      if (action === "accept" || action === "dismiss") {
        const reviewer = prompt("Named signal reviewer");
        if (!reviewer) return undefined;
        const signal = this.requiredSignal(id);
        if (signal.kind === "website_change") {
          const observationId = websiteObservationId(signal);
          this.website = await this.websiteService.reviewObservation(this.workspaceId, observationId, reviewer, action === "accept");
        }
        this.inbox = await this.service.review(this.workspaceId, id, reviewer, action === "accept");
        return action === "accept" ? "Signal and related Website Watch observation accepted with named review" : "Signal and related Website Watch observation dismissed";
      }
      if (action === "materialize-product") {
        const result = await this.materializationService.materializeProductCore(this.workspaceId, id);
        this.inbox = result.inbox;
        return "Signal work materialized into authoritative Product Core";
      }
      if (action === "save") {
        this.inbox = await this.service.save(this.workspaceId, id);
        return "Signal saved";
      }
      if (action === "tag") {
        const tags = prompt("Tags, separated by commas");
        if (!tags) return undefined;
        this.inbox = await this.service.tag(this.workspaceId, id, lineValues(tags));
        return "Signal tags updated";
      }
      if (action === "assign") {
        const owner = prompt("Named signal owner", this.defaultOwner);
        if (!owner) return undefined;
        this.inbox = await this.service.assign(this.workspaceId, id, owner);
        return "Signal owner assigned";
      }
      if (action === "website-site-disable" || action === "website-site-enable") {
        this.website = await this.websiteService.setSiteStatus(this.workspaceId, id, action === "website-site-enable" ? "active" : "disabled");
        return action === "website-site-enable" ? "Watched site enabled" : "Watched site and its targets disabled";
      }
      if (action === "website-target-disable" || action === "website-target-enable") {
        this.website = await this.websiteService.setTargetEnabled(this.workspaceId, id, action === "website-target-enable");
        return action === "website-target-enable" ? "Website watch target enabled" : "Website watch target disabled";
      }
      if (action === "website-delete-snapshot") {
        const actor = prompt("Named deletion actor", this.defaultOwner);
        if (!actor) return undefined;
        this.website = await this.websiteService.deleteSnapshot(this.workspaceId, id, actor);
        return "Website snapshot payload deleted while provenance was retained";
      }
      if (action === "website-prune-retention") {
        const actor = prompt("Named retention actor", this.defaultOwner);
        if (!actor) return undefined;
        this.website = await this.websiteService.pruneExpiredSnapshots(this.workspaceId, actor);
        return "Expired Website Watch snapshots pruned according to retention policy";
      }
      return undefined;
    } catch (error) {
      this.failure = error instanceof Error ? error.message : "Unknown Signals Inbox error";
      throw error;
    }
  }

  private renderSignals(): string {
    const inbox = this.inbox!;
    const failures = inbox.sourceHealth.filter((health) => !["success", "verified_empty"].includes(health.status));
    const verifiedEmpty = inbox.sourceHealth.filter((health) => health.status === "verified_empty");
    return `
      <header class="hero compact"><div><p class="eyebrow">Signals Inbox</p><h2>Evidence before action.</h2>
        <p>Import events, repositories, and website changes; inspect source health; and convert only reviewed evidence into owned work or Calendar follow-up.</p></div>${pill("local only")}</header>
      ${this.failure ? `<section class="state error" role="alert"><div><strong>Signal operation failed.</strong><p>${escapeHtml(this.failure)}</p></div><button type="button" data-nav="signals">Return to saved inbox</button></section>` : ""}
      <section class="state offline"><strong>Manual paths remain available.</strong><span>Live website crawling is not enabled. Provider failures do not erase successful local evidence.</span></section>
      ${failures.length ? `<section class="state warning"><div><strong>Partial source health</strong><p>${failures.map((item) => `${escapeHtml(item.sourceId)}: ${escapeHtml(item.status)}`).join(" · ")}</p></div></section>` : ""}
      ${verifiedEmpty.length ? `<section class="state"><strong>Verified empty</strong><span>${verifiedEmpty.map((item) => escapeHtml(item.sourceId)).join(", ")} completed successfully and returned no evidence.</span></section>` : ""}
      ${this.sourceHealth(inbox.sourceHealth)}
      ${this.websiteWatchSection()}
      <section class="panel" aria-labelledby="sources-heading">
        <div class="section-heading"><div><p class="eyebrow">Other sources</p><h3 id="sources-heading">Collect or import evidence</h3></div>${pill(`${inbox.sources.length} configured`)}</div>
        <div class="source-forms">
          <form data-form="signals-github"><h4>Public GitHub repository</h4><p class="guidance">Uses unauthenticated read-only public API access. Missing metrics remain unavailable, never zero.</p><label>Repository<input name="repository" required placeholder="owner/repository"></label><button type="submit">Collect public evidence</button></form>
          <form data-form="signals-event-import"><h4>Event Intelligence run</h4><p class="guidance">Paste a local sanitized run export. Partial and failed source states are preserved.</p><label>Run JSON<textarea name="payload" required rows="5" placeholder='{"run": {...}, "events": [...]}'></textarea></label><button type="submit">Import event evidence</button></form>
          <form data-form="signals-manual-import"><h4>Manual signal import</h4><p class="guidance">Up to 100 untrusted evidence proposals. Unknown instructions are ignored.</p><label>Signals JSON<textarea name="payload" required rows="5" placeholder='{"signals":[{"title":"...","summary":"..."}]}'></textarea></label><button type="submit">Validate and import</button></form>
        </div>
      </section>
      <section class="panel" aria-labelledby="inbox-heading">
        <div class="section-heading"><div><p class="eyebrow">Inbox</p><h3 id="inbox-heading">Review signals</h3></div>${pill(`${inbox.signals.length} signals`)}</div>
        <p class="guidance">All imported signals begin as suggestions. Website-change acceptance synchronizes the related Website Watch observation. Acceptance never revises Product Core or the canonical ICP.</p>
        <div class="cards signal-cards">${inbox.signals.length ? inbox.signals.slice().reverse().map((signal) => this.signalCard(signal)).join("") : `<div class="state empty"><strong>No signals yet.</strong><span>Configure a source or use a manual import. An empty inbox is not evidence that the market is empty.</span></div>`}</div>
      </section>
      <section class="panel" aria-labelledby="work-heading"><div class="section-heading"><div><p class="eyebrow">Proposed work</p><h3 id="work-heading">Signal conversions</h3></div>${pill(`${inbox.conversions.length} proposals`)}</div>
        <p class="guidance">Product actions, ICP validation actions, and product feedback can be materialized into Product Core. Campaign proposals can become governed Campaign drafts, and content proposals can become Campaign-owned content briefs under an approved campaign. Website Watch response proposals can materialize into authoritative Calendar planning only from a currently reviewed Website Watch observation. Repository-growth proposals can bind only to an active finding-backed Repository Growth action for the same reviewed repository signal.</p>
        <div class="cards">${inbox.conversions.length ? inbox.conversions.map((item) => this.conversionCard(item)).join("") : `<div class="state empty"><strong>No conversions yet.</strong><span>Only accepted reviewed signals can become proposed work.</span></div>`}</div>
      </section>`;
  }


  private conversionCard(item: SignalConversion): string {
    const productMaterialization = isProductMaterializationKind(item.kind);
    const campaignMaterialization = isCampaignMaterializationKind(item.kind);
    const contentMaterialization = isContentMaterializationKind(item.kind);
    const repositoryGrowthMaterialization = isRepositoryGrowthMaterializationKind(item.kind);
    const websiteWatchMaterialization = isWebsiteWatchMaterializationKind(item.kind);
    const destination = item.materialization;
    const failure = item.materializationFailure;
    return `<article class="record signal-conversion">
      <div class="record-top"><h4>${escapeHtml(item.title)}</h4>${pill(item.status)}</div>
      <p>${escapeHtml(item.kind.replaceAll("_", " "))}</p>
      <small>Owner: ${escapeHtml(item.owner)} · Created ${humanDate(item.createdAt)}</small>
      ${destination ? `<p><strong>Authoritative destination:</strong> ${escapeHtml(destination.context)} · <code>${escapeHtml(destination.recordId)}</code> · ${humanDate(destination.materializedAt)}</p>` : ""}
      ${failure ? `<div class="inline-warning"><strong>Materialization failed.</strong> ${escapeHtml(failure.detail)} · ${humanDate(failure.attemptedAt)}</div>` : ""}
      ${productMaterialization && item.status !== "materialized" ? `<button type="button" data-signal-action="materialize-product" data-id="${escapeHtml(item.id)}">${item.status === "materialization_failed" ? "Retry Product Core materialization" : "Materialize in Product Core"}</button>` : ""}
      ${campaignMaterialization && item.status !== "materialized" ? this.campaignMaterializationForm(item) : ""}
      ${contentMaterialization && item.status !== "materialized" ? this.contentMaterializationForm(item) : ""}
      ${repositoryGrowthMaterialization && item.status !== "materialized" ? this.repositoryGrowthMaterializationForm(item) : ""}
      ${websiteWatchMaterialization && item.status !== "materialized" ? this.websiteWatchActionMaterializationForm(item) : ""}
      ${!productMaterialization && !campaignMaterialization && !contentMaterialization && !repositoryGrowthMaterialization && !websiteWatchMaterialization && item.status === "proposed" ? `<small>Destination-specific fields and authority checks are still required before this proposal can create an authoritative record.</small>` : ""}
    </article>`;
  }

  private campaignMaterializationForm(item: SignalConversion): string {
    const product = this.product;
    const approvedClaims = product?.claims.filter((claim) => claim.status === "approved") ?? [];
    const reviewedEvidence = product?.evidence.filter(isReviewedEvidence) ?? [];
    const selectedIcps = product?.icpHypotheses.filter((icp) => icp.status === "selected" && icp.reviewStatus === "reviewed") ?? [];
    if (!product || approvedClaims.length === 0 || reviewedEvidence.length === 0) {
      return `<div class="state warning"><strong>Campaign authority is not ready.</strong><span>Materialization requires at least one approved Product Core claim and reviewed non-generated evidence.</span></div>`;
    }
    const signal = this.requiredSignal(item.signalId);
    const claimOptions = approvedClaims.map((claim) => `<option value="${escapeHtml(claim.id)}">${escapeHtml(claim.statement)} · r${claim.revision}</option>`).join("");
    const evidenceOptions = reviewedEvidence.map((evidence) => `<option value="${escapeHtml(evidence.id)}">${escapeHtml(evidence.title)} · ${escapeHtml(evidence.confidence)}</option>`).join("");
    const icpOptions = selectedIcps.map((icp) => `<option value="${escapeHtml(icp.id)}">${escapeHtml(icp.name)}</option>`).join("");
    return `<details><summary>${item.status === "materialization_failed" ? "Retry Campaign materialization" : "Materialize Campaign brief"}</summary>
      <form data-form="signals-materialize-campaign">
        <input type="hidden" name="conversionId" value="${escapeHtml(item.id)}">
        <p class="guidance">Campaign authority requires a complete draft brief plus approved Product Core claims and reviewed evidence. This creates a draft Campaign record only; it does not approve, publish, or deliver anything.</p>
        <label>Objective<textarea name="objective" required rows="2">Investigate ${escapeHtml(signal.title)}</textarea></label>
        <div class="two"><label>Primary outcome<input name="primaryOutcome" required></label><label>Primary audience<input name="primaryAudience" required value="${escapeHtml(selectedIcps[0]?.name ?? "")}"></label></div>
        <div class="two"><label>Audience authority<select name="audienceKind"><option value="test_audience">Test audience</option>${selectedIcps.length ? `<option value="selected_icp">Reviewed selected ICP</option>` : ""}</select></label><label>Selected ICP${selectedIcps.length ? `<select name="icpHypothesisId"><option value="">Not used for test audience</option>${icpOptions}</select>` : `<input disabled value="No reviewed selected ICP">`}</label></div>
        <label>Problem<textarea name="problem" required rows="2">${escapeHtml(signal.summary)}</textarea></label>
        <label>Trigger<textarea name="trigger" required rows="2">${escapeHtml(signal.title)}</textarea></label>
        <label>Offer<textarea name="offer" required rows="2"></textarea></label>
        <label>Message hierarchy<textarea name="messageHierarchy" required rows="3">${escapeHtml(signal.summary)}</textarea></label>
        <label>Proof notes<textarea name="proof" rows="2"></textarea></label>
        <div class="two"><label>Approved Product Core claims<select name="claimIds" multiple required size="${Math.min(6, Math.max(2, approvedClaims.length))}">${claimOptions}</select></label><label>Reviewed Product Core evidence<select name="evidenceIds" multiple required size="${Math.min(6, Math.max(2, reviewedEvidence.length))}">${evidenceOptions}</select></label></div>
        <p class="guidance">Select every evidence record referenced by the claims you choose. Campaign authority will reject missing, generated, rejected, stale-revision, or channel-prohibited claim references.</p>
        <label>Call to action<input name="callToAction" required></label>
        <label>Channels<select name="channels" multiple required size="3"><option value="website">Website</option><option value="linkedin">LinkedIn</option><option value="github_release">GitHub release</option></select></label>
        <label>Asset plan<textarea name="assetPlan" rows="2"></textarea></label>
        <label>Success measures<textarea name="successMeasures" required rows="2"></textarea></label>
        <label>Dependencies<textarea name="dependencies" rows="2"></textarea></label>
        <button type="submit">Create governed Campaign draft</button>
      </form>
    </details>`;
  }

  private contentMaterializationForm(item: SignalConversion): string {
    const approvedCampaigns = this.campaigns?.campaigns.filter((campaign) => campaign.status === "approved") ?? [];
    if (approvedCampaigns.length === 0) {
      return `<div class="state warning"><strong>Content authority is not ready.</strong><span>Materialization requires an approved Campaign brief so the content source packet inherits approved claims, reviewed evidence, audience, and outcome.</span></div>`;
    }
    const signal = this.requiredSignal(item.signalId);
    const campaignOptions = approvedCampaigns.map((campaign) => `<option value="${escapeHtml(campaign.id)}">${escapeHtml(campaign.title)} · ${escapeHtml(campaign.primaryAudience)}</option>`).join("");
    return `<details><summary>${item.status === "materialization_failed" ? "Retry content brief materialization" : "Materialize content brief"}</summary>
      <form data-form="signals-materialize-content">
        <input type="hidden" name="conversionId" value="${escapeHtml(item.id)}">
        <p class="guidance">Content briefs live in Campaigns and Assets. They inherit the approved campaign claim/evidence source packet and remain drafts until separate review. This does not create a canonical asset, channel variant, export, publication, or delivery.</p>
        <label>Approved campaign<select name="campaignId" required>${campaignOptions}</select></label>
        <label>Content objective<textarea name="objective" required rows="2">Respond to ${escapeHtml(signal.title)}</textarea></label>
        <label>Content pillars<textarea name="pillars" required rows="2">${escapeHtml(signal.summary)}</textarea></label>
        <label>Themes<textarea name="themes" rows="2"></textarea></label>
        <label>Planned deliverables<textarea name="deliverables" required rows="3"></textarea></label>
        <label>Source notes<textarea name="sourceNotes" rows="3">Signal: ${escapeHtml(signal.title)}
${escapeHtml(signal.summary)}</textarea></label>
        <label>Origin<select name="origin"><option value="human">Human-authored brief</option><option value="generated_suggestion">Generated suggestion requiring review</option></select></label>
        <button type="submit">Create governed content brief</button>
      </form>
    </details>`;
  }

  private repositoryGrowthMaterializationForm(item: SignalConversion): string {
    const signal = this.inbox?.signals.find((candidate) => candidate.id === item.signalId);
    if (!signal || !["repository", "repository_activity"].includes(signal.kind) || signal.evidenceState !== "reviewed") {
      return `<div class="state warning"><strong>Repository Growth authority is not ready.</strong><span>This conversion requires a reviewed repository signal.</span></div>`;
    }
    const repositoryTargets = new Set(signal.relationships
      .filter((relationship) => relationship.kind === "repository")
      .map((relationship) => relationship.targetId.toLocaleLowerCase("en-US")));
    const options = this.repositoryGrowth?.plans.flatMap((plan) => {
      const repository = this.repositoryGrowth!.repositories.find((candidate) => candidate.id === plan.repositoryId);
      if (!repository || !repositoryTargets.has(repository.fullName.toLocaleLowerCase("en-US"))) return [];
      return plan.actions
        .filter((action) => action.status === "open" || action.status === "in_progress")
        .map((action) => `<option value="${escapeHtml(`${plan.id}::${action.id}`)}">${escapeHtml(repository.fullName)} · ${escapeHtml(action.title)} · ${escapeHtml(action.impact)} impact / ${escapeHtml(action.effort)} effort</option>`);
    }).join("") ?? "";
    if (!options) {
      return `<div class="state warning"><strong>Repository Growth authority is not ready.</strong><span>Import and assess the same repository in Repository Growth, then create a growth plan with an active finding-backed action.</span></div>`;
    }
    return `<details><summary>${item.status === "materialization_failed" ? "Retry Repository Growth materialization" : "Bind to Repository Growth action"}</summary>
      <form data-form="signals-materialize-repository-growth">
        <input type="hidden" name="conversionId" value="${escapeHtml(item.id)}">
        <p class="guidance">Repository Growth owns readiness findings and actions. Select an existing active action for the same repository. Signals will not overwrite the finding-derived recommendation, impact, effort, verification, owner, or status.</p>
        <label>Finding-backed Repository Growth action<select name="growthTarget" required>${options}</select></label>
        <button type="submit">Bind to authoritative Repository Growth action</button>
      </form>
    </details>`;
  }

  private websiteWatchActionMaterializationForm(item: SignalConversion): string {
    const signal = this.inbox?.signals.find((candidate) => candidate.id === item.signalId);
    if (!signal || signal.kind !== "website_change" || signal.evidenceState !== "reviewed") {
      return `<div class="state warning"><strong>Website Watch response authority is not ready.</strong><span>This conversion requires a reviewed website-change signal.</span></div>`;
    }
    const observationId = signal.facts.websiteWatchObservationId;
    const observation = typeof observationId === "string"
      ? this.website?.observations.find((candidate) => candidate.id === observationId)
      : undefined;
    if (!observation || observation.reviewState !== "reviewed") {
      return `<div class="state warning"><strong>Website Watch response authority is not ready.</strong><span>The correlated Website Watch observation must remain reviewed before Calendar planning can be created.</span></div>`;
    }
    const start = localDateTime(new Date(Date.now() + 86_400_000));
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    return `<details><summary>${item.status === "materialization_failed" ? "Retry Website Watch response materialization" : "Materialize Website Watch response"}</summary>
      <form data-form="signals-materialize-website-action">
        <input type="hidden" name="conversionId" value="${escapeHtml(item.id)}">
        <p class="guidance">Website Watch remains authoritative for the reviewed observation; Calendar owns the response plan. This creates planning only. It does not publish, notify a provider, alter Product Core, or claim delivery.</p>
        <div class="two"><label>Response kind<select name="calendarKind"><option value="follow_up">Follow-up</option><option value="experiment">Experiment</option><option value="event_opportunity">Opportunity</option><option value="approval_deadline">Approval deadline</option></select></label><label>Start<input name="startsAt" type="datetime-local" required value="${start}"></label></div>
        <div class="two"><label>Optional end<input name="endsAt" type="datetime-local"></label><label>Timezone<input name="timezone" required value="${escapeHtml(timezone)}"></label></div>
        <label>Planning notes<textarea name="notes" rows="3">Review Website Watch observation ${escapeHtml(observation.id)} and the bounded source evidence before deciding a reversible response.</textarea></label>
        <button type="submit">Create authoritative Calendar response plan</button>
      </form>
    </details>`;
  }

  private websiteWatchSection(): string {
    const website = this.website!;
    const activeSites = website.sites.filter((site) => site.status === "active");
    const sourceOptions = activeSites.map((site) => `<option value="${escapeHtml(site.id)}">${escapeHtml(site.displayName)} · ${escapeHtml(site.normalizedDomain)}</option>`).join("");
    return `<section class="panel website-watch" aria-labelledby="website-watch-heading">
      <div class="section-heading"><div><p class="eyebrow">Website Watch</p><h3 id="website-watch-heading">Public website-change evidence</h3></div><div>${pill(`${website.sites.length} sites`)} ${pill(`${website.observations.length} observations`)}</div></div>
      <p class="guidance">Stage 1 records provider-neutral monitoring intent and imports Webdog alert JSON. It does not crawl websites, call Context.dev, open a webhook listener, or treat generated summaries as evidence.</p>
      ${this.websiteHealth()}
      <div class="source-forms website-watch-forms">
        <form data-form="signals-website-site"><h4>Create watched site</h4><label>Display name<input name="displayName" required></label><label>Public canonical URL<input name="canonicalUrl" type="url" required placeholder="https://example.com/"></label><div class="two"><label>Relationship<select name="ownership"><option value="owned">Owned</option><option value="competitor">Competitor</option><option value="partner">Partner</option><option value="regulator">Regulator</option><option value="community">Community</option><option value="other">Other</option></select></label><label>Retention<select name="retentionClass"><option value="ephemeral">Ephemeral · 14 days</option><option value="standard" selected>Standard · 90 days</option><option value="extended">Extended · manual deletion</option></select></label></div><label>Legitimate monitoring purpose<textarea name="purpose" required rows="3"></textarea></label><label>Named owner<input name="owner" required value="${escapeHtml(this.defaultOwner)}"></label><label class="choice"><input name="authorizationConfirmed" type="checkbox" required> I confirm a legitimate, authorized public-monitoring purpose and will respect access controls, provider terms, robots policies, and applicable law.</label><button type="submit">Create watched site</button></form>
        <form data-form="signals-website-target"><h4>Record watch target</h4>${sourceOptions ? `<label>Watched site<select name="watchedSiteId" required>${sourceOptions}</select></label>` : `<div class="state empty"><strong>Create an active watched site first.</strong></div>`}<div class="two"><label>Target type<select name="targetKind"><option value="page_content">Page content</option><option value="site_links">Site links</option><option value="product_price">Product price</option></select></label><label>Link scope<select name="linkScope"><option value="both">Added and removed</option><option value="added">Added only</option><option value="removed">Removed only</option></select></label></div><label>Target URL for page or price monitoring<input name="targetUrl" type="url" placeholder="https://example.com/pricing"></label><label>What matters<textarea name="watchNote" required rows="3"></textarea></label><div class="two"><label>Requested minimum interval<select name="requestedIntervalMinutes"><option value="15">15 minutes</option><option value="60" selected>1 hour</option><option value="360">6 hours</option><option value="1440">24 hours</option></select></label><label>Retention<select name="retentionClass"><option value="ephemeral">Ephemeral</option><option value="standard" selected>Standard</option><option value="extended">Extended</option></select></label></div><button type="submit" ${sourceOptions ? "" : "disabled"}>Record provider-neutral target</button></form>
        <form data-form="signals-webdog-import"><h4>Import Webdog alerts</h4><p class="guidance">Accepts the documented <code>webdog_ai.new_alerts</code> version 1 payload. Paste JSON or select one local JSON file. Credential-bearing fields and off-origin dashboard links are rejected.</p><label>Paste payload<textarea name="payload" rows="7" placeholder='{"type":"webdog_ai.new_alerts","version":1,...}'></textarea></label><label>Or choose JSON file<input name="payloadFile" type="file" accept="application/json,.json"></label><div class="two"><label>Relationship<select name="ownership"><option value="competitor">Competitor</option><option value="owned">Owned</option><option value="partner">Partner</option><option value="regulator">Regulator</option><option value="community">Community</option><option value="other">Other</option></select></label><label>Retention<select name="retentionClass"><option value="ephemeral">Ephemeral · 14 days</option><option value="standard" selected>Standard · 90 days</option><option value="extended">Extended</option></select></label></div><label>Monitoring purpose<textarea name="purpose" required rows="2"></textarea></label><label>Named owner<input name="owner" required value="${escapeHtml(this.defaultOwner)}"></label><label class="choice"><input name="authorizationConfirmed" type="checkbox" required> I confirm a legitimate, authorized monitoring purpose.</label><button type="submit">Validate and import Webdog evidence</button></form>
      </div>
      <div class="section-heading"><div><p class="eyebrow">Configuration</p><h4>Sites and targets</h4></div><button type="button" data-signal-action="website-prune-retention" data-id="workspace">Prune expired snapshots</button></div>
      <div class="cards website-site-cards">${website.sites.length ? website.sites.map((site) => this.siteCard(site)).join("") : `<div class="state empty"><strong>No watched sites.</strong><span>Create a public site record or import a Webdog alert payload. No live provider is required.</span></div>`}</div>
      <div class="section-heading"><div><p class="eyebrow">Observations</p><h4>Bounded evidence and generated analysis</h4></div></div>
      <div class="cards website-observation-cards">${website.observations.length ? website.observations.slice().reverse().map((observation) => this.observationCard(observation)).join("") : `<div class="state empty"><strong>No website observations.</strong><span>A configured target is monitoring intent, not evidence that a check occurred.</span></div>`}</div>
    </section>`;
  }

  private websiteHealth(): string {
    const health = this.website!.sourceHealth;
    return `<div class="health-grid website-health">${health.length ? health.map((item) => `<article><div class="record-top"><strong>${escapeHtml(item.sourceId)}</strong>${pill(item.status)}</div><small>Checked ${humanDate(item.checkedAt)}</small>${item.detail ? `<p>${escapeHtml(item.detail)}</p>` : ""}<details><summary>Source limitations</summary><ul class="limitations">${item.limitations.map((value) => `<li>${escapeHtml(value)}</li>`).join("")}</ul></details></article>`).join("") : `<div class="state empty"><strong>No Website Watch source attempts.</strong><span>Configuration alone does not imply a successful source check.</span></div>`}</div>`;
  }

  private siteCard(site: WatchedSite): string {
    const targets = this.website!.targets.filter((target) => target.watchedSiteId === site.id);
    return `<article class="record website-site-card"><div class="record-top"><h4>${escapeHtml(site.displayName)}</h4><div>${pill(site.ownership)} ${pill(site.status)}</div></div><p><a href="${escapeHtml(site.canonicalUrl)}">${escapeHtml(site.normalizedDomain)}</a></p><p>${escapeHtml(site.purpose)}</p><small>Owner: ${escapeHtml(site.owner)} · Retention: ${escapeHtml(site.retentionClass)} · Authorization confirmed</small><div class="actions"><button type="button" data-signal-action="website-site-${site.status === "active" ? "disable" : "enable"}" data-id="${escapeHtml(site.id)}">${site.status === "active" ? "Disable site" : "Enable site"}</button></div><details open><summary>${targets.length} watch targets</summary>${targets.length ? targets.map((target) => this.targetCard(target)).join("") : `<p>No targets recorded.</p>`}</details></article>`;
  }

  private targetCard(target: WatchTarget): string {
    return `<div class="website-target"><div class="record-top"><strong>${escapeHtml(target.kind.replaceAll("_", " "))}</strong>${pill(target.enabled ? "active" : "disabled")}</div><p>${escapeHtml(target.watchNote)}</p><small>${escapeHtml(target.targetUrl ?? "Watched-site sitemap")} · Requested interval ${target.requestedIntervalMinutes} minutes · Next due intent ${humanDate(target.nextCheckDueAt)}</small><button type="button" data-signal-action="website-target-${target.enabled ? "disable" : "enable"}" data-id="${escapeHtml(target.id)}">${target.enabled ? "Disable target" : "Enable target"}</button></div>`;
  }

  private observationCard(observation: WebsiteChangeObservation): string {
    const site = this.website!.sites.find((item) => item.id === observation.watchedSiteId);
    const snapshot = this.website!.snapshots.find((item) => item.id === observation.currentSnapshotId);
    const analyses = this.website!.generatedAnalyses.filter((item) => observation.generatedAnalysisIds.includes(item.id));
    const signal = this.inbox!.signals.find((item) => item.facts.websiteWatchObservationId === observation.id);
    return `<article class="record website-observation"><div class="record-top"><h4>${escapeHtml(site?.displayName ?? "Website observation")}</h4><div>${pill(observation.changeKind)} ${pill(observation.evidenceState)} ${pill(observation.reviewState)}</div></div><p class="diff-preview">${escapeHtml(observation.diffPreview || "No bounded diff preview supplied")}</p><dl><div><dt>Observed</dt><dd>${humanDate(observation.observedAt)}</dd></div><div><dt>Confidence</dt><dd>${escapeHtml(observation.confidence)}</dd></div><div><dt>Source</dt><dd>${escapeHtml(observation.sourceId)}</dd></div><div><dt>Signal review</dt><dd>${escapeHtml(signal?.evidenceState ?? "No correlated signal")}</dd></div></dl>${snapshot ? this.snapshotDetails(snapshot) : `<div class="inline-warning"><strong>Snapshot reference unavailable.</strong></div>`}<details><summary>Evidence limitations</summary><ul class="limitations">${observation.limitations.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul></details>${analyses.length ? `<div class="generated-analysis"><strong>Generated analysis, not evidence</strong>${analyses.map((analysis) => this.analysisCard(analysis)).join("")}</div>` : ""}${observation.reviewState === "suggested" ? `<p class="guidance">Accept or dismiss the correlated signal below. Named signal review synchronizes this observation.</p>` : ""}${signal && signal.evidenceState === "reviewed" && observation.reviewState === "reviewed" ? this.calendarForm(signal, observation) : ""}</article>`;
  }

  private snapshotDetails(snapshot: WebsiteSnapshot): string {
    return `<details><summary>Snapshot provenance</summary><p><strong>Provider:</strong> ${escapeHtml(snapshot.provider)}</p><p><strong>Observed URL:</strong> ${escapeHtml(snapshot.observedUrl)}</p><p><strong>SHA-256:</strong> <code>${escapeHtml(snapshot.contentHash)}</code></p><p><strong>Payload:</strong> ${escapeHtml(snapshot.payloadReference)}</p><p><strong>Retention:</strong> ${escapeHtml(snapshot.retentionClass)}${snapshot.deleteAfter ? ` · delete after ${humanDate(snapshot.deleteAfter)}` : ""}${snapshot.deletedAt ? ` · deleted ${humanDate(snapshot.deletedAt)} by ${escapeHtml(snapshot.deletedBy ?? "unknown")}` : ""}</p>${snapshot.deletedAt ? "" : `<button type="button" data-signal-action="website-delete-snapshot" data-id="${escapeHtml(snapshot.id)}">Delete retained snapshot payload</button>`}</details>`;
  }

  private analysisCard(analysis: WebsiteWatchGeneratedAnalysis): string {
    return `<article><div class="record-top"><strong>${escapeHtml(analysis.kind.replaceAll("_", " "))}</strong>${pill("generated")}</div><p>${escapeHtml(analysis.content)}</p><small>Provider: ${escapeHtml(analysis.provider)}${analysis.model ? ` · Model: ${escapeHtml(analysis.model)}` : " · Model not supplied"}</small><ul class="limitations">${analysis.limitations.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul></article>`;
  }

  private calendarForm(signal: SignalRecord, observation: WebsiteChangeObservation): string {
    return `<details><summary>Create Calendar follow-up</summary><form data-form="signals-calendar-follow-up"><input type="hidden" name="signalId" value="${escapeHtml(signal.id)}"><div class="two"><label>Calendar kind<select name="calendarKind"><option value="follow_up">Follow-up</option><option value="experiment">Experiment</option><option value="event_opportunity">Opportunity</option><option value="approval_deadline">Approval deadline</option></select></label><label>Start<input name="startsAt" type="datetime-local" required value="${localDateTime(new Date(Date.now() + 86_400_000))}"></label></div><label>Title<input name="title" required value="Review response to ${escapeHtml(signal.title)}"></label><div class="two"><label>Named owner<input name="owner" required value="${escapeHtml(signal.owner ?? this.defaultOwner)}"></label><label>Timezone<input name="timezone" required value="${escapeHtml(Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC")}"></label></div><label>Notes<textarea name="notes" rows="3">Website Watch observation ${escapeHtml(observation.id)}. Review the bounded source evidence and decide the next reversible action.</textarea></label><button type="submit">Add reviewed change to Calendar</button></form></details>`;
  }

  private renderMarket(): string {
    const inbox = this.inbox!;
    const reviewed = inbox.signals.filter((signal) => signal.evidenceState === "reviewed");
    const byKind = new Map<string, number>();
    for (const signal of reviewed) byKind.set(signal.kind, (byKind.get(signal.kind) ?? 0) + 1);
    const limitations = [...new Set(reviewed.flatMap((signal) => signal.limitations))];
    return `
      <header class="hero compact"><div><p class="eyebrow">Market evidence</p><h2>What the evidence says, and what it does not.</h2>
        <p>This view summarizes reviewed signals, including reviewed website changes. It does not calculate ICP truth, qualify leads, or manufacture certainty.</p></div>${pill("evidence only")}</header>
      <section class="metrics"><article><span>Reviewed signals</span><strong>${reviewed.length}</strong><small>Named human review</small></article>
        <article><span>Event evidence</span><strong>${byKind.get("event") ?? 0}</strong><small>Bounded Event Intelligence</small></article>
        <article><span>Repository evidence</span><strong>${(byKind.get("repository") ?? 0) + (byKind.get("repository_activity") ?? 0)}</strong><small>Public metadata and sampled activity</small></article>
        <article><span>Website changes</span><strong>${byKind.get("website_change") ?? 0}</strong><small>Reviewed bounded evidence</small></article>
        <article><span>Open limitations</span><strong>${limitations.length}</strong><small>Visible uncertainty</small></article></section>
      <section class="panel"><div class="section-heading"><div><p class="eyebrow">Evidence map</p><h3>Reviewed evidence by type</h3></div></div>
        <div class="cards">${reviewed.length ? reviewed.map((signal) => this.signalCard(signal, true)).join("") : `<div class="state empty"><strong>No reviewed market evidence.</strong><span>Accept a signal with named review before using it in this summary.</span></div>`}</div></section>
      <section class="panel"><h3>Limitations and uncertainty</h3><ul class="limitations">${limitations.length ? limitations.map((item) => `<li>${escapeHtml(item)}</li>`).join("") : "<li>No reviewed evidence is available to assess limitations.</li>"}</ul></section>`;
  }

  private sourceHealth(health: readonly SourceHealth[]): string {
    return `<section class="panel" aria-labelledby="health-heading"><div class="section-heading"><div><p class="eyebrow">Source health</p><h3 id="health-heading">Latest Signals collection state</h3></div></div>
      <div class="health-grid">${health.length ? health.map((item) => `<article><div class="record-top"><strong>${escapeHtml(item.sourceId)}</strong>${pill(item.status)}</div><small>Checked ${humanDate(item.checkedAt)}</small>${item.detail ? `<p>${escapeHtml(item.detail)}</p>` : ""}</article>`).join("") : `<div class="state empty"><strong>No source checks yet.</strong><span>Source health appears after the first collection or import attempt.</span></div>`}</div></section>`;
  }

  private signalCard(signal: SignalRecord, readonly = false): string {
    const reviewed = signal.evidenceState === "reviewed";
    return `<article class="record signal-card">
      <div class="record-top"><h4>${escapeHtml(signal.title)}</h4><div>${pill(signal.kind)} ${pill(signal.status)} ${pill(signal.evidenceState)}</div></div>
      <p>${escapeHtml(signal.summary)}</p>
      <dl><div><dt>Source</dt><dd>${escapeHtml(signal.provenance.provider)} · ${escapeHtml(signal.sourceId)}</dd></div><div><dt>Retrieved</dt><dd>${humanDate(signal.provenance.retrievedAt)}</dd></div><div><dt>Freshness review</dt><dd>${humanDate(signal.freshnessReviewAt)}</dd></div><div><dt>Confidence</dt><dd>${escapeHtml(signal.confidence)}</dd></div></dl>
      <details><summary>Evidence drawer</summary><p><strong>Provenance:</strong> ${escapeHtml(signal.provenance.sourceUrl ?? "No validated source URL")}</p><p><strong>Limitations:</strong> ${escapeHtml(signal.limitations.join(" · "))}</p><p><strong>Facts:</strong> ${escapeHtml(JSON.stringify(signal.facts))}</p><p><strong>Relationships:</strong> ${escapeHtml(signal.relationships.map((item) => `${item.kind}: ${item.label}`).join(" · ") || "None")}</p></details>
      ${signal.tags.length ? `<p class="tag-list">${signal.tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join("")}</p>` : ""}
      ${!readonly ? `<div class="actions">${signal.evidenceState === "suggested" ? `<button type="button" data-signal-action="accept" data-id="${escapeHtml(signal.id)}">Accept with named review</button><button type="button" data-signal-action="dismiss" data-id="${escapeHtml(signal.id)}">Dismiss</button>` : ""}<button type="button" data-signal-action="save" data-id="${escapeHtml(signal.id)}">Save</button><button type="button" data-signal-action="tag" data-id="${escapeHtml(signal.id)}">Tag</button><button type="button" data-signal-action="assign" data-id="${escapeHtml(signal.id)}">Assign</button></div>
      <details><summary>Connect evidence</summary><form data-form="signals-connect"><input type="hidden" name="signalId" value="${escapeHtml(signal.id)}"><div class="three"><label>Relationship<select name="relationshipKind"><option value="product">Product</option><option value="icp_hypothesis">ICP hypothesis</option><option value="topic">Topic</option><option value="repository">Repository</option><option value="opportunity">Opportunity</option></select></label><label>Target identifier<input name="targetId" required></label><label>Label<input name="label" required></label></div><button type="submit">Connect signal</button></form></details>
      ${reviewed ? `<details><summary>Convert to proposed work</summary><form data-form="signals-convert"><input type="hidden" name="signalId" value="${escapeHtml(signal.id)}"><label>Work type<select name="kind"><option value="product_action">Product action</option><option value="icp_validation_action">ICP validation action</option><option value="campaign_brief">Campaign brief</option><option value="content_brief">Content brief</option><option value="repository_growth_action">Repository growth action</option><option value="website_watch_action">Website response action</option><option value="product_feedback">Product feedback</option></select></label><label>Title<input name="title" required value="Review: ${escapeHtml(signal.title)}"></label><label>Named owner<input name="owner" required value="${escapeHtml(signal.owner ?? this.defaultOwner)}"></label><button type="submit">Create proposed work</button></form></details>` : ""}` : ""}
    </article>`;
  }

  private requiredSignal(signalId: string): SignalRecord {
    const signal = this.inbox?.signals.find((item) => item.id === signalId);
    if (!signal) throw new Error("Signal not found");
    return signal;
  }

  private requiredObservation(observationId: string): WebsiteChangeObservation {
    const observation = this.website?.observations.find((item) => item.id === observationId);
    if (!observation) throw new Error("Website Watch observation not found");
    return observation;
  }
}

async function importPayload(form: FormData): Promise<string> {
  const pasted = String(form.get("payload") ?? "").trim();
  if (pasted) return pasted;
  const file = form.get("payloadFile");
  if (!(file instanceof File) || file.size === 0) throw new Error("Paste a Webdog payload or choose a JSON file");
  if (file.size > 524_288) throw new Error("Webdog import file is limited to 512 KiB");
  return await file.text();
}

function websiteObservationId(signal: SignalRecord): string {
  const value = signal.facts.websiteWatchObservationId;
  if (typeof value !== "string" || !value) throw new Error("Website-change signal is missing its Website Watch observation reference");
  return value;
}
