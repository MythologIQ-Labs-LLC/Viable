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

On 2026-10-28 a further adversarial review caught and corrected a real gate-ordering defect: disabling form controls before the controller snapshots `FormData` caused the submitted values to disappear. All three original shells now start the guarded controller synchronously, **then** disable its controls. The regression contract checks that exact ordering.

The production PWA smoke was expanded with two more visible failure probes: invalid Repository Growth import retains its source input; Analytics rejects a nonexistent metric but retains the cohort form and accepts a corrected retry. These are test additions, not yet executed evidence.

The same gate is now wired into Repository Growth (`b83919b7`) and Calendar/Analytics + Publication Inventory (`c1e747f1`). A regression contract at `26cdbd45` requires all three shells to retain the acknowledged-persistence boundary and the Campaign/Studio production-PWA failure/retry journey.

## Product-wide risk inventory

| Surface | Current finding | Classification | Next evidence/action |
|---|---|---|---|
| Campaign / Studio | `aria-busy` without mutation serialization; failed form rerender lost local intent | **Confirmed, remediation candidate implemented** | Run deterministic gate tests + production Chromium journey + exact-head CI |
| Video Production inside Studio shell | Shares Campaign shell mutation dispatch | **Covered by candidate gate at shell boundary** | Verify no Video-specific retry state is lost |
| Repository Growth | Click/submit paths set `aria-busy`, started async controller work, rerendered on success **and failure**, and did not serialize another mutation | **Confirmed pattern; remediation candidate implemented** | Gate now blocks overlapping visible mutations/navigation, preserves failed form DOM, and adds pending/saved/failed state. Add a focused browser failure/retry probe before merge. |
| Calendar / Activation / Analytics | Activation and Publication Inventory actions/submits shared the same async fire/rerender pattern and could overlap each other | **Confirmed pattern; remediation candidate implemented** | Shared shell gate now serializes visible Activation and Publication Inventory mutations, preserves failed form DOM, blocks click-navigation while pending, and adds `beforeunload`. Add focused browser failure/retry coverage. |
| Product Core shell (`app.ts`) | `act()` only marked busy; async Product Core and Signals actions could overlap, and a failed write rerendered away local input | **Confirmed pattern; remediation candidate implemented** | Shared gate, explicit pending/failed/saved, retained failed form DOM, and Product/Signals submit/action gating. Browser failure/retry proof and regression qualification remain. |
| Signals inline workflows | Signals submissions/actions formerly bypassed Product Core's pending-write state | **Candidate remediation implemented** | Signals routed through shared Product/Signals gate. Verify contextual review and persistent inputs through browser acceptance. |
| Workspace lifecycle | Destructive delete/replace already had confirmation and recovery decisions, but neither was protected against repeat invocation during IndexedDB commit | **Candidate remediation implemented** | Added shared destructive-operation pending guard for delete/restore, blocked concurrent interaction and navigation, and browser same-turn double-click assertion. |
| Contextual review shell | Review form previously stayed `aria-busy` after failed owning save; Escape/cancel could close an in-flight review | **Candidate remediation implemented** | Treat dispatch as pending, block Escape/cancel during save, clear stuck busy on owning failure, preserve reviewer/note and retry. Must verify in real browser. |
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
3. execute the newly added Repository Growth and Activation/Learning failure/retry probes in production Chromium;
4. execute Workspace destructive-action same-turn double-click browser probe and native backup/delete/restore regressions;
5. execute contextual-review ownership/acknowledgement behavior under failure and maintain the human-only acceptance gate;
6. reconcile status/handoff documentation;
7. run exact-head CI and Desktop/Tauri gates;
8. keep #79/#81 human-only acceptance explicitly open.

## Candidate implementation expansion (2026-10-28)

- `fa0b9b79`: Product Core and Signals use the same local acknowledged mutation gate and preserve failed forms.
- `5c8d6bd0`: Workspace delete/restore now shares a durable pending gate; all existing scope, typed confirmation, recovery-point, and quarantine policies are preserved.
- `74411f5a`: contextual review no longer describes dispatch as durable success, blocks dismissal during pending writes, and releases stale `aria-busy` on owning failure.
- `bde8c436`: production browser journey exercises same-turn duplicate clicks through the actual visible Workspace delete button.
- `fe3bdcda`: added static regression contracts for Product/Signals, Workspace, and contextual review.

The candidate remains **unqualified** until TypeScript/core tests and actual PWA/Desktop gates have executed. No native install, external publishing, or human acceptance was claimed in this review.

## Final pre-CI gate audit

A final review caught a misleading success state: shell operations that returned no action result (for example a cancelled inline review) were being announced as durably saved. The Campaign/Studio, Repository Growth, and Activation/Learning shells now explicitly treat `undefined` as no submitted mutation, clear the pending indicator and do not claim canonical success. A failure while refreshing the view after a completed write is reported as **saved, but refresh failed**, not as a failed write. Every post-operation path returns controls to an interactive state.

Draft PR #179 is the integration candidate. As of this note, CodeQL has begun, but core TypeScript, deterministic tests, production PWA smoke and native Desktop qualification have not yet been observed passing on the final head. No release or merge authorization follows from this implementation.
