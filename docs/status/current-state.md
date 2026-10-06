# Viable Current State

## Document control

| Field | Value |
|---|---|
| Status | Authoritative implementation-status record |
| Last reviewed | 2026-10-06 |
| Reviewed against | `main` at `aebe800ccba927baebdf4383425b7eacb0916abc` (PR #128), plus the open PRs listed under [Open work at review time](#open-work-at-review-time) |
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

As of this review, **nothing is human-accepted** and **nothing on `main` is live-proven** against an external system. Live public GitHub reads were measured working only on the head of PR #129 (see [Signals and Market](#signals-and-market)).

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
| Firefox PWA | **Experimental.** Before PR #124 the app did not finish starting in Firefox. With #124 the full smoke passes in Playwright Firefox (two consecutive dispatch runs on the reconciled head, 37422357359 and 37423883081). It is not a supported dogfood browser until #124 merges and a person has used it. | PR #124 |
| WebKit / Safari PWA | **Experimental; Safari support is not claimed.** Before #124 the app never rendered in WebKit. With #124 it starts and every smoke check passes except one reload. That failure is reduced to an **engine defect** in Playwright's Linux WebKit 26 build: reloading after going Back across several `pushState` entries crashes or hangs the renderer **on an app-free blank page with no Viable code** (3/3 runs, with and without service workers). Hash entries, a single entry, or no Back do not trigger it. Backup download, `setInputFiles`, restore, dialogs, second tabs, extra IndexedDB connections, and service-worker control were each ruled out (reproducer `scripts/pwa-restore-reload-probe.mjs`, CI runs 37422357359, 37423883081, 37426515169). The smoke now runs that app-free control whenever a WebKit reload fails, and records the result as an engine limitation only if the control also fails. **No real Safari has been tested.** Whether shipping Safari shares the defect is unknown, so Safari stays unsupported until it is tested by hand. | PR #124 |
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
- Existing `localStorage` data is migrated once and verified; the legacy copy is left untouched as a recovery source.
- Changes made in one tab reach other open tabs through `BroadcastChannel`.
- **Fail closed:** whenever the runtime exposes IndexedDB and it cannot be opened, Viable shows a visible error and refuses writes rather than serving a possibly stale `localStorage` copy. `localStorage` is used only where the runtime does not expose IndexedDB at all.
- All seven workspace stores await a durable commit before reporting success.

### Schema versions, backup, restore, quarantine, deletion (PRs #62, #88, #117, #119)

- every authoritative workspace store writes a versioned envelope; unversioned v0 data remains readable; unsupported future versions are treated as corrupt and quarantinable, never as valid;
- `viable.workspace-backup` v1: one file covering all seven workspace contexts, secret-field rejection, and a CRC32 integrity checksum (not a signature);
- restore into an empty profile or replace the current workspace, both through a validated preview and an explicit confirmation;
- quarantine export of unreadable raw records; destructive deletion is blocked until quarantine has been exported;
- durable deletion across the seven contexts;
- browser round trip validated in the smoke: backup → delete (seen by a second open tab) → restore into an empty profile → reload.

Generalized forward migration between future schema versions, rollback, recovery points, and product-wide retention defaults are **not** implemented (#36).

### Native runtime and credential vault (PRs #108, #113)

- Tauri 2 shell; Debian package built and inspected in CI on the pinned Rust 1.88 baseline;
- native credential vault boundary: provider secrets are stored only through the OS credential store (Linux Secret Service, Windows Credential Manager) behind narrow commands (`credential_capability`, `credential_put`, `credential_has`, `credential_delete`). Secrets never return to JavaScript, workspace data, logs, or exports;
- in the PWA, the vault and connected publishing are shown as unavailable with the concrete reason (browsers have no OS keychain API; LinkedIn blocks browser-origin requests and requires a native-only PKCE flow or a Client Secret).

## Deterministic publishing foundation (umbrella #97)

| Slice | Issue / PR | State |
|---|---|---|
| A. Publication inventory and approval authority | #98 / #104 | Merged and validated |
| B. Deterministic scheduler and execution ledger | #99 / #105 | Merged and validated |
| C. Native credential vault boundary | #106 / #108 | Merged and validated |
| Credential-store contract research | #100 | Closed (decision recorded) |
| First live provider selection | #101 | Closed: LinkedIn member publishing selected (#107) |
| D. LinkedIn member publishing proof | #107 / PR #109 | **Implemented on an open draft PR; not live-proven** |

Implemented on `main`:

- publication inventory items bound to exact approved source snapshots, publication policy, and destination;
- deterministic scheduler with an execution ledger, idempotency keys, explicit `not_dispatched`, `published`, `outcome_unknown`, retryable, and reconnect-required states, and no automatic retry after an ambiguous provider dispatch;
- a deterministic fake provider for tests only; manual activation remains the fallback for every destination.

PR #109 (LinkedIn member publishing, native-only) is complete enough for its live proof. On 2026-10-06 it was brought onto current `main`. Its provider-connection store now persists through `workspaceStorage` with a durable `commit()` (#119), and the storage contract test discovers every store instead of a fixed list. The one remaining gate is a developer-owned LinkedIn publication using a human-generated token entered only into Viable's native connection UI, with the person's consent. No connected publishing claim is made until that proof exists.

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
- public GitHub repository metadata and activity evidence. **On `main` every live collection fails before any request**: the adapters invoke an unbound `fetch` ("Illegal invocation"), and the native CSP also blocks `api.github.com`. PR #129 fixes both. With #129, live collection was measured succeeding in Chromium and in the native webview;
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

| Metric | Observed on `main` `aebe800` (2026-10-06) | Enforced floor |
|---|---:|---:|
| Lines | 86.62% | 85% |
| Branches | 67.07% | 55% |
| Functions | 89.00% | 85% |

Coverage floors apply to reusable core source. They do not prove user comprehension or evidence quality.


### Real-browser and native validation

- every pull request runs the full Chromium PWA smoke at the canonical `http://localhost:4175` origin. It covers install, 72 view-to-view transitions with history, Calendar, the runtime panel, IndexedDB commits, backup/delete/restore with a second tab, offline reload, the update contract with a second tab, migration, and both IndexedDB failure paths. Any page error or CSP violation fails it;
- the Firefox and WebKit matrix runs on pushes to `main` and on manual dispatch, and writes a per-engine capability report;
- the Desktop workflow runs exact Rust 1.88 formatting and tests, a RustSec advisory gate, clean desktop web compilation, Tauri bundle construction, and Debian package inspection whenever `apps/desktop/**`, `src/**`, or build inputs change.

## Open work at review time

| PR | Purpose | State |
|---|---|---|
| #124 | Single module graph so the PWA starts in Firefox and WebKit; bounded storage load; throttled-history tolerance; startup no longer leaves `<main>` `aria-busy` | Reconciled with `main`; Chromium and Firefox smoke pass; the WebKit reload crash is reduced to an app-free engine reproducer |
| #129 | Restore public GitHub reads in every runtime (unbound `fetch` defect) and add the native `connect-src`/`media-src` the UI needs (#114 O5) | Draft; validated locally and measured in the native webview |
| #109 | LinkedIn member publishing proof | Draft; on current `main` with IndexedDB-backed provider connections; waits on the human live-proof gate |
| #112 | Discoverability strategy on channel variants (#110) | Draft; on current `main`; hands-on UX review and real-content dogfood remain; sequenced behind a stable LinkedIn path |
| #93 | Human acceptance runbooks, the deterministic `ux-acceptance-seed-v2`, and the 2026-10-06 candidate record | Reconciled with the PWA runtime; pins candidate `fee77c8` (`main` + #129 + #124, PWA build `1bd83169cbba`); supersedes the 2026-09-25 candidate |

## Remaining gates

### Machine-verifiable blockers for routine local dogfood

- merge #129 so Signals and Repository Growth can actually collect public GitHub evidence. Before it, every live collection fails as `transport_failed` in every runtime;
- merge #124: it carries the Firefox/WebKit startup fixes, and also the fix for startup leaving `<main aria-busy="true">` on Home, Product, Signals, and Market until the first action, which assistive technology may treat as still loading.

No other machine-verifiable blocker to Chromium localhost dogfood is known.

### Human gates (cannot be satisfied by automation)

- **#79 / #81:** keyboard-only primary journeys, operation at 200% zoom, status understandable without color or motion, unfamiliar-user journeys, and recorded participants, environments, findings, and remediation. The current candidate is commit `fee77c8` (branch `acceptance/candidate-2026-10-06`, PWA build `1bd83169cbba`). Its record, runbooks, and seed are in `docs/acceptance/` on PR #93; start with `ux-candidate-2026-10-06.md`.
- **#107 / #109:** one developer-owned LinkedIn publication with a human-generated token and consent.
- **#112 / #110:** hands-on review of the discoverability fieldset and dogfood against real content, after a stable LinkedIn path exists.
- Slice-level acceptance for #2, #3, #4, #5, #6, #7, and #29 is carried by the #81 demo acceptance journeys.

### External / public-release requirements (not dogfood blockers)

- production HTTPS origin, deployment provenance, and rollback (#114 O4, #36);
- localhost → public-origin migration through the portable backup;
- supported browser and OS list with minimum versions, from actual tests, including real Safari before any Safari claim;
- real storage-eviction and quota evidence per supported browser (#114 O3);
- generalized forward migration and rollback; recovery points; product-wide retention defaults;
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

- live connected publishing for any provider (LinkedIn is implemented on #109 but not live-proven or merged);
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

Viable is ready for **local Chromium dogfooding** at `http://localhost:4175`, once #129 lands for live GitHub evidence. It is not ready for an end-user release.

A public release requires the human gates above, the external/public-release requirements above, and an explicit supported-platform statement grounded in tests. A public code-signing certificate is not a prerequisite (ADR-0010).
