# Viable Current Session Handoff

## Purpose

This is the restart entrypoint for Viable work. It preserves the context required to continue without relying on conversation memory.

Implementation truth lives in [`docs/status/current-state.md`](../status/current-state.md). This handoff says where work stands and what to do next. If they disagree, the status record and the repository win.

## Repository state (2026-10-06)

- Repository: `MythologIQ-Labs-LLC/Viable`
- Product owner: MythologIQ Labs, LLC
- Product lead: Kevin R. Knapp
- `main` at review: `a33537f5a40605c90f21be4fedc2606467e7853d` (#124 cross-browser/runtime correctness, #129 public GitHub reads/O5, and #93 governed acceptance tooling all merged)
- Primary runtime: local-first PWA (ADR-0010). Canonical dogfood: `npm run pwa:selfhost`, then `http://localhost:4175` in a Chromium desktop browser
- Native Tauri runtime: capability extension for the OS credential vault and connected provider publishing only
- Workspace authority: IndexedDB, failing closed when it cannot be opened; `viable.workspace-backup` v1 is the cross-runtime and cross-origin interchange
- Human acceptance: **none completed**. #79 is the last open child of the UX umbrella #81
- Live read-only integration proof: public GitHub collection is proven in Chromium and the native webview by merged #129. Live publishing proof: **none completed**; LinkedIn member publishing (#107) is implemented on draft PR #109 and waits on a human-owned live publication
- Release foundations: #36, re-scoped by ADR-0010. A code-signing certificate is not a prerequisite

## Open pull requests and their boundaries

| PR | What it is | What remains |
|---|---|---|
| #109 | LinkedIn member publishing proof (native-only) | Implementation is green and mergeable. Remaining: **one human-owned live publication** with a human-generated token and consent. Never substitute mocked evidence. |
| #112 | Discoverability strategy on channel variants (#110) | Green, bounded implementation. Hands-on UX review and real-content dogfood remain after the LinkedIn live proof. Do not expand. |
| Dependabot #95, #96, #111, #121 | Dependency bumps | Triage independently. #111 requires Rust 1.90 (`tauri-build` 2.7.1) and must not raise the pinned 1.88 baseline implicitly. |

Recently merged convergence work:
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
| LinkedIn live proof | #107 / #109 | Implemented on draft; human live proof open |
| Discoverability | #110 / #112 | Implemented on draft; hands-on review open |
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

The acceptance runbooks, deterministic seed, and current candidate record are merged under `docs/acceptance/`. The facilitator starts at `docs/acceptance/ux-candidate-2026-10-06.md` → **Start here**.

## Next priorities

1. Run the #79/#81 human acceptance on the governed candidate, then fix only reproducible P0/P1 findings in narrow PRs.
2. Perform the human-owned LinkedIn live proof on #109's exact validated head.
3. Progress the remaining #36 durable-storage/recovery and operational-readiness work. Leave public-hosting work until external distribution is justified.
4. After the LinkedIn proof is stable, complete the #112 hands-on discoverability review and real-content dogfood.
5. Keep dependency work separate from product convergence; do not raise the Rust baseline accidentally.

No new broad feature tranche precedes these.

## Engineering rules that keep recurring

- Do not manually edit generated lockfiles. Cargo dependency changes require Cargo-generated lockfiles and exact-head Desktop validation on Rust 1.88.
- Never weaken CSP, storage authority, credential handling, or the smoke suite to obtain green CI. Measure first. #129 is the model: runtime evidence, then the narrowest change, then a static invariant.
- Injected test doubles can hide runtime-only defects. Exercise production defaults (for example the global `fetch` receiver rule) at least once.

## Release posture

Viable is ready for local Chromium dogfooding at `http://localhost:4175`. It is not ready for external release. Passing compilers, coverage, audits, browser smoke, and native packaging do not prove accessibility, unfamiliar-user success, provider execution, supported-platform behavior, or operational readiness.
