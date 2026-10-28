# Acknowledged Persistence and UI-Only Journey Hardening Review

## Document control

| Field | Value |
|---|---|
| Review date | 2026-10-28 |
| Issue | #171 |
| Branch | `hardening/171-acknowledged-persistence` |
| Main baseline | `f2abed27ca73ac100dfbfdf7ef823311af5ef05e` |
| Status | Active remediation review, not final qualification |

## Objective

Apply the strongest recent acknowledged-persistence and UI-only journey lessons to Viable without changing its authority boundaries.

The governing persistence model is:

`local intent -> pending -> canonical acknowledgement -> saved`

A failed write must remain visibly failed, preserve recoverable user intent where a form is involved, and support correction/retry. A visual `aria-busy` flag alone is not mutation serialization.

For critical browser acceptance journeys, user-facing mutations must occur through visible UI controls. Internal storage/services may be read for assertions, fixture setup where no user path exists, and fault injection, but not used to perform the journey being claimed.

## Confirmed Campaign / Studio defect class

At the reviewed main baseline, `campaign-shell.ts`:

- set `aria-busy=true` for Campaign/Studio mutations;
- did not prevent a second submit/action while the first mutation was unresolved;
- allowed navigation while the write was in flight;
- rerendered the workflow after a failed form mutation, discarding entered form values.

Campaign and Composition services both use whole-workspace load/modify/save operations, so overlapping UI mutations can derive independent snapshots from the same prior state. The shell therefore needed an acknowledged-mutation boundary even before any broader cross-tab compare-and-swap design.

### Red-before-green evidence

- `32af58a3`: added the acknowledged-persistence gate contract before the implementation existed.
- `0a4e65fe`: added the tested state machine for idle/pending/saved/failed behavior and overlap refusal.
- `38b1c02c`: routed Campaign/Studio mutations through the gate.
- `06c50e5f`: added a production-PWA journey that intentionally submits a no-op composition revision, verifies the failed save remains visible, verifies the entered rationale remains in the form, then corrects and retries through the same visible UI.

### Candidate behavior after remediation

Campaign/Studio now:

- accepts at most one user-triggered mutation at a time;
- disables mutation/form controls while persistence is pending;
- blocks in-shell navigation while a write is unacknowledged;
- installs a `beforeunload` guard while persistence is pending;
- exposes explicit pending, saved, and failed persistence states;
- keeps the existing DOM/form intact on failure instead of rerendering it away;
- permits a later explicit retry after failure;
- rerenders only after canonical acknowledgement.

This is a same-page/user-flow protection. It does **not** claim a cross-tab storage transaction or compare-and-swap guarantee.

## Product-wide risk inventory

| Surface | Current finding | Classification | Next evidence/action |
|---|---|---|---|
| Campaign / Studio | `aria-busy` without mutation serialization; failed form rerender lost local intent | **Confirmed, remediation candidate implemented** | Run deterministic gate tests + production Chromium journey + exact-head CI |
| Video Production inside Studio shell | Shares Campaign shell mutation dispatch | **Covered by candidate gate at shell boundary** | Verify no Video-specific retry state is lost |
| Repository Growth | Click/submit paths set `aria-busy`, start async controller work, rerender on success **and failure**, and do not serialize another mutation | **High-risk pattern, reproduction pending** | Add failed-form retention test; then reuse gate if reproduced |
| Calendar / Activation / Analytics | Activation and Publication Inventory actions/submits have the same async fire/rerender pattern and no pending-mutation serialization | **High-risk pattern, reproduction pending** | Target analytics/import and destination/action mutations first |
| Product Core shell (`app.ts`) | `act()` marks busy but does not reject a second action; failures rerender. Signals actions use independent promise chains | **High-risk pattern, reproduction pending** | Test overlapping Product Core writes and failed long-form save retention |
| Signals inline workflows | Some user prompts were already replaced by inline forms and existing browser journeys prove several recovery paths | **Partially hardened** | Check whether failed controller submit rerenders discard inline intent |
| Workspace lifecycle | Destructive delete/replace has scope confirmation, typed DELETE, recovery-point/quarantine decisions, durable commit ordering, and focused error states | **Stronger controls already present** | Verify repeat clicks/restore/delete cannot overlap while durable commit is pending |
| Contextual review shell | Validates reviewer/note and marks the form `aria-busy`, but dispatch to the owning workflow is synchronous from this shell and its busy state is not itself canonical acknowledgement | **Verification required** | Ensure owning async workflow prevents escape/duplicate action until durable result is known |
| Progressive long-form drafts | Existing draft shell protects ordinary navigation and `beforeunload` for unsaved drafts | **Existing protection to preserve** | Ensure pending/failed acknowledgement composes with draft dirty state |
| Human-only accessibility gates | Keyboard-only, 200% zoom, non-color comprehension, unfamiliar-user acceptance remain governed separately | **Human-only by design** | Do not convert #79/#81 into synthetic acceptance claims |

## Residual architectural risk

The candidate gate prevents overlapping mutations generated by one visible Campaign/Studio shell. It does not establish cross-tab atomicity.

Viable's authoritative workspace storage is IndexedDB through `DurableKeyValueStorage`. Commits are serialized inside one storage instance and external changes are propagated by BroadcastChannel, but Campaign workspace services still operate on whole-workspace snapshots.

A future storage-level compare-and-swap or revision-bound mutation primitive may be warranted if a reproducible multi-tab lost-update case remains after shell-level hardening. Do not claim that this branch solves that class until such a guarantee participates in the actual storage/write boundary.

## Qualification still required

Before #171 can close:

1. run the new acknowledged-persistence gate tests;
2. run the production Chromium PWA journey including failed-save retention/retry;
3. reproduce and remediate the highest-risk Repository Growth and Activation/Learning paths or record why their existing semantics are sufficient;
4. verify Workspace destructive operations against repeat invocation while pending;
5. verify contextual-review ownership/acknowledgement behavior;
6. reconcile status/handoff documentation;
7. run exact-head CI and Desktop/Tauri gates;
8. keep #79/#81 human-only acceptance explicitly open.
