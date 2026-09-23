import { readFileSync, writeFileSync } from "node:fs";

const path = "apps/desktop/ui/signals-view.ts";
let text = readFileSync(path, "utf8");

const replaceOnce = (before, after, label) => {
  if (!text.includes(before)) throw new Error(`Patch anchor missing: ${label}`);
  text = text.replace(before, after);
};

replaceOnce(
  'import type { StoredEventIntelligenceRun } from "../../../src/event-intelligence/ports/run-store.js";\n',
  'import type { ChannelKind } from "../../../src/campaigns/domain/campaign.js";\n' +
  'import type { StoredEventIntelligenceRun } from "../../../src/event-intelligence/ports/run-store.js";\n' +
  'import { isReviewedEvidence } from "../../../src/product-core/domain/evidence.js";\n' +
  'import type { ProductWorkspace } from "../../../src/product-core/domain/workspace.js";\n',
  "imports",
);

replaceOnce(
  'import { isProductMaterializationKind, SignalWorkMaterializationService } from "../../../src/signals/services/signal-work-materialization-service.js";',
  'import { isCampaignMaterializationKind, isProductMaterializationKind, SignalWorkMaterializationService } from "../../../src/signals/services/signal-work-materialization-service.js";',
  "materialization import",
);

replaceOnce(
`  private readonly productStore = new LocalStorageProductWorkspaceStore();
  private readonly service = new SignalsInboxService(this.signalsStore);
  private readonly materializationService = new SignalWorkMaterializationService(this.signalsStore, this.productStore);
  private readonly websiteService = new WebsiteWatchService(this.websiteStore);
  private readonly activationService = new ActivationLearningService(
    new LocalStorageActivationLearningStore(),
    this.productStore,
    new LocalStorageCampaignWorkspaceStore(),`,
`  private readonly productStore = new LocalStorageProductWorkspaceStore();
  private readonly campaignStore = new LocalStorageCampaignWorkspaceStore();
  private readonly service = new SignalsInboxService(this.signalsStore);
  private readonly materializationService = new SignalWorkMaterializationService(this.signalsStore, this.productStore, undefined, this.campaignStore);
  private readonly websiteService = new WebsiteWatchService(this.websiteStore);
  private readonly activationService = new ActivationLearningService(
    new LocalStorageActivationLearningStore(),
    this.productStore,
    this.campaignStore,`,
  "stores",
);

replaceOnce(
`  private inbox?: SignalsInbox;
  private website?: WebsiteWatchWorkspace;
  private failure: string | undefined;`,
`  private inbox?: SignalsInbox;
  private website?: WebsiteWatchWorkspace;
  private product?: ProductWorkspace;
  private failure: string | undefined;`,
  "product state",
);

replaceOnce(
`  async load(): Promise<void> {
    [this.inbox, this.website] = await Promise.all([
      this.service.load(this.workspaceId),
      this.websiteService.load(this.workspaceId),
    ]);
  }`,
`  async load(): Promise<void> {
    const [inbox, website, product] = await Promise.all([
      this.service.load(this.workspaceId),
      this.websiteService.load(this.workspaceId),
      this.productStore.load(this.workspaceId),
    ]);
    this.inbox = inbox;
    this.website = website;
    this.product = product;
  }`,
  "load product authority",
);

const connectAnchor = `      if (kind === "signals-connect") {
        this.inbox = await this.service.connect(this.workspaceId, String(form.get("signalId")), {
          kind: String(form.get("relationshipKind")) as "product",
          targetId: String(form.get("targetId")),
          label: String(form.get("label")),
        });
        return "Signal relationship recorded";
      }`;
const campaignSubmit = `      if (kind === "signals-materialize-campaign") {
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
`;
replaceOnce(connectAnchor, campaignSubmit + connectAnchor, "campaign submit");

replaceOnce(
  "Product actions, ICP validation actions, and product feedback can be materialized into Product Core now. Campaign, content, repository-growth, and Website Watch conversions remain proposed until their destination-specific authority inputs are supplied.",
  "Product actions, ICP validation actions, and product feedback can be materialized into Product Core. Campaign proposals can be completed into governed Campaign drafts after supplying the destination-specific authority fields. Content, repository-growth, and Website Watch conversions remain proposed.",
  "conversion guidance",
);

const start = text.indexOf("  private conversionCard(item: SignalConversion): string {");
const end = text.indexOf("  private websiteWatchSection(): string {", start);
if (start < 0 || end < 0) throw new Error("Patch anchor missing: conversion card block");
const replacement = `  private conversionCard(item: SignalConversion): string {
    const productMaterialization = isProductMaterializationKind(item.kind);
    const campaignMaterialization = isCampaignMaterializationKind(item.kind);
    const destination = item.materialization;
    const failure = item.materializationFailure;
    return \`<article class="record signal-conversion">
      <div class="record-top"><h4>\${escapeHtml(item.title)}</h4>\${pill(item.status)}</div>
      <p>\${escapeHtml(item.kind.replaceAll("_", " "))}</p>
      <small>Owner: \${escapeHtml(item.owner)} · Created \${humanDate(item.createdAt)}</small>
      \${destination ? \`<p><strong>Authoritative destination:</strong> \${escapeHtml(destination.context)} · <code>\${escapeHtml(destination.recordId)}</code> · \${humanDate(destination.materializedAt)}</p>\` : ""}
      \${failure ? \`<div class="inline-warning"><strong>Materialization failed.</strong> \${escapeHtml(failure.detail)} · \${humanDate(failure.attemptedAt)}</div>\` : ""}
      \${productMaterialization && item.status !== "materialized" ? \`<button type="button" data-signal-action="materialize-product" data-id="\${escapeHtml(item.id)}">\${item.status === "materialization_failed" ? "Retry Product Core materialization" : "Materialize in Product Core"}</button>\` : ""}
      \${campaignMaterialization && item.status !== "materialized" ? this.campaignMaterializationForm(item) : ""}
      \${!productMaterialization && !campaignMaterialization && item.status === "proposed" ? \`<small>Destination-specific fields and authority checks are still required before this proposal can create an authoritative record.</small>\` : ""}
    </article>\`;
  }

  private campaignMaterializationForm(item: SignalConversion): string {
    const product = this.product;
    const approvedClaims = product?.claims.filter((claim) => claim.status === "approved") ?? [];
    const reviewedEvidence = product?.evidence.filter(isReviewedEvidence) ?? [];
    const selectedIcps = product?.icpHypotheses.filter((icp) => icp.status === "selected" && icp.reviewStatus === "reviewed") ?? [];
    if (!product || approvedClaims.length === 0 || reviewedEvidence.length === 0) {
      return \`<div class="state warning"><strong>Campaign authority is not ready.</strong><span>Materialization requires at least one approved Product Core claim and reviewed non-generated evidence.</span></div>\`;
    }
    const signal = this.requiredSignal(item.signalId);
    const claimOptions = approvedClaims.map((claim) => \`<option value="\${escapeHtml(claim.id)}">\${escapeHtml(claim.statement)} · r\${claim.revision}</option>\`).join("");
    const evidenceOptions = reviewedEvidence.map((evidence) => \`<option value="\${escapeHtml(evidence.id)}">\${escapeHtml(evidence.title)} · \${escapeHtml(evidence.confidence)}</option>\`).join("");
    const icpOptions = selectedIcps.map((icp) => \`<option value="\${escapeHtml(icp.id)}">\${escapeHtml(icp.name)}</option>\`).join("");
    return \`<details><summary>\${item.status === "materialization_failed" ? "Retry Campaign materialization" : "Materialize Campaign brief"}</summary>
      <form data-form="signals-materialize-campaign">
        <input type="hidden" name="conversionId" value="\${escapeHtml(item.id)}">
        <p class="guidance">Campaign authority requires a complete draft brief plus approved Product Core claims and reviewed evidence. This creates a draft Campaign record only; it does not approve, publish, or deliver anything.</p>
        <label>Objective<textarea name="objective" required rows="2">Investigate \${escapeHtml(signal.title)}</textarea></label>
        <div class="two"><label>Primary outcome<input name="primaryOutcome" required></label><label>Primary audience<input name="primaryAudience" required value="\${escapeHtml(selectedIcps[0]?.name ?? "")}"></label></div>
        <div class="two"><label>Audience authority<select name="audienceKind"><option value="test_audience">Test audience</option>\${selectedIcps.length ? \`<option value="selected_icp">Reviewed selected ICP</option>\` : ""}</select></label><label>Selected ICP\${selectedIcps.length ? \`<select name="icpHypothesisId"><option value="">Not used for test audience</option>\${icpOptions}</select>\` : \`<input disabled value="No reviewed selected ICP">\`}</label></div>
        <label>Problem<textarea name="problem" required rows="2">\${escapeHtml(signal.summary)}</textarea></label>
        <label>Trigger<textarea name="trigger" required rows="2">\${escapeHtml(signal.title)}</textarea></label>
        <label>Offer<textarea name="offer" required rows="2"></textarea></label>
        <label>Message hierarchy<textarea name="messageHierarchy" required rows="3">\${escapeHtml(signal.summary)}</textarea></label>
        <label>Proof notes<textarea name="proof" rows="2"></textarea></label>
        <div class="two"><label>Approved Product Core claims<select name="claimIds" multiple required size="\${Math.min(6, Math.max(2, approvedClaims.length))}">\${claimOptions}</select></label><label>Reviewed Product Core evidence<select name="evidenceIds" multiple required size="\${Math.min(6, Math.max(2, reviewedEvidence.length))}">\${evidenceOptions}</select></label></div>
        <p class="guidance">Select every evidence record referenced by the claims you choose. Campaign authority will reject missing, generated, rejected, stale-revision, or channel-prohibited claim references.</p>
        <label>Call to action<input name="callToAction" required></label>
        <label>Channels<select name="channels" multiple required size="3"><option value="website">Website</option><option value="linkedin">LinkedIn</option><option value="github_release">GitHub release</option></select></label>
        <label>Asset plan<textarea name="assetPlan" rows="2"></textarea></label>
        <label>Success measures<textarea name="successMeasures" required rows="2"></textarea></label>
        <label>Dependencies<textarea name="dependencies" rows="2"></textarea></label>
        <button type="submit">Create governed Campaign draft</button>
      </form>
    </details>\`;
  }

`;
text = text.slice(0, start) + replacement + text.slice(end);

writeFileSync(path, text);
