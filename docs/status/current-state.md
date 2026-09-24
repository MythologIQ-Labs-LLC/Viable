# Viable Current State

## Document control

| Field | Value |
|---|---|
| Status | Authoritative implementation-status record |
| Last reviewed | 2026-09-24 |
| Product requirements | `docs/product/PRD.md` |
| ICP product authority | `docs/product/icp-discovery-and-validation.md` |
| Platform architecture | `docs/architecture/viable-platform.md` |
| Website Watch architecture | `docs/architecture/website-watch-domain.md` |
| Video Production architecture | `docs/architecture/video-production-domain.md` |
| Activation and learning architecture | `docs/architecture/activation-and-learning-domain.md` |
| Automated viability review | `docs/reviews/viability-sweep-2026-07-16.md` |
| ADRs | `docs/adr/README.md` |
| Open decisions | `docs/decisions/open-decisions.md` |
| Current handoff | `docs/handoff/CURRENT.md` |

## Summary

Viable has completed and automatedly validated all six initial internal product slices.

The following internal workflows are implemented:

1. Product Truth, ICP Discovery, and Marketability Assessment;
2. Signals Inbox with bounded event and public repository evidence;
3. Campaign Brief and Canonical Asset production;
4. Public Repository Growth and Launch;
5. provider-neutral Video Production packages and Studio review;
6. Calendar, manual activation, outcome evidence, performance import, retrospectives, and learning.

Website Watch Stage 1 is implemented as a post-sequence Signals and Market extension.

PR #35, merged at `77b9572ef00df75c734b753bcd480d8e7fe9e5b9`, completed the current automated viability sweep. It hardened clean builds, repository consistency, secret scanning, dependency and workflow supply-chain controls, coverage floors, desktop persistence integrity, startup recovery, Campaign and Studio recovery, exact Rust minimum validation, and native workflow coverage. PRs #66–#70 subsequently completed machine-verifiable Signals materialization while preserving Product Core, Campaigns and Assets, Website Watch/Calendar, and Repository Growth destination authority.

Human accessibility and unfamiliar-user acceptance remain open for issues #2, #5, #6, #3, #4, #7, and #29.

Issue #4 also remains open for actual ViMax execution and Windows and Linux ViMax runtime validation.

Issue #36 owns the remaining non-human release-foundation work.

Viable is not an end-user release. No claim should imply that direct publishing, connected provider delivery verification, automatic analytics import, live website crawling, Context.dev execution, live Webdog synchronization, actual ViMax execution, leads, sales, signed installers, tested upgrades, backup recovery, or external release readiness are operational.

## Implemented documentation authority

- Platinum-grade product README;
- formal Product Requirements Document;
- ICP discovery and validation specification;
- marketability operating model;
- accepted foundational ADR set;
- platform architecture;
- ICP domain architecture;
- Repository Growth domain architecture;
- Video Production domain architecture;
- Calendar, Activation, Outcome, and Learning architecture;
- Website Watch domain architecture;
- initial build sequence and product roadmaps;
- open-source repository growth model;
- implemented ViMax Stage 1 integration assessment;
- implemented Webdog Website Watch Stage 1 integration assessment;
- third-party notices with Webdog revision and MIT attribution;
- automated viability review;
- governance and safety boundaries;
- product provenance and ownership policy;
- canonical glossary;
- open decisions register;
- restart handoff;
- user guides for Product and ICP, Signals, Website Watch, Campaigns and Studio, Repository Growth, Video Production, Calendar, manual activation, outcomes, and learning.

## Foundational authority

Viable preserves:

- local-first workspace authority;
- provider-neutral capability adapters;
- Product Core claim authority;
- reviewed evidence and explicit partial failure;
- named human approval for externally consequential action;
- marketability-loop authority with bounded Event Intelligence;
- Product Core ownership of canonical ICP hypotheses;
- generated-analysis separation;
- distinct schedule, approval, export, delivery, provider-verification, and outcome states;
- explicit unavailable, partial, delayed, not-collected, and verified-zero states.

Repository Growth, Video Production, Calendar and Learning, and Website Watch implement these boundaries without creating duplicate authority.

## Workstream coverage

| Workstream | Issue | Automated state |
|---|---|---|
| Sanitized event foundation and migration | #1 | Implemented and closed |
| Product Truth, ICP Discovery, and Marketability Assessment | #2 | Implemented; human acceptance open |
| Signals Inbox | #5 | Implemented; human acceptance open |
| Campaign Brief and Canonical Asset | #6 | Implemented; human acceptance open |
| Public Repository Growth and Launch | #3 | Implemented; human acceptance open |
| Video Production and ViMax package prototype | #4 | Stage 1 implemented; actual ViMax execution and human acceptance open |
| Calendar, Manual Activation, Outcome Capture, and Learning | #7 | Implemented; human acceptance open |
| Website Watch and Webdog-compatible Signals extension | #29 | Stage 1 implemented and hardened; human acceptance open |
| Release foundations | #36 | Open |

Website Watch is a bounded Signals and Market extension, not a seventh foundational slice.

## Implemented runtime foundation

### Shared platform

- Tauri 2 desktop shell with Viable identity;
- local browser-profile persistence for current desktop workflows;
- atomic local JSON adapters for reusable domain services;
- named human approval primitive;
- strict core and desktop TypeScript;
- deterministic Node tests;
- Rust formatting and tests;
- Tauri bundle and Debian package validation;
- failure-only diagnostics for viability, secrets, dependency audit, compiler surfaces, tests, and coverage.

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
- public GitHub repository metadata and activity evidence;
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

| Metric | Observed during sweep | Enforced floor |
|---|---:|---:|
| Lines | 88.69% | 85% |
| Branches | 62.44% | 55% |
| Functions | 89.81% | 85% |

Coverage floors apply to reusable core source. They do not prove user comprehension or evidence quality.

### Desktop persistence and recovery

All seven desktop stores validate minimum workspace identity and structure before loading authority data.

The runtime now:

- rejects malformed, mismatched, or incomplete saved data;
- preserves the original saved value for recovery or deletion;
- surfaces storage access, quota, serialization, and incomplete-removal failures;
- renders a visible startup failure instead of remaining indefinitely busy;
- renders Campaign and Studio load recovery and retry behavior;
- preserves Product workspace identity through partial deletion so cleanup can be retried.

This does not implement schema versions, cross-version migrations, backup, restore, or corruption quarantine.

### Exact-head evidence

PR #35 was validated at `041193349de518e708b8e80378e4de9a9f46d5ad`:

- CI run #118 passed repository viability, working-tree secret scan, npm dependency audit, strict TypeScript, complete deterministic tests, and coverage floors;
- Desktop run #62 passed exact Rust 1.88 formatting and tests, clean desktop web compilation, Tauri bundle construction, and Debian package inspection.

Shared `src/**` changes now trigger native validation.

Signals materialization PRs #66–#70 were each exact-head validated before merge. The final two destination tranches passed CI #222 / Desktop #151 for Website Watch-to-Calendar and CI #224 / Desktop #153 for Repository Growth binding. These automated gates do not satisfy issue #5's remaining human accessibility or unfamiliar-user acceptance requirements.

## Designed or required but not implemented

- direct social, website, or GitHub publishing adapters;
- automatic provider delivery verification;
- connected analytics and search imports;
- local ViMax execution or managed worker;
- model-provider execution;
- live Context.dev collection;
- live Webdog service synchronization;
- social and search research adapters beyond implemented sources;
- authenticated GitHub traffic and write adapters;
- website crawl, SEO, AEO, and conversion analysis;
- lead and organization records;
- sales enablement;
- automated attribution computation;
- automatic ICP or Product Core mutation from learning;
- hosted synchronization and multi-user collaboration;
- explicit schema versions and cross-version migrations;
- product-wide backup and restore;
- product-wide retention and deletion propagation;
- corruption quarantine and malformed-record export;
- Rust dependency minimization and advisory scanning;
- signed installers and publisher identity;
- tested update, interruption, rollback, upgrade, and uninstall behavior;
- Windows installer validation;
- macOS packaging and notarization decision;
- operational support readiness.

## Human acceptance gates

Issue #2 remains open for Product and ICP accessibility, unfamiliar-founder completion, and remediation.

Issue #5 remains open for Signals accessibility, unfamiliar-user completion, and remediation.

Issue #6 remains open for Campaigns and Studio accessibility, unfamiliar-user campaign-to-export completion, and remediation.

Issue #3 remains open for Repository Growth accessibility, unfamiliar-maintainer completion, and remediation.

Issue #4 remains open for actual ViMax execution, Windows and Linux ViMax validation, accessibility, unfamiliar-user completion, and remediation.

Issue #7 remains open for Calendar and Analytics accessibility, unfamiliar-user completion through outcome and learning, and remediation.

Issue #29 remains open for Website Watch accessibility, unfamiliar-founder completion through reviewed change and Calendar planning, and remediation.

Automated semantics, coverage, persistence checks, focus styling, responsive styling, reduced motion, deterministic tests, and native packaging are not substitutes for those reviews.

## Immediate next milestones

1. Complete and remediate human acceptance for issues #2, #5, #6, #3, #4, #7, and #29.
2. Progress release-foundation issue #36.
3. Use Viable's Product and ICP workflow to select and validate its narrower launch ICP.
4. Decide the first connected publishing, analytics, search, CRM, Context.dev, and live Webdog adapters from product evidence.
5. Define Relationships and Sales authority before implementing lead or opportunity records.
6. Reopen ViMax execution only when the machine-safe contract and operating-system validation plan exist.

## Release posture

Viable is not ready for an end-user product release.

The repository supports controlled internal development and automated package validation. A public or commercial release requires human acceptance, tested backup and restore, schema migration, explicit product-wide retention and deletion, dependency hardening, signed installers, update and rollback behavior, supported-platform validation, privacy and security review, and operational support documentation.
