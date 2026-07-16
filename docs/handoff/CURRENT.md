# Viable Current Session Handoff

## Purpose

This is the restart entrypoint for Viable work. It preserves the context required to continue without relying on conversation memory.

Detailed authority remains in the PRD, accepted ADRs, domain architecture, current state, roadmap, open decisions, integration assessments, issues, and merged pull requests.

## Repository state

- Repository: `MythologIQ-Labs-LLC/Viable`
- Product owner: MythologIQ Labs, LLC
- Product lead: Kevin R. Knapp
- Latest merged implementation PR: #31 at `c4cbc883d4b06c0352c4210e55a3b0e9dd0f5c0c`
- Latest Website Watch core PR: #30 at `8d4f7fa24412c12a98eebc4cc1371bf403d56701`
- Current maturity: all six initial internal product slices and Website Watch Stage 1 are implemented and automatedly validated on `main`
- Automated validation: secret scan, core and desktop TypeScript, complete deterministic Node suite, Rust formatting, Rust tests, Tauri bundle, and Debian package inspection
- Human acceptance remains open for issues #2, #5, #6, #3, #4, #7, and #29
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
13. `docs/roadmap/initial-build-sequence.md`
14. `docs/decisions/open-decisions.md`
15. the relevant integration assessment and third-party notice
16. the selected GitHub issue and all linked merged pull requests

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

## Marketability loop

```text
Establish product truth
  -> identify and validate the proper ICP
  -> assess marketability
  -> understand market and opportunity evidence
  -> monitor relevant public changes
  -> choose positioning and offers
  -> create canonical assets
  -> adapt assets to channels and production formats
  -> assess product surfaces such as public repositories
  -> review destination-bound external action
  -> schedule and activate manually or through supported adapters
  -> record delivery, failure, cancellation, or unknown evidence
  -> compare explicit metric evidence with a baseline
  -> complete a retrospective
  -> choose one reversible next action
  -> refine product, ICP, message, offer, repository, asset, source, and channel plan
```

Event Intelligence and Website Watch are bounded Signals subsystems. Repository Growth is one Product-integrated surface workflow. Video Production is one Campaign-linked production workflow. Calendar and Analytics complete the first manual operating loop. None becomes top-level product authority.

## Durable authority boundaries

- Product Core owns canonical product truth, claims, reviewed evidence, and ICP hypotheses.
- Signals and Market owns source health, externally observed evidence, review, and proposed-work conversion, including Website Watch.
- Campaigns owns approved campaign intent, canonical assets, and channel variants.
- Repository Growth owns repository assessment, owned growth planning, launch-room state, bounded baselines, and repository retrospectives.
- Video Production owns reviewed video briefs, manual production packages, imported run evidence, render review, and platform-variant review.
- Approval and External Action owns destinations, Calendar timing, destination-bound review, manual activation packages, export handoff, and delivery or failure evidence.
- Measurement and Learning owns measurement plans, metric evidence states, performance imports, retrospectives, attribution uncertainty, and learning-ledger entries.
- Generated suggestions remain distinct from reviewed evidence.
- A generator, collector, scheduler, adapter, or production tool cannot approve its own output.
- Render completion does not equal approval.
- Scheduling, approval, export, delivery, provider verification, and successful outcome are distinct states.
- Missing, delayed, partial, unavailable, and not-collected metrics do not become zero.
- A configured Website Watch target does not prove that a check occurred.
- A failed website check cannot become verified no change.
- The first website snapshot establishes a baseline and cannot prove no earlier change.
- Human-recorded evidence does not become provider verification.
- AI change summaries and relevance recommendations do not become reviewed evidence.
- Retrospectives may propose ICP or positioning review but cannot silently mutate Product Core.
- Provider content and imported manifests are untrusted data.
- Core workflows remain useful without hosted Viable infrastructure or a required LLM.
- Viable does not support spam, fake growth, surveillance, unsupported claims, bypassed access, or manufactured adoption.

## Ownership, migration, and third-party code

Viable is a MythologIQ Labs, LLC product created and led by Kevin R. Knapp.

The event-intelligence foundation originated as Event Radar. Viable is the authoritative expanded product.

Migration and selective code adaptation remain fail-closed. Never import:

- external-organization ownership, branding, governance, licensing, or compliance claims;
- credentials, cookies, sessions, authorization headers, webhooks, tokens, or secret-bearing files;
- real external workspaces, channels, accounts, tenant IDs, destinations, or private URLs;
- private prompts, operational evidence, logs, reports, screenshots, exports, or confidential fixtures;
- old package identities, signing identities, release destinations, or update channels;
- ambiguous material whose ownership, privacy, licensing, or operational meaning is unclear.

MIT-licensed external code may be copied or substantially adapted only with complete copyright and permission notices, source-path and revision tracking, and no implied endorsement or trademark grant.

`THIRD_PARTY_NOTICES.md` records the reviewed Webdog revision, source paths, copyright, MIT terms, and service and content boundaries.

## Accepted architecture decisions

- ADR-0001: local-first workspace authority.
- ADR-0002: provider-neutral capability adapters.
- ADR-0003: Product Core claims-ledger authority.
- ADR-0004: evidence provenance and explicit partial failure.
- ADR-0005: named human approval for external action.
- ADR-0006: marketability-loop authority and bounded Event Intelligence.
- ADR-0007: Product Core ownership of ICP hypotheses and validation.

Repository Growth, Video Production, Calendar and Learning, and Website Watch implement these accepted decisions. Do not create duplicate claim, campaign, signal, approval, evidence, delivery, attribution, Calendar, or ICP authority downstream.

## Initial build order and extension

| Sequence | Issue | Workstream | State |
|---|---|---|---|
| Foundation | #1 | Sanitized Event Radar migration | Implemented and closed |
| Slice 1 | #2 | Product Truth, ICP, Assessment | Implemented; human acceptance open |
| Slice 2 | #5 | Signals Inbox | Implemented; human acceptance open |
| Slice 3 | #6 | Campaign Brief and Canonical Asset | Implemented; human acceptance open |
| Slice 4 | #3 | Repository Growth and Launch | Implemented; human acceptance open |
| Slice 5 | #4 | Video Production and ViMax package | Implemented Stage 1 and Calendar handoff; execution and human acceptance open |
| Slice 6 | #7 | Calendar, Activation, Outcomes, Learning | Implemented; human acceptance open |
| Signals extension | #29 | Website Watch and Webdog-compatible import | Implemented Stage 1; human acceptance open |

Do not restart issues #7 or #29 as unimplemented slices. Their automated core and desktop journeys are merged.

Issue #29 is a post-sequence Signals expansion, not a seventh foundational slice and not a replacement for human acceptance or release work.

## Implemented product capabilities

### Product Core

- local product workspace and truth revision;
- reviewed evidence and approved claims;
- ICP hypotheses, comparison, selection, history, disqualifiers, contradictions, and experiments;
- explained marketability assessment and owned actions;
- Home and Product desktop workflow.

### Signals and Market

- bounded Event Intelligence;
- public GitHub evidence;
- strict manual import;
- source health and explicit partial failure;
- provenance, freshness, confidence, and limitations;
- named review and proposed-work conversion;
- Market evidence summary.

### Website Watch Stage 1

- watched sites with canonical public URL, normalized domain, relationship, purpose, authorization, retention, owner, and active state;
- site-link, page-content, and product-price target intent;
- requested intervals and next-due intent without claiming worker execution;
- strict Webdog `webdog_ai.new_alerts` version 1 pasted or local-file import;
- input size, alert count, unknown-field, origin, URL, credential-field, and secret-value validation;
- public HTTP and HTTPS URL restrictions with browser-safe literal IPv4 and IPv6 blocking;
- source outcomes for change, no change, baseline, partial, unavailable, rate limit, authentication, validation, transport, offline, and cancellation;
- browser-safe SHA-256 identities and ordered bounded line differences;
- Website Watch observations and correlated Signals suggestions from one validated import;
- generated change summaries and relevance recommendations displayed separately from evidence;
- named Signals review synchronized with Website Watch observation review;
- local snapshot retention, named deletion, and retention pruning;
- Website Watch proposed work;
- reviewed Calendar follow-up, experiment, opportunity, and approval-deadline planning;
- local browser-profile persistence;
- responsive and reduced-motion-safe presentation.

Stage 1 does not crawl websites, call Context.dev, connect to a live Webdog service, run a worker, import live screenshots, open a public webhook listener, copy browser sessions, access private pages, execute AI triage, send notifications, publish, or mutate Product Core automatically.

### Campaigns and Studio

- Product Core-traceable campaign briefs;
- selected ICP or deliberate test audience;
- canonical assets and versions;
- LinkedIn, website, and GitHub release variants;
- rights, accessibility, disclosures, comments, and review;
- claim-impact invalidation;
- credential-free manual exports.

### Repository Growth and Launch

- bounded public GitHub import;
- twelve explained readiness dimensions;
- owned growth plans;
- campaign-linked launch rooms;
- maintainer coverage and release checklist;
- explicit metric evidence states;
- manual launch export;
- baseline and bounded retrospective.

### Video Production and Studio

- approved campaign-linked canonical script selection;
- exact script version and Product Core authority snapshot;
- video briefs with storyboard, rights, consent, accessibility, disclosures, provider plans, costs, and data handling;
- named brief review;
- pinned ViMax `v1.1.0`, revision `1f8f650`, Python 3.12+, MIT compatibility record;
- provider-neutral manual package;
- blank-credential Script2Video packet;
- structured stage, failure, artifact, hash, source, and redacted-log import;
- completed, partial, failed, and cancelled render states;
- named render review;
- separately reviewed LinkedIn, Instagram Reels, YouTube Shorts, and website variants;
- approved video variants available to Calendar;
- current authority revalidation at asynchronous boundaries;
- packaged Studio workflow with explicit empty, offline, blocked, failure, recovery, and invalidation states.

### Calendar and Manual Activation

- destinations with explicit ownership and non-secret account references;
- planning entries for deadlines, opportunities, experiments, and follow-ups;
- external actions sourced from approved Campaign variants, ready Repository Launch rooms, and approved Video variants;
- reviewed Website Watch planning entries related to the source observation;
- source-to-destination channel filtering;
- exact source snapshots with claims, evidence, rights, accessibility, disclosures, and file or body relationships;
- named destination-bound review;
- separate schedule and activation states;
- credential-free packages with idempotency keys;
- ready, downloaded, interrupted, and recovered export operations;
- delivered, failed, cancelled, and unknown outcomes;
- human-recorded, provider-evidence, and provider-verified classifications;
- provider response identifiers required before provider verification;
- source and destination authority invalidation.

### Analytics and Learning

- measurement plans and baselines;
- observation windows;
- observed, verified-zero, delayed, partial, unavailable, and not-collected metric states;
- performance-import provenance and limitations;
- numeric comparison only for compatible evidence states;
- continue, iterate, stop, and inconclusive retrospective decisions;
- manual, first-touch, last-touch, influence, and unattributed model labels;
- mandatory attribution uncertainty;
- advisory ICP-confidence and positioning effects;
- evidence, decision, change, outcome, follow-up, and reversible-next-action learning entries;
- Calendar and Analytics desktop navigation;
- explicit loading, empty, offline, blocked, error, interruption, recovery, invalidation, partial-evidence, and ready states.

## ViMax decision

OD-011 is resolved for Stage 1.

ViMax is optional and removable. The implemented adapter does not install or execute ViMax, bundle Python, invoke providers, store credentials, claim Windows or Linux execution testing, claim macOS support, or publish automatically.

The upstream project lists Windows and Linux. Viable records those as upstream statements only. macOS remains unverified.

A local CLI adapter is deferred until a stable noninteractive contract supports health, version, cancellation, progress, structured errors, bounded storage, credential injection, artifacts, redacted logs, and cross-platform validation.

## Delivery and attribution decisions

OD-021 is resolved for the initial manual loop:

- schedule intent is not delivery;
- package export is not delivery;
- delivery requires explicit evidence;
- human-recorded evidence remains human recorded;
- provider verification requires a provider response identifier.

OD-022 is resolved for the initial retrospective labels:

- manual;
- first touch;
- last touch;
- influence;
- unattributed.

Every retrospective states attribution uncertainty. Viable does not claim an automated attribution engine.

## Website Watch decision

OD-025 is resolved and implemented for Stage 1.

Viable:

- owns a provider-neutral Website Watch domain inside Signals and Market;
- implements strict Webdog-compatible manual import;
- preserves Webdog provenance, source health, explicit limitations, generated-analysis separation, named review, retention, and deletion;
- uses existing Signals and Calendar authority;
- keeps Webdog and Context.dev optional;
- preserves the Webdog MIT notice and reviewed revision.

Viable does not:

- merge Webdog's hosted application wholesale;
- import its Next.js, PostgreSQL, Better Auth, Railway, team, share-link, notification, or credential model;
- depend on undocumented internal Webdog routes or database schema;
- treat alerts or outbound notifications as Viable delivery evidence;
- store provider credentials in domain records;
- describe AI summaries as evidence;
- permit private-page scraping through copied browser sessions or access-control bypass.

Authority:

- `docs/integrations/webdog-website-monitoring.md`
- `docs/architecture/website-watch-domain.md`
- `docs/user/website-watch.md`
- `THIRD_PARTY_NOTICES.md`
- GitHub issue #29

## Open human acceptance gates

Issue #2:

- Product and ICP keyboard and screen-reader review;
- unfamiliar-founder completion;
- remediation.

Issue #5:

- Signals keyboard and assistive-technology review;
- unfamiliar-user completion;
- remediation.

Issue #6:

- Campaigns and Studio accessibility review;
- unfamiliar-user campaign-to-export completion;
- remediation.

Issue #3:

- Repository Growth accessibility review;
- unfamiliar-maintainer import-to-retrospective completion;
- remediation.

Issue #4:

- actual ViMax run consuming the adapted package;
- Windows and Linux ViMax execution validation;
- Video Production accessibility review;
- unfamiliar-user approved-script-to-reviewed-and-scheduled-variant completion;
- remediation.

Issue #7:

- Calendar and Analytics accessibility review;
- unfamiliar-user completion from approved source through outcome and learning entry;
- remediation.

Issue #29:

- Website Watch keyboard and assistive-technology review;
- unfamiliar-founder completion from watched-site creation through reviewed change and Calendar follow-up;
- remediation of accessibility, clarity, evidence, retention, failure, and recovery findings.

Automated semantic contracts, responsive styling, reduced motion, deterministic tests, and native packaging do not replace human review.

## Next product priorities

Do not invent another foundational slice merely to preserve momentum.

Prioritize:

1. complete and remediate human acceptance for issues #2, #5, #6, #3, #4, #7, and #29;
2. define backup, restore, product-wide retention, deletion, and cross-version migration guarantees;
3. use Viable's Product and ICP workflow to select and validate Viable's own narrower launch ICP;
4. decide connected publishing, analytics, search, CRM, Context.dev, and live Webdog adapters from current product evidence;
5. define Relationships and Sales authority before implementing contacts, leads, organizations, and opportunities;
6. add installer signing, updates, rollback, and cross-platform installer validation;
7. prepare operational support and external beta documentation;
8. reopen ViMax execution only when its machine-safe contract and operating-system validation plan exist.

Direct publishing must not precede human acceptance of the complete manual activation and evidence loop.

## CI and merge posture

Repository CI exposes:

- secret scan;
- core TypeScript;
- desktop TypeScript;
- build and deterministic tests;
- failure-only diagnostic artifacts for both compiler surfaces and build/test output.

Desktop validation covers:

- Rust formatting;
- Rust tests;
- Tauri bundle construction;
- Debian package inspection.

Do not merge implementation changes without exact-head repository and native validation.

## Release posture

Viable is not ready for external release.

Before public beta, complete human acceptance, backup and restore, product-wide retention and deletion, schema migration, installer signing, update and rollback behavior, privacy and security review, cross-platform installer validation, and operational support documentation.
