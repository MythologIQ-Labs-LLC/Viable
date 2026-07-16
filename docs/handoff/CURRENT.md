# Viable Current Session Handoff

## Purpose

This is the restart entrypoint for Viable work. It preserves the context required to continue without relying on conversation memory.

Detailed authority remains in the PRD, accepted ADRs, domain architecture, current state, roadmap, open decisions, issues, and merged pull requests.

## Repository state

- Repository: `MythologIQ-Labs-LLC/Viable`
- Product owner: MythologIQ Labs, LLC
- Product lead: Kevin R. Knapp
- Latest merged implementation PR: #24 at `64419fa83fa485a77a255715f9a2de2d7ccc253b`
- Current maturity: internal Slice 5 provider-neutral Video Production and Studio workflow on `main`
- Automated validation: secret scan, core and desktop TypeScript, 67 Node tests, Rust formatting, Rust tests, Tauri bundle, and Debian package inspection
- Next implementation slice: issue #7, Calendar, Manual Activation, Outcome Capture, and Learning
- Human acceptance remains open for issues #2, #5, #6, #3, and #4

## Read before acting

Read these in order:

1. `README.md`
2. `docs/handoff/CURRENT.md`
3. `docs/product/PRD.md`
4. `docs/product/icp-discovery-and-validation.md`
5. `docs/adr/README.md`
6. `docs/architecture/viable-platform.md`
7. `docs/architecture/icp-domain.md`
8. `docs/architecture/repository-growth-domain.md`
9. `docs/architecture/video-production-domain.md`
10. `docs/status/current-state.md`
11. `docs/roadmap/initial-build-sequence.md`
12. `docs/decisions/open-decisions.md`
13. the selected GitHub issue and all linked merged PRs

The repository and current GitHub state are authoritative. Conversation history may explain intent but cannot override accepted documents.

## Product definition

Viable is a local-first marketability operating system for products, public repositories, founders, maintainers, and small product teams.

It connects:

- product truth;
- ICP discovery and validation;
- marketability assessment;
- market and opportunity evidence;
- campaigns and canonical assets;
- public repository growth;
- governed video production;
- approval and external action;
- future relationships, sales, measurement, and learning.

Viable is not a social scheduler, content generator, event monitor, repository scorecard, video generator, CRM, or analytics dashboard with unrelated features attached. Each workflow shares Product Core claims, reviewed evidence, audience authority, campaigns, approvals, and explicit outcomes.

## Marketability loop

```text
Establish product truth
  -> identify and validate the proper ICP
  -> assess marketability
  -> understand market and opportunity evidence
  -> choose positioning and offers
  -> create canonical assets
  -> adapt assets to channels and production formats
  -> assess product surfaces such as public repositories
  -> review and approve external action
  -> schedule and activate manually or through supported adapters
  -> capture demand and delivery evidence
  -> measure outcomes
  -> refine product, ICP, message, offer, repository, asset, and channel plan
```

Event Intelligence is one bounded signal subsystem. Repository Growth is one Product-integrated surface workflow. Video Production is one Campaign-linked production workflow. None becomes top-level product authority.

## Durable authority boundaries

- Product Core owns canonical product truth, claims, reviewed evidence, and ICP hypotheses.
- Campaigns owns approved campaign intent, canonical assets, and channel variants.
- Repository Growth owns repository assessment, owned growth planning, launch-room state, bounded baselines, and retrospectives.
- Video Production owns reviewed video briefs, manual production packages, imported run evidence, render review, and platform-variant review.
- Issue #7 must own authoritative Calendar, activation, delivery evidence, outcome capture, and broader learning records.
- Generated suggestions remain distinct from reviewed evidence.
- A generator, collector, scheduler, adapter, or production tool cannot approve its own output.
- Render completion does not equal approval.
- Approval does not equal scheduling, publishing, delivery, or measurement.
- Missing access or unavailable metrics do not become zero.
- Manual export does not equal external action.
- Provider content and imported manifests are untrusted data.
- Core workflows remain useful without hosted Viable infrastructure or a required LLM.
- Viable does not support spam, fake growth, surveillance, unsupported claims, bypassed access, or manufactured adoption.

## Ownership and migration

Viable is a MythologIQ Labs, LLC product created and led by Kevin R. Knapp.

The event-intelligence foundation originated as Event Radar. Viable is the authoritative expanded product.

Migration remains selective and fail-closed. Never import:

- external-organization ownership, branding, governance, licensing, or compliance claims;
- credentials, cookies, sessions, webhooks, tokens, or secret-bearing files;
- real external workspaces, channels, accounts, tenant IDs, destinations, or private URLs;
- private prompts, operational evidence, logs, reports, screenshots, exports, or confidential fixtures;
- old package identities, signing identities, release destinations, or update channels;
- ambiguous material whose ownership, privacy, licensing, or operational meaning is unclear.

## Accepted architecture decisions

- ADR-0001: local-first workspace authority.
- ADR-0002: provider-neutral capability adapters.
- ADR-0003: Product Core claims-ledger authority.
- ADR-0004: evidence provenance and explicit partial failure.
- ADR-0005: named human approval for external action.
- ADR-0006: marketability-loop authority and bounded Event Intelligence.
- ADR-0007: Product Core ownership of ICP hypotheses and validation.

Repository Growth and Video Production implement these accepted decisions. Do not create duplicate claim, campaign, approval, or ICP authority downstream.

## Initial build order

| Sequence | Issue | Workstream | State |
|---|---|---|---|
| Foundation | #1 | Sanitized Event Radar migration | Implemented and closed |
| Slice 1 | #2 | Product Truth, ICP, Assessment | Implemented; human acceptance open |
| Slice 2 | #5 | Signals Inbox | Implemented; human acceptance open |
| Slice 3 | #6 | Campaign Brief and Canonical Asset | Implemented; human acceptance open |
| Slice 4 | #3 | Repository Growth and Launch | Implemented; human acceptance open |
| Slice 5 | #4 | Video Production and ViMax package | Implemented Stage 1; human acceptance and issue #7 handoff open |
| Slice 6 | #7 | Calendar, Activation, Outcomes, Learning | Next implementation slice |

## Implemented through Slice 5

### Product Core

- local product workspace and truth revision;
- reviewed evidence and approved claims;
- ICP hypotheses, comparison, selection, history, disqualifiers, contradictions, and experiments;
- explained marketability assessment and owned actions;
- Home and Product desktop workflow.

### Signals and Market

- bounded Event Intelligence;
- public GitHub evidence;
- strict manual import;
- source health and explicit partial failure;
- provenance, freshness, confidence, and limitations;
- named review and proposed-work conversion.

### Campaigns and Studio

- Product Core-traceable campaign briefs;
- selected ICP or deliberate test audience;
- canonical assets and versions;
- LinkedIn, website, and GitHub release variants;
- rights, accessibility, disclosures, comments, and review;
- claim-impact invalidation;
- credential-free manual exports.

### Repository Growth and Launch

- bounded public GitHub import;
- twelve explained readiness dimensions;
- owned growth plans;
- campaign-linked launch rooms;
- maintainer coverage and release checklist;
- explicit metric evidence states;
- manual launch export;
- baseline and bounded retrospective.

### Video Production and Studio

- approved campaign-linked canonical script selection;
- exact script version and Product Core authority snapshot;
- video briefs with storyboard, rights, consent, accessibility, disclosures, provider plans, costs, and data handling;
- named brief review;
- pinned ViMax `v1.1.0`, revision `1f8f650`, Python 3.12+, MIT compatibility record;
- provider-neutral manual package;
- blank-credential Script2Video packet;
- structured stage, failure, artifact, hash, source, and redacted-log import;
- completed, partial, failed, and cancelled render states;
- named render review;
- separately reviewed LinkedIn, Instagram Reels, YouTube Shorts, and website variants;
- current authority revalidation at asynchronous boundaries;
- packaged Studio workflow with explicit empty, offline, blocked, failure, recovery, and invalidation states.

## ViMax decision

OD-011 is resolved for Stage 1.

ViMax is optional and removable. The implemented adapter:

- does not install or execute ViMax;
- does not bundle Python;
- does not invoke providers;
- does not store or inject credentials;
- does not schedule, publish, deliver, or measure media;
- does not claim Windows or Linux execution testing;
- does not claim macOS support.

The upstream project lists Windows and Linux. Viable records those as upstream statements only. macOS remains unverified.

A local CLI adapter is deferred until a stable noninteractive contract supports health, version, cancellation, progress, structured errors, bounded storage, credential injection, artifacts, redacted logs, and cross-platform validation.

Authority:

- `docs/integrations/vimax-video-generation.md`
- `docs/architecture/video-production-domain.md`
- GitHub issue #4

## Open human acceptance gates

Issue #2:

- Product and ICP keyboard and screen-reader review;
- unfamiliar-founder completion;
- remediation.

Issue #5:

- Signals keyboard and assistive-technology review;
- unfamiliar-user completion;
- remediation.

Issue #6:

- Campaigns and Studio accessibility review;
- unfamiliar-user campaign-to-export completion;
- remediation.

Issue #3:

- Repository Growth accessibility review;
- unfamiliar-maintainer import-to-retrospective completion;
- remediation.

Issue #4:

- Video Production accessibility review;
- unfamiliar-user approved-script-to-reviewed-variant completion;
- remediation;
- Calendar and measurement handoff after issue #7.

Automated semantic contracts, responsive styling, reduced motion, deterministic tests, and native packaging do not replace human review.

## Next implementation target

Proceed with issue #7.

The first bounded outcome should connect approved campaign assets, repository launch assets, and approved video variants to:

- authoritative calendar records;
- named approval checks;
- manual activation packages;
- delivery-evidence capture;
- completed, failed, cancelled, and unknown outcomes;
- retrospective and learning records;
- explicit ICP-confidence evidence without silent ICP mutation.

Do not implement direct publishing before the manual activation and outcome loop works.

## CI and merge posture

Repository CI exposes:

- secret scan;
- core TypeScript;
- desktop TypeScript;
- build and deterministic tests;
- failure-only diagnostic artifacts for both compiler surfaces and build/test output.

Desktop validation covers:

- Rust formatting;
- Rust tests;
- Tauri bundle construction;
- Debian package inspection.

Do not merge implementation changes without exact-head repository and native validation.

## Release posture

Viable is not ready for external release.

Before public beta, complete human acceptance, backup and restore, retention, installer signing, update and rollback behavior, privacy and security review, cross-platform installer validation, and operational support documentation.
