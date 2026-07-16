import type {
  ConversionKind, RelationshipKind, SignalRecord, SignalRelationship,
  SignalsInbox, SourceCollectionOutcome, SourceHealth,
} from "../domain/signal.js";
import type { SignalSource } from "../ports/signal-source.js";
import type { SignalsInboxStore } from "../ports/signals-inbox-store.js";

type Clock = () => Date;
type IdFactory = () => string;

const emptyInbox = (workspaceId: string, now: string): SignalsInbox => ({
  workspaceId, sources: [], sourceHealth: [], signals: [], conversions: [], updatedAt: now,
});

export class SignalsInboxService {
  constructor(
    private readonly store: SignalsInboxStore,
    private readonly clock: Clock = () => new Date(),
    private readonly createId: IdFactory = () => globalThis.crypto.randomUUID(),
  ) {}

  async load(workspaceId: string): Promise<SignalsInbox> {
    return (await this.store.load(workspaceId)) ?? emptyInbox(workspaceId, this.clock().toISOString());
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
    return this.updateSignal(workspaceId, signalId, (signal) => ({
      ...signal,
      status: accepted ? "accepted" : "dismissed",
      evidenceState: accepted ? "reviewed" : "rejected",
      reviewedBy: reviewer,
      reviewedAt: this.clock().toISOString(),
    }));
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

  private async persist(inbox: SignalsInbox): Promise<SignalsInbox> {
    await this.store.save(inbox);
    return inbox;
  }
}
