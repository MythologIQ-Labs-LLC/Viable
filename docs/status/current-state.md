# Viable Current State

## Document control

| Field | Value |
|---|---|
| Status | Authoritative implementation-status record |
| Last reviewed | 2026-10-07 |
| Reviewed against | `main` through `379050badeada9f84ff2a9afa8c39b5d3b7e4cb6` (#109, #134–#137, and #139–#143 included), plus the 2026-10-07 local-dogfood QA remediation (`docs/reviews/local-dogfood-qa-2026-10-07.md`) and the open human-gated work listed below |
| Product requirements | `docs/product/PRD.md` |
| Runtime and distribution authority | `docs/adr/0010-pwa-first-distribution-and-runtime-capabilities.md` |
| Publishing authority | `docs/adr/0009-deterministic-publishing-and-capability-routed-setup.md`, `docs/architecture/content-inventory-and-automated-publishing.md` |
| Platform architecture | `docs/architecture/viable-platform.md` |
| PWA planning review | `docs/reviews/pwa-runtime-roadmap-review-2026-10-05.md` |
| ADRs | `docs/adr/README.md` |
| Open decisions | `docs/decisions/open-decisions.md` |
| Current handoff | `docs/handoff/CURRENT.md` |

The previous revision of this record (2026-09-24) predated ADR-0009, ADR-0010, the publication inventory and scheduler, the credential vault, the PWA runtime, IndexedDB authority, and the localhost self-host path. It understated the implementation and is superseded by this revision.

## Evidence vocabulary

This record keeps these states distinct. A later state never follows automatically from an earlier one.

| State | Meaning |
|---|---|
| **Merged** | On `main`. |
| **Validated** | Deterministic tests, type checks, viability/security gates, and, where stated, real-browser or native-package checks passed on an exact head. |
| **Live-proven** | Exercised against the real external system (for example a real provider API), with evidence recorded. |
| **Human-accepted** | A named person completed the governed hands-on acceptance (keyboard-only, 200% zoom, non-color comprehension, unfamiliar-user journeys) and recorded the environment, findings, and remediation. |
| **Deferred** | Deliberately not pursued now; the trigger for resuming is named. |

As of this review, **nothing is human-accepted** and **no consequential external action is live-proven**. Read-only public GitHub collection is live-proven: #129 measured the production-default adapters succeeding in Chromium and the native webview, and that exact implementation is merged to `main`. LinkedIn member publishing is also merged and exact-head validated (#109 / `54093163`), but it is **not live-proven**; #107 remains open for clean-install guidance acceptance and one developer-owned publication.

## Summary

Viable implements the full local-first marketability loop (UNDERSTAND → PLAN → CREATE → ACTIVATE → MEASURE → LEARN) across its six initial product slices, Website Watch Stage 1, the UX-completion tranche (#72–#80, umbrella #81), and the deterministic publishing foundation (#98, #99, #106).

Under ADR-0010 the **primary runtime is a local-first PWA**. Before external demand, the canonical dogfood runtime is a production PWA build served on the developer's own machine:

```bash
npm ci
npm run pwa:selfhost   # serves http://localhost:4175
```

The native Tauri runtime is retained only where a capability earns it: the OS credential vault and connected provider publishing.

Viable is suitable for **persistent local dogfooding in a Chromium desktop browser**. It is **not** a supported end-user release: human acceptance, generalized schema migration/rollback, per-browser storage-eviction evidence, public-origin deployment trust, and operational support remain open.

## Current dogfood runtime and support boundary

| Runtime | Status | Evidence |
|---|---|---|
| Chromium (desktop) PWA at `http://localhost:4175` | **Supported for dogfood.** Install, service-worker control, IndexedDB authority, backup/delete/restore, offline reload, user-confirmed update, per-tab reload consent, migration, and fail-closed storage are validated by the real-browser smoke on every pull request. | CI `validate` job; PR #126 |
| Firefox PWA | **Experimental candidate.** Before PR #124 the app did not finish starting in Firefox. Merged #124 passed the full Playwright Firefox smoke on exact-head validation. On `main` at `e788430` (#137) one new check failed in Firefox: its simulated-eviction setup asserted on the IndexedDB deletion request's own result, which in Firefox stays `blocked` while a just-closed app page still holds its connection and completes only later; every Viable behavior under test passed. The smoke now closes the app page first and checks the outcome instead: after Viable restarts, no evicted record survives in IndexedDB or `localStorage`. No person has dogfooded Firefox yet, so Chromium remains the supported dogfood browser. | PR #124 |
| WebKit / Safari PWA | **Experimental; Safari support is not claimed.** Merged #124 now starts and completes the Playwright Linux WebKit smoke with four documented limitations. Three reload-related findings are reproduced by app-free controls with no Viable application code: reload after Back across multiple `pushState` entries; offline reload under Playwright's offline emulation; and the user-confirmed service-worker `controllerchange` update reload using production-equivalent cache churn. `navigator.storage.persist()` is also unavailable in that engine. Chromium and Firefox cover the affected contracts. **Undiagnosed (from `main` at `e788430`):** the WebKit renderer crashes (`Page crashed`) on the reload right after a replace-current restore. It is not yet reproduced by an app-free control, so it is not classified as an engine defect, and the rest of that smoke section (recovery-point undo and recovery mode) does not run in WebKit. The restore/reload probe narrows it: download → delete → restore → reload passes 3/3 in WebKit with and without service workers (CI run 37574642948), so restore itself is not the trigger; only variants that use Back across `pushState` entries hang on reload, matching the known app-free Back defect. The storage-durability, eviction and refused-write sections pass in WebKit. **No real Safari has been tested**, so Safari stays unsupported until a hand test exists. | PR #124 exact head `65fd274`; CI run 37506023154 |
| Native Tauri (Linux `.deb` build) | **Capability runtime, not the dogfood path.** Builds and packages in CI. Required for the OS credential vault and (when proven) LinkedIn publishing. | Desktop workflow |

Persistence rules for dogfood profiles:

- Use exactly `http://localhost:4175`. Browser storage is origin-bound; `pwa:selfhost` fails rather than moving to another port.
- An application update replaces the PWA shell, never the IndexedDB workspace.
- Export a `viable.workspace-backup` before upgrade experiments or destructive testing.
- The PWA never promises closed-app or exact-time publication. It evaluates the scheduler only while open.

## Runtime and persistence foundation

### PWA runtime (ADR-0010; PRs #118, #125, #126)

- deterministic static `dist-pwa/` build with manifest, icons, content-hash build identity (`build-info.json`), and SHA-256 build manifest;
- strict CSP and security headers from one source (`scripts/pwa-security-headers.mjs`); the only external network origin is `https://api.github.com`;
- versioned service worker that caches the application shell only. It never stores, proxies, or deletes workspace data;
- **update model:** a new build is announced, never applied silently. Only the person's confirmation activates it, and only the confirming tab reloads. Other open tabs show that the app was updated elsewhere and reload only on their own confirmation. Old shell caches are removed after activation;
- runtime capability model (`src/runtime/runtime-capabilities.ts`) and a Workspace → Runtime panel that states each capability as available, limited, or unavailable with a reason;
- `npm run pwa:selfhost` serves the production build at the canonical loopback origin with production headers and fails clearly when the port is occupied.

### Workspace storage authority (PRs #119, #126)

- Authoritative workspace data lives in **IndexedDB** in both the PWA and the native webview, through `DurableKeyValueStorage`. Reads come from a snapshot loaded at startup. Writes commit as atomic, durable transactions. A failed commit reverts the snapshot.
- Existing `localStorage` data is migrated once and verified; the legacy copy is kept as a recovery source, except that deleting a workspace also removes that workspace's legacy records once the IndexedDB deletion is durable (#36). Legacy copies of workspaces deleted before this change are not purged automatically, because after an IndexedDB eviction they may be the only recovery source.
- Changes made in one tab reach other open tabs through `BroadcastChannel`.
- **Fail closed:** whenever the runtime exposes IndexedDB and it cannot be opened, Viable shows a visible error and refuses writes rather than serving a possibly stale `localStorage` copy. `localStorage` is used only where the runtime does not expose IndexedDB at all.
- All seven portable workspace stores plus the machine-local provider-connection store await a durable commit before reporting success.

### Schema versions, backup, restore, quarantine, deletion (PRs #62, #88, #117, #119)

- every authoritative workspace store writes a versioned envelope; unversioned v0 data remains readable; unsupported future versions are treated as corrupt and quarantinable, never as valid;
- `viable.workspace-backup` v1: one file covering all seven workspace contexts, secret-field rejection, and a CRC32 integrity checksum (not a signature);
- restore into an empty profile or replace the current workspace, both through a validated preview and an explicit confirmation;
- quarantine export of unreadable raw records; destructive deletion is blocked until quarantine has been exported;
- durable deletion across the seven contexts;
- recovery points (#36): deletion and replace-current restore require either a downloaded recovery point of exactly the current state (an ordinary backup, refused as stale if the workspace changed afterwards) or an explicit choice to continue without one; Viable keeps no internal copy;
- browser round trip validated in the smoke: backup → deletion refused without a recovery-point decision → recovery point downloaded → delete (seen by a second open tab) → restore the recovery point into an empty profile → reload.

- retention defaults (#36): one stated policy (`src/workspace-lifecycle/retention-policy.ts`), shown on the Workspace screen and in the user guide. Viable never deletes or expires data on its own; Website Watch deadlines (14/90 days/none) only make payloads eligible for a named person's prune. Connected-provider metadata is machine-local, excluded from portable backups, and blocks workspace replacement/deletion until the provider is explicitly disconnected; vault credentials are removed by that disconnect flow, not by workspace deletion.

- browser evidence for replace-current restore (#36), in its own profile in the smoke: a backup of the same workspace offers replace-current (not empty-profile) restore; without a recovery-point decision it is refused and nothing changes; the recovery point captures the state about to be replaced; the replacement is durable in IndexedDB and survives reload; restoring the recovery point undoes it.

- browser storage durability (#36), in every engine the smoke runs: the report records what the browser says about persistence and quota and whether a `persist()` request was granted; the runtime panel reports persistence truthfully; after the origin's storage is cleared (simulated eviction) Viable starts as a clean, empty profile without errors or stale data, and a backup restores the workspace; a write the browser refuses (simulated by aborting the transaction, as quota exhaustion does) is reported as not saved and leaves nothing half-written. Real eviction under storage pressure and a real quota limit cannot be reproduced on demand (Chromium's DevTools quota override does not enforce IndexedDB writes), so those exact triggers remain unobserved.
- recovery mode (#36): when stored workspace data is unreadable, startup fails closed without changing anything and offers **Open workspace recovery**, which runs only the Workspace screen. The smoke proves in the browser that replacing corrupt data is blocked until quarantine is exported, the quarantine file preserves the raw record, a backup then replaces the workspace after an explicit decision, and Viable starts normally afterwards.

### Native runtime and credential vault (PRs #108, #113)

- Tauri 2 shell; Debian package built and inspected in CI on the pinned Rust 1.88 baseline;
- native credential vault boundary: provider secrets are stored only through the OS credential store (Linux Secret Service, Windows Credential Manager) behind narrow commands (`credential_capability`, `credential_put`, `credential_has`, `credential_delete`). Secrets never return to JavaScript, workspace data, logs, or exports;
- in the PWA, the vault and connected publishing are shown as unavailable with a concrete reason: browser JavaScript has no acceptable OS credential-vault authority for this design and the LinkedIn provider transport is implemented only in the native runtime. Manual activation remains available in the PWA.

## Deterministic publishing foundation (umbrella #97)

| Slice | Issue / PR | State |
|---|---|---|
| A. Publication inventory and approval authority | #98 / #104 | Merged and validated |
| B. Deterministic scheduler and execution ledger | #99 / #105 | Merged and validated |
| C. Native credential vault boundary | #106 / #108 | Merged and validated |
| Credential-store contract research | #100 | Closed (decision recorded) |
| First live provider selection | #101 | Closed: LinkedIn member publishing selected (#107) |
| D. LinkedIn member publishing proof | #107 / PR #109 | **Merged and exact-head validated; not live-proven. #107 remains open for two human evidence gates** |

Implemented on `main`:

- publication inventory items bound to exact approved source snapshots, publication policy, and destination;
- deterministic scheduler with an execution ledger, idempotency keys, explicit `not_dispatched`, `published`, `outcome_unknown`, retryable, and reconnect-required states, and no automatic retry after an ambiguous provider dispatch;
- a deterministic fake provider for tests only; manual activation remains the fallback for every destination.

PR #109 (LinkedIn member publishing, native-only) merged to `main` as `54093163` after exact-head CI, real-browser PWA smoke, Rust tests, desktop bundle, and Debian package validation passed. It provides the guided self-service setup, native OIDC identity validation, text-only `/v2/ugcPosts` publishing, provider receipt mapping, explicit disconnect, staged credential replacement, and deterministic scheduler integration. Provider connection metadata persists durably through `workspaceStorage`, remains outside portable backups, and blocks destructive workspace actions until disconnect removes the machine-local account authority. #107 stays open for clean-install guidance acceptance and one developer-owned LinkedIn publication using a human-generated token and consent.

### Product Core

- product workspace and product-truth revision;
- capabilities and limitations;
- claims and reviewed evidence;
- generated-suggestion separation;
- canonical ICP hypotheses, roles, dimensions, disqualifiers, contradictions, experiments, selection, history, and change conditions;
- explained marketability assessment and owned readiness actions;
- Home and Product desktop workflow.

### Signals and Market

- provider-neutral sources and source health;
- provenance, freshness, confidence, and limitations;
- bounded Event Intelligence import;
- public GitHub repository metadata and activity evidence. Merged #129 fixes the production-default unbound-`fetch` receiver defect in every runtime and adds the narrow native CSP authority required for `https://api.github.com`. Live collection was measured succeeding in Chromium and in the native webview;
- strict manual JSON import;
- named review, save, tag, assign, connect, and proposed-work conversion;
- governed reviewed-signal materialization into Product Core actions, Campaign drafts, Campaign-owned content briefs, Website Watch response planning through Calendar, and existing finding-backed Repository Growth actions;
- traceable authoritative destination references with explicit materialization failure, retry, idempotency, and recovery;
- visible verified-empty, partial, unavailable, rate-limited, validation-failed, transport-failed, offline, and recovery states;
- reviewed evidence summary in Market.

### Website Watch Stage 1

- watched sites with canonical public URL, normalized domain, ownership classification, purpose, authorization confirmation, retention, owner, and status;
- site-link, page-content, and product-price watch-target intent;
- strict Webdog-compatible pasted or local-file JSON import;
- input size, count, schema, unknown-field, origin, URL, and secret validation;
- browser-safe SHA-256 and public-address restrictions;
- explicit change, no-change, baseline, partial, unavailable, rate-limit, authentication, validation, transport, offline, and cancellation outcomes;
- bounded observations and generated-analysis separation;
- correlated Signals suggestions;
- named review synchronization;
- proposed work and reviewed Calendar planning;
- snapshot retention, explicit deletion, retention pruning, and preserved provenance;
- responsive, reduced-motion-safe, and focus-visible presentation.

Website Watch Stage 1 does not perform live collection, Context.dev requests, Webdog service synchronization, worker scheduling, private-page access, AI execution, notification, or publication.

### Campaigns and Studio

- Product Core-traceable campaign briefs;
- selected ICP or deliberate test audience;
- one primary audience and outcome;
- canonical assets and channel variants;
- claims, evidence, rights, accessibility, disclosures, comments, and version history;
- named campaign, asset, and variant review;
- approval invalidation;
- credential-free manual exports;
- visible Campaign and Studio load recovery.

### Public Repository Growth and Launch

- bounded public GitHub import;
- metadata, README, community, trust, release, and contributor evidence;
- observed, verified-zero, unavailable, and not-collected metric states;
- twelve explained readiness dimensions;
- owned growth actions;
- campaign-linked launch rooms;
- Product Core authority revalidation;
- release checklist and maintainer coverage;
- observation window and baseline;
- manual launch package;
- bounded retrospective comparison.

### Video Production and Studio

- provider-neutral video brief;
- approved campaign and canonical-script relationship;
- exact script, claim, and evidence snapshot;
- storyboard, rights, consent, accessibility, disclosures, provider plans, costs, and data handling;
- named brief, render, and platform-variant review;
- provider-neutral manual package;
- pinned ViMax compatibility record;
- structured stage, failure, artifact, hash, source, and redacted-log import;
- completed, partial, failed, and cancelled render states;
- approved variants available to Calendar.

The implementation does not install or execute ViMax, invoke generation providers, inject credentials, or claim cross-platform ViMax runtime validation.

### Calendar, Activation, Analytics, and Learning

- destination registry with non-secret references and ownership confirmation;
- planning entries for deadlines, opportunities, experiments, and follow-ups;
- external actions from approved Campaign, Repository Growth, and Video Production sources;
- exact source snapshots and authority revalidation;
- named destination-bound review;
- separate schedule, export, activation, delivery, and verification states;
- credential-free manual packages and recovery;
- delivery, failure, cancellation, and unknown outcomes;
- explicit evidence classifications;
- measurement plans, baselines, observation windows, and metric evidence states;
- performance imports, retrospectives, attribution uncertainty, and learning-ledger entries;
- advisory ICP and positioning effects without automatic Product Core mutation.

## Automated viability baseline

### Clean builds

- core builds remove `dist` before compilation;
- desktop builds remove generated web output before compilation;
- generated output remains ignored and cannot be tracked silently.

### Repository consistency

The viability gate checks:

- package, Tauri, and Cargo version alignment;
- Node and Rust runtime declarations;
- clean-build wiring;
- native workflow paths;
- exact Rust minimum validation;
- pinned third-party GitHub Actions;
- Dependabot presence;
- Content Security Policy requirements;
- desktop-store integrity usage;
- absence of `@ts-ignore`, focused tests, and skipped tests;
- local Markdown link existence and repository containment.

### Security and dependency controls

- working-tree tracked text files are scanned rather than committed blobs;
- secret signatures cover Slack, GitHub, AWS, Google, OpenAI, Anthropic, npm, GitLab, and private-key material;
- matched secret values are not printed;
- npm high and critical audit findings fail CI;
- GitHub Actions are pinned to full commit revisions;
- validation checkout credentials are not persisted;
- weekly Dependabot proposals cover npm, Cargo, and GitHub Actions.

### Coverage

| Metric | Observed on merged-equivalent acceptance head `3793380` (2026-10-06) | Enforced floor |
|---|---:|---:|
| Lines | 88.57% | 85% |
| Branches | 68.54% | 55% |
| Functions | 89.79% | 85% |

Coverage floors apply to reusable core source. They do not prove user comprehension or evidence quality.


### Real-browser and native validation

- every pull request runs the full Chromium PWA smoke at the canonical `http://localhost:4175` origin. It covers install, 72 view-to-view transitions with history, Calendar, the runtime panel, IndexedDB commits, backup/delete/restore with a second tab, offline reload, the update contract with a second tab, migration, and both IndexedDB failure paths. Any page error or CSP violation fails it;
- the Firefox and WebKit matrix runs on pushes to `main` and on manual dispatch, and writes a per-engine capability report;
- the Desktop workflow runs exact Rust 1.88 formatting and tests, a RustSec advisory gate, clean desktop web compilation, Tauri bundle construction, and Debian package inspection whenever `apps/desktop/**`, `src/**`, or build inputs change.

## Open work after convergence

| PR / issue | Purpose | State |
|---|---|---|
| #107 | LinkedIn member publishing proof | Implementation is merged and validated. Clean-install guidance acceptance and one human-owned live publication with a human-generated token and consent remain. |
| #110 | Discoverability strategy on channel variants | #112 is merged and bounded; real-content dogfood and the later evidence loop remain, sequenced behind the LinkedIn live proof. |
| #36 | Release foundations | Durable migration/recovery, browser storage durability evidence, operational readiness, and public-release trust remain. Public-hosting work is deferred until external distribution is justified. |
| #144 | Cross-origin migration through the portable backup (#36) | Open, separate from product changes. |
| #121 | Dependency updates (development tooling) | Triage separately. #96 merged; #95 and #111 were closed. Do not raise the pinned Rust 1.88 baseline implicitly. |

Merged convergence work: #124 (cross-browser/runtime correctness), #129 (public GitHub reads and native CSP/O5), and #93 (acceptance runbooks/seed/candidate).

## Remaining gates

### Machine-verifiable blockers for routine local dogfood

No known machine-verifiable blocker remains for routine Chromium localhost dogfood. #124 and #129 are merged: the PWA runtime is stable on the supported Chromium path, public GitHub reads work, and startup no longer leaves the main region indefinitely busy.

A machine-driven pass through the production PWA on 2026-10-07 (empty and seeded profiles, every view, the full governed loop, Repository Growth, Video Production, Website Watch, Workspace, and an approximation of 200% zoom) found and fixed P1 defects that the automated suite had not caught: Home showed an empty workspace right after a restore and a deleted workspace right after a delete, stale evidence could not be rechecked, hidden UI stayed visible, and cancelling a review removed the record's review controls. The record, including remaining P2/P3 findings, is `docs/reviews/local-dogfood-qa-2026-10-07.md`. Those defects were present in the frozen 2026-10-06 acceptance candidate. #145 merged the fixes, and [UX candidate 2026-10-07](../acceptance/ux-candidate-2026-10-07.md) supersedes it.

This is a dogfood statement, not a public-release statement. #36 still contains release-foundation work.

### Human gates (cannot be satisfied by automation)

- **#79 / #81:** keyboard-only primary journeys, operation at 200% zoom, status understandable without color or motion, unfamiliar-user journeys, and recorded participants, environments, findings, and remediation. The governed runbooks, deterministic seed, and candidate record are now merged under `docs/acceptance/`; start with `ux-candidate-2026-10-07.md`. The frozen candidate is `445378c` (PWA build `86c2c9a956b4`), and the record explains when current `main` is application-equivalent. It supersedes the 2026-10-06 candidate (`fee77c8`, build `1bd83169cbba`).
- **#107 / #109:** clean-install guidance acceptance plus one developer-owned LinkedIn publication with a human-generated token and consent.
- **#110 / #112:** real-content dogfood of the merged discoverability guidance and the later evidence loop, after the LinkedIn live proof exists.
- Slice-level acceptance for #2, #3, #4, #5, #6, #7, and #29 is carried by the #81 demo acceptance journeys.

### External / public-release requirements (not dogfood blockers)

- production HTTPS origin, deployment provenance, and rollback (#114 O4, #36);
- localhost → public-origin migration through the portable backup;
- supported browser and OS list with minimum versions, from actual tests, including real Safari before any Safari claim;
- observation of real (not simulated) eviction and quota limits in each supported browser, and Safari's own policy, before any durability claim beyond the simulated evidence (#114 O3);
- privacy/security review, diagnostic export, vulnerability intake, support and known-limitations documentation;
- honest labeling and provenance of any direct native artifacts.

### Deliberately deferred

- Microsoft Store MSIX proof of concept for the native runtime (#114 O2);
- native background or closed-app publishing, until the LinkedIn live proof establishes real timing needs;
- additional providers, connected metrics, Meta setup, a general setup-executor registry (#97 decision topology);
- interactive browser provider publishing (decided per provider; LinkedIn excluded);
- public product/documentation pages for discoverability (#110 fog);
- `tauri-build` 2.7 / `tauri-utils` 2.10, which require Rust 1.90, until the Rust baseline is deliberately raised (#111).

## Designed or required but not implemented

- live-proven connected publishing for any provider (the LinkedIn implementation is merged and validated, but its human-owned live proof is still open in #107);
- automatic provider delivery verification beyond the #109 provider response mapping;
- connected analytics and search imports;
- local ViMax execution or managed worker;
- model-provider execution;
- live Context.dev collection and live Webdog synchronization;
- authenticated GitHub traffic and write adapters;
- website crawl, SEO, AEO, and conversion analysis;
- lead, organization, and sales records;
- automated attribution computation and automatic ICP or Product Core mutation from learning;
- hosted synchronization and multi-user collaboration (not planned; ADR-0001);
- closed-app or exact-time background publication;
- tested native update, uninstall, and Windows packaging behavior.

## Release posture

Viable is ready for **local Chromium dogfooding** at `http://localhost:4175`, including live public GitHub evidence collection. It is not ready for an end-user release.

A public release requires the human gates above, the external/public-release requirements above, and an explicit supported-platform statement grounded in tests. A public code-signing certificate is not a prerequisite (ADR-0010).
