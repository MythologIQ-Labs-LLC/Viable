# Viable Session Context Handoff

## Document control

| Field | Value |
|---|---|
| Date | 2026-07-15 |
| Repository | `MythologIQ-Labs-LLC/Viable` |
| Product owner | MythologIQ Labs, LLC |
| Product lead | Kevin R. Knapp |
| Active documentation branch | `agent/documentation-baseline-review` |
| Active documentation PR | #8 |
| Current maturity | Product definition and repository foundation |
| Purpose | Preserve the highest-value context required to continue Viable work in a new session |

This handoff summarizes current product context and points to authoritative documents. It does not replace the PRD, ADRs, architecture, roadmap, current state, or GitHub issues.

## 1. New-session resume order

A new session should begin by reading, in order:

1. `README.md`
2. this handoff document;
3. `docs/product/PRD.md`;
4. `docs/product/icp-discovery-and-validation.md`;
5. `docs/adr/README.md` and accepted ADRs;
6. `docs/architecture/viable-platform.md`;
7. `docs/status/current-state.md`;
8. `docs/roadmap/initial-build-sequence.md`;
9. `docs/decisions/open-decisions.md`;
10. the GitHub issue selected for implementation.

The repository documents and current GitHub state are authoritative. Prior chat history is useful context but not durable authority.

## 2. Product identity

Viable is a MythologIQ Labs, LLC product created and led by Kevin R. Knapp.

Viable is a local-first marketability operating system for products, public repositories, founders, maintainers, and small product teams.

Viable should help a founder or product team:

1. establish product truth;
2. identify, validate, and refine the proper ideal customer profile;
3. assess whether the product is ready to market;
4. understand audiences, buyers, competitors, search demand, websites, events, communities, social signals, and public repositories;
5. choose positioning, offers, and calls to action;
6. create coordinated, evidence-backed campaigns and assets;
7. review and approve externally consequential work;
8. capture qualified demand and support sales conversations;
9. measure outcomes and improve the product, ICP, message, offer, and channel plan.

Viable does not merely help users produce marketing content. It helps them determine what is true, who the product is actually for, what evidence supports the market choice, what should be created or changed, and whether the work produced a useful outcome.

## 3. Marketability loop

```text
Establish product truth
  -> identify and validate the proper ICP
  -> assess marketability
  -> understand the market and opportunity landscape
  -> choose positioning and offers
  -> create useful canonical assets
  -> adapt assets to channels
  -> review and approve external action
  -> distribute manually or through supported adapters
  -> capture and qualify demand
  -> support sales and adoption
  -> measure outcomes
  -> refine the product, ICP, message, offer, and channels
```

Event monitoring is one opportunity-signal capability inside this loop. It is not the center of Viable.

## 4. ICP requirement

Helping founders identify the proper ICP is a first-class product outcome.

Viable must support:

- multiple candidate ICP hypotheses;
- user, buyer, decision-maker, approver, influencer, champion, blocker, partner, contributor, maintainer, and disqualifier roles;
- problem intensity, urgency, product fit, time to value, access, proof, adoption friction, commercial viability, retention potential, strategic fit, and evidence quality;
- explicit assumptions, contradictions, confidence, freshness, and evidence;
- anti-ICP and disqualification conditions;
- comparison of candidate segments without an unexplained magic score;
- validation experiments;
- one primary ICP hypothesis with secondary, adjacent, rejected, and historical candidates;
- updates from campaign, lead, sales, product-usage, adoption, retention, repository, event, search, social, and customer evidence;
- preserved rationale and revision history.

The detailed authority is `docs/product/icp-discovery-and-validation.md`.

Viable itself still needs to use this workflow to narrow and validate its own launch ICP. Founders, maintainers, and small product teams are the broad initial market, not yet a proven narrow ICP.

## 5. Durable product boundaries

Viable is not:

- an autonomous social persona;
- a bulk messaging or spam platform;
- a fake-engagement, fake-star, reciprocal-star, or manufactured-adoption system;
- a social surveillance product;
- a guarantee of search rankings, GitHub Trending, virality, leads, sales, or perfect attribution;
- a general-purpose CRM replacement;
- a compliance control plane;
- a reason to bypass supported APIs, access controls, consent, licensing, platform policies, or review requirements;
- an authority that can approve its own generated content or external action.

Core rules:

- product truth comes before content volume;
- evidence remains attached to claims, assessments, ICPs, recommendations, campaigns, and outcomes;
- external action begins as a draft and requires named human approval;
- a generator or delivery adapter cannot approve its own output;
- canonical assets remain separate from channel variants;
- a schedule does not equal approval or delivery;
- render completion does not equal approval;
- provider content is untrusted data;
- partial failure must remain visible;
- missing access or unavailable metrics must not become zero activity;
- manual import, export, copy, download, and outcome-capture paths remain available when APIs are unavailable, expensive, restricted, or undesirable;
- core workflows should remain useful without hosted Viable infrastructure or a required LLM.

## 6. Ownership and migration context

The event-intelligence foundation originated as Event Radar, authored by Kevin R. Knapp.

Viable is the authoritative expanded product. Event Intelligence is a bounded subsystem and the prior product repository is not intended to remain a runtime dependency.

Migration is selective and fail-closed. Do not copy a repository wholesale.

Only product-generic code, tests, schemas, interfaces, and reusable documentation may be imported after review.

Do not import:

- external organization names, branding, ownership claims, governance files, compliance classifications, or licensing statements;
- API keys, OAuth tokens, webhooks, passwords, cookies, browser sessions, secret values, or secret-bearing environment files;
- real channels, destinations, workspaces, account IDs, tenant IDs, email addresses, production URLs, or account-bound credential references;
- private prompts, reports, logs, screenshots, exports, operational evidence, or confidential fixtures;
- old package names, application identifiers, icons, release destinations, signing identities, or update channels;
- any material whose ownership, privacy, licensing, or operational meaning is ambiguous.

The detailed authority is `docs/product/provenance-and-ownership.md` and GitHub issue #1.

## 7. Product capabilities and workstreams

Viable's intended product surface includes:

### Product truth and marketability assessment

- capabilities and limitations;
- product lifecycle and environment support;
- claims and proof;
- pricing, packaging, offers, and calls to action;
- terminology, brand, and accessibility constraints;
- ICP discovery and validation;
- marketability dimensions with evidence, confidence, freshness, gaps, owners, and verification.

### Market and opportunity intelligence

- public events and calendars;
- websites, documentation, release notes, pricing pages, and newsletters;
- search queries and search performance;
- public social and community signals;
- public repositories, packages, releases, discussions, contributors, dependents, and traffic where available;
- competitors and category movement;
- customer interviews, support themes, reviews, sales notes, wins, losses, and objections;
- industry news, policy, standards, partnerships, podcasts, and video sources;
- source health, provenance, deduplication, freshness, confidence, partial failure, and conversion of signals into owned work.

### Positioning and campaigns

- ICP, personas, jobs, pains, desired outcomes, triggers, objections, and buying roles;
- category, alternatives, differentiation, message hierarchy, offer, proof, and call to action;
- launch, evergreen, event-driven, account-focused, partnership, nurture, and repository campaigns;
- campaign asset matrix, dependencies, approval, measurement, and retrospective.

### Content and creative studio

- website and landing-page copy;
- blogs, guides, FAQs, comparisons, case studies, and thought leadership;
- LinkedIn, Facebook, Instagram, X, Threads, Bluesky, Mastodon, and other supported channel variants;
- newsletters, lifecycle email, sales email, and outreach drafts;
- one-pagers, battlecards, pitch decks, demo scripts, proposals, and launch kits;
- image briefs, carousels, diagrams, thumbnails, and ad concepts;
- short-video briefs, hooks, scripts, storyboards, shot lists, captions, voiceover, edit plans, rights manifests, and platform variants;
- comments, version history, review, approval, rejection, rework, and performance.

### Website, SEO, AEO, and conversion

- site inventory and page-purpose mapping;
- crawlability, indexability, metadata, canonical URLs, sitemaps, structured data, mobile behavior, performance, HTTPS, and accessibility;
- keywords, questions, topic clusters, content gaps, internal links, refresh plans, and answer-engine readiness;
- landing pages, forms, bookings, trials, newsletters, demos, calls to action, and conversion paths;
- experiments and validation methods;
- no promise of search placement.

### Public repository growth

- problem clarity, product credibility, time to value, discoverability, differentiation, trust, community readiness, release discipline, adoption, sustainability, and commercial path;
- repository name, description, homepage, topics, social preview, README, demo, quick start, docs, releases, packages, changelog, security, contributing, support, templates, and maintainer expectations;
- launch rooms, asset matrices, maintainer coverage, community distribution, live triage, baselines, observation windows, and retrospectives;
- traffic, referrals, popular content, clones, downloads, stars, watches, forks, issues, discussions, contributors, dependents, integrations, and qualified inquiries where available;
- useful adoption rather than star count alone;
- no promise of GitHub Trending or top-repository status.

### Activation, leads, sales, and learning

- unified campaign and editorial calendar;
- manual exports before direct publishing adapters;
- destination identity, approval, retries, failures, and delivery evidence;
- forms, bookings, newsletter subscriptions, event contacts, referrals, and manual leads;
- people, organizations, source, consent, qualification, lifecycle, owner, next action, suppression, and deletion;
- account briefs, discovery preparation, objections, proof selection, demos, follow-up, proposals, mutual action plans, wins, losses, stalls, and product feedback;
- campaign, asset, channel, website, repository, lead, opportunity, cost, effort, experiment, attribution, and learning records.

## 8. ViMax context

ViMax is a candidate optional video-orchestration adapter and reference implementation.

Current decision:

1. Viable owns the campaign, ICP, product claims, approved script, source assets, rights, consent, production intent, review state, final asset record, calendar, publishing, and measurement.
2. ViMax may orchestrate script, storyboard, reference-image, image-generation, consistency, video-generation, audio, and assembly stages.
3. Begin with a provider-neutral manual production-package export and import workflow.
4. Consider a local CLI adapter only after the package contract is validated.
5. ViMax must remain removable and optional.
6. Credentials must not enter manifests, repository files, export packages, logs, prompts, or screenshots.
7. The user selects model providers and sees cost and data-handling information.
8. Render completion never grants approval.
9. ViMax does not publish.

The detailed assessment is `docs/integrations/vimax-video-generation.md`. Implementation authority is issue #4.

## 9. GitHub repository-growth context

Public repository marketability is a first-class Viable use case.

The useful funnel is:

```text
External impression
  -> repository visit
  -> README comprehension
  -> demo, install, or first success
  -> star, watch, or follow
  -> repeat use
  -> issue, discussion, or feedback
  -> contribution, dependency, or integration
  -> recommendation, sponsorship, partnership, or qualified commercial inquiry
```

Stars are one signal, not the product outcome.

Viable should optimize controllable factors and measure outcomes. It must not manufacture engagement or guarantee external ranking.

The detailed product model is `docs/product/open-source-repository-growth.md`. Implementation authority is issue #3.

## 10. Documentation authority chain

The current authority chain is:

1. accepted ADRs define durable product and architecture decisions;
2. the PRD defines required outcomes, scope, quality attributes, success measures, and release gates;
3. the architectural design defines contexts, authority, persistence, jobs, integrations, trust, failure, and recovery;
4. current state defines what is actually implemented and validated;
5. roadmaps define sequence, target experience, and exit criteria;
6. issues define implementation scope and acceptance criteria;
7. the README is the product front door and must remain synchronized.

Important documents:

- `docs/product/PRD.md`
- `docs/product/icp-discovery-and-validation.md`
- `docs/product/product-scope.md`
- `docs/product/marketability-operating-model.md`
- `docs/product/open-source-repository-growth.md`
- `docs/product/provenance-and-ownership.md`
- `docs/GLOSSARY.md`
- `docs/adr/README.md`
- `docs/architecture/viable-platform.md`
- `docs/roadmap/product-roadmap.md`
- `docs/roadmap/design-roadmap.md`
- `docs/roadmap/initial-build-sequence.md`
- `docs/status/current-state.md`
- `docs/decisions/open-decisions.md`
- `docs/governance/research-and-outreach-safety.md`
- `docs/integrations/vimax-video-generation.md`

## 11. Accepted architecture decisions

- ADR-0001: local-first workspace is the default system of record.
- ADR-0002: external systems integrate through provider-neutral capability adapters.
- ADR-0003: Product Core and the claims ledger govern downstream generated work.
- ADR-0004: evidence provenance and explicit partial failure are mandatory.
- ADR-0005: named human approval is required for externally consequential action.
- ADR-0006: the marketability loop is the top-level product model; Event Intelligence is a bounded signal subsystem.

Do not silently reverse one of these decisions in code. Propose a superseding ADR.

## 12. Current implementation state

Viable is still in product-definition and repository-foundation stage.

Implemented in the repository:

- Platinum product README foundation;
- proprietary license;
- product scope and marketability operating model;
- formal PRD;
- ADR system and six accepted foundational ADRs;
- full target architectural design;
- product and experience roadmaps;
- initial build sequence;
- public repository-growth model;
- ViMax integration assessment;
- documentation verification and closure records;
- migration safeguards;
- GitHub issues for all initial build slices;
- ICP discovery and validation specification;
- ownership and provenance policy;
- glossary;
- open decisions register;
- this session handoff.

Not yet complete or operational in this repository:

- sanitized Event Radar source migration;
- independent application CI and package validation;
- complete native desktop runtime;
- product workspace and claims ledger;
- ICP workflow and marketability assessment;
- signals inbox;
- campaign and canonical asset workflow;
- repository launch room;
- video production package and ViMax adapter;
- calendar and outcome-learning loop;
- publishing adapters;
- lead and sales workspace;
- analytics, attribution, experiments, and learning ledger;
- end-user installer and unfamiliar-user acceptance.

Do not claim these planned capabilities are implemented until code and validation exist in Viable and current state is updated.

## 13. Issue and build map

| Issue | Workstream | Sequence |
|---|---|---|
| #1 | Sanitize and import Event Radar product code | Foundation |
| #2 | Product Truth, ICP Discovery, and Marketability Assessment | Slice 1 |
| #5 | Signals Inbox with event and public repository evidence | Slice 2 |
| #6 | Campaign Brief and Canonical Asset | Slice 3 |
| #3 | Public Repository Growth and Launch | Slice 4 |
| #4 | ViMax Video Production Package prototype | Slice 5 |
| #7 | Calendar, Manual Activation, Outcome Capture, and Learning | Slice 6 |

The build order should not be inverted merely because an integration is visually exciting.

Product truth and ICP authority must exist before high-volume generation, automated outreach, or publishing.

## 14. Immediate next actions

1. Complete and review PR #8 so the documentation baseline becomes part of `main`.
2. Verify that the ICP requirement is represented in the PRD, issue #2, roadmap, architecture, and README.
3. Complete issue #1 using the fail-closed migration rules.
4. Restore independent Node, TypeScript, Rust, desktop, and package validation in Viable.
5. Rebrand package identity, application identifiers, icons, installers, signing, update destinations, and release metadata.
6. Implement issue #2 as the first complete product slice.
7. Keep README, current state, PRD, ADRs, architecture, roadmap, issue acceptance criteria, and user documentation synchronized with every implemented slice.

## 15. Documentation and product quality expectations

- Maintain a Platinum-grade README.
- Use complete, clear sentences rather than fragment-heavy prose.
- Keep product documentation direct, professional, and evidence-based.
- Avoid compliance inflation. Viable may use strong security and governance practices without positioning itself as a compliance control system.
- Prefer simple, intuitive workflows and progressive disclosure.
- Accessibility is a release requirement, including keyboard operation, visible focus, semantic labels, scalable text, reduced motion, captions, and non-color status.
- Provide simplified, standard, and high-density views when roles genuinely need different information density.
- Keep external platform claims current and revalidate access, scopes, cost, and review requirements before implementation.
- Record uncertainty rather than guessing.

## 16. Open decisions

The open-decision register is authoritative for unresolved questions.

Especially important:

- Viable's own narrow launch ICP;
- pricing, packaging, and support model;
- local-only versus optional hosted collaboration;
- BYOK versus included model services;
- retention and telemetry defaults;
- first publishing, analytics, search, CRM, and CMS adapters;
- installer signing and updates;
- backup format and recovery guarantees;
- persistent schemas and migrations;
- API, plugin, or MCP authority;
- managed model and video execution;
- long-term handling of the prior Event Radar repository.

Do not convert an open decision into a durable implementation without recording the decision in the required authority.

## 17. Safe new-session starter prompt

Use the following instruction to resume work:

> Continue work on `MythologIQ-Labs-LLC/Viable`. First read `README.md`, `docs/handoff/session-context-2026-07-15.md`, `docs/product/PRD.md`, `docs/product/icp-discovery-and-validation.md`, `docs/adr/README.md`, `docs/architecture/viable-platform.md`, `docs/status/current-state.md`, `docs/roadmap/initial-build-sequence.md`, and `docs/decisions/open-decisions.md`. Inspect PR #8 and issues #1 through #7 before proposing or changing implementation. Treat Viable as a MythologIQ-owned local-first marketability operating system that explicitly helps founders identify and validate the proper ICP. Preserve the fail-closed source-migration boundary: do not import external organization content, credentials, accounts, destinations, private operational data, or ambiguous licensing. Keep Event Intelligence bounded, require human approval for external action, and distinguish designed behavior from implemented and validated behavior. Then report the current state, unresolved decisions, and the single next highest-value action before proceeding.

## 18. Refresh readiness

A session refresh is safe when:

- PR #8 and its branch remain available;
- this handoff is committed on the branch;
- the new session reads the authority chain before taking action;
- no implementation is assumed from conversation alone;
- unresolved decisions remain open rather than guessed;
- source migration safeguards are preserved.
