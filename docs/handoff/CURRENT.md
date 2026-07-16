# Viable Current Session Handoff

## Purpose

This is the current restart entrypoint for Viable work.

It preserves the product context required to begin a new session without depending on conversational memory. Detailed authority remains in the linked PRD, ADRs, architecture, roadmap, current state, and issues.

## Repository state

- Repository: `MythologIQ-Labs-LLC/Viable`
- Product owner: MythologIQ Labs, LLC
- Product lead: Kevin R. Knapp
- Latest merged implementation PR: #21 at `6d287373ddfd6e1e920a2126b40465eba80b75dc`
- Current maturity: internal Slice 4 public Repository Growth and Launch workflow on `main` with automated repository, native, bundle, and Debian-package validation
- Current implementation priority: complete human acceptance for issues #2, #5, #6, and #3 while beginning the provider-neutral ViMax production-package prototype under issue #4

## Read before acting

Read these in order:

1. `README.md`
2. `docs/handoff/CURRENT.md`
3. `docs/product/PRD.md`
4. `docs/product/icp-discovery-and-validation.md`
5. `docs/product/open-source-repository-growth.md`
6. `docs/adr/README.md`
7. `docs/architecture/viable-platform.md`
8. `docs/architecture/icp-domain.md`
9. `docs/architecture/repository-growth-domain.md`
10. `docs/status/current-state.md`
11. `docs/roadmap/initial-build-sequence.md`
12. `docs/decisions/open-decisions.md`
13. the GitHub issue selected for implementation

The repository and current GitHub state are authoritative. Conversation history may explain intent but may not override accepted documents.

## Product definition

Viable is a local-first marketability operating system for products, public repositories, founders, maintainers, and small product teams.

It helps founders and teams:

- establish product truth;
- identify, compare, validate, select, and refine the proper ideal customer profile;
- assess whether a product is ready to market;
- understand market, customer, event, search, website, social, competitor, repository, and sales evidence;
- choose positioning, offers, proof, and calls to action;
- create coordinated, evidence-backed campaigns and assets;
- assess and improve public repository readiness;
- coordinate governed manual repository launches;
- review and approve external action;
- capture qualified demand and support sales conversations;
- measure outcomes and improve the product, ICP, message, offer, repository, and channel plan.

Viable is not merely a social scheduler, content generator, event monitor, repository scorecard, SEO checker, CRM, or analytics dashboard. It connects those concerns through one product, evidence, ICP, campaign, repository, approval, relationship, and learning model.

## Marketability loop

```text
Establish product truth
  -> identify and validate the proper ICP
  -> assess marketability
  -> understand market and opportunity evidence
  -> choose positioning and offers
  -> create canonical assets
  -> adapt assets to channels
  -> assess product surfaces such as public repositories
  -> review and approve external action
  -> distribute manually or through supported adapters
  -> capture and qualify demand
  -> support sales and adoption
  -> measure outcomes
  -> refine the product, ICP, message, offer, repository, and channels
```

Event Intelligence is one bounded signal subsystem. Repository Growth is one Product-integrated product-surface workflow. Neither is the product center.

## ICP authority

Helping founders identify the proper ICP is a first-class product requirement and part of MVP Slice 1.

An ICP is an evidence-backed description of the organizations or customers most likely to experience the target problem, receive meaningful value from the current product, adopt successfully, and support a viable commercial relationship.

Product Core owns canonical ICP hypotheses. Signals, campaigns, repository outcomes, leads, sales, and analytics may contribute evidence or propose review, but they cannot silently rewrite the ICP.

Important authorities:

- `docs/product/icp-discovery-and-validation.md`
- `docs/adr/0007-icp-hypothesis-and-validation-authority.md`
- `docs/architecture/icp-domain.md`
- GitHub issue #2

Viable itself still needs to use this workflow to identify and validate a narrower launch ICP. “Founders, maintainers, and small product teams” remains the broad initial market, not a proven narrow ICP.

## Durable product boundaries

- Product truth comes before content volume.
- Generated suggestions remain distinct from reviewed evidence.
- Evidence, confidence, freshness, contradictions, and limitations remain visible.
- Product Core owns canonical claims and ICP hypotheses.
- Campaigns owns approved campaign intent, canonical assets, and channel variants.
- Repository Growth cannot duplicate or silently rewrite campaign or Product Core authority.
- External action begins as a draft and requires named human approval.
- A generator, scheduler, collector, or adapter cannot approve its own output.
- Canonical assets remain separate from channel variants.
- Scheduling does not equal approval or delivery.
- Manual export does not equal publishing or delivery.
- Render completion does not equal approval.
- Provider content is untrusted data.
- Partial failure remains visible.
- Missing access or unavailable metrics do not become zero activity.
- Stars, forks, watchers, downloads, issues, and contributors remain activity signals rather than adoption proof.
- Anonymous community participation does not become a known contact, qualified lead, or ICP.
- Manual import, export, copy, download, and outcome-capture paths remain available when APIs are restricted, costly, unavailable, or undesirable.
- Core workflows should remain useful without hosted Viable infrastructure or a required LLM.
- Viable does not guarantee search rankings, GitHub Trending, virality, leads, sales, attribution certainty, or an accurate ICP without evidence.
- Viable does not support spam, deceptive engagement, fake stars, reciprocal-star rings, manufactured adoption, surveillance, unsupported claims, or bypassed access controls.

## Ownership and migration

Viable is a MythologIQ Labs, LLC product created and led by Kevin R. Knapp.

The event-intelligence foundation originated as Event Radar, authored by Kevin R. Knapp. Viable is the authoritative expanded product.

Migration is selective and fail-closed. Only product-generic code, tests, schemas, interfaces, and reusable documentation may be imported after review.

Never import:

- external organization branding, ownership claims, governance, compliance classifications, or licensing statements;
- API keys, OAuth tokens, webhooks, passwords, cookies, browser sessions, or secret-bearing files;
- real workspaces, channels, destinations, accounts, tenant IDs, email addresses, or production URLs;
- private prompts, reports, logs, screenshots, exports, operational evidence, or confidential fixtures;
- old package identities, icons, signing identities, release destinations, or update channels;
- ambiguous material whose ownership, privacy, licensing, or operational meaning is unclear.

Authority:

- `docs/product/provenance-and-ownership.md`
- GitHub issue #1

## Accepted architecture decisions

- ADR-0001: local-first workspace authority.
- ADR-0002: provider-neutral capability adapters.
- ADR-0003: product truth and claims-ledger authority.
- ADR-0004: evidence provenance and explicit partial failure.
- ADR-0005: named human approval for externally consequential action.
- ADR-0006: the marketability loop is authoritative and Event Intelligence is bounded.
- ADR-0007: ICP hypotheses and validation belong to Product Core.

Do not reverse an accepted ADR through implementation convenience. Propose a superseding ADR.

Repository Growth did not require a new ADR because it implements the accepted Product Core, evidence, campaign, approval, and local-authority boundaries. Its implemented cross-context shape is documented in `docs/architecture/repository-growth-domain.md`.

## Initial build order

| Sequence | Issue | Workstream | Current state |
|---|---|---|---|
| Foundation | #1 | Sanitized Event Radar product-code migration | Implemented and closed |
| Slice 1 | #2 | Product Truth, ICP Discovery, and Marketability Assessment | Implemented and automatedly validated; human acceptance open |
| Slice 2 | #5 | Signals Inbox with event and public repository evidence | Implemented and automatedly validated; human acceptance open |
| Slice 3 | #6 | Campaign Brief and Canonical Asset | Implemented and automatedly validated; human acceptance open |
| Slice 4 | #3 | Public Repository Growth and Launch | Implemented and automatedly validated; human acceptance open |
| Slice 5 | #4 | ViMax Video Production Package prototype | Next implementation slice |
| Slice 6 | #7 | Calendar, Manual Activation, Outcome Capture, and Learning | Designed; not implemented |

Do not build high-volume generation, direct publishing, automated outreach, or video orchestration that bypasses product truth, ICP, claims, evidence, campaigns, approval, rights, or manual fallback authority.

## Implemented through Slice 4

### Foundation and Product Core

Merged and validated:

- bounded Event Intelligence with explicit source outcomes;
- local atomic persistence and Tauri desktop shell;
- Product Core workspace, claims, reviewed evidence, ICP hypotheses, comparison, selection, revision history, assessment, and actions;
- Home and Product desktop journeys;
- loading, empty, local/offline, stale, contradiction, error, and recovery states.

### Signals and Market

Merged and validated:

- provider-neutral signal, source-health, provenance, relationship, and conversion contracts;
- bounded Event Intelligence import;
- public unauthenticated GitHub repository signal evidence;
- strict manual JSON signal import;
- Signals and Market desktop navigation;
- named signal review, save, tag, assignment, connection, and conversion to proposed owned work;
- explicit verified-empty, partial, rate-limit, unavailable, validation, transport, offline, and recovery states.

### Campaigns and Studio

Merged and validated through PR #18:

- Product Core-traceable campaign briefs with one primary outcome and audience;
- selected ICP or deliberate test audience;
- separate canonical assets and LinkedIn, website, and GitHub release variants;
- named review states for campaigns, assets, and variants;
- rights, accessibility, disclosure, comments, version history, and claim-impact invalidation;
- Campaigns and Studio desktop workflows;
- channel comparison;
- downloadable manual export manifests that remain unapproved for publishing and undelivered.

### Public Repository Growth and Launch

Merged and validated through PRs #20 and #21:

- bounded public GitHub repository import;
- repository metadata, README, community profile, trust files, release sample, download counts, and contributor sample;
- observed, verified-zero, unavailable, and not-collected metric states;
- deterministic assessment across twelve repository readiness dimensions;
- evidence, confidence, impact, effort, owner, recommendation, and verification on every finding;
- prioritized owned repository-growth actions;
- Product-integrated desktop workflow;
- launch rooms linked to approved campaigns, canonical assets, and LinkedIn, website, and GitHub release variants;
- Product Core claim and evidence revalidation at launch-room and export time;
- release checklist, maintainer coverage, observation window, and baseline;
- credential-free manual launch packages that remain unapproved for publishing and undelivered;
- bounded retrospective comparison with no numeric delta for unavailable evidence;
- granular CI steps and retained desktop-typecheck diagnostics on failure;
- exact-head Node, TypeScript, Rust, Tauri bundle, and Debian-package validation.

## Open human acceptance gates

Issue #2 remains open for:

- hands-on keyboard and screen-reader review;
- unfamiliar-founder completion of the Product and ICP journey;
- remediation from those reviews.

Issue #5 remains open for:

- hands-on keyboard and screen-reader review;
- unfamiliar-user completion of the Signals journey;
- remediation from those reviews.

Issue #6 remains open for:

- hands-on keyboard and assistive-technology review;
- unfamiliar-user completion of the campaign-to-export journey;
- remediation from those reviews.

Issue #3 remains open for:

- hands-on keyboard and assistive-technology review;
- unfamiliar-maintainer completion from public import through retrospective;
- remediation from those reviews.

Automated semantics, focus contracts, responsive styling, non-color status, reduced-motion support, and native packaging are not substitutes for those human reviews.

## Public repository growth boundary

The implemented public importer does not claim authenticated access to:

- repository traffic or unique visitors;
- clones or unique cloners;
- referrals or popular content;
- private repository content;
- dependents or integrations beyond separately supplied evidence;
- commercial inquiries;
- GitHub write operations.

Those metrics remain unavailable or not collected. They must never become zero unless a supported source explicitly verifies zero.

Repository readiness ratings prioritize controllable work. They do not predict GitHub Trending, virality, adoption, leads, or sales.

## ViMax decision

ViMax is an optional production-adapter candidate.

- Viable owns campaign intent, ICP, claims, script approval, assets, rights, consent, credentials, review, final asset, publishing, and measurement.
- ViMax may orchestrate script, storyboard, reference-image, image, video, audio, consistency, and assembly work.
- Begin with a provider-neutral manual production package.
- Consider a local CLI adapter only after the package contract is validated.
- ViMax remains optional and removable.
- Credentials never enter manifests, repository files, exports, logs, prompts, or screenshots.
- Render completion never grants approval.
- ViMax does not publish.

Authority:

- `docs/integrations/vimax-video-generation.md`
- GitHub issue #4

## CI and validation posture

Repository CI now exposes separate steps for:

- secret scanning;
- core TypeScript validation;
- desktop TypeScript validation;
- Node build and deterministic tests.

Desktop validation covers:

- Rust formatting;
- Rust tests;
- Tauri bundle creation;
- Debian package inspection.

Desktop typecheck failures retain a seven-day diagnostic artifact. Do not merge implementation changes without exact-head repository and native validation.

## Open decisions

Read `docs/decisions/open-decisions.md` before selecting implementation defaults.

Especially important:

- Viable's own narrow launch ICP;
- what evidence qualifies an ICP as validated;
- pricing, packaging, licensing, and support;
- local-only versus optional hosted collaboration;
- BYOK versus included model services;
- retention and telemetry defaults;
- first publishing, analytics, search, CMS, CRM, and email adapters;
- authenticated GitHub adapter scope and permissions;
- installer signing and updates;
- backup format and recovery guarantees;
- persistence schemas and migrations;
- API, plugin, or MCP authority;
- managed model and video execution;
- final handling of the prior Event Radar repository.

## Product and documentation expectations

- Maintain a Platinum-grade README.
- Use complete, direct, professional sentences.
- Keep architecture, PRD, ADRs, roadmap, current state, README, issues, and user documentation synchronized.
- Avoid compliance inflation.
- Prefer simple workflows and progressive disclosure.
- Accessibility is a release requirement.
- Revalidate external provider access, pricing, scopes, terms, and review requirements at implementation time.
- Record uncertainty rather than guessing.
- Preserve manual fallback paths.
- Require unfamiliar-user acceptance for each primary slice.

## Exact new-session prompt

> Continue work on `MythologIQ-Labs-LLC/Viable`. First read `README.md`, `docs/handoff/CURRENT.md`, `docs/product/PRD.md`, `docs/product/icp-discovery-and-validation.md`, `docs/product/open-source-repository-growth.md`, `docs/adr/README.md`, `docs/architecture/viable-platform.md`, `docs/architecture/icp-domain.md`, `docs/architecture/repository-growth-domain.md`, `docs/status/current-state.md`, `docs/roadmap/initial-build-sequence.md`, and `docs/decisions/open-decisions.md`. Inspect merged PRs #8 through #21 and issues #1 through #7 before proposing or changing implementation. Treat Viable as a MythologIQ Labs, LLC-owned local-first marketability operating system that explicitly helps founders identify and validate the proper ICP, create governed campaigns, and improve useful public repository adoption. Preserve the fail-closed source-migration boundary and do not import external organization content, credentials, accounts, destinations, private operational data, private repositories, or ambiguous licensing. Keep Event Intelligence bounded, Product Core authoritative for claims and ICP, Campaigns authoritative for approved assets, and named human approval mandatory for external action. Missing GitHub access must remain unavailable rather than zero. Distinguish designed behavior from implemented, automatedly validated, and human-accepted behavior. Then report the current state, unresolved decisions, and the single next highest-value action before proceeding.

## Historical session detail

The longer dated capture remains available at `session-context-2026-07-15.md`. This `CURRENT.md` file is the preferred restart entrypoint and must be updated when product boundaries, accepted ADRs, issue order, implementation maturity, or migration posture changes materially.
