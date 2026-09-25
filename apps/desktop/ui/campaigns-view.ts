import type { ProductClaim } from "../../../src/product-core/domain/claim.js";
import type { ProductWorkspace } from "../../../src/product-core/domain/workspace.js";
import { ProductCoreService } from "../../../src/product-core/services/product-core-service.js";
import type {
  CampaignBrief,
  CampaignWorkspace,
  CanonicalAsset,
  ChannelKind,
  ChannelVariant,
  ManualExportPackage,
} from "../../../src/campaigns/domain/campaign.js";
import { CampaignService } from "../../../src/campaigns/services/campaign-service.js";
import { LocalStorageProductWorkspaceStore } from "./local-storage-product-workspace-store.js";
import { LocalStorageCampaignWorkspaceStore } from "./local-storage-campaign-workspace-store.js";

const CHANNELS: readonly ChannelKind[] = ["linkedin", "website", "github_release"];
const CHANNEL_LABELS: Record<ChannelKind, string> = {
  linkedin: "LinkedIn",
  website: "Website",
  github_release: "GitHub release",
};

const escapeHtml = (value: unknown): string => String(value ?? "")
  .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;").replaceAll("'", "&#039;");
const lineValues = (value: FormDataEntryValue | null): string[] =>
  String(value ?? "").split(/[,\n]/).map((item) => item.trim()).filter(Boolean);
const checkedValues = (form: FormData, name: string): string[] => form.getAll(name).map(String).filter(Boolean);
const humanDate = (value?: string): string => value ? new Date(value).toLocaleString() : "Not reviewed";
const label = (value: string): string => value.replaceAll("_", " ");
const tone = (status: string): string =>
  ["approved", "manual_export_ready"].includes(status) ? "implemented"
  : ["draft", "in_review", "changes_requested", "approval_invalidated", "proposed"].includes(status) ? "warning"
  : ["rejected", "error"].includes(status) ? "error"
  : "neutral";
const pill = (value: string): string => `<span class="pill ${tone(value)}">${escapeHtml(label(value))}</span>`;

export class CampaignsViewController {
  private readonly productStore = new LocalStorageProductWorkspaceStore();
  private readonly campaignStore = new LocalStorageCampaignWorkspaceStore();
  private readonly productService = new ProductCoreService(this.productStore);
  private readonly campaignService = new CampaignService(this.campaignStore, this.productStore);
  private product: ProductWorkspace | undefined;
  private campaigns: CampaignWorkspace | undefined;
  private failure: string | undefined;

  constructor(
    readonly workspaceId: string,
    private readonly defaultOwner: string,
  ) {}

  async load(): Promise<void> {
    this.product = await this.productStore.load(this.workspaceId);
    this.campaigns = await this.campaignStore.load(this.workspaceId) ?? emptyCampaignWorkspace(this.workspaceId);
  }

  render(page: "campaigns" | "studio"): string {
    if (!this.product || !this.campaigns) {
      return `<section class="state loading" role="status"><strong>Loading campaign workspace</strong><span>Reading Product Core and campaign authority from this desktop profile.</span></section>`;
    }
    return page === "studio" ? this.renderStudio() : this.renderCampaigns();
  }

  async submit(formElement: HTMLFormElement): Promise<string | undefined> {
    const form = new FormData(formElement);
    const kind = formElement.dataset.form;
    this.failure = undefined;
    try {
      if (kind === "campaign-add-claim") {
        const evidenceIds = checkedValues(form, "evidenceIds");
        this.product = await this.productService.addClaim(this.workspaceId, {
          statement: String(form.get("statement")),
          evidenceIds,
          prohibitedContexts: checkedValues(form, "prohibitedContexts"),
          rationale: String(form.get("rationale")),
        });
        return "Product Core claim created for named review";
      }
      if (kind === "campaign-create-brief") {
        const audienceKind = String(form.get("audienceKind")) as "selected_icp" | "test_audience";
        const icpHypothesisId = audienceKind === "selected_icp" ? String(form.get("icpHypothesisId")) : undefined;
        this.campaigns = await this.campaignService.createBrief(this.workspaceId, {
          title: String(form.get("title")),
          objective: String(form.get("objective")),
          primaryOutcome: String(form.get("primaryOutcome")),
          primaryAudience: String(form.get("primaryAudience")),
          audienceKind,
          ...(icpHypothesisId ? { icpHypothesisId } : {}),
          problem: String(form.get("problem")),
          trigger: String(form.get("trigger")),
          offer: String(form.get("offer")),
          messageHierarchy: lineValues(form.get("messageHierarchy")),
          proof: lineValues(form.get("proof")),
          claimIds: checkedValues(form, "claimIds"),
          evidenceIds: checkedValues(form, "evidenceIds"),
          callToAction: String(form.get("callToAction")),
          channels: checkedValues(form, "channels") as ChannelKind[],
          assetPlan: lineValues(form.get("assetPlan")),
          owner: String(form.get("owner")),
          successMeasures: lineValues(form.get("successMeasures")),
          dependencies: lineValues(form.get("dependencies")),
        });
        return "Campaign brief created as a draft";
      }
      if (kind === "campaign-create-asset") {
        this.campaigns = await this.campaignService.createCanonicalAsset(this.workspaceId, {
          campaignId: String(form.get("campaignId")),
          title: String(form.get("title")),
          body: String(form.get("body")),
          owner: String(form.get("owner")),
          origin: String(form.get("origin")) as "human" | "generated_suggestion",
          rights: lineValues(form.get("rights")),
          accessibilityRequirements: lineValues(form.get("accessibilityRequirements")),
          disclosureRequirements: lineValues(form.get("disclosureRequirements")),
        });
        return "Canonical asset created as a draft";
      }
      if (kind === "campaign-revise-asset") {
        this.campaigns = await this.campaignService.reviseCanonicalAsset(
          this.workspaceId,
          String(form.get("assetId")),
          String(form.get("editor")),
          String(form.get("body")),
          String(form.get("note")),
        );
        return "Canonical asset revision saved and prior approval invalidated when required";
      }
      if (kind === "campaign-comment-asset") {
        this.campaigns = await this.campaignService.commentOnAsset(
          this.workspaceId,
          String(form.get("assetId")),
          String(form.get("author")),
          String(form.get("body")),
        );
        return "Asset review comment recorded";
      }
      if (kind === "campaign-create-variant") {
        this.campaigns = await this.campaignService.createVariant(
          this.workspaceId,
          String(form.get("assetId")),
          String(form.get("channel")) as ChannelKind,
          String(form.get("body")),
          lineValues(form.get("constraints")),
        );
        return "Channel variant created as a draft";
      }
      if (kind === "campaign-create-export") {
        const campaignId = String(form.get("campaignId"));
        const assetId = String(form.get("assetId"));
        if (!campaignId || !assetId) throw new Error("An approved campaign and asset family are required");
        this.campaigns = await this.campaignService.createManualExport(
          this.workspaceId,
          campaignId,
          assetId,
          String(form.get("creator")),
          checkedValues(form, "exportChannels") as ChannelKind[],
        );
        return "Manual export package created for the selected channels without publishing authority";
      }
      return undefined;
    } catch (error) {
      this.failure = error instanceof Error ? error.message : "Unknown campaign workflow error";
      throw error;
    } finally {
      await this.reloadProduct();
    }
  }

  async click(button: HTMLButtonElement): Promise<string | undefined> {
    const action = button.dataset.campaignAction;
    const id = button.dataset.id;
    this.failure = undefined;
    try {
      if (action === "recover") {
        await this.load();
        return "Saved campaign workspace restored";
      }
      if (action === "approve-claim" && id) {
        const reviewer = prompt("Named Product Core claim reviewer");
        if (!reviewer) return undefined;
        this.product = await this.productService.approveClaim(this.workspaceId, id, reviewer);
        return "Product Core claim approved with reviewed evidence";
      }
      if (action === "submit-campaign" && id) {
        this.campaigns = await this.campaignService.submitCampaign(this.workspaceId, id);
        return "Campaign submitted for named review";
      }
      if (action === "review-campaign" && id) {
        return await this.reviewCampaign(id, button.dataset.decision);
      }
      if (action === "submit-asset" && id) {
        this.campaigns = await this.campaignService.submitAsset(this.workspaceId, id);
        return "Canonical asset submitted for named review";
      }
      if (action === "review-asset" && id) {
        return await this.reviewAsset(id, button.dataset.decision);
      }
      if (action === "submit-variant" && id) {
        this.campaigns = await this.campaignService.submitVariant(this.workspaceId, id);
        return "Channel variant submitted for named review";
      }
      if (action === "review-variant" && id) {
        return await this.reviewVariant(id, button.dataset.decision);
      }
      if (action === "detect-claim-impact") {
        this.campaigns = await this.campaignService.detectClaimImpact(this.workspaceId);
        return "Product Core claim impact review completed";
      }
      if (action === "download-export" && id) {
        const record = this.campaigns?.exports.find((item) => item.id === id);
        if (!record) throw new Error("Manual export package not found");
        downloadManifest(record);
        return "Manual export manifest downloaded";
      }
      return undefined;
    } catch (error) {
      this.failure = error instanceof Error ? error.message : "Unknown campaign workflow error";
      throw error;
    } finally {
      await this.reloadProduct();
    }
  }

  private async reviewCampaign(id: string, value?: string): Promise<string | undefined> {
    const decision = asDecision(value);
    const reviewer = prompt("Named campaign reviewer");
    if (!reviewer) return undefined;
    const note = prompt("Campaign review note");
    if (!note) return undefined;
    this.campaigns = await this.campaignService.reviewCampaign(this.workspaceId, id, reviewer, decision, note);
    return `Campaign review recorded: ${label(decision)}`;
  }

  private async reviewAsset(id: string, value?: string): Promise<string | undefined> {
    const decision = asDecision(value);
    const reviewer = prompt("Named canonical asset reviewer");
    if (!reviewer) return undefined;
    const note = prompt("Canonical asset review note");
    if (!note) return undefined;
    this.campaigns = await this.campaignService.reviewAsset(this.workspaceId, id, reviewer, decision, note);
    return `Canonical asset review recorded: ${label(decision)}`;
  }

  private async reviewVariant(id: string, value?: string): Promise<string | undefined> {
    const decision = asDecision(value);
    const reviewer = prompt("Named channel variant reviewer");
    if (!reviewer) return undefined;
    const note = prompt("Channel variant review note");
    if (!note) return undefined;
    this.campaigns = await this.campaignService.reviewVariant(this.workspaceId, id, reviewer, decision, note);
    return `Channel variant review recorded: ${label(decision)}`;
  }

  private renderCampaigns(): string {
    const product = this.product!;
    const workspace = this.campaigns!;
    const reviewedEvidence = product.evidence.filter((item) => item.reviewStatus === "reviewed" && item.origin !== "generated_suggestion");
    const approvedClaims = product.claims.filter((item) => item.status === "approved");
    const selectedIcp = product.icpHypotheses.find((item) => item.status === "selected" && item.reviewStatus === "reviewed");
    const blocked = reviewedEvidence.length === 0 || approvedClaims.length === 0;
    return `
      <header class="hero compact"><div><p class="eyebrow">Campaigns</p><h2>One outcome. One audience. Traceable truth.</h2>
        <p>Create a focused campaign brief from reviewed evidence and approved Product Core claims. Campaign approval remains separate from publishing or delivery.</p></div>${pill("local only")}</header>
      ${this.failureState("campaigns")}
      <section class="state offline"><strong>Offline-ready campaign authority.</strong><span>This workflow uses local Product Core records and manual export. No destination, account, credential, or publishing adapter is involved.</span></section>
      <section class="metrics" aria-label="Campaign readiness">
        <article><span>Reviewed evidence</span><strong>${reviewedEvidence.length}</strong><small>Generated suggestions excluded</small></article>
        <article><span>Approved claims</span><strong>${approvedClaims.length}</strong><small>Product Core authority</small></article>
        <article><span>Campaign briefs</span><strong>${workspace.campaigns.length}</strong><small>${workspace.campaigns.filter((item) => item.status === "approved").length} approved</small></article>
        <article><span>Primary ICP</span><strong>${selectedIcp ? "Ready" : "Optional"}</strong><small>${selectedIcp ? escapeHtml(selectedIcp.name) : "Use a deliberate test audience"}</small></article>
      </section>
      ${this.claimReadiness(product, reviewedEvidence, approvedClaims)}
      <section class="panel" aria-labelledby="campaign-create-heading">
        <div class="section-heading"><div><p class="eyebrow">Campaign brief</p><h3 id="campaign-create-heading">Create a governed campaign</h3></div>${pill(blocked ? "blocked" : "ready")}</div>
        <p class="guidance">A campaign must declare one primary outcome and one primary audience. Claims and evidence are snapshotted from Product Core and revalidated during review.</p>
        ${blocked ? `<div class="state warning"><strong>Campaign creation is intentionally blocked.</strong><span>Review evidence and approve at least one Product Core claim first.</span></div>` : this.campaignForm(product, reviewedEvidence, approvedClaims, selectedIcp)}
      </section>
      <section class="panel" aria-labelledby="campaign-list-heading">
        <div class="section-heading"><div><p class="eyebrow">Review queue</p><h3 id="campaign-list-heading">Campaign briefs</h3></div>${pill(`${workspace.campaigns.length} records`)}</div>
        <div class="cards">${workspace.campaigns.length ? workspace.campaigns.slice().reverse().map((campaign) => this.campaignCard(campaign)).join("") : `<div class="state empty"><strong>No campaign briefs yet.</strong><span>Create a focused brief after Product Core evidence and claims are ready.</span></div>`}</div>
      </section>`;
  }

  private claimReadiness(product: ProductWorkspace, reviewedEvidence: ProductWorkspace["evidence"], approvedClaims: readonly ProductClaim[]): string {
    const proposedClaims = product.claims.filter((item) => item.status === "proposed");
    return `<section class="panel" aria-labelledby="claim-heading">
      <div class="section-heading"><div><p class="eyebrow">Product Core prerequisite</p><h3 id="claim-heading">Create and approve campaign claims</h3></div>${pill(`${approvedClaims.length} approved`)}</div>
      <p class="guidance">Campaigns cannot invent claims. Proposed claims require reviewed, non-generated evidence and a named Product Core reviewer before use.</p>
      ${reviewedEvidence.length === 0 ? `<div class="state warning"><strong>No reviewed evidence is available.</strong><span>Use the Product workflow to record and accept evidence before proposing a claim.</span></div>` : `<details><summary>Propose a Product Core claim</summary><form data-form="campaign-add-claim">
        <label>Claim statement<textarea name="statement" required rows="3" placeholder="A precise statement the current product can support."></textarea></label>
        <label>Rationale<textarea name="rationale" required rows="2" placeholder="Why this claim is useful and appropriately bounded."></textarea></label>
        <fieldset class="dimension"><legend>Supporting reviewed evidence</legend>${reviewedEvidence.map((item) => `<label><input type="checkbox" name="evidenceIds" value="${item.id}"> ${escapeHtml(item.title)}</label>`).join("")}</fieldset>
        <fieldset class="dimension"><legend>Prohibited channel contexts</legend>${CHANNELS.map((channel) => `<label><input type="checkbox" name="prohibitedContexts" value="${channel}"> ${CHANNEL_LABELS[channel]}</label>`).join("")}</fieldset>
        <button class="primary" type="submit">Create proposed claim</button>
      </form></details>`}
      <div class="cards">${product.claims.length ? product.claims.map((claim) => `<article class="record"><div class="record-top"><h4>${escapeHtml(claim.statement)}</h4>${pill(claim.status)}</div><p>${escapeHtml(claim.rationale ?? "No rationale recorded")}</p><small>${claim.evidenceIds.length} evidence references · Revision ${claim.revision}</small>${claim.status === "proposed" ? `<div class="actions"><button type="button" data-campaign-action="approve-claim" data-id="${claim.id}">Approve with named review</button></div>` : ""}</article>`).join("") : `<div class="state empty"><strong>No claims yet.</strong><span>Propose a precise claim after reviewed evidence exists.</span></div>`}</div>
      ${proposedClaims.length ? `<div class="state warning"><strong>${proposedClaims.length} proposed claim${proposedClaims.length === 1 ? "" : "s"} await review.</strong><span>Draft claims cannot enter a campaign.</span></div>` : ""}
    </section>`;
  }

  private campaignForm(product: ProductWorkspace, evidence: ProductWorkspace["evidence"], claims: readonly ProductClaim[], selectedIcp?: ProductWorkspace["icpHypotheses"][number]): string {
    return `<form data-form="campaign-create-brief">
      <div class="two"><label>Campaign title<input name="title" required></label><label>Named owner<input name="owner" required value="${escapeHtml(this.defaultOwner)}"></label></div>
      <label>Objective<textarea name="objective" required rows="2" placeholder="What is this campaign trying to change?"></textarea></label>
      <div class="two"><label>One primary outcome<input name="primaryOutcome" required></label><label>One primary audience<input name="primaryAudience" required value="${selectedIcp ? escapeHtml(selectedIcp.name) : ""}"></label></div>
      <div class="two"><label>Audience authority<select name="audienceKind">${selectedIcp ? `<option value="selected_icp">Selected ICP</option>` : ""}<option value="test_audience">Deliberate test audience</option></select></label>
      <label>Selected ICP reference<select name="icpHypothesisId"><option value="">No ICP reference</option>${product.icpHypotheses.filter((item) => item.status === "selected" && item.reviewStatus === "reviewed").map((item) => `<option value="${item.id}">${escapeHtml(item.name)}</option>`).join("")}</select></label></div>
      <div class="two"><label>Problem<textarea name="problem" required rows="3"></textarea></label><label>Trigger<textarea name="trigger" required rows="3"></textarea></label></div>
      <div class="two"><label>Offer<textarea name="offer" required rows="3"></textarea></label><label>Call to action<textarea name="callToAction" required rows="3"></textarea></label></div>
      <div class="two"><label>Message hierarchy, one per line<textarea name="messageHierarchy" required rows="4"></textarea></label><label>Proof points, one per line<textarea name="proof" required rows="4"></textarea></label></div>
      <fieldset class="dimension"><legend>Approved Product Core claims</legend>${claims.map((claim) => `<label><input type="checkbox" name="claimIds" value="${claim.id}"> ${escapeHtml(claim.statement)}</label>`).join("")}</fieldset>
      <fieldset class="dimension"><legend>Reviewed evidence packet</legend>${evidence.map((item) => `<label><input type="checkbox" name="evidenceIds" value="${item.id}"> ${escapeHtml(item.title)}</label>`).join("")}</fieldset>
      <fieldset class="dimension"><legend>Channels</legend>${CHANNELS.map((channel) => `<label><input type="checkbox" name="channels" value="${channel}" checked> ${CHANNEL_LABELS[channel]}</label>`).join("")}</fieldset>
      <div class="three"><label>Asset plan<textarea name="assetPlan" required rows="3"></textarea></label><label>Success measures<textarea name="successMeasures" required rows="3"></textarea></label><label>Dependencies<textarea name="dependencies" rows="3"></textarea></label></div>
      <button class="primary" type="submit">Create campaign draft</button>
    </form>`;
  }

  private campaignCard(campaign: CampaignBrief): string {
    return `<article class="record">
      <div class="record-top"><h4>${escapeHtml(campaign.title)}</h4><div>${pill(campaign.status)} ${pill(campaign.audienceKind)}</div></div>
      <p>${escapeHtml(campaign.objective)}</p>
      <dl><div><dt>Primary outcome</dt><dd>${escapeHtml(campaign.primaryOutcome)}</dd></div><div><dt>Primary audience</dt><dd>${escapeHtml(campaign.primaryAudience)}</dd></div><div><dt>Channels</dt><dd>${escapeHtml(campaign.channels.map((channel) => CHANNEL_LABELS[channel]).join(" · "))}</dd></div><div><dt>Claims</dt><dd>${campaign.claimReferences.length}</dd></div><div><dt>Reviewed evidence</dt><dd>${campaign.evidenceIds.length}</dd></div><div><dt>Owner</dt><dd>${escapeHtml(campaign.owner)}</dd></div><div><dt>Updated</dt><dd>${humanDate(campaign.updatedAt)}</dd></div></dl>
      <details><summary>Traceability and message</summary><p><strong>Problem:</strong> ${escapeHtml(campaign.problem)}</p><p><strong>Trigger:</strong> ${escapeHtml(campaign.trigger)}</p><p><strong>Offer:</strong> ${escapeHtml(campaign.offer)}</p><p><strong>Message hierarchy:</strong> ${escapeHtml(campaign.messageHierarchy.join(" · "))}</p><p><strong>Claim snapshots:</strong> ${escapeHtml(campaign.claimReferences.map((item) => `${item.statement} (revision ${item.claimRevision})`).join(" · "))}</p></details>
      <div class="actions">${["draft", "changes_requested", "approval_invalidated"].includes(campaign.status) ? `<button type="button" data-campaign-action="submit-campaign" data-id="${campaign.id}">Submit for review</button>` : ""}${campaign.status === "in_review" ? reviewButtons("campaign", campaign.id) : ""}</div>
      ${campaign.reviewNote ? `<p class="guidance">Review: ${escapeHtml(campaign.reviewNote)} · ${escapeHtml(campaign.reviewedBy ?? "Unknown reviewer")}</p>` : ""}
    </article>`;
  }

  private renderStudio(): string {
    const workspace = this.campaigns!;
    const approvedCampaigns = workspace.campaigns.filter((item) => item.status === "approved");
    const approvedAssets = workspace.assets.filter((item) => item.status === "approved");
    return `
      <header class="hero compact"><div><p class="eyebrow">Studio</p><h2>Canonical first. Channel second.</h2>
        <p>Create one governed asset, adapt it into channel variants, compare constraints, review each version, and export manually without granting publishing authority.</p></div>${pill("human reviewed")}</header>
      ${this.failureState("studio")}
      <section class="state offline"><strong>Manual production remains first-class.</strong><span>Export packages are local artifacts. They are not scheduled, published, delivered, or provider-verified.</span></section>
      <section class="metrics" aria-label="Studio status">
        <article><span>Approved campaigns</span><strong>${approvedCampaigns.length}</strong><small>Required for canonical assets</small></article>
        <article><span>Canonical assets</span><strong>${workspace.assets.length}</strong><small>${approvedAssets.length} approved</small></article>
        <article><span>Channel variants</span><strong>${workspace.variants.length}</strong><small>${workspace.variants.filter((item) => item.status === "approved").length} approved</small></article>
        <article><span>Manual exports</span><strong>${workspace.exports.length}</strong><small>Never publishing approval</small></article>
      </section>
      <section class="panel" aria-labelledby="asset-create-heading">
        <div class="section-heading"><div><p class="eyebrow">Canonical asset</p><h3 id="asset-create-heading">Create the source of meaning</h3></div>${pill(approvedCampaigns.length ? "ready" : "blocked")}</div>
        ${approvedCampaigns.length ? this.assetForm(approvedCampaigns) : `<div class="state empty"><strong>No approved campaign is available.</strong><span>Approve a campaign brief before creating a canonical asset.</span></div>`}
      </section>
      <section class="panel" aria-labelledby="asset-list-heading">
        <div class="section-heading"><div><p class="eyebrow">Asset review</p><h3 id="asset-list-heading">Canonical assets</h3></div><button type="button" data-campaign-action="detect-claim-impact">Recheck Product Core claim impact</button></div>
        <div class="cards">${workspace.assets.length ? workspace.assets.slice().reverse().map((asset) => this.assetCard(asset)).join("") : `<div class="state empty"><strong>No canonical assets yet.</strong><span>Create one after a campaign brief receives named approval.</span></div>`}</div>
      </section>
      ${this.variantSection(approvedAssets)}
      ${this.exportSection()}`;
  }

  private assetForm(campaigns: readonly CampaignBrief[]): string {
    return `<form data-form="campaign-create-asset">
      <div class="two"><label>Approved campaign<select name="campaignId">${campaigns.map((item) => `<option value="${item.id}">${escapeHtml(item.title)}</option>`).join("")}</select></label><label>Asset title<input name="title" required></label></div>
      <label>Canonical body<textarea name="body" required rows="8" placeholder="The channel-neutral source asset."></textarea></label>
      <div class="two"><label>Named owner<input name="owner" required value="${escapeHtml(this.defaultOwner)}"></label><label>Origin<select name="origin"><option value="human">Human authored</option><option value="generated_suggestion">Generated suggestion requiring review</option></select></label></div>
      <div class="three"><label>Rights, one per line<textarea name="rights" required rows="4" placeholder="Original copy owned by workspace"></textarea></label><label>Accessibility requirements<textarea name="accessibilityRequirements" required rows="4" placeholder="Plain language\nMeaning is not color-only"></textarea></label><label>Disclosure requirements<textarea name="disclosureRequirements" rows="4"></textarea></label></div>
      <button class="primary" type="submit">Create canonical asset draft</button>
    </form>`;
  }

  private assetCard(asset: CanonicalAsset): string {
    const current = asset.versions.at(-1)!;
    return `<article class="record">
      <div class="record-top"><h4>${escapeHtml(asset.title)}</h4><div>${pill(asset.status)} ${pill(asset.origin)}</div></div>
      <p>${escapeHtml(current.body)}</p>
      <dl><div><dt>Version</dt><dd>${current.version}</dd></div><div><dt>Audience</dt><dd>${escapeHtml(asset.audience)}</dd></div><div><dt>Rights</dt><dd>${escapeHtml(asset.rights.join(" · "))}</dd></div><div><dt>Accessibility</dt><dd>${escapeHtml(asset.accessibilityRequirements.join(" · "))}</dd></div></dl>
      <details><summary>Version history and comments</summary>${asset.versions.map((version) => `<p><strong>Version ${version.version}</strong> · ${humanDate(version.changedAt)} · ${escapeHtml(version.changedBy)}<br>${escapeHtml(version.changeNote)}</p>`).join("")}${asset.comments.map((comment) => `<p><strong>${escapeHtml(comment.author)}</strong> · ${humanDate(comment.createdAt)}<br>${escapeHtml(comment.body)}</p>`).join("") || "<p>No comments.</p>"}</details>
      <div class="actions">${["draft", "changes_requested", "approval_invalidated"].includes(asset.status) ? `<button type="button" data-campaign-action="submit-asset" data-id="${asset.id}">Submit for review</button>` : ""}${asset.status === "in_review" ? reviewButtons("asset", asset.id) : ""}</div>
      <details><summary>Revise canonical asset</summary><form data-form="campaign-revise-asset"><input type="hidden" name="assetId" value="${asset.id}"><label>Editor<input name="editor" required value="${escapeHtml(this.defaultOwner)}"></label><label>Revised body<textarea name="body" required rows="6">${escapeHtml(current.body)}</textarea></label><label>Change note<input name="note" required></label><button type="submit">Save new canonical version</button></form></details>
      <details><summary>Add review comment</summary><form data-form="campaign-comment-asset"><input type="hidden" name="assetId" value="${asset.id}"><label>Author<input name="author" required value="${escapeHtml(this.defaultOwner)}"></label><label>Comment<textarea name="body" required rows="3"></textarea></label><button type="submit">Record comment</button></form></details>
    </article>`;
  }

  private variantSection(approvedAssets: readonly CanonicalAsset[]): string {
    const workspace = this.campaigns!;
    return `<section class="panel" aria-labelledby="variant-heading">
      <div class="section-heading"><div><p class="eyebrow">Channel variants</p><h3 id="variant-heading">Adapt and compare</h3></div>${pill(`${workspace.variants.length} variants`)}</div>
      <p class="guidance">Channel variants adapt the approved canonical asset. They do not duplicate or replace canonical authority.</p>
      ${approvedAssets.length ? `<details><summary>Create a channel variant</summary><form data-form="campaign-create-variant"><label>Approved canonical asset<select name="assetId">${approvedAssets.map((item) => `<option value="${item.id}">${escapeHtml(item.title)}</option>`).join("")}</select></label><label>Channel<select name="channel">${CHANNELS.map((channel) => `<option value="${channel}">${CHANNEL_LABELS[channel]}</option>`).join("")}</select></label><label>Channel body<textarea name="body" required rows="7"></textarea></label><label>Channel constraints, one per line<textarea name="constraints" required rows="4"></textarea></label><button class="primary" type="submit">Create channel variant draft</button></form></details>` : `<div class="state empty"><strong>No approved canonical asset is available.</strong><span>Complete named asset review before adapting channel variants.</span></div>`}
      <div class="cards">${workspace.variants.length ? workspace.variants.map((variant) => this.variantCard(variant)).join("") : `<div class="state empty"><strong>No channel variants yet.</strong><span>Create only the variants the approved campaign intends to use.</span></div>`}</div>
      ${this.variantComparison(workspace.variants)}
    </section>`;
  }

  private variantCard(variant: ChannelVariant): string {
    return `<article class="record"><div class="record-top"><h4>${CHANNEL_LABELS[variant.channel]}</h4>${pill(variant.status)}</div><p>${escapeHtml(variant.body)}</p><small>Version ${variant.version} · Constraints: ${escapeHtml(variant.constraints.join(" · "))}</small><div class="actions">${["draft", "changes_requested", "approval_invalidated"].includes(variant.status) ? `<button type="button" data-campaign-action="submit-variant" data-id="${variant.id}">Submit for review</button>` : ""}${variant.status === "in_review" ? reviewButtons("variant", variant.id) : ""}</div></article>`;
  }

  private variantComparison(variants: readonly ChannelVariant[]): string {
    if (variants.length === 0) return "";
    return `<div class="comparison" tabindex="0" aria-label="Channel variant comparison"><h4>Channel comparison</h4><p>Each variant retains its own constraints and review state while the canonical asset remains authoritative.</p><div class="table-wrap"><table><thead><tr><th scope="col">Channel</th><th scope="col">Body</th><th scope="col">Constraints</th><th scope="col">Review state</th></tr></thead><tbody>${variants.map((item) => `<tr><th scope="row">${CHANNEL_LABELS[item.channel]}</th><td>${escapeHtml(item.body)}</td><td>${escapeHtml(item.constraints.join(" · "))}</td><td>${pill(item.status)}</td></tr>`).join("")}</tbody></table></div></div>`;
  }

  private exportSection(): string {
    const workspace = this.campaigns!;
    const eligible = workspace.assets.flatMap((asset) => {
      const campaign = workspace.campaigns.find((item) => item.id === asset.campaignId);
      if (!campaign || campaign.status !== "approved" || asset.status !== "approved") return [];
      const approvedChannels = new Set(workspace.variants
        .filter((item) => item.canonicalAssetId === asset.id && item.status === "approved")
        .map((item) => item.channel));
      return campaign.channels.some((channel) => approvedChannels.has(channel)) ? [{ asset, campaign, approvedChannels }] : [];
    });
    return `<section class="panel" aria-labelledby="export-heading">
      <div class="section-heading"><div><p class="eyebrow">Manual export</p><h3 id="export-heading">Prepare an intentional channel package</h3></div>${pill(`${workspace.exports.length} packages`)}</div>
      <p class="guidance">Choose only the approved campaign channels this package is intended to contain. Every selected channel requires its own approved variant. The all-approved preset remains visible by default, and the manifest still records that publishing is not approved and delivery has not occurred.</p>
      ${eligible.length ? `<div class="cards">${eligible.map(({ asset, campaign, approvedChannels }) => `<article class="record"><div class="record-top"><h4>${escapeHtml(campaign.title)} · ${escapeHtml(asset.title)}</h4>${pill("ready")}</div><p>Campaign intent: ${escapeHtml(campaign.channels.map((channel) => CHANNEL_LABELS[channel]).join(" · "))}</p><form data-form="campaign-create-export"><input type="hidden" name="campaignId" value="${campaign.id}"><input type="hidden" name="assetId" value="${asset.id}"><fieldset class="dimension"><legend>Include channels in this package</legend>${campaign.channels.map((channel) => `<label><input type="checkbox" name="exportChannels" value="${channel}" ${approvedChannels.has(channel) ? "checked" : "disabled"}> ${CHANNEL_LABELS[channel]} ${approvedChannels.has(channel) ? "approved" : "not approved yet"}</label>`).join("")}</fieldset><p class="guidance">Checked channels form the package. Disabled channels remain outside the package until their variant receives named approval.</p><label>Named export creator<input name="creator" required value="${escapeHtml(this.defaultOwner)}"></label><button class="primary" type="submit">Create selected-channel package</button></form></article>`).join("")}</div>` : `<div class="state empty"><strong>No asset family has an approved intended channel yet.</strong><span>Approve the campaign and canonical asset, then approve at least one channel variant that the campaign actually intends to use.</span></div>`}
      <div class="cards">${workspace.exports.length ? workspace.exports.slice().reverse().map((record) => this.exportCard(record)).join("") : `<div class="state empty"><strong>No manual exports yet.</strong><span>Export remains available without a publishing API after the selected review gates pass.</span></div>`}</div>
    </section>`;
  }

  private exportCard(record: ManualExportPackage): string {
    const channels = record.channels ?? CHANNELS;
    const legacy = record.channels ? "" : " · Legacy all-channel package";
    return `<article class="record"><div class="record-top"><h4>Manual export · ${humanDate(record.createdAt)}</h4>${pill(record.status)}</div><p><strong>Included channels:</strong> ${escapeHtml(channels.map((channel) => CHANNEL_LABELS[channel]).join(" · "))}${legacy}</p><p><strong>Not approved for publishing.</strong> Not delivered. No destination or credential is included.</p><details><summary>Inspect manifest</summary><pre>${escapeHtml(record.manifest)}</pre></details><div class="actions"><button type="button" data-campaign-action="download-export" data-id="${record.id}">Download manifest</button></div></article>`;
  }

  private failureState(page: "campaigns" | "studio"): string {
    return this.failure ? `<section class="state error" role="alert"><div><strong>Campaign operation failed.</strong><p>${escapeHtml(this.failure)}</p></div><button type="button" data-campaign-action="recover" data-page="${page}">Return to saved campaign workspace</button></section>` : "";
  }

  private async reloadProduct(): Promise<void> {
    this.product = await this.productStore.load(this.workspaceId);
    const savedCampaigns = await this.campaignStore.load(this.workspaceId);
    if (savedCampaigns) this.campaigns = savedCampaigns;
  }
}

function reviewButtons(kind: "campaign" | "asset" | "variant", id: string): string {
  return `<button type="button" data-campaign-action="review-${kind}" data-id="${id}" data-decision="approved">Approve</button><button type="button" data-campaign-action="review-${kind}" data-id="${id}" data-decision="changes_requested">Request changes</button><button type="button" data-campaign-action="review-${kind}" data-id="${id}" data-decision="rejected">Reject</button>`;
}

function asDecision(value?: string): "approved" | "rejected" | "changes_requested" {
  if (value === "approved" || value === "rejected" || value === "changes_requested") return value;
  throw new Error("A valid named review decision is required");
}

function emptyCampaignWorkspace(workspaceId: string): CampaignWorkspace {
  return { workspaceId, campaigns: [], assets: [], variants: [], exports: [], updatedAt: new Date().toISOString() };
}

function downloadManifest(record: ManualExportPackage): void {
  const blob = new Blob([record.manifest], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `viable-campaign-export-${record.id}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}