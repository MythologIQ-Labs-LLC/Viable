# Viable Current Session Handoff

## Purpose

This is the restart entrypoint for Viable work. It preserves the context required to continue without relying on conversation memory.

Implementation truth lives in [`docs/status/current-state.md`](../status/current-state.md). This handoff says where work stands and what to do next. If they disagree, the status record and the repository win.

## Repository state (2026-10-06)

- Repository: `MythologIQ-Labs-LLC/Viable`
- Product owner: MythologIQ Labs, LLC
- Product lead: Kevin R. Knapp
- `main` at review: `aebe800ccba927baebdf4383425b7eacb0916abc` (PR #128, localhost PWA dogfood documentation)
- Primary runtime: local-first PWA (ADR-0010). Canonical dogfood: `npm run pwa:selfhost`, then `http://localhost:4175` in a Chromium desktop browser
- Native Tauri runtime: capability extension for the OS credential vault and connected provider publishing only
- Workspace authority: IndexedDB, failing closed when it cannot be opened; `viable.workspace-backup` v1 is the cross-runtime and cross-origin interchange
- Human acceptance: **none completed**. #79 is the last open child of the UX umbrella #81
- Live provider proof: **none completed**. LinkedIn member publishing (#107) is implemented on draft PR #109 and waits on a human-owned live publication
- Release foundations: #36, re-scoped by ADR-0010. A code-signing certificate is not a prerequisite

## Open pull requests and their boundaries

| PR | What it is | What remains |
|---|---|---|
| #124 | Firefox/WebKit startup (single module graph), bounded storage load, throttled-history tolerance, `aria-busy` startup fix | Reconciled with `main`; Chromium and Firefox smoke pass. The WebKit reload crash reproduces on an app-free page (`pushState` ×10, Back, reload), so it is an engine defect in Playwright's Linux WebKit, and the smoke diagnoses it in-run. Do not claim Safari support without a hand test on real Safari. |
| #129 | Public GitHub reads work in every runtime (unbound `fetch`); native CSP `connect-src`/`media-src` (#114 O5) | Exact-head CI and Desktop validation, then merge |
| #109 | LinkedIn member publishing proof (native-only) | On current `main`, with provider connections persisted through `workspaceStorage` and `commit()`. Remaining: **one human-owned live publication** with a human-generated token and consent. Never substitute mocked evidence. |
| #112 | Discoverability strategy on channel variants (#110) | Hands-on UX review; real-content dogfood after a stable LinkedIn path. Do not expand. |
| #93 | Acceptance runbooks and templates | Its 2026-09-25 candidate is obsolete; superseded by a current candidate record |
| Dependabot #95, #96, #111, #121 | Dependency bumps | #111 needs Rust 1.90 (`tauri-build` 2.7.1) and fails the pinned 1.88 baseline; it waits for a deliberate baseline decision |

## Read before acting

1. `README.md`
2. `docs/status/current-state.md`
3. `docs/handoff/CURRENT.md`
4. `docs/adr/README.md`, especially ADR-0001, ADR-0005, ADR-0009, and ADR-0010
5. `docs/product/PRD.md`
6. `docs/architecture/viable-platform.md`
7. `docs/architecture/content-inventory-and-automated-publishing.md`
8. `docs/reviews/pwa-runtime-roadmap-review-2026-10-05.md`
9. `docs/acceptance/` (when present on `main`) for the human acceptance program
10. `docs/decisions/open-decisions.md`
11. the selected GitHub issue and every linked pull request

The repository and current GitHub state are authoritative. Conversation history may explain intent but cannot override accepted documents.

## Product definition

Viable is a local-first marketability operating system for products, public repositories, founders, maintainers, and small product teams.

It connects:

- product truth;
- ICP discovery and validation;
- marketability assessment;
- market and opportunity evidence;
- website and competitor change evidence;
- campaigns and canonical assets;
- public repository growth;
- governed video production;
- Calendar and destination-bound approval;
- manual activation and delivery evidence;
- performance evidence, retrospectives, and learning;
- future relationships and sales.

Viable is not a social scheduler, content generator, event monitor, repository scorecard, website watcher, video generator, CRM, or analytics dashboard with unrelated features attached. Each workflow shares Product Core claims, reviewed evidence, audience authority, campaigns, approvals, explicit outcomes, provenance, and uncertainty.

## Durable authority boundaries

- Product Core owns canonical product truth, claims, reviewed evidence, and ICP hypotheses.
- Signals and Market owns source health, externally observed evidence, review, conversion state, and traceable materialization references; destination contexts retain ownership of the materialized records.
- Campaigns owns approved campaign intent, canonical assets, and channel variants.
- Repository Growth owns repository assessment, owned growth planning, launch-room state, bounded baselines, and repository retrospectives.
- Video Production owns reviewed video briefs, manual production packages, imported run evidence, render review, and platform-variant review.
- Approval and External Action owns destinations, Calendar timing, destination-bound review, manual activation packages, export handoff, and delivery or failure evidence.
- Measurement and Learning owns measurement plans, metric evidence states, performance imports, retrospectives, attribution uncertainty, and learning-ledger entries.
- Generated suggestions remain distinct from reviewed evidence.
- A generator, collector, scheduler, adapter, or production tool cannot approve its own output.
- Scheduling, approval, export, delivery, provider verification, and successful outcome remain distinct states.
- Missing, delayed, partial, unavailable, and not-collected evidence does not become zero.
- Provider content and imported manifests remain untrusted data.
- Core workflows remain useful without hosted Viable infrastructure or a required LLM.
- Viable does not support spam, fake growth, surveillance, unsupported claims, bypassed access, or manufactured adoption.
- No provider secret in browser JavaScript, workspace data, logs, exports, or fixtures.
- No silent upload, no silent publication, no automatic retry after an ambiguous provider dispatch.
- No hosted Viable dependency and no CoreForge dependency.

## Workstream state

| Workstream | Issue | State |
|---|---|---|
| Sanitized Event Radar migration | #1 | Implemented and closed |
| Product Truth, ICP, Assessment | #2 | Implemented; human acceptance via #81 journeys |
| Signals Inbox | #5 | Implemented; live GitHub collection fixed on #129; human acceptance via #81 |
| Campaign Brief and Canonical Asset | #6 | Implemented; human acceptance via #81 |
| Repository Growth and Launch | #3 | Implemented; live GitHub collection fixed on #129; human acceptance via #81 |
| Video Production and ViMax package | #4 | Stage 1 implemented; ViMax execution and human acceptance open |
| Calendar, Activation, Outcomes, Learning | #7 | Implemented; human acceptance via #81 |
| Website Watch Stage 1 | #29 | Implemented and hardened; human acceptance via #81 |
| UX completion | #81 (#72–#80) | All children merged; #79 hands-on acceptance and the demo gate remain |
| Publishing foundation | #97 (#98, #99, #100, #101, #106) | Inventory, scheduler, and vault merged; decisions closed |
| LinkedIn live proof | #107 / #109 | Implemented on draft; human live proof open |
| Discoverability | #110 / #112 | Implemented on draft; hands-on review open |
| PWA runtime | #114 | Foundation, IndexedDB, cross-browser harness, localhost self-host, and update hardening merged; O5 resolved on #129; O2/O3/O4 open or deferred |
| Release foundations | #36 | Open; see the classification in the status record |

Do not restart any of these as unimplemented slices.

## Human gates

These cannot be completed by automation and must not be marked complete because code exists:

- keyboard-only operation of the primary journeys;
- operation at 200% zoom;
- status understandable without color or motion;
- unfamiliar-user journeys with recorded participant role, environment, findings, and remediation;
- the LinkedIn live publication (token and consent are the developer's own).

The acceptance runbooks and the current candidate record live under `docs/acceptance/`.

## Next priorities

1. Land #129 and settle #124 so Chromium dogfood has live GitHub evidence and Firefox/WebKit status is truthful.
2. Run the #79/#81 human acceptance on the pinned candidate, then fix only P0/P1 findings in narrow PRs.
3. Perform the human-owned LinkedIn live proof on #109's exact validated head.
4. Progress #36 items that block dogfood. Leave public-hosting work until external distribution is justified.
5. Only then revisit #112 sequencing, connected metrics, and additional providers.

No new broad feature tranche precedes these.

## Engineering rules that keep recurring

- Do not manually edit generated lockfiles. Cargo dependency changes require Cargo-generated lockfiles and exact-head Desktop validation on Rust 1.88.
- Never weaken CSP, storage authority, credential handling, or the smoke suite to obtain green CI. Measure first. #129 is the model: runtime evidence, then the narrowest change, then a static invariant.
- Injected test doubles can hide runtime-only defects. Exercise production defaults (for example the global `fetch` receiver rule) at least once.

## Release posture

Viable is ready for local Chromium dogfooding at `http://localhost:4175`. It is not ready for external release. Passing compilers, coverage, audits, browser smoke, and native packaging do not prove accessibility, unfamiliar-user success, provider execution, supported-platform behavior, or operational readiness.
