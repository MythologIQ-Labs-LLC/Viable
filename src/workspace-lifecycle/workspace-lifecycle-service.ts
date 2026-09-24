export interface KeyValueStorage {
  readonly length: number;
  key(index: number): string | null;
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export const WORKSPACE_BACKUP_FORMAT = "viable.workspace-backup" as const;
export const WORKSPACE_BACKUP_VERSION = 1 as const;
export const WORKSPACE_QUARANTINE_FORMAT = "viable.workspace-quarantine" as const;
export const PRODUCT_ACTIVE_KEY = "viable.product-workspace.active";

export const WORKSPACE_CONTEXTS = [
  { name: "product", label: "Product Core", prefix: "viable.product-workspace.", identityField: "id", recordFields: ["claims", "evidence", "icpHypotheses", "assessments", "actions"] },
  { name: "campaign", label: "Campaigns and exports", prefix: "viable.campaign-workspace.", identityField: "workspaceId", recordFields: ["campaigns", "contentBriefs", "assets", "variants", "exports"] },
  { name: "signals", label: "Signals", prefix: "viable.signals-inbox.", identityField: "workspaceId", recordFields: ["sources", "sourceHealth", "signals", "conversions"] },
  { name: "activation", label: "Calendar and Learning", prefix: "viable.activation-learning.", identityField: "workspaceId", recordFields: ["destinations", "calendarEntries", "packages", "exportOperations", "deliveryOutcomes", "measurementPlans", "performanceImports", "retrospectives", "learningLedger"] },
  { name: "repositoryGrowth", label: "Repository Growth", prefix: "viable.repository-growth.", identityField: "workspaceId", recordFields: ["repositories", "assessments", "plans", "launchRooms", "exports", "retrospectives"] },
  { name: "videoProduction", label: "Video Production", prefix: "viable.video-production.", identityField: "workspaceId", recordFields: ["tools", "briefs", "packages", "artifacts", "variants"] },
  { name: "websiteWatch", label: "Website Watch", prefix: "viable.website-watch.", identityField: "workspaceId", recordFields: ["sources", "sourceHealth", "sites", "targets", "snapshots", "observations", "generatedAnalyses"] },
] as const;

export type WorkspaceContextName = typeof WORKSPACE_CONTEXTS[number]["name"];
export type WorkspaceContextStatus = "present" | "absent" | "corrupt";

export type WorkspaceContextPreview = Readonly<{
  name: WorkspaceContextName;
  label: string;
  key: string;
  status: WorkspaceContextStatus;
  recordCount: number;
  issue?: string;
}>;

export type WorkspaceScopePreview = Readonly<{
  workspaceId: string;
  contexts: readonly WorkspaceContextPreview[];
  totalRecords: number;
  hasCorruptData: boolean;
  active: boolean;
  retainedOutsideWorkspace: readonly string[];
  anonymized: readonly string[];
}>;

export type WorkspaceBackupPayload = Readonly<{
  format: typeof WORKSPACE_BACKUP_FORMAT;
  version: typeof WORKSPACE_BACKUP_VERSION;
  workspaceId: string;
  createdAt: string;
  contexts: Readonly<Record<WorkspaceContextName, unknown | null>>;
}>;

export type WorkspaceBackupEnvelope = WorkspaceBackupPayload & Readonly<{
  checksum: string;
}>;

export type WorkspaceImportPreview = Readonly<{
  backup: WorkspaceBackupEnvelope;
  currentWorkspaceIds: readonly string[];
  currentActiveWorkspaceId?: string;
  canRestoreIntoEmptyProfile: boolean;
  canReplaceCurrentWorkspace: boolean;
  conflict?: string;
}>;

export type RestoreMode = "empty_profile" | "replace_current";

export type WorkspaceQuarantineEnvelope = Readonly<{
  format: typeof WORKSPACE_QUARANTINE_FORMAT;
  version: 1;
  workspaceId: string;
  createdAt: string;
  entries: readonly Readonly<{
    context: WorkspaceContextName;
    label: string;
    key: string;
    raw: string;
    issue: string;
  }>[];
  checksum: string;
}>;

type Clock = () => Date;

type ContextDescriptor = typeof WORKSPACE_CONTEXTS[number];

type ParsedContext = Readonly<{
  descriptor: ContextDescriptor;
  key: string;
  raw: string | null;
  value: unknown | null;
  status: WorkspaceContextStatus;
  recordCount: number;
  issue?: string;
}>;

export class WorkspaceLifecycleService {
  constructor(
    private readonly storage: KeyValueStorage,
    private readonly clock: Clock = () => new Date(),
  ) {}

  inspect(workspaceId: string): WorkspaceScopePreview {
    requireWorkspaceId(workspaceId);
    const contexts = WORKSPACE_CONTEXTS.map((descriptor) => this.readContext(workspaceId, descriptor));
    return {
      workspaceId,
      contexts: contexts.map((context) => ({
        name: context.descriptor.name,
        label: context.descriptor.label,
        key: context.key,
        status: context.status,
        recordCount: context.recordCount,
        ...(context.issue ? { issue: context.issue } : {}),
      })),
      totalRecords: contexts.reduce((sum, context) => sum + context.recordCount, 0),
      hasCorruptData: contexts.some((context) => context.status === "corrupt"),
      active: this.storage.getItem(PRODUCT_ACTIVE_KEY) === workspaceId,
      retainedOutsideWorkspace: [
        "Viable application files and code",
        "User-exported backup files outside the app",
        "Non-workspace operating-system or browser preferences",
      ],
      anonymized: [],
    };
  }

  createBackup(workspaceId: string): string {
    requireWorkspaceId(workspaceId);
    const contexts = WORKSPACE_CONTEXTS.map((descriptor) => this.readContext(workspaceId, descriptor));
    const corrupt = contexts.filter((context) => context.status === "corrupt");
    if (corrupt.length) throw new Error(`Workspace backup is blocked because ${corrupt.map((context) => context.descriptor.label).join(", ")} contains corrupt or mismatched data. Export quarantine data before destructive work.`);
    const product = contexts.find((context) => context.descriptor.name === "product");
    if (!product || product.status !== "present" || !product.value) throw new Error("A valid Product Core workspace is required to create a workspace backup");
    const values = {} as Record<WorkspaceContextName, unknown | null>;
    for (const context of contexts) {
      if (context.value !== null) assertNoSecretFields(context.value, context.descriptor.label);
      values[context.descriptor.name] = context.value;
    }
    const payload: WorkspaceBackupPayload = {
      format: WORKSPACE_BACKUP_FORMAT,
      version: WORKSPACE_BACKUP_VERSION,
      workspaceId,
      createdAt: this.clock().toISOString(),
      contexts: values,
    };
    return JSON.stringify({ ...payload, checksum: checksum(payload) } satisfies WorkspaceBackupEnvelope, null, 2);
  }

  exportQuarantine(workspaceId: string): string {
    requireWorkspaceId(workspaceId);
    const entries = WORKSPACE_CONTEXTS
      .map((descriptor) => this.readContext(workspaceId, descriptor))
      .filter((context): context is ParsedContext & { raw: string; issue: string } => context.status === "corrupt" && context.raw !== null && Boolean(context.issue))
      .map((context) => ({
        context: context.descriptor.name,
        label: context.descriptor.label,
        key: context.key,
        raw: context.raw,
        issue: context.issue,
      }));
    if (!entries.length) throw new Error("No corrupt workspace context data is available for quarantine export");
    const payload = {
      format: WORKSPACE_QUARANTINE_FORMAT,
      version: 1 as const,
      workspaceId,
      createdAt: this.clock().toISOString(),
      entries,
    };
    return JSON.stringify({ ...payload, checksum: checksum(payload) } satisfies WorkspaceQuarantineEnvelope, null, 2);
  }

  validateBackup(text: string): WorkspaceBackupEnvelope {
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      throw new Error("Backup file is not valid JSON");
    }
    if (!isRecord(parsed)) throw new Error("Backup file must contain a workspace backup object");
    if (parsed.format !== WORKSPACE_BACKUP_FORMAT) throw new Error("Unsupported backup format");
    if (parsed.version !== WORKSPACE_BACKUP_VERSION) throw new Error(`Unsupported backup version: ${String(parsed.version)}`);
    if (typeof parsed.workspaceId !== "string" || !parsed.workspaceId.trim()) throw new Error("Backup workspace ID is missing");
    if (typeof parsed.createdAt !== "string" || !Number.isFinite(Date.parse(parsed.createdAt))) throw new Error("Backup creation timestamp is invalid");
    if (typeof parsed.checksum !== "string") throw new Error("Backup integrity checksum is missing");
    if (!isRecord(parsed.contexts)) throw new Error("Backup contexts are missing");

    const contexts = {} as Record<WorkspaceContextName, unknown | null>;
    for (const descriptor of WORKSPACE_CONTEXTS) {
      if (!Object.prototype.hasOwnProperty.call(parsed.contexts, descriptor.name)) throw new Error(`Backup is missing the ${descriptor.label} context`);
      const value = parsed.contexts[descriptor.name];
      if (value !== null && !isRecord(value)) throw new Error(`${descriptor.label} backup context must be an object or null`);
      if (value !== null) {
        assertContextIdentity(value, descriptor, parsed.workspaceId);
        assertNoSecretFields(value, descriptor.label);
      }
      contexts[descriptor.name] = value;
    }
    if (contexts.product === null) throw new Error("Backup must include Product Core authority");

    const payload: WorkspaceBackupPayload = {
      format: WORKSPACE_BACKUP_FORMAT,
      version: WORKSPACE_BACKUP_VERSION,
      workspaceId: parsed.workspaceId,
      createdAt: parsed.createdAt,
      contexts,
    };
    if (checksum(payload) !== parsed.checksum) throw new Error("Backup integrity check failed; the file may be truncated or modified");
    return { ...payload, checksum: parsed.checksum };
  }

  previewImport(text: string): WorkspaceImportPreview {
    const backup = this.validateBackup(text);
    const currentWorkspaceIds = [...this.knownWorkspaceIds()].sort();
    const currentActiveWorkspaceId = this.storage.getItem(PRODUCT_ACTIVE_KEY) ?? undefined;
    const canRestoreIntoEmptyProfile = currentWorkspaceIds.length === 0 && !currentActiveWorkspaceId;
    const otherWorkspaceIds = currentWorkspaceIds.filter((id) => id !== backup.workspaceId);
    const canReplaceCurrentWorkspace = otherWorkspaceIds.length === 0 && (!currentActiveWorkspaceId || currentActiveWorkspaceId === backup.workspaceId);
    const conflict = canRestoreIntoEmptyProfile || canReplaceCurrentWorkspace
      ? undefined
      : currentActiveWorkspaceId && currentActiveWorkspaceId !== backup.workspaceId
        ? `The active profile contains a different workspace (${currentActiveWorkspaceId}). Delete or back up that workspace before restoring this backup.`
        : `The profile contains other workspace data (${otherWorkspaceIds.join(", ")}). Restore is blocked to avoid silent cross-workspace mutation.`;
    return {
      backup,
      currentWorkspaceIds,
      ...(currentActiveWorkspaceId ? { currentActiveWorkspaceId } : {}),
      canRestoreIntoEmptyProfile,
      canReplaceCurrentWorkspace,
      ...(conflict ? { conflict } : {}),
    };
  }

  restoreBackup(text: string, mode: RestoreMode): WorkspaceScopePreview {
    const preview = this.previewImport(text);
    const { backup } = preview;
    if (mode === "empty_profile" && !preview.canRestoreIntoEmptyProfile) throw new Error("Restore into an empty profile is blocked because workspace data already exists");
    if (mode === "replace_current" && !preview.canReplaceCurrentWorkspace) throw new Error(preview.conflict ?? "Replacing the current workspace with this backup is not safe");
    if (mode === "replace_current" && preview.currentWorkspaceIds.length === 0 && !preview.currentActiveWorkspaceId) {
      throw new Error("There is no existing workspace to replace; use restore into empty profile instead");
    }

    const keys = WORKSPACE_CONTEXTS.map((descriptor) => `${descriptor.prefix}${backup.workspaceId}`);
    const snapshot = new Map<string, string | null>(keys.map((key) => [key, this.storage.getItem(key)]));
    snapshot.set(PRODUCT_ACTIVE_KEY, this.storage.getItem(PRODUCT_ACTIVE_KEY));
    try {
      for (const descriptor of WORKSPACE_CONTEXTS) {
        const key = `${descriptor.prefix}${backup.workspaceId}`;
        const value = backup.contexts[descriptor.name];
        if (value === null) this.storage.removeItem(key);
        else this.storage.setItem(key, JSON.stringify(value));
      }
      this.storage.setItem(PRODUCT_ACTIVE_KEY, backup.workspaceId);
      const result = this.inspect(backup.workspaceId);
      const product = result.contexts.find((context) => context.name === "product");
      if (!product || product.status !== "present") throw new Error("Restored Product Core authority did not pass integrity validation");
      if (result.hasCorruptData) throw new Error("Restored workspace contains a context that did not pass integrity validation");
      return result;
    } catch (error) {
      rollback(this.storage, snapshot);
      throw new Error(`Workspace restore failed and prior local state was restored: ${error instanceof Error ? error.message : "Unknown restore error"}`);
    }
  }

  deleteWorkspace(workspaceId: string): WorkspaceScopePreview {
    requireWorkspaceId(workspaceId);
    const preview = this.inspect(workspaceId);
    const keys = WORKSPACE_CONTEXTS.map((descriptor) => `${descriptor.prefix}${workspaceId}`);
    const snapshot = new Map<string, string | null>(keys.map((key) => [key, this.storage.getItem(key)]));
    snapshot.set(PRODUCT_ACTIVE_KEY, this.storage.getItem(PRODUCT_ACTIVE_KEY));
    try {
      for (const key of keys) this.storage.removeItem(key);
      if (this.storage.getItem(PRODUCT_ACTIVE_KEY) === workspaceId) this.storage.removeItem(PRODUCT_ACTIVE_KEY);
      if (this.knownWorkspaceIds().has(workspaceId)) throw new Error("One or more workspace context records remained after deletion");
      return preview;
    } catch (error) {
      rollback(this.storage, snapshot);
      throw new Error(`Workspace deletion failed and prior local state was restored: ${error instanceof Error ? error.message : "Unknown deletion error"}`);
    }
  }

  knownWorkspaceIds(): ReadonlySet<string> {
    const ids = new Set<string>();
    for (let index = 0; index < this.storage.length; index += 1) {
      const key = this.storage.key(index);
      if (!key || key === PRODUCT_ACTIVE_KEY) continue;
      for (const descriptor of WORKSPACE_CONTEXTS) {
        if (!key.startsWith(descriptor.prefix)) continue;
        const id = key.slice(descriptor.prefix.length);
        if (id) ids.add(id);
      }
    }
    return ids;
  }

  private readContext(workspaceId: string, descriptor: ContextDescriptor): ParsedContext {
    const key = `${descriptor.prefix}${workspaceId}`;
    const raw = this.storage.getItem(key);
    if (raw === null) return { descriptor, key, raw, value: null, status: "absent", recordCount: 0 };
    try {
      const value: unknown = JSON.parse(raw);
      if (!isRecord(value)) throw new Error("stored value is not an object");
      assertContextIdentity(value, descriptor, workspaceId);
      return { descriptor, key, raw, value, status: "present", recordCount: countRecords(value, descriptor) };
    } catch (error) {
      return {
        descriptor,
        key,
        raw,
        value: null,
        status: "corrupt",
        recordCount: 0,
        issue: error instanceof Error ? error.message : "Unknown workspace data error",
      };
    }
  }
}

function rollback(storage: KeyValueStorage, snapshot: ReadonlyMap<string, string | null>): void {
  for (const [key, value] of snapshot) {
    try {
      if (value === null) storage.removeItem(key); else storage.setItem(key, value);
    } catch {
      // Best effort only. The caller still receives the original failure and no success claim.
    }
  }
}

function countRecords(value: Readonly<Record<string, unknown>>, descriptor: ContextDescriptor): number {
  return descriptor.recordFields.reduce((sum, field) => sum + (Array.isArray(value[field]) ? value[field].length : 0), 0);
}

function assertContextIdentity(value: Readonly<Record<string, unknown>>, descriptor: ContextDescriptor, workspaceId: string): void {
  if (value[descriptor.identityField] !== workspaceId) throw new Error(`${descriptor.label} workspace identity does not match ${workspaceId}`);
}

function assertNoSecretFields(value: unknown, label: string, path = ""): void {
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertNoSecretFields(item, label, `${path}[${index}]`));
    return;
  }
  if (!isRecord(value)) return;
  for (const [key, child] of Object.entries(value)) {
    const next = path ? `${path}.${key}` : key;
    if (/(?:^|[_-])(password|secret|api[_-]?key|access[_-]?token|refresh[_-]?token|private[_-]?key|credential)(?:$|[_-])/i.test(key)) {
      throw new Error(`${label} contains a field that looks like a credential (${next}); backups do not export secrets`);
    }
    assertNoSecretFields(child, label, next);
  }
}

function checksum(value: unknown): string {
  const input = canonicalJson(value);
  let crc = 0xffffffff;
  for (let index = 0; index < input.length; index += 1) {
    crc ^= input.charCodeAt(index);
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return `crc32:${((crc ^ 0xffffffff) >>> 0).toString(16).padStart(8, "0")}`;
}

function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map((item) => canonicalJson(item)).join(",")}]`;
  const record = value as Readonly<Record<string, unknown>>;
  return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`).join(",")}}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function requireWorkspaceId(workspaceId: string): void {
  if (!workspaceId.trim()) throw new Error("Workspace ID is required");
}
