import type { CampaignWorkspace, CanonicalAsset } from "../../../src/campaigns/domain/campaign.js";
import type {
  ImportedVideoArtifact,
  SourceAssetManifestEntry,
  StoryboardScene,
  VideoAspectRatio,
  VideoPlatform,
  VideoProductionWorkspace,
  VideoProviderSelection,
  VideoRunStage,
} from "../../../src/video-production/domain/video-production.js";
import { VideoProductionService } from "../../../src/video-production/services/guarded-video-production-service.js";
import { LocalStorageCampaignWorkspaceStore } from "./local-storage-campaign-workspace-store.js";
import { LocalStorageProductWorkspaceStore } from "./local-storage-product-workspace-store.js";
import { LocalStorageVideoProductionStore } from "./local-storage-video-production-store.js";

const escapeHtml = (value: unknown): string => String(value ?? "")
  .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;").replaceAll("'", "&#039;");
const lines = (value: FormDataEntryValue | null): string[] => String(value ?? "").split("\n").map((item) => item.trim()).filter(Boolean);
const checked = (form: FormData, name: string): string[] => form.getAll(name).map(String).filter(Boolean);
const label = (value: string): string => value.replaceAll("_", " ");
const tone = (value: string): string =>
  ["approved", "completed", "manual_export_ready"].includes(value) ? "implemented"
    : ["draft", "in_review", "changes_requested", "approval_invalidated", "partial", "pending", "running"].includes(value) ? "warning"
      : ["rejected", "failed", "cancelled"].includes(value) ? "error" : "neutral";
const pill = (value: string): string => `<span class="pill ${tone(value)}">${escapeHtml(label(value))}</span>`;

export class VideoProductionViewController {
  private readonly productStore = new LocalStorageProductWorkspaceStore();
  private readonly campaignStore = new LocalStorageCampaignWorkspaceStore();
  private readonly store = new LocalStorageVideoProductionStore();
  private readonly service = new VideoProductionService(this.store, this.productStore, this.campaignStore);
  private campaigns?: CampaignWorkspace;
  private workspace?: VideoProductionWorkspace;
  private failure?: string;

  constructor(readonly workspaceId: string, private readonly defaultOwner: string) {}

  async load(): Promise<void> {
    const [campaigns, workspace] = await Promise.all([
      this.campaignStore.load(this.workspaceId),
      this.service.load(this.workspaceId),
    ]);
    this.campaigns = campaigns;
    this.workspace = workspace;
  }

  render(): string {
    if (!this.workspace) return `<section class="state loading" role="status"><strong>Loading video production workspace</strong><span>Reading local briefs, packages, and imported artifacts.</span></section>`;
    const approvedScripts = this.approvedScripts();
    const tool = this.workspace.tools[0];
    return `
      <section class="video-workspace" aria-labelledby="video-workspace-heading">
        <header class="hero compact"><div><p class="eyebrow">Studio · Video</p><h2 id="video-workspace-heading">Approved script in. Reviewable production package out.</h2>
          <p>Prepare a provider-neutral video package, run production separately, import evidence, and approve the result inside Viable.</p></div>${pill("manual production")}</header>
        ${this.failure ? `<section class="state error" role="alert"><div><strong>Video production operation failed.</strong><p>${escapeHtml(this.failure)}</p></div><button type="button" data-video-action="recover">Return to saved video workspace</button></section>` : ""}
        <section class="state offline"><strong>Manual and local by design.</strong><span>Viable does not execute ViMax, store provider credentials, schedule media, publish, deliver, or measure video in this slice.</span></section>
        ${tool ? this.toolCard(tool) : ""}
        <section class="metrics" aria-label="Video production status">
          <article><span>Approved scripts</span><strong>${approvedScripts.length}</strong><small>Campaign authority</small></article>
          <article><span>Video briefs</span><strong>${this.workspace.briefs.length}</strong><small>${this.workspace.briefs.filter((item) => item.status === "approved").length} approved</small></article>
          <article><span>Imported runs</span><strong>${this.workspace.artifacts.length}</strong><small>${this.workspace.artifacts.filter((item) => item.reviewStatus === "approved").length} approved</small></article>
          <article><span>Platform variants</span><strong>${this.workspace.variants.length}</strong><small>Separate review required</small></article>
        </section>
        ${approvedScripts.length ? this.briefBuilder(approvedScripts) : `<section class="state warning"><strong>No approved canonical script is available.</strong><span>Create and approve a campaign and canonical script in Campaigns and Studio before preparing video production.</span></section>`}
        ${this.briefList()}
        ${this.packageSection()}
        ${this.importSection()}
        ${this.artifactSection()}
        ${this.variantSection()}
        <section class="state warning"><strong>Calendar handoff is not implemented.</strong><span>Approved video variants cannot enter scheduling or measurement until issue #7 provides those authoritative records.</span></section>
      </section>`;
  }

  async submit(formElement: HTMLFormElement): Promise<string | undefined> {
    const form = new FormData(formElement);
    const kind = formElement.dataset.form;
    delete this.failure;
    try {
      if (kind === "video-create-brief") {
        const durationSeconds = number(form.get("durationSeconds"), "Video duration");
        this.workspace = await this.service.createBrief(this.workspaceId, {
          sourceAssetId: String(form.get("sourceAssetId")), title: String(form.get("title")), objective: String(form.get("objective")),
          durationSeconds, platforms: checked(form, "platforms") as VideoPlatform[], aspectRatios: checked(form, "aspectRatios") as VideoAspectRatio[],
          visualStyle: String(form.get("visualStyle")), prohibitedElements: lines(form.get("prohibitedElements")),
          captionsRequired: form.get("captionsRequired") === "on", audioDescriptionRequired: form.get("audioDescriptionRequired") === "on",
          storyboard: parseStoryboard(form.get("storyboard"), durationSeconds), sourceAssets: parseSourceAssets(form.get("sourceAssets")),
          providers: parseProviders(form), owner: String(form.get("owner")),
        });
        return "Video brief created as a draft";
      }
      if (kind === "video-create-package") {
        this.workspace = await this.service.createManualPackage(this.workspaceId, String(form.get("briefId")), String(form.get("creator")));
        return "Manual video production package created without credentials or execution authority";
      }
      if (kind === "video-import-run") {
        const renderStatus = String(form.get("renderStatus")) as ImportedVideoArtifact["renderStatus"];
        this.workspace = await this.service.importRun(this.workspaceId, {
          packageId: String(form.get("packageId")), sourceToolId: String(form.get("sourceToolId")), sourceToolVersion: String(form.get("sourceToolVersion")),
          runCorrelationId: String(form.get("runCorrelationId")), renderStatus, stages: parseStages(form.get("stages")), files: parseFiles(form.get("files")),
          redactedLog: String(form.get("redactedLog")), importedBy: String(form.get("importedBy")),
          ...(String(form.get("failureClass")).trim() ? { failureClass: String(form.get("failureClass")) } : {}),
          ...(String(form.get("failureDetail")).trim() ? { failureDetail: String(form.get("failureDetail")) } : {}),
        });
        return `Video run imported with ${label(renderStatus)} status and draft review state`;
      }
      if (kind === "video-create-variant") {
        const captionFileId = String(form.get("captionFileId")).trim();
        this.workspace = await this.service.createVariant(this.workspaceId, {
          artifactId: String(form.get("artifactId")), platform: String(form.get("platform")) as VideoPlatform,
          aspectRatio: String(form.get("aspectRatio")) as VideoAspectRatio, fileId: String(form.get("fileId")),
          ...(captionFileId ? { captionFileId } : {}), accessibilityNotes: lines(form.get("accessibilityNotes")),
        });
        return "Video platform variant created as a draft";
      }
      return undefined;
    } catch (error) {
      this.failure = error instanceof Error ? error.message : "Unknown video production error";
      throw error;
    }
  }

  async click(button: HTMLButtonElement): Promise<string | undefined> {
    delete this.failure;
    const action = button.dataset.videoAction;
    const id = button.dataset.id;
    try {
      if (action === "recover") { await this.load(); return "Saved video production workspace restored"; }
      if (action === "submit-brief" && id) { this.workspace = await this.service.submitBrief(this.workspaceId, id); return "Video brief submitted for named review"; }
      if (action === "review-brief" && id) return this.reviewBrief(id, button.dataset.decision);
      if (action === "download-package" && id) {
        const record = this.workspace?.packages.find((item) => item.id === id);
        if (!record) throw new Error("Video production package not found");
        downloadJson(`viable-video-package-${record.id}.json`, record.manifest);
        return "Video production package downloaded";
      }
      if (action === "submit-artifact" && id) { this.workspace = await this.service.submitArtifact(this.workspaceId, id); return "Imported video artifact submitted for named review"; }
      if (action === "review-artifact" && id) return this.reviewArtifact(id, button.dataset.decision);
      if (action === "submit-variant" && id) { this.workspace = await this.service.submitVariant(this.workspaceId, id); return "Video platform variant submitted for named review"; }
      if (action === "review-variant" && id) return this.reviewVariant(id, button.dataset.decision);
      if (action === "detect-authority-impact") { this.workspace = await this.service.detectAuthorityImpact(this.workspaceId); return "Video authority impact review completed"; }
      return undefined;
    } catch (error) {
      this.failure = error instanceof Error ? error.message : "Unknown video production error";
      throw error;
    }
  }

  private approvedScripts(): CanonicalAsset[] {
    return this.campaigns?.assets.filter((asset) => asset.status === "approved" && this.campaigns?.campaigns.some((campaign) => campaign.id === asset.campaignId && campaign.status === "approved")) ?? [];
  }

  private toolCard(tool: VideoProductionWorkspace["tools"][number]): string {
    return `<section class="panel" aria-labelledby="video-tool-heading"><div class="section-heading"><div><p class="eyebrow">Optional production tool</p><h3 id="video-tool-heading">${escapeHtml(tool.name)} ${escapeHtml(tool.version)}</h3></div>${pill("manual adapter")}</div>
      <div class="video-tool-grid"><div><strong>Pinned revision</strong><span>${escapeHtml(tool.revision)}</span></div><div><strong>License</strong><span>${escapeHtml(tool.license)} · notice retention required</span></div><div><strong>Runtime</strong><span>${escapeHtml(tool.runtime.join("; "))}</span></div><div><strong>Platforms</strong><span>Windows and Linux recorded upstream; macOS unverified</span></div></div>
      <p class="guidance">The current ViMax TUI is interactive rather than a stable machine job API. Viable exports a blank-credential Script2Video packet and does not execute it.</p></section>`;
  }

  private briefBuilder(assets: CanonicalAsset[]): string {
    return `<section class="panel" aria-labelledby="video-brief-heading"><div class="section-heading"><div><p class="eyebrow">Production brief</p><h3 id="video-brief-heading">Prepare an approved script for production</h3></div>${pill("draft first")}</div>
      <form data-form="video-create-brief">
        <div class="two"><label>Approved canonical script<select name="sourceAssetId" required>${assets.map((asset) => `<option value="${asset.id}">${escapeHtml(asset.title)} · v${asset.versions.length}</option>`).join("")}</select></label><label>Named owner<input name="owner" required value="${escapeHtml(this.defaultOwner)}"></label></div>
        <div class="two"><label>Video title<input name="title" required></label><label>Objective<input name="objective" required></label></div>
        <div class="three"><label>Duration seconds<input name="durationSeconds" type="number" min="1" max="600" value="30" required></label><label>Visual style<input name="visualStyle" value="Clean product demonstration" required></label><label>Estimated provider currency<input name="currency" value="USD" required></label></div>
        <fieldset><legend>Platforms</legend>${["linkedin", "instagram_reels", "youtube_shorts", "website"].map((value) => `<label class="choice"><input type="checkbox" name="platforms" value="${value}" ${value === "linkedin" ? "checked" : ""}>${escapeHtml(label(value))}</label>`).join("")}</fieldset>
        <fieldset><legend>Aspect ratios</legend>${["9:16", "1:1", "16:9"].map((value) => `<label class="choice"><input type="checkbox" name="aspectRatios" value="${value}" ${value === "1:1" ? "checked" : ""}>${value}</label>`).join("")}</fieldset>
        <div class="two"><label class="choice"><input type="checkbox" name="captionsRequired" checked>Captions required</label><label class="choice"><input type="checkbox" name="audioDescriptionRequired">Audio description required</label></div>
        <label>Prohibited elements, one per line<textarea name="prohibitedElements" rows="3" required>Invented testimonials\nUnapproved logos\nPrivate customer data</textarea></label>
        <label>Storyboard, one scene per line: seconds | purpose | narration | visual direction | constraints<textarea name="storyboard" rows="5" required>10 | Introduce the problem | Campaign claims drift. | Show disconnected drafts | No customer data\n20 | Show the governed workflow | Viable preserves approved truth. | Show Product, Campaigns, and review states | No unapproved brands</textarea></label>
        <label>Source assets, one per line: label | media type | reference | owner | rights basis | sensitive kind | consent status | allowed use<textarea name="sourceAssets" rows="4" required>Product UI reference | image/png | assets/product-ui.png | MythologIQ Labs, LLC | Owned product screenshot | none | not_applicable | This campaign</textarea></label>
        ${providerFields("llm", "LLM")}${providerFields("image", "Image")}${providerFields("video", "Video")}
        <button class="primary" type="submit">Create draft video brief</button>
      </form></section>`;
  }

  private briefList(): string {
    const briefs = this.workspace!.briefs;
    return `<section class="panel" aria-labelledby="video-brief-list-heading"><div class="section-heading"><div><p class="eyebrow">Review queue</p><h3 id="video-brief-list-heading">Video briefs</h3></div><button type="button" data-video-action="detect-authority-impact">Recheck Product and Campaign authority</button></div>
      ${briefs.length ? `<div class="card-list">${briefs.map((brief) => `<article><div class="card-heading"><div><h4>${escapeHtml(brief.title)}</h4><p>${escapeHtml(brief.objective)}</p></div>${pill(brief.status)}</div>
        <dl><div><dt>Script source</dt><dd>${escapeHtml(brief.sourceAssetId)} · v${brief.sourceAssetVersion}</dd></div><div><dt>Audience</dt><dd>${escapeHtml(brief.audience)}</dd></div><div><dt>Providers</dt><dd>${escapeHtml(brief.providers.map((provider) => `${provider.kind}: ${provider.provider}/${provider.model} ${provider.estimatedCost} ${provider.currency}`).join("; "))}</dd></div><div><dt>Rights assets</dt><dd>${brief.sourceAssets.length}</dd></div></dl>
        ${reviewButtons("brief", brief.id, brief.status)}</article>`).join("")}</div>` : `<div class="state empty"><strong>No video brief yet.</strong><span>Create one from an approved canonical script.</span></div>`}</section>`;
  }

  private packageSection(): string {
    const approved = this.workspace!.briefs.filter((brief) => brief.status === "approved");
    return `<section class="panel" aria-labelledby="video-package-heading"><div class="section-heading"><div><p class="eyebrow">Manual package</p><h3 id="video-package-heading">Export for a separate production environment</h3></div>${pill("no credentials")}</div>
      ${approved.length ? `<form data-form="video-create-package"><div class="two"><label>Approved video brief<select name="briefId">${approved.map((brief) => `<option value="${brief.id}">${escapeHtml(brief.title)}</option>`).join("")}</select></label><label>Named package creator<input name="creator" required value="${escapeHtml(this.defaultOwner)}"></label></div><button class="primary" type="submit">Create manual production package</button></form>` : `<div class="state warning"><strong>No approved video brief.</strong><span>Submit and approve a brief before export.</span></div>`}
      ${this.workspace!.packages.length ? `<div class="card-list">${this.workspace!.packages.map((record) => `<article><div class="card-heading"><h4>Package ${escapeHtml(record.id)}</h4>${pill(record.status)}</div><p>Schema 1.0 · created by ${escapeHtml(record.createdBy)}. No credentials, execution, publishing, or delivery authority.</p><button type="button" data-video-action="download-package" data-id="${record.id}">Download JSON package</button></article>`).join("")}</div>` : ""}</section>`;
  }

  private importSection(): string {
    const packages = this.workspace!.packages;
    return `<section class="panel" aria-labelledby="video-import-heading"><div class="section-heading"><div><p class="eyebrow">Artifact import</p><h3 id="video-import-heading">Import a separately produced run</h3></div>${pill("untrusted input")}</div>
      ${packages.length ? `<form data-form="video-import-run"><div class="three"><label>Production package<select name="packageId">${packages.map((record) => `<option value="${record.id}">${escapeHtml(record.id)}</option>`).join("")}</select></label><label>Source tool<input name="sourceToolId" value="vimax-v1.1.0-manual" required></label><label>Tool version<input name="sourceToolVersion" value="v1.1.0" required></label></div>
        <div class="three"><label>Run correlation ID<input name="runCorrelationId" required></label><label>Render status<select name="renderStatus"><option>completed</option><option>partial</option><option>failed</option><option>cancelled</option></select></label><label>Named importer<input name="importedBy" value="${escapeHtml(this.defaultOwner)}" required></label></div>
        <label>Stages, one per line: status | stage | ISO timestamp | detail<textarea name="stages" rows="4" required>completed | package_received | ${new Date().toISOString()} | Package loaded\ncompleted | completed | ${new Date().toISOString()} | Final assembly completed</textarea></label>
        <label>Files, one per line: relationship | relative path | MIME type | size bytes | SHA-256<textarea name="files" rows="5" required>final_render | output/final.mp4 | video/mp4 | 0 | ${"0".repeat(64)}\ncaptions | output/captions.vtt | text/vtt | 0 | ${"1".repeat(64)}</textarea></label>
        <label>Redacted run log<textarea name="redactedLog" rows="4" required>Production completed. Credential values removed.</textarea></label><div class="two"><label>Failure class<input name="failureClass"></label><label>Failure detail<input name="failureDetail"></label></div>
        <button class="primary" type="submit">Import run as unapproved artifact</button></form>` : `<div class="state warning"><strong>No production package exists.</strong><span>Create and download a package before importing a run.</span></div>`}</section>`;
  }

  private artifactSection(): string {
    const artifacts = this.workspace!.artifacts;
    return `<section class="panel" aria-labelledby="video-artifact-heading"><div class="section-heading"><div><p class="eyebrow">Render review</p><h3 id="video-artifact-heading">Imported artifacts</h3></div>${pill("approval stays here")}</div>
      ${artifacts.length ? `<div class="card-list">${artifacts.map((artifact) => `<article><div class="card-heading"><div><h4>${escapeHtml(artifact.runCorrelationId)}</h4><p>${escapeHtml(artifact.sourceToolId)} ${escapeHtml(artifact.sourceToolVersion)}</p></div>${pill(artifact.reviewStatus)}</div>
        <div class="stage-list">${artifact.stages.map((stage) => `<div><span>${escapeHtml(label(stage.stage))}</span>${pill(stage.status)}<small>${escapeHtml(stage.detail)}</small></div>`).join("")}</div>
        <p><strong>Render status:</strong> ${escapeHtml(label(artifact.renderStatus))}. <strong>Files:</strong> ${artifact.files.length}. ${artifact.failureDetail ? `<strong>Failure:</strong> ${escapeHtml(artifact.failureDetail)}` : ""}</p>
        ${reviewButtons("artifact", artifact.id, artifact.reviewStatus)}</article>`).join("")}</div>` : `<div class="state empty"><strong>No run imported.</strong><span>Imported render completion will still begin in draft review state.</span></div>`}</section>`;
  }

  private variantSection(): string {
    const artifacts = this.workspace!.artifacts.filter((artifact) => artifact.reviewStatus === "approved");
    const files = artifacts.flatMap((artifact) => artifact.files.map((file) => ({ artifact, file })));
    const renderFiles = files.filter(({ file }) => ["final_render", "platform_render"].includes(file.relationship));
    const captions = files.filter(({ file }) => file.relationship === "captions");
    return `<section class="panel" aria-labelledby="video-variant-heading"><div class="section-heading"><div><p class="eyebrow">Platform variants</p><h3 id="video-variant-heading">Prepare an approved render for a platform</h3></div>${pill("separate review")}</div>
      ${renderFiles.length ? `<form data-form="video-create-variant"><div class="three"><label>Approved artifact<select name="artifactId">${artifacts.map((artifact) => `<option value="${artifact.id}">${escapeHtml(artifact.runCorrelationId)}</option>`).join("")}</select></label><label>Platform<select name="platform">${["linkedin", "instagram_reels", "youtube_shorts", "website"].map((value) => `<option value="${value}">${escapeHtml(label(value))}</option>`).join("")}</select></label><label>Aspect ratio<select name="aspectRatio"><option>1:1</option><option>9:16</option><option>16:9</option></select></label></div>
        <div class="two"><label>Render file<select name="fileId">${renderFiles.map(({ file }) => `<option value="${file.id}">${escapeHtml(file.path)}</option>`).join("")}</select></label><label>Caption file<select name="captionFileId"><option value="">None</option>${captions.map(({ file }) => `<option value="${file.id}">${escapeHtml(file.path)}</option>`).join("")}</select></label></div>
        <label>Accessibility notes<textarea name="accessibilityNotes" rows="3" required>Verify captions against final audio\nVerify crop preserves readable product UI</textarea></label><button class="primary" type="submit">Create draft platform variant</button></form>` : `<div class="state warning"><strong>No approved render artifact.</strong><span>Import, submit, and approve a completed render first.</span></div>`}
      ${this.workspace!.variants.length ? `<div class="card-list">${this.workspace!.variants.map((variant) => `<article><div class="card-heading"><h4>${escapeHtml(label(variant.platform))} · ${escapeHtml(variant.aspectRatio)}</h4>${pill(variant.status)}</div><p>${escapeHtml(variant.accessibilityNotes.join("; "))}</p>${reviewButtons("variant", variant.id, variant.status)}</article>`).join("")}</div>` : ""}</section>`;
  }

  private async reviewBrief(id: string, value?: string): Promise<string | undefined> {
    const reviewer = prompt("Named video brief reviewer"); if (!reviewer) return undefined;
    const note = prompt("Video brief review note"); if (!note) return undefined;
    this.workspace = await this.service.reviewBrief(this.workspaceId, id, reviewer, decision(value), note);
    return `Video brief review recorded: ${label(decision(value))}`;
  }
  private async reviewArtifact(id: string, value?: string): Promise<string | undefined> {
    const reviewer = prompt("Named render reviewer"); if (!reviewer) return undefined;
    const note = prompt("Render review note"); if (!note) return undefined;
    this.workspace = await this.service.reviewArtifact(this.workspaceId, id, reviewer, decision(value), note);
    return `Render review recorded: ${label(decision(value))}`;
  }
  private async reviewVariant(id: string, value?: string): Promise<string | undefined> {
    const reviewer = prompt("Named platform variant reviewer"); if (!reviewer) return undefined;
    const note = prompt("Platform variant review note"); if (!note) return undefined;
    this.workspace = await this.service.reviewVariant(this.workspaceId, id, reviewer, decision(value), note);
    return `Video variant review recorded: ${label(decision(value))}`;
  }
}

function providerFields(kind: string, title: string): string {
  return `<fieldset><legend>${title} provider plan</legend><div class="provider-grid"><input name="${kind}Provider" value="User selected" aria-label="${title} provider" required><input name="${kind}Model" value="User selected" aria-label="${title} model" required><input name="${kind}Cost" type="number" min="0" step="0.01" value="0" aria-label="${title} estimated cost" required><input name="${kind}Data" value="Configured outside this package" aria-label="${title} data handling" required></div></fieldset>`;
}
function reviewButtons(kind: string, id: string, status: string): string {
  if (["draft", "changes_requested", "approval_invalidated"].includes(status)) return `<button type="button" data-video-action="submit-${kind}" data-id="${id}">Submit for review</button>`;
  if (status !== "in_review") return "";
  return `<div class="button-row"><button type="button" data-video-action="review-${kind}" data-id="${id}" data-decision="approved">Approve</button><button type="button" data-video-action="review-${kind}" data-id="${id}" data-decision="changes_requested">Request changes</button><button type="button" data-video-action="review-${kind}" data-id="${id}" data-decision="rejected">Reject</button></div>`;
}
function decision(value?: string): "approved" | "changes_requested" | "rejected" {
  return value === "approved" || value === "rejected" ? value : "changes_requested";
}
function number(value: FormDataEntryValue | null, name: string): number {
  const parsed = Number(value); if (!Number.isFinite(parsed)) throw new Error(`${name} must be a number`); return parsed;
}
function parseStoryboard(value: FormDataEntryValue | null, duration: number): Omit<StoryboardScene, "id" | "order">[] {
  const records = lines(value).map((line) => line.split("|").map((part) => part.trim()));
  if (!records.length) throw new Error("At least one storyboard scene is required");
  return records.map((parts) => ({ durationSeconds: number(parts[0] ?? "", "Scene duration"), purpose: parts[1] ?? "", narration: parts[2] ?? "", visualDirection: parts[3] ?? "", shotConstraints: (parts[4] ?? "").split(";").map((item) => item.trim()).filter(Boolean) })).filter((scene) => scene.durationSeconds <= duration);
}
function parseSourceAssets(value: FormDataEntryValue | null): Omit<SourceAssetManifestEntry, "id">[] {
  return lines(value).map((line) => { const parts = line.split("|").map((part) => part.trim()); return {
    label: parts[0] ?? "", mediaType: parts[1] ?? "", sourceReference: parts[2] ?? "", owner: parts[3] ?? "", rightsBasis: parts[4] ?? "",
    sensitiveKind: (parts[5] || "none") as SourceAssetManifestEntry["sensitiveKind"], consentStatus: (parts[6] || "not_applicable") as SourceAssetManifestEntry["consentStatus"],
    allowedUses: [parts[7] ?? ""].filter(Boolean), prohibitedUses: [], disclosureRequirements: [],
  }; });
}
function parseProviders(form: FormData): VideoProviderSelection[] {
  return (["llm", "image", "video"] as const).map((kind) => ({ kind, provider: String(form.get(`${kind}Provider`)), model: String(form.get(`${kind}Model`)), estimatedCost: number(form.get(`${kind}Cost`), `${kind} estimated cost`), currency: String(form.get("currency")), dataHandlingNotes: String(form.get(`${kind}Data`)), credentialMode: "user_supplied_external", credentialsIncluded: false }));
}
function parseStages(value: FormDataEntryValue | null): VideoRunStage[] {
  return lines(value).map((line) => { const parts = line.split("|").map((part) => part.trim()); return { status: parts[0] as VideoRunStage["status"], stage: parts[1] as VideoRunStage["stage"], observedAt: parts[2] ?? "", detail: parts[3] ?? "" }; });
}
function parseFiles(value: FormDataEntryValue | null): Omit<ImportedVideoArtifact["files"][number], "id" | "sourceBriefId" | "sourcePackageId">[] {
  return lines(value).map((line) => { const parts = line.split("|").map((part) => part.trim()); return { relationship: parts[0] as ImportedVideoArtifact["files"][number]["relationship"], path: parts[1] ?? "", mimeType: parts[2] ?? "", sizeBytes: number(parts[3] ?? "", "Artifact size"), sha256: parts[4] ?? "" }; });
}
function downloadJson(filename: string, content: string): void {
  const url = URL.createObjectURL(new Blob([content], { type: "application/json" })); const anchor = document.createElement("a"); anchor.href = url; anchor.download = filename; anchor.click(); URL.revokeObjectURL(url);
}
