# Workspace storage schema: versions, migration, and rollback

Status: current contract (#36, Durable storage and recovery).
Code: `src/workspace-lifecycle/workspace-storage-schema.ts`.
Fixtures: `test/fixtures/workspace-storage-schema/`.
Tests: `test/workspace-storage-migration.test.ts`.

This page defines how Viable stores each authoritative workspace context on the device, which older stored forms it still reads, and what happens with a form it does not support. It covers the storage envelope only. The portable backup format (`viable.workspace-backup`) is a separate, independently versioned contract (ADR-0010).

## Scope

Seven authoritative contexts share one storage contract. Each context is stored under its own key, `<prefix><workspaceId>`:

| Context | Key prefix |
| --- | --- |
| Product Core | `viable.product-workspace.` |
| Campaigns and exports | `viable.campaign-workspace.` |
| Signals | `viable.signals-inbox.` |
| Calendar and Learning | `viable.activation-learning.` |
| Repository Growth | `viable.repository-growth.` |
| Video Production | `viable.video-production.` |
| Website Watch | `viable.website-watch.` |

Every store adapter (`apps/desktop/ui/local-storage-json.ts`), the workspace lifecycle service, and the Workspace screen read and write through the one contract module, so the rules cannot drift between them. Repository viability checks enforce this for the store adapters and the lifecycle service.

## Retained versions

These are the only stored forms this build reads. `RETAINED_WORKSPACE_SCHEMA_VERSIONS` lists them in code.

| Version | Stored form | Path to current |
| --- | --- | --- |
| 0 (legacy) | The workspace object stored directly, with no `schemaVersion` field. Written before PR #62. | Wrap the unchanged payload in the current envelope on the next successful save. |
| 1 (current) | `{ "schemaVersion": 1, "workspace": <payload> }`. Written from PR #62 onward. | None needed. Migration is a byte-identical no-op. |

Every other form is rejected:

| Stored form | Outcome |
| --- | --- |
| `schemaVersion` greater than 1 | **Unsupported future version.** Fails closed. |
| `schemaVersion` of 0, negative, fractional, or not a number | Invalid envelope. v0 never had an envelope. |
| Envelope without a `workspace` field | Invalid envelope. |
| Malformed JSON, or a payload that is not an object | Corrupt. |
| Payload whose identity field does not match its key, or that is missing required collections | Corrupt. |

A rejected context is shown as corrupt on the Workspace screen. It is never rewritten. Its raw text can be exported with **Export quarantine data**.

## Forward migration

- **Envelope only.** Migration changes only the envelope. The payload is carried through unchanged, so a migration cannot add, drop, or reinterpret Product Core, claims, evidence, approvals, scheduling, learning, or any other domain authority. Read-time defaults that a store adds (for example, the Activation publication-ledger arrays) are store behavior, not migration. The v0 Activation fixture omits those arrays to prove migration does not add them.
- **Lazy.** Reads never write. A v0 context stays v0 until its store next saves it. That save writes the current envelope in the same durable commit as the user's change.
- **Deterministic and idempotent.** `migrateStoredWorkspace` maps each v0 fixture byte-for-byte to the matching v1 fixture. Migrating a current value returns it unchanged.
- **Through restore.** Restoring a backup always writes the current envelope.
- **Mixed versions.** One workspace may hold v0 and v1 contexts side by side. Each one is read according to its own version.

## Failure and rollback within a migration

The original stored form stays in place until the migrated form is durably committed.

- With IndexedDB authority, `DurableKeyValueStorage.commit()` writes every queued change in one transaction. If the commit fails, nothing is persisted, and the in-memory view reverts to the last committed values. In the tests, the original v0 records survive byte-identical, and a retry produces exactly the same result as a run that never failed.
- Restore and deletion also snapshot every affected key first. If a write fails partway, they put each key back exactly as it was before reporting the failure.

## Unsupported future versions and downgrade

- A version newer than this build is never read as valid, never rewritten, and never downgraded automatically. It stays quarantinable as raw text.
- **Replace-current restore** would overwrite a workspace that holds corrupt or newer-version contexts, destroying the only copy. The lifecycle service therefore refuses it until the caller confirms that the raw data was exported to quarantine. The Workspace screen keeps **Replace current workspace from backup** disabled until **Export quarantine data** has run for that workspace. Restoring into an empty profile cannot hit this case.
- Viable does not support downgrading in place to an older build, and it never writes an older storage form. To move data to an older build, use a `viable.workspace-backup` v1 file. Any build from PR #80 onward can restore that format, because backups never contain storage envelopes.

## Backup independence

Backups carry unwrapped payloads, never storage envelopes. A backup taken before migration (from v0 storage) and one taken after (from v1 storage) are identical, including their checksum, so a storage-schema change does not require a backup-format change. `viable.workspace-backup` stays at version 1. Backups reject credential-like field names from any stored version, and migration cannot add such fields.

## Storage engine migration

Moving from `localStorage` to IndexedDB (PR #119) is a separate, one-time copy. It is not a schema migration:

- it copies stored strings verbatim, including v0 records;
- it never overwrites a key that IndexedDB already holds;
- it leaves the `localStorage` copy untouched as a recovery source;
- after its marker is written, it never reads `localStorage` again.

If IndexedDB exists but cannot be opened, Viable fails closed and never serves the stale `localStorage` copy (PR #126).

## Adding a new version

Do not add a version to demonstrate the mechanism. Add one only when a real change to the stored form requires it, and then:

1. Add the new version to `RETAINED_WORKSPACE_SCHEMA_VERSIONS` with its stored form and migration path, and make it current.
2. Keep every older retained version readable, or mark it explicitly unsupported in this page and in code.
3. Add `v<N>/` fixtures for all seven contexts. Prove that each older fixture migrates deterministically to them, and that the migration preserves domain authority.
4. Prove that a failed migration is non-destructive, and that older builds treat the new version as an unsupported future version.
5. Decide separately whether the backup format needs a new version. It usually does not.

## Evidence limits

The fixtures and tests are deterministic Node evidence against in-memory storage and an in-memory transactional backend. Browser evidence comes from the PWA smoke test (`scripts/pwa-smoke.mjs`): it covers the `localStorage`-to-IndexedDB engine migration, backup → delete → restore into an empty profile, and fail-closed IndexedDB authority. No real browser has exercised the v0 → v1 envelope upgrade, because the code path is the same pure function on every runtime. No browser or native runtime has exercised replace-current restore or the new quarantine gate yet.
