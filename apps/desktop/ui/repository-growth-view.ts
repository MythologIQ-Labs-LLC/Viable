import type { CampaignWorkspace, CanonicalAsset } from "../../../src/campaigns/domain/campaign.js";
import { GitHubPublicRepositoryGrowthSource } from "../../../src/repository-growth/adapters/github-public-repository-growth-source.js";
import type {
  MetricEvidenceState,
  PublicRepositorySnapshot,
  RepositoryGrowthWorkspace,
  RepositoryLaunchRoom,
  RepositoryMetricKind,
  RepositoryMetricObservation,
  RepositoryReadinessFinding,
} from "../../../src/repository-growth/domain/repository-growth.js";
import { RepositoryGrowthService } from "../../../src/repository-growth/services/repository-growth-service.js";
import { LocalStorageCampaignWorkspaceStore } from "./local-storage-campaign-workspace-store.js";
import { LocalStorageProductWorkspaceStore } from "./local-storage-product-workspace-store.js";
import { LocalStorageRepositoryGrowthStore } from "./local-storage-repository-growth-store.js";

const escapeHtml = (value: unknown): string => String(value ?? "")
  .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;").replaceAll("'", "&#039;");
const lines = (value: FormDataEntryValue | null): string[] => String(value ?? "").split("\n").map((item) => item.trim()).filter(Boolean);
const humanDate = (value?: string): string => value ? new Date(value).toLocaleString() : "Unavailable";
const pill = (value: string): string => `<span class="pill ${tone(value)}">${escapeHtml(value.replaceAll("_", " "))}</span>`;
const tone = (value: string): string =>
  ["success", "ready_for_manual_launch", "retrospective_complete", "completed", "observed"].includes(value) ? "implemented"
    : ["partial", "verified_zero", "open", "in_progress", "draft", "not_collected"].includes(value) ? "warning"
      : ["unavailable", "transport_failed", "validation_failed", "rate_limited", "forbidden", "unauthorized", "dismissed"].includes(value) ? "error"
        : "neutral";

const dimensionLabels: Record<RepositoryReadinessFinding["dimension"], string> = {
  problem_clarity: "Problem clarity",
  product_credibility: "Product credibility",
  time_to_value: "Time to value",
  discoverability: "Discoverability",
  differentiation: "Differentiation",
  trust: "Trust",
  community_readiness: "Community readiness",
  release_discipline: "Release discipline",
  distribution: "Distribution",
  adoption: "Adoption evidence",
  sustainability: "Sustainability",
  commercial_path: "Commercial path",
};

export class RepositoryGrowthViewController {
  private readonly productStore = new LocalStorageProductWorkspaceStore();
  private readonly campaignStore = new LocalStorageCampaignWorkspaceStore();
  private readonly service = new RepositoryGrowthService(
    new LocalStorageRepositoryGrowthStore(),
    this.productStore,
    this.campaignStore,
  );
  private workspace: RepositoryGrowthWorkspace | undefined;
  private campaigns: CampaignWorkspace | undefined;
  private failure: string | undefined;
  private selectedRepositoryId: string | undefined;

  constructor(
    readonly workspaceId: string,
    private readonly defaultOwner: string,
  ) {}

  async load(): Promise<void> {
    const [workspace, campaigns] = await Promise.all([
      this.service.load(this.workspaceId),
      this.campaignStore.load(this.workspaceId),
    ]);
    this.workspace = workspace;
    this.campaigns = campaigns;
    if (!this.selectedRepositoryId) this.selectedRepositoryId = workspace.repositories.at(-1)?.id;
  }

  render(): string {
    if (!this.workspace) return `<section class="state loading" role="status"><strong>Loading repository growth workspace</strong><span>Reading local repository evidence, plans, and launch rooms.</span></section>`;
    const repository = this.workspace.repositories.find((item) => item.id === this.selectedRepositoryId) ?? this.workspace.repositories.at(-1);
    return `
      <header class="hero compact"><div><p class="eyebrow">Product · Public repositories</p><h2>Useful adoption before vanity growth.</h2>
        <p>Assess a public repository, fix readiness gaps, coordinate an approved release, and compare outcomes without promising GitHub Trending.</p></div><button type="button" data-repository-action="return-product">Return to Product</button></header>
      ${this.failure ? `<section class="state error" role="alert"><div><strong>Repository operation failed.</strong><p>${escapeHtml(this.failure)}</p></div><button type="button" data-repository-action="recover">Return to saved repository workspace</button></section>` : ""}
      <section class="state offline"><strong>Public and local by default.</strong><span>Unauthenticated GitHub evidence is optional. Manual plans, exports, and outcomes remain local and available when live access fails.</span></section>
      <section class="panel" aria-labelledby="repository-import-heading">
        <div class="section-heading"><div><p class="eyebrow">Repository workspace</p><h3 id="repository-import-heading">Import or refresh public evidence</h3></div>${pill(`${this.workspace.repositories.length} repositories`)}</div>
        <p class="guidance">Use owner/name. Public import samples repository metadata, README, community health, releases, and contributors. Traffic, referrals, clones, dependents, integrations, and inquiries remain unavailable without separate evidence.</p>
        <form data-form="repository-import"><div class="two"><label>Public repository<input name="repository" required placeholder="owner/repository" value="${escapeHtml(repository?.fullName ?? "")}"></label><label>Named import owner<input name="owner" required value="${escapeHtml(this.defaultOwner)}"></label></div><button class="primary" type="submit">Import public repository evidence</button></form>
        ${this.workspace.repositories.length ? `<div class="repository-picker" aria-label="Imported repositories">${this.workspace.repositories.map((item) => `<button type="button" data-repository-action="select" data-id="${item.id}" aria-pressed="${item.id === repository?.id}">${escapeHtml(item.fullName)}</button>`).join("")}</div>` : `<div class="state empty"><strong>No public repository imported.</strong><span>Import one repository to create an evidence-backed readiness assessment. An empty workspace is not evidence that no repository opportunity exists.</span></div>`}
      </section>
      ${repository ? this.repositoryView(repository) : ""}`;
  }

  async submit(formElement: HTMLFormElement): Promise<string | undefined> {
    const form = new FormData(formElement);
    const kind = formElement.dataset.form;
    this.failure = undefined;
    try {
      if (kind === "repository-import") {
        const repository = String(form.get("repository")).trim();
        const outcome = await new GitHubPublicRepositoryGrowthSource(repository).collect();
        this.workspace = await this.service.importRepository(this.workspaceId, outcome);
        this.selectedRepositoryId = this.workspace.repositories.find((item) => item.fullName.toLocaleLowerCase("en-US") === repository.toLocaleLowerCase("en-US"))?.id;
        return outcome.status === "partial" ? "Repository imported with partial source evidence" : "Public repository evidence imported";
      }
      if (kind === "repository-assess") {
        this.workspace = await this.service.assessRepository(this.workspaceId, String(form.get("repositoryId")), String(form.get("owner")));
        return "Explained repository readiness assessment created";
      }
      if (kind === "repository-plan") {
        this.workspace = await this.service.createGrowthPlan(this.workspaceId, String(form.get("repositoryId")), String(form.get("assessmentId")), String(form.get("owner")));
        return "Prioritized repository growth plan created";
      }
      if (kind === "repository-action-status") {
        this.workspace = await this.service.updateGrowthAction(this.workspaceId, String(form.get("planId")), String(form.get("actionId")), String(form.get("status")) as "open");
        return "Repository growth action updated";
      }
      if (kind === "repository-launch-room") {
        const assetId = String(form.get("canonicalAssetId"));
        const asset = this.campaigns?.assets.find((item) => item.id === assetId);
        if (!asset) throw new Error("Choose an approved canonical asset");
        this.workspace = await this.service.createLaunchRoom(this.workspaceId, {
          repositoryId: String(form.get("repositoryId")), title: String(form.get("title")),
          primaryAudience: String(form.get("primaryAudience")), desiredOutcome: String(form.get("desiredOutcome")),
          releaseTag: String(form.get("releaseTag")), campaignId: asset.campaignId, canonicalAssetId: asset.id,
          checklist: lines(form.get("checklist")),
          maintainerCoverage: [{
            owner: String(form.get("coverageOwner")), responsibility: String(form.get("coverageResponsibility")),
            startsAt: iso(form.get("coverageStartsAt")), endsAt: iso(form.get("coverageEndsAt")),
          }],
          observationStartsAt: iso(form.get("observationStartsAt")), observationEndsAt: iso(form.get("observationEndsAt")),
          retrospectiveAt: iso(form.get("retrospectiveAt")), createdBy: String(form.get("createdBy")),
        });
        return "Repository launch room created from approved campaign authority";
      }
      if (kind === "repository-retrospective") {
        const capturedAt = iso(form.get("capturedAt"));
        const outcomes = [
          numericMetric("stars", form.get("stars"), capturedAt),
          numericMetric("forks", form.get("forks"), capturedAt),
          numericMetric("release_downloads", form.get("releaseDownloads"), capturedAt),
          stateMetric("views", form.get("viewsState"), form.get("views"), capturedAt),
          stateMetric("clones", form.get("clonesState"), form.get("clones"), capturedAt),
        ].filter((item): item is RepositoryMetricObservation => Boolean(item));
        this.workspace = await this.service.completeRetrospective(this.workspaceId, String(form.get("launchRoomId")), {
          completedBy: String(form.get("completedBy")), summary: String(form.get("summary")),
          learnings: lines(form.get("learnings")), nextAction: String(form.get("nextAction")), outcomes,
        });
        return "Launch retrospective completed with explicit evidence states";
      }
      return undefined;
    } catch (error) {
      this.failure = error instanceof Error ? error.message : "Unknown repository workflow error";
      throw error;
    }
  }

  async click(button: HTMLButtonElement): Promise<string | undefined> {
    const action = button.dataset.repositoryAction;
    this.failure = undefined;
    try {
      if (action === "select" && button.dataset.id) {
        this.selectedRepositoryId = button.dataset.id;
        return "Repository workspace selected";
      }
      if (action === "recover") {
        await this.load();
        return "Saved repository workspace restored";
      }
      if (action === "checklist" && button.dataset.room && button.dataset.id) {
        const complete = button.dataset.complete !== "true";
        const evidence = complete ? prompt("Verification evidence for this checklist item") ?? undefined : undefined;
        this.workspace = await this.service.setChecklistItem(this.workspaceId, button.dataset.room, button.dataset.id, complete, evidence);
        return complete ? "Launch checklist item verified" : "Launch checklist item reopened";
      }
      if (action === "export" && button.dataset.room) {
        const creator = prompt("Named manual export creator", this.defaultOwner);
        if (!creator) return undefined;
        this.workspace = await this.service.createManualExport(this.workspaceId, button.dataset.room, creator);
        const record = this.workspace.exports.at(-1);
        if (record) download(`${safeName(record.repositoryId)}-repository-launch.json`, record.manifest);
        return "Manual repository launch package created and downloaded";
      }
      return undefined;
    } catch (error) {
      this.failure = error instanceof Error ? error.message : "Unknown repository workflow error";
      throw error;
    }
  }

  private repositoryView(repository: PublicRepositorySnapshot): string {
    const assessment = this.workspace!.assessments.filter((item) => item.repositoryId === repository.id).at(-1);
    const plans = this.workspace!.plans.filter((item) => item.repositoryId === repository.id);
    const rooms = this.workspace!.launchRooms.filter((item) => item.repositoryId === repository.id);
    const exports = this.workspace!.exports.filter((item) => item.repositoryId === repository.id);
    const retrospectives = this.workspace!.retrospectives.filter((item) => item.repositoryId === repository.id);
    const unavailable = repository.metrics.filter((item) => item.state === "unavailable");
    return `
      <section class="metrics repository-metrics" aria-label="Repository snapshot">
        <article><span>Repository</span><strong>${escapeHtml(repository.name)}</strong><small>${escapeHtml(repository.owner)}</small></article>
        <article><span>Import state</span><strong>${escapeHtml(repository.importStatus)}</strong><small>${humanDate(repository.importedAt)}</small></article>
        <article><span>Topics</span><strong>${repository.topics.length}</strong><small>${escapeHtml(repository.topics.join(", ") || "None")}</small></article>
        <article><span>Unavailable metrics</span><strong>${unavailable.length}</strong><small>Missing access is not zero</small></article>
      </section>
      ${repository.importStatus === "partial" ? `<section class="state warning"><strong>Partial repository evidence</strong><span>Successful metadata is preserved while failed secondary checks remain visible.</span></section>` : ""}
      ${repository.archived ? `<section class="state warning"><strong>Repository is archived.</strong><span>Growth planning should begin by deciding whether the project should remain archived.</span></section>` : ""}
      <section class="panel" aria-labelledby="snapshot-heading">
        <div class="section-heading"><div><p class="eyebrow">Evidence snapshot</p><h3 id="snapshot-heading">${escapeHtml(repository.fullName)}</h3></div>${pill(repository.importStatus)}</div>
        <p>${escapeHtml(repository.description || "No repository description was provided.")}</p>
        <div class="repository-evidence-grid">
          <article><h4>Front door</h4><ul><li>README: ${yes(repository.frontDoor.readmePresent)}</li><li>Quick start: ${yes(repository.frontDoor.quickStartPresent)}</li><li>Demo: ${yes(repository.frontDoor.demoPresent)}</li><li>Documentation: ${yes(repository.frontDoor.documentationPresent)}</li><li>Changelog: ${yes(repository.frontDoor.changelogPresent)}</li><li>Social preview: ${escapeHtml(repository.frontDoor.socialPreviewState)}</li></ul></article>
          <article><h4>Trust and community</h4><ul><li>License: ${escapeHtml(repository.license ?? "missing")}</li><li>SECURITY: ${yes(repository.community.securityPresent)}</li><li>CONTRIBUTING: ${yes(repository.community.contributingPresent)}</li><li>Code of conduct: ${yes(repository.community.codeOfConductPresent)}</li><li>Issue template: ${yes(repository.community.issueTemplatePresent)}</li><li>Support: ${yes(repository.community.supportPresent)}</li></ul></article>
          <article><h4>Release sample</h4><ul><li>Releases sampled: ${repository.releases.sampledReleaseCount}</li><li>Latest tag: ${escapeHtml(repository.releases.latestTag ?? "none")}</li><li>Release notes: ${yes(repository.releases.releaseNotesPresent)}</li><li>Release assets: ${yes(repository.releases.releaseAssetsPresent)}</li></ul></article>
        </div>
        ${this.metricTable(repository.metrics)}
        <details><summary>Import limitations</summary><ul class="limitations">${repository.limitations.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul></details>
        <form data-form="repository-assess"><input type="hidden" name="repositoryId" value="${repository.id}"><label>Assessment owner<input name="owner" required value="${escapeHtml(this.defaultOwner)}"></label><button class="primary" type="submit">Run explained readiness assessment</button></form>
      </section>
      ${assessment ? this.assessmentView(repository, assessment.findings, assessment.id) : `<section class="state empty"><strong>No readiness assessment yet.</strong><span>Run the deterministic assessment to expose evidence, impact, effort, recommendations, owners, and verification.</span></section>`}
      ${plans.map((plan) => this.planView(plan)).join("")}
      ${this.launchBuilder(repository)}
      ${rooms.map((room) => this.launchRoomView(room)).join("")}
      ${exports.length ? `<section class="panel"><div class="section-heading"><div><p class="eyebrow">Manual exports</p><h3>Launch packages</h3></div>${pill(`${exports.length} packages`)}</div><div class="cards">${exports.map((item) => `<article class="record"><div class="record-top"><h4>${humanDate(item.createdAt)}</h4>${pill(item.status)}</div><p>Created by ${escapeHtml(item.createdBy)}. Not approved for publishing and not delivered.</p><details><summary>Manifest preview</summary><pre>${escapeHtml(item.manifest.slice(0, 2400))}</pre></details></article>`).join("")}</div></section>` : ""}
      ${retrospectives.length ? `<section class="panel"><div class="section-heading"><div><p class="eyebrow">Learning</p><h3>Launch retrospectives</h3></div></div><div class="cards">${retrospectives.map((item) => `<article class="record"><h4>${escapeHtml(item.summary)}</h4><p>${escapeHtml(item.learnings.join(" · "))}</p><p><strong>Next reversible action:</strong> ${escapeHtml(item.nextAction)}</p><div class="comparison-list">${item.comparisons.map((comparison) => `<span>${escapeHtml(comparison.kind)}: ${comparison.delta === undefined ? `${comparison.baselineState} → ${comparison.outcomeState}` : `${comparison.delta >= 0 ? "+" : ""}${comparison.delta}`}</span>`).join("")}</div></article>`).join("")}</div></section>` : ""}`;
  }

  private assessmentView(repository: PublicRepositorySnapshot, findings: readonly RepositoryReadinessFinding[], assessmentId: string): string {
    return `<section class="panel" aria-labelledby="readiness-heading"><div class="section-heading"><div><p class="eyebrow">Repository readiness</p><h3 id="readiness-heading">Evidence-backed findings</h3></div>${pill(`${findings.length} dimensions`)}</div>
      <p class="guidance">Ratings prioritize controllable readiness work. They do not predict GitHub Trending, virality, sales, or adoption.</p>
      <div class="readiness-grid">${findings.map((finding) => `<article class="record readiness-card"><div class="record-top"><h4>${dimensionLabels[finding.dimension]}</h4>${pill(`${finding.rating}/4`)}</div><p>${escapeHtml(finding.recommendation)}</p><dl><div><dt>Impact</dt><dd>${escapeHtml(finding.impact)}</dd></div><div><dt>Effort</dt><dd>${escapeHtml(finding.effort)}</dd></div><div><dt>Confidence</dt><dd>${escapeHtml(finding.confidence)}</dd></div><div><dt>Owner</dt><dd>${escapeHtml(finding.owner)}</dd></div></dl><details><summary>Evidence and verification</summary><ul>${finding.evidence.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul><p><strong>Verify:</strong> ${escapeHtml(finding.verification)}</p></details></article>`).join("")}</div>
      <form data-form="repository-plan"><input type="hidden" name="repositoryId" value="${repository.id}"><input type="hidden" name="assessmentId" value="${assessmentId}"><label>Growth plan owner<input name="owner" required value="${escapeHtml(this.defaultOwner)}"></label><button class="primary" type="submit">Create prioritized growth plan</button></form></section>`;
  }

  private planView(plan: RepositoryGrowthWorkspace["plans"][number]): string {
    return `<section class="panel"><div class="section-heading"><div><p class="eyebrow">Owned work</p><h3>Repository growth plan</h3></div>${pill(`${plan.actions.filter((item) => item.status !== "completed").length} open`)}</div><div class="cards">${plan.actions.map((action) => `<article class="record"><div class="record-top"><h4>${escapeHtml(action.title)}</h4>${pill(action.status)}</div><p>${escapeHtml(action.impact)} impact · ${escapeHtml(action.effort)} effort · Owner: ${escapeHtml(action.owner)}</p><p><strong>Verify:</strong> ${escapeHtml(action.verification)}</p><form data-form="repository-action-status"><input type="hidden" name="planId" value="${plan.id}"><input type="hidden" name="actionId" value="${action.id}"><label>Status<select name="status"><option ${action.status === "open" ? "selected" : ""}>open</option><option ${action.status === "in_progress" ? "selected" : ""}>in_progress</option><option ${action.status === "completed" ? "selected" : ""}>completed</option><option ${action.status === "dismissed" ? "selected" : ""}>dismissed</option></select></label><button type="submit">Update action</button></form></article>`).join("")}</div></section>`;
  }

  private launchBuilder(repository: PublicRepositorySnapshot): string {
    const bundles = this.approvedBundles();
    if (bundles.length === 0) return `<section class="panel"><div class="section-heading"><div><p class="eyebrow">Launch authority</p><h3>Create a repository launch room</h3></div>${pill("blocked")}</div><div class="state warning"><strong>No approved launch asset family is available.</strong><span>Create and approve a campaign, canonical asset, and LinkedIn, website, and GitHub release variants first.</span></div><button type="button" data-nav="campaigns">Open Campaigns</button></section>`;
    const first = bundles[0]!;
    return `<section class="panel" aria-labelledby="launch-builder-heading"><div class="section-heading"><div><p class="eyebrow">Launch authority</p><h3 id="launch-builder-heading">Create a repository launch room</h3></div>${pill("manual activation")}</div>
      <p class="guidance">The launch room reuses approved Product Core claims and campaign assets. It does not publish, guarantee Trending, or manufacture engagement.</p>
      <form data-form="repository-launch-room"><input type="hidden" name="repositoryId" value="${repository.id}"><div class="two"><label>Launch room title<input name="title" required value="${escapeHtml(repository.name)} release launch"></label><label>Release tag<input name="releaseTag" required value="${escapeHtml(repository.releases.latestTag ?? "v0.1.0")}"></label></div>
        <label>Approved canonical asset<select name="canonicalAssetId">${bundles.map((bundle) => `<option value="${bundle.asset.id}" data-audience="${escapeHtml(bundle.campaign.primaryAudience)}">${escapeHtml(bundle.campaign.title)} · ${escapeHtml(bundle.asset.title)}</option>`).join("")}</select></label>
        <div class="two"><label>Primary audience<input name="primaryAudience" required value="${escapeHtml(first.campaign.primaryAudience)}"></label><label>Desired outcome<input name="desiredOutcome" required value="${escapeHtml(first.campaign.primaryOutcome)}"></label></div>
        <label>Required launch checklist, one per line<textarea name="checklist" required rows="6">README and quick start frozen\nRelease artifact verified on a clean environment\nRelease notes and limitations approved\nTopics and social preview reviewed\nCommunity rules checked\nLaunch assets approved</textarea></label>
        <div class="two"><label>Coverage owner<input name="coverageOwner" required value="${escapeHtml(this.defaultOwner)}"></label><label>Coverage responsibility<input name="coverageResponsibility" required value="Questions, onboarding failures, issues, and discussions"></label></div>
        <div class="two"><label>Coverage starts<input type="datetime-local" name="coverageStartsAt" required></label><label>Coverage ends<input type="datetime-local" name="coverageEndsAt" required></label></div>
        <div class="three"><label>Observation starts<input type="datetime-local" name="observationStartsAt" required></label><label>Observation ends<input type="datetime-local" name="observationEndsAt" required></label><label>Retrospective<input type="datetime-local" name="retrospectiveAt" required></label></div>
        <label>Named launch owner<input name="createdBy" required value="${escapeHtml(this.defaultOwner)}"></label><button class="primary" type="submit">Create governed launch room</button></form></section>`;
  }

  private launchRoomView(room: RepositoryLaunchRoom): string {
    const retrospective = this.workspace!.retrospectives.find((item) => item.launchRoomId === room.id);
    return `<section class="panel launch-room"><div class="section-heading"><div><p class="eyebrow">Repository launch room</p><h3>${escapeHtml(room.title)}</h3></div>${pill(room.status)}</div>
      <dl><div><dt>Audience</dt><dd>${escapeHtml(room.primaryAudience)}</dd></div><div><dt>Outcome</dt><dd>${escapeHtml(room.desiredOutcome)}</dd></div><div><dt>Release</dt><dd>${escapeHtml(room.releaseTag)}</dd></div><div><dt>Observation window</dt><dd>${humanDate(room.observationStartsAt)} to ${humanDate(room.observationEndsAt)}</dd></div></dl>
      <h4>Release checklist</h4><div class="checklist">${room.checklist.map((item) => `<button type="button" data-repository-action="checklist" data-room="${room.id}" data-id="${item.id}" data-complete="${item.complete}" aria-pressed="${item.complete}"><span>${item.complete ? "Verified" : "Open"}</span>${escapeHtml(item.label)}${item.evidence ? `<small>${escapeHtml(item.evidence)}</small>` : ""}</button>`).join("")}</div>
      <h4>Maintainer coverage</h4><div class="cards">${room.maintainerCoverage.map((coverage) => `<article class="record"><strong>${escapeHtml(coverage.owner)}</strong><p>${escapeHtml(coverage.responsibility)}</p><small>${humanDate(coverage.startsAt)} to ${humanDate(coverage.endsAt)}</small></article>`).join("")}</div>
      ${room.status === "ready_for_manual_launch" ? `<button class="primary" type="button" data-repository-action="export" data-room="${room.id}">Create manual launch export</button>` : room.status === "draft" ? `<div class="state warning"><strong>Launch room is not ready.</strong><span>Verify every required checklist item before creating a manual export.</span></div>` : ""}
      ${room.status === "ready_for_manual_launch" && !retrospective ? this.retrospectiveForm(room) : ""}
      ${retrospective ? `<div class="state"><strong>Retrospective complete.</strong><span>${escapeHtml(retrospective.nextAction)}</span></div>` : ""}</section>`;
  }

  private retrospectiveForm(room: RepositoryLaunchRoom): string {
    return `<details><summary>Complete launch retrospective</summary><form data-form="repository-retrospective"><input type="hidden" name="launchRoomId" value="${room.id}"><div class="two"><label>Completed by<input name="completedBy" required value="${escapeHtml(this.defaultOwner)}"></label><label>Outcome captured at<input type="datetime-local" name="capturedAt" required></label></div><label>Summary<textarea name="summary" required rows="3"></textarea></label><label>Learnings, one per line<textarea name="learnings" required rows="4"></textarea></label><label>Next reversible action<input name="nextAction" required></label>
      <fieldset><legend>Observed public activity</legend><div class="three"><label>Stars<input type="number" min="0" name="stars"></label><label>Forks<input type="number" min="0" name="forks"></label><label>Sampled release downloads<input type="number" min="0" name="releaseDownloads"></label></div></fieldset>
      <fieldset><legend>Access-limited metrics</legend><div class="two"><label>Views state<select name="viewsState"><option>unavailable</option><option>not_collected</option><option>observed</option><option>verified_zero</option></select><input type="number" min="0" name="views" placeholder="Only when observed"></label><label>Clones state<select name="clonesState"><option>unavailable</option><option>not_collected</option><option>observed</option><option>verified_zero</option></select><input type="number" min="0" name="clones" placeholder="Only when observed"></label></div></fieldset>
      <button class="primary" type="submit">Save baseline comparison and learning</button></form></details>`;
  }

  private metricTable(metrics: readonly RepositoryMetricObservation[]): string {
    return `<div class="table-wrap"><table class="repository-metric-table"><thead><tr><th scope="col">Metric</th><th scope="col">Evidence state</th><th scope="col">Value</th><th scope="col">Source and limitation</th></tr></thead><tbody>${metrics.map((metric) => `<tr><th scope="row">${escapeHtml(metric.kind.replaceAll("_", " "))}</th><td>${pill(metric.state)}</td><td>${metric.value === undefined ? "Not available" : metric.value}</td><td>${escapeHtml(metric.source)}${metric.limitation ? `<small>${escapeHtml(metric.limitation)}</small>` : ""}</td></tr>`).join("")}</tbody></table></div>`;
  }

  private approvedBundles(): readonly Readonly<{ campaign: CampaignWorkspace["campaigns"][number]; asset: CanonicalAsset }>[] {
    if (!this.campaigns) return [];
    return this.campaigns.assets.flatMap((asset) => {
      if (asset.status !== "approved") return [];
      const campaign = this.campaigns!.campaigns.find((item) => item.id === asset.campaignId && item.status === "approved");
      if (!campaign) return [];
      const channels = new Set(this.campaigns!.variants.filter((item) => item.canonicalAssetId === asset.id && item.status === "approved").map((item) => item.channel));
      return ["linkedin", "website", "github_release"].every((channel) => channels.has(channel as "linkedin")) ? [{ campaign, asset }] : [];
    });
  }
}

function numericMetric(kind: RepositoryMetricKind, value: FormDataEntryValue | null, capturedAt: string): RepositoryMetricObservation | undefined {
  if (String(value ?? "").trim() === "") return undefined;
  const number = Number(value);
  return { kind, state: number === 0 ? "verified_zero" : "observed", value: number, capturedAt, source: "manual_observation" };
}

function stateMetric(kind: RepositoryMetricKind, stateValue: FormDataEntryValue | null, value: FormDataEntryValue | null, capturedAt: string): RepositoryMetricObservation {
  const state = String(stateValue) as MetricEvidenceState;
  if (state === "observed" || state === "verified_zero") {
    const number = Number(value);
    return { kind, state, value: number, capturedAt, source: "manual_observation" };
  }
  return { kind, state, capturedAt, source: "manual_observation", limitation: "No authorized or verified evidence was available" };
}

function iso(value: FormDataEntryValue | null): string {
  const text = String(value ?? "");
  const date = new Date(text);
  if (!text || !Number.isFinite(date.getTime())) throw new Error("A valid date and time is required");
  return date.toISOString();
}

function yes(value: boolean): string { return value ? "Present" : "Missing"; }
function safeName(value: string): string { return value.replace(/[^A-Za-z0-9_.-]+/g, "-"); }
function download(filename: string, content: string): void {
  const url = URL.createObjectURL(new Blob([content], { type: "application/json" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
