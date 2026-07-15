# Viable Experience Design Roadmap

## Design objective

Viable should make product marketability understandable and operable for a founder, product lead, marketer, seller, maintainer, or small team without requiring them to master every social platform, search system, analytics product, design suite, video generator, publishing API, and CRM.

The interface must answer five questions quickly:

1. What is true about the product?
2. What is happening in the market?
3. What should we do next?
4. What requires review or human action?
5. What changed because of the work?

## Experience principles

1. **Decisions before dashboards.** Every dashboard should lead to a clear decision or action.
2. **Evidence beside recommendations.** Scores and generated work must show their sources, confidence, and freshness.
3. **One product truth.** Content, campaigns, sales material, and video scripts should use the same capabilities, claims, proof, audiences, and terminology.
4. **Progressive disclosure.** Normal work should not require JSON, API vocabulary, cron expressions, or platform internals.
5. **Canonical first, channel second.** Users approve the underlying message before adapting it to individual platforms.
6. **Human approval is visible.** Draft, review, approved, scheduled, delivered, failed, and measured states must not blur together.
7. **Partial failure is honest.** A missing source, expired token, rejected post, or unavailable metric stays visible.
8. **Platform-neutral core.** LinkedIn, Meta, X, GitHub, ViMax, and other providers appear as adapters and destinations, not as the information architecture.
9. **Local authority.** The user can export, back up, inspect, and recover their product records, research, drafts, approvals, and outcomes.
10. **Accessible by default.** Keyboard use, visible focus, scalable text, reduced motion, captions, semantic structure, and non-color status are release requirements.

## Operating modes

| Mode | User intent | Primary outputs |
|---|---|---|
| Assess | Determine readiness and gaps | Marketability assessment, evidence, priority plan |
| Understand | Research demand, audiences, competitors, events, search, social, and repositories | Research inbox, topics, opportunities, objections |
| Create | Build campaigns, content, website assets, sales material, and video packages | Canonical assets and channel variants |
| Activate | Schedule, export, publish, capture demand, and prepare outreach | Calendar, delivery evidence, leads, follow-ups |
| Learn | Measure outcomes and improve product, message, offer, and channels | Retrospectives, experiments, learning ledger |

These modes share one product record, evidence model, campaign model, approval system, and measurement model.

## Primary navigation

```text
Home
Product
Market
Signals
Campaigns
Studio
Calendar
Leads
Sales
Analytics
Integrations
Settings
```

Public repository growth appears inside Product, Signals, Campaigns, Studio, and Analytics rather than becoming a disconnected mini-product.

## Core experiences

### Home

Home is an operating dashboard rather than a gallery of vanity charts.

It shows:

- current workspace and product;
- marketability scorecard and evidence freshness;
- the three highest-value recommended actions;
- new signals requiring triage;
- campaigns that are blocked, at risk, or ready;
- assets awaiting review;
- scheduled, delivered, and failed publications;
- new leads and overdue follow-ups;
- experiments and material performance changes;
- recent decisions and product-truth changes.

The user can switch Home between simplified, standard, and high-density views.

### Product

Product contains:

- overview and maturity;
- capabilities and limitations;
- audiences and buying roles;
- problems, outcomes, triggers, and objections;
- positioning and alternatives;
- pricing, packaging, offers, and calls to action;
- claims and proof;
- brand voice and terminology;
- website, documentation, repository, and asset inventory;
- marketability assessment;
- readiness plan.

#### Marketability assessment view

The assessment uses a dimension grid with:

- status;
- score range rather than false precision;
- confidence;
- evidence freshness;
- highest-impact gap;
- recommended next action.

Selecting a dimension opens the supporting evidence, contradictions, assumptions, tasks, and history.

#### Claims ledger

Claims are shown as:

- approved;
- unverified;
- outdated;
- conflicting;
- prohibited;
- retired.

Every generated or imported asset shows which claims it uses.

### Market

Market contains:

- audience and ICP explorer;
- category and alternative map;
- competitor records;
- search and topic landscape;
- content-gap map;
- event and community landscape;
- public repository landscape;
- opportunity themes;
- research notebooks and imported studies.

#### Audience explorer

The audience explorer separates:

- user;
- buyer;
- decision-maker;
- influencer;
- blocker;
- partner;
- contributor;
- maintainer;
- community member.

This prevents every reachable human from becoming a sales target, a distinction software occasionally struggles to maintain.

### Signals

Signals is the research inbox for:

- events;
- social posts;
- search changes;
- website changes;
- public repository changes;
- competitor releases and pricing changes;
- news and policy movement;
- customer feedback;
- sales objections;
- campaign and content performance anomalies.

Signal detail shows:

- source and retrieval time;
- provenance and original URL;
- normalized content;
- confidence and freshness;
- related product concepts;
- suggested actions;
- source failure or access limitations.

Inbox actions are:

- accept;
- dismiss;
- save;
- tag;
- assign;
- connect;
- convert to task;
- convert to campaign brief;
- convert to content brief;
- convert to product feedback;
- convert to lead or account research.

### Campaigns

Campaigns contains:

- portfolio view;
- campaign brief;
- objective, audience, offer, message, proof, and call to action;
- channel strategy;
- asset matrix;
- dependencies and readiness;
- calendar;
- approvals;
- leads and outcomes;
- retrospective.

#### Campaign brief builder

The builder follows a guided sequence:

```text
Outcome
  -> audience
  -> problem and trigger
  -> offer
  -> message hierarchy
  -> proof
  -> call to action
  -> channels
  -> assets
  -> measurement
  -> review
```

Viable warns when the campaign has multiple competing outcomes, unsupported claims, no proof, no conversion path, or no measurement plan.

#### Public repository launch room

For open-source launches, Campaigns adds:

- repository readiness;
- release checklist;
- README and quick-start freeze;
- topics and social preview;
- demo and package readiness;
- community and maintainer coverage;
- launch asset matrix;
- referral and traffic plan;
- live issue, discussion, and onboarding triage;
- launch retrospective.

### Studio

Studio contains:

- briefs;
- content atoms;
- website and SEO content;
- social content;
- email and outreach;
- sales enablement;
- images and carousels;
- video;
- templates;
- reviews and approvals;
- asset library.

#### Asset workspace

Every asset workspace includes:

- campaign and audience;
- objective and call to action;
- claims and evidence;
- canonical content;
- channel variants;
- media and rights;
- accessibility requirements;
- version history;
- comments and approvals;
- delivery and performance.

#### Channel variant comparison

Variants are compared side by side for:

- length and formatting;
- opening hook;
- audience fit;
- claim consistency;
- media requirements;
- accessibility;
- platform policy warnings;
- approval state.

#### Video production workspace

The video workspace uses stages:

```text
Brief
  -> script
  -> storyboard
  -> assets and rights
  -> production tool
  -> generation or editing
  -> render review
  -> variants
  -> approval
  -> calendar
```

It supports manual production packages first and optional adapters such as ViMax later.

ViMax appears as a production tool with:

- version and health;
- local or remote execution disclosure;
- selected LLM, image, and video providers;
- estimated cost;
- data-handling notes;
- job progress;
- output manifest;
- logs after redaction;
- retry and cancellation controls.

Render completion never changes approval state.

### Calendar

Calendar combines:

- editorial planning;
- campaign milestones;
- event opportunities;
- content review dates;
- publication schedules;
- releases;
- webinars and launches;
- experiments;
- sales follow-ups.

Views include:

- day, week, month, and agenda;
- campaign lane;
- channel lane;
- asset state;
- approval state;
- conflict and pacing warnings.

A user can open any scheduled item to see the canonical asset, destination variant, approver, credential health, and delivery evidence.

### Leads

Leads contains:

- people;
- organizations;
- opportunities;
- sources and consent;
- qualification;
- lifecycle stage;
- owner and next action;
- relationship history;
- campaign and content interactions;
- suppression and do-not-contact state.

The interface distinguishes:

- audience signal;
- anonymous engagement;
- known contact;
- qualified lead;
- active opportunity;
- customer or partner.

### Sales

Sales contains:

- account briefs;
- contact context;
- discovery preparation;
- meeting notes;
- objections;
- proof selection;
- demo plan;
- follow-up drafts;
- proposals and mutual action plans;
- win, loss, stall, and learning capture.

Sales does not become a full CRM by accident. CRM synchronization is an adapter boundary.

### Analytics

Analytics is organized around decisions:

- what is changing;
- what worked;
- what failed;
- where the funnel is leaking;
- which experiment needs a decision;
- which evidence changed the product or message.

Views include:

- marketability readiness over time;
- signal and opportunity trends;
- campaign portfolio;
- asset and channel performance;
- website and search;
- public repository growth;
- leads and pipeline influence;
- experiment decisions;
- learning ledger.

#### Public repository analytics

Repository analytics includes:

- views and unique visitors;
- referral sites and popular content;
- clones;
- release and package downloads;
- stars, watches, forks, issues, discussions, and contributors;
- dependents and integrations where available;
- README, quick-start, documentation, and demo interest;
- launch-window velocity compared with baseline;
- commercial or partnership inquiries.

“Trending likelihood” may only appear as an experimental estimate with its evidence window, comparison group, and uncertainty. It cannot be presented as a GitHub promise.

### Integrations

Integrations uses capability cards rather than a wall of logos.

Each card shows:

- capabilities;
- read and write scopes;
- account and destination identity;
- approval requirements;
- cost and rate-limit notes;
- data retention and provider use;
- connection health;
- last successful operation;
- known limitations;
- manual fallback.

Integration categories are:

- websites and CMS;
- search and analytics;
- social research;
- social publishing;
- event sources;
- GitHub and public repositories;
- CRM and lead capture;
- email and newsletters;
- design and video tools;
- storage and export.

### Settings

Settings contains:

- workspace and products;
- appearance and accessibility;
- credentials and connections;
- approvals and roles;
- privacy and retention;
- backup, restore, and export;
- local runtimes and workers;
- diagnostics;
- updates;
- advanced developer settings.

## Cross-cutting UI patterns

### Recommendation card

Every recommendation card contains:

- recommendation;
- expected outcome;
- evidence;
- confidence;
- affected product, campaign, or asset;
- effort and dependency;
- owner;
- action and verification method;
- dismiss, defer, or challenge controls.

### Evidence drawer

Evidence opens in a consistent drawer with:

- original source;
- captured excerpt or normalized record;
- URL and timestamp;
- permissions and provenance;
- freshness;
- related decisions;
- contradictions;
- retention and removal controls.

### Approval banner

The approval banner states:

- current state;
- required reviewer role;
- unresolved warnings;
- external destination;
- claims and rights requiring confirmation;
- action history.

### Failure state

Failures identify:

- what failed;
- whether other work succeeded;
- affected records;
- likely cause;
- safe retry;
- manual fallback;
- support evidence that excludes secrets.

### Empty state

Empty states explain:

- what belongs here;
- why it matters;
- the smallest useful first action;
- an example or sample workspace;
- whether a connection is optional.

## Design phases

### Design Phase A: Foundation

- semantic tokens and responsive shell;
- primary navigation;
- product workspace switcher;
- common evidence, status, recommendation, approval, and failure components;
- accessible themes and keyboard model;
- sanitized event capability integration.

### Design Phase B: Assess and understand

- Product truth;
- marketability assessment;
- readiness plan;
- Market explorer;
- Signals inbox;
- repository assessment;
- evidence drawer and source health.

### Design Phase C: Plan and create

- campaign brief builder;
- asset matrix;
- Studio shell;
- canonical asset and variant comparison;
- review queue;
- website, social, email, sales, image, and video asset workspaces.

### Design Phase D: Activate

- unified calendar;
- destination and credential health;
- export and publishing queues;
- lead capture;
- outreach approval;
- release and public repository launch room.

### Design Phase E: Learn

- analytics decision views;
- marketability trends;
- channel and asset performance;
- repository growth;
- attribution and experiments;
- retrospective and learning ledger.

### Design Phase F: Scale and specialize

- multi-product portfolio;
- role-specific dashboards;
- team approvals and assignments;
- adapter marketplace or registry;
- advanced automation with explicit policy;
- extensible reporting and local API.

## Usability acceptance

Before Viable 1.0, an unfamiliar user must be able to:

1. create a product workspace;
2. verify capabilities, audiences, claims, proof, and offers;
3. run and understand a marketability assessment;
4. review a market or repository signal;
5. create a campaign brief;
6. produce a coordinated asset family;
7. create a video production package;
8. schedule or export approved content;
9. record a lead and prepare follow-up;
10. review campaign or repository outcomes;
11. back up and export the workspace;
12. complete normal work without editing configuration files or exposing credentials.

## Design definition of done

A feature is not design-complete until:

- its user outcome and authority boundary are clear;
- loading, empty, error, partial-success, and offline states exist;
- keyboard and screen-reader behavior is specified;
- text scaling and reduced motion are supported;
- permissions and approval state are visible;
- secret-bearing fields cannot leak into ordinary views, exports, logs, or screenshots;
- the documentation and current-state record are updated;
- the workflow has been tested with someone unfamiliar with its implementation.
