// Builds the synthetic human-acceptance workspace seed
// (docs/acceptance/acceptance-seed-spec.md) as a `viable.workspace-backup`
// v1 file that a facilitator restores through the Workspace screen.
//
// The seed is produced by the real compiled domain services, persisted through
// the real desktop local-storage store adapters (versioned envelope included)
// over an in-memory key/value storage, and exported by the real
// WorkspaceLifecycleService.createBackup. No domain JSON is written by hand.
//
// Determinism: every service receives a scripted clock and a deterministic ID
// factory, so two runs produce byte-identical output.
//
// Usage: npm run build && node scripts/build-acceptance-seed.mjs
// (`npm run acceptance:seed` does both.) Requires the compiled dist/ output,
// including dist/apps/desktop/ui/local-storage-*-store.js, which the core
// build emits because test/acceptance-seed.test.ts imports every store.

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const SEED_LABEL = "ux-acceptance-seed-v2";
export const SEED_WORKSPACE_ID = "ledgerly-ux-acceptance-seed-v2";
export const SEED_CREATED_AT = "2026-10-01T12:00:00.000Z";
export const SEED_FILE = "docs/acceptance/seed/ux-acceptance-seed-v2.json";
export const MALFORMED_SIGNALS_FILE = "docs/acceptance/seed/malformed-signals-import.json";
export const MANUAL_SIGNAL_SOURCE_ID = "manual:ledgerly-community-notes-2026-09";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// Synthetic people. Invented names, no contact details.
const OWNER = "Morgan Reyes";
const REVIEWER = "Sam Okafor";

/** In-memory Web Storage equivalent with stable (sorted) key order. */
export class MemoryStorage {
  #values = new Map();
  get length() { return this.#values.size; }
  key(index) { return [...this.#values.keys()].sort()[index] ?? null; }
  getItem(key) { return this.#values.has(key) ? this.#values.get(key) : null; }
  setItem(key, value) { this.#values.set(String(key), String(value)); }
  removeItem(key) { this.#values.delete(key); }
  clear() { this.#values.clear(); }
  entries() { return [...this.#values.entries()].sort(([left], [right]) => left.localeCompare(right)); }
}

/** Scripted clock: `at()` jumps to a scenario time; each read advances one second. */
class ScriptedClock {
  #ms;
  constructor(start) { this.#ms = Date.parse(start); }
  at(iso) {
    const next = Date.parse(iso);
    if (!Number.isFinite(next)) throw new Error(`Invalid scenario time ${iso}`);
    this.#ms = next;
  }
  now = () => {
    const value = new Date(this.#ms);
    this.#ms += 1000;
    return value;
  };
}

/** Deterministic readable IDs: `label("evidence")` makes the next IDs evidence-1, evidence-2, ... */
class ScriptedIds {
  #prefix = "record";
  #exact = [];
  #counters = new Map();
  label(prefix) { this.#prefix = prefix; }
  exact(value) { this.#exact.push(value); }
  create = () => {
    if (this.#exact.length) return this.#exact.shift();
    const count = (this.#counters.get(this.#prefix) ?? 0) + 1;
    this.#counters.set(this.#prefix, count);
    return `${this.#prefix}-${count}`;
  };
}

function withLocalStorage(storage) {
  const previous = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: storage });
  return () => {
    if (previous) Object.defineProperty(globalThis, "localStorage", previous);
    else delete globalThis.localStorage;
  };
}

async function loadModules(distDirectory) {
  const load = (path) => import(pathToFileURL(resolve(distDirectory, path)).href);
  try {
    const [product, productRevision, campaign, signals, manualSignals, activation, lifecycle, homeAttention, stores] = await Promise.all([
      load("src/product-core/services/product-core-service.js"),
      load("src/product-core/services/product-revision-service.js"),
      load("src/campaigns/services/campaign-service.js"),
      load("src/signals/services/signals-inbox-service.js"),
      load("src/signals/adapters/manual-json-signal-source.js"),
      load("src/activation-learning/services/activation-learning-service.js"),
      load("src/workspace-lifecycle/workspace-lifecycle-service.js"),
      load("src/ui/home-attention.js"),
      Promise.all([
        load("apps/desktop/ui/local-storage-product-workspace-store.js"),
        load("apps/desktop/ui/local-storage-campaign-workspace-store.js"),
        load("apps/desktop/ui/local-storage-signals-inbox-store.js"),
        load("apps/desktop/ui/local-storage-activation-learning-store.js"),
        load("apps/desktop/ui/local-storage-repository-growth-store.js"),
        load("apps/desktop/ui/local-storage-video-production-store.js"),
      ]),
    ]);
    const [productStore, campaignStore, signalsStore, activationStore, repositoryStore, videoStore] = stores;
    return {
      ProductCoreService: product.ProductCoreService,
      ProductRevisionService: productRevision.ProductRevisionService,
      CampaignService: campaign.CampaignService,
      SignalsInboxService: signals.SignalsInboxService,
      ManualJsonSignalSource: manualSignals.ManualJsonSignalSource,
      ActivationLearningService: activation.ActivationLearningService,
      WorkspaceLifecycleService: lifecycle.WorkspaceLifecycleService,
      deriveHomeAttention: homeAttention.deriveHomeAttention,
      LocalStorageProductWorkspaceStore: productStore.LocalStorageProductWorkspaceStore,
      LocalStorageCampaignWorkspaceStore: campaignStore.LocalStorageCampaignWorkspaceStore,
      LocalStorageSignalsInboxStore: signalsStore.LocalStorageSignalsInboxStore,
      LocalStorageActivationLearningStore: activationStore.LocalStorageActivationLearningStore,
      LocalStorageRepositoryGrowthStore: repositoryStore.LocalStorageRepositoryGrowthStore,
      LocalStorageVideoProductionStore: videoStore.LocalStorageVideoProductionStore,
    };
  } catch (error) {
    throw new Error(`Compiled Viable modules were not found under ${distDirectory}. Run \`npm run build\` first. (${error instanceof Error ? error.message : error})`);
  }
}

const dimension = (rating, rationale, evidenceIds, confidence = "medium") => ({ rating, rationale, evidenceIds, confidence });
const noRoles = () => ({
  users: [], economicBuyers: [], decisionMakers: [], approvers: [], influencers: [],
  champions: [], blockers: [], partners: [], maintainers: [], contributors: [],
});

/**
 * Generates the seed. Returns the backup text exactly as the Workspace screen
 * would download it, plus the deliberate malformed Signals import fixture.
 */
export async function buildAcceptanceSeed(options = {}) {
  const distDirectory = options.distDirectory ?? resolve(repositoryRoot, "dist");
  const modules = await loadModules(distDirectory);
  const storage = new MemoryStorage();
  const restore = withLocalStorage(storage);
  try {
    const clock = new ScriptedClock("2026-09-01T14:00:00.000Z");
    const ids = new ScriptedIds();
    const productStore = new modules.LocalStorageProductWorkspaceStore();
    const campaignStore = new modules.LocalStorageCampaignWorkspaceStore();
    const signalsStore = new modules.LocalStorageSignalsInboxStore();
    const activationStore = new modules.LocalStorageActivationLearningStore();
    const product = new modules.ProductCoreService(productStore, clock.now, ids.create);
    const productRevision = new modules.ProductRevisionService(productStore, clock.now);
    const campaigns = new modules.CampaignService(campaignStore, productStore, clock.now, ids.create);
    const signals = new modules.SignalsInboxService(signalsStore, clock.now, ids.create);
    const activation = new modules.ActivationLearningService(
      activationStore, productStore, campaignStore,
      new modules.LocalStorageRepositoryGrowthStore(), new modules.LocalStorageVideoProductionStore(),
      clock.now, ids.create,
    );

    // ---- Product & audience --------------------------------------------------
    ids.exact(SEED_WORKSPACE_ID);
    let workspace = await product.createWorkspace({
      createdBy: OWNER,
      identity: {
        name: "Ledgerly",
        description: "A bookkeeping assistant for independent creative studios that matches bank-feed transactions to receipts and prepares a month-end close checklist.",
        lifecycle: "private_beta",
        supportedEnvironments: ["Web browser (desktop)", "Installable web app"],
      },
    });
    const workspaceId = workspace.id;

    clock.at("2026-09-02T15:00:00.000Z");
    workspace = await productRevision.reviseProductTruth(workspaceId, {
      identity: workspace.product.identity,
      capabilities: [
        "Suggests matches between imported bank-feed transactions and uploaded receipts",
        "Builds a month-end close checklist from unmatched items",
        "Exports a reconciliation summary for the studio's accountant",
      ],
      limitations: [
        "Does not file taxes or replace an accountant",
        "Bank feeds are imported from CSV files; there is no live bank connection",
        "Receipt matching still needs human confirmation",
      ],
      positioning: "Ledgerly helps small creative studios close their books each month without a dedicated bookkeeper.",
      alternatives: ["Spreadsheet reconciliation", "General-purpose accounting suites", "Outsourced monthly bookkeeping"],
      differentiation: ["Built around project-based studio spending", "Close checklist instead of a full ledger"],
      pricing: ["Private beta: free for invited studios"],
      packaging: ["One workspace per studio"],
      offers: ["Guided first month-end close with a Ledgerly specialist"],
      callsToAction: ["Join the private beta waitlist"],
      brandVoice: ["Plain, calm, and specific", "No promises about tax outcomes"],
      terminology: { close: "The month-end reconciliation of transactions and receipts" },
      accessibilityConstraints: ["All screenshots need alt text", "No information conveyed by colour alone"],
      updatedBy: OWNER,
      rationale: "First complete product truth after the private beta kickoff.",
    });

    ids.label("evidence");
    clock.at("2026-09-03T16:00:00.000Z");
    workspace = await product.addEvidence(workspaceId, {
      title: "Five studio-owner interviews on month-end close",
      summary: "Five owners of 3-12 person design studios described spending most of a working day each month matching card transactions to receipts.",
      origin: "interview", observedAt: "2026-08-20T00:00:00.000Z", freshnessReviewAt: "2027-06-30T00:00:00.000Z",
      reviewStatus: "suggested", confidence: "medium",
    });
    workspace = await product.addEvidence(workspaceId, {
      title: "Private beta receipt-matching usage",
      summary: "Across 14 private beta studios, 71% of imported transactions had a suggested receipt match confirmed by a person within the same week.",
      origin: "analytics", observedAt: "2026-08-31T00:00:00.000Z", freshnessReviewAt: "2027-06-30T00:00:00.000Z",
      reviewStatus: "suggested", confidence: "high",
    });
    workspace = await product.addEvidence(workspaceId, {
      title: "Freelancer forum thread about invoice chasing",
      summary: "A public thread where solo freelancers say chasing unpaid invoices hurts more than reconciliation. Not yet checked for representativeness.",
      origin: "public_source", sourceRef: "https://example.com/forum/freelancer-invoices",
      observedAt: "2026-08-28T00:00:00.000Z", freshnessReviewAt: "2027-03-31T00:00:00.000Z",
      reviewStatus: "suggested", confidence: "low",
    });
    workspace = await product.addEvidence(workspaceId, {
      title: "Agency pricing objection notes",
      summary: "Sales notes from three agency calls: owners would pay for the close checklist but objected to per-seat pricing.",
      origin: "sales", observedAt: "2026-06-15T00:00:00.000Z", freshnessReviewAt: "2026-09-20T00:00:00.000Z",
      reviewStatus: "suggested", confidence: "medium",
    });
    const [interviews, betaUsage, forumThread, pricingNotes] = workspace.evidence;

    clock.at("2026-09-04T10:00:00.000Z");
    workspace = await product.reviewEvidence(workspaceId, interviews.id, REVIEWER, true);
    workspace = await product.reviewEvidence(workspaceId, betaUsage.id, REVIEWER, true);
    workspace = await product.reviewEvidence(workspaceId, pricingNotes.id, REVIEWER, true);

    ids.label("claim");
    clock.at("2026-09-04T11:00:00.000Z");
    workspace = await product.addClaim(workspaceId, {
      statement: "Ledgerly suggests receipt matches for most imported bank-feed transactions; a person confirms each match.",
      evidenceIds: [betaUsage.id], prohibitedContexts: ["github_release"],
      rationale: "Private beta usage shows most transactions receive a confirmed suggested match.",
    });
    workspace = await product.addClaim(workspaceId, {
      statement: "Studios finish their month-end close in a single afternoon with Ledgerly.",
      evidenceIds: [interviews.id], prohibitedContexts: [],
      rationale: "Interviews describe the current pain, not the post-Ledgerly duration; needs outcome evidence before approval.",
    });
    const [matchingClaim, afternoonClaim] = workspace.claims;
    workspace = await product.approveClaim(workspaceId, matchingClaim.id, REVIEWER);

    ids.label("icp");
    clock.at("2026-09-05T09:00:00.000Z");
    workspace = await product.addIcpHypothesis(workspaceId, {
      name: "Independent design studios (3-15 people)",
      summary: "Owner-led design studios that pay for projects on shared cards and close their books monthly without a bookkeeper.",
      status: "candidate", origin: "human", reviewStatus: "suggested",
      roles: { ...noRoles(), users: ["Studio operations lead"], economicBuyers: ["Studio owner"], decisionMakers: ["Studio owner"], influencers: ["External accountant"] },
      dimensions: {
        problemIntensity: dimension(3, "Interviewed owners lose most of a working day each month to reconciliation.", [interviews.id]),
        urgency: dimension(2, "Pain peaks at month end and before quarterly tax estimates.", [interviews.id]),
        productFit: dimension(3, "Beta usage shows most transactions receive a confirmed suggested match.", [betaUsage.id], "high"),
        timeToValue: dimension(3, "Value appears in the first close after importing one month of CSV data.", [betaUsage.id]),
        access: dimension(2, "Reachable through design community newsletters and LinkedIn.", []),
        proof: dimension(2, "One reviewed usage metric; no published case study yet.", [betaUsage.id]),
        adoptionFriction: dimension(2, "Needs a monthly CSV export from the bank.", [interviews.id]),
        commercialViability: dimension(2, "Owners would pay for the checklist but object to per-seat pricing.", [pricingNotes.id]),
        retentionPotential: dimension(3, "Monthly close is a recurring job.", [interviews.id]),
        strategicFit: dimension(3, "Matches the project-based spending model Ledgerly is built around.", []),
        evidenceQuality: dimension(2, "Small interview sample plus beta analytics.", [interviews.id, betaUsage.id]),
      },
      disqualifiers: ["Studios with an in-house finance team", "Studios that do not reconcile monthly"],
      antiIcpConditions: ["Needs payroll or tax filing inside the product"],
      assumptions: ["Owners will export a bank CSV each month"],
      contradictions: ["Two interviewed studios already pay an outside bookkeeper and saw less value"],
      evidenceIds: [interviews.id, betaUsage.id], confidence: "medium", owner: OWNER,
      nextValidationAction: "Interview three more studios that do not use an outside bookkeeper",
      changeConditions: ["Fewer than half of new interviewees report monthly reconciliation pain"],
      experiments: [],
    });
    workspace = await product.addIcpHypothesis(workspaceId, {
      name: "Solo freelance creatives",
      summary: "Individual illustrators and photographers who track income and expenses alone.",
      status: "candidate", origin: "human", reviewStatus: "suggested",
      roles: { ...noRoles(), users: ["Freelancer"], economicBuyers: ["Freelancer"], decisionMakers: ["Freelancer"] },
      dimensions: {
        problemIntensity: dimension(2, "Forum thread suggests invoicing pain outweighs reconciliation pain.", [forumThread.id], "low"),
        urgency: dimension(1, "Urgency is seasonal around tax deadlines.", [forumThread.id], "low"),
        productFit: dimension(1, "Ledgerly does not chase invoices.", [], "low"),
        timeToValue: dimension(2, "Small transaction volume means a quick first close.", [], "low"),
        access: dimension(3, "Large, visible online communities.", [forumThread.id], "low"),
        proof: dimension(1, "Only unreviewed public-source evidence so far.", [forumThread.id], "low"),
        adoptionFriction: dimension(2, "Many use personal accounts mixed with business spending.", [], "low"),
        commercialViability: dimension(1, "Low willingness to pay suggested by the thread.", [forumThread.id], "low"),
        retentionPotential: dimension(2, "Recurring need, but may churn after tax season.", [], "low"),
        strategicFit: dimension(1, "Pulls the roadmap toward invoicing.", [], "low"),
        evidenceQuality: dimension(1, "Single unreviewed public thread.", [forumThread.id], "low"),
      },
      disqualifiers: ["Needs invoicing or payment collection"],
      antiIcpConditions: ["Mixes personal and business spending in one account"],
      assumptions: ["Freelancers reconcile at least quarterly"],
      contradictions: [],
      evidenceIds: [forumThread.id], confidence: "low", owner: OWNER,
      nextValidationAction: "Review the forum evidence, then decide whether to compare this audience with the studio ICP",
      changeConditions: ["Reviewed evidence shows reconciliation pain comparable to studios"],
      experiments: [],
    });
    const [studioIcp, freelancerIcp] = workspace.icpHypotheses;

    clock.at("2026-09-06T10:00:00.000Z");
    workspace = await product.reviewIcp(workspaceId, studioIcp.id, REVIEWER, true);
    workspace = await product.selectPrimaryIcp(workspaceId, studioIcp.id, REVIEWER, "Strongest reviewed evidence and the clearest product fit for the beta.");
    workspace = await product.addExperiment(workspaceId, studioIcp.id, {
      id: "experiment-1",
      hypothesis: "Studios without an outside bookkeeper report monthly reconciliation pain",
      method: "Three 30-minute interviews using the existing interview guide",
      owner: OWNER,
      startsAt: "2026-10-12T00:00:00.000Z",
      observationEndsAt: "2026-11-13T00:00:00.000Z",
      successCriteria: ["At least two of three describe monthly reconciliation as a top-three admin pain"],
      failureCriteria: ["Fewer than two of three describe monthly reconciliation pain"],
      decisionCriteria: ["Keep or narrow the studio ICP based on the result"],
      status: "planned",
    });

    ids.label("readiness-action");
    workspace = await product.createAction(workspaceId, {
      source: "product_gap", sourceId: matchingClaim.id,
      title: "Publish a studio pricing page that avoids per-seat pricing", owner: OWNER,
      dueAt: "2026-10-30T17:00:00.000Z", kind: "action",
      verification: "Pricing page draft reviewed against the agency pricing objection notes",
    });

    // ---- Signals (manual JSON import; no network) ----------------------------
    clock.at("2026-09-07T13:00:00.000Z");
    ids.label("signal");
    const manualImport = JSON.stringify({
      signals: [
        {
          kind: "manual", externalId: "community-2026-09-05",
          title: "Studio owners asking for receipt matching help in a design community thread",
          summary: "Several studio owners in a public design community asked how other studios match card spending to receipts at month end.",
          sourceUrl: "https://example.com/community/month-end-receipts", observedAt: "2026-09-05T00:00:00.000Z",
          confidence: "medium", tags: ["studios", "month-end"],
        },
        {
          kind: "manual", externalId: "news-2026-09-06",
          title: "Competitor announces automatic receipt capture for agencies",
          summary: "A general accounting suite announced automatic receipt capture aimed at agencies. Pricing and availability were not stated.",
          sourceUrl: "https://example.com/news/receipt-capture-launch", observedAt: "2026-09-06T00:00:00.000Z",
          confidence: "low", tags: ["competition"],
        },
        {
          kind: "manual", externalId: "newsletter-2026-09-07",
          title: "Accountant newsletter reminds freelancers of the quarterly estimate deadline",
          summary: "An accountant's newsletter reminded freelancers that quarterly estimated payments are due mid-month and recommended reconciling first.",
          observedAt: "2026-09-07T00:00:00.000Z", confidence: "low", tags: ["freelancers", "deadline"],
        },
      ],
    });
    const manualSource = new modules.ManualJsonSignalSource(MANUAL_SIGNAL_SOURCE_ID, manualImport, clock.now().toISOString(), clock.now);
    let inbox = await signals.collect(workspaceId, [manualSource]);
    const [communitySignal, competitorSignal] = inbox.signals;
    clock.at("2026-09-08T09:00:00.000Z");
    inbox = await signals.review(workspaceId, communitySignal.id, REVIEWER, true);
    inbox = await signals.connect(workspaceId, communitySignal.id, { kind: "icp_hypothesis", targetId: studioIcp.id, label: studioIcp.name });
    inbox = await signals.assign(workspaceId, competitorSignal.id, OWNER);

    // ---- Campaign / Studio --------------------------------------------------
    ids.label("campaign");
    clock.at("2026-09-09T10:00:00.000Z");
    let campaignWorkspace = await campaigns.createBrief(workspaceId, {
      title: "Close the month in an afternoon",
      objective: "Grow the private beta waitlist with owner-led design studios",
      primaryOutcome: "Private beta waitlist sign-ups from studio owners",
      primaryAudience: studioIcp.name,
      audienceKind: "selected_icp", icpHypothesisId: studioIcp.id,
      problem: "Month-end reconciliation takes most of a working day for small studios.",
      trigger: "The end of the month and the run-up to quarterly tax estimates.",
      offer: "A guided first month-end close with a Ledgerly specialist",
      messageHierarchy: ["Receipt matching is suggested, you confirm", "A close checklist instead of a full ledger"],
      proof: ["Private beta receipt-matching usage"],
      claimIds: [matchingClaim.id], evidenceIds: [betaUsage.id, interviews.id],
      callToAction: "Join the private beta waitlist",
      channels: ["linkedin", "website"],
      assetPlan: ["One canonical announcement", "LinkedIn post", "Website announcement"],
      owner: OWNER,
      successMeasures: ["Waitlist sign-ups attributed to the announcement", "Demo requests from studios"],
      dependencies: ["Approved product screenshot with alt text"],
    });
    const campaign = campaignWorkspace.campaigns[0];
    campaignWorkspace = await campaigns.submitCampaign(workspaceId, campaign.id);
    clock.at("2026-09-09T15:00:00.000Z");
    campaignWorkspace = await campaigns.reviewCampaign(workspaceId, campaign.id, REVIEWER, "approved", "Audience and claim match the reviewed Product Core authority.");

    ids.label("asset");
    clock.at("2026-09-10T10:00:00.000Z");
    campaignWorkspace = await campaigns.createCanonicalAsset(workspaceId, {
      campaignId: campaign.id,
      title: "Month-end close announcement",
      body: "Ledgerly is opening its private beta to small design studios. Import your bank CSV, confirm the receipt matches Ledgerly suggests, and work through a short close checklist. Join the waitlist for a guided first close.",
      owner: OWNER, origin: "human",
      rights: ["Copy written by the Ledgerly team", "Screenshot from the Ledgerly beta using synthetic data"],
      accessibilityRequirements: ["Screenshot alt text describes the close checklist", "Link text names its destination"],
      disclosureRequirements: ["State that Ledgerly is in private beta"],
    });
    const asset = campaignWorkspace.assets[0];
    campaignWorkspace = await campaigns.submitAsset(workspaceId, asset.id);
    clock.at("2026-09-10T16:00:00.000Z");
    campaignWorkspace = await campaigns.reviewAsset(workspaceId, asset.id, REVIEWER, "approved", "Claim wording matches the approved Product Core claim.");

    ids.label("variant");
    clock.at("2026-09-11T10:00:00.000Z");
    campaignWorkspace = await campaigns.createVariant(workspaceId, asset.id, "linkedin",
      "Small studio, big month-end pile of receipts? Ledgerly suggests receipt matches for your bank transactions and you confirm each one. We're opening the private beta to design studios. Join the waitlist for a guided first close.",
      ["Keep under 1,300 characters", "Mention that Ledgerly is in private beta"]);
    campaignWorkspace = await campaigns.createVariant(workspaceId, asset.id, "website",
      "Ledgerly private beta: zero manual entry at month end. Import your bank CSV and Ledgerly reconciles everything for you. [screenshot]",
      ["Include the product screenshot with alt text", "Link to the waitlist form"]);
    const [linkedinVariant, websiteVariant] = campaignWorkspace.variants;
    campaignWorkspace = await campaigns.submitVariant(workspaceId, linkedinVariant.id);
    campaignWorkspace = await campaigns.submitVariant(workspaceId, websiteVariant.id);
    clock.at("2026-09-11T16:00:00.000Z");
    campaignWorkspace = await campaigns.reviewVariant(workspaceId, linkedinVariant.id, REVIEWER, "approved", "Matches the canonical asset and states private beta.");
    campaignWorkspace = await campaigns.reviewVariant(workspaceId, websiteVariant.id, REVIEWER, "changes_requested",
      "\"Zero manual entry\" and \"reconciles everything\" are not supported by the approved claim: a person confirms each match. Use the approved claim wording, state the private beta, and add alt text for the screenshot.");

    // ---- Calendar / activation / measurement --------------------------------
    ids.label("destination");
    clock.at("2026-09-12T09:00:00.000Z");
    let activationWorkspace = await activation.createDestination(workspaceId, {
      label: "Ledgerly company page on LinkedIn", channel: "linkedin",
      accountReference: "linkedin-page/ledgerly-example", accountOwner: OWNER, ownershipConfirmed: true,
      capabilityNotes: ["Manual posting only; Viable holds no account access"],
      rateLimitNotes: "No automated posting.",
      retryPolicy: "If posting fails, check the page once, retry manually, and record the failure in Viable.",
      dataHandlingNotes: "Post text and one synthetic screenshot only; no customer data.",
    });
    activationWorkspace = await activation.createDestination(workspaceId, {
      label: "Ledgerly website announcements", channel: "website",
      accountReference: "example.com/announcements", accountOwner: OWNER, ownershipConfirmed: true,
      capabilityNotes: ["Published by hand through the website editor"],
      rateLimitNotes: "None.",
      retryPolicy: "Republish by hand and record the outcome in Viable.",
      dataHandlingNotes: "Public marketing copy only.",
    });
    const [linkedinDestination] = activationWorkspace.destinations;

    ids.label("calendar");
    clock.at("2026-09-12T10:00:00.000Z");
    activationWorkspace = await activation.createExternalEntry(workspaceId, {
      title: "LinkedIn launch post: month-end close",
      owner: OWNER,
      startsAt: "2026-09-15T15:00:00.000Z", endsAt: "2026-09-15T16:00:00.000Z", timezone: "America/Chicago",
      notes: "Post the approved LinkedIn variant by hand from the company page.",
      destinationId: linkedinDestination.id, sourceKind: "campaign_variant", sourceId: linkedinVariant.id,
    });
    const launchEntry = activationWorkspace.calendarEntries[0];
    activationWorkspace = await activation.submitExternalEntry(workspaceId, launchEntry.id);
    clock.at("2026-09-12T15:00:00.000Z");
    activationWorkspace = await activation.reviewExternalEntry(workspaceId, launchEntry.id, REVIEWER, "approved", "Approved variant and owned destination; schedule for the 15th.");

    ids.label("measurement");
    clock.at("2026-09-13T10:00:00.000Z");
    activationWorkspace = await activation.createMeasurementPlan(workspaceId, {
      calendarEntryId: launchEntry.id,
      observationStartsAt: "2026-09-15T15:00:00.000Z", observationEndsAt: "2026-09-29T15:00:00.000Z",
      createdBy: OWNER,
      baseline: [
        {
          metric: "Waitlist sign-ups", state: "observed", value: 6, unit: "sign-ups",
          windowStartsAt: "2026-09-01T00:00:00.000Z", windowEndsAt: "2026-09-14T23:59:59.000Z", capturedAt: "2026-09-13T10:00:00.000Z",
          source: "Waitlist form export (manual)", evidenceReference: "Waitlist export 2026-09-01 to 2026-09-14",
        },
        {
          metric: "Demo requests from studios", state: "verified_zero", value: 0, unit: "requests",
          windowStartsAt: "2026-09-01T00:00:00.000Z", windowEndsAt: "2026-09-14T23:59:59.000Z", capturedAt: "2026-09-13T10:00:00.000Z",
          source: "Demo request inbox review (manual)", evidenceReference: "Demo inbox reviewed 2026-09-13; no studio requests",
        },
        {
          metric: "LinkedIn post impressions", state: "unavailable",
          windowStartsAt: "2026-09-01T00:00:00.000Z", windowEndsAt: "2026-09-14T23:59:59.000Z", capturedAt: "2026-09-13T10:00:00.000Z",
          source: "LinkedIn page analytics (manual)", evidenceReference: "No earlier company-page post exists",
          limitation: "No earlier company-page post exists, so there is no impressions baseline. This is missing, not zero.",
        },
      ],
    });

    ids.label("activation-package");
    clock.at("2026-09-15T14:00:00.000Z");
    activationWorkspace = await activation.createManualPackage(workspaceId, launchEntry.id, OWNER);
    const operation = activationWorkspace.exportOperations[0];
    clock.at("2026-09-15T14:10:00.000Z");
    activationWorkspace = await activation.markExportDownloaded(workspaceId, operation.id);

    ids.label("calendar");
    clock.at("2026-09-16T09:00:00.000Z");
    activationWorkspace = await activation.createPlanningEntry(workspaceId, {
      kind: "follow_up", title: "Decide whether to repeat the LinkedIn launch post", owner: OWNER,
      startsAt: "2026-10-14T15:00:00.000Z", endsAt: "2026-10-14T15:30:00.000Z", timezone: "America/Chicago",
      notes: "Use the retrospective and learning entry for the launch post before deciding.",
      relatedRecordId: launchEntry.id,
    });

    // ---- Export the backup through the real lifecycle service ---------------
    const lifecycle = new modules.WorkspaceLifecycleService(storage, () => new Date(SEED_CREATED_AT));
    const backup = `${lifecycle.createBackup(workspaceId)}\n`;
    return {
      backup,
      malformedSignalsImport: `${malformedSignalsImport()}\n`,
      workspaceId,
      referenceIds: {
        reviewedEvidence: [interviews.id, betaUsage.id, pricingNotes.id],
        unreviewedEvidence: [forumThread.id],
        staleEvidence: pricingNotes.id,
        approvedClaim: matchingClaim.id,
        proposedClaim: afternoonClaim.id,
        selectedIcp: studioIcp.id,
        unreviewedIcp: freelancerIcp.id,
        campaign: campaign.id,
        asset: asset.id,
        approvedVariant: linkedinVariant.id,
        changesRequestedVariant: websiteVariant.id,
        launchEntry: launchEntry.id,
      },
      homeAttention: modules.deriveHomeAttention({
        product: workspace,
        signals: inbox,
        campaigns: campaignWorkspace,
        activation: activationWorkspace,
      }, new Date(SEED_CREATED_AT)),
    };
  } finally {
    restore();
  }
}

/**
 * Deliberate failure fixture: valid JSON in the manual Signals import shape,
 * but the only signal has no title. Paste it into the advanced "Signals JSON"
 * field; the import is rejected as a whole and the source is recorded as
 * validation_failed with "Signal 1 title is required".
 */
export function malformedSignalsImport() {
  return JSON.stringify({
    signals: [
      {
        kind: "manual",
        summary: "A studio owner asked whether Ledgerly can export the close checklist to a spreadsheet. The title is intentionally missing.",
        sourceUrl: "https://example.com/community/checklist-export",
        observedAt: "2026-09-20T00:00:00.000Z",
        confidence: "medium",
      },
    ],
  }, null, 2);
}

async function main() {
  const seed = await buildAcceptanceSeed();
  const seedPath = resolve(repositoryRoot, SEED_FILE);
  const malformedPath = resolve(repositoryRoot, MALFORMED_SIGNALS_FILE);
  await mkdir(dirname(seedPath), { recursive: true });
  await writeFile(seedPath, seed.backup);
  await writeFile(malformedPath, seed.malformedSignalsImport);
  console.log(`Wrote ${SEED_FILE} (${SEED_LABEL}, workspace ${seed.workspaceId}, checksum ${JSON.parse(seed.backup).checksum}).`);
  console.log(`Wrote ${MALFORMED_SIGNALS_FILE}.`);
  console.log(`Home attention items at ${SEED_CREATED_AT}: ${seed.homeAttention.items.length}`);
  for (const item of seed.homeAttention.items) console.log(`  [${item.category}] ${item.title}`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
