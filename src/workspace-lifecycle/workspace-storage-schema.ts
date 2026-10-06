/**
 * Workspace storage schema contract (#36, docs/architecture/workspace-storage-schema.md).
 *
 * The single definition of how an authoritative workspace context is
 * represented in local durable storage, which historical representations this
 * build still reads, and how each one reaches the current representation.
 * Every reader and writer (store adapters, the lifecycle service, the
 * Workspace screen) goes through this module so the rules cannot drift.
 *
 * Rules:
 * - Migration only changes the storage envelope. The workspace payload is
 *   carried through unchanged, so no domain authority (Product Core, claims,
 *   evidence, approvals, scheduling, learning) can be added, dropped, or
 *   reinterpreted by a migration.
 * - Migration is lazy: reads never write. The next successful save of a
 *   context writes the current envelope in the same durable commit as the
 *   change, so the original representation stays in place until the new one
 *   is committed.
 * - Versions newer than this build fail closed. They are never rewritten or
 *   downgraded; they stay quarantinable as raw text.
 * - The backup format carries unwrapped payloads and is versioned separately
 *   (`viable.workspace-backup`), so it does not change when this one does.
 */

export const LEGACY_WORKSPACE_SCHEMA_VERSION = 0;
export const CURRENT_WORKSPACE_SCHEMA_VERSION = 1;

export type RetainedWorkspaceSchemaVersion = typeof LEGACY_WORKSPACE_SCHEMA_VERSION | typeof CURRENT_WORKSPACE_SCHEMA_VERSION;

/** Every storage representation this build promises to read, and its path to current. */
export const RETAINED_WORKSPACE_SCHEMA_VERSIONS = [
  {
    version: LEGACY_WORKSPACE_SCHEMA_VERSION,
    representation: "Workspace object stored directly, with no schemaVersion field (written before PR #62).",
    migration: "Wrap the unchanged workspace payload in the current envelope on the next successful save.",
  },
  {
    version: CURRENT_WORKSPACE_SCHEMA_VERSION,
    representation: "{ schemaVersion: 1, workspace } envelope (PR #62 onward).",
    migration: "Current version; migration is a no-op.",
  },
] as const;

export type StoredWorkspaceEnvelope = Readonly<{
  schemaVersion: typeof CURRENT_WORKSPACE_SCHEMA_VERSION;
  workspace: unknown;
}>;

export type DecodedStoredWorkspace =
  | Readonly<{ status: "decoded"; schemaVersion: RetainedWorkspaceSchemaVersion; workspace: unknown }>
  | Readonly<{ status: "unsupported_future"; schemaVersion: number }>
  | Readonly<{ status: "invalid_envelope"; reason: "invalid_version" | "missing_workspace" }>;

/**
 * Classifies a parsed stored value. Pure: it never mutates, and it accepts
 * only the retained versions above. An object without `schemaVersion` is the
 * legacy v0 representation; any other version value is rejected.
 */
export function decodeStoredWorkspace(parsed: unknown): DecodedStoredWorkspace {
  if (!isRecord(parsed) || !("schemaVersion" in parsed)) {
    return { status: "decoded", schemaVersion: LEGACY_WORKSPACE_SCHEMA_VERSION, workspace: parsed };
  }
  const version = parsed.schemaVersion;
  // v0 never had an envelope, so an explicit 0 is not a retained representation.
  if (typeof version !== "number" || !Number.isInteger(version) || version < 1) {
    return { status: "invalid_envelope", reason: "invalid_version" };
  }
  if (version > CURRENT_WORKSPACE_SCHEMA_VERSION) return { status: "unsupported_future", schemaVersion: version };
  if (!("workspace" in parsed)) return { status: "invalid_envelope", reason: "missing_workspace" };
  return { status: "decoded", schemaVersion: CURRENT_WORKSPACE_SCHEMA_VERSION, workspace: parsed.workspace };
}

/** The only storage representation this build writes. */
export function encodeStoredWorkspace(workspace: unknown): StoredWorkspaceEnvelope {
  return { schemaVersion: CURRENT_WORKSPACE_SCHEMA_VERSION, workspace };
}

export type StoredWorkspaceMigration =
  | Readonly<{ status: "current"; serialized: string }>
  | Readonly<{ status: "migrated"; fromVersion: RetainedWorkspaceSchemaVersion; serialized: string }>
  | Readonly<{ status: "refused"; reason: string }>;

/**
 * Deterministic, idempotent migration of one stored value to the current
 * representation. A current value is returned byte-for-byte unchanged. A
 * value that is not a JSON object, uses an invalid or newer version, or lacks
 * its payload is refused and left for quarantine; it is never rewritten.
 * Callers must still validate identity and shape before persisting.
 */
export function migrateStoredWorkspace(serialized: string): StoredWorkspaceMigration {
  let parsed: unknown;
  try {
    parsed = JSON.parse(serialized);
  } catch {
    return { status: "refused", reason: "Stored value is not valid JSON" };
  }
  const decoded = decodeStoredWorkspace(parsed);
  if (decoded.status === "unsupported_future") {
    return { status: "refused", reason: `Stored value uses newer workspace schema version ${decoded.schemaVersion}; this build supports version ${CURRENT_WORKSPACE_SCHEMA_VERSION} and never downgrades` };
  }
  if (decoded.status === "invalid_envelope") {
    return { status: "refused", reason: decoded.reason === "invalid_version" ? "Stored value has an invalid workspace schema version" : "Stored schema envelope is missing its workspace payload" };
  }
  if (!isRecord(decoded.workspace)) return { status: "refused", reason: "Stored workspace payload is not an object" };
  if (decoded.schemaVersion === CURRENT_WORKSPACE_SCHEMA_VERSION) return { status: "current", serialized };
  return { status: "migrated", fromVersion: decoded.schemaVersion, serialized: JSON.stringify(encodeStoredWorkspace(decoded.workspace)) };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
