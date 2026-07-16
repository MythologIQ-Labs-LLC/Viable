# Viable Current State

## Document control

| Field | Value |
|---|---|
| Status | Authoritative implementation-status record |
| Last reviewed | 2026-07-16 |
| Product requirements | `docs/product/PRD.md` |
| ICP product authority | `docs/product/icp-discovery-and-validation.md` |
| Platform architecture | `docs/architecture/viable-platform.md` |
| Video Production architecture | `docs/architecture/video-production-domain.md` |
| ADRs | `docs/adr/README.md` |
| Open decisions | `docs/decisions/open-decisions.md` |
| Current handoff | `docs/handoff/CURRENT.md` |

## Summary

Viable is currently in the fifth internal product-slice stage.

The following internal workflows are implemented and automatedly validated:

1. Product Truth, ICP Discovery, and Marketability Assessment;
2. Signals Inbox with bounded event and public repository evidence;
3. Campaign Brief and Canonical Asset production;
4. Public Repository Growth and Launch;
5. provider-neutral Video Production packages and Studio review.

Merged PR #23 implemented the governed Video Production domain, pinned ViMax `v1.1.0` compatibility metadata, blank-credential manual package, structured artifact import, render and variant review, rights and consent records, and asynchronous authority revalidation.

Merged PR #24 connected that authority beneath Studio in the packaged Tauri desktop application. Exact-head validation passed secret scanning, core and desktop TypeScript, 67 deterministic Node tests, Rust formatting, Rust tests, Tauri bundle construction, and Debian package inspection.

Human accessibility and unfamiliar-user acceptance remain open for issues #2, #5, #6, #3, and #4.

Viable is not an end-user release. No claim should imply that direct ViMax execution, provider credentials, Calendar, publishing, delivery evidence, leads, sales, general analytics, signed installers, or release readiness are operational.

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
- initial build sequence and product roadmaps;
- open-source repository growth model;
- implemented ViMax Stage 1 integration assessment;
- governance and safety boundaries;
- product provenance and ownership policy;
- canonical glossary;
- open decisions register;
- restart handoff;
- user guides for Product and ICP, Signals, Campaigns and Studio, Repository Growth, and Video Production.

## Accepted foundational decisions

- local-first workspace authority;
- provider-neutral capability adapters;
- Product Core claim authority;
- reviewed evidence and explicit partial failure;
- named human approval for externally consequential action;
- marketability-loop authority with bounded Event Intelligence;
- Product Core ownership of canonical ICP hypotheses.

Repository Growth and Video Production implement these accepted boundaries. They did not require new ADRs.

## Initial build issue coverage

| Slice | Issue | Automated state |
|---|---|---|
| Sanitized event foundation and migration | #1 | Implemented and closed |
| Product Truth, ICP Discovery, and Marketability Assessment | #2 | Implemented; human acceptance open |
| Signals Inbox | #5 | Implemented; human acceptance open |
| Campaign Brief and Canonical Asset | #6 | Implemented; human acceptance open |
| Public Repository Growth and Launch | #3 | Implemented; human acceptance open |
| Video Production and ViMax package prototype | #4 | Implemented Stage 1; human acceptance and issue #7 handoff open |
| Calendar, Manual Activation, Outcome Capture, and Learning | #7 | Designed; not implemented |

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
- visible verified-empty, partial, unavailable, rate-limited, validation-failed, transport-failed, offline, and recovery states.

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
- upstream MIT notice obligations;
- structured run import with stages, failures, relative paths, MIME types, sizes, SHA-256 values, source relationships, and redacted logs;
- completed, partial, failed, and cancelled render states;
- separate draft, review, approval, changes-requested, rejection, and invalidation states;
- named render review;
- LinkedIn, Instagram Reels, YouTube Shorts, and website platform variants;
- separate platform-variant review;
- current Product Core and Campaign authority revalidation at package, import, artifact, and variant boundaries;
- local Studio workflow with loading, empty, offline, blocked, failure, recovery, and invalidation states.

## ViMax boundary

ViMax is optional and removable.

The implemented Stage 1 adapter:

- does not contain ViMax;
- does not install Python;
- does not execute ViMax;
- does not invoke a provider;
- does not inject or store credentials;
- does not claim Windows or Linux execution validation;
- does not claim macOS compatibility;
- does not schedule, publish, deliver, or measure media.

The upstream project lists Windows and Linux. Viable records those as upstream statements only. macOS remains unverified.

A local CLI adapter remains deferred until a stable noninteractive contract supports version checks, cancellation, progress, structured errors, bounded storage, credential injection, artifact manifests, redacted logs, and cross-platform execution testing.

## Designed but not implemented

- Calendar and editorial scheduling;
- approved external-action execution state machine;
- delivery evidence;
- direct social, website, or GitHub publishing;
- local ViMax execution or managed worker;
- model-provider execution;
- Windows, Linux, or macOS ViMax runtime validation;
- social and search research adapters beyond implemented sources;
- authenticated GitHub traffic and write adapters;
- website, SEO, AEO, and conversion analysis;
- lead and organization records;
- sales enablement;
- general measurement, attribution, experiments, ICP-confidence feedback, and learning ledger;
- hosted synchronization and multi-user collaboration;
- signed installers and update system.

## External integration status

| Integration area | Status |
|---|---|
| Event sources | Public ICS implemented; additional adapters not implemented |
| GitHub public evidence | Bounded public evidence, readiness, launch, export, baseline, and retrospective implemented; authenticated metrics and writes not implemented |
| LinkedIn | Local text and video variant records exist; publishing adapter not implemented |
| Instagram Reels | Local video variant record exists; publishing adapter not implemented |
| YouTube Shorts | Local video variant record exists; publishing adapter not implemented |
| Website CMS | Local text and video variant records exist; CMS adapter not implemented |
| GitHub release publishing | Local release variant exists; publishing adapter not implemented |
| ViMax | Stage 1 manual package and import implemented; execution adapter deferred |
| Search and general analytics | Not implemented |
| CRM and lead capture | Not implemented |

## Human acceptance gates

Issue #2 remains open for Product and ICP accessibility and unfamiliar-founder acceptance.

Issue #5 remains open for Signals accessibility and unfamiliar-user acceptance.

Issue #6 remains open for Campaigns and Studio accessibility and unfamiliar-user acceptance.

Issue #3 remains open for Repository Growth accessibility and unfamiliar-maintainer acceptance.

Issue #4 remains open for:

- hands-on keyboard and assistive-technology review;
- unfamiliar-user completion from approved script through reviewed platform variant;
- remediation from those reviews;
- Calendar and measurement handoff after issue #7.

Automated semantics, responsive styling, reduced-motion support, deterministic tests, and native packaging are not substitutes for those reviews.

## Immediate next milestones

1. Complete and remediate human acceptance for issues #2, #5, #6, #3, and #4.
2. Implement issue #7: Calendar, Manual Activation, Outcome Capture, and Learning.
3. Connect approved campaign, repository, and video assets to authoritative calendar and delivery-evidence records.
4. Add backup, restore, retention, installer signing, update, and cross-platform release validation before external beta.
5. Reopen ViMax execution only when the required machine-safe contract and operating-system validation plan exist.

## Release posture

Viable is not ready for an end-user product release.

The repository supports controlled internal development and automated package validation. A public or commercial release requires security and privacy review, tested backup and restore, explicit retention, installer signing and update behavior, hands-on accessibility, unfamiliar-user acceptance, validated external-action evidence, and operational support documentation.
