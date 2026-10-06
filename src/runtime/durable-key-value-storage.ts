/**
 * Durable key-value workspace storage (ADR-0010, #114).
 *
 * Viable's stores and lifecycle service read workspace state synchronously
 * (a Storage-like API). This class keeps that contract while moving
 * durability to an asynchronous transactional backend (IndexedDB in the
 * browser and desktop webviews):
 *
 * - reads come from an in-memory snapshot hydrated once at startup;
 * - writes update the snapshot immediately and are queued;
 * - commit() writes every queued change in ONE backend transaction and
 *   resolves only after the backend reports it durable;
 * - if a commit fails, the snapshot reverts to the last committed values, so
 *   the app never shows data that is not actually saved.
 *
 * It is runtime-neutral: the backend is an interface, so the transactional
 * semantics are unit-tested without a browser.
 */

export type StorageChange = Readonly<{ key: string; value: string | null }>;

export interface DurableStorageBackend {
  readonly engine: string;
  loadAll(): Promise<ReadonlyMap<string, string>>;
  /** Applies all changes atomically: either every change is durable or none is. */
  commit(changes: readonly StorageChange[]): Promise<void>;
}

export interface LegacyKeyValueSource {
  readonly length: number;
  key(index: number): string | null;
  getItem(key: string): string | null;
}

export type MigrationReport = Readonly<
  | { status: "not_needed" }
  | { status: "already_migrated" }
  | { status: "migrated"; keys: number }
>;

export const MIGRATION_MARKER_KEY = "viable.storage.migrated-from-local-storage";
const MIGRATED_PREFIX = "viable.";

export class DurableStorageCommitError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "DurableStorageCommitError";
  }
}

export class DurableKeyValueStorage {
  private readonly snapshot: Map<string, string>;
  private readonly committed: Map<string, string>;
  private readonly pending = new Map<string, string | null>();
  private commitChain: Promise<void> = Promise.resolve();
  private readonly listeners = new Set<(changes: readonly StorageChange[]) => void>();

  private constructor(private readonly backend: DurableStorageBackend, initial: ReadonlyMap<string, string>) {
    this.snapshot = new Map(initial);
    this.committed = new Map(initial);
  }

  /**
   * Opens storage and performs the one-time migration from a legacy
   * synchronous store (localStorage). The legacy copy is never modified, so it
   * remains a recovery source; the marker prevents migrating twice.
   */
  static async open(
    backend: DurableStorageBackend,
    legacy?: LegacyKeyValueSource,
    clock: () => Date = () => new Date(),
  ): Promise<{ storage: DurableKeyValueStorage; migration: MigrationReport }> {
    const existing = await backend.loadAll();
    if (existing.has(MIGRATION_MARKER_KEY)) {
      return { storage: new DurableKeyValueStorage(backend, existing), migration: { status: "already_migrated" } };
    }
    const legacyEntries = legacy ? readLegacy(legacy) : [];
    const toCopy = legacyEntries.filter(([key]) => !existing.has(key));
    const marker = JSON.stringify({ migratedAt: clock().toISOString(), keys: toCopy.length });
    await backend.commit([...toCopy.map(([key, value]) => ({ key, value })), { key: MIGRATION_MARKER_KEY, value: marker }]);
    const verified = await backend.loadAll();
    for (const [key, value] of toCopy) {
      if (verified.get(key) !== value) throw new DurableStorageCommitError(`Workspace storage migration could not be verified for ${key}. The original data was left untouched.`);
    }
    return {
      storage: new DurableKeyValueStorage(backend, verified),
      migration: toCopy.length ? { status: "migrated", keys: toCopy.length } : { status: "not_needed" },
    };
  }

  get engine(): string {
    return this.backend.engine;
  }

  get length(): number {
    return this.snapshot.size;
  }

  key(index: number): string | null {
    return [...this.snapshot.keys()][index] ?? null;
  }

  getItem(key: string): string | null {
    return this.snapshot.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.snapshot.set(key, String(value));
    this.pending.set(key, String(value));
  }

  removeItem(key: string): void {
    this.snapshot.delete(key);
    this.pending.set(key, null);
  }

  hasPendingChanges(): boolean {
    return this.pending.size > 0;
  }

  /**
   * Durably writes all pending changes in one transaction. Concurrent callers
   * are serialized; each resolves once its changes (and any earlier ones) are
   * durable. On failure the affected keys revert to their committed values.
   */
  commit(): Promise<void> {
    const run = this.commitChain.then(() => this.commitPending());
    this.commitChain = run.catch(() => undefined);
    return run;
  }

  /** Applies changes committed elsewhere (another tab or window). */
  applyExternal(changes: readonly StorageChange[]): void {
    for (const change of changes) {
      if (change.value === null) this.committed.delete(change.key); else this.committed.set(change.key, change.value);
      // A local uncommitted edit to the same key wins until it commits.
      if (this.pending.has(change.key)) continue;
      if (change.value === null) this.snapshot.delete(change.key); else this.snapshot.set(change.key, change.value);
    }
  }

  onCommitted(listener: (changes: readonly StorageChange[]) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private async commitPending(): Promise<void> {
    if (this.pending.size === 0) return;
    const changes: StorageChange[] = [...this.pending].map(([key, value]) => ({ key, value }));
    this.pending.clear();
    try {
      await this.backend.commit(changes);
    } catch (error) {
      for (const { key } of changes) {
        // Keys edited again after this batch started stay pending for the next commit.
        if (this.pending.has(key)) continue;
        const previous = this.committed.get(key);
        if (previous === undefined) this.snapshot.delete(key); else this.snapshot.set(key, previous);
      }
      throw new DurableStorageCommitError(
        "Viable could not save your change to this device's storage. The previous saved version is still in place; nothing was partially saved.",
        { cause: error },
      );
    }
    for (const { key, value } of changes) {
      if (value === null) this.committed.delete(key); else this.committed.set(key, value);
    }
    for (const listener of this.listeners) listener(changes);
  }
}

function readLegacy(legacy: LegacyKeyValueSource): Array<[string, string]> {
  const entries: Array<[string, string]> = [];
  for (let index = 0; index < legacy.length; index += 1) {
    const key = legacy.key(index);
    if (!key || !key.startsWith(MIGRATED_PREFIX)) continue;
    const value = legacy.getItem(key);
    if (value !== null) entries.push([key, value]);
  }
  return entries;
}
