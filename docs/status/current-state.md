# Viable Current State

## Document control

| Field | Value |
|---|---|
| Status | Authoritative implementation-status record |
| Last reviewed | 2026-07-16 |
| Product requirements | `docs/product/PRD.md` |
| ICP product authority | `docs/product/icp-discovery-and-validation.md` |
| Architecture | `docs/architecture/viable-platform.md` |
| ICP domain architecture | `docs/architecture/icp-domain.md` |
| ADRs | `docs/adr/README.md` |
| Open decisions | `docs/decisions/open-decisions.md` |
| Session handoff | `docs/handoff/session-context-2026-07-15.md` |
| Verification report | `docs/reviews/documentation-verification-2026-07-15.md` |
| Verification closure | `docs/reviews/documentation-verification-closure-2026-07-15.md` |

## Summary

Viable is currently in the fourth internal product-slice stage.

The formal product and architecture baseline, sanitized Event Intelligence foundation, Product Core domain, native Viable shell, bounded Signals Inbox, governed campaign production, and public repository growth workflow are established.

Merged PR #11 connects Product Core services to the Home and Product desktop workflow. Merged PR #13 adds the bounded Signals Inbox and Signals and Market desktop views. Merged PRs #16 and #18 add the guarded Campaign Brief and Canonical Asset core and connect it to Campaigns and Studio. Merged PR #20 adds the guarded repository-growth domain, bounded public GitHub import, explained readiness assessment, owned growth planning, campaign-linked launch rooms, manual exports, baselines, and retrospective comparison. Merged PR #21 connects that authority beneath Product in the packaged desktop application and improves CI diagnostics. Exact-head Node, TypeScript, Rust, release-build, and Debian package validation passed for the implemented slices.

Hands-on assistive-technology review and unfamiliar-user acceptance remain open for issues #2, #5, #6, and #3. No claim should imply that authenticated GitHub traffic collection, GitHub write operations, direct publishing, video generation, lead management, sales, general analytics, signed installers, or end-user release readiness are operational.

## Implemented in this repository

### Product and architecture documentation

- Platinum-grade product README foundation;
- formal Product Requirements Document with requirement IDs, MVP, quality attributes, metrics, and release gates;
- explicit ICP discovery and validation product specification;
- product scope;
- marketability operating model;
- accepted foundational ADR set and ADR template;
- complete platform architectural design;
- ICP domain architectural design;
- phased product roadmap;
- experience design roadmap;
- initial build sequence;
- open-source repository growth model;
- ViMax integration assessment;
- research, content, and outreach safety boundaries;
- product provenance and ownership policy;
- canonical domain glossary;
- open decisions register;
- durable session-context handoff;
- documentation index and authority order;
- documentation verification, closure, and traceability reports;
- fail-closed sanitized source-migration issue;
- implementation issues for all six initial build slices;
- Product and ICP, Signals Inbox, Campaigns and Studio, and Public Repository Growth user guides;
- MythologIQ Labs proprietary license.

### Foundational accepted decisions

- local-first workspace authority;
- provider-neutral capability adapters;
- product truth and claims-ledger authority;
- evidence provenance and explicit partial failure;
- named human approval for externally consequential action;
- marketability-loop authority with Event Intelligence as a bounded subsystem;
- ICP hypotheses and validation belong to Product Core and cannot be silently rewritten by downstream contexts.

### Initial build issue coverage

| Slice | Issue |
|---|---|
| Sanitized event foundation and migration | #1 |
| Product Truth, ICP Discovery, and Marketability Assessment | #2 |
| Signals Inbox with event and repository evidence | #5 |
| Campaign Brief and Canonical Asset | #6 |
| Public Repository Growth and Launch | #3 |
| ViMax production-package prototype | #4 |
| Calendar, Manual Activation, Outcome Capture, and Learning | #7 |

## Implemented runtime foundation

- product-generic event candidates with provenance;
- explicit source outcomes that distinguish verified empty from failure;
- public ICS event-source adapter;
- deterministic scoring with recorded reasons;
- partial-failure-aware collection and deduplication;
- local atomic JSON persistence;
- named human approval primitive;
- enforced Product Core ICP mutation boundary;
- independent Tauri 2 desktop shell with Viable identity;
- strict TypeScript, Node, Rust, desktop, secret-scan, and Debian package validation;
- granular CI steps with retained desktop-typecheck diagnostics on failure;
- local Product Core workspace and product-truth revisions;
- claims and evidence review with generated-suggestion separation;
- canonical ICP hypotheses, roles, dimensions, disqualifiers, contradictions, comparison, review, selection, revision history, and validation experiments;
- explained marketability findings and owned readiness actions;
- Home and Product desktop workflow with loading, empty, local/offline, stale, contradiction, error, and recovery states;
- keyboard-focus, semantic, scalable-text, reduced-motion, responsive, and non-color status contracts;
- provider-neutral signal, source registration, source-health, provenance, relationship, and conversion contracts;
- Event Intelligence signal import preserving partial and failed outcomes;
- public unauthenticated GitHub repository metadata and sampled-activity evidence;
- strict manual JSON signal import;
- named signal review, deduplication, save, tag, assignment, relationship, and proposed-work conversion;
- Signals and Market desktop workflow with evidence drawer and explicit failure states;
- Product Core-traceable campaign briefs with one primary outcome and audience;
- separate canonical assets and LinkedIn, website, and GitHub release variants;
- named review, changes-requested, rejection, approval, and approval-invalidation transitions;
- canonical version history, comments, rights, accessibility, disclosure, and claim-impact detection;
- local Campaigns and Studio navigation and browser-profile campaign workspace persistence;
- evidence-backed Product Core claim proposal and named approval inside the campaign prerequisite journey;
- selected-ICP and deliberate test-audience campaign creation with synchronized evidence defaults;
- campaign, asset, and channel-variant review queues with explicit blocked, empty, offline, error, and recovery presentation;
- channel comparison across LinkedIn, website, and GitHub release variants;
- downloadable campaign export manifests that explicitly remain unapproved for publishing and undelivered;
- bounded public GitHub repository-growth import covering repository metadata, README, community profile, selected trust files, releases, downloads, and contributor sampling;
- explicit observed, verified-zero, unavailable, and not-collected repository metric states;
- deterministic repository readiness assessment across twelve documented dimensions with evidence, confidence, impact, effort, recommendation, owner, and verification;
- prioritized owned repository-growth actions;
- Product-integrated repository-growth desktop workflow rather than a disconnected top-level tool;
- repository launch rooms linked to approved campaigns, canonical assets, and LinkedIn, website, and GitHub release variants;
- Product Core claim and evidence revalidation at launch-room and export time;
- release checklist, maintainer coverage, observation window, and baseline capture;
- credential-free manual repository launch manifests that remain unapproved for publishing and undelivered;
- retrospective comparisons that calculate deltas only for compatible numeric evidence states.

The migration excluded external organization content, branding, governance, destinations, accounts, prompts, logs, reports, confidential fixtures, and secret-bearing material. Source-repository names remain only where required for migration provenance and exclusion evidence.

Event Intelligence enters through its bounded context and shared evidence contracts. It does not redefine the top-level Viable product model or mutate canonical ICP state.

## Designed but not implemented

- social and search source adapters;
- authenticated GitHub traffic, referral, clone, dependent, integration, private-repository, and write-operation adapters;
- broader content and creative studio asset families;
- website, SEO, AEO, and conversion analysis;
- destination-bound approval and external-action execution state machine;
- approved social publishing;
- lead and organization records;
- sales enablement;
- video production workflow and ViMax adapter;
- general measurement, attribution, experiments, ICP confidence feedback, and learning ledger beyond the bounded repository retrospective;
- local worker management;
- hosted synchronization or multi-user collaboration.

## External integration status

| Integration area | Status |
|---|---|
| Event sources | Public ICS implemented and validated; additional adapters not implemented |
| GitHub public repository evidence | Bounded public metadata, README, community, release, contributor, readiness, launch-room, manual-export, baseline, and retrospective workflow implemented and validated; authenticated traffic and write adapters not implemented |
| LinkedIn | Local campaign and repository-launch variant and manual export implemented; provider feasibility and adapter not implemented |
| Facebook and Instagram | Feasibility and adapters not implemented |
| X | Feasibility and adapter not implemented |
| TikTok and YouTube | Feasibility and adapters not implemented |
| Website CMS | Local website variant and manual export implemented; CMS adapter not implemented |
| GitHub release publishing | Local release variant and manual export implemented; publishing adapter not implemented |
| Search Console and general analytics | Not implemented |
| CRM and lead capture | Not implemented |
| ViMax | Candidate assessed; adapter not implemented |

All platform capabilities, pricing, permissions, scopes, review requirements, and data-handling terms must be verified again when implementation begins.

## Documentation conformance

The documentation baseline passes structural review for:

- formal product requirements;
- first-class ICP discovery and validation requirements;
- durable architecture decisions;
- full product architecture;
- ICP domain authority and lifecycle;
- outcome-based roadmap sequencing;
- experience design coverage;
- issue traceability for the six initial build slices;
- ownership and source-migration boundaries;
- explicit unresolved-decision tracking;
- safe session restart context;
- honest implementation-state separation.

Remaining work concerns product decisions, schemas, implementation, validation, operations, security, privacy, packaging, user research, ICP validation evidence, and usability evidence rather than missing baseline documentation structure.

## Immediate next milestones

1. Complete hands-on accessibility and unfamiliar-founder acceptance for issue #2, then remediate any evidenced gaps.
2. Complete hands-on accessibility and unfamiliar-user acceptance for issue #5, then remediate evidenced gaps.
3. Complete hands-on accessibility and unfamiliar-user acceptance for issue #6, then remediate evidenced gaps.
4. Complete hands-on accessibility and unfamiliar-maintainer acceptance for issue #3, then remediate evidenced gaps.
5. Prototype the ViMax production-package boundary under issue #4.
6. Implement Calendar, Manual Activation, broader Outcome Capture, and Learning under issue #7 before direct publishing adapters.
7. Add signing and cross-platform installer validation before end-user release.

## Release posture

Viable is not ready for an end-user product release.

The repository may be used for product design, architecture, implementation planning, and controlled development. A public or commercial release requires working code, deterministic and native validation, security and privacy review, sanitized assets, tested backup and restore, user and operator documentation, installer validation, validated ICP workflow behavior, hands-on accessibility review, and unfamiliar-user acceptance testing.
