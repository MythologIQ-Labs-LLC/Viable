# Workspace storage schema fixtures

Deterministic stored representations for every workspace storage schema version
this build promises to read. The contract is defined in
`src/workspace-lifecycle/workspace-storage-schema.ts` and documented in
`docs/architecture/workspace-storage-schema.md`.

Each file holds the exact string stored under a context's key (one line,
compact JSON, plus a trailing newline that the tests strip).

| Path | Representation |
| --- | --- |
| `v0/<context>.json` | Legacy schema v0: the workspace object stored directly (before PR #62). |
| `v1/<context>.json` | Current schema v1: `{ schemaVersion: 1, workspace }`. Byte-for-byte the migration of the matching v0 file. |
| `future-v2-signals.json` | A version newer than this build. It must fail closed and stay quarantinable. It is not a v2 schema definition. |

All seven authoritative contexts are covered for every retained version:
`product`, `campaign`, `signals`, `activation`, `repositoryGrowth`,
`videoProduction`, `websiteWatch`. The workspace ID is `fixture-ws`.

The activation fixtures deliberately omit the publication-ledger arrays that
the Activation store defaults on read. Migration must not add them; read-time
defaults are store behavior, not migration.

Do not regenerate these files to make a test pass. A change to a retained
representation is a schema change and needs a new version.
