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

  if (!isRecord(parsed)) {
    throw new LocalWorkspaceStorageError(`${label} data is not a workspace object. The original saved value was preserved.`);
  }
  if (parsed[identity.field] !== identity.expected) {
    throw new LocalWorkspaceStorageError(`${label} identity does not match the active workspace. The original saved value was preserved.`);
  }

  const missingArrays = shape.arrays.filter((field) => !Array.isArray(parsed[field]));
  const missingRecords = (shape.records ?? []).filter((field) => !isRecord(parsed[field]));
  const missingStrings = (shape.strings ?? []).filter((field) => typeof parsed[field] !== "string");
  const missing = [...missingArrays, ...missingRecords, ...missingStrings];
  if (missing.length > 0) {
    throw new LocalWorkspaceStorageError(`${label} data is incomplete or invalid. Required workspace fields: ${missing.join(", ")}. The original saved value was preserved.`);
  }

  return parsed as T;
}

export function writeWorkspaceJson(storage: WriteStorage, key: string, label: string, value: unknown): void {
  let serialized: string;
  try {
    serialized = JSON.stringify(value);
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
