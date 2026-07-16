# Repository Growth Domain Architectural Design

## Document control

| Field | Value |
|---|---|
| Status | Implemented internal architecture; human acceptance incomplete |
| Last reviewed | 2026-07-16 |
| Product authority | `docs/product/open-source-repository-growth.md` |
| Product requirements | `docs/product/PRD.md` |
| Platform architecture | `docs/architecture/viable-platform.md` |
| Current state | `docs/status/current-state.md` |
| Implementation issue | GitHub issue #3 |

## Purpose

This document describes the implemented architecture for public repository readiness, growth planning, governed launch coordination, manual export, and bounded retrospective learning.

Repository Growth is not a separate top-level product. It is a product-surface workflow that coordinates existing Viable authorities:

- Product Core supplies product truth, reviewed evidence, approved claims, and audience authority;
- Evidence and Signals supplies source provenance, explicit partial failure, and public repository evidence;
- Campaigns and Assets supplies approved campaign intent, canonical assets, and channel variants;
- Repository Growth owns repository-specific readiness, owned remediation work, launch-room coordination, and bounded repository outcome comparison;
- Approval and External Action remains authoritative for any future destination-bound publishing or execution;
- Measurement and Learning remains authoritative for broader attribution and cross-product learning.

## Implemented user outcome

A maintainer can:

1. import bounded public GitHub evidence;
2. distinguish observed, verified-zero, unavailable, and not-collected metrics;
3. run an explained twelve-dimension readiness assessment;
4. create prioritized owned repository work;
5. create a launch room from an approved campaign asset family;
6. verify a release checklist and maintainer coverage;
7. export a credential-free manual launch package;
8. compare compatible outcomes with a pre-launch baseline;
9. record concrete learnings and one reversible next action.

## Context ownership

### Product Core

Product Core remains authoritative for:

- canonical product identity and positioning;
- reviewed non-generated evidence;
- approved claims and claim revisions;
- selected ICP or deliberate test-audience context;
- product limitations and supported environments.

Repository Growth does not create, approve, revise, retire, or silently reinterpret Product Core claims.

### Evidence and Signals

Evidence and Signals remains authoritative for:

- source identity and provenance;
- retrieval time;
- partial and failed source state;
- evidence limitations;
- the distinction between missing access and verified zero.

The public repository collector conforms to the same failure semantics used by the bounded Signals Inbox. A failed secondary check produces partial evidence rather than an empty successful repository.

### Campaigns and Assets

Campaigns and Assets remains authoritative for:

- one primary audience and outcome;
- approved campaign claims and evidence references;
- approved canonical asset body and version;
- rights, accessibility, and disclosure requirements;
- approved LinkedIn, website, and GitHub release variants.

A launch room stores stable references to the approved asset family. It does not duplicate campaign or asset authority.

### Repository Growth

Repository Growth owns:

- public repository snapshots;
- repository-specific source limitations;
- readiness findings;
- repository growth plans and actions;
- launch checklist and maintainer coverage;
- repository metric baseline;
- manual launch package record;
- repository launch retrospective and compatible metric comparisons.

### Approval and External Action

The implemented manual export does not enter provider execution state.

It records:

- `approvedForPublishing: false`;
- `delivered: false`;
- `credentialsIncluded: false`.

Future GitHub write, social publishing, email, CMS, or community-delivery adapters require destination identity, current approval, execution evidence, failure state, and recovery contracts under Approval and External Action.

### Measurement and Learning

The implemented repository retrospective is intentionally bounded.

It may compare repository activity metrics when both baseline and outcome have compatible numeric states. It does not provide:

- general attribution;
- cross-channel causal claims;
- ICP confidence mutation;
- lead or sales qualification;
- broad experiment management;
- an organization-wide learning ledger.

Those remain part of the later Measurement and Learning slice.

## Public repository import

The implemented collector uses public unauthenticated GitHub API access.

It may collect:

- repository identity, description, homepage, topics, language, default branch, archive state, fork state, and last push time;
- README content;
- detected quick-start, demo, documentation, comparison, and limitation language;
- community-profile health evidence;
- license, security, support, contributing, code-of-conduct, issue-template, and pull-request-template presence;
- up to five recent releases;
- release notes and release assets;
- sampled release-asset download counts;
- up to one hundred contributor records;
- public stars, forks, watchers, and open-issue counts.

The collector does not claim access to:

- repository views or unique visitors;
- clones or unique cloners;
- referrals or popular content;
- private repository evidence;
- dependents or integrations beyond separately supplied evidence;
- commercial inquiries;
- GitHub write operations.

## Metric evidence model

Repository metrics use four explicit evidence states:

| State | Meaning |
|---|---|
| `observed` | A supported source or named manual observation supplied a numeric value. |
| `verified_zero` | A supported source or named manual observation explicitly verified zero. |
| `unavailable` | Supported evidence or authorization is not available. |
| `not_collected` | Collection or observation was not attempted. |

Only `observed` and `verified_zero` are numeric.

An unavailable or not-collected metric cannot carry a numeric value. This prevents missing access from becoming zero and prevents invalid baseline deltas.

## Readiness model

The deterministic assessment covers:

1. problem clarity;
2. product credibility;
3. time to value;
4. discoverability;
5. differentiation;
6. trust;
7. community readiness;
8. release discipline;
9. distribution;
10. adoption evidence;
11. sustainability;
12. commercial path.

Every finding includes:

- dimension;
- rating from zero through four;
- evidence;
- confidence;
- impact;
- effort;
- recommendation;
- owner;
- verification method.

The rating model prioritizes controllable readiness work. It does not estimate GitHub Trending likelihood, virality, sales probability, or verified adoption.

## Growth plan

A growth plan is created from findings rated below ready.

Actions are ordered by:

1. higher impact;
2. lower effort when impact is equal.

Each action has one owner, one verification method, and an explicit open, in-progress, completed, or dismissed state.

## Launch authority

A repository launch room requires:

- an imported repository snapshot;
- an approved campaign;
- an approved canonical asset belonging to that campaign;
- approved LinkedIn, website, and GitHub release variants;
- a launch-room audience matching the approved campaign audience;
- a required checklist;
- named maintainer coverage;
- a valid observation window;
- a retrospective time after the observation window.

Product Core authority is revalidated when the launch room is created and when a manual export is created.

The operation fails when:

- a referenced claim is no longer approved;
- claim revision or statement changed;
- reviewed evidence is no longer valid;
- required claim evidence is absent;
- campaign, canonical asset, or required variants are no longer approved.

## Manual export

The manual launch package contains:

- repository identity and release tag;
- source limitations;
- primary audience and desired outcome;
- observation window;
- release checklist and evidence;
- maintainer coverage;
- repository metric baseline;
- approved campaign claim and evidence references;
- approved canonical asset body and version;
- rights, accessibility, and disclosure requirements;
- approved channel variants;
- manual destination categories.

It contains no provider credentials, account session, token, destination identifier, or execution evidence.

## Retrospective comparison

The retrospective requires:

- named owner;
- summary;
- at least one learning;
- one reversible next action;
- explicit outcome metric states;
- an ended observation window.

A delta is calculated only when both baseline and outcome are numeric.

Unavailable and not-collected states remain visible and produce no numeric comparison.

## Persistence

The domain supports:

- atomic local JSON persistence for service and test profiles;
- browser-profile local storage for the current desktop workflow.

The target standalone persistence remains the transactional local database described by the platform architecture. Migration from browser-profile storage requires schema and backup review before release.

## Desktop integration

Repository Growth appears beneath Product.

The desktop workflow includes:

- loading state;
- empty repository workspace;
- successful and partial public import;
- unavailable metric state;
- archived-repository warning;
- explained assessment;
- owned plan;
- blocked launch authority;
- draft and launch-ready rooms;
- error and recovery state;
- local and offline guidance;
- manual export;
- retrospective-complete state.

It does not add a new top-level navigation product.

## Security and safety invariants

1. Public provider content remains untrusted data.
2. Repository names must use bounded `owner/repository` syntax.
3. Public import cannot become private repository access.
4. Missing access cannot become zero.
5. Activity metrics cannot be described as proven adoption.
6. Product Core claims and evidence are revalidated before launch export.
7. Manual export cannot claim publishing or delivery.
8. Credentials cannot enter repository-growth persistence or export.
9. The workflow cannot manufacture stars, forks, follows, issues, contributions, or testimonials.
10. Community participants do not become leads or sales targets without separate identity, consent, and qualification evidence.

## Validation

PR #20 passed exact-head secret scanning, TypeScript validation, build, and deterministic Node tests for the repository-growth core.

PR #21 passed exact-head:

- repository secret scanning;
- core TypeScript validation;
- desktop TypeScript validation;
- Node build and tests;
- Rust formatting;
- Rust tests;
- Tauri Debian bundle construction;
- Debian package inspection.

The CI workflow now exposes granular validation steps and retains desktop typecheck diagnostics as a failure-only artifact.

## Remaining release evidence

Issue #3 remains open for:

- hands-on keyboard review;
- hands-on assistive-technology review;
- text-scale and reflow review;
- unfamiliar-maintainer completion without intervention;
- remediation from those reviews.

No public or commercial readiness claim should be made until that evidence exists.
