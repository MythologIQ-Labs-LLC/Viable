# First-use migration authority hardening — 2026-10-28

## Problem and source-level falsifier

After #183 / PR #184, ordinary workspace writes use readwrite-transaction compare-and-swap. **First-use legacy migration did not**. Two tabs could each read a missing migration marker before a write; the second then replayed its stale legacy values through an unconditional transaction after the first had saved newer data.

The adversarial test in `test/durable-key-value-storage.test.ts` was committed first at `e4949ee2`. It gates the second migrator's stale attempt, commits a newer workspace value in the first instance, then resumes the second. This is a **red-intent** test in the source chronology; no actual pre-fix failing CI run is asserted here.

## Implementation

`DurableKeyValueStorage.open()` now delegates to `DurableStorageBackend.migrateLegacy()` and constructs its synchronous snapshot from the backend's verified result. It never treats a separate prior `loadAll()` read as migration authority.

The real IndexedDB backend obtains an exclusive `readwrite` transaction for the entire migration: gather keys/values, check the authoritative migration marker, copy only genuinely absent `viable.*` keys (excluding a forged legacy marker), write the canonical marker, read back all entries in the same transaction, and resolve **only after transaction completion**. If the marker already exists it returns `already_migrated` and authoritative data without replaying localStorage. Any verification mismatch aborts the whole transaction. Unconditional `commit()` is no longer part of the ordinary workspace/migration backend interface.

The original legacy localStorage copy remains untouched as an explicit recovery source. Missing existing authoritative keys are the only migration candidates; schema v0/v1 compatibility and workspace-deletion legacy cleanup are preserved.

## Test inventory

- Deterministic delayed-second-migrator vs a newer authoritative write; only one copy, second reports `already_migrated`, later edit survives
- Atomic failure / retry: no false marker or partial data when the transaction fails
- A forged migration marker in localStorage cannot impersonate the IndexedDB marker
- Existing migration idempotence, existing-record precedence, corrupted-value rejection, lifecycle and schema fixture tests
- Actual Chromium production-origin check: two simultaneously opening tabs start with the same legacy copy; precisely one migrates; both see the same authoritative record; subsequent saved changes survive new tab startup
- Actual Chromium forced first-use readwrite failure: startup fails closed without marker or copied data, preserves localStorage, and a clean tab retries successfully

Browser-specific assertions are storage-level tests, not an assertion that a human completed the application's UX acceptance journeys.

## Residuals and merge gates

The new fixed-head CI must prove the above and all existing Chromium journeys, TypeScript/coverage, security/viability, and cross-origin backup migration. The native Desktop lane must pass RustSec, Rust 1.88 locked tests, Tauri bundle and Debian inspection. Keep draft until the exact-head evidence exists.

The absence of IndexedDB still uses the previously documented localStorage fallback, which is **not** claimed to be transactionally cross-tab safe. #79/#81 human acceptance, #107 live provider proof, #182 informational RustSec warnings and #36 release readiness are independent.

No new automation or permanent write-enabled workflow is introduced.