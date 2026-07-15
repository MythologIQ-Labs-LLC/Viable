# Viable Current State

## Document control

| Field | Value |
|---|---|
| Status | Authoritative implementation-status record |
| Last reviewed | 2026-07-15 |
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

Viable is currently in the initial implementation-foundation stage.

The formal product and architecture baseline is established on `main`. The first sanitized Event Intelligence runtime and independent native Viable shell are implemented and independently validated.

The initial sanitized Event Radar capability migration is complete. It includes a bounded Event Intelligence core, one public ICS adapter, local persistence, deterministic scoring, an independent Viable desktop shell, and Linux package validation. No claim should imply that the Product Core ICP workflow, complete event application, additional source adapters, full desktop experience, outreach, publishing, video generation, lead management, sales, or analytics systems are operational until their code and validation exist here.

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
- strict TypeScript, Node, Rust, desktop, secret-scan, and Debian package validation.

The migration excluded external organization content, branding, governance, destinations, accounts, prompts, logs, reports, confidential fixtures, and secret-bearing material. Source-repository names remain only where required for migration provenance and exclusion evidence.

Event Intelligence enters through its bounded context and shared evidence contracts. It does not redefine the top-level Viable product model or mutate canonical ICP state.

## Designed but not implemented

- product workspace;
- product truth and claims-ledger runtime;
- ICP hypothesis, comparison, selection, validation, revision, and impact-analysis workflow;
- marketability assessment;
- market and research inbox;
- social and search source adapters;
- public repository assessment and launch room;
- campaign planning;
- canonical assets and channel variants;
- content and creative studio;
- website, SEO, AEO, and conversion analysis;
- approval and external-action state machine;
- approved social publishing;
- lead and organization records;
- sales enablement;
- video production workflow and ViMax adapter;
- measurement, attribution, experiments, ICP confidence feedback, and learning ledger;
- complete Viable desktop navigation and user experience;
- local worker management;
- hosted synchronization or multi-user collaboration.

## External integration status

| Integration area | Status |
|---|---|
| Event sources | Public ICS implemented and validated; additional adapters not implemented |
| GitHub public repository analysis | Designed; not implemented |
| LinkedIn | Feasibility and adapter not implemented |
| Facebook and Instagram | Feasibility and adapters not implemented |
| X | Feasibility and adapter not implemented |
| TikTok and YouTube | Feasibility and adapters not implemented |
| Website CMS | Not implemented |
| Search Console and analytics | Not implemented |
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

1. Implement Product Truth, ICP Discovery, and Marketability Assessment under issue #2.
2. Implement Signals Inbox under issue #5.
3. Implement Campaign Brief and Canonical Asset under issue #6.
4. Implement Public Repository Growth and Launch under issue #3.
5. Prototype the ViMax production-package boundary under issue #4 after campaign and asset authority exists.
6. Implement Calendar, Manual Activation, Outcome Capture, and Learning under issue #7 before direct publishing adapters.
7. Add signing and cross-platform installer validation before end-user release.

## Release posture

Viable is not ready for an end-user product release.

The repository may be used for product design, architecture, implementation planning, and controlled development. A public or commercial release requires working code, deterministic and native validation, security and privacy review, sanitized assets, tested backup and restore, user and operator documentation, installer validation, validated ICP workflow behavior, and unfamiliar-user acceptance testing.
