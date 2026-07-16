# Website Watch Domain Architecture

## Document control

| Field | Value |
|---|---|
| Status | Implemented Stage 1 architecture |
| Last reviewed | 2026-07-16 |
| Product context | Signals and Market |
| Downstream contexts | Product Core evidence review, Calendar planning, Measurement and Learning |
| Implementation issues | #29 |
| Implementation PRs | #30 and #31 |
| External reference | `context-dot-dev/webdog` |
| External license | MIT, Copyright 2026 Context.dev |

## Purpose

Website Watch gives Viable a bounded, provider-neutral way to record public website-monitoring intent, import website-change evidence, review that evidence, and convert reviewed observations into owned work or Calendar planning.

It supports use cases such as:

- owned-site claim drift;
- competitor pricing and positioning changes;
- partner and integration-page changes;
- documentation and changelog changes;
- job-listing changes that suggest market movement;
- government and standards-page changes;
- public launch-page consistency;
- evidence for ICP experiments, campaigns, and retrospectives.

Website Watch is not a surveillance subsystem, browser-session copier, private-page scraper, notification delivery service, or second Product Core.

## Context ownership

### Signals and Market owns

- watched-site identity;
- watch-target intent;
- provider and source registration;
- source-health outcomes;
- snapshots and hashes;
- bounded differences;
- screenshot references when a future provider supplies them;
- website-change observations;
- generated change summaries and relevance recommendations;
- named evidence review;
- retention and deletion metadata;
- conversion into Signals Inbox suggestions and proposed work.

### Product Core owns

- canonical product truth;
- claims and reviewed evidence;
- ICP hypotheses and validation authority;
- pricing, positioning, offer, and limitation records.

A reviewed website observation may be proposed as Product Core evidence or a contradiction. It cannot silently revise Product Core.

### Calendar and Approval owns

- planning entries created from reviewed website observations;
- follow-up, experiment, opportunity, and approval-deadline timing;
- ownership and timezone;
- later external-action approval if the planned work becomes an external action.

A watch target's requested interval is monitoring intent. It is not a Calendar entry, an executed job, or proof that a check occurred.

### Measurement and Learning owns

- retrospective references to reviewed website observations;
- resulting decisions, uncertainty, and reversible next actions.

Website Watch does not calculate attribution or mutate the learning ledger automatically.

## Core records

### WatchedSite

A `WatchedSite` records:

- stable local identity;
- workspace identity;
- display name;
- canonical public URL;
- normalized domain;
- ownership classification;
- legitimate monitoring purpose;
- explicit authorization confirmation;
- retention class;
- named owner;
- active or disabled state;
- creation and update time.

Ownership classifications are:

- owned;
- competitor;
- partner;
- regulator;
- community;
- other.

Authorization confirmation means the user has affirmed a legitimate public-monitoring purpose. It is not a legal conclusion or permission to bypass access controls.

### WatchTarget

A `WatchTarget` records:

- watched-site relationship;
- target kind;
- target URL where applicable;
- link scope where applicable;
- watch note;
- enabled state;
- requested minimum interval;
- next-due intent;
- adapter identifier;
- retention class;
- mandatory review requirement.

Implemented target kinds are:

- `site_links`;
- `page_content`;
- `product_price`.

Stage 1 can record targets but does not run them against a live provider.

### WebsiteSnapshot

A `WebsiteSnapshot` records:

- provider;
- watched site and target;
- snapshot kind;
- observed URL;
- retrieval time;
- correlation reference;
- SHA-256 content identity;
- bounded payload reference;
- optional screenshot reference;
- limitations;
- retention class;
- deletion deadline;
- explicit deletion actor and time.

Deleting a snapshot payload preserves the record identity and observation relationship so provenance does not disappear with retained content.

### WebsiteChangeObservation

An observation records:

- previous and current snapshot relationships;
- source and external alert identity;
- change kind;
- bounded diff preview;
- optional line, link, price, and currency details;
- evidence state;
- confidence;
- limitations;
- review state;
- named reviewer and review time;
- generated-analysis relationships;
- observed and created times.

Implemented change kinds are:

- links added;
- links removed;
- page content;
- product price;
- external alert;
- no change;
- baseline.

### WebsiteWatchGeneratedAnalysis

Generated analysis is stored separately from observations.

Implemented generated kinds are:

- generated change summary;
- generated relevance recommendation.

Generated analysis always retains:

- provider;
- optional model;
- generation time;
- limitations;
- explicit non-evidence presentation.

Generated prose cannot become reviewed evidence merely because it is fluent or useful.

## Source outcomes

Website Watch preserves these source outcomes:

- `success_change_detected`;
- `verified_no_change`;
- `partial`;
- `unavailable`;
- `rate_limited`;
- `authentication_failed`;
- `validation_failed`;
- `transport_failed`;
- `offline`;
- `cancelled`.

### Required semantics

- A source failure never becomes verified no change.
- The first snapshot establishes a baseline and cannot prove no earlier change.
- A failed screenshot with valid content evidence must become partial, not failed.
- Missing screenshot evidence must remain visible.
- A configured target does not imply a source check.
- A successful provider response with no change is distinct from unavailable access.
- Cancellation is distinct from transport failure.

## Implemented Webdog import

Stage 1 implements strict manual import of Webdog's documented outbound alert payload:

- type `webdog_ai.new_alerts`;
- version `1`;
- kind `new_alerts`;
- source instance URL;
- site identity;
- one to one hundred alerts;
- alert and target identity;
- title;
- optional alert kind;
- optional generated summary;
- optional bounded diff preview;
- dashboard URL;
- optional suppression state and reason.

The parser:

- rejects unknown fields;
- rejects credential-bearing field names;
- rejects secret-like values;
- limits input to 512 KiB;
- accepts pasted JSON or one local JSON file;
- requires alert dashboard URLs to use the declared source-instance origin;
- preserves explicit payload limitations;
- creates stable correlation identities;
- creates Website Watch observations and ordinary Signals Inbox suggestions from the same validated input.

Signals summaries use the source title and bounded diff evidence. Imported AI summaries are never substituted for the evidence summary.

## Review synchronization

A Webdog import creates:

1. a suggested Website Watch observation;
2. a correlated suggested Signals Inbox record.

The Signals record contains the Website Watch observation identifier.

Named acceptance or dismissal from Signals synchronizes the observation review state. Calendar planning is available only when both records are reviewed.

This preserves one user-facing review journey without collapsing the richer Website Watch evidence model into the generic Signals record.

## Calendar handoff

A reviewed website observation can create one of these planning entries:

- follow-up;
- experiment;
- event opportunity;
- approval deadline.

The Calendar entry retains the Website Watch observation identifier as the related record.

The handoff does not:

- grant external-action approval;
- publish content;
- notify an external destination;
- assert provider verification;
- revise Product Core;
- create a retrospective automatically.

## Security boundaries

### URL validation

Stage 1 accepts only absolute HTTP and HTTPS URLs.

It rejects:

- embedded username or password values;
- credential-like query parameters;
- localhost;
- loopback addresses;
- private IPv4 ranges;
- link-local ranges;
- cloud metadata addresses;
- reserved literal address ranges;
- private, link-local, loopback, multicast, and documentation IPv6 literals;
- unsupported schemes.

The implementation is browser-safe and has no Node runtime dependency in the desktop webview.

A future live adapter must also perform DNS resolution and redirect-target validation because hostname validation alone cannot prevent DNS rebinding or redirects into private networks.

### Secret handling

Website Watch records, Signals records, packages, screenshots, logs, fixtures, and repository files must not contain:

- Context.dev API keys;
- Webdog credentials;
- browser cookies or copied sessions;
- authorization headers;
- private keys;
- Slack, Resend, OpenAI, or webhook secrets.

A future live adapter must use an OS-vault credential reference and must never persist the secret value in domain records.

### Content and legal boundaries

Public accessibility does not imply unrestricted copying, retention, republication, or model-training rights.

Future live collection must respect:

- applicable law;
- provider terms;
- robots and rate-limit policies;
- access controls;
- copyright and database rights;
- retention and deletion requirements;
- legitimate user purpose.

## Retention and deletion

Implemented retention classes are:

- ephemeral, default deletion after 14 days;
- standard, default deletion after 90 days;
- extended, manual deletion.

Stage 1 supports:

- explicit snapshot-payload deletion;
- named deletion actor;
- retention pruning;
- preserved provenance after content deletion.

Future screenshot-bearing adapters must remove screenshot access together with snapshot payload deletion.

## Provider neutrality

The core does not require:

- Webdog;
- Context.dev;
- Next.js;
- PostgreSQL;
- Better Auth;
- Railway;
- Resend;
- Slack;
- a hosted worker;
- a public webhook endpoint.

Implemented Stage 1 uses Webdog-compatible manual import only.

Future adapters may include:

- Context.dev live collection;
- a documented Webdog service API;
- another authorized website evidence provider;
- a local collection worker after security and release requirements are met.

## External-source and licensing posture

Webdog is MIT licensed. Viable records reviewed upstream provenance in `THIRD_PARTY_NOTICES.md`.

The implemented utilities are provider-neutral and browser-safe. Any copied or substantially adapted upstream source must retain the Webdog copyright and MIT permission notice.

The MIT source license does not provide:

- Context.dev service access;
- service credits;
- trademark rights;
- authorization to copy third-party website content;
- permission to bypass access controls or provider terms.

## Persistence

Reusable core persistence uses atomic local JSON storage.

The desktop prototype stores Website Watch workspace state in the local browser profile under the active Product workspace.

Hosted synchronization, team authority, backup, restore, and cross-version migration guarantees remain release-foundation work.

## Implemented validation

PR #30 validates:

- SHA-256 identity;
- bounded ordered differences;
- target due calculations;
- public URL restrictions;
- secret rejection;
- Webdog schema and source-origin validation;
- generated-analysis separation;
- first-snapshot baseline semantics;
- source failure classification;
- named review;
- snapshot deletion.

PR #31 validates:

- canonical SHA-256 vectors;
- browser-safe dependency graph;
- private IPv4 and IPv6 rejection;
- public IPv6 handling;
- Signals and Website Watch synchronization;
- reviewed Calendar handoff;
- responsive presentation;
- reduced-motion behavior;
- Tauri bundle construction;
- Debian package inspection.

## Explicitly not implemented

- live website crawling;
- Context.dev execution;
- Webdog service synchronization;
- public inbound webhook listener;
- screenshots from a live provider;
- automatic scheduled worker execution;
- browser-session copying;
- private-page scraping;
- automatic AI triage execution;
- automatic Product Core or ICP mutation;
- direct publishing or notifications;
- provider-verified delivery;
- hosted collaboration.

## Human acceptance gates

Issue #29 remains open for:

- hands-on keyboard review;
- screen-reader and assistive-technology review;
- unfamiliar-founder completion from watched-site creation through reviewed change and Calendar follow-up;
- remediation of accessibility, clarity, evidence, retention, failure, and recovery gaps.
