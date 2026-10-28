# Cross-tab IndexedDB conditional commits (2026-10-28)

## Purpose and authority

This bounded #183 remediation follows merged UX hardening #179 / issue #171. UI-level serialized mutations do not prevent two independently hydrated Viable windows from reading the same serialized workspace and overwriting one another. The authoritative IndexedDB backend previously performed blind `put/delete` operations inside a transaction. A transaction alone only prevents torn writes; without checking the value originally read, it does not prevent stale last-writer-wins updates.

## Reproducible falsifiers

The new `test/durable-key-value-storage.test.ts` tests use two `DurableKeyValueStorage` instances opened on one shared transactional memory backend. They cover:

1. Both windows begin from the same whole-workspace value; the first commits, the second attempts a different stale write. The second **must fail with `DurableStorageConflictError`** rather than overwrite the first.
2. Windows writing **different** keys both succeed; the guard does not impose unnecessary global serialization.
3. An external change notification arriving while one tab has unsaved intent must **not change the expected version** of that pending intent.
4. A stale deletion must **not delete** a newer value written by another window.
5. A multi-key batch containing even one stale expected value must **abort all changes**, with no partial state and no success broadcast.
6. A source-level guard verifies the real IndexedDB implementation performs `store.get`, comparison, and `put/delete` in one readwrite transaction, with explicit abort on mismatch.

These tests were written in branch commit `eb94f53a` before the implementation commits, preserving red-before-green test intent; their execution result must be obtained from subsequent qualification, not inferred from source inspection.

## Implementation

`DurableStorageBackend.commitIfUnchanged(changes, expected)` is the ordinary-write authority. `expected` stores the raw previous value for every key at the moment the synchronous Storage-like `setItem/removeItem` first receives a local change. Subsequent local changes to the pending key preserve the original expected value. An external BroadcastChannel message never grants authority to write a now-stale pending whole-record snapshot.

In `IndexedDbBackend`, a single strict-durability `readwrite` transaction reads expected values, aborts on any mismatch, and only enqueues writes after all checks pass. A rejected transaction has no durable partial writes and produces no committed-change notification. The UI's existing acknowledged-persistence failure path displays a distinct, actionable conflict error; it cannot claim that a rejected write was saved.

`DurableStorageBackend.commit()` remains reserved for the retained one-time migration, not ordinary workspace edits. `localStorage` fallback when IndexedDB is wholly absent does not have transactional CAS and is **not** claimed to offer the new cross-tab guarantee.

## Known boundaries

- No automatic field-level merge of opaque Product, Signals, Campaign, repository-growth, Video, Calendar or Publication Inventory records. On collision, fail closed and request human reconciliation/reload.
- BroadcastChannel is eventual notification, not an ownership lease or version oracle. Transaction-bound comparison, not notification ordering, is what rejects stale writes.
- The retained legacy migration and unsupported/no-IndexedDB fallback are separate trust boundaries. Concurrent first-use migrations should receive an independent adversarial probe before broad release readiness is claimed.
- A conflict can leave an unaffected tab's in-memory cache stale until an external broadcast or reload. The explicit error requests reload; do not pretend local cache recovery has already merged all newer changes.
- User-only keyboard/zoom/unfamiliar-user acceptance (#79/#81), live provider publication proof (#107), and RustSec informational-warning triage (#182) remain independent gates.

## Qualification

**Pending:** exact-head core/desktop TypeScript, deterministic tests (including the competing-window falsifiers), production Chromium PWA and portable origin migration, and Rust 1.88/Tauri/Desktop gates. Keep this #183 candidate unmerged until actual results are recorded. No hosted service or required LLM dependency is introduced.
