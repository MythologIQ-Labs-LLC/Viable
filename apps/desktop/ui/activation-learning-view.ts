import type {
  ActivationLearningWorkspace,
  ActivationSourceKind,
  AttributionModel,
  CalendarEntry,
  ConfidenceEffect,
  DestinationChannel,
  MetricEvidenceState,
  RetrospectiveDecision,
} from "../../../src/activation-learning/domain/activation-learning.js";
import { ActivationLearningService } from "../../../src/activation-learning/services/activation-learning-service.js";
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
const cleanLines = (value: FormDataEntryValue | null): string[] => String(value ?? "").split("\n").map((item) => item.trim()).filter(Boolean);
const label = (value: string): string => value.replaceAll("_", " ");
const tone = (value: string): string =>
  ["scheduled", "delivered", "complete", "manual_export_ready", "downloaded", "observed", "verified_zero"].includes(value) ? "implemented"
    : ["draft", "in_review", "ready_for_manual_activation", "partial", "delayed", "interrupted", "outcome_unknown", "not_collected"].includes(value) ? "warning"
      : ["rejected", "failed", "cancelled", "approval_invalidated", "unavailable"].includes(value) ? "error" : "neutral";
const pill = (value: string): string => `<span class="pill ${tone(value)}">${escapeHtml(label(value))}</span>`;
const humanDate = (value?: string): string => value ? new Date(value).toLocaleString() : "Not recorded";
const toIso = (value: FormDataEntryValue | null, name: string): string => {
  const date = new Date(String(value ?? ""));
  if (!Number.isFinite(date.getTime())) throw new Error(`${name} must be a valid date and time`);
  return date.toISOString();
};

type SourceOption = Readonly<{
  kind: ActivationSourceKind;
  id: string;
  channel: DestinationChannel;
  title: string;
  detail: string;
}>;

export class ActivationLearningViewController {
  private readonly activationStore = new LocalStorageActivationLearningStore();
  private readonly productStore = new LocalStorageProductWorkspaceStore();
  private readonly campaignStore = new LocalStorageCampaignWorkspaceStore();
  private readonly repositoryStore = new LocalStorageRepositoryGrowthStore();
  private readonly videoStore = new LocalStorageVideoProductionStore();
  private readonly service = new ActivationLearningService(
    this.activationStore,
    this.productStore,
    this.campaignStore,
    this.repositoryStore,
    this.videoStore,
  );
  private activation?: ActivationLearningWorkspace;
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
    this.activation = activation;
    this.campaigns = campaigns;
    this.repositories = repositories;
    this.videos = videos;
  }

  render(page: "calendar" | "analytics"): string {
    if (!this.activation) return `<section class="state loading" role="status"><strong>Loading Calendar and learning workspace</strong><span>Reading local schedules, outcomes, and evidence.</span></section>`;
    return page === "calendar" ? this.renderCalendar() : this.renderAnalytics();
  }

  async submit(formElement: HTMLFormElement): Promise<string | undefined> {
    const form = new FormData(formElement);
    const kind = formElement.dataset.form;
    delete this.failure;
    try {
      if (kind === "activation-destination") {
        this.activation = await this.service.createDestination(this.workspaceId, {
          label: String(form.get("label")),
          channel: String(form.get("channel")) as DestinationChannel,
          accountReference: String(form.get("accountReference")),
          accountOwner: String(form.get("accountOwner")),
          ownershipConfirmed: form.get("ownershipConfirmed") === "on",
          capabilityNotes: cleanLines(form.get("capabilityNotes")),
          rateLimitNotes: String(form.get("rateLimitNotes")),
          retryPolicy: String(form.get("retryPolicy")),
          dataHandlingNotes: String(form.get("dataHandlingNotes")),
        });
        return "Manual destination recorded without credentials";
      }
      if (kind === "activation-planning-entry") {
        const endsAt = String(form.get("endsAt")).trim();
        const relatedRecordId = String(form.get("relatedRecordId")).trim();
        this.activation = await this.service.createPlanningEntry(this.workspaceId, {
          kind: String(form.get("kind")) as "approval_deadline" | "event_opportunity" | "experiment" | "follow_up",
          title: String(form.get("title")),
          owner: String(form.get("owner")),
          startsAt: toIso(form.get("startsAt"), "Planning start"),
          ...(endsAt ? { endsAt: toIso(endsAt, "Planning end") } : {}),
          timezone: String(form.get("timezone")),
          notes: String(form.get("notes")),
          ...(relatedRecordId ? { relatedRecordId } : {}),
        });
        return "Calendar planning entry scheduled without external-action authority";
      }
      if (kind === "activation-external-entry") {
        const [sourceKind, sourceId] = String(form.get("source")).split("|") as [ActivationSourceKind, string];
        const endsAt = String(form.get("endsAt")).trim();
        this.activation = await this.service.createExternalEntry(this.workspaceId, {
          title: String(form.get("title")),
          owner: String(form.get("owner")),
          startsAt: toIso(form.get("startsAt"), "External-action start"),
          ...(endsAt ? { endsAt: toIso(endsAt, "External-action end") } : {}),
          timezone: String(form.get("timezone")),
          notes: String(form.get("notes")),
          destinationId: String(form.get("destinationId")),
          sourceKind,
          sourceId,
        });
        return "External action created as a draft with source authority snapshot";
      }
      if (kind === "activation-delivery-outcome") {
        const optional = (name: string): string => String(form.get(name)).trim();
        this.activation = await this.service.recordDeliveryOutcome(this.workspaceId, {
          calendarEntryId: String(form.get("calendarEntryId")),
          packageId: String(form.get("packageId")),
          status: String(form.get("status")) as "delivered" | "failed" | "cancelled" | "unknown",
          evidenceClassification: String(form.get("evidenceClassification")) as "human_recorded" | "provider_evidence" | "provider_verified",
          source: String(form.get("source")),
          observedAt: toIso(form.get("observedAt"), "Outcome observation"),
          recordedBy: String(form.get("recordedBy")),
          evidenceReferences: cleanLines(form.get("evidenceReferences")),
          note: String(form.get("note")),
          ...(optional("deliveryUrl") ? { deliveryUrl: optional("deliveryUrl") } : {}),
          ...(optional("publicationId") ? { publicationId: optional("publicationId") } : {}),
          ...(optional("providerResponseId") ? { providerResponseId: optional("providerResponseId") } : {}),
          ...(optional("failureClass") ? { failureClass: optional("failureClass") } : {}),
          ...(optional("failureDetail") ? { failureDetail: optional("failureDetail") } : {}),
        });
        return "Delivery or failure evidence recorded with explicit classification";
      }
      if (kind === "activation-measurement-plan") {
        const state = String(form.get("state")) as MetricEvidenceState;
        const value = metricValue(state, form.get("value"));
        this.activation = await this.service.createMeasurementPlan(this.workspaceId, {
          calendarEntryId: String(form.get("calendarEntryId")),
          observationStartsAt: toIso(form.get("observationStartsAt"), "Observation start"),
          observationEndsAt: toIso(form.get("observationEndsAt"), "Observation end"),
          baseline: [{
            metric: String(form.get("metric")),
            state,
            ...(value !== undefined ? { value } : {}),
            ...(String(form.get("unit")).trim() ? { unit: String(form.get("unit")).trim() } : {}),
            windowStartsAt: toIso(form.get("baselineStartsAt"), "Baseline start"),
            windowEndsAt: toIso(form.get("baselineEndsAt"), "Baseline end"),
            capturedAt: toIso(form.get("capturedAt"), "Baseline capture"),
            source: String(form.get("source")),
            evidenceReference: String(form.get("evidenceReference")),
            ...(String(form.get("limitation")).trim() ? { limitation: String(form.get("limitation")).trim() } : {}),
          }],
          createdBy: String(form.get("createdBy")),
        });
        return "Measurement plan and baseline recorded before outcome review";
      }
      if (kind === "activation-performance-import") {
        const state = String(form.get("state")) as MetricEvidenceState;
        const value = metricValue(state, form.get("value"));
        this.activation = await this.service.importPerformance(this.workspaceId, {
          calendarEntryId: String(form.get("calendarEntryId")),
          status: String(form.get("status")) as "complete" | "partial" | "delayed" | "unavailable" | "failed",
          source: String(form.get("source")),
          sourceClassification: String(form.get("sourceClassification")) as "human_recorded" | "provider_export" | "provider_api",
          observations: [{
            metric: String(form.get("metric")),
            state,
            ...(value !== undefined ? { value } : {}),
            ...(String(form.get("unit")).trim() ? { unit: String(form.get("unit")).trim() } : {}),
            windowStartsAt: toIso(form.get("windowStartsAt"), "Metric window start"),
            windowEndsAt: toIso(form.get("windowEndsAt"), "Metric window end"),
            capturedAt: toIso(form.get("capturedAt"), "Metric capture"),
            source: String(form.get("source")),
            evidenceReference: String(form.get("evidenceReference")),
            ...(String(form.get("limitation")).trim() ? { limitation: String(form.get("limitation")).trim() } : {}),
          }],
          importedBy: String(form.get("importedBy")),
          notes: String(form.get("notes")),
        });
        return "Performance evidence imported without converting missing data into zero";
      }
      if (kind === "activation-retrospective") {
        this.activation = await this.service.completeRetrospective(this.workspaceId, {
          calendarEntryId: String(form.get("calendarEntryId")),
          completedBy: String(form.get("completedBy")),
          summary: String(form.get("summary")),
          learnings: cleanLines(form.get("learnings")),
          decision: String(form.get("decision")) as RetrospectiveDecision,
          attributionModel: String(form.get("attributionModel")) as AttributionModel,
          attributionUncertainty: String(form.get("attributionUncertainty")),
          evidenceReferences: cleanLines(form.get("evidenceReferences")),
          reversibleNextAction: String(form.get("reversibleNextAction")),
          icpConfidenceEffect: String(form.get("icpConfidenceEffect")) as ConfidenceEffect,
          icpConfidenceRationale: String(form.get("icpConfidenceRationale")),
          positioningEffect: String(form.get("positioningEffect")),
          learningChange: String(form.get("learningChange")),
          learningOutcome: String(form.get("learningOutcome")),
          learningFollowUp: String(form.get("learningFollowUp")),
        });
        return "Retrospective completed and learning-ledger entry created";
      }
      return undefined;
    } catch (error) {
      this.failure = error instanceof Error ? error.message : "Unknown Calendar or Analytics error";
      throw error;
    }
  }

  async click(button: HTMLButtonElement): Promise<string | undefined> {
    const action = button.dataset.activationAction;
    const id = button.dataset.id;
    delete this.failure;
    try {
      if (action === "recover-workspace") { await this.load(); return "Saved Calendar and Analytics workspace restored"; }
      if (action === "recheck-authority") { this.activation = await this.service.detectAuthorityImpact(this.workspaceId); return "Scheduled source and destination authority rechecked"; }
      if (action === "submit-entry" && id) { this.activation = await this.service.submitExternalEntry(this.workspaceId, id); return "External action submitted for named destination-bound review"; }
      if (action === "review-entry" && id) return this.reviewEntry(id, button.dataset.decision);
      if (action === "cancel-entry" && id) {
        const owner = prompt("Named cancellation owner");
        const note = owner ? prompt("Cancellation reason") : null;
        if (!owner || !note) return undefined;
        this.activation = await this.service.cancelCalendarEntry(this.workspaceId, id, owner, note);
        return "Calendar entry cancelled without claiming delivery";
      }
      if (action === "toggle-destination" && id) {
        const current = this.activation?.destinations.find((item) => item.id === id);
        if (!current) throw new Error("Destination not found");
        this.activation = await this.service.setDestinationStatus(this.workspaceId, id, current.status === "active" ? "disabled" : "active");
        return `Destination ${current.status === "active" ? "disabled" : "activated"}`;
      }
      if (action === "create-package" && id) {
        this.activation = await this.service.createManualPackage(this.workspaceId, id, this.defaultOwner);
        return "Credential-free manual activation package created";
      }
      if (action === "download-package" && id) {
        const record = this.activation?.packages.find((item) => item.id === id);
        const operation = this.activation?.exportOperations.find((item) => item.packageId === id);
        if (!record || !operation) throw new Error("Manual activation package or export operation not found");
        downloadJson(`viable-manual-activation-${record.id}.json`, record.manifest);
        this.activation = await this.service.markExportDownloaded(this.workspaceId, operation.id);
        return "Manual activation package downloaded; delivery remains unproven";
      }
      if (action === "interrupt-export" && id) {
        const detail = prompt("What interrupted the export?");
        if (!detail) return undefined;
        this.activation = await this.service.markExportInterrupted(this.workspaceId, id, detail);
        return "Export interruption recorded without changing delivery state";
      }
      if (action === "recover-export" && id) {
        this.activation = await this.service.recoverExport(this.workspaceId, id);
        return "Interrupted export restored to ready-for-download state";
      }
      return undefined;
    } catch (error) {
      this.failure = error instanceof Error ? error.message : "Unknown Calendar or Analytics error";
      throw error;
    }
  }

  private renderCalendar(): string {
    const workspace = this.activation!;
    const sources = this.sourceOptions();
    const activeDestinations = workspace.destinations.filter((item) => item.status === "active");
    return `<section class="activation-workspace" aria-labelledby="calendar-heading">
      <header class="hero compact"><div><p class="eyebrow">Calendar · Manual activation</p><h2 id="calendar-heading">Timing intent, approval, and delivery evidence remain separate.</h2><p>Schedule approved work, export it manually, and record what actually happened.</p></div>${pill("local manual loop")}</header>
      ${this.failureState()}
      <section class="state offline"><strong>No publishing API is connected.</strong><span>Calendar and export remain useful locally. Credentials never enter destination records or packages.</span></section>
      <section class="metrics" aria-label="Calendar status">
        <article><span>Destinations</span><strong>${workspace.destinations.length}</strong><small>${activeDestinations.length} active</small></article>
        <article><span>Calendar entries</span><strong>${workspace.calendarEntries.length}</strong><small>${workspace.calendarEntries.filter((item) => item.scheduleStatus === "scheduled").length} scheduled</small></article>
        <article><span>Ready packages</span><strong>${workspace.packages.filter((item) => item.status === "manual_export_ready").length}</strong><small>Not delivery evidence</small></article>
        <article><span>Recorded outcomes</span><strong>${workspace.deliveryOutcomes.length}</strong><small>Evidence classified</small></article>
      </section>
      ${this.destinationSection()}
      ${this.planningSection()}
      ${activeDestinations.length && sources.length ? this.externalActionBuilder(activeDestinations, sources) : `<section class="state warning"><strong>External scheduling is blocked.</strong><span>Create an active destination and approve a Campaign, Repository Launch, or Video source first.</span></section>`}
      ${this.calendarEntriesSection()}
      ${this.packagesSection()}
      ${this.deliverySection()}
    </section>`;
  }

  private renderAnalytics(): string {
    const workspace = this.activation!;
    return `<section class="activation-workspace analytics-workspace" aria-labelledby="analytics-heading">
      <header class="hero compact"><div><p class="eyebrow">Analytics · Learning</p><h2 id="analytics-heading">Missing evidence stays missing. Learning stays traceable.</h2><p>Record a baseline, import bounded performance evidence, compare compatible states, and choose one reversible next action.</p></div>${pill("manual attribution")}</header>
      ${this.failureState()}
      <section class="state offline"><strong>Manual evidence is supported.</strong><span>Provider access is optional. Attribution always names its model and uncertainty.</span></section>
      <section class="metrics" aria-label="Analytics status">
        <article><span>Measurement plans</span><strong>${workspace.measurementPlans.length}</strong><small>Pre-recorded baselines</small></article>
        <article><span>Performance imports</span><strong>${workspace.performanceImports.length}</strong><small>Explicit evidence states</small></article>
        <article><span>Retrospectives</span><strong>${workspace.retrospectives.length}</strong><small>Decision and uncertainty</small></article>
        <article><span>Learning entries</span><strong>${workspace.learningLedger.length}</strong><small>Reversible next actions</small></article>
      </section>
      ${this.measurementPlanSection()}
      ${this.performanceImportSection()}
      ${this.retrospectiveSection()}
      ${this.learningLedgerSection()}
    </section>`;
  }

  private failureState(): string {
    return this.failure ? `<section class="state error" role="alert"><div><strong>The operation was not saved.</strong><p>${escapeHtml(this.failure)}</p></div><button type="button" data-activation-action="recover-workspace">Return to saved Calendar and Analytics state</button></section>` : "";
  }

  private destinationSection(): string {
    const destinations = this.activation!.destinations;
    return `<section class="panel" aria-labelledby="destination-heading"><div class="section-heading"><div><p class="eyebrow">Destination registry</p><h3 id="destination-heading">Record non-secret account and ownership context</h3></div>${pill(`${destinations.length} records`)}</div>
      <form data-form="activation-destination">
        <div class="three"><label>Destination label<input name="label" required></label><label>Channel<select name="channel">${channelOptions()}</select></label><label>Account owner<input name="accountOwner" required value="${escapeHtml(this.defaultOwner)}"></label></div>
        <label>Non-secret account reference<input name="accountReference" required placeholder="company-page:example or repo:owner/name"></label>
        <div class="two"><label>Capability notes<textarea name="capabilityNotes" rows="3" required>Manual copy or upload only</textarea></label><label>Rate-limit notes<textarea name="rateLimitNotes" rows="3">Follow current platform limits and review requirements</textarea></label></div>
        <div class="two"><label>Manual retry policy<textarea name="retryPolicy" rows="3" required>Review the failure evidence before retrying once</textarea></label><label>Data-handling notes<textarea name="dataHandlingNotes" rows="3" required>No credentials or provider session data stored in Viable</textarea></label></div>
        <label class="choice"><input type="checkbox" name="ownershipConfirmed" required>I confirm this workspace is authorized to use the named destination.</label>
        <button class="primary" type="submit">Add manual destination</button>
      </form>
      <div class="card-list">${destinations.length ? destinations.map((item) => `<article><div class="card-heading"><div><h4>${escapeHtml(item.label)}</h4><p>${escapeHtml(item.channel)} · ${escapeHtml(item.accountReference)}</p></div>${pill(item.status)}</div><p>Owner: ${escapeHtml(item.accountOwner)}. Mode: manual only.</p><small>${escapeHtml(item.dataHandlingNotes)}</small><div class="actions"><button type="button" data-activation-action="toggle-destination" data-id="${item.id}">${item.status === "active" ? "Disable" : "Enable"} destination</button></div></article>`).join("") : `<div class="state empty"><strong>No destinations yet.</strong><span>Add a non-secret destination record before scheduling external action.</span></div>`}</div>
    </section>`;
  }

  private planningSection(): string {
    return `<section class="panel" aria-labelledby="planning-heading"><div class="section-heading"><div><p class="eyebrow">Unified calendar</p><h3 id="planning-heading">Schedule internal deadlines, opportunities, experiments, and follow-ups</h3></div>${pill("no external authority")}</div>
      <form data-form="activation-planning-entry">
        <div class="three"><label>Entry type<select name="kind"><option value="approval_deadline">Approval deadline</option><option value="event_opportunity">Event opportunity</option><option value="experiment">Experiment</option><option value="follow_up">Follow-up</option></select></label><label>Title<input name="title" required></label><label>Owner<input name="owner" required value="${escapeHtml(this.defaultOwner)}"></label></div>
        <div class="three"><label>Starts<input type="datetime-local" name="startsAt" required></label><label>Ends, optional<input type="datetime-local" name="endsAt"></label><label>Timezone<input name="timezone" required value="America/New_York"></label></div>
        <label>Related record, optional<input name="relatedRecordId" placeholder="Signal, experiment, campaign, or follow-up reference"></label>
        <label>Notes<textarea name="notes" rows="3"></textarea></label><button type="submit">Add planning entry</button>
      </form>
    </section>`;
  }

  private externalActionBuilder(destinations: ActivationLearningWorkspace["destinations"], sources: readonly SourceOption[]): string {
    return `<section class="panel" aria-labelledby="external-action-heading"><div class="section-heading"><div><p class="eyebrow">External action</p><h3 id="external-action-heading">Bind approved work to a destination and time</h3></div>${pill("draft first")}</div>
      <form data-form="activation-external-entry">
        <div class="two"><label>Active destination<select name="destinationId" required>${destinations.map((item) => `<option value="${item.id}" data-channel="${item.channel}">${escapeHtml(item.label)} · ${escapeHtml(label(item.channel))}</option>`).join("")}</select></label><label>Approved source<select name="source" required>${sources.map((item) => `<option value="${item.kind}|${item.id}" data-channel="${item.channel}">${escapeHtml(item.title)} · ${escapeHtml(item.detail)}</option>`).join("")}</select></label></div>
        <div class="two"><label>Calendar title<input name="title" required></label><label>Named owner<input name="owner" required value="${escapeHtml(this.defaultOwner)}"></label></div>
        <div class="three"><label>Starts<input type="datetime-local" name="startsAt" required></label><label>Ends, optional<input type="datetime-local" name="endsAt"></label><label>Timezone<input name="timezone" required value="America/New_York"></label></div>
        <label>Activation notes<textarea name="notes" rows="3" required>Manual activation. Record delivery URL, publication identifier, or explicit failure evidence afterward.</textarea></label>
        <button class="primary" type="submit">Create draft external action</button>
      </form>
    </section>`;
  }

  private calendarEntriesSection(): string {
    const entries = this.activation!.calendarEntries;
    return `<section class="panel" aria-labelledby="calendar-records-heading"><div class="section-heading"><div><p class="eyebrow">Calendar records</p><h3 id="calendar-records-heading">Schedule and activation states</h3></div><button type="button" data-activation-action="recheck-authority">Recheck source and destination authority</button></div>
      <div class="calendar-list">${entries.length ? entries.slice().sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt)).map((entry) => this.calendarCard(entry)).join("") : `<div class="state empty"><strong>Calendar is empty.</strong><span>Add a planning entry or draft an approved external action.</span></div>`}</div>
    </section>`;
  }

  private calendarCard(entry: CalendarEntry): string {
    const packageRecord = this.activation!.packages.find((item) => item.calendarEntryId === entry.id && item.status === "manual_export_ready");
    const actions: string[] = [];
    if (entry.kind === "external_activation") {
      if (["draft", "changes_requested", "approval_invalidated"].includes(entry.scheduleStatus)) actions.push(`<button type="button" data-activation-action="submit-entry" data-id="${entry.id}">Submit for destination review</button>`);
      if (entry.scheduleStatus === "in_review") {
        actions.push(`<button type="button" data-activation-action="review-entry" data-id="${entry.id}" data-decision="approved">Approve and schedule</button>`);
        actions.push(`<button type="button" data-activation-action="review-entry" data-id="${entry.id}" data-decision="changes_requested">Request changes</button>`);
        actions.push(`<button type="button" data-activation-action="review-entry" data-id="${entry.id}" data-decision="rejected">Reject</button>`);
      }
      if (entry.scheduleStatus === "scheduled" && !packageRecord) actions.push(`<button class="primary" type="button" data-activation-action="create-package" data-id="${entry.id}">Create manual activation package</button>`);
      if (!['cancelled'].includes(entry.scheduleStatus) && entry.activationStatus !== "delivered") actions.push(`<button type="button" data-activation-action="cancel-entry" data-id="${entry.id}">Cancel</button>`);
    }
    return `<article class="calendar-card"><div class="card-heading"><div><h4>${escapeHtml(entry.title)}</h4><p>${humanDate(entry.startsAt)} · ${escapeHtml(entry.timezone)}</p></div><div class="status-stack">${pill(entry.scheduleStatus)}${pill(entry.activationStatus)}</div></div>
      <p>${escapeHtml(entry.notes || "No notes")}</p>
      <div class="calendar-meta"><span><strong>Kind</strong>${escapeHtml(label(entry.kind))}</span><span><strong>Owner</strong>${escapeHtml(entry.owner)}</span><span><strong>Source</strong>${entry.source ? escapeHtml(`${label(entry.source.kind)} · ${entry.source.title}`) : "Internal planning"}</span><span><strong>Review</strong>${entry.reviewedBy ? escapeHtml(`${entry.reviewedBy} · ${humanDate(entry.reviewedAt)}`) : "Not required or not reviewed"}</span></div>
      ${actions.length ? `<div class="actions">${actions.join("")}</div>` : ""}</article>`;
  }

  private packagesSection(): string {
    const workspace = this.activation!;
    return `<section class="panel" aria-labelledby="activation-packages-heading"><div class="section-heading"><div><p class="eyebrow">Manual activation packages</p><h3 id="activation-packages-heading">Export without claiming delivery</h3></div>${pill(`${workspace.packages.length} packages`)}</div>
      <div class="card-list">${workspace.packages.length ? workspace.packages.slice().reverse().map((record) => {
        const operation = workspace.exportOperations.find((item) => item.packageId === record.id);
        return `<article><div class="card-heading"><div><h4>${escapeHtml(record.idempotencyKey)}</h4><p>Created ${humanDate(record.createdAt)} by ${escapeHtml(record.createdBy)}</p></div>${pill(record.status)}</div><p>No credentials. No direct publishing. No delivery claim.</p>${operation ? `<small>Export state: ${escapeHtml(label(operation.status))}. Attempts: ${operation.attempts}.${operation.interruptionDetail ? ` ${escapeHtml(operation.interruptionDetail)}` : ""}</small><div class="actions">${operation.status === "ready_for_download" && record.status === "manual_export_ready" ? `<button class="primary" type="button" data-activation-action="download-package" data-id="${record.id}">Download package and record handoff</button><button type="button" data-activation-action="interrupt-export" data-id="${operation.id}">Record interruption</button>` : ""}${operation.status === "interrupted" ? `<button type="button" data-activation-action="recover-export" data-id="${operation.id}">Recover export</button>` : ""}</div>` : ""}</article>`;
      }).join("") : `<div class="state empty"><strong>No activation package exists.</strong><span>Approve and schedule an external action first.</span></div>`}</div>
    </section>`;
  }

  private deliverySection(): string {
    const workspace = this.activation!;
    const eligible = workspace.packages.filter((record) => workspace.exportOperations.some((item) => item.packageId === record.id && item.status === "downloaded"));
    return `<section class="panel" aria-labelledby="delivery-heading"><div class="section-heading"><div><p class="eyebrow">Delivery evidence</p><h3 id="delivery-heading">Record publication, failure, cancellation, or unknown outcome</h3></div>${pill(`${workspace.deliveryOutcomes.length} outcomes`)}</div>
      ${eligible.length ? `<form data-form="activation-delivery-outcome"><div class="two"><label>Completed export<select name="packageId" required>${eligible.map((record) => `<option value="${record.id}" data-entry-id="${record.calendarEntryId}">${escapeHtml(record.idempotencyKey)}</option>`).join("")}</select></label><label>Calendar entry<input name="calendarEntryId" readonly required value="${eligible[0]?.calendarEntryId ?? ""}"></label></div>
        <div class="three"><label>Outcome<select name="status"><option value="delivered">Delivered</option><option value="failed">Failed</option><option value="cancelled">Cancelled</option><option value="unknown">Unknown</option></select></label><label>Evidence classification<select name="evidenceClassification"><option value="human_recorded">Human recorded</option><option value="provider_evidence">Provider evidence</option><option value="provider_verified">Provider verified</option></select></label><label>Observed at<input type="datetime-local" name="observedAt" required></label></div>
        <div class="two"><label>Evidence source<input name="source" required placeholder="Operator observation or provider export"></label><label>Recorded by<input name="recordedBy" required value="${escapeHtml(this.defaultOwner)}"></label></div>
        <label>Evidence references, one per line<textarea name="evidenceReferences" rows="3" required placeholder="Screenshot file reference\nProvider export reference"></textarea></label>
        <div class="three"><label>Delivery URL<input name="deliveryUrl" type="url"></label><label>Publication ID<input name="publicationId"></label><label>Provider response ID<input name="providerResponseId"></label></div>
        <div class="two"><label>Failure class<input name="failureClass"></label><label>Failure detail<input name="failureDetail"></label></div>
        <label>Outcome note<textarea name="note" rows="3" required></textarea></label><button class="primary" type="submit">Record evidence-backed outcome</button></form>` : `<section class="state warning"><strong>No completed export handoff is eligible.</strong><span>Download a manual activation package before recording delivery or failure evidence.</span></section>`}
      <div class="card-list">${workspace.deliveryOutcomes.slice().reverse().map((item) => `<article><div class="card-heading"><div><h4>${escapeHtml(label(item.status))}</h4><p>${humanDate(item.observedAt)} · ${escapeHtml(item.source)}</p></div>${pill(item.evidenceClassification)}</div><p>${escapeHtml(item.note)}</p><small>${item.deliveryUrl ? escapeHtml(item.deliveryUrl) : item.failureDetail ? escapeHtml(item.failureDetail) : "No public URL recorded"}</small></article>`).join("")}</div>
    </section>`;
  }

  private measurementPlanSection(): string {
    const workspace = this.activation!;
    const eligible = workspace.calendarEntries.filter((entry) => !workspace.measurementPlans.some((plan) => plan.calendarEntryId === entry.id));
    return `<section class="panel" aria-labelledby="measurement-plan-heading"><div class="section-heading"><div><p class="eyebrow">Baseline</p><h3 id="measurement-plan-heading">Record what was true before the outcome window</h3></div>${pill(`${workspace.measurementPlans.length} plans`)}</div>
      ${eligible.length ? `<form data-form="activation-measurement-plan"><label>Calendar entry<select name="calendarEntryId">${eligible.map((entry) => `<option value="${entry.id}">${escapeHtml(entry.title)}</option>`).join("")}</select></label>
        <div class="three"><label>Observation starts<input type="datetime-local" name="observationStartsAt" required></label><label>Observation ends<input type="datetime-local" name="observationEndsAt" required></label><label>Plan owner<input name="createdBy" required value="${escapeHtml(this.defaultOwner)}"></label></div>
        ${metricFields("Baseline")}
        <div class="three"><label>Baseline window starts<input type="datetime-local" name="baselineStartsAt" required></label><label>Baseline window ends<input type="datetime-local" name="baselineEndsAt" required></label><label>Captured at<input type="datetime-local" name="capturedAt" required></label></div>
        <button class="primary" type="submit">Record baseline and observation window</button></form>` : `<section class="state empty"><strong>Every current calendar entry has a measurement plan.</strong><span>Add another calendar entry to create a new baseline.</span></section>`}
      <div class="card-list">${workspace.measurementPlans.map((plan) => `<article><div class="card-heading"><div><h4>${escapeHtml(this.entryTitle(plan.calendarEntryId))}</h4><p>${humanDate(plan.observationStartsAt)} to ${humanDate(plan.observationEndsAt)}</p></div>${pill("baseline recorded")}</div>${plan.baseline.map((item) => metricSummary(item)).join("")}</article>`).join("")}</div>
    </section>`;
  }

  private performanceImportSection(): string {
    const workspace = this.activation!;
    return `<section class="panel" aria-labelledby="performance-import-heading"><div class="section-heading"><div><p class="eyebrow">Outcome evidence</p><h3 id="performance-import-heading">Import one explicit metric observation</h3></div>${pill(`${workspace.performanceImports.length} imports`)}</div>
      ${workspace.measurementPlans.length ? `<form data-form="activation-performance-import"><label>Calendar entry<select name="calendarEntryId">${workspace.measurementPlans.map((plan) => `<option value="${plan.calendarEntryId}">${escapeHtml(this.entryTitle(plan.calendarEntryId))}</option>`).join("")}</select></label>
        <div class="three"><label>Import status<select name="status"><option value="complete">Complete</option><option value="partial">Partial</option><option value="delayed">Delayed</option><option value="unavailable">Unavailable</option><option value="failed">Failed</option></select></label><label>Source classification<select name="sourceClassification"><option value="human_recorded">Human recorded</option><option value="provider_export">Provider export</option><option value="provider_api">Provider API</option></select></label><label>Imported by<input name="importedBy" required value="${escapeHtml(this.defaultOwner)}"></label></div>
        ${metricFields("Outcome")}
        <div class="three"><label>Metric window starts<input type="datetime-local" name="windowStartsAt" required></label><label>Metric window ends<input type="datetime-local" name="windowEndsAt" required></label><label>Captured at<input type="datetime-local" name="capturedAt" required></label></div>
        <label>Import notes<textarea name="notes" rows="3" required>State what was available, missing, delayed, partial, or unavailable.</textarea></label><button class="primary" type="submit">Import performance evidence</button></form>` : `<section class="state warning"><strong>Performance import is blocked.</strong><span>Create a measurement plan and baseline first.</span></section>`}
      <div class="card-list">${workspace.performanceImports.slice().reverse().map((record) => `<article><div class="card-heading"><div><h4>${escapeHtml(this.entryTitle(record.calendarEntryId))}</h4><p>${escapeHtml(record.source)} · ${humanDate(record.importedAt)}</p></div>${pill(record.status)}</div><p>${escapeHtml(record.notes)}</p>${record.observations.map(metricSummary).join("")}</article>`).join("")}</div>
    </section>`;
  }

  private retrospectiveSection(): string {
    const workspace = this.activation!;
    const eligible = workspace.measurementPlans.filter((plan) =>
      workspace.performanceImports.some((item) => item.calendarEntryId === plan.calendarEntryId)
      && !workspace.retrospectives.some((item) => item.calendarEntryId === plan.calendarEntryId)
      && (workspace.calendarEntries.find((entry) => entry.id === plan.calendarEntryId)?.kind !== "external_activation"
        || workspace.deliveryOutcomes.some((item) => item.calendarEntryId === plan.calendarEntryId)));
    return `<section class="panel" aria-labelledby="retrospective-heading"><div class="section-heading"><div><p class="eyebrow">Retrospective</p><h3 id="retrospective-heading">Choose what changes because of the evidence</h3></div>${pill(`${workspace.retrospectives.length} completed`)}</div>
      ${eligible.length ? `<form data-form="activation-retrospective"><label>Eligible calendar entry<select name="calendarEntryId">${eligible.map((plan) => `<option value="${plan.calendarEntryId}">${escapeHtml(this.entryTitle(plan.calendarEntryId))}</option>`).join("")}</select></label>
        <div class="three"><label>Decision<select name="decision"><option value="continue">Continue</option><option value="iterate">Iterate</option><option value="stop">Stop</option><option value="inconclusive">Inconclusive</option></select></label><label>Attribution model<select name="attributionModel"><option value="manual">Manual</option><option value="first_touch">First touch</option><option value="last_touch">Last touch</option><option value="influence">Influence</option><option value="unattributed">Unattributed</option></select></label><label>Completed by<input name="completedBy" required value="${escapeHtml(this.defaultOwner)}"></label></div>
        <label>Summary<textarea name="summary" rows="3" required></textarea></label><label>Learnings, one per line<textarea name="learnings" rows="3" required></textarea></label>
        <label>Attribution uncertainty<textarea name="attributionUncertainty" rows="3" required placeholder="What else may have influenced this outcome?"></textarea></label><label>Evidence references, one per line<textarea name="evidenceReferences" rows="3" required></textarea></label>
        <label>One reversible next action<textarea name="reversibleNextAction" rows="2" required></textarea></label>
        <div class="two"><label>ICP-confidence effect<select name="icpConfidenceEffect"><option value="strengthen">Strengthen</option><option value="weaken">Weaken</option><option value="no_change">No change</option><option value="unknown">Unknown</option></select></label><label>ICP-confidence rationale<textarea name="icpConfidenceRationale" rows="2" required></textarea></label></div>
        <label>Positioning effect<textarea name="positioningEffect" rows="2" required></textarea></label>
        <div class="three"><label>Change recorded<textarea name="learningChange" rows="2" required></textarea></label><label>Outcome recorded<textarea name="learningOutcome" rows="2" required></textarea></label><label>Follow-up<textarea name="learningFollowUp" rows="2" required></textarea></label></div>
        <button class="primary" type="submit">Complete retrospective and write learning entry</button></form>` : `<section class="state warning"><strong>No retrospective is ready.</strong><span>Record a baseline, outcome evidence, and a performance import first.</span></section>`}
      <div class="card-list">${workspace.retrospectives.slice().reverse().map((item) => `<article><div class="card-heading"><div><h4>${escapeHtml(this.entryTitle(item.calendarEntryId))}</h4><p>${humanDate(item.completedAt)} by ${escapeHtml(item.completedBy)}</p></div>${pill(item.decision)}</div><p>${escapeHtml(item.summary)}</p><div class="comparison-list">${item.comparisons.map((comparison) => `<div><strong>${escapeHtml(comparison.metric)}</strong><span>${escapeHtml(label(comparison.baselineState))} to ${escapeHtml(label(comparison.outcomeState))}${comparison.delta !== undefined ? ` · delta ${comparison.delta}` : ""}</span><small>${escapeHtml(comparison.limitation ?? "Comparable numeric evidence")}</small></div>`).join("")}</div><small>Attribution: ${escapeHtml(label(item.attributionModel))}. ${escapeHtml(item.attributionUncertainty)}</small><p><strong>Next:</strong> ${escapeHtml(item.reversibleNextAction)}</p></article>`).join("")}</div>
    </section>`;
  }

  private learningLedgerSection(): string {
    const entries = this.activation!.learningLedger;
    return `<section class="panel" aria-labelledby="learning-ledger-heading"><div class="section-heading"><div><p class="eyebrow">Learning ledger</p><h3 id="learning-ledger-heading">Evidence, decision, change, outcome, and follow-up</h3></div>${pill(`${entries.length} entries`)}</div>
      <div class="card-list">${entries.length ? entries.slice().reverse().map((item) => `<article><div class="card-heading"><div><h4>${escapeHtml(item.decision)}</h4><p>${humanDate(item.createdAt)} by ${escapeHtml(item.createdBy)}</p></div>${pill(item.attributionModel)}</div><dl class="learning-grid"><div><dt>Evidence</dt><dd>${item.evidence.map(escapeHtml).join(" · ")}</dd></div><div><dt>Change</dt><dd>${escapeHtml(item.change)}</dd></div><div><dt>Outcome</dt><dd>${escapeHtml(item.outcome)}</dd></div><div><dt>Follow-up</dt><dd>${escapeHtml(item.followUp)}</dd></div></dl><p><strong>Reversible next action:</strong> ${escapeHtml(item.reversibleNextAction)}</p><small>${escapeHtml(item.attributionUncertainty)}</small></article>`).join("") : `<div class="state empty"><strong>The learning ledger is empty.</strong><span>Complete a retrospective to create a traceable entry.</span></div>`}</div>
    </section>`;
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

  private async reviewEntry(id: string, decision?: string): Promise<string | undefined> {
    const reviewer = prompt("Named external-action reviewer");
    const note = reviewer ? prompt("Review note covering source, destination, timing, rights, accessibility, and disclosures") : null;
    if (!reviewer || !note) return undefined;
    this.activation = await this.service.reviewExternalEntry(this.workspaceId, id, reviewer, decision as "approved" | "rejected" | "changes_requested", note);
    return decision === "approved" ? "External action approved and scheduled; delivery remains unproven" : `External action marked ${label(decision ?? "reviewed")}`;
  }

  private entryTitle(id: string): string {
    return this.activation?.calendarEntries.find((item) => item.id === id)?.title ?? id;
  }
}

function channelOptions(): string {
  return ["linkedin", "website", "github_release", "instagram_reels", "youtube_shorts"]
    .map((value) => `<option value="${value}">${escapeHtml(label(value))}</option>`).join("");
}

function metricFields(prefix: string): string {
  return `<div class="three"><label>${prefix} metric<input name="metric" required placeholder="qualified_reviews"></label><label>Evidence state<select name="state"><option value="observed">Observed non-zero</option><option value="verified_zero">Verified zero</option><option value="delayed">Delayed</option><option value="partial">Partial</option><option value="unavailable">Unavailable</option><option value="not_collected">Not collected</option></select></label><label>Numeric value, when allowed<input name="value" type="number" step="any"></label></div>
    <div class="three"><label>Unit<input name="unit" placeholder="count, percent, seconds"></label><label>Evidence source<input name="source" required></label><label>Evidence reference<input name="evidenceReference" required></label></div>
    <label>Limitation, required for incomplete states<textarea name="limitation" rows="2"></textarea></label>`;
}

function metricValue(state: MetricEvidenceState, value: FormDataEntryValue | null): number | undefined {
  if (state === "verified_zero") return 0;
  const text = String(value ?? "").trim();
  if (!text) return undefined;
  const parsed = Number(text);
  if (!Number.isFinite(parsed)) throw new Error("Metric value must be numeric");
  return parsed;
}

function metricSummary(item: Readonly<{ metric: string; state: string; value?: number; unit?: string; source: string; limitation?: string }>): string {
  return `<div class="metric-evidence"><div><strong>${escapeHtml(item.metric)}</strong>${pill(item.state)}</div><span>${item.value !== undefined ? `${item.value} ${escapeHtml(item.unit ?? "")}` : "No numeric value"}</span><small>${escapeHtml(item.source)}${item.limitation ? ` · ${escapeHtml(item.limitation)}` : ""}</small></div>`;
}

function downloadJson(filename: string, content: string): void {
  const blob = new Blob([content], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
