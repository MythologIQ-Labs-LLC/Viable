# Viable Product Requirements Document

## Document control

| Field | Value |
|---|---|
| Product | Viable |
| Owner | MythologIQ Labs, LLC |
| Status | Approved product baseline; implementation pending |
| Version | 1.1 |
| Last reviewed | 2026-07-15 |
| Primary roadmap | `docs/roadmap/product-roadmap.md` |
| Architecture authority | `docs/architecture/viable-platform.md` |
| Decision authority | `docs/adr/README.md` |
| Current implementation state | `docs/status/current-state.md` |
| ICP authority | `docs/product/icp-discovery-and-validation.md` |

This PRD defines the intended product. It does not claim that planned capabilities are already implemented.

## 1. Product summary

Viable is a local-first marketability operating system for products, public repositories, founders, maintainers, and small product teams.

It helps users:

1. establish product truth;
2. identify, validate, and refine the proper ideal customer profile;
3. assess marketability with visible evidence;
4. understand markets, audiences, competitors, search demand, events, communities, and public repositories;
5. create campaigns and coordinated content assets;
6. review and approve external actions;
7. capture leads and support sales conversations;
8. measure outcomes and update the product, ICP, message, offer, and channel plan.

Event discovery is one signal source inside the broader marketability loop. It is not the product center.

## 2. Problem statement

Small product teams typically operate across disconnected tools for product documentation, customer discovery, ICP selection, research, social content, website copy, SEO, events, analytics, public repositories, calendars, outreach, leads, and sales notes.

This fragmentation creates predictable failures:

- founders target broad or convenient audiences without enough evidence that they represent the proper ICP;
- product claims drift across channels;
- research loses provenance and freshness;
- content volume grows faster than product truth;
- publishing systems act without sufficient review context;
- event, search, social, repository, customer, and sales signals remain disconnected;
- teams measure activity without learning whether it produced adoption, qualified demand, or sales progress;
- API access, cost, and platform restrictions can make an otherwise useful workflow unusable.

Viable addresses these failures through one evidence-backed product model and a complete manual or local-first path that does not depend on every external integration being available.

## 3. Product vision

A user should be able to open one workspace and answer, with evidence:

1. What is true about this product?
2. Who is the proper ICP for the product as it exists today?
3. Which ICP assumptions are supported, contradicted, or still untested?
4. Is the product ready to market?
5. What is preventing discovery, understanding, trust, evaluation, adoption, or purchase?
6. Which audience and opportunity deserve attention now?
7. What should be created, improved, published, tested, or discussed next?
8. What requires human approval?
9. What produced adoption, qualified interest, contribution, sales progress, or product learning?
10. What should change because of the observed result?

## 4. Goals

### G1. Establish authoritative product truth

Maintain one canonical record for capabilities, limitations, audiences, positioning, claims, proof, pricing, packaging, offers, calls to action, terminology, and brand constraints.

### G2. Identify and validate the proper ICP

Help founders form, compare, test, select, and refine evidence-backed ICP hypotheses, including buying roles, urgency, product fit, value, adoption friction, commercial viability, disqualifiers, and anti-ICP conditions.

### G3. Produce explainable marketability assessments

Evaluate readiness through explicit dimensions with evidence, confidence, freshness, gaps, ownership, and verification methods.

### G4. Convert evidence into coordinated work

Connect signals and product truth to ICP experiments, campaigns, content briefs, canonical assets, repository-growth actions, sales preparation, and product feedback.

### G5. Preserve human control over external action

Require visible approval before publishing, outreach, or other externally consequential actions.

### G6. Keep the product useful without restricted APIs

Provide manual import, export, copy, download, and local execution paths when APIs are unavailable, costly, restricted, or awaiting review.

### G7. Close the learning loop

Connect campaigns, assets, channels, leads, opportunities, experiments, product changes, and ICP revisions to observed outcomes with stated attribution uncertainty.

## 5. Non-goals

Viable is not:

- an autonomous social persona;
- a bulk messaging or spam platform;
- a fake-engagement, fake-star, or manufactured-adoption system;
- a guarantee of search ranking, GitHub Trending, virality, leads, sales, or a correct ICP without evidence;
- a social surveillance system;
- a general-purpose CRM replacement;
- a compliance control plane;
- a reason to bypass supported APIs, account permissions, consent, licensing, or platform policies;
- an authority that can approve its own generated content or external action;
- a system that treats every reachable person, follower, event attendee, repository visitor, or anonymous interaction as a qualified customer.

## 6. Primary users

### U1. Founder or product owner

Needs to determine what the product truly does, identify and validate the proper ICP, determine whether the product is ready to market, prioritize gaps, coordinate launches, create content, and convert attention into useful conversations.

### U2. Product lead

Needs product truth, claims, roadmap context, customer evidence, ICP assumptions, market feedback, and a controlled way to keep downstream content aligned with current product reality.

### U3. Maintainer of a public repository

Needs repository readiness assessment, launch coordination, community health, adoption evidence, contributor pathways, and commercial conversion without deceptive growth tactics.

### U4. Marketer or content operator

Needs approved ICP and audience context, campaign briefs, evidence-backed content, channel variants, calendars, reviews, approvals, publishing paths, and performance learning.

### U5. Seller or customer-facing operator

Needs account context, ICP fit, discovery preparation, proof selection, objection handling, follow-up, source attribution, and product feedback loops.

### U6. Reviewer or approver

Needs claims, evidence, ICP and audience context, rights, destination identity, prior versions, platform constraints, and an unambiguous approve, reject, or request-changes decision.

## 7. Jobs to be done

- When I have built a product but do not know who is most likely to buy or adopt it, help me identify and compare credible ICP hypotheses.
- When I select an ICP, help me understand what evidence supports it, what contradicts it, who should be excluded, and what test should happen next.
- When I am preparing to market a product, help me see what is missing before I create more content.
- When market evidence changes, help me understand whether the product, ICP, positioning, offer, or campaign should change.
- When I create an asset, help me preserve the approved meaning while adapting it to each channel.
- When I publish or contact someone, require the right human decision and preserve evidence of what happened.
- When a public repository launches, help me improve discoverability, time to value, trust, community readiness, adoption, and learning.
- When APIs are unavailable, help me complete the workflow through manual export and outcome capture.
- When performance data arrives, help me distinguish activity from useful outcomes and decide what to do next.

## 8. Product requirements

### 8.1 Product truth and claims

| ID | Requirement | Priority |
|---|---|---|
| PRD-PT-001 | A workspace shall maintain canonical product capabilities and limitations. | Must |
| PRD-PT-002 | A workspace shall maintain audiences, users, buyers, decision-makers, approvers, influencers, champions, blockers, partners, maintainers, contributors, and disqualifiers as distinct roles. | Must |
| PRD-PT-003 | Claims shall have explicit states: approved, unverified, outdated, conflicting, prohibited, and retired. | Must |
| PRD-PT-004 | Claims shall link to supporting evidence, confidence, owner, and last-reviewed date. | Must |
| PRD-PT-005 | Generated assets shall identify the claims and evidence they use. | Must |
| PRD-PT-006 | Pricing, packaging, offers, calls to action, terminology, and brand constraints shall be versioned product records. | Should |

### 8.2 ICP discovery and validation

| ID | Requirement | Priority |
|---|---|---|
| PRD-ICP-001 | Viable shall allow founders to create and compare multiple ICP hypotheses. | Must |
| PRD-ICP-002 | ICP hypotheses shall distinguish users, economic buyers, decision-makers, approvers, influencers, champions, blockers, partners, contributors, maintainers, and disqualifiers. | Must |
| PRD-ICP-003 | ICP comparison shall expose problem intensity, urgency, product fit, time to value, access, proof, adoption friction, commercial viability, retention potential, strategic fit, and evidence quality. | Must |
| PRD-ICP-004 | Every ICP conclusion shall expose evidence, assumptions, contradictions, confidence, freshness, owner, and last-reviewed date. | Must |
| PRD-ICP-005 | Viable shall support anti-ICP conditions, rejected candidates, validation experiments, and explicit evidence that would change the selected ICP. | Must |
| PRD-ICP-006 | Campaigns, leads, sales outcomes, product usage, adoption, retention, repository activity, events, search, social, and customer evidence shall be able to update ICP confidence without silently rewriting the canonical ICP. | Should |
| PRD-ICP-007 | Viable shall avoid unexplained composite ICP scores and shall distinguish generated suggestions from observed evidence. | Must |
| PRD-ICP-008 | Viable shall preserve ICP history and rationale after revisions. | Must |

### 8.3 Marketability assessment

| ID | Requirement | Priority |
|---|---|---|
| PRD-MA-001 | Viable shall assess product truth, ICP clarity, audience clarity, problem urgency, positioning, offer readiness, proof, discoverability, content readiness, distribution readiness, conversion readiness, sales readiness, and measurement readiness. | Must |
| PRD-MA-002 | Every assessment result shall expose evidence, confidence, freshness, gaps, owner, and recommended verification. | Must |
| PRD-MA-003 | The interface shall avoid false precision and unexplained composite scores. | Must |
| PRD-MA-004 | A user shall be able to convert a gap into an owned task, ICP experiment, campaign, experiment, or product feedback item. | Must |
| PRD-MA-005 | Contradictory or missing evidence shall remain visible. | Must |

### 8.4 Market and signal intelligence

| ID | Requirement | Priority |
|---|---|---|
| PRD-SI-001 | Viable shall normalize evidence from supported event, website, search, social, community, repository, competitor, customer, support, and sales sources. | Must |
| PRD-SI-002 | Every signal shall preserve source, retrieval time, provenance, freshness, confidence, and access limitations. | Must |
| PRD-SI-003 | A source failure shall not be represented as a successful empty result. | Must |
| PRD-SI-004 | Users shall be able to accept, dismiss, save, tag, assign, connect, or convert signals into work. | Must |
| PRD-SI-005 | Provider content shall be treated as untrusted data and shall not direct tools, credentials, prompts, or runtime behavior. | Must |
| PRD-SI-006 | Event intelligence shall remain a bounded signal subsystem rather than the top-level product model. | Must |

### 8.5 Campaigns and assets

| ID | Requirement | Priority |
|---|---|---|
| PRD-CA-001 | Campaigns shall define one primary objective, ICP or audience, offer, message hierarchy, proof, call to action, channels, assets, owner, and success measures. | Must |
| PRD-CA-002 | Viable shall maintain canonical assets separately from channel-specific variants. | Must |
| PRD-CA-003 | Assets shall preserve campaign, ICP, audience, claims, evidence, rights, accessibility, version, approval, delivery, and performance relationships. | Must |
| PRD-CA-004 | The content studio shall support website, social, email, sales, image, carousel, and short-video production packages. | Should |
| PRD-CA-005 | Video production shall support provider-neutral briefs, scripts, storyboards, rights manifests, captions, formats, render review, and imported artifacts. | Should |

### 8.6 Website, search, and conversion

| ID | Requirement | Priority |
|---|---|---|
| PRD-WE-001 | Viable shall inventory site pages, purposes, ICPs, audiences, funnel stages, offers, and calls to action. | Should |
| PRD-WE-002 | Viable shall support crawlability, indexability, metadata, canonical, sitemap, structured-data, mobile, performance, HTTPS, and accessibility review. | Should |
| PRD-WE-003 | Recommendations shall identify affected pages, evidence, expected outcome, and verification method. | Must |
| PRD-WE-004 | Viable shall support keyword, question, topic-cluster, content-gap, internal-link, refresh, AEO, and conversion-path planning. | Should |
| PRD-WE-005 | Viable shall not promise search placement. | Must |

### 8.7 Public repository growth

| ID | Requirement | Priority |
|---|---|---|
| PRD-GH-001 | Viable shall assess repository clarity, proof, time to value, discoverability, differentiation, trust, community readiness, release discipline, adoption, sustainability, and commercial path. | Must |
| PRD-GH-002 | Viable shall support repository launch plans, asset matrices, maintainer coverage, traffic baselines, observation windows, and retrospectives. | Must |
| PRD-GH-003 | Missing GitHub access or unavailable metrics shall be distinguishable from zero activity. | Must |
| PRD-GH-004 | Viable shall prohibit fake stars, fake followers, reciprocal-star rings, spam issues, and manufactured contributions. | Must |
| PRD-GH-005 | Viable shall not guarantee GitHub Trending or top-repository placement. | Must |

### 8.8 Distribution and external action

| ID | Requirement | Priority |
|---|---|---|
| PRD-EX-001 | All publishing and outreach content shall begin as a draft. | Must |
| PRD-EX-002 | A named human shall approve externally consequential action. | Must |
| PRD-EX-003 | An adapter shall not approve its own payload. | Must |
| PRD-EX-004 | Destination identity, account ownership, approval, rate limits, retries, idempotency, failures, and delivery evidence shall be visible. | Must |
| PRD-EX-005 | Manual export or copy paths shall exist when supported API delivery is unavailable. | Must |
| PRD-EX-006 | Credential secrets shall not enter repository files, prompts, reports, screenshots, logs, diagnostics, or export packages. | Must |

### 8.9 Leads and sales support

| ID | Requirement | Priority |
|---|---|---|
| PRD-LS-001 | Viable shall preserve source, consent, campaign, medium, content, ICP fit, and attribution relationships for known contacts. | Must |
| PRD-LS-002 | Audience signals, anonymous engagement, known contacts, qualified leads, opportunities, customers, contributors, and partners shall remain distinct concepts. | Must |
| PRD-LS-003 | Suppression, unsubscribe, do-not-contact, retention, and deletion state shall be enforceable. | Must |
| PRD-LS-004 | Viable shall support account briefs, meeting preparation, objections, proof selection, follow-up, and outcome capture. | Should |
| PRD-LS-005 | CRM synchronization shall remain optional and adapter-based. | Should |

### 8.10 Measurement and learning

| ID | Requirement | Priority |
|---|---|---|
| PRD-ML-001 | Viable shall connect campaigns, assets, channels, ICPs, audiences, offers, experiments, leads, opportunities, and product changes through shared identifiers. | Must |
| PRD-ML-002 | Attribution shall always identify its model, evidence, and uncertainty. | Must |
| PRD-ML-003 | Recommendations shall link to observed evidence and a reversible next action. | Must |
| PRD-ML-004 | A learning ledger shall record evidence, decision, change, outcome, and follow-up. | Must |
| PRD-ML-005 | Users shall be able to complete campaign and launch retrospectives. | Must |
| PRD-ML-006 | Users shall be able to review how observed outcomes affect ICP confidence and product positioning. | Must |

## 9. MVP definition

The first externally testable product is not the entire roadmap. The MVP shall contain these complete slices:

1. product workspace, product truth, claims, proof, ICP discovery and validation, and marketability assessment;
2. signals inbox with sanitized event evidence and public repository evidence;
3. campaign brief and canonical asset with review and approval;
4. public repository readiness assessment and launch room;
5. manual export, outcome capture, and retrospective;
6. local backup, restore, export, diagnostics, and accessible desktop navigation.

The MVP does not require direct publishing APIs, a bundled video-generation runtime, a full CRM, or advanced multi-touch attribution.

## 10. User experience requirements

- Normal use shall not require editing JSON, writing cron expressions, inventing identifiers, or using a terminal.
- ICP comparison shall show evidence, assumptions, contradictions, disqualifiers, and factors rather than one unexplained score.
- Recommendations shall place evidence beside the recommendation.
- Draft, review, approved, scheduled, delivered, failed, and measured states shall remain distinct.
- Loading, empty, error, partial-success, offline, and recovery states shall be designed for each primary journey.
- Keyboard navigation, visible focus, semantic labels, scalable text, reduced motion, captions, and non-color status communication are release requirements.
- Simplified, standard, and high-density views should be available where information density differs materially by role.

## 11. Data and trust requirements

- Local workspace data is authoritative by default.
- Credentials belong in the operating-system credential vault or an equivalent scoped secret store.
- Provider records are evidence, not canonical product or ICP identity.
- Imported provider content is untrusted data.
- Generated ICP suggestions remain suggestions until supported and reviewed.
- Every externally consequential action requires explicit authority and durable outcome state.
- Backups and exports shall preserve product truth, ICPs, evidence, campaigns, assets, approvals, leads, and learning while excluding secrets.
- Retention and deletion controls shall be explicit for personal and outreach-related data.

## 12. Quality attributes

| Attribute | Requirement |
|---|---|
| Explainability | Scores, ICP conclusions, recommendations, claims, and attribution must show evidence and uncertainty. |
| Reliability | Partial source or delivery failures remain visible and recoverable. |
| Privacy | Local-first authority and minimal data collection are the default. |
| Security | Secrets are isolated from repository content, user-visible reports, and generated artifacts. |
| Accessibility | Primary journeys meet the accessibility requirements in section 10. |
| Portability | Manual import, export, backup, and recovery paths remain available. |
| Extensibility | Providers and production tools integrate through versioned capability contracts. |
| Maintainability | PRD, ADRs, architecture, roadmap, status, README, issues, and implementation remain traceable. |
| Testability | Prohibited transitions and authority boundaries are covered by deterministic tests. |

## 13. Success measures

### Product success

- percentage of users completing product truth, first ICP hypothesis, and first assessment;
- time to first evidence-backed ICP hypothesis;
- percentage of selected ICPs with explicit evidence, assumptions, disqualifiers, and next validation action;
- percentage of users who compare more than one credible ICP candidate before selection;
- time to first evidence-backed priority;
- percentage of recommendations with reviewed evidence;
- time from signal to owned action;
- percentage of campaigns with one primary outcome, traceable ICP or audience, claims, proof, approval, and measurement plan;
- percentage of external actions with named approval and recorded outcome;
- completion rate for launch, ICP, and campaign retrospectives;
- unfamiliar-user completion of primary journeys without maintainer intervention.

### Outcome success

Depending on the workspace, useful outcomes may include:

- a narrower, better-supported ICP and clearer anti-ICP;
- successful product evaluation or installation;
- repository adoption, dependency, contribution, or qualified inquiry;
- improved website conversion or search discovery;
- qualified leads, meetings, opportunities, or sales progress;
- clearer objections, product feedback, and validated product changes;
- reduced unsupported claims, failed delivery ambiguity, and duplicated content work.

No metric shall be interpreted without its evidence window and limitations.

## 14. Release gates

A product slice is releasable only when:

- its requirements and authority boundaries are documented;
- its related ADRs are accepted or explicitly proposed;
- implementation status is accurate in `docs/status/current-state.md`;
- secrets and imported organization-specific content are absent;
- prohibited state transitions have tests;
- loading, empty, error, partial-success, and recovery states exist;
- accessibility acceptance is complete;
- backup, export, and deletion impact is reviewed;
- user documentation and the Platinum README remain synchronized;
- an unfamiliar user completes the primary journey without developer intervention.

The ICP slice additionally requires that an unfamiliar founder can create, compare, select, and explain an ICP hypothesis without treating generated suggestions as verified evidence.

## 15. Dependencies and open product decisions

The following require explicit decisions before their implementation phase:

- Viable's own narrow launch ICP;
- evidence expectations for classifying an ICP as validated;
- ICP confidence summarization without false precision;
- single-user versus multi-user collaboration model;
- optional hosted synchronization and account model;
- pricing, packaging, licensing, and commercial distribution;
- retention defaults for contacts, outreach, provider evidence, analytics, and ICP research;
- supported first publishing adapters and their current API economics;
- supported first analytics, search, CRM, and CMS adapters;
- model-provider support and cost disclosure;
- plugin or MCP boundary after permissions and data authority are implemented;
- public installer signing, update distribution, and support commitments.

These decisions are tracked in `docs/decisions/open-decisions.md`.

## 16. Traceability

- Product model: `docs/product/product-scope.md`
- ICP model: `docs/product/icp-discovery-and-validation.md`
- Operating model: `docs/product/marketability-operating-model.md`
- Product provenance: `docs/product/provenance-and-ownership.md`
- Architecture: `docs/architecture/viable-platform.md`
- ADRs: `docs/adr/README.md`
- Product roadmap: `docs/roadmap/product-roadmap.md`
- Experience roadmap: `docs/roadmap/design-roadmap.md`
- Initial build order: `docs/roadmap/initial-build-sequence.md`
- Open decisions: `docs/decisions/open-decisions.md`
- Current state: `docs/status/current-state.md`
- Session handoff: `docs/handoff/session-context-2026-07-15.md`
- Documentation verification: `docs/reviews/documentation-verification-2026-07-15.md`
