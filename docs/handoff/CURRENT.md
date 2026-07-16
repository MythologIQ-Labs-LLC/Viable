# Viable Current Session Handoff

## Purpose

This is the current restart entrypoint for Viable work.

It preserves the product context required to begin a new session without depending on conversational memory. Detailed authority remains in the linked PRD, ADRs, architecture, roadmap, current state, and issues.

## Repository state

- Repository: `MythologIQ-Labs-LLC/Viable`
- Product owner: MythologIQ Labs, LLC
- Product lead: Kevin R. Knapp
- Latest merged implementation PR: #11 at `bfd40c351b461016f246216026d0da963f1c2f76`
- Current maturity: internal Slice 1 implementation on `main` with automated desktop validation
- Current implementation priority: complete human accessibility and unfamiliar-founder acceptance for issue #2 while beginning the bounded Signals Inbox under issue #5

## Read before acting

Read these in order:

1. `README.md`
2. `docs/handoff/CURRENT.md`
3. `docs/product/PRD.md`
4. `docs/product/icp-discovery-and-validation.md`
5. `docs/adr/README.md`
6. `docs/architecture/viable-platform.md`
7. `docs/architecture/icp-domain.md`
8. `docs/status/current-state.md`
9. `docs/roadmap/initial-build-sequence.md`
10. `docs/decisions/open-decisions.md`
11. the GitHub issue selected for implementation

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
- review and approve external action;
- capture qualified demand and support sales conversations;
- measure outcomes and improve the product, ICP, message, offer, and channel plan.

Viable is not merely a social scheduler, content generator, event monitor, SEO checker, CRM, or analytics dashboard. It connects those concerns through one product, evidence, ICP, campaign, approval, relationship, and learning model.

## Marketability loop

```text
Establish product truth
  -> identify and validate the proper ICP
  -> assess marketability
  -> understand market and opportunity evidence
  -> choose positioning and offers
  -> create canonical assets
  -> adapt assets to channels
  -> review and approve external action
  -> distribute manually or through supported adapters
  -> capture and qualify demand
  -> support sales and adoption
  -> measure outcomes
  -> refine the product, ICP, message, offer, and channels
```

Event Intelligence is one bounded signal subsystem inside this loop. It is not the product center.

## ICP authority

Helping founders identify the proper ICP is a first-class product requirement and part of MVP Slice 1.

An ICP is an evidence-backed description of the organizations or customers most likely to experience the target problem, receive meaningful value from the current product, adopt successfully, and support a viable commercial relationship.

Viable must support:

- multiple ICP hypotheses;
- user, economic buyer, decision-maker, approver, influencer, champion, blocker, partner, maintainer, contributor, and disqualifier roles;
- problem intensity and urgency;
- product fit and time to value;
- access and reachable channels;
- proof and evidence quality;
- adoption friction and buying constraints;
- commercial viability and retention potential;
- anti-ICP and disqualification conditions;
- assumptions, contradictions, confidence, freshness, and ownership;
- validation experiments;
- selected, secondary, adjacent, rejected, and historical candidates;
- evidence and outcomes that may trigger explicit review and revision.

Product Core owns canonical ICP hypotheses. Signals, campaigns, leads, sales, and analytics may contribute evidence or propose review, but they cannot silently rewrite the ICP.

Important authorities:

- `docs/product/icp-discovery-and-validation.md`
- `docs/adr/0007-icp-hypothesis-and-validation-authority.md`
- `docs/architecture/icp-domain.md`
- GitHub issue #2

Viable itself still needs to use this workflow to identify and validate a narrower launch ICP. “Founders, maintainers, and small product teams” is the broad initial market, not yet a proven narrow ICP.

## Durable product boundaries

- Product truth comes before content volume.
- Generated suggestions remain distinct from reviewed evidence.
- Evidence, confidence, freshness, contradictions, and limitations remain visible.
- External action begins as a draft and requires named human approval.
- A generator, scheduler, or adapter cannot approve its own output.
- Canonical assets remain separate from channel variants.
- Scheduling does not equal approval or delivery.
- Render completion does not equal approval.
- Provider content is untrusted data.
- Partial failure remains visible.
- Missing access or unavailable metrics do not become zero activity.
- Anonymous engagement does not become a known contact, qualified lead, or ICP.
- Manual import, export, copy, download, and outcome-capture paths remain available when APIs are restricted, costly, unavailable, or undesirable.
- Core workflows should remain useful without hosted Viable infrastructure or a required LLM.
- Viable does not guarantee search rankings, GitHub Trending, virality, leads, sales, attribution certainty, or an accurate ICP without evidence.
- Viable does not support spam, deceptive engagement, fake stars, manufactured adoption, surveillance, unsupported claims, or bypassed access controls.

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

## Initial build order

| Sequence | Issue | Workstream |
|---|---|---|
| Foundation | #1 | Sanitized Event Radar product-code migration |
| Slice 1 | #2 | Product Truth, ICP Discovery, and Marketability Assessment |
| Slice 2 | #5 | Signals Inbox with event and public repository evidence |
| Slice 3 | #6 | Campaign Brief and Canonical Asset |
| Slice 4 | #3 | Public Repository Growth and Launch |
| Slice 5 | #4 | ViMax Video Production Package prototype |
| Slice 6 | #7 | Calendar, Manual Activation, Outcome Capture, and Learning |

Do not build high-volume generation, direct publishing, automated outreach, or video orchestration before product truth, ICP, claims, evidence, campaigns, and approval authority exist.

## ViMax decision

ViMax is an optional production adapter candidate.

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

## Public repository growth decision

Public repository growth is a first-class Viable use case.

Viable should improve and measure:

- problem clarity;
- README comprehension;
- proof and demo quality;
- clean first success;
- trust and community readiness;
- release discipline;
- distribution;
- adoption, contribution, dependency, integration, and qualified inquiry;
- launch baselines and retrospectives.

Stars are one signal, not proof of adoption. Viable must not promise GitHub Trending or manufacture engagement.

Authority:

- `docs/product/open-source-repository-growth.md`
- GitHub issue #3

## Current state

Merged and validated on `main`:

- PR #8: product, ICP, ADR, architecture, roadmap, and handoff baseline;
- PR #9: bounded Event Intelligence, local persistence, Tauri shell, CI, and Debian packaging;
- PR #10: Product Core workspace, claims, evidence review, canonical ICP services, assessment, actions, and local persistence.

Merged to `main` and automatedly validated through PR #11:

- Home and Product desktop navigation;
- local workspace creation and product-truth revision;
- evidence freshness, generated-suggestion separation, and named review;
- multiple ICP hypotheses and dimension-by-dimension comparison;
- evidence-gated named ICP selection with disqualifiers and rationale;
- contradiction, stale, loading, empty, local/offline, error, and recovery states;
- explained marketability assessment and owned readiness actions;
- keyboard-focus, semantic, text-scale, reduced-motion, responsive, and non-color UI contracts;
- release-mode Tauri build and Debian package inspection.

Still required before issue #2 closes:

- hands-on keyboard and screen-reader review;
- unfamiliar-founder completion of the primary journey without maintainer intervention;
- any remediation evidenced by those reviews.

Later slices remain unimplemented: Signals, campaigns, canonical assets, repository launch, ViMax production package, calendar and outcome learning, publishing, leads, sales, and analytics.

Do not claim planned behavior is operational until code, tests, acceptance, and current-state updates exist.

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

> Continue work on `MythologIQ-Labs-LLC/Viable`. First read `README.md`, `docs/handoff/CURRENT.md`, `docs/product/PRD.md`, `docs/product/icp-discovery-and-validation.md`, `docs/adr/README.md`, `docs/architecture/viable-platform.md`, `docs/architecture/icp-domain.md`, `docs/status/current-state.md`, `docs/roadmap/initial-build-sequence.md`, and `docs/decisions/open-decisions.md`. Inspect merged PRs #8 through #11 and issues #1 through #7 before proposing or changing implementation. Treat Viable as a MythologIQ-owned local-first marketability operating system that explicitly helps founders identify, validate, and refine the proper ICP. Preserve the fail-closed source-migration boundary and do not import external organization content, credentials, accounts, destinations, private operational data, or ambiguous licensing. Keep Event Intelligence bounded, Product Core authoritative for ICP, and named human approval mandatory for external action. Distinguish designed behavior from implemented and validated behavior. Then report the current state, unresolved decisions, and the single next highest-value action before proceeding.

## Historical session detail

The longer dated capture remains available at `session-context-2026-07-15.md`. This `CURRENT.md` file is the preferred restart entrypoint and should be updated when product boundaries, accepted ADRs, issue order, or migration posture change materially.
