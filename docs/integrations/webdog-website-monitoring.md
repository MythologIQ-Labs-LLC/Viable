# Webdog Website Monitoring Integration Assessment

## Document control

| Field | Value |
|---|---|
| Status | Implemented Stage 1 boundary |
| Last reviewed | 2026-07-16 |
| External project | `context-dot-dev/webdog` |
| Reviewed upstream revision | `13bf5e2cff9f7ee7ad62b7099f6c41575efc2c32` |
| External package version reviewed | `0.1.0` |
| External license | MIT, Copyright 2026 Context.dev |
| Viable context | Signals and Market |
| Downstream contexts | Product Core evidence review, Calendar planning, Measurement and Learning |
| Implementation issue | #29 |
| Implementation PRs | #30 and #31 |
| Architecture | `../architecture/website-watch-domain.md` |
| Third-party notice | `../../THIRD_PARTY_NOTICES.md` |

## Decision

Viable uses a hybrid absorption and integration approach.

Stage 1 is implemented as:

- Viable-owned provider-neutral Website Watch records;
- browser-safe monitoring utilities;
- strict Webdog-compatible manual JSON import;
- correlated Website Watch observations and Signals Inbox suggestions;
- generated-summary separation;
- named review synchronization;
- retention and deletion;
- reviewed Calendar follow-up;
- no live Webdog or Context.dev dependency.

Viable does not absorb the complete Webdog application.

## Implemented outcome

A founder or maintainer can:

1. create a watched public site;
2. record site-link, page-content, or product-price monitoring intent;
3. select relationship, purpose, retention, authorization, and ownership;
4. paste or select a Webdog alert JSON payload;
5. inspect explicit source health and limitations;
6. inspect bounded snapshots, hashes, differences, and generated analysis;
7. accept or dismiss the correlated signal with a named reviewer;
8. convert reviewed evidence into proposed work;
9. create a reviewed Calendar follow-up, experiment, opportunity, or approval deadline;
10. delete retained snapshot payloads or prune expired retention while preserving provenance.

## Why the fit is strong

Webdog demonstrates three evidence classes that are directly useful to Viable:

- sitemap-link changes;
- page-content changes;
- product-price and currency changes.

It also demonstrates useful patterns:

- content hashing;
- snapshot comparison;
- per-target interval intent;
- best-effort screenshots;
- explicit source errors;
- stored alerts independent of notification;
- generated change summaries;
- relevance recommendations that preserve held evidence and fail open;
- manual and scheduled execution paths.

These patterns support:

- competitor pricing and positioning monitoring;
- owned-site claim drift;
- product documentation and changelog monitoring;
- government and standards evidence;
- partner and integration changes;
- job-listing evidence;
- campaign and ICP experiment inputs;
- retrospective evidence.

## Why the full Webdog application is not absorbed

The reviewed Webdog application is built around:

- Next.js and React;
- PostgreSQL and Drizzle;
- Better Auth;
- a long-running Node worker;
- server or per-account credentials;
- Context.dev as the collection provider;
- optional AI providers;
- Slack, email, and webhook notification destinations;
- team invitations and public share links;
- Railway deployment assumptions.

Those are reasonable Webdog product choices but conflict with Viable's current boundaries:

- Viable is local first;
- Viable already owns Signals, evidence, review, destinations, Calendar, and learning authority;
- Viable must not duplicate Account, Alert, Destination, Approval, or Evidence authority;
- credentials belong behind a future OS-vault boundary;
- the base product must remain useful without a hosted database or continuously running service;
- Webdog notification delivery is not Viable external-action approval or provider-verified delivery.

A wholesale merge would add architectural duplication while retaining the Context.dev dependency.

## Implemented provider-neutral domain

Stage 1 implements:

- `WatchedSite`;
- `WatchTarget`;
- `WebsiteSnapshot`;
- `WebsiteChangeObservation`;
- `WebsiteWatchGeneratedAnalysis`;
- source registration;
- source health;
- local workspace persistence.

See `../architecture/website-watch-domain.md` for the authoritative record definitions and context ownership.

## Implemented source outcomes

Website Watch preserves:

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

Required behavior:

- a provider failure never becomes no change;
- first evidence establishes a baseline rather than proving no earlier change;
- a future failed screenshot with valid content evidence must become partial;
- configured intent is not proof of execution;
- missing evidence remains visible.

## Implemented manual import contract

Stage 1 accepts the documented Webdog outbound payload:

- type `webdog_ai.new_alerts`;
- version `1`;
- kind `new_alerts`;
- source instance URL;
- site identity;
- alert identity;
- target identity;
- title;
- optional alert kind;
- optional generated change summary;
- optional bounded diff preview;
- dashboard URL;
- optional suppression state and reason.

The import:

- accepts pasted JSON;
- accepts one local JSON file;
- limits input to 512 KiB;
- limits one import to one hundred alerts;
- rejects unsupported fields;
- rejects secret-bearing fields and values;
- rejects invalid or unsafe public URLs;
- requires alert dashboard URLs to use the source-instance origin;
- preserves Webdog provenance;
- records limitations caused by the bounded payload;
- creates Website Watch evidence and correlated Signals suggestions;
- remains usable without Webdog running.

The documented payload does not contain:

- complete previous and current snapshots;
- live source-health detail;
- screenshots;
- complete provider responses;
- the monitored page URL in every alert;
- AI provider model and prompt metadata.

Viable records those limitations rather than inventing missing evidence.

## Generated analysis

Imported AI output becomes one of:

- `generated_change_summary`;
- `generated_relevance_recommendation`.

It remains separate from evidence.

The Signals summary is built from:

- source alert title;
- bounded diff preview;
- explicit missing-diff statement when no preview is supplied.

Generated prose cannot approve, dismiss, convert, or revise evidence.

## Selective utility absorption

Viable implements provider-neutral utilities informed by the reviewed Webdog source:

- SHA-256 snapshot identity;
- bounded line differences;
- due-check calculation;
- next-due calculation;
- domain normalization;
- source-failure classification;
- best-effort partial-failure semantics;
- fail-open generated relevance posture.

The implemented line difference uses an ordered bounded longest-common-subsequence approach rather than Webdog's reviewed line-set helper. Viable still labels it bounded and does not claim semantic completeness.

The initial Node-only SHA and literal-address utilities were replaced during PR #31 with browser-safe TypeScript so the same authority can execute in the Tauri webview.

Canonical SHA-256 vectors and IPv4 and IPv6 restrictions are tested.

## Security and privacy

### Implemented URL controls

Stage 1 allows only absolute HTTP and HTTPS URLs.

It rejects:

- embedded credentials;
- credential-like query parameters;
- localhost;
- loopback;
- private IPv4 ranges;
- link-local addresses;
- metadata addresses;
- reserved literal ranges;
- private, loopback, link-local, multicast, and documentation IPv6 literals;
- unsupported schemes;
- Webdog dashboard links outside the declared source-instance origin.

A future live adapter must add:

- DNS-resolution validation;
- redirect-target validation;
- DNS-rebinding defenses;
- request timeout;
- response-size limits;
- redirect limits;
- cancellation.

### Implemented secret controls

Stage 1 rejects:

- credential-bearing field names;
- bearer tokens;
- private keys;
- common API-key and access-token formats;
- copied sessions and cookies;
- secret-like assignment text.

No provider credential is stored in:

- Product Core;
- Signals;
- Website Watch;
- Calendar;
- snapshots;
- generated analysis;
- fixtures;
- logs;
- repository files.

### Retention

Implemented retention classes are:

- ephemeral, 14 days;
- standard, 90 days;
- extended, manual deletion.

Stage 1 supports named deletion and retention pruning while retaining provenance.

## Context.dev Stage 2

A direct Context.dev adapter remains deferred.

It may later provide:

- markdown scraping;
- sitemap extraction;
- screenshots;
- product extraction;
- optional brand data.

Requirements before implementation:

- OS-vault credential references;
- explicit provider and data-handling disclosure;
- user-visible cost and cache posture;
- URL, DNS, redirect, SSRF, timeout, size, and cancellation controls;
- bounded content and screenshot storage;
- structured provider and rate-limit errors;
- deterministic fixtures independent of the live provider;
- separate live-provider validation;
- retention and deletion of screenshots;
- no automatic Product Core mutation.

## Webdog service Stage 3

A live Webdog service adapter remains deferred until Webdog exposes a stable documented integration contract for:

- sites;
- targets;
- source health;
- snapshots;
- screenshots;
- alerts;
- suppression state;
- complete diff evidence;
- pagination;
- idempotency;
- revocation;
- disconnect and deletion behavior.

Viable must not depend on Webdog's internal authenticated Next.js routes or PostgreSQL schema.

A public inbound desktop webhook listener is not the default integration because it creates network exposure, reachability, firewall, signing, replay, and credential concerns.

## Licensing and attribution

Webdog is MIT licensed.

`THIRD_PARTY_NOTICES.md` records:

- Webdog project identity;
- reviewed revision;
- package version;
- Copyright 2026 Context.dev;
- MIT permission terms;
- reviewed source paths;
- service and content boundaries.

The MIT source license does not provide:

- Context.dev service access;
- service credits;
- trademark rights;
- rights to third-party website content;
- authorization to bypass access controls, provider terms, or applicable law.

## Validation

PR #30 exact-head CI passed:

- secret scanning;
- core TypeScript;
- desktop TypeScript;
- full build and deterministic tests.

PR #31 exact-head validation passed:

- secret scanning;
- core TypeScript;
- desktop TypeScript;
- full build and deterministic tests;
- Rust formatting;
- Rust tests;
- Tauri bundle construction;
- Debian package inspection.

## Explicit Stage 1 limitations

Stage 1 does not:

- crawl websites;
- call Context.dev;
- connect to a live Webdog service;
- open a public webhook listener;
- run target schedules;
- import live screenshots;
- copy browser sessions;
- access private pages;
- send notifications;
- execute AI summaries or relevance triage;
- mutate Product Core, ICP, campaign, Calendar, or learning authority automatically;
- publish or claim delivery.

## Human acceptance

Issue #29 remains open for:

- keyboard acceptance;
- screen-reader and assistive-technology acceptance;
- unfamiliar-founder completion from watched-site creation through reviewed change and Calendar follow-up;
- remediation of accessibility, clarity, evidence, retention, failure, and recovery gaps.
