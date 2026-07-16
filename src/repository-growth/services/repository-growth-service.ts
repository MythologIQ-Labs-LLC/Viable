import type { CampaignWorkspace, CanonicalAsset, CampaignBrief, ChannelKind, ChannelVariant } from "../../campaigns/domain/campaign.js";
import type { CampaignWorkspaceStore } from "../../campaigns/ports/campaign-workspace-store.js";
import type { ProductWorkspace } from "../../product-core/domain/workspace.js";
import type { ProductWorkspaceStore } from "../../product-core/ports/product-workspace-store.js";
import type {
  FindingConfidence,
  FindingEffort,
  FindingImpact,
  LaunchChecklistItem,
  MetricEvidenceState,
  PublicRepositorySnapshot,
  RepositoryGrowthActionStatus,
  RepositoryGrowthWorkspace,
  RepositoryImportOutcome,
  RepositoryLaunchRoom,
  RepositoryMetricComparison,
  RepositoryMetricKind,
  RepositoryMetricObservation,
  RepositoryReadinessDimension,
  RepositoryReadinessFinding,
} from "../domain/repository-growth.js";
import type { RepositoryGrowthStore } from "../ports/repository-growth-store.js";

type Clock = () => Date;
type IdFactory = () => string;
type LaunchAuthority = Readonly<{
  campaign: CampaignBrief;
  asset: CanonicalAsset;
  variants: readonly ChannelVariant[];
}>;

export class RepositoryGrowthService {
  constructor(
    private readonly store: RepositoryGrowthStore,
    private readonly productStore: ProductWorkspaceStore,
    private readonly campaignStore: CampaignWorkspaceStore,
    private readonly clock: Clock = () => new Date(),
    private readonly createId: IdFactory = () => globalThis.crypto.randomUUID(),
  ) {}

  async load(workspaceId: string): Promise<RepositoryGrowthWorkspace> {
    return await this.store.load(workspaceId) ?? emptyWorkspace(workspaceId, this.clock().toISOString());
  }

  async importRepository(workspaceId: string, outcome: RepositoryImportOutcome): Promise<RepositoryGrowthWorkspace> {
    if (!outcome.snapshot || !["success", "partial"].includes(outcome.status)) {
      throw new Error(`Public repository import failed: ${outcome.detail ?? outcome.status}`);
    }
    if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(outcome.snapshot.fullName)) {
      throw new Error("Imported repository must use owner/name");
    }
    const workspace = await this.load(workspaceId);
    const key = outcome.snapshot.fullName.toLocaleLowerCase("en-US");
    const previous = workspace.repositories.find((item) => item.fullName.toLocaleLowerCase("en-US") === key);
    const snapshot: PublicRepositorySnapshot = {
      ...outcome.snapshot,
      id: previous?.id ?? this.createId(),
      workspaceId,
    };
    const repositories = previous
      ? workspace.repositories.map((item) => item.id === previous.id ? snapshot : item)
      : [...workspace.repositories, snapshot];
    return this.persist({ ...workspace, repositories, updatedAt: this.clock().toISOString() });
  }

  async assessRepository(workspaceId: string, repositoryId: string, owner: string): Promise<RepositoryGrowthWorkspace> {
    requireText(owner, "Assessment owner");
    const workspace = await this.load(workspaceId);
    const repository = required(workspace.repositories, repositoryId, "Repository");
    const now = this.clock().toISOString();
    const assessment = {
      id: this.createId(),
      repositoryId,
      createdAt: now,
      createdBy: owner.trim(),
      findings: assess(repository, owner.trim(), this.createId),
    };
    return this.persist({ ...workspace, assessments: [...workspace.assessments, assessment], updatedAt: now });
  }

  async createGrowthPlan(workspaceId: string, repositoryId: string, assessmentId: string, owner: string): Promise<RepositoryGrowthWorkspace> {
    requireText(owner, "Growth plan owner");
    const workspace = await this.load(workspaceId);
    required(workspace.repositories, repositoryId, "Repository");
    const assessment = required(workspace.assessments, assessmentId, "Repository assessment");
    if (assessment.repositoryId !== repositoryId) throw new Error("Assessment does not belong to the repository");
    const findings = assessment.findings
      .filter((item) => item.rating < 3)
      .sort((left, right) => impactRank(right.impact) - impactRank(left.impact) || effortRank(left.effort) - effortRank(right.effort));
    if (findings.length === 0) throw new Error("The assessment has no readiness gaps requiring a growth plan");
    const now = this.clock().toISOString();
    const plan = {
      id: this.createId(),
      repositoryId,
      assessmentId,
      owner: owner.trim(),
      createdAt: now,
      actions: findings.map((finding) => ({
        id: this.createId(),
        findingId: finding.id,
        title: finding.recommendation,
        owner: owner.trim(),
        impact: finding.impact,
        effort: finding.effort,
        verification: finding.verification,
        status: "open" as const,
      })),
    };
    return this.persist({ ...workspace, plans: [...workspace.plans, plan], updatedAt: now });
  }

  async updateGrowthAction(workspaceId: string, planId: string, actionId: string, status: RepositoryGrowthActionStatus): Promise<RepositoryGrowthWorkspace> {
    const workspace = await this.load(workspaceId);
    let changed = false;
    const plans = workspace.plans.map((plan) => {
      if (plan.id !== planId) return plan;
      return {
        ...plan,
        actions: plan.actions.map((action) => {
          if (action.id !== actionId) return action;
          changed = true;
          return { ...action, status };
        }),
      };
    });
    if (!changed) throw new Error("Repository growth action not found");
    return this.persist({ ...workspace, plans, updatedAt: this.clock().toISOString() });
  }

  async createLaunchRoom(workspaceId: string, input: Readonly<{
    repositoryId: string;
    title: string;
    primaryAudience: string;
    desiredOutcome: string;
    releaseTag: string;
    campaignId: string;
    canonicalAssetId: string;
    checklist: readonly string[];
    maintainerCoverage: readonly Readonly<{ owner: string; responsibility: string; startsAt: string; endsAt: string }>[];
    observationStartsAt: string;
    observationEndsAt: string;
    retrospectiveAt: string;
    createdBy: string;
  }>): Promise<RepositoryGrowthWorkspace> {
    for (const [value, label] of [
      [input.title, "Launch room title"],
      [input.primaryAudience, "Primary audience"],
      [input.desiredOutcome, "Desired outcome"],
      [input.releaseTag, "Release tag"],
      [input.createdBy, "Launch room creator"],
    ] as const) requireText(value, label);
    if (input.checklist.length === 0) throw new Error("Launch room checklist is required");
    if (input.maintainerCoverage.length === 0) throw new Error("Maintainer coverage is required");
    requireDateOrder(input.observationStartsAt, input.observationEndsAt, "Observation window");
    if (Date.parse(input.retrospectiveAt) < Date.parse(input.observationEndsAt)) throw new Error("Retrospective must occur after the observation window");
    for (const coverage of input.maintainerCoverage) {
      requireText(coverage.owner, "Coverage owner");
      requireText(coverage.responsibility, "Coverage responsibility");
      requireDateOrder(coverage.startsAt, coverage.endsAt, "Maintainer coverage");
    }

    const workspace = await this.load(workspaceId);
    const repository = required(workspace.repositories, input.repositoryId, "Repository");
    const authority = await this.requiredAuthority(workspaceId, input.campaignId, input.canonicalAssetId);
    if (authority.campaign.primaryAudience !== input.primaryAudience.trim()) {
      throw new Error("Launch room audience must match the approved campaign audience");
    }
    const now = this.clock().toISOString();
    const checklist: LaunchChecklistItem[] = clean(input.checklist).map((label) => ({
      id: this.createId(), label, required: true, complete: false,
    }));
    const room: RepositoryLaunchRoom = {
      id: this.createId(),
      repositoryId: repository.id,
      title: input.title.trim(),
      primaryAudience: input.primaryAudience.trim(),
      desiredOutcome: input.desiredOutcome.trim(),
      releaseTag: input.releaseTag.trim(),
      campaignId: authority.campaign.id,
      canonicalAssetId: authority.asset.id,
      variantIds: authority.variants.map((item) => item.id),
      checklist,
      maintainerCoverage: input.maintainerCoverage.map((item) => ({
        ...item,
        owner: item.owner.trim(),
        responsibility: item.responsibility.trim(),
      })),
      observationStartsAt: input.observationStartsAt,
      observationEndsAt: input.observationEndsAt,
      retrospectiveAt: input.retrospectiveAt,
      baseline: repository.metrics.map((item) => ({ ...item })),
      status: "draft",
      createdAt: now,
      createdBy: input.createdBy.trim(),
    };
    return this.persist({ ...workspace, launchRooms: [...workspace.launchRooms, room], updatedAt: now });
  }

  async setChecklistItem(workspaceId: string, launchRoomId: string, itemId: string, complete: boolean, evidence?: string): Promise<RepositoryGrowthWorkspace> {
    const workspace = await this.load(workspaceId);
    let changed = false;
    const launchRooms = workspace.launchRooms.map((room) => {
      if (room.id !== launchRoomId) return room;
      const checklist = room.checklist.map((item) => {
        if (item.id !== itemId) return item;
        changed = true;
        return {
          ...item,
          complete,
          ...(evidence?.trim() ? { evidence: evidence.trim() } : {}),
        };
      });
      return {
        ...room,
        checklist,
        status: checklist.every((item) => !item.required || item.complete)
          ? "ready_for_manual_launch" as const
          : "draft" as const,
      };
    });
    if (!changed) throw new Error("Launch checklist item not found");
    return this.persist({ ...workspace, launchRooms, updatedAt: this.clock().toISOString() });
  }

  async createManualExport(workspaceId: string, launchRoomId: string, createdBy: string): Promise<RepositoryGrowthWorkspace> {
    requireText(createdBy, "Export creator");
    const workspace = await this.load(workspaceId);
    const room = required(workspace.launchRooms, launchRoomId, "Launch room");
    if (room.status !== "ready_for_manual_launch") throw new Error("Manual export requires a completed launch checklist");
    const repository = required(workspace.repositories, room.repositoryId, "Repository");
    const authority = await this.requiredAuthority(workspaceId, room.campaignId, room.canonicalAssetId);
    const latestVersion = authority.asset.versions[authority.asset.versions.length - 1];
    if (!latestVersion) throw new Error("Approved canonical asset has no version");
    const now = this.clock().toISOString();
    const record = {
      id: this.createId(),
      launchRoomId: room.id,
      repositoryId: repository.id,
      createdAt: now,
      createdBy: createdBy.trim(),
      status: "manual_export_ready" as const,
      manifest: JSON.stringify({
        repository: {
          fullName: repository.fullName,
          url: repository.url,
          releaseTag: room.releaseTag,
          limitations: repository.limitations,
        },
        launch: {
          primaryAudience: room.primaryAudience,
          desiredOutcome: room.desiredOutcome,
          observationStartsAt: room.observationStartsAt,
          observationEndsAt: room.observationEndsAt,
          checklist: room.checklist,
          maintainerCoverage: room.maintainerCoverage,
          baseline: room.baseline,
        },
        campaign: {
          id: authority.campaign.id,
          version: authority.campaign.version,
          claims: authority.campaign.claimReferences,
          evidenceIds: authority.campaign.evidenceIds,
          callToAction: authority.campaign.callToAction,
        },
        canonicalAsset: {
          id: authority.asset.id,
          version: latestVersion.version,
          body: latestVersion.body,
          rights: authority.asset.rights,
          accessibilityRequirements: authority.asset.accessibilityRequirements,
          disclosureRequirements: authority.asset.disclosureRequirements,
        },
        variants: authority.variants.map((item) => ({
          id: item.id,
          channel: item.channel,
          version: item.version,
          body: item.body,
          constraints: item.constraints,
        })),
        manualDestinations: ["social", "newsletter", "community", "website", "event"],
        externalAction: { approvedForPublishing: false, delivered: false, credentialsIncluded: false },
      }, null, 2),
    };
    return this.persist({ ...workspace, exports: [...workspace.exports, record], updatedAt: now });
  }

  async completeRetrospective(workspaceId: string, launchRoomId: string, input: Readonly<{
    completedBy: string;
    summary: string;
    learnings: readonly string[];
    nextAction: string;
    outcomes: readonly RepositoryMetricObservation[];
  }>): Promise<RepositoryGrowthWorkspace> {
    requireText(input.completedBy, "Retrospective owner");
    requireText(input.summary, "Retrospective summary");
    requireText(input.nextAction, "Reversible next action");
    if (input.learnings.length === 0) throw new Error("At least one launch learning is required");
    if (input.outcomes.length === 0) throw new Error("Outcome observations are required");
    validateMetrics(input.outcomes);
    const workspace = await this.load(workspaceId);
    const room = required(workspace.launchRooms, launchRoomId, "Launch room");
    if (room.status !== "ready_for_manual_launch") throw new Error("Retrospective requires a launch-ready room");
    const now = this.clock().toISOString();
    if (Date.parse(now) < Date.parse(room.observationEndsAt)) throw new Error("Observation window has not ended");
    const retrospective = {
      id: this.createId(),
      launchRoomId: room.id,
      repositoryId: room.repositoryId,
      completedAt: now,
      completedBy: input.completedBy.trim(),
      summary: input.summary.trim(),
      learnings: clean(input.learnings),
      nextAction: input.nextAction.trim(),
      outcomes: input.outcomes.map((item) => ({ ...item })),
      comparisons: compareMetrics(room.baseline, input.outcomes),
    };
    const launchRooms = workspace.launchRooms.map((item) => item.id === room.id
      ? { ...item, status: "retrospective_complete" as const }
      : item);
    return this.persist({
      ...workspace,
      launchRooms,
      retrospectives: [...workspace.retrospectives, retrospective],
      updatedAt: now,
    });
  }

  private async requiredAuthority(workspaceId: string, campaignId: string, canonicalAssetId: string): Promise<LaunchAuthority> {
    const [product, campaigns] = await Promise.all([
      this.productStore.load(workspaceId),
      this.campaignStore.load(workspaceId),
    ]);
    if (!product) throw new Error("Product workspace not found");
    if (!campaigns) throw new Error("Campaign workspace not found");
    const authority = approvedAuthority(campaigns, campaignId, canonicalAssetId);
    validateCurrentProductAuthority(product, authority.campaign);
    return authority;
  }

  private async persist(workspace: RepositoryGrowthWorkspace): Promise<RepositoryGrowthWorkspace> {
    await this.store.save(workspace);
    return workspace;
  }
}

function assess(repository: PublicRepositorySnapshot, owner: string, createId: IdFactory): readonly RepositoryReadinessFinding[] {
  const readme = repository.frontDoor.readmeText.toLocaleLowerCase("en-US");
  const metric = (kind: RepositoryMetricKind): RepositoryMetricObservation | undefined => repository.metrics.find((item) => item.kind === kind);
  const numeric = (kind: RepositoryMetricKind): number | undefined => metric(kind)?.value;
  const definitions: readonly Omit<RepositoryReadinessFinding, "id" | "owner">[] = [
    finding("problem_clarity", score(Boolean(repository.description), repository.frontDoor.readmePresent, /(problem|helps|outcome|for teams|for developers|for maintainers)/.test(readme), readme.length > 500),
      [repository.description ? `Description: ${repository.description}` : "Repository description is missing", repository.frontDoor.readmePresent ? "README is present" : "README is missing"],
      "high", "small", "State the specific problem, audience, and useful outcome in the description and README opening.", "A new visitor can explain the problem, audience, and outcome after reading the first screen."),
    finding("product_credibility", score(!repository.archived, Boolean(repository.pushedAt), repository.frontDoor.demoPresent, repository.releases.sampledReleaseCount > 0),
      [`Archived: ${repository.archived}`, `Demo evidence: ${repository.frontDoor.demoPresent}`, `Sampled releases: ${repository.releases.sampledReleaseCount}`],
      "high", "medium", "Show a current demo, working release, test evidence, and explicit maturity limitations.", "A clean evaluation produces the documented result using a current release or reproducible example."),
    finding("time_to_value", score(repository.frontDoor.quickStartPresent, repository.frontDoor.demoPresent, repository.frontDoor.documentationPresent, repository.releases.releaseAssetsPresent),
      [`Quick start detected: ${repository.frontDoor.quickStartPresent}`, `Documentation detected: ${repository.frontDoor.documentationPresent}`, `Release assets detected: ${repository.releases.releaseAssetsPresent}`],
      "high", "medium", "Create and test a short quick start that reaches a meaningful first success.", "An unfamiliar qualified user reaches first success in a clean environment without maintainer intervention."),
    finding("discoverability", score(Boolean(repository.description), repository.topics.length >= 3, Boolean(repository.homepage), repository.topics.length >= 6),
      [`Topics: ${repository.topics.join(", ") || "none"}`, `Homepage: ${repository.homepage ?? "missing"}`, `Social preview: ${repository.frontDoor.socialPreviewState}`],
      "medium", "small", "Use a precise description, homepage, social preview, and focused audience, category, technology, and use-case topics.", "Repository metadata matches the terms used by the intended audience and renders clearly when shared."),
    finding("differentiation", score(/alternative|compared|versus|vs\.|different|trade-?off|why /.test(readme), /architecture/.test(readme), /use case|when to use/.test(readme), /limitation|not intended|does not/.test(readme)),
      [/(alternative|compared|versus|vs\.|different)/.test(readme) ? "README includes comparison language" : "No explicit alternative framing detected", /limitation|not intended|does not/.test(readme) ? "Tradeoffs or limitations are visible" : "Tradeoffs are not visible"],
      "medium", "medium", "Explain alternatives, distinctive strengths, tradeoffs, and when the repository is the right choice.", "A qualified evaluator can distinguish the project from plausible alternatives without guessing."),
    finding("trust", score(repository.community.licensePresent, repository.community.securityPresent, repository.frontDoor.readmePresent, !repository.archived),
      [`License: ${repository.license ?? "missing"}`, `SECURITY present: ${repository.community.securityPresent}`, `Community health: ${repository.community.healthPercentage ?? "unavailable"}`],
      "high", "small", "Publish accurate license, security-reporting, support, ownership, maturity, and limitation guidance.", "A reviewer can identify reuse rights, vulnerability reporting, support boundaries, ownership, and maturity."),
    finding("community_readiness", score(repository.community.contributingPresent, repository.community.codeOfConductPresent, repository.community.issueTemplatePresent, repository.community.pullRequestTemplatePresent),
      [`CONTRIBUTING: ${repository.community.contributingPresent}`, `Code of conduct: ${repository.community.codeOfConductPresent}`, `Issue template: ${repository.community.issueTemplatePresent}`, `Pull request template: ${repository.community.pullRequestTemplatePresent}`],
      "medium", "medium", "Provide realistic contribution guidance, participation boundaries, and useful issue and pull-request templates.", "An unfamiliar contributor can identify an appropriate task and submit useful information."),
    finding("release_discipline", score(repository.releases.sampledReleaseCount > 0, repository.releases.releaseNotesPresent, repository.releases.releaseAssetsPresent, repository.frontDoor.changelogPresent),
      [`Sampled releases: ${repository.releases.sampledReleaseCount}`, `Release notes: ${repository.releases.releaseNotesPresent}`, `Release assets: ${repository.releases.releaseAssetsPresent}`, `Changelog: ${repository.frontDoor.changelogPresent}`],
      "high", "medium", "Publish versioned releases with benefits, compatibility, limitations, artifacts, changelog, and upgrade guidance.", "A user can determine what changed, whether it is compatible, and how to install or upgrade."),
    finding("distribution", score(repository.topics.length >= 3, Boolean(repository.homepage), repository.frontDoor.demoPresent, repository.frontDoor.documentationPresent),
      [`Topics: ${repository.topics.length}`, `Homepage: ${Boolean(repository.homepage)}`, `Demo: ${repository.frontDoor.demoPresent}`, `Documentation: ${repository.frontDoor.documentationPresent}`],
      "medium", "medium", "Prepare audience-specific launch assets and legitimate community, newsletter, website, integration, and event paths.", "Each planned channel has an audience-specific asset, community-rule check, owner, and measurement method."),
    finding("adoption", adoptionScore(numeric("stars"), numeric("forks"), numeric("contributors"), numeric("release_downloads")),
      [`Stars: ${formatMetric(metric("stars"))}`, `Forks: ${formatMetric(metric("forks"))}`, `Contributors: ${formatMetric(metric("contributors"))}`, `Release downloads: ${formatMetric(metric("release_downloads"))}`, "Activity signals do not prove successful adoption"],
      "medium", "large", "Collect privacy-respecting first-success, repeat-use, dependent, integration, user-story, and qualified-inquiry evidence.", "At least one adoption measure demonstrates successful use beyond repository attention."),
    finding("sustainability", score(repository.community.supportPresent, repository.community.contributingPresent, repository.community.issueTemplatePresent, repository.releases.sampledReleaseCount > 0),
      [`SUPPORT present: ${repository.community.supportPresent}`, `Contribution path: ${repository.community.contributingPresent}`, `Open issues: ${formatMetric(metric("open_issues"))}`],
      "medium", "medium", "Define support boundaries, triage expectations, contributor paths, maintainer coverage, and sustainable release practices.", "Maintainers can absorb expected launch questions and onboarding failures without abandoning normal work."),
    finding("commercial_path", score(Boolean(repository.homepage), /(enterprise|commercial|services|support plan|sponsor|contact|book a|demo request)/.test(readme), /pricing/.test(readme), /case study|customer|used by/.test(readme)),
      [`Homepage: ${repository.homepage ?? "missing"}`, /(enterprise|commercial|services|sponsor|contact)/.test(readme) ? "Commercial or contact language detected" : "No clear commercial path detected"],
      "low", "medium", "Provide an honest sponsorship, services, support, partnership, or commercial evaluation path when appropriate.", "A qualified organization can identify the supported business path without confusing community participation with a sales target."),
  ];
  return definitions.map((definition) => ({ ...definition, id: createId(), owner }));
}

function finding(
  dimension: RepositoryReadinessDimension,
  rating: 0 | 1 | 2 | 3 | 4,
  evidence: readonly string[],
  impact: FindingImpact,
  effort: FindingEffort,
  recommendation: string,
  verification: string,
): Omit<RepositoryReadinessFinding, "id" | "owner"> {
  const confidence: FindingConfidence = evidence.length >= 3 ? "high" : evidence.length >= 2 ? "medium" : "low";
  return { dimension, rating, evidence, confidence, impact, effort, recommendation, verification };
}

function approvedAuthority(workspace: CampaignWorkspace, campaignId: string, canonicalAssetId: string): LaunchAuthority {
  const campaign = required(workspace.campaigns, campaignId, "Approved campaign");
  if (campaign.status !== "approved") throw new Error("Repository launch requires an approved campaign");
  const asset = required(workspace.assets, canonicalAssetId, "Approved canonical asset");
  if (asset.status !== "approved" || asset.campaignId !== campaign.id) {
    throw new Error("Repository launch requires the approved campaign canonical asset");
  }
  const variants = workspace.variants.filter((item) => item.canonicalAssetId === asset.id && item.status === "approved");
  const channels = new Set<ChannelKind>(variants.map((item) => item.channel));
  if (!(["linkedin", "website", "github_release"] as const).every((channel) => channels.has(channel))) {
    throw new Error("Repository launch requires approved LinkedIn, website, and GitHub release variants");
  }
  return { campaign, asset, variants };
}

function validateCurrentProductAuthority(product: ProductWorkspace, campaign: CampaignBrief): void {
  const reviewedEvidence = new Set(product.evidence
    .filter((item) => item.reviewStatus === "reviewed" && item.origin !== "generated_suggestion")
    .map((item) => item.id));
  if (campaign.evidenceIds.some((id) => !reviewedEvidence.has(id))) {
    throw new Error("Repository launch campaign evidence is no longer reviewed Product Core evidence");
  }
  for (const reference of campaign.claimReferences) {
    const claim = product.claims.find((item) => item.id === reference.claimId);
    if (!claim || claim.status !== "approved" || claim.revision !== reference.claimRevision || claim.statement !== reference.statement) {
      throw new Error("Repository launch campaign claim authority changed");
    }
    if (claim.evidenceIds.some((id) => !campaign.evidenceIds.includes(id))) {
      throw new Error("Repository launch campaign omitted current claim evidence");
    }
  }
}

function compareMetrics(baseline: readonly RepositoryMetricObservation[], outcomes: readonly RepositoryMetricObservation[]): readonly RepositoryMetricComparison[] {
  const kinds = [...new Set([...baseline.map((item) => item.kind), ...outcomes.map((item) => item.kind)])];
  return kinds.map((kind) => {
    const before = baseline.find((item) => item.kind === kind);
    const after = outcomes.find((item) => item.kind === kind);
    const baselineState: MetricEvidenceState = before?.state ?? "not_collected";
    const outcomeState: MetricEvidenceState = after?.state ?? "not_collected";
    const comparable = isNumericState(baselineState) && isNumericState(outcomeState)
      && before?.value !== undefined && after?.value !== undefined;
    return {
      kind,
      baselineState,
      outcomeState,
      ...(before?.value !== undefined ? { baselineValue: before.value } : {}),
      ...(after?.value !== undefined ? { outcomeValue: after.value } : {}),
      ...(comparable ? { delta: after.value! - before.value! } : {}),
    };
  });
}

function validateMetrics(metrics: readonly RepositoryMetricObservation[]): void {
  const seen = new Set<RepositoryMetricKind>();
  for (const metric of metrics) {
    if (seen.has(metric.kind)) throw new Error(`Duplicate outcome metric: ${metric.kind}`);
    seen.add(metric.kind);
    if (isNumericState(metric.state)) {
      if (metric.value === undefined || !Number.isFinite(metric.value) || metric.value < 0) {
        throw new Error(`Metric ${metric.kind} requires a non-negative numeric value`);
      }
      if (metric.state === "verified_zero" && metric.value !== 0) {
        throw new Error(`Metric ${metric.kind} marked verified zero must equal zero`);
      }
    } else if (metric.value !== undefined) {
      throw new Error(`Metric ${metric.kind} cannot carry a value while ${metric.state}`);
    }
  }
}

function emptyWorkspace(workspaceId: string, updatedAt: string): RepositoryGrowthWorkspace {
  return {
    workspaceId,
    repositories: [],
    assessments: [],
    plans: [],
    launchRooms: [],
    exports: [],
    retrospectives: [],
    updatedAt,
  };
}

function score(...conditions: readonly boolean[]): 0 | 1 | 2 | 3 | 4 {
  return Math.min(4, conditions.filter(Boolean).length) as 0 | 1 | 2 | 3 | 4;
}

function adoptionScore(stars?: number, forks?: number, contributors?: number, downloads?: number): 0 | 1 | 2 | 3 | 4 {
  let value = 0;
  if ((stars ?? 0) > 0) value++;
  if ((forks ?? 0) > 0) value++;
  if ((contributors ?? 0) > 1) value++;
  if ((downloads ?? 0) > 0) value++;
  return value as 0 | 1 | 2 | 3 | 4;
}

function formatMetric(metric?: RepositoryMetricObservation): string {
  if (!metric) return "not collected";
  if (!isNumericState(metric.state)) return metric.state.replaceAll("_", " ");
  return String(metric.value ?? 0);
}

function isNumericState(state: MetricEvidenceState): boolean {
  return state === "observed" || state === "verified_zero";
}

function clean(values: readonly string[]): readonly string[] {
  return values.map((value) => value.trim()).filter(Boolean);
}

function requireText(value: string, label: string): void {
  if (!value.trim()) throw new Error(label + " is required");
}

function requireDateOrder(start: string, end: string, label: string): void {
  if (!Number.isFinite(Date.parse(start)) || !Number.isFinite(Date.parse(end)) || Date.parse(end) <= Date.parse(start)) {
    throw new Error(label + " is invalid");
  }
}

function required<T extends { id: string }>(values: readonly T[], id: string, label: string): T {
  const value = values.find((item) => item.id === id);
  if (!value) throw new Error(label + " not found");
  return value;
}

function impactRank(value: FindingImpact): number {
  return value === "high" ? 3 : value === "medium" ? 2 : 1;
}

function effortRank(value: FindingEffort): number {
  return value === "small" ? 1 : value === "medium" ? 2 : 3;
}
