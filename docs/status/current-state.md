# Viable Current State

## Document control

| Field | Value |
|---|---|
| Status | Authoritative implementation-status record |
| Last reviewed | 2026-07-16 |
| Product requirements | `docs/product/PRD.md` |
| ICP product authority | `docs/product/icp-discovery-and-validation.md` |
| Platform architecture | `docs/architecture/viable-platform.md` |
| Website Watch architecture | `docs/architecture/website-watch-domain.md` |
| Video Production architecture | `docs/architecture/video-production-domain.md` |
| Activation and learning architecture | `docs/architecture/activation-and-learning-domain.md` |
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

Website Watch Stage 1 is also implemented as a post-sequence Signals and Market extension.

Merged PR #30 implemented the provider-neutral Website Watch core, strict Webdog-compatible manual import, source outcomes, correlated Signals evidence, named review, retention and deletion, browser-safe security utilities, and deterministic prohibited-transition tests.

Merged PR #31 connected Website Watch to Signals, Market, and authoritative Calendar planning in the packaged Tauri desktop application. Exact-head validation passed repository secret scanning, core and desktop TypeScript, the complete deterministic Node suite, Rust formatting, Rust tests, Tauri bundle construction, and Debian package inspection.

Human accessibility and unfamiliar-user acceptance remain open for issues #2, #5, #6, #3, #4, #7, and #29.

Viable is not an end-user release. No claim should imply that direct publishing, connected provider delivery verification, automatic analytics import, live website crawling, Context.dev execution, live Webdog synchronization, actual ViMax execution, leads, sales, signed installers, or external release readiness are operational.

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
- governance and safety boundaries;
- product provenance and ownership policy;
- canonical glossary;
- open decisions register;
- restart handoff;
- user guides for Product and ICP, Signals, Website Watch, Campaigns and Studio, Repository Growth, Video Production, Calendar, manual activation, outcomes, and learning.

## Accepted foundational decisions

- local-first workspace authority;
- provider-neutral capability adapters;
- Product Core claim authority;
- reviewed evidence and explicit partial failure;
- named human approval for externally consequential action;
- marketability-loop authority with bounded Event Intelligence;
- Product Core ownership of canonical ICP hypotheses.

Repository Growth, Video Production, Calendar and Learning, and Website Watch implement these accepted boundaries. They did not require duplicate authority or a new foundational ADR.

## Initial build and extension coverage

| Workstream | Issue | Automated state |
|---|---|---|
| Sanitized event foundation and migration | #1 | Implemented and closed |
| Product Truth, ICP Discovery, and Marketability Assessment | #2 | Implemented; human acceptance open |
| Signals Inbox | #5 | Implemented; human acceptance open |
| Campaign Brief and Canonical Asset | #6 | Implemented; human acceptance open |
| Public Repository Growth and Launch | #3 | Implemented; human acceptance open |
| Video Production and ViMax package prototype | #4 | Implemented Stage 1; actual ViMax execution and human acceptance open |
| Calendar, Manual Activation, Outcome Capture, and Learning | #7 | Implemented; human acceptance open |
| Website Watch and Webdog-compatible Signals extension | #29 | Implemented Stage 1; human acceptance open |

Issue #29 is a bounded Signals and Market extension, not a seventh foundational slice.

## Implemented runtime foundation

### Shared platform

- Tauri 2 desktop shell with Viable identity;
- local browser-profile persistence for current desktop workflows;
- atomic local JSON adapters for reusable domain services;
- named human approval primitive;
- strict TypeScript and Node tests;
- Rust formatting and tests;
- Tauri bundle and Debian package validation;
- secret scanning;
- failure-only core TypeScript, desktop TypeScript, and build-test diagnostic artifacts.

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
- visible verified-empty, partial, unavailable, rate-limited, validation-failed, transport-failed, offline, and recovery states;
- reviewed evidence summary in Market.

### Website Watch Stage 1

- watched-site identity, canonical URL, normalized domain, relationship, purpose, authorization confirmation, retention, owner, and active state;
- site-link, page-content, and product-price target intent;
- target URL, link scope, watch note, requested interval, next-due intent, source adapter, retention, and review requirement;
- provider-neutral snapshots with observed URL, correlation reference, SHA-256 identity, bounded payload reference, limitations, retention, and deletion evidence;
- website-change observations with snapshot relationships, change kind, bounded diff, evidence state, confidence, limitations, review, and generated-analysis relationships;
- generated change summaries and relevance recommendations stored separately from evidence;
- source outcomes for change detected, verified no change, baseline, partial, unavailable, rate limited, authentication failure, validation failure, transport failure, offline, and cancellation;
- first-snapshot baseline semantics that do not claim no earlier change;
- strict Webdog `webdog_ai.new_alerts` version 1 pasted or local-file import;
- one to one hundred alerts per import and a 512 KiB input limit;
- source-instance origin validation;
- secret-bearing field and value rejection;
- absolute public HTTP and HTTPS URL validation;
- literal IPv4 and IPv6 private, loopback, link-local, metadata, multicast, documentation, and reserved-range restrictions;
- browser-safe SHA-256 implementation with canonical vectors;
- ordered bounded line differences without semantic-completeness claims;
- the same validated import producing Website Watch evidence and correlated Signals suggestions;
- named Signals review synchronized with the related Website Watch observation;
- proposed Website Watch response work;
- reviewed follow-up, experiment, opportunity, and approval-deadline handoff through existing Calendar authority;
- snapshot deletion and retention pruning with named actors while preserving provenance;
- Webdog MIT attribution and reviewed-source provenance;
- loading, empty, offline, blocked, error, partial, failure, and recovery states;
- responsive and reduced-motion-safe desktop presentation.

### Campaigns and Studio

- Product Core-traceable campaign briefs;
- selected ICP or deliberate test audience;
- one primary audience and outcome;
- canonical assets and channel variants;
- claims, evidence, rights, accessibility, disclosures, comments, and version history;
- named campaign, asset, and variant review;
- approval invalidation;
- LinkedIn, website, and GitHub release variants;
- channel comparison;
- credential-free manual campaign exports that remain unapproved for publishing and undelivered.

### Public Repository Growth and Launch

- bounded public GitHub import;
- metadata, README, community, trust, release, and contributor evidence;
- observed, verified-zero, unavailable, and not-collected metric states;
- twelve explained readiness dimensions;
- owned growth actions;
- Product-integrated desktop workflow;
- campaign-linked launch rooms;
- Product Core authority revalidation;
- release checklist and maintainer coverage;
- observation window and baseline;
- manual launch package;
- bounded retrospective comparison.

### Video Production and Studio

- provider-neutral video brief;
- exact approved campaign and canonical-script relationship;
- exact script version, claim revision, and reviewed-evidence snapshot;
- duration, platforms, aspect ratios, style, prohibited elements, captions, audio description, accessibility, and disclosures;
- storyboard and shot constraints;
- source-asset rights, allowed use, prohibited use, sensitive kind, consent, optional hash, and expiration;
- user-selected LLM, image, and video provider plans;
- estimated cost, currency, data-handling notes, and credential mode;
- named video-brief review;
- pinned ViMax `v1.1.0`, revision `1f8f650`, Python 3.12+, MIT, Windows/Linux upstream, macOS-unverified tool record;
- provider-neutral manual package;
- blank-credential Script2Video compatibility packet;
- structured run import and artifact relationships;
- completed, partial, failed, and cancelled render states;
- named render and platform-variant review;
- local Studio workflow with blocked, error, recovery, and invalidation states.

### Calendar and Manual Activation

- destination registry with label, channel, non-secret account reference, owner, ownership confirmation, capability, rate-limit, retry, and data-handling notes;
- active and disabled destination states;
- planning entries for approval deadlines, event opportunities, experiments, and follow-ups;
- external activation entries from approved Campaign variants, ready Repository Launch rooms, and approved Video variants;
- reviewed Website Watch follow-up, experiment, opportunity, and approval-deadline entries;
- exact source snapshots with claims, evidence, rights, accessibility, disclosures, payload, and file relationships;
- source-to-destination channel filtering;
- separate draft, review, scheduled, invalidated, rejected, and cancelled schedule states;
- separate not-ready, ready-for-manual-activation, delivered, failed, cancelled, and unknown activation states;
- named destination-bound external-action review;
- Product Core and upstream-source authority revalidation before review and export;
- credential-free manual activation packages with idempotency keys;
- explicit ready-for-download, downloaded, interrupted, and recovered export states;
- human-recorded, provider-evidence, and provider-verified outcome classifications;
- delivered, failed, cancelled, and unknown outcome records;
- delivery URL, publication identifier, provider response, failure class, failure detail, evidence reference, owner, and time;
- authority-impact invalidation without erasing historical delivery evidence.

### Analytics and Learning

- measurement plans;
- baseline observations recorded before retrospective analysis;
- observation windows;
- observed, verified-zero, delayed, partial, unavailable, and not-collected metric states;
- complete, partial, delayed, unavailable, and failed performance-import states;
- human-recorded, provider-export, and provider-API source classifications;
- numeric comparison only for compatible observed and verified-zero states;
- continue, iterate, stop, and inconclusive retrospective decisions;
- manual, first-touch, last-touch, influence, and unattributed model labels;
- mandatory attribution uncertainty;
- evidence, decision, change, outcome, follow-up, and reversible-next-action learning entries;
- advisory ICP-confidence and positioning effects without automatic Product Core mutation;
- Calendar and Analytics desktop navigation;
- loading, empty, offline, blocked, error, interruption, recovery, invalidation, partial-evidence, and ready states.

## Authority and evidence boundaries

### External action

```text
scheduled
  != exported
  != delivered
  != provider verified
  != successful outcome
```

Provider verification requires a provider response identifier.

Human-recorded evidence remains explicitly human recorded.

### Metrics

Unavailable or missing evidence never becomes zero.

- `observed` requires a finite non-zero value;
- `verified_zero` requires explicit evidence and value zero;
- `delayed` prohibits a value;
- `partial` requires a limitation and may contain a bounded value;
- `unavailable` prohibits a value and requires a limitation;
- `not_collected` prohibits a value and requires a limitation.

A retrospective calculates a numeric delta only for compatible numeric states.

### Website Watch

```text
configured target
  != completed check
  != verified no change
  != reviewed evidence
  != Product Core truth
  != Calendar action
```

A failed website check never becomes verified no change.

The first snapshot establishes a baseline and cannot prove that no earlier change occurred.

A generated summary or relevance recommendation remains generated analysis.

A Calendar entry is available only after the correlated Signals record and Website Watch observation are reviewed.

## External integration status

| Integration area | Status |
|---|---|
| Event sources | Public ICS implemented; additional adapters not implemented |
| GitHub public evidence | Bounded public evidence, readiness, launch, export, baseline, and retrospective implemented; authenticated metrics and writes not implemented |
| Website Watch | Provider-neutral Stage 1 and Webdog-compatible manual import implemented; live crawling, Context.dev, and Webdog service adapters deferred |
| LinkedIn | Local text and video variants, destination records, packages, and human outcome evidence implemented; publishing adapter not implemented |
| Instagram Reels | Local video variant and manual destination workflow implemented; publishing adapter not implemented |
| YouTube Shorts | Local video variant and manual destination workflow implemented; publishing adapter not implemented |
| Website CMS | Local text and video variants, destination records, and manual evidence implemented; CMS adapter not implemented |
| GitHub release publishing | Local release variant, launch room, destination record, and manual evidence implemented; publishing adapter not implemented |
| ViMax | Stage 1 manual package and import implemented; execution adapter deferred |
| Search and general analytics | Manual metric import implemented; connected adapters not implemented |
| CRM and lead capture | Not implemented |

## Explicitly not implemented

- direct social, website, or GitHub publishing adapters;
- automatic provider delivery verification;
- connected analytics and search imports;
- live website crawling or scheduled Website Watch worker;
- Context.dev execution or credentials;
- live Webdog service synchronization;
- public inbound desktop webhook listener;
- website screenshots from a live provider;
- browser-session copying or private-page scraping;
- automatic Website Watch AI summary or relevance execution;
- local ViMax execution or managed worker;
- model-provider execution;
- Windows, Linux, or macOS ViMax runtime validation;
- authenticated GitHub traffic and write adapters;
- website SEO, AEO, and conversion analysis beyond bounded change evidence;
- lead and organization records;
- sales enablement;
- automated attribution computation;
- automatic ICP or Product Core mutation from learning or website changes;
- hosted synchronization and multi-user collaboration;
- product-wide backup and restore guarantees;
- product-wide retention and deletion policy;
- signed installers and update system.

Website Watch implements bounded snapshot retention and deletion. That does not resolve product-wide retention, backup, restore, or migration requirements.

## Human acceptance gates

Issue #2 remains open for Product and ICP accessibility and unfamiliar-founder acceptance.

Issue #5 remains open for Signals accessibility and unfamiliar-user acceptance.

Issue #6 remains open for Campaigns and Studio accessibility and unfamiliar-user acceptance.

Issue #3 remains open for Repository Growth accessibility and unfamiliar-maintainer acceptance.

Issue #4 remains open for:

- actual ViMax run consuming the adapted package;
- Windows and Linux ViMax execution validation;
- hands-on keyboard and assistive-technology review;
- unfamiliar-user completion from approved script through reviewed and scheduled platform variant;
- remediation from those reviews.

Issue #7 remains open for:

- hands-on keyboard and assistive-technology review;
- unfamiliar-user completion from approved source through outcome and learning entry;
- remediation from those reviews.

Issue #29 remains open for:

- hands-on keyboard and assistive-technology review;
- unfamiliar-founder completion from watched-site creation through reviewed change and Calendar follow-up;
- remediation of accessibility, clarity, evidence, retention, failure, and recovery gaps.

Automated semantics, responsive styling, reduced-motion support, deterministic tests, and native packaging are not substitutes for those reviews.

## Immediate next milestones

1. Complete and remediate human acceptance for issues #2, #5, #6, #3, #4, #7, and #29.
2. Define and validate backup, restore, product-wide retention, deletion, and schema-migration guarantees.
3. Use Viable's Product and ICP workflow to select and validate its own narrower launch ICP.
4. Decide the first connected publishing, analytics, search, CRM, and live website-monitoring adapters from product evidence.
5. Define Relationships and Sales authority before implementing lead or opportunity records.
6. Add installer signing, updates, rollback, and cross-platform release validation before external beta.
7. Reopen ViMax execution only when the required machine-safe contract and operating-system validation plan exist.

## Release posture

Viable is not ready for an end-user product release.

The repository supports controlled internal development and automated package validation. A public or commercial release requires security and privacy review, tested backup and restore, product-wide retention and deletion, schema migration, installer signing and update behavior, hands-on accessibility, unfamiliar-user acceptance, validated external-action evidence, cross-platform installer validation, and operational support documentation.
