type ReadStorage = Pick<Storage, "getItem">;
type WriteStorage = Pick<Storage, "setItem">;
type RemoveStorage = Pick<Storage, "removeItem">;

type IdentityRequirement = Readonly<{
  field: string;
  expected: string;
}>;

type ShapeRequirement = Readonly<{
  arrays: readonly string[];
  records?: readonly string[];
  strings?: readonly string[];
}>;

export const LEGACY_WORKSPACE_SCHEMA_VERSION = 0;
export const CURRENT_WORKSPACE_SCHEMA_VERSION = 1;

type WorkspaceEnvelope = Readonly<{
  schemaVersion: number;
  workspace: unknown;
}>;

export class LocalWorkspaceStorageError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "LocalWorkspaceStorageError";
  }
}

export function readStorageString(storage: ReadStorage, key: string, label: string): string | undefined {
  try {
    return storage.getItem(key) ?? undefined;
  } catch (error) {
    throw new LocalWorkspaceStorageError(`${label} metadata could not be read. The saved data was not modified.`, { cause: error });
  }
}

export function writeStorageString(storage: WriteStorage, key: string, label: string, value: string): void {
  try {
    storage.setItem(key, value);
  } catch (error) {
    throw new LocalWorkspaceStorageError(`${label} metadata could not be saved. The workspace data remains available by its local identifier.`, { cause: error });
  }
}

export function readWorkspaceJson<T>(
  storage: ReadStorage,
  key: string,
  label: string,
  identity: IdentityRequirement,
  shape: ShapeRequirement,
): T | undefined {
  const serialized = readStorageString(storage, key, label);
  if (serialized === undefined) return undefined;

  let parsed: unknown;
  try {
    parsed = JSON.parse(serialized);
  } catch (error) {
    throw new LocalWorkspaceStorageError(`${label} data is malformed and cannot be loaded. The original saved value was preserved for recovery or deletion.`, { cause: error });
  }

  const workspace = unwrapWorkspaceEnvelope(parsed, label);
  if (!isRecord(workspace)) {
    throw new LocalWorkspaceStorageError(`${label} data is not a workspace object. The original saved value was preserved.`);
  }
  if (workspace[identity.field] !== identity.expected) {
    throw new LocalWorkspaceStorageError(`${label} identity does not match the active workspace. The original saved value was preserved.`);
  }

  const missingArrays = shape.arrays.filter((field) => !Array.isArray(workspace[field]));
  const missingRecords = (shape.records ?? []).filter((field) => !isRecord(workspace[field]));
  const missingStrings = (shape.strings ?? []).filter((field) => typeof workspace[field] !== "string");
  const missing = [...missingArrays, ...missingRecords, ...missingStrings];
  if (missing.length > 0) {
    throw new LocalWorkspaceStorageError(`${label} data is incomplete or invalid. Required workspace fields: ${missing.join(", ")}. The original saved value was preserved.`);
  }

  return workspace as T;
}

export function writeWorkspaceJson(storage: WriteStorage, key: string, label: string, value: unknown): void {
  const envelope: WorkspaceEnvelope = {
    schemaVersion: CURRENT_WORKSPACE_SCHEMA_VERSION,
    workspace: value,
  };

  let serialized: string;
  try {
    serialized = JSON.stringify(envelope);
  } catch (error) {
    throw new LocalWorkspaceStorageError(`${label} could not be serialized and was not saved.`, { cause: error });
  }

  try {
    storage.setItem(key, serialized);
  } catch (error) {
    throw new LocalWorkspaceStorageError(`${label} could not be saved. Local storage may be unavailable or full; the previous saved value was not intentionally removed.`, { cause: error });
  }
}

export function removeStorageItems(storage: RemoveStorage, keys: readonly string[], label: string): void {
  try {
    for (const key of keys) storage.removeItem(key);
  } catch (error) {
    throw new LocalWorkspaceStorageError(`${label} could not be removed completely. Review the local profile before retrying.`, { cause: error });
  }
}

function unwrapWorkspaceEnvelope(parsed: unknown, label: string): unknown {
  if (!isRecord(parsed)) return parsed;

  if (!("schemaVersion" in parsed)) {
    // Legacy schema version 0 stored the workspace object directly. Read it
    // without mutation; the next successful save writes the current envelope.
    return parsed;
  }

  const schemaVersion = parsed.schemaVersion;
  if (typeof schemaVersion !== "number" || !Number.isInteger(schemaVersion) || schemaVersion < 1) {
    throw new LocalWorkspaceStorageError(`${label} has an invalid workspace schema version. The original saved value was preserved.`);
  }

  if (schemaVersion !== CURRENT_WORKSPACE_SCHEMA_VERSION) {
    const direction = schemaVersion > CURRENT_WORKSPACE_SCHEMA_VERSION ? "newer" : "unsupported";
    throw new LocalWorkspaceStorageError(
      `${label} uses ${direction} workspace schema version ${schemaVersion}; this build supports version ${CURRENT_WORKSPACE_SCHEMA_VERSION}. The original saved value was preserved. Use a compatible Viable version or restore a compatible backup before retrying.`,
    );
  }

  if (!("workspace" in parsed)) {
    throw new LocalWorkspaceStorageError(`${label} schema envelope is missing its workspace payload. The original saved value was preserved.`);
  }

  return parsed.workspace;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
