# Viable Current State

## Document control

| Field | Value |
|---|---|
| Status | Authoritative implementation-status record |
| Last reviewed | 2026-07-15 |
| Product requirements | `docs/product/PRD.md` |
| Architecture | `docs/architecture/viable-platform.md` |
| ADRs | `docs/adr/README.md` |
| Verification report | `docs/reviews/documentation-verification-2026-07-15.md` |

## Summary

Viable is currently in the product-definition and repository-foundation stage.

The formal PRD, accepted foundational ADRs, marketability operating model, full platform architectural design, product roadmap, experience design roadmap, open-source repository growth model, ViMax integration assessment, initial build sequence, and documentation verification are present.

The sanitized Event Radar product-code migration is not yet complete. No claim should imply that the full event application, desktop shell, social research runtime, outreach workflow, publishing adapters, video generation, lead management, or analytics system is operational in this repository until the corresponding code and validation exist here.

## Implemented in this repository

### Product and architecture documentation

- Platinum-grade product README foundation;
- formal Product Requirements Document with requirement IDs, MVP, quality attributes, metrics, and release gates;
- product scope;
- marketability operating model;
- accepted foundational ADR set and ADR template;
- complete platform architectural design;
- phased product roadmap;
- experience design roadmap;
- initial build sequence;
- open-source repository growth model;
- ViMax integration assessment;
- research, content, and outreach safety boundaries;
- documentation index and authority order;
- documentation verification and traceability report;
- fail-closed sanitized source-migration issue;
- MythologIQ Labs proprietary license.

### Foundational accepted decisions

- local-first workspace authority;
- provider-neutral capability adapters;
- product truth and claims ledger authority;
- evidence provenance and explicit partial failure;
- named human approval for externally consequential action;
- marketability-loop authority with Event Intelligence as a bounded subsystem.

## In migration

- reusable product-generic event discovery code;
- generic event-provider adapters;
- local event normalization and scoring;
- native desktop foundation;
- generic tests and schemas;
- installer and package validation.

The migration must exclude external organization content, branding, governance, licensing statements, destinations, accounts, prompts, logs, reports, confidential fixtures, and all secret-bearing material.

Imported event code must enter through the Event Intelligence bounded context and shared evidence contracts. It must not redefine the top-level Viable product model.

## Designed but not implemented

- product truth workspace;
- marketability assessment;
- claims and proof ledger;
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
- measurement, attribution, experiments, and learning ledger;
- complete Viable desktop navigation and user experience;
- local worker management;
- hosted synchronization or multi-user collaboration.

## External integration status

| Integration area | Status |
|---|---|
| Event sources | Product-generic code pending sanitized migration |
| GitHub public repository analysis | Designed; not implemented |
| LinkedIn | Feasibility and adapter not implemented |
| Facebook and Instagram | Feasibility and adapters not implemented |
| X | Feasibility and adapter not implemented |
| TikTok and YouTube | Feasibility and adapters not implemented |
| Website CMS | Not implemented |
| Search Console and analytics | Not implemented |
| CRM and lead capture | Not implemented |
| ViMax | Candidate assessed; adapter not implemented |

All platform capabilities, pricing, permissions, scopes, and review requirements must be verified again when implementation begins.

## Documentation conformance

The documentation baseline now passes structural review for:

- formal product requirements;
- durable architecture decisions;
- full product architecture;
- outcome-based roadmap sequencing;
- experience design coverage;
- honest implementation-state separation.

Remaining traceability gaps are primarily in the implementation backlog. Dedicated issues are still needed for the Signals slice, Campaign and Canonical Asset slice, and Calendar, Manual Activation, and Outcome Capture slice.

## Immediate next milestones

1. Review and merge the documentation-baseline pull request.
2. Complete the sanitized Event Radar code migration under issue #1.
3. Restore independent CI and package validation in Viable.
4. Rebrand the native desktop and installer identity.
5. Implement the Product Truth and Marketability Assessment vertical slice under issue #2.
6. Create and implement the Signals Inbox vertical-slice issue.
7. Create and implement the Campaign Brief and Canonical Asset vertical-slice issue.
8. Implement the Public Repository Growth and Launch vertical slice under issue #3.
9. Prototype the ViMax production-package boundary under issue #4 after campaign and asset authority exists.
10. Implement manual activation, outcome capture, retrospective, and learning before direct publishing adapters.

## Release posture

Viable is not ready for an end-user product release.

The repository may be used for product design, architecture, implementation planning, and controlled development. A public or commercial release requires working code, deterministic and native validation, security and privacy review, sanitized assets, tested backup and restore, user and operator documentation, installer validation, and unfamiliar-user acceptance testing.
