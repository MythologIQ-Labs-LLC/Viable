import type {
  ConversionKind,
  EvidenceApplicability,
  HypothesisEvidenceRelation,
  MarketHypothesis,
  MarketHypothesisStatus,
  MarketScope,
  RelationshipKind,
  SignalRecord,
  SignalRelationship,
  SignalsInbox,
  SourceCollectionOutcome,
  SourceHealth,
} from "../domain/signal.js";
import type { SignalSource } from "../ports/signal-source.js";
import type { SignalsInboxStore } from "../ports/signals-inbox-store.js";

type Clock = () => Date;
type IdFactory = () => string;

const emptyInbox = (workspaceId: string, now: string): SignalsInbox => ({
  workspaceId, sources: [], sourceHealth: [], signals: [], marketHypotheses: [], conversions: [], updatedAt: now,
});

export type MarketHypothesisAssessment = Readonly<{
  effectiveStatus: MarketHypothesisStatus;
  staleReasons: readonly string[];
  supportingMatching: number;
  contradictoryMatching: number;
  partialEvidence: number;
  outOfScopeEvidence: number;
  unknownReuseRights: number;
}>;

export class SignalsInboxService {
  constructor(
    private readonly store: SignalsInboxStore,
    private readonly clock: Clock = () => new Date(),
    private readonly createId: IdFactory = () => globalThis.crypto.randomUUID(),
  ) {}

  async load(workspaceId: string): Promise<SignalsInbox> {
    const stored = await this.store.load(workspaceId);
    return stored
      ? { ...stored, marketHypotheses: stored.marketHypotheses ?? [] }
      : emptyInbox(workspaceId, this.clock().toISOString());
  }

  async collect(workspaceId: string, sources: readonly SignalSource[], abort?: AbortSignal): Promise<SignalsInbox> {
    const inbox = await this.load(workspaceId);
    const outcomes = await Promise.all(sources.map(async (source): Promise<SourceCollectionOutcome> => {
      try {
        return await source.collect(abort);
      } catch (error) {
        return {
          source: source.registration,
          status: abort?.aborted ? "cancelled" : "transport_failed",
          signals: [],
          retrievedAt: this.clock().toISOString(),
          detail: error instanceof Error ? error.message : "Unhandled source failure",
        };
      }
    }));

    const byFingerprint = new Map(inbox.signals.map((signal) => [signal.fingerprint, signal]));
    for (const outcome of outcomes) {
      if (outcome.status === "success" || outcome.status === "partial") {
        for (const candidate of outcome.signals) {
          if (!byFingerprint.has(candidate.fingerprint)) {
            byFingerprint.set(candidate.fingerprint, {
              ...candidate,
              id: this.createId(),
              workspaceId,
              status: "new",
              evidenceState: "suggested",
            });
          }
        }
      }
    }

    const sourceMap = new Map(inbox.sources.map((source) => [source.id, source]));
    const healthMap = new Map(inbox.sourceHealth.map((health) => [health.sourceId, health]));
    for (const outcome of outcomes) {
      sourceMap.set(outcome.source.id, outcome.source);
      const health: SourceHealth = {
        sourceId: outcome.source.id,
        status: outcome.status,
        checkedAt: outcome.retrievedAt,
        ...(outcome.detail ? { detail: outcome.detail } : {}),
      };
      healthMap.set(outcome.source.id, health);
    }

    return this.persist({
      ...inbox,
      sources: [...sourceMap.values()],
      sourceHealth: [...healthMap.values()],
      signals: [...byFingerprint.values()],
      updatedAt: this.clock().toISOString(),
    });
  }

  async review(workspaceId: string, signalId: string, reviewer: string, accepted: boolean): Promise<SignalsInbox> {
    if (!reviewer.trim()) throw new Error("A named signal reviewer is required");
    const inbox = await this.load(workspaceId);
    this.requiredSignal(inbox, signalId);
    const now = this.clock().toISOString();
    const signals = inbox.signals.map((signal) => signal.id === signalId ? {
      ...signal,
      status: accepted ? "accepted" as const : "dismissed" as const,
      evidenceState: accepted ? "reviewed" as const : "rejected" as const,
      reviewedBy: reviewer.trim(),
      reviewedAt: now,
    } : signal);
    const marketHypotheses = (inbox.marketHypotheses ?? []).map((hypothesis) =>
      hypothesis.evidenceLinks.some((link) => link.signalId === signalId)
      && ["reviewed", "disputed"].includes(hypothesis.status)
        ? { ...hypothesis, status: "stale" as const, updatedAt: now }
        : hypothesis);
    return this.persist({ ...inbox, signals, marketHypotheses, updatedAt: now });
  }

  async createMarketHypothesis(workspaceId: string, input: Readonly<{
    statement: string;
    scope: MarketScope;
    methodology: string;
    limitations: readonly string[];
    owner: string;
    nextValidationAction: string;
  }>): Promise<SignalsInbox> {
    requireText(input.statement, "Market hypothesis statement");
    requireText(input.methodology, "Market hypothesis methodology");
    requireText(input.owner, "Market hypothesis owner");
    requireText(input.nextValidationAction, "Next validation action");
    const inbox = await this.load(workspaceId);
    const now = this.clock().toISOString();
    const hypothesis: MarketHypothesis = {
      id: this.createId(),
      workspaceId,
      statement: input.statement.trim(),
      scope: normalizeMarketScope(input.scope),
      methodology: input.methodology.trim(),
      limitations: clean(input.limitations),
      owner: input.owner.trim(),
      nextValidationAction: input.nextValidationAction.trim(),
      status: "proposed",
      evidenceLinks: [],
      version: 1,
      createdAt: now,
      updatedAt: now,
      reviewHistory: [],
    };
    return this.persist({
      ...inbox,
      marketHypotheses: [...(inbox.marketHypotheses ?? []), hypothesis],
      updatedAt: now,
    });
  }

  async linkMarketHypothesisEvidence(workspaceId: string, hypothesisId: string, input: Readonly<{
    signalId: string;
    relation: HypothesisEvidenceRelation;
    rationale: string;
  }>): Promise<SignalsInbox> {
    requireText(input.rationale, "Hypothesis evidence rationale");
    const inbox = await this.load(workspaceId);
    const hypothesis = this.requiredHypothesis(inbox, hypothesisId);
    if (hypothesis.status === "rejected") throw new Error("Rejected market hypotheses cannot accept new evidence");
    const signal = this.requiredSignal(inbox, input.signalId);
    if (signal.evidenceState !== "reviewed" || signal.status === "dismissed" || !signal.reviewedAt) {
      throw new Error("Only reviewed signals can support or contradict a market hypothesis");
    }
    validateSignalEvidenceDates(signal, this.clock());
    if (hypothesis.evidenceLinks.some((link) => link.signalId === signal.id)) {
      throw new Error("This signal is already linked to the market hypothesis");
    }

    const now = this.clock().toISOString();
    const link = {
      signalId: signal.id,
      signalFingerprint: signal.fingerprint,
      signalReviewedAt: signal.reviewedAt,
      relation: input.relation,
      applicability: marketScopeApplicability(hypothesis.scope, signal.marketScope),
      rationale: input.rationale.trim(),
      retrievedAt: signal.provenance.retrievedAt,
      ...(signal.observedAt ? { observedAt: signal.observedAt } : {}),
      ...(signal.provenance.publisher ? { publisher: signal.provenance.publisher } : {}),
      reuseRights: signal.provenance.reuseRights ?? "unknown",
      ...(signal.marketScope ? { evidenceScope: normalizeMarketScope(signal.marketScope) } : {}),
    } as const;
    const status = ["reviewed", "disputed"].includes(hypothesis.status) ? "stale" as const : hypothesis.status;
    const updated: MarketHypothesis = {
      ...hypothesis,
      status,
      evidenceLinks: [...hypothesis.evidenceLinks, link],
      version: hypothesis.version + 1,
      updatedAt: now,
    };
    return this.persist({
      ...inbox,
      marketHypotheses: (inbox.marketHypotheses ?? []).map((item) => item.id === hypothesisId ? updated : item),
      updatedAt: now,
    });
  }

  async submitMarketHypothesis(workspaceId: string, hypothesisId: string): Promise<SignalsInbox> {
    const inbox = await this.load(workspaceId);
    const hypothesis = this.requiredHypothesis(inbox, hypothesisId);
    if (hypothesis.status === "rejected") throw new Error("Rejected market hypothesis cannot be submitted");
    if (hypothesis.evidenceLinks.length === 0) throw new Error("Market hypothesis review requires linked evidence");
    const now = this.clock().toISOString();
    return this.persist({
      ...inbox,
      marketHypotheses: (inbox.marketHypotheses ?? []).map((item) =>
        item.id === hypothesisId ? { ...item, status: "in_review" as const, updatedAt: now } : item),
      updatedAt: now,
    });
  }

  async reviewMarketHypothesis(workspaceId: string, hypothesisId: string, input: Readonly<{
    reviewer: string;
    outcome: "reviewed" | "disputed" | "rejected";
    note: string;
  }>): Promise<SignalsInbox> {
    requireText(input.reviewer, "Named market hypothesis reviewer");
    requireText(input.note, "Market hypothesis review note");
    const inbox = await this.load(workspaceId);
    const hypothesis = this.requiredHypothesis(inbox, hypothesisId);
    if (!["in_review", "stale", "disputed"].includes(hypothesis.status)) {
      throw new Error("Market hypothesis must be submitted for review before a review outcome is recorded");
    }
    const assessment = assessMarketHypothesis(inbox, hypothesis, this.clock());
    if (assessment.staleReasons.length > 0 && input.outcome !== "rejected") {
      throw new Error(`Market hypothesis evidence is stale: ${assessment.staleReasons.join(" ")}`);
    }
    if (input.outcome === "reviewed") {
      if (assessment.supportingMatching < 1) {
        throw new Error("Reviewed market hypothesis requires at least one matching supporting observation");
      }
      if (assessment.contradictoryMatching > 0) {
        throw new Error("Matching contradictory evidence requires the market hypothesis to remain disputed");
      }
    }
    if (input.outcome === "disputed" && (assessment.supportingMatching < 1 || assessment.contradictoryMatching < 1)) {
      throw new Error("Disputed market hypothesis requires matching supporting and contradictory observations");
    }

    const now = this.clock().toISOString();
    const version = hypothesis.version + 1;
    const updated: MarketHypothesis = {
      ...hypothesis,
      status: input.outcome,
      version,
      reviewedBy: input.reviewer.trim(),
      reviewedAt: now,
      reviewNote: input.note.trim(),
      reviewHistory: [
        ...(hypothesis.reviewHistory ?? []),
        {
          version,
          status: input.outcome,
          reviewedBy: input.reviewer.trim(),
          reviewedAt: now,
          note: input.note.trim(),
        },
      ],
      updatedAt: now,
    };
    return this.persist({
      ...inbox,
      marketHypotheses: (inbox.marketHypotheses ?? []).map((item) => item.id === hypothesisId ? updated : item),
      updatedAt: now,
    });
  }

  async convertMarketHypothesis(
    workspaceId: string,
    hypothesisId: string,
    input: Readonly<{ kind: ConversionKind; title: string; owner: string }>,
  ): Promise<SignalsInbox> {
    requireText(input.title, "Conversion title");
    requireText(input.owner, "Conversion owner");
    const inbox = await this.load(workspaceId);
    const hypothesis = this.requiredHypothesis(inbox, hypothesisId);
    const assessment = assessMarketHypothesis(inbox, hypothesis, this.clock());
    if (!["reviewed", "disputed"].includes(assessment.effectiveStatus)) {
      throw new Error("Only reviewed or explicitly disputed market hypotheses can propose validation work");
    }
    if (assessment.staleReasons.length > 0) throw new Error("Stale market hypothesis evidence must be re-reviewed before conversion");
    if (hypothesis.status === "disputed" && !["product_action", "icp_validation_action", "product_feedback"].includes(input.kind)) {
      throw new Error("Disputed market hypotheses may create validation work only");
    }
    const anchor = hypothesis.evidenceLinks.find((link) =>
      link.relation === "supporting" && link.applicability === "matching");
    if (!anchor) throw new Error("Market hypothesis conversion requires matching supporting evidence");
    const conversion = {
      id: this.createId(),
      signalId: anchor.signalId,
      hypothesisId: hypothesis.id,
      kind: input.kind,
      title: input.title.trim(),
      owner: input.owner.trim(),
      createdAt: this.clock().toISOString(),
      status: "proposed" as const,
    };
    const now = this.clock().toISOString();
    return this.persist({
      ...inbox,
      conversions: [...inbox.conversions, conversion],
      updatedAt: now,
    });
  }

  async save(workspaceId: string, signalId: string): Promise<SignalsInbox> {
    return this.updateSignal(workspaceId, signalId, (signal) => ({ ...signal, status: "saved" }));
  }

  async tag(workspaceId: string, signalId: string, tags: readonly string[]): Promise<SignalsInbox> {
    const normalized = [...new Set(tags.map((tag) => tag.trim().toLocaleLowerCase("en-US")).filter(Boolean))];
    return this.updateSignal(workspaceId, signalId, (signal) => ({ ...signal, tags: [...new Set([...signal.tags, ...normalized])] }));
  }

  async assign(workspaceId: string, signalId: string, owner: string): Promise<SignalsInbox> {
    if (!owner.trim()) throw new Error("A named signal owner is required");
    return this.updateSignal(workspaceId, signalId, (signal) => ({ ...signal, owner }));
  }

  async connect(
    workspaceId: string,
    signalId: string,
    relationship: Readonly<{ kind: RelationshipKind; targetId: string; label: string }>,
  ): Promise<SignalsInbox> {
    if (!relationship.targetId.trim() || !relationship.label.trim()) throw new Error("Signal relationship target and label are required");
    return this.updateSignal(workspaceId, signalId, (signal) => {
      const key = (item: SignalRelationship): string => `${item.kind}:${item.targetId}`;
      const relationships = new Map(signal.relationships.map((item) => [key(item), item]));
      relationships.set(key(relationship), relationship);
      return { ...signal, relationships: [...relationships.values()] };
    });
  }

  async convert(
    workspaceId: string,
    signalId: string,
    input: Readonly<{ kind: ConversionKind; title: string; owner: string }>,
  ): Promise<SignalsInbox> {
    if (!input.title.trim() || !input.owner.trim()) throw new Error("Conversion title and named owner are required");
    const inbox = await this.load(workspaceId);
    const signal = this.requiredSignal(inbox, signalId);
    if (signal.evidenceState !== "reviewed" || signal.status === "dismissed") {
      throw new Error("Only accepted, reviewed signals can become owned work");
    }
    const conversion = {
      id: this.createId(), signalId, kind: input.kind, title: input.title,
      owner: input.owner, createdAt: this.clock().toISOString(), status: "proposed" as const,
    };
    return this.persist({
      ...inbox,
      signals: inbox.signals.map((item) => item.id === signalId ? { ...item, status: "converted" } : item),
      conversions: [...inbox.conversions, conversion],
      updatedAt: this.clock().toISOString(),
    });
  }

  private async updateSignal(
    workspaceId: string,
    signalId: string,
    update: (signal: SignalRecord) => SignalRecord,
  ): Promise<SignalsInbox> {
    const inbox = await this.load(workspaceId);
    this.requiredSignal(inbox, signalId);
    return this.persist({
      ...inbox,
      signals: inbox.signals.map((signal) => signal.id === signalId ? update(signal) : signal),
      updatedAt: this.clock().toISOString(),
    });
  }

  private requiredSignal(inbox: SignalsInbox, signalId: string): SignalRecord {
    const signal = inbox.signals.find((candidate) => candidate.id === signalId);
    if (!signal) throw new Error("Signal not found");
    return signal;
  }

  private requiredHypothesis(inbox: SignalsInbox, hypothesisId: string): MarketHypothesis {
    const hypothesis = (inbox.marketHypotheses ?? []).find((candidate) => candidate.id === hypothesisId);
    if (!hypothesis) throw new Error("Market hypothesis not found");
    return hypothesis;
  }

  private async persist(inbox: SignalsInbox): Promise<SignalsInbox> {
    await this.store.save(inbox);
    return inbox;
  }
}


export function assessMarketHypothesis(
  inbox: SignalsInbox,
  hypothesis: MarketHypothesis,
  clock: Clock = () => new Date(),
): MarketHypothesisAssessment {
  const staleReasons: string[] = [];
  let supportingMatching = 0;
  let contradictoryMatching = 0;
  let partialEvidence = 0;
  let outOfScopeEvidence = 0;
  let unknownReuseRights = 0;
  const now = clock();

  for (const link of hypothesis.evidenceLinks) {
    const signal = inbox.signals.find((candidate) => candidate.id === link.signalId);
    if (!signal) {
      staleReasons.push(`Linked signal ${link.signalId} no longer exists.`);
      continue;
    }
    if (signal.evidenceState !== "reviewed" || signal.status === "dismissed") {
      staleReasons.push(`Linked signal ${link.signalId} is no longer reviewed evidence.`);
    }
    if (signal.fingerprint !== link.signalFingerprint) {
      staleReasons.push(`Linked signal ${link.signalId} fingerprint changed.`);
    }
    if (signal.reviewedAt !== link.signalReviewedAt) {
      staleReasons.push(`Linked signal ${link.signalId} review changed.`);
    }
    const freshness = Date.parse(signal.freshnessReviewAt);
    if (!Number.isFinite(freshness) || freshness < now.getTime()) {
      staleReasons.push(`Linked signal ${link.signalId} is past its freshness review date.`);
    }
    try {
      validateSignalEvidenceDates(signal, clock);
    } catch (error) {
      staleReasons.push(error instanceof Error ? error.message : `Linked signal ${link.signalId} has invalid temporal evidence.`);
    }
    const currentApplicability = marketScopeApplicability(hypothesis.scope, signal.marketScope);
    if (currentApplicability !== link.applicability) {
      staleReasons.push(`Linked signal ${link.signalId} scope applicability changed.`);
    }

    if (link.applicability === "matching" && link.relation === "supporting") supportingMatching += 1;
    if (link.applicability === "matching" && link.relation === "contradictory") contradictoryMatching += 1;
    if (link.applicability === "partial") partialEvidence += 1;
    if (link.applicability === "out_of_scope") outOfScopeEvidence += 1;
    if (link.reuseRights === "unknown") unknownReuseRights += 1;
  }

  const effectiveStatus = staleReasons.length > 0 && ["reviewed", "disputed"].includes(hypothesis.status)
    ? "stale"
    : hypothesis.status;
  return {
    effectiveStatus,
    staleReasons: unique(staleReasons),
    supportingMatching,
    contradictoryMatching,
    partialEvidence,
    outOfScopeEvidence,
    unknownReuseRights,
  };
}

function normalizeMarketScope(scope: MarketScope): MarketScope {
  return {
    breadth: scope.breadth,
    geographies: clean(scope.geographies),
    segments: clean(scope.segments),
    productCategories: clean(scope.productCategories),
    organizationTypes: clean(scope.organizationTypes),
    audiences: clean(scope.audiences),
  };
}

function marketScopeApplicability(hypothesis: MarketScope, evidence?: MarketScope): EvidenceApplicability {
  if (!evidence) return "partial";
  const target = normalizeMarketScope(hypothesis);
  const source = normalizeMarketScope(evidence);
  const dimensions: readonly [readonly string[], readonly string[]][] = [
    [target.geographies, source.geographies],
    [target.segments, source.segments],
    [target.productCategories, source.productCategories],
    [target.organizationTypes, source.organizationTypes],
    [target.audiences, source.audiences],
  ];
  let partial = breadthRank(source.breadth) < breadthRank(target.breadth);
  for (const [targetValues, sourceValues] of dimensions) {
    if (targetValues.length === 0) continue;
    if (sourceValues.length === 0) {
      partial = true;
      continue;
    }
    const sourceNormalized = new Set(sourceValues.map(normalizedScopeValue));
    if (!targetValues.some((value) => sourceNormalized.has(normalizedScopeValue(value)))) return "out_of_scope";
  }
  return partial ? "partial" : "matching";
}

function breadthRank(value: MarketScope["breadth"]): number {
  return value === "specific" ? 0 : value === "bounded" ? 1 : 2;
}

function normalizedScopeValue(value: string): string {
  return value.trim().toLocaleLowerCase("en-US");
}

function validateSignalEvidenceDates(signal: SignalRecord, clock: Clock): void {
  const now = clock().getTime();
  const retrieved = Date.parse(signal.provenance.retrievedAt);
  if (!Number.isFinite(retrieved)) throw new Error(`Signal ${signal.id} retrieval time is invalid.`);
  if (retrieved > now) throw new Error(`Signal ${signal.id} retrieval time is future-dated.`);
  if (signal.observedAt) {
    const observed = Date.parse(signal.observedAt);
    if (!Number.isFinite(observed)) throw new Error(`Signal ${signal.id} observation time is invalid.`);
    if (observed > now) throw new Error(`Signal ${signal.id} observation time is future-dated.`);
    if (observed > retrieved) throw new Error(`Signal ${signal.id} observation occurs after its retrieval time.`);
  }
  if (signal.provenance.publishedAt) {
    const published = Date.parse(signal.provenance.publishedAt);
    if (!Number.isFinite(published)) throw new Error(`Signal ${signal.id} publication time is invalid.`);
    if (published > now) throw new Error(`Signal ${signal.id} publication time is future-dated.`);
    if (published > retrieved) throw new Error(`Signal ${signal.id} publication occurs after its retrieval time.`);
  }
}

function requireText(value: string, label: string): void {
  if (!value.trim()) throw new Error(`${label} is required`);
}

function clean(values: readonly string[]): readonly string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function unique<T>(values: readonly T[]): readonly T[] {
  return [...new Set(values)];
}
