# Viable Platform Architectural Design

## Document control

| Field | Value |
|---|---|
| Status | Approved architecture baseline; implementation incomplete |
| Version | 1.0 |
| Last reviewed | 2026-07-16 |
| Product requirements | `docs/product/PRD.md` |
| Architecture decisions | `docs/adr/README.md` |
| Current state | `docs/status/current-state.md` |

This document describes the intended architecture. The current-state document remains authoritative for what is actually implemented and validated.

## 1. Purpose

Viable is a local-first marketability operating system that connects product truth, canonical ICP hypotheses, market evidence, campaigns, content, website readiness, public repository growth, approved distribution, leads, sales support, and measurable learning.

The architecture must support the complete marketability loop:

```text
Establish product truth
  -> identify and validate the proper ICP
  -> assess marketability
  -> understand the market
  -> choose positioning and offers
  -> create useful assets
  -> distribute with approval
  -> capture and qualify demand
  -> support sales conversations
  -> measure outcomes
  -> improve the product and message
```

Event discovery is one bounded signal subsystem. External platforms are adapters. Neither defines the top-level product architecture.

## 2. Architectural goals

1. Keep product truth, claims, and canonical ICP hypotheses authoritative across all generated work.
2. Preserve evidence provenance and visible uncertainty.
3. Keep the base product useful without hosted Viable infrastructure, an LLM, or every platform API.
4. Require human approval for externally consequential action.
5. Make source, delivery, and measurement failures explicit.
6. Isolate credentials from repository content, prompts, reports, logs, and exports.
7. Allow providers and production tools to be replaced without rewriting the domain model.
8. Support backup, recovery, export, and future schema evolution.
9. Keep accessibility and unfamiliar-user operation as release requirements.
10. Preserve an honest separation between designed, implemented, validated, and externally dependent behavior.

## 3. Quality attributes

| Attribute | Architectural response |
|---|---|
| Explainability | Evidence, confidence, freshness, claim state, attribution model, and recommendation rationale are persisted relationships. |
| Reliability | Operations use explicit success, empty, partial, unsupported, authorization, rate-limit, validation, transport, cancellation, and failure states. |
| Privacy | Local authority, minimal collection, consent records, retention, deletion, and export controls. |
| Security | OS credential vault, untrusted-provider isolation, bounded adapters, redacted diagnostics, and approval enforcement. |
| Portability | Manual imports, exports, production packages, backup, restore, and provider-neutral contracts. |
| Extensibility | Capability-specific ports and versioned adapter manifests. |
| Accessibility | Semantic desktop UI, keyboard operation, scalable text, reduced motion, captions, and non-color status. |
| Testability | Deterministic domain services, explicit state machines, contract tests, and prohibited-transition tests. |
| Maintainability | PRD, ADR, architecture, roadmap, status, and implementation traceability. |

## 4. System context

```text
Users and reviewers
  -> Viable desktop workspace
       -> Local workspace database and files
       -> Operating-system credential vault
       -> Supported public or authorized research sources
       -> Optional model and production runtimes
       -> Optional publishing, email, CMS, CRM, and analytics providers
       -> Manual import and export paths
```

### External actors

- founder, product owner, product lead, marketer, maintainer, seller, reviewer, or administrator;
- event, search, social, website, repository, competitor, analytics, CRM, CMS, email, design, and video providers;
- local model CLIs or workers;
- optional future hosted synchronization or managed execution services.

### System boundary

Viable owns product and operational records. External providers own their accounts, APIs, platform records, delivery systems, and availability.

## 5. Deployment profiles

### 5.1 Standalone desktop profile

The first authoritative profile is a native desktop application with:

- Tauri desktop shell;
- local application services;
- local persisted workspace;
- OS credential-vault integration;
- optional bundled or separately managed runtime processes;
- direct supported provider access;
- local reports, exports, backups, and diagnostics.

No Viable-hosted account is required for the base profile.

### 5.2 Desktop plus local worker profile

Optional workloads such as video production, site crawling, local models, or long-running imports may use a separately versioned local worker.

The worker must expose:

- version and health contract;
- declared capabilities;
- bounded job submission and cancellation;
- structured progress and failure state;
- temporary working-directory isolation;
- redacted logs and artifact manifests;
- no direct authority to approve or publish.

### 5.3 Future hosted collaboration profile

A hosted synchronization, collaboration, or managed-execution service is not part of the current baseline. It requires a new ADR covering:

- account and organization identity;
- local-versus-hosted authority;
- synchronization and conflict resolution;
- encryption and key management;
- tenant isolation;
- retention and deletion;
- offline and recovery behavior;
- billing and service availability.

## 6. Container view

```text
Viable Desktop
  |
  +-- Presentation Layer
  |     +-- Home, Product, Market, Signals, Campaigns, Studio
  |     +-- Calendar, Leads, Sales, Analytics, Integrations, Settings
  |
  +-- Application Layer
  |     +-- Use-case orchestration
  |     +-- Review and approval enforcement
  |     +-- Jobs, scheduling, import, export, backup, and recovery
  |
  +-- Domain Layer
  |     +-- Product Core
  |     +-- Evidence and Signals
  |     +-- Marketability Assessment
  |     +-- Campaigns and Assets
  |     +-- Approval and External Action
  |     +-- Relationships and Sales
  |     +-- Measurement and Learning
  |     +-- Event Intelligence bounded context
  |
  +-- Adapter Layer
  |     +-- Research sources
  |     +-- Publishing and delivery
  |     +-- Analytics and search imports
  |     +-- CMS and CRM synchronization
  |     +-- Model and video production tools
  |     +-- File import and export
  |
  +-- Infrastructure Layer
        +-- Workspace persistence
        +-- OS credential vault
        +-- Scheduler and job runner
        +-- Backup, restore, diagnostics, and update support
```

## 7. Bounded contexts

### 7.1 Product Core

Owns:

- product workspace and lifecycle state;
- capabilities and limitations;
- audiences and buying roles;
- canonical ICP hypotheses, validation, revisions, disqualifiers, and history;
- positioning, category, alternatives, and differentiation;
- pricing, packaging, offers, and calls to action;
- claims, proof, terminology, and brand constraints;
- asset inventory and product-readiness relationships.

Product Core is authoritative for downstream generated work. See ADR-0003.

### 7.2 Evidence and Signals

Owns:

- source registry and capability state;
- evidence provenance;
- normalized signals;
- topics, questions, objections, opportunities, and related entities;
- retrieval operations, freshness, confidence, and partial failure;
- research inbox state and conversion into work.

Provider content is untrusted data. It cannot direct tools, credentials, prompts, or runtime behavior.

Implementation status: the first internal Signals Inbox is implemented through PR #13 with provider-neutral contracts, bounded Event Intelligence import, public unauthenticated GitHub repository evidence, strict manual import, source health, review, relationships, and conversion to proposed owned work. Campaign, lead, publishing, and canonical ICP mutation authority are not granted by this implementation.

### 7.3 Marketability Assessment

Owns:

- assessment dimensions;
- evidence-to-dimension relationships;
- score ranges and confidence;
- gaps, contradictions, assumptions, and recommendations;
- owners, effort, impact, dependencies, and verification;
- assessment history and trend.

It cannot bypass Product Core claim state or conceal missing evidence.

### 7.4 Campaigns and Assets

Owns:

- campaign objective, audience, trigger, offer, message, proof, call to action, channel plan, owner, and measures;
- campaign dependencies and asset matrix;
- canonical content and platform variants;
- website, article, social, email, sales, image, carousel, and video-package records;
- version history, comments, rights, accessibility, and review state.

Canonical assets are separate from channel payloads.

Implementation status: PR #16 implements the first guarded Campaigns and Assets domain foundation. PR #18 connects that authority to local Campaigns and Studio desktop workflows with evidence-backed Product Core claim prerequisites, selected-ICP or deliberate test-audience campaign creation, named review queues, canonical asset versioning, separate LinkedIn, website, and GitHub release variants, channel comparison, Product Core claim-impact invalidation, explicit failure and recovery presentation, and downloadable manual export manifests. Those manifests remain explicitly unapproved for publishing and undelivered. Hands-on accessibility and unfamiliar-user acceptance remain open, and destination-bound publishing or delivery adapters are not implemented.

### 7.5 Approval and External Action

Owns:

- review requests and decisions;
- approver identity and time;
- approved content or asset version;
- destination and audience binding;
- scheduling and execution intent;
- delivery, publication, cancellation, failure, and recovery evidence.

Generators, schedulers, and adapters cannot approve their own output. See ADR-0005.

### 7.6 Relationships and Sales

Owns:

- people, organizations, relationships, and opportunities;
- evidence-backed identity confidence and deduplication;
- source, consent, suppression, unsubscribe, do-not-contact, retention, and deletion state;
- qualification, lifecycle, owner, and next action;
- account briefs, meeting preparation, objections, follow-up, proposals, and outcomes.

An audience signal is not automatically a lead.

### 7.7 Measurement and Learning

Owns:

- metric definitions and imports;
- campaign, asset, channel, audience, offer, experiment, lead, opportunity, and product-change relationships;
- attribution models and uncertainty;
- baselines, observation windows, benchmarks, and experiments;
- campaign and launch retrospectives;
- learning ledger entries and follow-up decisions.

Missing data is not zero. Attribution is never presented without its model and limitations.

### 7.8 Event Intelligence

Owns only event-specific concerns:

- canonical events and occurrences;
- recurrence, cancellation, and timezone normalization;
- event sources and subscriptions;
- event-specific relevance evaluation;
- event calendars, collections, and reports;
- conversion of event evidence into shared signals and opportunities.

Event Intelligence connects through an anti-corruption boundary and does not own global product, campaign, approval, lead, or measurement models. See ADR-0006.

## 8. Context map

```text
Product Core
   | supplies approved truth and claims
   v
Marketability Assessment <---- Evidence and Signals ---- Event Intelligence
   |                                 |
   | priorities                      | opportunities
   v                                 v
Campaigns and Assets ----------> Approval and External Action
   |                                 |
   | engagement context              | delivery evidence
   v                                 v
Relationships and Sales ------> Measurement and Learning
   ^                                 |
   +----------- product feedback ----+
```

All cross-context integration uses stable identifiers and application services. Contexts do not write directly into each other's persistence structures.

## 9. Canonical data model

### 9.1 Core identities

- `WorkspaceId`
- `ProductId`
- `EvidenceId`
- `SignalId`
- `AudienceId`
- `IcpHypothesisId`
- `IcpHypothesisVersionId`
- `IcpCandidateComparisonId`
- `IcpRevisionId`
- `IcpValidationExperimentId`
- `ClaimId`
- `ProofId`
- `AssessmentId`
- `RecommendationId`
- `CampaignId`
- `AssetId`
- `AssetVersionId`
- `ApprovalId`
- `DestinationId`
- `OperationId`
- `PersonId`
- `OrganizationId`
- `OpportunityId`
- `ExperimentId`
- `MetricObservationId`
- `LearningEntryId`

Provider identifiers are adapter references and evidence, not canonical identity by themselves.

### 9.2 Evidence model

Evidence records include:

- source and source capability;
- provider or original reference;
- capture time and observed time;
- authorization mode;
- raw-artifact reference when permitted;
- normalized representation and schema version;
- freshness, confidence, and limitations;
- related records;
- retention and deletion classification.

### 9.3 Operation-result model

Operations use a normalized result envelope:

```text
OperationResult
  -> status
  -> started_at / completed_at
  -> source or destination
  -> result references
  -> failure class
  -> retryability
  -> rate-limit or authorization detail
  -> correlation identifier
  -> redacted diagnostic reference
```

Accepted statuses include verified-empty, partial, unsupported, unauthorized, forbidden, rate-limited, unavailable, validation-failed, transport-failed, cancelled, and successful.

### 9.4 Approval model

Approval binds:

- exact asset version;
- product and campaign;
- claims and evidence;
- destination and audience;
- rights, consent, disclosures, and accessibility state;
- approving human and timestamp.

Material changes invalidate approval.

## 10. Key application flows

### 10.1 Product assessment

```text
Create or import product
  -> establish capabilities and limitations
  -> define audiences, positioning, offer, and claims
  -> attach proof and evidence
  -> evaluate marketability dimensions
  -> expose gaps, confidence, and contradictions
  -> create owned actions
```

### 10.2 Research and signal triage

```text
Schedule or start source operation
  -> adapter retrieves supported evidence
  -> normalize and preserve provenance
  -> record per-source success or failure
  -> deduplicate and relate signals
  -> user accepts, dismisses, saves, tags, assigns, or converts
```

### 10.3 Campaign and asset creation

```text
Approved product truth + accepted evidence
  -> campaign brief
  -> canonical content brief
  -> asset and channel variants
  -> claim, evidence, brand, rights, and accessibility checks
  -> human review
```

### 10.4 External publication or outreach

```text
Approved asset version
  -> bind destination and audience
  -> preflight credential and capability health
  -> schedule or execute adapter
  -> record provider response and delivery state
  -> preserve failure and recovery path
  -> import outcome metrics
```

### 10.5 Video production

```text
Approved campaign and script
  -> provider-neutral production package
  -> manual tool or optional worker adapter
  -> progress and artifact manifest
  -> render review
  -> human approval
  -> platform variants and calendar
```

Render completion never equals approval.

### 10.6 Learning loop

```text
Metric observations + lead and sales outcomes
  -> attribution model with uncertainty
  -> retrospective or experiment decision
  -> learning ledger
  -> product truth, assessment, campaign, or roadmap update
```

## 11. Adapter architecture

Adapter categories are capability-specific:

- event and research sources;
- website and content retrieval;
- search and analytics imports;
- public repository imports;
- social research;
- publishing and media delivery;
- email and outreach delivery;
- CMS synchronization;
- CRM synchronization;
- design and video production;
- model providers and local runtimes;
- storage and export.

Each adapter manifest declares:

- adapter and contract version;
- supported read and write capabilities;
- authorization type and required scopes;
- account and destination identity behavior;
- rate limits, cost notes, and provider restrictions;
- data retention and provider-use notes;
- health and last-success state;
- known limitations;
- manual fallback.

Adapters shall be unable to mutate canonical records outside their application-service boundary.

## 12. Persistence architecture

### 12.1 Workspace database

The target default is a transactional local database suitable for:

- canonical domain records;
- relational provenance and traceability;
- version history and state machines;
- job and operation state;
- schema migration and backup verification.

SQLite remains the expected standalone implementation unless superseded by ADR.

### 12.2 Workspace files

Large or portable artifacts may use a managed workspace file area:

- imported source documents;
- screenshots and approved media;
- production packages and manifests;
- generated reports and exports;
- redacted diagnostic bundles.

File references include checksum, media type, size, origin, rights classification, and retention state.

### 12.3 Credential storage

Secrets use the operating-system vault. Persisted configuration stores only opaque credential references and non-secret capability metadata.

### 12.4 Backup and restore

Backups include workspace records and permitted files but exclude secrets. Backup manifests include version, schema, checksums, creation time, and validation result. Restore must be transactional or rollback-safe.

## 13. Scheduling and jobs

The scheduler coordinates local work such as source refreshes, exports, reports, reminders, and approved delivery.

Jobs require:

- stable identifier and correlation ID;
- declared capability and owner;
- bounded inputs;
- cancellation support where feasible;
- progress and stage state;
- retry policy based on failure class;
- durable outcome and diagnostic reference;
- startup recovery for interrupted work.

A schedule grants timing intent, not approval authority.

## 14. Security and privacy architecture

### Trust boundaries

1. Provider content is untrusted input.
2. Generated model output is untrusted draft content.
3. Adapters are constrained infrastructure, not domain authorities.
4. Credentials are isolated from normal application data.
5. External actions require approved immutable versions.
6. Imported contacts and social evidence require consent, retention, and targeting constraints.

### Required controls

- input size, type, URL, and scheme validation;
- provider-content isolation from tool instructions;
- explicit authorization scopes;
- secret redaction and scanning;
- least-privilege credential references;
- rights, consent, suppression, and do-not-contact enforcement;
- destination identity verification;
- local audit-friendly history without claiming compliance-control authority;
- safe export that excludes secrets and private material by default;
- deletion workflows that address related evidence and artifacts.

## 15. Observability and diagnostics

The standalone product requires user-facing operational observability:

- source and destination health;
- last attempt and last success;
- job progress and failure class;
- authorization and rate-limit state;
- scheduler status;
- database, backup, restore, and worker health;
- adapter and schema versions;
- redacted diagnostic export.

Logs are supporting diagnostics, not the only record of failure. Material state belongs in the workspace database.

## 16. Failure and recovery model

The architecture must handle:

- expired or revoked authorization;
- permission and app-review limitations;
- rate limiting;
- provider outages;
- schema or parser drift;
- duplicate provider results;
- partial multi-source success;
- rejected or partially delivered publications;
- interrupted local workers;
- corrupt configuration or database migration;
- failed backup or restore;
- missing metrics and delayed attribution.

Recovery behavior must be visible and must not rewrite failure as success.

## 17. Accessibility architecture

Accessibility is not confined to visual styling.

The application architecture must support:

- semantic names, roles, states, and announcements;
- complete keyboard operation;
- visible focus and non-color status;
- scalable typography and reflow;
- reduced motion;
- captions, transcripts, alt text, and media metadata;
- simplified and high-density presentation modes;
- persistent accessibility preferences;
- automated and unfamiliar-user acceptance tests.

## 18. Technology direction

The expected implementation direction is:

- Tauri 2 native desktop shell;
- Rust for native lifecycle, secure IPC, vault access, file and process boundaries;
- TypeScript and Node.js for domain and application services where appropriate;
- SQLite for standalone transactional persistence;
- versioned JSON Schema or equivalent contracts for import, export, jobs, and adapters;
- optional Python or external local workers only behind explicit job contracts;
- provider SDKs confined to adapters.

Technology choices are not claims of current implementation. Changes that affect authority, persistence, trust, deployment, or compatibility require ADR review.

## 19. Architecture invariants

1. Product truth, claims, and canonical ICP hypotheses govern downstream work.
2. ICP hypotheses belong to Product Core and downstream contexts cannot silently rewrite them.
3. Local workspace data is authoritative by default.
4. Provider content is evidence and untrusted data.
5. Provider identifiers do not become canonical identity without reconciliation.
6. Source failure cannot become empty success.
7. Missing metrics cannot become zero.
8. Canonical assets remain separate from channel payloads.
9. External action requires named human approval.
10. Adapters and generators cannot approve their own output.
11. Credentials do not enter repository files, prompts, reports, diagnostics, or exports.
12. Manual paths remain available for core workflows when integrations are unavailable.
13. Event intelligence remains a bounded signal subsystem.
14. Render completion is not asset approval.
15. Attribution states its model and uncertainty.
16. Current-state documentation remains honest about implementation maturity.

## 20. Architecture evolution gates

Before adding a major subsystem or integration:

- map it to PRD requirements;
- confirm bounded-context ownership;
- determine whether an ADR is required;
- define capability and failure contracts;
- identify credential, consent, retention, deletion, and rights implications;
- preserve manual fallback where practical;
- define tests for prohibited transitions;
- update architecture, roadmap, current state, README, and user documentation;
- validate the primary journey with an unfamiliar user.

## 21. Related decisions

- [ADR-0001: Local-first workspace authority](../adr/0001-local-first-authority.md)
- [ADR-0002: Provider-neutral capability adapters](../adr/0002-provider-neutral-adapters.md)
- [ADR-0003: Product truth and claims ledger authority](../adr/0003-product-truth-and-claims.md)
- [ADR-0004: Evidence provenance and explicit partial failure](../adr/0004-evidence-provenance-and-partial-failure.md)
- [ADR-0005: Human approval for externally consequential action](../adr/0005-human-approval-for-external-action.md)
- [ADR-0006: Marketability loop and event-intelligence boundary](../adr/0006-marketability-loop-and-event-boundary.md)
- [ADR-0007: ICP hypotheses and validation authority](../adr/0007-icp-hypothesis-and-validation-authority.md)

## 22. Implementation status

The architecture is broader than the current repository implementation. `docs/status/current-state.md` is authoritative for implemented, automatedly validated, human-accepted, designed, and external capabilities. No architecture section should be interpreted as proof that its runtime exists or has completed human acceptance.
