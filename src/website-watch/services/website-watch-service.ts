import type {
  WatchTarget,
  WatchedSite,
  WebsiteChangeObservation,
  WebsiteSnapshot,
  WebsiteWatchSourceHealth,
  WebsiteWatchSourceOutcome,
  WebsiteWatchWorkspace,
} from "../domain/website-watch.js";
import type { WebsiteWatchSource } from "../ports/website-watch-source.js";
import type { WebsiteWatchStore } from "../ports/website-watch-store.js";
import {
  assertNoSecretMaterial,
  classifyProviderError,
  computeNextCheckDueAfterSuccess,
  normalizeDomain,
  validatePublicHttpUrl,
} from "../utilities/website-watch-utilities.js";

type Clock = () => Date;
type IdFactory = () => string;

const emptyWorkspace = (workspaceId: string, now: string): WebsiteWatchWorkspace => ({
  workspaceId,
  sources: [],
  sourceHealth: [],
  sites: [],
  targets: [],
  snapshots: [],
  observations: [],
  generatedAnalyses: [],
  updatedAt: now,
});

export class WebsiteWatchService {
  constructor(
    private readonly store: WebsiteWatchStore,
    private readonly clock: Clock = () => new Date(),
    private readonly createId: IdFactory = () => globalThis.crypto.randomUUID(),
  ) {}

  async load(workspaceId: string): Promise<WebsiteWatchWorkspace> {
    return await this.store.load(workspaceId) ?? emptyWorkspace(workspaceId, this.clock().toISOString());
  }

  async createSite(workspaceId: string, input: Readonly<{
    displayName: string;
    canonicalUrl: string;
    ownership: WatchedSite["ownership"];
    purpose: string;
    authorizationConfirmed: boolean;
    retentionClass: WatchedSite["retentionClass"];
    owner: string;
  }>): Promise<WebsiteWatchWorkspace> {
    const displayName = requiredText(input.displayName, "Watched-site name", 160);
    const purpose = requiredText(input.purpose, "Legitimate monitoring purpose", 500);
    const owner = requiredText(input.owner, "Watched-site owner", 160);
    if (!input.authorizationConfirmed) throw new Error("A legitimate and authorized monitoring purpose must be explicitly confirmed");
    assertNoSecretMaterial(input);
    const url = validatePublicHttpUrl(input.canonicalUrl, "Watched-site URL");
    const workspace = await this.load(workspaceId);
    const normalizedDomain = normalizeDomain(url.toString());
    if (workspace.sites.some((site) => site.normalizedDomain === normalizedDomain && site.status === "active")) {
      throw new Error("An active watched site already uses this domain");
    }
    const now = this.clock().toISOString();
    const site: WatchedSite = {
      id: this.createId(),
      workspaceId,
      displayName,
      canonicalUrl: url.toString(),
      normalizedDomain,
      ownership: input.ownership,
      purpose,
      authorizationConfirmed: true,
      retentionClass: input.retentionClass,
      owner,
      status: "active",
      createdAt: now,
      updatedAt: now,
    };
    return this.persist({ ...workspace, sites: [...workspace.sites, site], updatedAt: now });
  }

  async createTarget(workspaceId: string, input: Readonly<{
    watchedSiteId: string;
    kind: WatchTarget["kind"];
    targetUrl?: string;
    linkScope?: WatchTarget["linkScope"];
    watchNote: string;
    requestedIntervalMinutes: number;
    adapterId: string;
    retentionClass: WatchTarget["retentionClass"];
  }>): Promise<WebsiteWatchWorkspace> {
    const workspace = await this.load(workspaceId);
    const site = required(workspace.sites, input.watchedSiteId, "Watched site");
    if (site.status !== "active") throw new Error("Watch targets require an active watched site");
    const watchNote = requiredText(input.watchNote, "Watch note", 500);
    const adapterId = requiredText(input.adapterId, "Source adapter", 120);
    assertNoSecretMaterial(input);
    let targetUrl: string | undefined;
    if (input.kind === "site_links") {
      if (input.targetUrl?.trim()) throw new Error("Site-link targets use the watched-site domain rather than a page URL");
    } else {
      if (!input.targetUrl) throw new Error("Page-content and product-price targets require a target URL");
      const parsed = validatePublicHttpUrl(input.targetUrl, "Watch target URL");
      const host = normalizeDomain(parsed.toString());
      if (host !== site.normalizedDomain && !host.endsWith(`.${site.normalizedDomain}`)) {
        throw new Error("Watch target URL must belong to the watched-site domain");
      }
      targetUrl = parsed.toString();
    }
    if (input.kind !== "site_links" && input.linkScope) throw new Error("Link scope applies only to site-link targets");
    const now = this.clock().toISOString();
    const nextCheckDueAt = computeNextCheckDueAfterSuccess(undefined, input.requestedIntervalMinutes, this.clock().getTime());
    const target: WatchTarget = {
      id: this.createId(),
      workspaceId,
      watchedSiteId: site.id,
      kind: input.kind,
      ...(targetUrl ? { targetUrl } : {}),
      ...(input.kind === "site_links" ? { linkScope: input.linkScope ?? "both" } : {}),
      watchNote,
      enabled: true,
      requestedIntervalMinutes: input.requestedIntervalMinutes,
      nextCheckDueAt,
      adapterId,
      retentionClass: input.retentionClass,
      reviewRequired: true,
      createdAt: now,
      updatedAt: now,
    };
    return this.persist({ ...workspace, targets: [...workspace.targets, target], updatedAt: now });
  }

  async setSiteStatus(workspaceId: string, siteId: string, status: WatchedSite["status"]): Promise<WebsiteWatchWorkspace> {
    const workspace = await this.load(workspaceId);
    required(workspace.sites, siteId, "Watched site");
    const now = this.clock().toISOString();
    return this.persist({
      ...workspace,
      sites: workspace.sites.map((site) => site.id === siteId ? { ...site, status, updatedAt: now } : site),
      targets: status === "disabled"
        ? workspace.targets.map((target) => target.watchedSiteId === siteId ? { ...target, enabled: false, updatedAt: now } : target)
        : workspace.targets,
      updatedAt: now,
    });
  }

  async setTargetEnabled(workspaceId: string, targetId: string, enabled: boolean): Promise<WebsiteWatchWorkspace> {
    const workspace = await this.load(workspaceId);
    required(workspace.targets, targetId, "Watch target");
    const now = this.clock().toISOString();
    return this.persist({
      ...workspace,
      targets: workspace.targets.map((target) => target.id === targetId ? { ...target, enabled, updatedAt: now } : target),
      updatedAt: now,
    });
  }

  async collect(workspaceId: string, source: WebsiteWatchSource, abort?: AbortSignal): Promise<WebsiteWatchWorkspace> {
    const workspace = await this.load(workspaceId);
    let outcome: WebsiteWatchSourceOutcome;
    try {
      outcome = await source.collect(abort);
    } catch (error) {
      const now = this.clock().toISOString();
      outcome = {
        source: source.registration,
        status: classifyProviderError(error, abort?.aborted ?? false),
        checkedAt: now,
        sites: [],
        targets: [],
        snapshots: [],
        observations: [],
        generatedAnalyses: [],
        limitations: ["Source collection failed before usable website evidence was returned"],
        detail: error instanceof Error ? error.message : "Unhandled Website Watch source failure",
      };
    }
    return this.persist(this.mergeOutcome(workspace, outcome));
  }

  async reviewObservation(
    workspaceId: string,
    observationId: string,
    reviewer: string,
    accepted: boolean,
  ): Promise<WebsiteWatchWorkspace> {
    const workspace = await this.load(workspaceId);
    required(workspace.observations, observationId, "Website change observation");
    const namedReviewer = requiredText(reviewer, "Named website-change reviewer", 160);
    const now = this.clock().toISOString();
    return this.persist({
      ...workspace,
      observations: workspace.observations.map((observation) => observation.id === observationId
        ? { ...observation, reviewState: accepted ? "reviewed" : "rejected", reviewedBy: namedReviewer, reviewedAt: now }
        : observation),
      updatedAt: now,
    });
  }

  async deleteSnapshot(workspaceId: string, snapshotId: string, deletedBy: string): Promise<WebsiteWatchWorkspace> {
    const workspace = await this.load(workspaceId);
    required(workspace.snapshots, snapshotId, "Website snapshot");
    const actor = requiredText(deletedBy, "Named deletion actor", 160);
    const now = this.clock().toISOString();
    return this.persist({
      ...workspace,
      snapshots: workspace.snapshots.map((snapshot) => snapshot.id === snapshotId ? {
        ...snapshot,
        payloadReference: `deleted:${snapshot.id}`,
        limitations: [...new Set([...snapshot.limitations, "Snapshot payload and screenshot reference deleted by explicit user action"])],
        deletedAt: now,
        deletedBy: actor,
      } : snapshot),
      updatedAt: now,
    });
  }

  async pruneExpiredSnapshots(workspaceId: string, deletedBy: string): Promise<WebsiteWatchWorkspace> {
    const workspace = await this.load(workspaceId);
    const actor = requiredText(deletedBy, "Named retention actor", 160);
    const now = this.clock().toISOString();
    const nowMs = this.clock().getTime();
    const snapshots = workspace.snapshots.map((snapshot) => {
      if (!snapshot.deleteAfter || snapshot.deletedAt || Date.parse(snapshot.deleteAfter) > nowMs) return snapshot;
      return {
        ...snapshot,
        payloadReference: `deleted:${snapshot.id}`,
        limitations: [...new Set([...snapshot.limitations, "Snapshot payload and screenshot reference deleted by retention policy"])],
        deletedAt: now,
        deletedBy: actor,
      };
    });
    return this.persist({ ...workspace, snapshots, updatedAt: now });
  }

  private mergeOutcome(workspace: WebsiteWatchWorkspace, raw: WebsiteWatchSourceOutcome): WebsiteWatchWorkspace {
    if (raw.source.id !== raw.source.id.trim()) throw new Error("Website Watch source identifier must be normalized");
    if (raw.status !== "success_change_detected" && raw.status !== "partial" && raw.observations.length > 0) {
      throw new Error("Failed or no-change Website Watch outcomes cannot contain change observations");
    }
    if (raw.status === "success_change_detected" && raw.observations.length === 0) {
      throw new Error("Change-detected Website Watch outcomes require at least one observation");
    }
    assertNoSecretMaterial(raw);
    const existingSiteIds = new Set(workspace.sites.map((site) => site.id));
    const sites = mergeById(workspace.sites, raw.sites.map((site) => ({ ...site, workspaceId: workspace.workspaceId })));
    const siteIds = new Set(sites.map((site) => site.id));
    const targets = raw.targets.map((target) => {
      if (!siteIds.has(target.watchedSiteId)) throw new Error("Website Watch target references an unknown watched site");
      return { ...target, workspaceId: workspace.workspaceId };
    });
    const mergedTargets = mergeById(workspace.targets, targets);
    const targetIds = new Set(mergedTargets.map((target) => target.id));
    const priorSnapshotsByTarget = new Map<string, WebsiteSnapshot[]>();
    for (const snapshot of workspace.snapshots) {
      const list = priorSnapshotsByTarget.get(snapshot.targetId) ?? [];
      list.push(snapshot);
      priorSnapshotsByTarget.set(snapshot.targetId, list);
    }
    const incomingSnapshots = raw.snapshots.map((snapshot) => {
      if (!siteIds.has(snapshot.watchedSiteId) || !targetIds.has(snapshot.targetId)) throw new Error("Website snapshot references an unknown site or target");
      validatePublicHttpUrl(snapshot.observedUrl, "Observed website URL");
      return { ...snapshot, workspaceId: workspace.workspaceId };
    });
    const mergedSnapshots = mergeById(workspace.snapshots, incomingSnapshots);
    const snapshotIds = new Set(mergedSnapshots.map((snapshot) => snapshot.id));
    let effectiveStatus = raw.status;
    const baselineObservations: WebsiteChangeObservation[] = [];
    if (raw.status === "verified_no_change") {
      for (const snapshot of incomingSnapshots) {
        const prior = priorSnapshotsByTarget.get(snapshot.targetId) ?? [];
        if (prior.length === 0 && !existingSiteIds.has(snapshot.watchedSiteId)) {
          effectiveStatus = "partial";
          baselineObservations.push({
            id: `baseline:${snapshot.id}`,
            workspaceId: workspace.workspaceId,
            watchedSiteId: snapshot.watchedSiteId,
            targetId: snapshot.targetId,
            currentSnapshotId: snapshot.id,
            sourceId: raw.source.id,
            changeKind: "baseline",
            diffPreview: "",
            evidenceState: "baseline",
            confidence: "medium",
            limitations: ["First snapshot establishes a baseline and cannot prove that no earlier change occurred", ...raw.limitations],
            reviewState: "suggested",
            generatedAnalysisIds: [],
            observedAt: snapshot.retrievedAt,
            createdAt: snapshot.createdAt,
          });
        }
      }
    }
    const incomingObservations = [...raw.observations.map((observation) => {
      if (!siteIds.has(observation.watchedSiteId) || !targetIds.has(observation.targetId)) throw new Error("Website observation references an unknown site or target");
      if (!snapshotIds.has(observation.currentSnapshotId)) throw new Error("Website observation current snapshot is missing");
      if (observation.previousSnapshotId && !snapshotIds.has(observation.previousSnapshotId)) throw new Error("Website observation previous snapshot is missing");
      return { ...observation, workspaceId: workspace.workspaceId };
    }), ...baselineObservations];
    const mergedObservations = mergeById(workspace.observations, incomingObservations);
    const observationIds = new Set(mergedObservations.map((observation) => observation.id));
    const analyses = raw.generatedAnalyses.map((analysis) => {
      if (!observationIds.has(analysis.observationId)) throw new Error("Generated website analysis references an unknown observation");
      return { ...analysis, workspaceId: workspace.workspaceId };
    });
    const sourceMap = new Map(workspace.sources.map((source) => [source.id, source]));
    sourceMap.set(raw.source.id, raw.source);
    const healthMap = new Map(workspace.sourceHealth.map((health) => [health.sourceId, health]));
    const health: WebsiteWatchSourceHealth = {
      sourceId: raw.source.id,
      status: effectiveStatus,
      checkedAt: raw.checkedAt,
      ...(raw.detail ? { detail: raw.detail } : {}),
      limitations: [...new Set([...raw.source.limitations, ...raw.limitations])],
    };
    healthMap.set(raw.source.id, health);
    return {
      ...workspace,
      sources: [...sourceMap.values()],
      sourceHealth: [...healthMap.values()],
      sites,
      targets: mergedTargets,
      snapshots: mergedSnapshots,
      observations: mergedObservations,
      generatedAnalyses: mergeById(workspace.generatedAnalyses, analyses),
      updatedAt: this.clock().toISOString(),
    };
  }

  private async persist(workspace: WebsiteWatchWorkspace): Promise<WebsiteWatchWorkspace> {
    await this.store.save(workspace);
    return workspace;
  }
}

function requiredText(value: string, label: string, limit: number): string {
  const normalized = value.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim();
  if (!normalized) throw new Error(`${label} is required`);
  if (normalized.length > limit) throw new Error(`${label} exceeds ${limit} characters`);
  return normalized;
}

function required<T extends { id: string }>(items: readonly T[], id: string, label: string): T {
  const item = items.find((candidate) => candidate.id === id);
  if (!item) throw new Error(`${label} not found`);
  return item;
}

function mergeById<T extends { id: string }>(existing: readonly T[], incoming: readonly T[]): T[] {
  const values = new Map(existing.map((item) => [item.id, item]));
  for (const item of incoming) values.set(item.id, item);
  return [...values.values()];
}
