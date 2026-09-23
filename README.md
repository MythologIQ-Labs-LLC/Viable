<!-- markdownlint-disable MD033 MD041 -->
<div align="center">

<p align="center">
  <img src="assets/brand/viable-banner.png" alt="Viable — Local Intelligence. Real Opportunities. Tangible Impact." width="100%">
</p>

# Viable

### A local-first marketability operating system for products, public repositories, founders, and small teams

[![Status: Internal Slice 6 plus Website Watch](https://img.shields.io/badge/Status-slice_6_plus_website_watch-2ea043)](#current-state)
[![Approach: Local first](https://img.shields.io/badge/Approach-local_first-8957e5)](#product-principles)
[![ICP: Evidence based](https://img.shields.io/badge/ICP-evidence_based-0b7285)](#identify-the-proper-icp)
[![Approval: Named human](https://img.shields.io/badge/Approval-named_human-b42335)](docs/adr/0005-human-approval-for-external-action.md)
[![Evidence: Explicit state](https://img.shields.io/badge/Evidence-explicit_state-0b7285)](docs/adr/0004-evidence-provenance-and-partial-failure.md)
[![License: Proprietary](https://img.shields.io/badge/License-proprietary_all_rights_reserved-b42335)](LICENSE)

</div>

> [!IMPORTANT]
> Viable is a MythologIQ Labs, LLC product created and led by Kevin R. Knapp. All six initial internal product slices and Website Watch Stage 1 are implemented and automatedly validated. Direct publishing, connected analytics, live website crawling, Context.dev execution, live Webdog synchronization, actual ViMax execution, leads, sales, signed installers, hands-on accessibility acceptance, unfamiliar-user acceptance, and end-user release readiness remain incomplete.

Viable helps founders and product teams establish product truth, identify and validate the proper ideal customer profile, assess marketability, collect bounded evidence, monitor relevant public changes, create governed campaigns and assets, improve public repository readiness, prepare reviewable video-production packages, schedule approved work, activate it manually, record what actually happened, and choose the next reversible action from explicit evidence.

It is not a social scheduler with an AI text box attached. It is not a website watcher, repository score generator, video generator, CRM, or collection of disconnected dashboards. Viable connects those concerns through one product, evidence, ICP, campaign, asset, approval, destination, outcome, and learning model.

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
  -> review and approve destination-bound external action
  -> schedule and activate manually or through supported adapters
  -> record delivery, failure, cancellation, or unknown outcomes
  -> compare explicit metric evidence against a baseline
  -> complete a retrospective
  -> choose one reversible next action
  -> refine product, ICP, message, offer, repository, asset, source, and channel plan
```

Event Intelligence and Website Watch are bounded Signals subsystems. Repository Growth is one Product-integrated surface workflow. Video Production is one Campaign-linked production workflow. Calendar and Analytics complete the first manual operating loop. None becomes the product center merely because it has an API, dashboard, or impressive dependency graph.

## Why Viable exists

Founders and small teams commonly manage marketability across:

- product documents;
- research notes;
- spreadsheets;
- event feeds;
- competitor and public website pages;
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
- public changes are noticed without durable provenance or review;
- AI summaries are mistaken for source evidence;
- failed checks are mistaken for no change;
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

Viable does not declare an ICP proven because a model generated a polished persona, a repository earned stars, a website changed, or a campaign received attention. Product Core owns canonical ICP hypotheses. Downstream workflows may contribute reviewed evidence and propose review, but they cannot silently rewrite the ICP.

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
- explicit success, verified-empty, partial, unavailable, rate-limited, validation-failed, transport-failed, offline, and recovery states;
- Market summary of reviewed evidence.

One broken source cannot masquerade as an empty market.

See [Signals Inbox and Market evidence workflow](docs/user/signals-inbox.md).

### Website Watch in Signals and Market

Website Watch Stage 1 supports:

- watched-site identity, canonical public URL, normalized domain, relationship, purpose, authorization confirmation, retention, named owner, and active state;
- site-link, page-content, and product-price target intent;
- target URL, link scope, watch note, requested interval, next-due intent, source adapter, retention, and mandatory review;
- strict pasted or local-file Webdog `webdog_ai.new_alerts` version 1 import;
- one to one hundred alerts and a 512 KiB import limit;
- source-instance origin validation;
- secret-bearing field and value rejection;
- absolute public HTTP and HTTPS URL validation;
- browser-safe literal IPv4 and IPv6 private, loopback, link-local, metadata, multicast, documentation, and reserved-range restrictions;
- provider-neutral snapshots with SHA-256 identity, bounded payload reference, limitations, retention, and deletion evidence;
- ordered bounded line differences without semantic-completeness claims;
- explicit change-detected, verified-no-change, baseline, partial, unavailable, rate-limit, authentication, validation, transport, offline, and cancellation outcomes;
- first-snapshot baseline semantics that do not claim no earlier change;
- Website Watch observations and correlated Signals suggestions from the same validated import;
- generated change summaries and relevance recommendations stored separately from evidence;
- named Signals review synchronized with Website Watch observation review;
- snapshot deletion and retention pruning with named actors while preserving provenance;
- proposed Website Watch response work;
- reviewed follow-up, experiment, opportunity, or approval-deadline planning through existing Calendar authority;
- local browser-profile persistence;
- responsive and reduced-motion-safe presentation;
- Webdog revision tracking and MIT attribution.

Website Watch Stage 1 does not crawl websites, call Context.dev, connect to a live Webdog service, run a worker, import live screenshots, open a public webhook listener, copy browser sessions, access private pages, execute AI triage, send notifications, publish, or mutate Product Core automatically.

```text
configured target
  != completed check
  != verified no change
  != reviewed evidence
  != Product Core truth
  != Calendar action
```

See:

- [Website Watch domain architecture](docs/architecture/website-watch-domain.md)
- [Webdog integration assessment](docs/integrations/webdog-website-monitoring.md)
- [Website Watch user guide](docs/user/website-watch.md)
- [Third-party notices](THIRD_PARTY_NOTICES.md)

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
- structured stages, failures, paths, MIME types, sizes, SHA-256 values, source relationships, and redacted logs;
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
- LinkedIn, website, GitHub release, Instagram Reels, and YouTube Shorts channels;
- internal approval deadlines, event opportunities, experiments, and follow-ups;
- planning entries related to reviewed Website Watch observations;
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

1. **Local first.** Core product records, evidence, drafts, approvals, watched sites, snapshots, repository plans, video briefs, destinations, outcomes, and learning belong to the user's workspace.
2. **Product truth before content volume.** Viable never scales an unsupported claim.
3. **Evidence before action.** Recommendations, imported observations, and generated work retain their source, confidence, freshness, and limitations.
4. **Named human approval.** Research and generation accelerate judgment. They do not replace accountability.
5. **Provider-neutral core.** Platforms, monitoring services, and production tools are adapters, not the product model.
6. **Supported access only.** Public or explicitly authorized interfaces are preferred over copied sessions and undocumented private endpoints.
7. **Partial failure is visible.** A missing source, failed screenshot, rejected render, interrupted export, unavailable metric, or failed delivery remains visible.
8. **Canonical first, variant second.** Users approve the underlying meaning before adapting it to channels or formats.
9. **Manual fallback is a feature.** Core workflows remain useful when APIs are restricted, costly, unavailable, or undesirable.
10. **Simple normal use.** Ordinary work should not require configuration-file editing, cron expressions, or invented IDs.
11. **Accessible by default.** Keyboard operation, visible focus, semantic labels, scalable text, reduced motion, captions, and non-color status are release requirements.
12. **No fake growth.** Viable does not automate spam, fake stars, reciprocal rings, fabricated testimonials, or manufactured adoption.
13. **No secret sprawl.** Credentials do not enter evidence, briefs, packages, repository files, destinations, outcomes, metrics, logs, screenshots, fixtures, or documentation.
14. **Measure useful outcomes.** Activity, a detected change, and schedule intent are evidence, not success by themselves.
15. **Record uncertainty.** Missing data, bounded imports, attribution uncertainty, and open decisions remain visible rather than being replaced by confident invention.
16. **Respect monitored sources.** Public visibility does not authorize access-control bypass, abusive crawling, unlimited retention, or redistribution of third-party content.

## Architecture

```text
Viable desktop workspace
  -> Product Core
       -> product truth and claims
       -> ICP hypotheses and validation
  -> Evidence and Signals
       -> events
       -> public repositories
       -> Website Watch
            -> watched sites and targets
            -> source health and snapshots
            -> bounded change observations
            -> named review and proposed work
            -> reviewed Calendar planning
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
- [Website Watch domain architecture](docs/architecture/website-watch-domain.md)
- [ADR index](docs/adr/README.md)

## Current state

Viable has completed internal Slice 6 and Website Watch Stage 1.

| Area | Status |
|---|---|
| Product identity and positioning | Established |
| Platinum README | Synchronized through Website Watch Stage 1 |
| PRD and foundational ADRs | Established |
| Product truth, ICP, and assessment | Implemented; human acceptance open |
| Signals and Market | Implemented; human acceptance open |
| Website Watch Stage 1 | Implemented; live adapters and human acceptance open |
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

Exact-head validation through PRs #30 and #31 included:

- repository secret scan;
- core TypeScript;
- desktop TypeScript;
- complete deterministic Node test suite;
- canonical SHA-256 vectors;
- literal IPv4 and IPv6 URL-safety tests;
- Website Watch and Signals review-synchronization contracts;
- reviewed Calendar handoff contracts;
- Rust formatting;
- Rust tests;
- Tauri bundle construction;
- Debian package inspection.

CI retains failure-only artifacts for:

- core TypeScript diagnostics;
- desktop TypeScript diagnostics;
- build and test diagnostics.

Validation proves repository and packaged-desktop behavior. It does not prove live website collection, DNS and redirect safety for a future provider, provider publication, connected analytics, hands-on accessibility, unfamiliar-user completion, or end-user release readiness.

## Development

### Requirements

- Node.js 22 or newer;
- npm;
- Rust toolchain for desktop validation;
- Linux Tauri build dependencies for Debian package construction.

Webdog, Context.dev, ViMax, Python, publishing credentials, analytics credentials, and website-monitoring credentials are not required to build or validate the Viable desktop application.

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
6. [Website Watch architecture](docs/architecture/website-watch-domain.md)
7. [Video Production architecture](docs/architecture/video-production-domain.md)
8. [Calendar, Activation, Outcome, and Learning architecture](docs/architecture/activation-and-learning-domain.md)
9. [Current state](docs/status/current-state.md)
10. [Initial build sequence](docs/roadmap/initial-build-sequence.md)
11. [Open decisions](docs/decisions/open-decisions.md)

## Next implementation priorities

The initial six-slice vertical sequence and Website Watch Stage 1 are implemented and automatedly validated.

The next priorities are:

1. complete hands-on accessibility and unfamiliar-user acceptance for issues #2, #5, #6, #3, #4, #7, and #29;
2. remediate evidenced workflow, clarity, rights, retention, failure, and recovery gaps;
3. define backup, restore, product-wide retention, deletion, and migration guarantees;
4. identify and validate Viable's own narrower launch ICP;
5. decide the first connected publishing, analytics, search, CRM, Context.dev, and live Webdog adapters from current product evidence;
6. add installer signing, updates, rollback, and cross-platform validation before external beta;
7. build Relationships and Sales only after its authoritative domain and evidence boundaries are approved.

Direct publishing and live website collection should not precede human acceptance of the complete manual evidence and activation loop.

## Release posture

Viable is not ready for public or commercial end-user release.

Before external beta, complete:

- hands-on accessibility review;
- unfamiliar-user acceptance;
- remediation from those reviews;
- backup and restore;
- product-wide retention and deletion behavior;
- privacy and security review;
- schema migration guarantees;
- installer signing and update behavior;
- cross-platform installer validation;
- operational support documentation.

## Ownership and license

Viable is owned by MythologIQ Labs, LLC.

The repository is licensed under the proprietary terms in [LICENSE](LICENSE). Third-party components retain their own licenses. [Third-party notices](THIRD_PARTY_NOTICES.md) record reviewed external source provenance and attribution requirements. The ViMax compatibility packet records its pinned upstream MIT obligations without redistributing ViMax. Website Watch records the reviewed Webdog revision and MIT terms without importing Webdog's hosted application, credentials, or Context.dev service access.
