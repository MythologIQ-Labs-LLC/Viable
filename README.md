<!-- markdownlint-disable MD033 MD041 -->
<div align="center">

# Viable

### A local-first marketability operating system for products, public repositories, founders, and small teams

[![Status: Internal Slice 6](https://img.shields.io/badge/Status-internal_slice_6-2ea043)](#current-state)
[![Approach: Local first](https://img.shields.io/badge/Approach-local_first-8957e5)](#product-principles)
[![ICP: Evidence based](https://img.shields.io/badge/ICP-evidence_based-0b7285)](#identify-the-proper-icp)
[![Approval: Named human](https://img.shields.io/badge/Approval-named_human-b42335)](docs/adr/0005-human-approval-for-external-action.md)
[![Activation: Manual evidence](https://img.shields.io/badge/Activation-manual_evidence-0b7285)](docs/architecture/activation-and-learning-domain.md)
[![License: Proprietary](https://img.shields.io/badge/License-proprietary_all_rights_reserved-b42335)](LICENSE)

</div>

> [!IMPORTANT]
> Viable is a MythologIQ Labs, LLC product created and led by Kevin R. Knapp. Internal workflows through Slice 6 are implemented and automatedly validated: Product Core and ICP, Signals, Campaigns and Studio, Public Repository Growth and Launch, provider-neutral Video Production, Calendar, manual activation, delivery and failure evidence, baseline and metric import, retrospectives, and the learning ledger. Direct publishing, connected analytics, actual ViMax execution, leads, sales, signed installers, hands-on accessibility acceptance, unfamiliar-user acceptance, and end-user release readiness remain incomplete.

Viable helps founders and product teams establish product truth, identify and validate the proper ideal customer profile, assess marketability, understand evidence, create governed campaigns and assets, improve public repository readiness, prepare reviewable video-production packages, schedule approved work, activate it manually, record what actually happened, and choose the next reversible action from explicit evidence.

It is not a social scheduler with an AI text box attached. It is not a repository score generator, a video generator, a CRM, or a collection of disconnected dashboards. Viable connects those concerns through one product, evidence, ICP, campaign, asset, approval, destination, outcome, and learning model.

## Marketability loop

```text
Establish product truth
  -> identify and validate the proper ICP
  -> assess marketability
  -> understand market and opportunity evidence
  -> choose positioning and offers
  -> create canonical assets
  -> adapt assets to channels and production formats
  -> assess product surfaces such as public repositories
  -> review and approve destination-bound external action
  -> schedule and activate manually or through supported adapters
  -> record delivery, failure, cancellation, or unknown outcomes
  -> compare explicit metric evidence against a baseline
  -> complete a retrospective
  -> choose one reversible next action
  -> refine product, ICP, message, offer, repository, asset, and channel plan
```

Event Intelligence is one bounded signal subsystem. Repository Growth is one Product-integrated surface workflow. Video Production is one Campaign-linked production workflow. Calendar and Analytics complete the first manual operating loop. None becomes the product center merely because it has an API, dashboard, or impressive dependency graph.

## Why Viable exists

Founders and small teams commonly manage marketability across:

- product documents;
- research notes;
- spreadsheets;
- event feeds;
- social tools;
- repository pages;
- content generators;
- design and video tools;
- calendars;
- analytics dashboards;
- CRM notes;
- unfinished campaign drafts.

The predictable results are:

- marketing begins before the team knows who the product is for;
- broad audiences are mistaken for an evidence-backed ICP;
- claims drift across websites, posts, releases, videos, and sales material;
- research loses provenance and freshness;
- missing access is converted into zero activity;
- repository attention is mistaken for adoption;
- render completion is mistaken for approval;
- schedule intent is mistaken for delivery;
- a downloaded package is mistaken for publication;
- human notes are presented as provider verification;
- activity is measured without learning whether it produced successful use, qualified demand, or product improvement.

Viable makes those relationships explicit, reviewable, and operable.

## Identify the proper ICP

Helping founders identify, compare, validate, select, and refine the proper ideal customer profile is a first-class product outcome.

The implemented Product Core workflow supports:

- multiple ICP hypotheses;
- users, economic buyers, decision-makers, approvers, influencers, champions, blockers, partners, maintainers, contributors, and disqualifiers;
- problem intensity and urgency;
- product fit and time to value;
- access and reachable channels;
- proof and evidence quality;
- adoption friction and buying constraints;
- commercial viability and retention potential;
- strategic fit;
- anti-ICP conditions;
- assumptions, contradictions, confidence, freshness, ownership, and review dates;
- validation experiments;
- selected, secondary, adjacent, rejected, and historical candidates;
- revision history and change conditions.

Viable does not declare an ICP proven because a model generated a polished persona, a repository earned stars, or a campaign received attention. Product Core owns canonical ICP hypotheses. Downstream workflows may contribute evidence and propose review, but they cannot silently rewrite the ICP.

See:

- [ICP discovery and validation](docs/product/icp-discovery-and-validation.md)
- [ADR-0007: ICP authority](docs/adr/0007-icp-hypothesis-and-validation-authority.md)
- [ICP domain architecture](docs/architecture/icp-domain.md)

## Implemented product capabilities

### Product truth and marketability assessment

- local product workspace;
- product capabilities, limitations, lifecycle, and supported environments;
- claims and reviewed evidence;
- generated-suggestion separation;
- positioning, alternatives, pricing, packaging, offers, and calls to action;
- ICP hypotheses and validation;
- explained marketability findings;
- owned readiness actions;
- Home and Product desktop workflow.

Approved claims require reviewed non-generated evidence.

### Signals and Market

- bounded Event Intelligence;
- public event and ICS evidence;
- public GitHub repository metadata and sampled activity;
- strict manual JSON signal import;
- provider-neutral source health;
- provenance, retrieval time, freshness, confidence, and limitations;
- named review;
- save, tag, assignment, relationship, and proposed-work conversion;
- explicit success, verified-empty, partial, unavailable, rate-limited, validation-failed, transport-failed, offline, and recovery states.

One broken source cannot masquerade as an empty market.

### Campaigns and Studio

- one primary campaign audience and outcome;
- selected ICP or deliberate test audience;
- objective, problem, trigger, offer, message hierarchy, proof, call to action, channels, owners, dependencies, and success measures;
- immutable references to approved Product Core claims and reviewed evidence;
- named campaign review;
- canonical assets with rights, accessibility, disclosures, comments, and version history;
- LinkedIn, website, and GitHub release variants;
- channel comparison;
- approval invalidation after material asset or Product Core changes;
- credential-free manual export manifests.

A generator cannot approve its own output. A manual export is not publishing and does not prove delivery.

See [Campaigns and Studio desktop workflow](docs/user/campaigns-and-studio.md).

### Public Repository Growth and Launch

- bounded public GitHub import;
- repository identity, description, homepage, topics, README, quick start, documentation, trust, community, release, and contributor evidence;
- observed, verified-zero, unavailable, and not-collected metric states;
- deterministic assessment across twelve readiness dimensions;
- evidence, confidence, impact, effort, recommendation, owner, and verification for every finding;
- prioritized owned growth plans;
- launch rooms linked to approved campaigns and assets;
- release checklists and maintainer coverage;
- observation windows and pre-launch baselines;
- credential-free manual launch packages;
- bounded retrospective comparison.

Repository ratings prioritize controllable readiness work. They do not predict GitHub Trending, virality, sales, or adoption.

See:

- [Open-source repository growth](docs/product/open-source-repository-growth.md)
- [Repository Growth domain architecture](docs/architecture/repository-growth-domain.md)
- [Repository Growth user guide](docs/user/repository-growth.md)

### Video Production in Studio

The implemented Stage 1 Video Production workflow supports:

- approved campaign-linked canonical script selection;
- exact source-script version, claim revision, and reviewed-evidence snapshot;
- video objective, audience, duration, platforms, and aspect ratios;
- visual style and prohibited elements;
- storyboard scenes and shot constraints;
- source-asset rights, consent, allowed use, prohibited use, disclosures, optional hash, and expiration;
- caption, audio-description, and accessibility requirements;
- user-selected LLM, image, and video provider plans;
- estimated cost, currency, and data-handling notes;
- named video-brief review;
- provider-neutral manual production package;
- pinned ViMax `v1.1.0`, revision `1f8f650`, Python 3.12+, MIT compatibility metadata;
- blank-credential Script2Video compatibility packet;
- upstream MIT notice obligations;
- completed, partial, failed, and cancelled run import;
- structured stages, failures, relative artifact paths, MIME types, sizes, SHA-256 values, source relationships, and redacted logs;
- completed renders entering Viable as draft artifacts;
- named render review;
- separately reviewed LinkedIn, Instagram Reels, YouTube Shorts, and website variants;
- current Product Core and Campaign authority revalidation at asynchronous boundaries.

The implemented adapter does not install or execute ViMax, invoke providers, store credentials, or claim cross-platform ViMax runtime testing.

Render completion is not approval. Approval is not scheduling, publishing, delivery, or measurement.

See:

- [Video Production domain architecture](docs/architecture/video-production-domain.md)
- [ViMax integration assessment](docs/integrations/vimax-video-generation.md)
- [Video Production user guide](docs/user/video-production.md)

### Calendar and Manual Activation

The implemented Calendar workflow supports:

- destination records with non-secret account references and explicit ownership confirmation;
- channels for LinkedIn, website, GitHub release, Instagram Reels, and YouTube Shorts;
- internal approval deadlines, event opportunities, experiments, and follow-ups;
- external actions sourced from approved Campaign variants, ready Repository Launch rooms, and approved Video variants;
- destination-channel filtering;
- exact source snapshots with claims, evidence, rights, accessibility, and disclosures;
- named destination-bound review;
- separate schedule and activation states;
- authority revalidation before review and export;
- credential-free manual packages with idempotency keys;
- explicit export-ready, downloaded, interrupted, and recovered states;
- delivered, failed, cancelled, and unknown outcomes;
- human-recorded, provider-evidence, and provider-verified classifications;
- source and destination authority invalidation.

Scheduling does not grant approval. Approval does not prove export. Export does not prove delivery.

Provider verification requires provider evidence. The current workflow is manual and does not connect to provider APIs.

### Analytics and Learning

The implemented Analytics workflow supports:

- measurement plans;
- baselines recorded before retrospective analysis;
- observation windows;
- observed, verified-zero, delayed, partial, unavailable, and not-collected metric states;
- manual, provider-export, and provider-API source classifications;
- complete, partial, delayed, unavailable, and failed imports;
- numeric comparison only for compatible evidence states;
- retrospectives with continue, iterate, stop, or inconclusive decisions;
- manual, first-touch, last-touch, influence, and unattributed labels;
- mandatory attribution uncertainty;
- advisory ICP-confidence and positioning effects;
- one reversible next action;
- traceable learning-ledger entries.

Missing evidence remains missing. Unavailable evidence does not become zero. Retrospectives cannot silently mutate Product Core or the canonical ICP.

See:

- [Calendar, Activation, Outcome, and Learning architecture](docs/architecture/activation-and-learning-domain.md)
- [Calendar, Manual Activation, Outcomes, and Learning user guide](docs/user/calendar-activation-and-learning.md)

## Product principles

1. **Local first.** Core product records, evidence, drafts, approvals, repository plans, video briefs, destinations, outcomes, and learning belong to the user's workspace.
2. **Product truth before content volume.** Viable never scales an unsupported claim.
3. **Evidence before action.** Recommendations and generated work retain their source, confidence, freshness, and limitations.
4. **Named human approval.** Research and generation accelerate judgment. They do not replace accountability.
5. **Provider-neutral core.** Platforms and production tools are adapters, not the product model.
6. **Supported access only.** Public or explicitly authorized interfaces are preferred over copied sessions and undocumented private endpoints.
7. **Partial failure is visible.** A missing source, rejected render, interrupted export, unavailable metric, or failed delivery remains visible.
8. **Canonical first, variant second.** Users approve the underlying meaning before adapting it to channels or formats.
9. **Manual fallback is a feature.** Core workflows remain useful when APIs are restricted, costly, unavailable, or undesirable.
10. **Simple normal use.** Ordinary work should not require configuration-file editing, cron expressions, or invented IDs.
11. **Accessible by default.** Keyboard operation, visible focus, semantic labels, scalable text, reduced motion, captions, and non-color status are release requirements.
12. **No fake growth.** Viable does not automate spam, fake stars, reciprocal rings, fabricated testimonials, or manufactured adoption.
13. **No secret sprawl.** Credentials do not enter briefs, packages, repository files, destinations, outcomes, metrics, logs, screenshots, or documentation fixtures.
14. **Measure useful outcomes.** Activity and schedule intent are evidence, not success by themselves.
15. **Record uncertainty.** Missing data, attribution uncertainty, and open decisions remain visible rather than being replaced by confident invention.

## Architecture

```text
Viable desktop workspace
  -> Product Core
       -> product truth and claims
       -> ICP hypotheses and validation
  -> Evidence and Signals
       -> events
       -> public repositories
  -> Marketability Assessment
  -> Campaigns and Assets
       -> canonical assets
       -> channel variants
  -> Repository Growth
       -> readiness assessment
       -> owned plan
       -> launch room
       -> manual export and bounded retrospective
  -> Video Production
       -> reviewed video brief
       -> manual production package
       -> imported artifacts
       -> render and platform-variant review
  -> Approval and External Action
       -> destination registry
       -> Calendar timing intent
       -> named destination-bound review
       -> manual activation package
       -> export handoff and recovery
       -> delivery and failure evidence
  -> Measurement and Learning
       -> baseline and observation window
       -> explicit metric evidence states
       -> retrospective
       -> learning ledger
  -> Relationships and Sales
  -> provider-neutral adapters and manual fallbacks
  -> local persistence, future credential vault, backup, restore, and diagnostics
```

Durable architecture:

- [Platform architecture](docs/architecture/viable-platform.md)
- [ICP domain architecture](docs/architecture/icp-domain.md)
- [Repository Growth domain architecture](docs/architecture/repository-growth-domain.md)
- [Video Production domain architecture](docs/architecture/video-production-domain.md)
- [Calendar, Activation, Outcome, and Learning architecture](docs/architecture/activation-and-learning-domain.md)
- [ADR index](docs/adr/README.md)

## Current state

Viable is in internal Slice 6.

| Area | Status |
|---|---|
| Product identity and positioning | Established |
| Platinum README | Synchronized through Slice 6 |
| PRD and foundational ADRs | Established |
| Product truth, ICP, and assessment | Implemented; human acceptance open |
| Signals and Market | Implemented; human acceptance open |
| Campaigns and canonical assets | Implemented; human acceptance open |
| Repository Growth and Launch | Implemented; human acceptance open |
| Video Production Stage 1 | Implemented; actual ViMax execution and human acceptance open |
| Calendar and manual activation | Implemented; human acceptance open |
| Delivery and failure evidence | Implemented for manual evidence; provider adapters not implemented |
| Analytics, retrospectives, and learning ledger | Implemented for manual import; connected providers not implemented |
| Direct publishing adapters | Not implemented |
| Leads and sales | Not implemented |
| Signed installers and external release | Not ready |

See [Current state](docs/status/current-state.md).

## Validation

Exact-head validation through PRs #26 and #27 included:

- repository secret scan;
- core TypeScript;
- desktop TypeScript;
- full deterministic Node test suite;
- Rust formatting;
- Rust tests;
- Tauri bundle construction;
- Debian package inspection.

CI retains failure-only artifacts for:

- core TypeScript diagnostics;
- desktop TypeScript diagnostics;
- build and test diagnostics.

Validation proves repository and packaged-desktop behavior. It does not prove provider publication, connected analytics, hands-on accessibility, unfamiliar-user completion, or end-user release readiness.

## Development

### Requirements

- Node.js 22 or newer;
- npm;
- Rust toolchain for desktop validation;
- Linux Tauri build dependencies for Debian package construction.

ViMax, Python, publishing credentials, and analytics credentials are not required to build or validate the Viable desktop application.

### Install

```bash
npm ci
```

### Validate repository

```bash
npm run validate
```

### Build reusable TypeScript

```bash
npm run build
```

### Run deterministic tests

```bash
npm test
```

### Check desktop TypeScript

```bash
npm run desktop:web:check
```

### Build Debian desktop package

```bash
npm run desktop:bundle
```

## Documentation

Start with [the documentation index](docs/README.md).

Core reading order:

1. [Current handoff](docs/handoff/CURRENT.md)
2. [Product Requirements Document](docs/product/PRD.md)
3. [ICP discovery and validation](docs/product/icp-discovery-and-validation.md)
4. [ADR index](docs/adr/README.md)
5. [Platform architecture](docs/architecture/viable-platform.md)
6. [Video Production architecture](docs/architecture/video-production-domain.md)
7. [Calendar, Activation, Outcome, and Learning architecture](docs/architecture/activation-and-learning-domain.md)
8. [Current state](docs/status/current-state.md)
9. [Initial build sequence](docs/roadmap/initial-build-sequence.md)
10. [Open decisions](docs/decisions/open-decisions.md)

## Next implementation priorities

The initial six-slice vertical sequence is implemented and automatedly validated.

The next priorities are:

1. complete hands-on accessibility and unfamiliar-user acceptance for issues #2, #5, #6, #3, #4, and #7;
2. remediate evidenced workflow, clarity, and recovery gaps;
3. define backup, restore, retention, deletion, and migration guarantees;
4. identify and validate Viable's own narrower launch ICP;
5. decide the first connected publishing, analytics, search, and CRM adapters from current product evidence;
6. add installer signing, updates, rollback, and cross-platform validation before external beta;
7. build Relationships and Sales only after its authoritative domain and evidence boundaries are approved.

Direct publishing should not precede human acceptance of the complete manual activation and evidence loop.

## Release posture

Viable is not ready for public or commercial end-user release.

Before external beta, complete:

- hands-on accessibility review;
- unfamiliar-user acceptance;
- remediation from those reviews;
- backup and restore;
- retention and deletion behavior;
- privacy and security review;
- installer signing and update behavior;
- cross-platform installer validation;
- operational support documentation.

## Ownership and license

Viable is owned by MythologIQ Labs, LLC.

The repository is licensed under the proprietary terms in [LICENSE](LICENSE). Third-party components retain their own licenses. The ViMax compatibility packet records the pinned upstream MIT notice obligations and does not redistribute ViMax itself.
