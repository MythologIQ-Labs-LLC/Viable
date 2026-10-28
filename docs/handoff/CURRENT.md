# Viable Current Session Handoff

## Purpose

This is the restart entrypoint for Viable work. It preserves the context required to continue without relying on conversation memory.

Implementation truth lives in [`docs/status/current-state.md`](../status/current-state.md). This handoff says where work stands and what to do next. If they disagree, the status record and the repository win.

## Repository state (2026-10-28)

- Repository: `MythologIQ-Labs-LLC/Viable`
- Product owner: MythologIQ Labs, LLC
- Product lead: Kevin R. Knapp
- `main` at review: `2c1eea8765d6e6365655ec4d56632c038efa7739` (#181 native RustSec patch merged; #144 also merged). The 2026-10-07 local-dogfood QA remediation remains recorded in `docs/reviews/local-dogfood-qa-2026-10-07.md`
- Primary runtime: local-first PWA (ADR-0010). Canonical dogfood: `npm run pwa:selfhost`, then `http://localhost:4175` in a Chromium desktop browser
- Native Tauri runtime: capability extension for the OS credential vault and connected provider publishing only
- Workspace authority: IndexedDB, failing closed when it cannot be opened; `viable.workspace-backup` v1 is the cross-runtime and cross-origin interchange
- Human acceptance: **none completed**. #79 is the last open child of the UX umbrella #81
- Live read-only integration proof: public GitHub collection is proven in Chromium and the native webview by merged #129. LinkedIn member publishing implementation is merged by #109 and exact-head validated, but live publishing proof is still **not completed**; #107 remains open for clean-install guidance acceptance and one human-owned live publication
- Release foundations: #36, re-scoped by ADR-0010. A code-signing certificate is not a prerequisite

## Open pull requests and their boundaries

| PR | What it is | What remains |
|---|---|---|
| #179 (draft, issue #171) | Acknowledged-persistence and UI-only journey hardening | Product Core/Signals, Campaign/Studio/Video, Repository Growth, Calendar/Analytics/Inventory, Workspace destructive operations, and contextual review are guarded. Exact-head CI/Chromium passed on the pre-no-op-patch head; rerun on the final head, then review the multi-tab race boundary. |
| Dependabot #121 | Development-tooling bumps | Triage independently. #96 merged; #95 and #111 were closed. Do not raise the pinned Rust 1.88 baseline implicitly. |

Recently merged convergence work:
- #181: native RustSec advisory patch merged at `2c1eea8765d6e6365655ec4d56632c038efa7739`, with zero audit vulnerabilities, 22 native Rust tests, Tauri bundle and Debian validation. Residual 9 unmaintained and 2 unsound warnings remain open as #182. UX PR #179 was reconciled with this `main`.
- #144: portable PWA migration across browser origins is on `main` at `f2abed27ca73ac100dfbfdf7ef823311af5ef05e`.
- #174: #169 comparable-age cohorts and conservative advisory learning is on `main` at `0b3bbd53776ec5acf855807b3f7bf0bb4775b88a`; the exact PR head passed CI and Desktop validation.
- #173: #168 manual-first analytics evidence, conflict-safe reconciliation, and deterministic derived metrics is on `main` at `aa6f35ff032e1b807ebf8d88e517dea625343c47`; exact-head CI, Chromium PWA journey, Rust tests, desktop bundle, and Debian validation passed.
- #172: #167 composition guidance and exact publication-experiment identity is on `main` at `82b445618e57cde337db35b45e2ff5ba972ccae8`; exact-head CI, Chromium PWA journey, Rust tests, desktop bundle, and Debian validation passed.
- #109: LinkedIn member publishing implementation is on `main`. Exact-head CI, real-browser PWA smoke, Rust tests, desktop bundle, and Debian package validation passed. #107 stays open for the two human evidence gates.
- #112: bounded discoverability strategy is on `main`; #110 stays open for real-content dogfood and the later evidence loop.
- #124: Firefox/WebKit startup, bounded storage load, throttled-history tolerance, and the `aria-busy` startup fix. Chromium and Firefox pass; Playwright Linux WebKit passes with controlled engine/harness limitations. Safari remains unsupported pending a real-Safari hand test.
- #129: production-default public GitHub reads work in Chromium and native; O5 is resolved with the narrow native CSP required for `api.github.com` and media review.
- #93: governed human-acceptance runbooks, deterministic seed, and the 2026-10-06 candidate record are now on `main`.

## Read before acting

1. `README.md`
2. `docs/status/current-state.md`
3. `docs/handoff/CURRENT.md`
4. `docs/adr/README.md`, especially ADR-0001, ADR-0005, ADR-0009, and ADR-0010
5. `docs/product/PRD.md`
6. `docs/architecture/viable-platform.md`
7. `docs/architecture/content-inventory-and-automated-publishing.md`
8. `docs/reviews/pwa-runtime-roadmap-review-2026-10-05.md`
9. `docs/acceptance/` for the human acceptance program
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
| Signals Inbox | #5 | Implemented; live GitHub collection fixed by merged #129; human acceptance via #81 |
| Campaign Brief and Canonical Asset | #6 | Implemented; human acceptance via #81 |
| Repository Growth and Launch | #3 | Implemented; live GitHub collection fixed by merged #129; human acceptance via #81 |
| Video Production and ViMax package | #4 | Stage 1 implemented; ViMax execution and human acceptance open |
| Calendar, Activation, Outcomes, Learning | #7 | Implemented; human acceptance via #81 |
| Website Watch Stage 1 | #29 | Implemented and hardened; human acceptance via #81 |
| UX completion | #81 (#72–#80) | All children merged; #79 hands-on acceptance and the demo gate remain |
| Publishing foundation | #97 (#98, #99, #100, #101, #106) | Inventory, scheduler, and vault merged; decisions closed |
| LinkedIn live proof | #107 / #109 | Implementation merged and validated; clean-install guidance acceptance and human live publication remain open |
| Discoverability | #110 / #112 | Bounded implementation merged; real-content dogfood and evidence-loop work remain open |
| PWA runtime | #114 | Foundation, IndexedDB, cross-browser harness, localhost self-host, update hardening, and O5 are merged; O2/O3/O4 remain open or deferred |
| Release foundations | #36 | Open; see the classification in the status record |

Do not restart any of these as unimplemented slices.

## Human gates

These cannot be completed by automation and must not be marked complete because code exists:

- keyboard-only operation of the primary journeys;
- operation at 200% zoom;
- status understandable without color or motion;
- unfamiliar-user journeys with recorded participant role, environment, findings, and remediation;
- the LinkedIn live publication (token and consent are the developer's own).

The acceptance runbooks, deterministic seed, and current candidate record are merged under `docs/acceptance/`. The facilitator starts at `docs/acceptance/ux-candidate-2026-10-07c.md` → **Start here**.

## Next priorities

1. Finish #179 / #171 exact-head validation including the cancelled Signals no-op acknowledgement fix, Chromium UI-only failure/retry, and Desktop/Tauri. Review residual multi-tab lost-update risk separately before closing #171 or claiming supported release.
2. Preserve #79/#81 human acceptance as a release gate. The existing `ux-candidate-2026-10-07c.md` remains the frozen pre-#172 candidate; a new candidate must be recorded after product-facing #156 work stabilizes rather than pretending the old human-acceptance target covers new UI.
3. Perform the human-owned LinkedIn live proof from current `main` using the merged #109 flow; record clean-install guidance findings and the provider receipt in #107.
4. Progress the remaining #36 release-foundation evidence through isolated work such as #144. Leave public hosting until external distribution is justified.
5. Keep #166 shared-provider mechanics, #170 Signals counterevidence, #171 hardening, and dependency work bounded and separate from canonical cross-product state.

The productization work does not change release posture: no automated or cross-product evidence substitutes for the human gates or real provider proof.

## Engineering rules that keep recurring

- Do not manually edit generated lockfiles. Cargo dependency changes require Cargo-generated lockfiles and exact-head Desktop validation on Rust 1.88.
- Never weaken CSP, storage authority, credential handling, or the smoke suite to obtain green CI. Measure first. #129 is the model: runtime evidence, then the narrowest change, then a static invariant.
- Injected test doubles can hide runtime-only defects. Exercise production defaults (for example the global `fetch` receiver rule) at least once.

## Release posture

Viable is ready for local Chromium dogfooding at `http://localhost:4175`. It is not ready for external release. Passing compilers, coverage, audits, browser smoke, and native packaging do not prove accessibility, unfamiliar-user success, provider execution, supported-platform behavior, or operational readiness.
