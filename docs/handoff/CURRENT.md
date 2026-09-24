# Viable Current Session Handoff

## Purpose

This is the restart entrypoint for Viable work. It preserves the context required to continue without relying on conversation memory.

Detailed authority remains in the PRD, accepted ADRs, domain architecture, current state, roadmap, open decisions, integration assessments, review records, GitHub issues, and merged pull requests.

## Repository state

- Repository: `MythologIQ-Labs-LLC/Viable`
- Product owner: MythologIQ Labs, LLC
- Product lead: Kevin R. Knapp
- Latest merged implementation PR: #70 at `7cc5a5da72f99e03ea8069347e9ad8f1bfc01181`
- Automated viability review: `docs/reviews/viability-sweep-2026-07-16.md`
- Release-foundation issue: #36
- Current maturity: all six initial internal product slices and Website Watch Stage 1 are implemented and automatedly validated on `main`
- Human acceptance remains open for issues #2, #5, #6, #3, #4, #7, and #29
- ViMax execution remains open under issue #4
- Backup, restore, migration, product-wide retention, dependency minimization, signing, updates, rollback, platform validation, and operational support are tracked under issue #36
- Signals destination materialization is machine-complete through PRs #66–#70; issue #5 remains open for documentation reconciliation and human acceptance
- Immediate priority: complete human acceptance and release foundations without creating duplicate product authority or another invented foundational slice

## Read before acting

Read these in order:

1. `README.md`
2. `docs/handoff/CURRENT.md`
3. `docs/product/PRD.md`
4. `docs/product/icp-discovery-and-validation.md`
5. `docs/adr/README.md`
6. `docs/architecture/viable-platform.md`
7. `docs/architecture/icp-domain.md`
8. `docs/architecture/repository-growth-domain.md`
9. `docs/architecture/video-production-domain.md`
10. `docs/architecture/activation-and-learning-domain.md`
11. `docs/architecture/website-watch-domain.md`
12. `docs/status/current-state.md`
13. `docs/reviews/viability-sweep-2026-07-16.md`
14. `docs/roadmap/initial-build-sequence.md`
15. `docs/decisions/open-decisions.md`
16. the relevant integration assessment and third-party notice
17. the selected GitHub issue and all linked merged pull requests

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

## Initial build and extension state

| Sequence | Issue | Workstream | State |
|---|---|---|---|
| Foundation | #1 | Sanitized Event Radar migration | Implemented and closed |
| Slice 1 | #2 | Product Truth, ICP, Assessment | Implemented; human acceptance open |
| Slice 2 | #5 | Signals Inbox | Implemented; human acceptance open |
| Slice 3 | #6 | Campaign Brief and Canonical Asset | Implemented; human acceptance open |
| Slice 4 | #3 | Repository Growth and Launch | Implemented; human acceptance open |
| Slice 5 | #4 | Video Production and ViMax package | Stage 1 implemented; execution and human acceptance open |
| Slice 6 | #7 | Calendar, Activation, Outcomes, Learning | Implemented; human acceptance open |
| Signals extension | #29 | Website Watch and Webdog-compatible import | Stage 1 implemented and hardened; human acceptance open |
| Release foundation | #36 | Storage, migration, dependency, installer, update, and support guarantees | Open |

Do not restart issues #7 or #29 as unimplemented slices. Their automated core and desktop journeys are merged.

## Automated viability baseline

PR #35 performed the current pre-human viability sweep.

### Repository and build integrity

- core compilation removes `dist` before building;
- desktop web compilation removes generated output before building;
- generated output remains ignored and must not be tracked;
- package, Tauri, and Cargo versions are checked for alignment;
- Node and Rust runtime contracts are checked;
- local Markdown links are checked for existence and repository containment;
- `@ts-ignore`, focused tests, and skipped tests are rejected by the viability gate;
- Content Security Policy directives are checked and unsafe inline or eval permissions are rejected.

### Security and dependency gates

- tracked working-tree text files are scanned rather than committed `HEAD` blobs;
- Slack, GitHub, AWS, Google, OpenAI, Anthropic, npm, GitLab, and private-key signatures are covered;
- matched secret values are never printed;
- npm high and critical audit findings fail CI;
- GitHub Actions are pinned to full commit revisions;
- validation checkouts do not persist credentials;
- weekly bounded Dependabot proposals cover npm, Cargo, and GitHub Actions.

### Coverage and deterministic tests

Observed during the sweep:

| Metric | Observed | Enforced floor |
|---|---:|---:|
| Lines | 88.69% | 85% |
| Branches | 62.44% | 55% |
| Functions | 89.81% | 85% |

Coverage floors apply to reusable core source. Passing them does not replace evidence-quality review or human journey acceptance.

### Desktop persistence and recovery

All seven desktop workspace stores now:

- validate workspace identity;
- validate required minimum collections and fields;
- reject malformed, mismatched, or incomplete saved data before it reaches authority services;
- preserve malformed or incompatible saved values rather than silently rewriting or deleting them;
- surface storage-read, quota, serialization, and incomplete-removal failures explicitly.

Additional recovery behavior:

- startup and unhandled asynchronous failures render a visible recovery state;
- Campaign and Studio load failures clear busy state and expose retry behavior;
- partial Product workspace deletion preserves the active identity needed to retry cleanup.

This is minimum structural integrity. It is not a schema-version, migration, backup, or restore guarantee.

### Exact-head validation

PR #35 was validated at `041193349de518e708b8e80378e4de9a9f46d5ad`:

- CI run #118 passed repository viability, working-tree secret scanning, npm dependency audit, strict core and desktop TypeScript, complete deterministic tests, and enforced coverage floors;
- Desktop run #62 passed exact Rust 1.88 formatting and tests, clean desktop web compilation, Tauri bundle construction, and Debian package inspection.

Shared `src/**` changes now trigger native desktop validation.

## Website Watch boundary

Website Watch Stage 1 provides provider-neutral watched sites, targets, source health, snapshots, bounded observations, generated-analysis separation, named review, proposed work, Calendar planning, retention, deletion, and strict Webdog-compatible manual import.

Stage 1 does not crawl websites, call Context.dev, connect to a live Webdog service, run a worker, import live screenshots, open a public webhook listener, copy browser sessions, access private pages, execute AI triage, send notifications, publish, or mutate Product Core automatically.

## Open human and live-execution gates

Issues #2, #3, #5, #6, #7, and #29 remain open for hands-on keyboard and assistive-technology review, unfamiliar-user completion, and remediation.

Issue #4 additionally remains open for actual ViMax execution and Windows and Linux ViMax runtime validation.

Automated semantics, coverage, focus styling, responsive styling, reduced motion, persistence checks, deterministic tests, and native packaging do not replace human review.

## Release-foundation work

Issue #36 owns the remaining machine-verifiable release foundations:

- explicit schema versions and migration fixtures;
- product-wide backup and restore;
- corruption quarantine and malformed-record export;
- product-wide retention and deletion propagation;
- Rust dependency minimization and advisory scanning;
- signed installers and publisher identity;
- update integrity, interruption, rollback, upgrade, and uninstall behavior;
- Windows validation and macOS packaging decision;
- supported-platform evidence;
- diagnostic export, vulnerability intake, support, and rollback documentation.

Do not manually edit generated lockfiles. Cargo dependency changes require Cargo-generated lockfile updates and exact-head validation.

## Next priorities

1. Complete and remediate human acceptance for issues #2, #5, #6, #3, #4, #7, and #29.
2. Progress issue #36 without expanding product scope.
3. Use Viable's Product and ICP workflow to select and validate Viable's narrower launch ICP.
4. Decide connected publishing, analytics, search, CRM, Context.dev, and live Webdog adapters from current product evidence.
5. Define Relationships and Sales authority before implementing contacts, leads, organizations, and opportunities.
6. Reopen ViMax execution only when its machine-safe contract and operating-system validation plan exist.

Direct publishing and live website collection must not precede human acceptance of the complete manual evidence and activation loop.

## Release posture

Viable is not ready for external release.

A passing compiler, coverage threshold, dependency audit, or Debian package does not prove accessibility, unfamiliar-user success, signed distribution, safe upgrades, backup recovery, supported-platform behavior, provider execution, or operational support readiness.
