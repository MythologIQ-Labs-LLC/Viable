import { assertNoCredentialLikeText, buildGuidedManualSignalPayload, parseEventIntelligenceImport, readableVttTranscript } from "../../../src/imports/guided-import.js";
import type { ImportedVideoArtifact, VideoBrief, VideoProductionWorkspace } from "../../../src/video-production/domain/video-production.js";
import { LocalStorageProductWorkspaceStore } from "./local-storage-product-workspace-store.js";
import { LocalStorageVideoProductionStore } from "./local-storage-video-production-store.js";

const MAX_EVENT_FILE_BYTES = 5 * 1024 * 1024;
const MAX_VIDEO_FILE_BYTES = 256 * 1024 * 1024;
const MAX_CAPTION_FILE_BYTES = 2 * 1024 * 1024;

const productStore = new LocalStorageProductWorkspaceStore();
const videoStore = new LocalStorageVideoProductionStore();
const main = document.querySelector<HTMLElement>("#main");
const live = document.querySelector<HTMLElement>("#live-region");

let queued = false;
let enhancing = false;

type PendingMedia = Readonly<{
  render: File;
  renderHash: string;
  caption?: File;
  captionHash?: string;
}>;

type VerifiedMedia = PendingMedia & Readonly<{
  renderUrl: string;
  captionUrl?: string;
  captionTranscript?: string;
}>;

const pendingByCorrelation = new Map<string, PendingMedia>();
const mediaByArtifact = new Map<string, VerifiedMedia>();

const escapeHtml = (value: unknown): string => String(value ?? "")
  .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;").replaceAll("'", "&#039;");

function announce(message: string): void {
  if (live) live.textContent = message;
}

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
    enhanceSignalImports();
    enhanceWebdogImport();
    enhanceVideoImport();
    await enhanceVideoReview();
  } finally {
    enhancing = false;
  }
}

function enhanceSignalImports(): void {
  if (!main || main.querySelector("[data-guided-signal-imports]")) return;
  const eventForm = main.querySelector<HTMLFormElement>('form[data-form="signals-event-import"]');
  const manualForm = main.querySelector<HTMLFormElement>('form[data-form="signals-manual-import"]');
  if (!eventForm || !manualForm) return;

  const host = eventForm.parentElement;
  if (!host) return;
  const guided = document.createElement("section");
  guided.dataset.guidedSignalImports = "true";
  guided.className = "guided-imports";
  guided.innerHTML = `
    <form data-guided-import="event">
      <h4>Event Intelligence export</h4>
      <p class="guidance">Choose a local Event Intelligence JSON export. Viable validates the run and provenance before it reaches Signals.</p>
      <label>Event Intelligence export file<input name="file" type="file" accept="application/json,.json" required></label>
      <button type="submit">Validate and import event evidence</button>
      <div data-guided-error aria-live="polite"></div>
    </form>
    <form data-guided-import="manual">
      <h4>Record manual evidence</h4>
      <p class="guidance">Describe the evidence in plain language. Viable creates the adapter payload and identifiers internally.</p>
      <label>Evidence title<input name="title" required maxlength="200"></label>
      <label>What was learned<textarea name="summary" required rows="3" maxlength="1500"></textarea></label>
      <div class="two"><label>Public source URL, if available<input name="sourceUrl" type="url" placeholder="https://example.com/source"></label><label>Observed on<input name="observedAt" type="datetime-local"></label></div>
      <div class="two"><label>Confidence<select name="confidence"><option value="low">Low</option><option value="medium" selected>Medium</option><option value="high">High</option></select></label><label>Tags, comma separated<input name="tags" placeholder="event, customer, launch"></label></div>
      <button type="submit">Add unreviewed evidence proposal</button>
      <div data-guided-error aria-live="polite"></div>
    </form>`;
  host.insertBefore(guided, eventForm);

  const advanced = document.createElement("details");
  advanced.dataset.advancedRawSignalImports = "true";
  advanced.className = "advanced-imports";
  advanced.innerHTML = `<summary><strong>Advanced: raw JSON adapter imports</strong><span>For interoperable adapter payloads that are already in Viable's documented transport shapes.</span></summary>`;
  host.insertBefore(advanced, eventForm);
  advanced.append(eventForm, manualForm);
  for (const form of [eventForm, manualForm]) form.dataset.advancedRawImport = "true";
}

function enhanceWebdogImport(): void {
  if (!main) return;
  const form = main.querySelector<HTMLFormElement>('form[data-form="signals-webdog-import"]');
  if (!form || form.dataset.guidedFileFirst === "true") return;
  const file = form.querySelector<HTMLInputElement>('input[name="payloadFile"]');
  const textarea = form.querySelector<HTMLTextAreaElement>('textarea[name="payload"]');
  const fileLabel = file?.closest("label");
  const textLabel = textarea?.closest("label");
  if (!file || !textarea || !fileLabel || !textLabel) return;

  form.dataset.guidedFileFirst = "true";
  fileLabel.insertAdjacentHTML("beforebegin", `<p class="guidance guided-primary">Choose a local Webdog JSON file for ordinary use. Viable applies the existing size, credential, origin, and authorization checks.</p>`);
  const details = document.createElement("details");
  details.className = "advanced-imports compact";
  details.innerHTML = `<summary><strong>Advanced: paste raw Webdog JSON</strong><span>Use only when a local file export is unavailable.</span></summary>`;
  textLabel.replaceWith(details);
  details.append(textLabel);
  fileLabel.parentElement?.insertBefore(fileLabel, details);
}

function enhanceVideoImport(): void {
  if (!main || main.querySelector("[data-guided-video-import]")) return;
  const legacy = main.querySelector<HTMLFormElement>('form[data-form="video-import-run"]');
  if (!legacy) return;
  const packageSelect = legacy.querySelector<HTMLSelectElement>('select[name="packageId"]');
  if (!packageSelect) return;
  const importer = legacy.querySelector<HTMLInputElement>('input[name="importedBy"]')?.value ?? "";
  const options = [...packageSelect.options].map((option) => `<option value="${escapeHtml(option.value)}">${escapeHtml(option.textContent ?? option.value)}</option>`).join("");

  const guided = document.createElement("form");
  guided.dataset.guidedVideoImport = "true";
  guided.className = "guided-video-import";
  guided.innerHTML = `
    <h4>Import produced video files</h4>
    <p class="guidance">Choose the produced files. Viable derives bounded paths, media types, byte sizes, SHA-256 hashes, timestamps, stages, and a run identifier. Media bytes and local filenames are not persisted.</p>
    <div class="two"><label>Production package<select name="packageId" required>${options}</select></label><label>Named importer<input name="importedBy" value="${escapeHtml(importer)}" required></label></div>
    <label>Final video file<input name="renderFile" type="file" accept="video/mp4,video/webm,.mp4,.webm" required></label>
    <label>Caption file, when required<input name="captionFile" type="file" accept="text/vtt,.vtt"></label>
    <div class="three"><label>Production result<select name="renderStatus"><option value="completed">Completed</option><option value="partial">Partial</option></select></label><label>Production tool<input name="sourceToolId" value="manual-production" required></label><label>Tool version<input name="sourceToolVersion" value="unspecified" required></label></div>
    <label>Production notes<textarea name="notes" rows="3" required>Imported from local production files. Media bytes remain local to this review session.</textarea></label>
    <button class="primary" type="submit">Validate files and import unapproved artifact</button>
    <div data-guided-error aria-live="polite"></div>`;

  const advanced = document.createElement("details");
  advanced.dataset.advancedVideoImport = "true";
  advanced.className = "advanced-imports";
  advanced.innerHTML = `<summary><strong>Advanced: technical artifact metadata import</strong><span>For adapter operators who already have correlation IDs, stages, MIME types, byte sizes, and SHA-256 values.</span></summary>`;
  legacy.parentElement?.insertBefore(guided, legacy);
  legacy.parentElement?.insertBefore(advanced, legacy);
  advanced.append(legacy);
  legacy.dataset.advancedRawImport = "true";
}

async function enhanceVideoReview(): Promise<void> {
  if (!main) return;
  const workspaceId = productStore.activeWorkspaceId();
  if (!workspaceId) return;
  const workspace = await videoStore.load(workspaceId);
  if (!workspace.artifacts.length) return;

  for (const artifact of workspace.artifacts) {
    mapPendingMedia(artifact);
    const action = main.querySelector<HTMLButtonElement>(`button[data-id="${cssEscape(artifact.id)}"][data-video-action="submit-artifact"], button[data-id="${cssEscape(artifact.id)}"][data-video-action="review-artifact"]`);
    const card = action?.closest<HTMLElement>("article");
    if (!card) continue;
    const prior = card.querySelector<HTMLElement>("[data-local-media-review]");
    if (prior) prior.remove();
    const brief = workspace.briefs.find((item) => item.id === artifact.briefId);
    if (!brief) continue;
    const panel = document.createElement("section");
    panel.dataset.localMediaReview = artifact.id;
    panel.className = "local-media-review";
    panel.innerHTML = mediaReviewHtml(artifact, brief, mediaByArtifact.get(artifact.id));
    const controls = card.querySelector(".review-actions, .actions") ?? action?.parentElement;
    if (controls) controls.insertAdjacentElement("beforebegin", panel); else card.append(panel);
    applyApprovalGate(card, artifact, brief);
  }
}

function mediaReviewHtml(artifact: ImportedVideoArtifact, brief: VideoBrief, media: VerifiedMedia | undefined): string {
  const render = artifact.files.find((file) => file.relationship === "final_render");
  const captions = artifact.files.find((file) => file.relationship === "captions");
  const captionsNeeded = brief.captionsRequired;
  const verified = Boolean(media && render && media.renderHash === render.sha256 && (!captionsNeeded || (captions && media.captionHash === captions.sha256)));
  const provenance = `<dl class="media-provenance"><div><dt>Production package</dt><dd>${escapeHtml(artifact.packageId)}</dd></div><div><dt>Imported by</dt><dd>${escapeHtml(artifact.importedBy)}</dd></div><div><dt>Production tool</dt><dd>${escapeHtml(artifact.sourceToolId)} ${escapeHtml(artifact.sourceToolVersion)}</dd></div><div><dt>Durable media evidence</dt><dd>${render ? `${escapeHtml(render.mimeType)} · ${render.sizeBytes} bytes · SHA-256 ${escapeHtml(render.sha256)}` : "No final render metadata"}</dd></div><div><dt>Captions</dt><dd>${captions ? `${escapeHtml(captions.mimeType)} · SHA-256 ${escapeHtml(captions.sha256)}` : captionsNeeded ? "Required but missing" : "Not required"}</dd></div></dl>`;
  const attachment = media && verified ? `<div class="media-player"><video controls preload="metadata" src="${escapeHtml(media.renderUrl)}">${media.captionUrl ? `<track kind="captions" srclang="en" label="Imported captions" src="${escapeHtml(media.captionUrl)}" default>` : ""}Your desktop webview cannot play this attached video.</video>${media.captionTranscript ? `<details><summary><strong>Caption transcript</strong><span>Derived from the verified local VTT attachment.</span></summary><pre class="caption-transcript">${escapeHtml(media.captionTranscript)}</pre></details>` : ""}</div>` : "";
  return `<div class="section-heading"><div><p class="eyebrow">In-context media review</p><h5>${verified ? "Local media attachment verified" : "Attach local media to inspect before approval"}</h5></div><span class="pill ${verified ? "implemented" : "warning"}">${verified ? "hash matched" : "session attachment required"}</span></div>
    <p class="guidance">Artifact metadata is durable. Media bytes stay outside workspace storage and are attached only for this review session. On reopen, reattach the local files and Viable will verify their SHA-256 values before enabling approval.</p>
    ${provenance}${attachment}
    <form data-media-reattach="${escapeHtml(artifact.id)}"><div class="two"><label>Final video file<input name="renderFile" type="file" accept="video/mp4,video/webm,.mp4,.webm" required></label><label>Caption file${captionsNeeded ? " (required)" : ""}<input name="captionFile" type="file" accept="text/vtt,.vtt" ${captionsNeeded ? "required" : ""}></label></div><button type="submit">${verified ? "Replace and re-verify local attachments" : "Verify local review attachments"}</button><div data-guided-error aria-live="polite"></div></form>
    <section class="state ${captionsNeeded && !captions ? "error" : "offline"}"><strong>Accessibility context</strong><span>${captionsNeeded ? captions ? "The approved brief requires captions and durable caption metadata is present. A matching local VTT attachment is required for approval review." : "The approved brief requires captions, but this artifact has no durable caption record and cannot be approved." : "Captions are not required by this approved brief; reviewers should still record relevant accessibility observations in the named review note."}</span></section>`;
}

function applyApprovalGate(card: HTMLElement, artifact: ImportedVideoArtifact, brief: VideoBrief): void {
  const approve = card.querySelector<HTMLButtonElement>('button[data-video-action="review-artifact"][data-decision="approved"]');
  if (!approve || artifact.reviewStatus !== "in_review") return;
  const media = mediaByArtifact.get(artifact.id);
  const render = artifact.files.find((file) => file.relationship === "final_render");
  const captions = artifact.files.find((file) => file.relationship === "captions");
  const verified = Boolean(media && render && media.renderHash === render.sha256 && (!brief.captionsRequired || (captions && media.captionHash === captions.sha256)));
  approve.disabled = !verified;
  if (!verified) {
    approve.dataset.mediaReviewBlocked = "true";
    approve.title = "Attach and hash-verify the local render and required captions before approving this artifact";
  } else {
    delete approve.dataset.mediaReviewBlocked;
    approve.removeAttribute("title");
  }
}

function mapPendingMedia(artifact: ImportedVideoArtifact): void {
  if (mediaByArtifact.has(artifact.id)) return;
  const pending = pendingByCorrelation.get(artifact.runCorrelationId);
  if (!pending) return;
  pendingByCorrelation.delete(artifact.runCorrelationId);
  setVerifiedMedia(artifact.id, pending);
}

function setVerifiedMedia(artifactId: string, pending: PendingMedia): void {
  const existing = mediaByArtifact.get(artifactId);
  if (existing) {
    URL.revokeObjectURL(existing.renderUrl);
    if (existing.captionUrl) URL.revokeObjectURL(existing.captionUrl);
  }
  const renderUrl = URL.createObjectURL(pending.render);
  const captionUrl = pending.caption ? URL.createObjectURL(pending.caption) : undefined;
  mediaByArtifact.set(artifactId, {
    ...pending,
    renderUrl,
    ...(captionUrl ? { captionUrl } : {}),
  });
  if (pending.caption) {
    void pending.caption.text().then((text) => {
      const current = mediaByArtifact.get(artifactId);
      if (!current || current.caption !== pending.caption) return;
      mediaByArtifact.set(artifactId, { ...current, captionTranscript: readableVttTranscript(text) });
      queueEnhance();
    });
  }
}

async function submitGuidedSignal(form: HTMLFormElement, kind: "event" | "manual"): Promise<void> {
  clearGuidedError(form);
  if (kind === "event") {
    const file = form.querySelector<HTMLInputElement>('input[name="file"]')?.files?.[0];
    if (!file) throw new Error("Choose an Event Intelligence JSON export file.");
    if (file.size > MAX_EVENT_FILE_BYTES) throw new Error("Event Intelligence files are limited to 5 MiB. Export a smaller run or use a bounded adapter workflow.");
    if (!/\.json$/i.test(file.name) && file.type !== "application/json") throw new Error("Choose a JSON Event Intelligence export.");
    const parsed = parseEventIntelligenceImport(await file.text());
    submitLegacyPayload('form[data-form="signals-event-import"]', JSON.stringify(parsed));
    return;
  }
  const data = new FormData(form);
  const observed = String(data.get("observedAt") ?? "").trim();
  const tags = String(data.get("tags") ?? "").split(",").map((item) => item.trim()).filter(Boolean);
  const payload = buildGuidedManualSignalPayload({
    title: String(data.get("title") ?? ""), summary: String(data.get("summary") ?? ""), confidence: String(data.get("confidence")) as "low" | "medium" | "high", tags,
    ...(String(data.get("sourceUrl") ?? "").trim() ? { sourceUrl: String(data.get("sourceUrl")) } : {}),
    ...(observed ? { observedAt: new Date(observed).toISOString() } : {}),
  });
  submitLegacyPayload('form[data-form="signals-manual-import"]', payload);
}

function submitLegacyPayload(selector: string, payload: string): void {
  if (!main) throw new Error("The authoritative import form is unavailable. Reopen Signals and try again.");
  const legacy = main.querySelector<HTMLFormElement>(selector);
  const textarea = legacy?.querySelector<HTMLTextAreaElement>('textarea[name="payload"]');
  if (!legacy || !textarea) throw new Error("The authoritative import form is unavailable. Reopen Signals and try again.");
  textarea.value = payload;
  legacy.requestSubmit();
}

async function submitGuidedVideo(form: HTMLFormElement): Promise<void> {
  clearGuidedError(form);
  if (!main) throw new Error("Studio is unavailable.");
  const workspaceId = productStore.activeWorkspaceId();
  if (!workspaceId) throw new Error("Create or restore a Product workspace before importing video.");
  const workspace = await videoStore.load(workspaceId);
  const data = new FormData(form);
  const packageId = String(data.get("packageId") ?? "");
  const productionPackage = workspace.packages.find((item) => item.id === packageId);
  if (!productionPackage) throw new Error("Choose a production package that still exists in this workspace.");
  const brief = workspace.briefs.find((item) => item.id === productionPackage.briefId);
  if (!brief) throw new Error("The selected production package no longer has its video brief.");
  const render = form.querySelector<HTMLInputElement>('input[name="renderFile"]')?.files?.[0];
  const caption = form.querySelector<HTMLInputElement>('input[name="captionFile"]')?.files?.[0];
  if (!render) throw new Error("Choose the final MP4 or WebM render.");
  validateRenderFile(render);
  if (caption) validateCaptionFile(caption);
  if (brief.captionsRequired && !caption) throw new Error("This approved video brief requires a VTT caption file. Choose the caption file before importing.");

  const sourceToolId = String(data.get("sourceToolId") ?? "").trim();
  const sourceToolVersion = String(data.get("sourceToolVersion") ?? "").trim();
  const notes = String(data.get("notes") ?? "").trim();
  assertNoCredentialLikeText(`${sourceToolId}\n${sourceToolVersion}\n${notes}`, "Video import details");

  const renderHash = await sha256(render);
  const captionHash = caption ? await sha256(caption) : undefined;
  const correlation = `guided-${crypto.randomUUID()}`;
  const observedAt = new Date().toISOString();
  const renderStatus = String(data.get("renderStatus")) === "partial" ? "partial" : "completed";
  const stages = renderStatus === "completed"
    ? `completed | final_assembly | ${observedAt} | Final render selected for import\ncompleted | completed | ${observedAt} | Guided local-file import completed`
    : `completed | final_assembly | ${observedAt} | Partial production output selected for import`;
  const renderMime = render.type || (render.name.toLowerCase().endsWith(".webm") ? "video/webm" : "video/mp4");
  const renderPath = renderMime === "video/webm" ? "review/final-render.webm" : "review/final-render.mp4";
  const files = [`final_render | ${renderPath} | ${renderMime} | ${render.size} | ${renderHash}`];
  if (caption && captionHash) files.push(`captions | review/captions.vtt | text/vtt | ${caption.size} | ${captionHash}`);

  const legacy = main.querySelector<HTMLFormElement>('form[data-form="video-import-run"]');
  if (!legacy) throw new Error("The authoritative video import form is unavailable. Reopen Studio and try again.");
  setLegacyValue(legacy, "packageId", packageId);
  setLegacyValue(legacy, "sourceToolId", sourceToolId);
  setLegacyValue(legacy, "sourceToolVersion", sourceToolVersion);
  setLegacyValue(legacy, "runCorrelationId", correlation);
  setLegacyValue(legacy, "renderStatus", renderStatus);
  setLegacyValue(legacy, "importedBy", String(data.get("importedBy") ?? ""));
  setLegacyValue(legacy, "stages", stages);
  setLegacyValue(legacy, "files", files.join("\n"));
  setLegacyValue(legacy, "redactedLog", notes);
  setLegacyValue(legacy, "failureClass", "");
  setLegacyValue(legacy, "failureDetail", "");
  pendingByCorrelation.set(correlation, { render, renderHash, ...(caption ? { caption } : {}), ...(captionHash ? { captionHash } : {}) });
  legacy.requestSubmit();
}

async function submitMediaReattach(form: HTMLFormElement, artifactId: string): Promise<void> {
  clearGuidedError(form);
  const workspaceId = productStore.activeWorkspaceId();
  if (!workspaceId) throw new Error("The active workspace is unavailable.");
  const workspace = await videoStore.load(workspaceId);
  const artifact = workspace.artifacts.find((item) => item.id === artifactId);
  if (!artifact) throw new Error("The imported video artifact no longer exists.");
  const brief = workspace.briefs.find((item) => item.id === artifact.briefId);
  if (!brief) throw new Error("The video brief for this artifact no longer exists.");
  const expectedRender = artifact.files.find((file) => file.relationship === "final_render");
  const expectedCaption = artifact.files.find((file) => file.relationship === "captions");
  if (!expectedRender) throw new Error("This artifact has no final-render metadata and cannot be media-verified.");
  const render = form.querySelector<HTMLInputElement>('input[name="renderFile"]')?.files?.[0];
  const caption = form.querySelector<HTMLInputElement>('input[name="captionFile"]')?.files?.[0];
  if (!render) throw new Error("Choose the local final render to verify.");
  validateRenderFile(render);
  const renderHash = await sha256(render);
  if (renderHash !== expectedRender.sha256.toLowerCase() || render.size !== expectedRender.sizeBytes) throw new Error("The selected video does not match the durable artifact hash and byte size. Choose the exact file that was imported.");
  let captionHash: string | undefined;
  if (brief.captionsRequired || caption) {
    if (!expectedCaption) throw new Error("The approved brief requires captions but the artifact has no caption metadata. This artifact needs correction before approval.");
    if (!caption) throw new Error("Choose the local VTT caption file required by this approved brief.");
    validateCaptionFile(caption);
    captionHash = await sha256(caption);
    if (captionHash !== expectedCaption.sha256.toLowerCase() || caption.size !== expectedCaption.sizeBytes) throw new Error("The selected caption file does not match the durable artifact hash and byte size.");
  }
  setVerifiedMedia(artifactId, { render, renderHash, ...(caption ? { caption } : {}), ...(captionHash ? { captionHash } : {}) });
  announce("Local media attachment hash matched the durable artifact metadata");
  queueEnhance();
}

function setLegacyValue(form: HTMLFormElement, name: string, value: string): void {
  const control = form.elements.namedItem(name);
  if (control instanceof HTMLInputElement || control instanceof HTMLTextAreaElement || control instanceof HTMLSelectElement) control.value = value;
  else throw new Error(`Authoritative video import control ${name} is unavailable.`);
}

function validateRenderFile(file: File): void {
  if (file.size <= 0) throw new Error("The selected video file is empty.");
  if (file.size > MAX_VIDEO_FILE_BYTES) throw new Error("Video review files are limited to 256 MiB for local hash verification.");
  const name = file.name.toLowerCase();
  const allowed = file.type === "video/mp4" || file.type === "video/webm" || name.endsWith(".mp4") || name.endsWith(".webm");
  if (!allowed) throw new Error("Choose an MP4 or WebM final render.");
}

function validateCaptionFile(file: File): void {
  if (file.size <= 0) throw new Error("The selected caption file is empty.");
  if (file.size > MAX_CAPTION_FILE_BYTES) throw new Error("Caption files are limited to 2 MiB.");
  if (file.type !== "text/vtt" && !file.name.toLowerCase().endsWith(".vtt")) throw new Error("Choose a WebVTT (.vtt) caption file.");
}

async function sha256(file: File): Promise<string> {
  if (!crypto.subtle) throw new Error("This desktop webview cannot compute SHA-256. Use the advanced import only in an environment that can provide verified metadata.");
  const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function clearGuidedError(form: HTMLFormElement): void {
  form.querySelector<HTMLElement>("[data-guided-error]")?.replaceChildren();
}

function guidedFailure(form: HTMLFormElement, error: unknown): void {
  const detail = error instanceof Error ? error.message : "Unknown guided import error";
  const region = form.querySelector<HTMLElement>("[data-guided-error]");
  if (region) region.innerHTML = `<section class="state error" role="alert" tabindex="-1"><strong>This input was not imported.</strong><span>${escapeHtml(detail)} Your selected files and entered values remain on this screen.</span></section>`;
  region?.querySelector<HTMLElement>("[role=alert]")?.focus();
  announce(`Guided import failed: ${detail}`);
}

function cssEscape(value: string): string {
  return globalThis.CSS?.escape ? globalThis.CSS.escape(value) : value.replaceAll('"', '\\"');
}

new MutationObserver(queueEnhance).observe(main ?? document.body, { childList: true, subtree: true });
queueEnhance();

document.addEventListener("submit", (event) => {
  const form = event.target;
  if (!(form instanceof HTMLFormElement)) return;
  const guided = form.dataset.guidedImport;
  if (guided === "event" || guided === "manual") {
    event.preventDefault();
    event.stopImmediatePropagation();
    void submitGuidedSignal(form, guided).catch((error: unknown) => guidedFailure(form, error));
    return;
  }
  if (form.dataset.guidedVideoImport === "true") {
    event.preventDefault();
    event.stopImmediatePropagation();
    void submitGuidedVideo(form).catch((error: unknown) => guidedFailure(form, error));
    return;
  }
  const artifactId = form.dataset.mediaReattach;
  if (artifactId) {
    event.preventDefault();
    event.stopImmediatePropagation();
    void submitMediaReattach(form, artifactId).catch((error: unknown) => guidedFailure(form, error));
  }
}, true);

window.addEventListener("beforeunload", () => {
  for (const media of mediaByArtifact.values()) {
    URL.revokeObjectURL(media.renderUrl);
    if (media.captionUrl) URL.revokeObjectURL(media.captionUrl);
  }
});
