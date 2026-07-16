# Webdog Website Monitoring Integration Assessment

## Document control

| Field | Value |
|---|---|
| Status | Accepted Stage 1 integration direction |
| Last reviewed | 2026-07-16 |
| External project | `context-dot-dev/webdog` |
| External license | MIT, Copyright 2026 Context.dev |
| External package version reviewed | `0.1.0` |
| Viable context | Signals and Market |
| Downstream contexts | Product Core evidence, Calendar follow-up, Measurement and Learning |
| Related architecture | `../architecture/viable-platform.md` |
| Related safety policy | `../governance/research-and-outreach-safety.md` |

## Decision

Viable should use a hybrid absorption and integration approach.

Viable will:

- absorb Webdog's useful monitoring-domain patterns into Viable-owned, provider-neutral domain records;
- selectively adapt small MIT-licensed pure utilities when doing so is safer and clearer than reimplementation;
- preserve the upstream MIT copyright and permission notice for copied or substantially adapted code;
- add optional Webdog-compatible and Context.dev-backed adapters behind Viable ports;
- keep website monitoring inside Signals and Market;
- allow reviewed website-change evidence to become proposed work, experiments, campaign inputs, Calendar follow-ups, and retrospective evidence.

Viable will not:

- merge the full Webdog application into the Viable repository or runtime;
- make Webdog, Context.dev, Next.js, PostgreSQL, Better Auth, Railway, Resend, Slack, or a hosted worker mandatory for the base product;
- copy Webdog branding, product identity, hosted-account assumptions, notification destinations, authentication model, database schema, or deployment model into Viable authority;
- treat an AI summary as evidence;
- treat a detected change as automatically relevant, approved, actionable, or externally deliverable;
- open a public webhook listener from the desktop as the initial integration;
- store Context.dev, Webdog, OpenAI, Resend, Slack, or webhook credentials in Product Core, Signals, Calendar, evidence records, packages, logs, screenshots, fixtures, or repository files.

## Why the fit is strong

Webdog monitors three evidence classes that are directly useful to Viable:

1. sitemap link changes;
2. page-content changes represented as clean markdown and line-level differences;
3. product-price and currency changes.

It also demonstrates useful supporting behavior:

- content hashing and snapshot comparison;
- scheduled checks with per-target intervals;
- best-effort screenshots that do not invalidate otherwise successful content checks;
- explicit per-target error state;
- persisted alerts independent of outbound notification;
- optional AI change summaries;
- optional relevance triage that preserves suppressed alerts and fails open;
- manual and scheduled execution paths;
- Slack, email, and webhook notification routes;
- managed or user-supplied Context.dev access.

Those capabilities support Viable use cases such as:

- competitor-pricing changes;
- competitor positioning and offer changes;
- product documentation and changelog monitoring;
- government and standards-page changes;
- job-listing changes that indicate market movement;
- partner and integration-page changes;
- Viable-owned website claim drift;
- launch-page and repository-documentation consistency;
- evidence collection for ICP experiments and campaign retrospectives.

## Why the full application should not be absorbed

The reviewed Webdog application is a hosted or self-hosted multi-user web application built around:

- Next.js and React;
- PostgreSQL and Drizzle;
- Better Auth sessions and account membership;
- a long-running Node worker and cron expression;
- server-managed or per-account API keys;
- Context.dev as the scraping, extraction, screenshot, product, and brand provider;
- optional OpenAI or Vercel AI Gateway summaries;
- Slack, Resend email, and generic webhook notification destinations;
- public share links and team invitations.

Those are valid Webdog product choices, but importing them wholesale would conflict with Viable's current boundaries:

- Viable is local first and single-user authoritative by default;
- Viable already owns Signals, source health, evidence provenance, review, proposed work, destinations, Calendar, and learning records;
- Viable must not create duplicate Account, Alert, Destination, Approval, or Evidence authority;
- Viable credentials belong behind a future vault boundary rather than inside domain rows;
- Viable's base product must remain useful without a hosted database or continuously running service;
- Viable external action requires named approval and evidence semantics that Webdog notifications do not provide.

A wholesale merge would therefore add substantial architectural duplication while still retaining the Context.dev service dependency.

## Context ownership

### Signals and Market owns website monitoring

Website monitoring belongs in Signals and Market because its primary output is externally observed evidence.

Signals and Market should own:

- watched-site identity;
- watch target;
- provider-neutral check schedule intent;
- source health;
- snapshot evidence;
- content, link, and price observations;
- diff evidence;
- screenshot references;
- change alerts;
- relevance review;
- conversion to proposed work or related records.

### Product Core receives evidence, not automatic truth changes

Reviewed website observations may support:

- new evidence records;
- contradiction evidence;
- claim-review reminders;
- ICP hypothesis evidence;
- marketability-assessment inputs.

They may not silently change:

- approved product claims;
- selected ICP;
- pricing;
- positioning;
- capabilities;
- limitations.

### Calendar is downstream

A reviewed website change may create:

- an approval deadline;
- an experiment;
- a campaign task;
- a follow-up;
- an event opportunity;
- a source-revalidation reminder.

Calendar does not own the website observation itself.

### Measurement and Learning consumes reviewed outcomes

A retrospective may cite website-change evidence and record what changed because of it.

An AI summary or unreviewed alert is insufficient evidence for a canonical learning decision.

## Proposed provider-neutral domain

### Watched site

A watched-site record should contain:

- stable local identifier;
- workspace identifier;
- display name;
- canonical URL;
- normalized domain;
- ownership classification: owned, competitor, partner, regulator, community, or other;
- purpose;
- sensitivity and retention classification;
- created and updated times;
- active or disabled state.

### Watch target

Initial target kinds should mirror the useful Webdog concepts without importing Webdog identifiers:

- `site_links`;
- `page_content`;
- `product_price`.

A target should contain:

- watched-site identifier;
- target URL when applicable;
- optional link scope: added, removed, or both;
- watch note;
- enabled state;
- requested minimum check interval;
- next-due intent;
- owner;
- source adapter identifier;
- retention policy;
- review requirements.

### Website snapshot

A snapshot should contain:

- target identifier;
- evidence kind;
- observed URL or domain;
- retrieved time;
- provider;
- provider request or correlation identifier when available;
- content hash;
- normalized payload reference;
- screenshot reference when available;
- limitations;
- retention and deletion metadata.

Large markdown and screenshots should use bounded local artifact storage rather than unlimited inline domain fields.

### Website change observation

A change observation should contain:

- previous and current snapshot identifiers;
- change kind;
- added and removed link counts;
- bounded line-diff preview;
- total added and removed lines;
- previous and current price and currency when applicable;
- evidence state;
- confidence;
- limitations;
- review state;
- optional generated summary stored separately from evidence;
- optional relevance recommendation stored separately from human review.

## Evidence and source outcomes

The adapter should expose explicit outcomes consistent with existing Signals behavior:

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

A failed screenshot with successful page content should be `partial`, not a failed content check.

A failed provider request must never become `verified_no_change`.

An absent prior snapshot establishes a baseline. It does not prove that no prior change occurred.

## AI summary and relevance triage

Webdog's fail-open relevance-triage pattern is worth preserving conceptually:

- every detected change remains stored;
- generated summaries remain distinguishable from source evidence;
- a relevance recommendation may reduce interruption but may not delete evidence;
- triage failure surfaces the change rather than suppressing it;
- human review remains authoritative for conversion to Product Core evidence, proposed work, campaigns, or Calendar entries.

Viable should name the generated records explicitly:

- `generated_change_summary`;
- `generated_relevance_recommendation`.

Neither is a reviewed evidence record by itself.

## Stage 1 integration

Stage 1 should implement the provider-neutral domain and a Webdog-compatible manual import.

### Manual import contract

The documented Webdog outbound webhook payload can seed the first import format:

- event type and version;
- source instance URL;
- site identity;
- alert identifier;
- target identifier;
- title;
- generated change summary when present;
- bounded diff preview;
- source dashboard URL.

Because that payload does not include the complete previous and current snapshots, screenshot evidence, source-health detail, or full provider response, Viable must classify the import as bounded external evidence with explicit limitations.

The import should:

- accept pasted or file-based JSON;
- validate schema version and required fields;
- reject credentials and private headers;
- preserve the Webdog source and source-instance reference;
- create source health and website-change signal records;
- mark AI summaries as generated;
- require named review before creating Product Core evidence or proposed work;
- remain usable when Webdog is not running.

### Selective code adaptation

Stage 1 may adapt or reimplement small pure helpers such as:

- line-diff preview;
- SHA-256 content hashing;
- due-check calculation;
- next-due calculation after success;
- domain normalization;
- provider-error classification.

Any copied or substantially adapted Webdog code must retain the MIT notice in a third-party notice file and in source headers where practical.

The current Webdog line-diff helper uses line-set membership rather than ordered edit distance. Viable should not describe it as a complete semantic or positional diff. A future implementation may use a stronger bounded diff algorithm while preserving explicit limits.

## Stage 2 Context.dev adapter

A direct Context.dev adapter may provide:

- markdown scraping;
- sitemap extraction;
- screenshots;
- product extraction;
- optional brand data.

It must be optional and provider neutral.

Requirements:

- credential reference through the future OS-vault boundary;
- no key in workspace data;
- user-visible provider, request purpose, data handling, cost, cache, and retention;
- explicit rate-limit and failure outcomes;
- cancellation and timeout;
- URL validation and SSRF controls;
- bounded content and screenshot storage;
- fresh versus cached retrieval recorded honestly;
- no automatic Product Core mutation;
- deterministic fixtures that do not require a live provider;
- live-provider tests kept separate from base CI.

## Stage 3 Webdog service adapter

A service adapter may be added when Webdog exposes a documented stable integration contract for reading:

- sites;
- targets;
- source health;
- snapshots;
- screenshots;
- alerts;
- suppression state;
- full diff evidence.

Until then, Viable should not depend on Webdog's internal authenticated Next.js routes or database schema.

A future service adapter should prefer:

- documented versioned API;
- outbound signed webhook plus follow-up retrieval;
- explicit account and workspace mapping;
- least-privilege token scopes;
- revocation;
- pagination;
- idempotency;
- retry and backoff;
- source deletion and disconnect behavior.

A desktop inbound webhook listener is not the default because it introduces network exposure, firewall complexity, public reachability assumptions, and additional credential handling.

## Security and privacy requirements

### URL safety

Website monitoring can become an SSRF and local-network discovery vector.

Adapters must:

- allow only supported schemes;
- reject credentials embedded in URLs;
- reject localhost, loopback, link-local, metadata-service, private-network, and unsupported address ranges unless a separately approved local-monitoring mode exists;
- validate every redirect target;
- enforce size, time, and redirect limits;
- avoid arbitrary file, FTP, browser-extension, and custom schemes.

### Authorization and acceptable use

The user must confirm a legitimate monitoring purpose.

Viable must not support:

- credentialed page access through copied browser sessions;
- bypassing access controls;
- monitoring private accounts without authorization;
- surveillance of individuals;
- scraping prohibited personal data;
- evading robots, provider terms, or legal restrictions;
- high-frequency abusive crawling.

### Sensitive content

Snapshots and screenshots may contain:

- personal data;
- pricing or commercial information;
- copyrighted content;
- tracking identifiers;
- hidden or irrelevant page material.

Viable must provide:

- explicit retention;
- deletion;
- bounded storage;
- artifact provenance;
- export behavior;
- redaction where appropriate;
- a safe preview rather than unlimited content duplication.

### Generated analysis

AI summaries and relevance recommendations must record:

- provider and model when used;
- generated status;
- source observations;
- prompt purpose;
- time;
- uncertainty;
- failure behavior.

Generated analysis must never replace the underlying diff or evidence state.

## Notification boundary

Webdog's Slack, email, and webhook delivery is not part of the initial Viable integration.

Viable already distinguishes:

- signal ingestion;
- proposed work;
- Calendar scheduling;
- named external-action review;
- manual activation;
- delivery evidence.

A Webdog notification says that Webdog attempted to notify a configured destination. It does not prove that Viable reviewed the change or approved any marketability action.

Future notification integration may import Webdog delivery evidence as source-operational evidence only.

## Licensing and attribution

Webdog is reviewed under the MIT License.

When Viable copies or substantially adapts Webdog code, it must:

- include the Webdog copyright and MIT permission notice;
- identify the adapted source path and reviewed revision in a third-party notice record;
- preserve upstream attribution without implying endorsement;
- avoid copying Webdog logos, screenshots, brand identity, marketing copy, or Context.dev trademarks as Viable assets;
- continue treating Context.dev SDK and service terms separately from the Webdog source-code license.

The MIT license permits modification and redistribution of the code. It does not grant free Context.dev service access, trademark rights, or rights to third-party page content collected through the service.

## Rejected alternatives

### Merge Webdog wholesale into Viable

Rejected because it duplicates contexts, changes the local-first runtime, imports hosted authentication and database assumptions, expands secret handling, and still requires Context.dev for its core collection functions.

### Make Webdog a required sidecar

Rejected because the base Signals workflow must remain useful without a continuously running hosted or local service.

### Treat Webdog notifications as Viable external-action delivery

Rejected because website-change alerts are incoming evidence, not approved outbound marketability action.

### Depend on internal Webdog API routes

Rejected until a stable, documented, versioned external contract exists.

### Start with a public desktop webhook listener

Rejected because a file or pull-based import is safer and simpler for the initial local-first integration.

## Implementation sequence

1. Add provider-neutral Website Watch domain types and source port under Signals and Market.
2. Add deterministic snapshot, diff, source-health, and failure-state tests.
3. Add strict Webdog webhook-payload JSON import with generated-summary separation.
4. Add Signals desktop workflow for watched sites, targets, changes, evidence, review, and proposed-work conversion.
5. Add third-party notices for any adapted Webdog code.
6. Validate accessibility and unfamiliar-user completion.
7. Evaluate a direct Context.dev adapter with OS-vault credentials and live-provider validation outside base CI.
8. Evaluate a Webdog service adapter only after a documented stable API exists.

## Exit criteria for Stage 1

- website-change records remain inside Signals and Market;
- no duplicate Alert, Destination, Approval, Evidence, Product Core, or Calendar authority exists;
- Webdog-compatible JSON import is strict, versioned, credential-free, and fail-closed;
- AI summaries remain generated suggestions;
- missing or failed checks do not become no-change evidence;
- screenshots and full content are bounded and provenance-bearing;
- a reviewed change can become proposed work or a Calendar follow-up;
- Product Core and ICP records cannot be silently changed;
- copied or adapted code has complete MIT attribution;
- deterministic CI requires no live Context.dev or Webdog service;
- hands-on accessibility and unfamiliar-user acceptance are completed before the implementation issue closes.

## Current conclusion

Webdog is a strong source and design reference for Viable's future website and competitor monitoring capability.

The correct architectural move is not to turn Viable into a second Webdog deployment. It is to absorb the durable monitoring mechanics, preserve licensing, and integrate Webdog or Context.dev as optional evidence providers inside Viable's existing Signals, review, Calendar, and learning loop.
