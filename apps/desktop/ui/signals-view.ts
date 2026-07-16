import type { StoredEventIntelligenceRun } from "../../../src/event-intelligence/ports/run-store.js";
import { EventIntelligenceSignalSource } from "../../../src/signals/adapters/event-intelligence-signal-source.js";
import { GitHubPublicRepositorySource } from "../../../src/signals/adapters/github-public-repository-source.js";
import { ManualJsonSignalSource } from "../../../src/signals/adapters/manual-json-signal-source.js";
import type { ConversionKind, SignalRecord, SignalsInbox, SourceHealth } from "../../../src/signals/domain/signal.js";
import { SignalsInboxService } from "../../../src/signals/services/signals-inbox-service.js";
import { LocalStorageSignalsInboxStore } from "./local-storage-signals-inbox-store.js";

const escapeHtml = (value: unknown): string => String(value ?? "")
  .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;").replaceAll("'", "&#039;");
const humanDate = (value?: string): string => value ? new Date(value).toLocaleString() : "Unknown";
const lineValues = (value: FormDataEntryValue | null): string[] =>
  String(value ?? "").split(/[,\n]/).map((item) => item.trim()).filter(Boolean);
const statusTone = (status: string): string =>
  ["success", "accepted", "reviewed", "converted"].includes(status) ? "implemented"
  : ["partial", "rate_limited", "saved", "suggested", "verified_empty"].includes(status) ? "warning"
  : ["transport_failed", "validation_failed", "unavailable", "forbidden", "unauthorized", "cancelled", "dismissed", "rejected"].includes(status) ? "error"
  : "neutral";
const pill = (value: string): string => `<span class="pill ${statusTone(value)}">${escapeHtml(value.replaceAll("_", " "))}</span>`;

export class SignalsViewController {
  private readonly service = new SignalsInboxService(new LocalStorageSignalsInboxStore());
  private inbox?: SignalsInbox;
  private failure: string | undefined;

  constructor(
    readonly workspaceId: string,
    private readonly defaultOwner: string,
  ) {}

  async load(): Promise<void> {
    this.inbox = await this.service.load(this.workspaceId);
  }

  render(page: "signals" | "market"): string {
    if (!this.inbox) return `<section class="state loading" role="status"><strong>Loading Signals Inbox</strong><span>Reading local evidence and source health.</span></section>`;
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
      if (kind === "signals-convert") {
        this.inbox = await this.service.convert(this.workspaceId, String(form.get("signalId")), {
          kind: String(form.get("kind")) as ConversionKind,
          title: String(form.get("title")),
          owner: String(form.get("owner")),
        });
        return "Reviewed signal converted into proposed owned work";
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
        this.inbox = await this.service.review(this.workspaceId, id, reviewer, action === "accept");
        return action === "accept" ? "Signal accepted as reviewed evidence" : "Signal dismissed";
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
        <p>Import events and public repository evidence, inspect source health, and convert only reviewed signals into owned proposed work.</p></div>${pill("local only")}</header>
      ${this.failure ? `<section class="state error" role="alert"><div><strong>Signal operation failed.</strong><p>${escapeHtml(this.failure)}</p></div><button type="button" data-nav="signals">Return to saved inbox</button></section>` : ""}
      <section class="state offline"><strong>Manual paths remain available.</strong><span>Live access is optional. Provider failures do not erase successful local evidence.</span></section>
      ${failures.length ? `<section class="state warning"><div><strong>Partial source health</strong><p>${failures.map((item) => `${escapeHtml(item.sourceId)}: ${escapeHtml(item.status)}`).join(" · ")}</p></div></section>` : ""}
      ${verifiedEmpty.length ? `<section class="state"><strong>Verified empty</strong><span>${verifiedEmpty.map((item) => escapeHtml(item.sourceId)).join(", ")} completed successfully and returned no evidence.</span></section>` : ""}
      ${this.sourceHealth(inbox.sourceHealth)}
      <section class="panel" aria-labelledby="sources-heading">
        <div class="section-heading"><div><p class="eyebrow">Sources</p><h3 id="sources-heading">Collect or import evidence</h3></div>${pill(`${inbox.sources.length} configured`)}</div>
        <div class="source-forms">
          <form data-form="signals-github"><h4>Public GitHub repository</h4><p class="guidance">Uses unauthenticated read-only public API access. Missing metrics remain unavailable, never zero.</p><label>Repository<input name="repository" required placeholder="owner/repository"></label><button type="submit">Collect public evidence</button></form>
          <form data-form="signals-event-import"><h4>Event Intelligence run</h4><p class="guidance">Paste a local sanitized run export. Partial and failed source states are preserved.</p><label>Run JSON<textarea name="payload" required rows="5" placeholder='{"run": {...}, "events": [...]}'></textarea></label><button type="submit">Import event evidence</button></form>
          <form data-form="signals-manual-import"><h4>Manual signal import</h4><p class="guidance">Up to 100 untrusted evidence proposals. Unknown instructions are ignored.</p><label>Signals JSON<textarea name="payload" required rows="5" placeholder='{"signals":[{"title":"...","summary":"..."}]}'></textarea></label><button type="submit">Validate and import</button></form>
        </div>
      </section>
      <section class="panel" aria-labelledby="inbox-heading">
        <div class="section-heading"><div><p class="eyebrow">Inbox</p><h3 id="inbox-heading">Review signals</h3></div>${pill(`${inbox.signals.length} signals`)}</div>
        <p class="guidance">All imported signals begin as suggestions. Acceptance requires a named reviewer and does not revise the canonical ICP.</p>
        <div class="cards signal-cards">${inbox.signals.length ? inbox.signals.slice().reverse().map((signal) => this.signalCard(signal)).join("") : `<div class="state empty"><strong>No signals yet.</strong><span>Configure a source or use a manual import. An empty inbox is not evidence that the market is empty.</span></div>`}</div>
      </section>
      <section class="panel" aria-labelledby="work-heading"><div class="section-heading"><div><p class="eyebrow">Proposed work</p><h3 id="work-heading">Signal conversions</h3></div>${pill(`${inbox.conversions.length} proposals`)}</div>
        <div class="cards">${inbox.conversions.length ? inbox.conversions.map((item) => `<article class="record"><div class="record-top"><h4>${escapeHtml(item.title)}</h4>${pill(item.status)}</div><p>${escapeHtml(item.kind.replaceAll("_", " "))}</p><small>Owner: ${escapeHtml(item.owner)} · Created ${humanDate(item.createdAt)}</small></article>`).join("") : `<div class="state empty"><strong>No conversions yet.</strong><span>Only accepted reviewed signals can become proposed work.</span></div>`}</div>
      </section>`;
  }

  private renderMarket(): string {
    const inbox = this.inbox!;
    const reviewed = inbox.signals.filter((signal) => signal.evidenceState === "reviewed");
    const byKind = new Map<string, number>();
    for (const signal of reviewed) byKind.set(signal.kind, (byKind.get(signal.kind) ?? 0) + 1);
    const limitations = [...new Set(reviewed.flatMap((signal) => signal.limitations))];
    return `
      <header class="hero compact"><div><p class="eyebrow">Market evidence</p><h2>What the evidence says, and what it does not.</h2>
        <p>This view summarizes reviewed signals. It does not calculate ICP truth, qualify leads, or manufacture certainty.</p></div>${pill("evidence only")}</header>
      <section class="metrics"><article><span>Reviewed signals</span><strong>${reviewed.length}</strong><small>Named human review</small></article>
        <article><span>Event evidence</span><strong>${byKind.get("event") ?? 0}</strong><small>Bounded Event Intelligence</small></article>
        <article><span>Repository evidence</span><strong>${(byKind.get("repository") ?? 0) + (byKind.get("repository_activity") ?? 0)}</strong><small>Public metadata and sampled activity</small></article>
        <article><span>Open limitations</span><strong>${limitations.length}</strong><small>Visible uncertainty</small></article></section>
      <section class="panel"><div class="section-heading"><div><p class="eyebrow">Evidence map</p><h3>Reviewed evidence by type</h3></div></div>
        <div class="cards">${reviewed.length ? reviewed.map((signal) => this.signalCard(signal, true)).join("") : `<div class="state empty"><strong>No reviewed market evidence.</strong><span>Accept a signal with named review before using it in this summary.</span></div>`}</div></section>
      <section class="panel"><h3>Limitations and uncertainty</h3><ul class="limitations">${limitations.length ? limitations.map((item) => `<li>${escapeHtml(item)}</li>`).join("") : "<li>No reviewed evidence is available to assess limitations.</li>"}</ul></section>`;
  }

  private sourceHealth(health: readonly SourceHealth[]): string {
    return `<section class="panel" aria-labelledby="health-heading"><div class="section-heading"><div><p class="eyebrow">Source health</p><h3 id="health-heading">Latest collection state</h3></div></div>
      <div class="health-grid">${health.length ? health.map((item) => `<article><div class="record-top"><strong>${escapeHtml(item.sourceId)}</strong>${pill(item.status)}</div><small>Checked ${humanDate(item.checkedAt)}</small>${item.detail ? `<p>${escapeHtml(item.detail)}</p>` : ""}</article>`).join("") : `<div class="state empty"><strong>No source checks yet.</strong><span>Source health appears after the first collection or import attempt.</span></div>`}</div></section>`;
  }

  private signalCard(signal: SignalRecord, readonly = false): string {
    const reviewed = signal.evidenceState === "reviewed";
    return `<article class="record signal-card">
      <div class="record-top"><h4>${escapeHtml(signal.title)}</h4><div>${pill(signal.status)} ${pill(signal.evidenceState)}</div></div>
      <p>${escapeHtml(signal.summary)}</p>
      <dl><div><dt>Source</dt><dd>${escapeHtml(signal.provenance.provider)} · ${escapeHtml(signal.sourceId)}</dd></div><div><dt>Retrieved</dt><dd>${humanDate(signal.provenance.retrievedAt)}</dd></div><div><dt>Freshness review</dt><dd>${humanDate(signal.freshnessReviewAt)}</dd></div><div><dt>Confidence</dt><dd>${escapeHtml(signal.confidence)}</dd></div></dl>
      <details><summary>Evidence drawer</summary><p><strong>Provenance:</strong> ${escapeHtml(signal.provenance.sourceUrl ?? "No validated source URL")}</p><p><strong>Limitations:</strong> ${escapeHtml(signal.limitations.join(" · "))}</p><p><strong>Facts:</strong> ${escapeHtml(JSON.stringify(signal.facts))}</p><p><strong>Relationships:</strong> ${escapeHtml(signal.relationships.map((item) => `${item.kind}: ${item.label}`).join(" · ") || "None")}</p></details>
      ${signal.tags.length ? `<p class="tag-list">${signal.tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join("")}</p>` : ""}
      ${!readonly ? `<div class="actions">${signal.evidenceState === "suggested" ? `<button type="button" data-signal-action="accept" data-id="${signal.id}">Accept with named review</button><button type="button" data-signal-action="dismiss" data-id="${signal.id}">Dismiss</button>` : ""}<button type="button" data-signal-action="save" data-id="${signal.id}">Save</button><button type="button" data-signal-action="tag" data-id="${signal.id}">Tag</button><button type="button" data-signal-action="assign" data-id="${signal.id}">Assign</button></div>
      <details><summary>Connect evidence</summary><form data-form="signals-connect"><input type="hidden" name="signalId" value="${signal.id}"><div class="three"><label>Relationship<select name="relationshipKind"><option value="product">Product</option><option value="icp_hypothesis">ICP hypothesis</option><option value="topic">Topic</option><option value="repository">Repository</option><option value="opportunity">Opportunity</option></select></label><label>Target identifier<input name="targetId" required></label><label>Label<input name="label" required></label></div><button type="submit">Connect signal</button></form></details>
      ${reviewed ? `<details><summary>Convert to proposed work</summary><form data-form="signals-convert"><input type="hidden" name="signalId" value="${signal.id}"><label>Work type<select name="kind"><option value="product_action">Product action</option><option value="icp_validation_action">ICP validation action</option><option value="campaign_brief">Campaign brief</option><option value="content_brief">Content brief</option><option value="repository_growth_action">Repository growth action</option><option value="product_feedback">Product feedback</option></select></label><label>Title<input name="title" required value="Review: ${escapeHtml(signal.title)}"></label><label>Named owner<input name="owner" required value="${escapeHtml(signal.owner ?? this.defaultOwner)}"></label><button type="submit">Create proposed work</button></form></details>` : ""}` : ""}
    </article>`;
  }
}
