# Video Production Domain Architecture

## Document control

| Field | Value |
|---|---|
| Status | Implemented domain architecture |
| Last reviewed | 2026-07-16 |
| Product requirements | `../product/PRD.md` |
| Platform architecture | `viable-platform.md` |
| Campaign authority | `../../src/campaigns/domain/campaign.ts` |
| Implementation issues | GitHub issue #4 |
| Implementation PRs | #23 and #24 |

## Purpose

Video Production converts an approved campaign-linked canonical script into a reviewable production package, accepts structured evidence from a separately operated production tool, and returns completed media to Viable for named review and platform adaptation.

The domain is provider-neutral. ViMax is one optional compatibility adapter. Removing ViMax must not damage video briefs, production packages, imported artifacts, reviews, or platform variants.

## Authority model

```text
Product Core
  -> approved claims
  -> reviewed evidence
  -> audience and accessibility constraints

Campaigns and Assets
  -> approved campaign intent
  -> approved canonical script
  -> exact script version
  -> rights, disclosures, and accessibility

Video Production
  -> reviewed video brief
  -> storyboard and shot constraints
  -> source-asset rights and consent
  -> provider plan, expected cost, and data handling
  -> provider-neutral manual package
  -> imported run stages and artifacts
  -> named render review
  -> separately reviewed platform variants

Issue #7, later
  -> Calendar
  -> delivery evidence
  -> measurement and learning
```

Video Production does not own product truth, canonical claims, ICP selection, campaign intent, source-script approval, publishing, delivery, or measurement.

## Context boundaries

### Product Core owns

- product capabilities and limitations;
- reviewed evidence;
- approved claims and claim revisions;
- accessibility constraints;
- canonical ICP hypotheses and audience authority.

### Campaigns and Assets owns

- campaign objective and intended outcome;
- primary audience;
- approved canonical script;
- exact script version;
- campaign-level evidence and claim references;
- source-script rights, disclosures, and accessibility requirements.

### Video Production owns

- video brief review state;
- duration, platform, aspect-ratio, style, and prohibited-element requirements;
- storyboard scenes and shot constraints;
- source-asset rights and consent records;
- user-selected provider plans, cost estimates, and data-handling notes;
- provider-neutral manual package records;
- production-tool compatibility metadata;
- imported run stages, failure classes, artifacts, checksums, and redacted logs;
- render review state;
- platform-variant review state.

### External production tools may

- consume an exported package;
- orchestrate script, storyboard, image, video, audio, caption, and assembly work;
- emit stage observations, failures, logs, artifacts, and checksums.

External tools may not approve campaigns, scripts, renders, variants, publishing, delivery, or measurement.

## Core records

### Video production tool record

A tool record captures:

- tool name;
- pinned version and revision;
- source URL;
- license and notice obligations;
- compatibility review date;
- runtime requirements;
- supported and unverified operating systems;
- limitations.

The implemented ViMax record pins:

- version `v1.1.0`;
- revision `1f8f650`;
- Python 3.12 or newer;
- `uv`-managed dependencies;
- upstream-listed Windows and Linux support;
- unverified macOS support;
- MIT license notice retention.

This record describes the compatibility target. It does not claim that Viable executed or validated ViMax on those operating systems.

### Video brief

A video brief snapshots:

- the approved campaign;
- the approved canonical script ID and exact version;
- script text;
- claim revisions and evidence relationships;
- audience;
- objective and duration;
- target platforms and aspect ratios;
- visual style and prohibited elements;
- captions, audio description, and accessibility requirements;
- disclosure requirements;
- storyboard scenes;
- source assets, rights, consent, and allowed use;
- LLM, image, and video provider plans;
- estimated cost, currency, and data-handling notes;
- named owner and review state.

The brief begins in `draft`, enters `in_review`, and may become `approved`, `changes_requested`, or `rejected`. Material upstream authority changes may produce `approval_invalidated`.

### Source-asset manifest entry

Every source asset records:

- label and media type;
- bounded source reference;
- owner;
- rights basis;
- sensitive kind;
- consent state;
- allowed and prohibited uses;
- disclosures;
- optional SHA-256 and expiration.

Likeness, voice, logo, trademark, customer, and copyrighted assets require recorded consent and rights before production.

### Provider plan

Each brief requires one plan for each provider kind:

- LLM;
- image;
- video.

A plan records provider, model, estimated cost, currency, data handling, and credential mode. `credentialsIncluded` is always `false`.

### Production package

The provider-neutral package includes:

- brief identity and version;
- approved script and authority references;
- storyboard;
- source-asset manifest;
- provider plan;
- expected artifacts;
- optional compatibility packets;
- explicit external-action state.

The external-action state records:

- credentials are not included;
- Viable did not execute production;
- the render is not approved;
- publishing is not approved;
- delivery has not occurred.

### Imported run and artifact

An imported run records:

- source tool and version;
- run correlation ID;
- completed, partial, failed, or cancelled render status;
- ordered stage observations;
- relative artifact paths;
- MIME types and sizes;
- SHA-256 values;
- relationship to the source brief and package;
- redacted log;
- failure class and detail where applicable;
- named importer;
- separate review state.

Artifact paths must remain relative and bounded. Secret-like values are rejected from logs and artifact metadata.

### Platform variant

A platform variant records:

- approved source artifact;
- platform;
- aspect ratio;
- render file;
- caption file where required;
- accessibility notes;
- disclosure requirements;
- separate review state.

A platform variant cannot be approved merely because its source render was approved.

## Approval lifecycle

```text
Approved campaign and script
  -> draft video brief
  -> named brief review
  -> approved video brief
  -> manual production package
  -> external production
  -> imported run and artifacts
  -> draft artifact review
  -> named artifact approval
  -> draft platform variant
  -> named platform-variant approval
  -> issue #7 calendar and activation, later
```

Render completion is evidence of a completed production stage. It is not an approval decision.

## Asynchronous authority revalidation

External production may take long enough for product or campaign authority to change. The public application service therefore revalidates current authority at:

- production-package creation;
- artifact import;
- artifact review;
- platform-variant creation;
- platform-variant approval.

Revalidation checks:

- campaign approval;
- canonical-script approval;
- exact script version and body;
- claim ID, revision, status, and statement;
- reviewed evidence;
- source-asset rights and consent;
- accessibility and disclosure relationships.

A stale production result may still be retained as evidence, but it cannot silently inherit current approval.

## ViMax compatibility adapter

The implemented adapter is manual and pinned to ViMax `v1.1.0`.

It produces:

- a Script2Video Python entrypoint;
- a blank-credential YAML template;
- an upstream notice file;
- manual installation and import instructions.

The adapter does not:

- install ViMax;
- run Python;
- invoke a provider;
- inject credentials;
- claim Windows, Linux, or macOS execution validation;
- cancel or resume jobs;
- schedule, publish, deliver, or measure media.

A future local CLI adapter requires a stable, noninteractive, machine-safe contract with health, version, job submission, cancellation, progress, structured errors, artifact manifests, bounded storage, and redacted logs.

## Security and privacy invariants

- No provider credential enters a brief, package, repository file, artifact record, or log.
- Public packages contain no private external-organization data.
- Provider content and imported manifests are untrusted input.
- Artifact paths cannot be absolute or escape the package boundary.
- SHA-256 values are required for imported artifacts.
- Sensitive source assets require explicit rights and consent.
- Logs must be redacted before import.
- Generated media remains subject to provider terms, model licenses, source rights, and disclosure requirements.
- ViMax and its Python dependency graph remain outside the desktop distribution.

## Persistence

The reusable domain includes atomic local JSON persistence. The desktop application uses browser-profile local storage for the current internal workflow.

No credentials are persisted in either store.

## Failure semantics

The workflow preserves:

- partial renders;
- failed stages;
- cancelled stages;
- failure class and detail;
- retained artifacts and redacted logs;
- draft or invalidated review state.

A failed or cancelled run cannot be approved as a completed render.

## Accessibility

The implemented Studio workflow includes:

- semantic headings and labels;
- keyboard-operable controls;
- visible non-color statuses;
- scalable and wrapping layouts;
- reduced-motion behavior;
- caption requirements;
- explicit accessibility notes for platform variants.

Hands-on keyboard and assistive-technology acceptance remains a release gate.

## Validation evidence

PR #23 validated the provider-neutral domain and prohibited transitions.

PR #24 validated the packaged Studio workflow.

Exact-head validation included:

- secret scanning;
- core TypeScript;
- desktop TypeScript;
- 67 deterministic Node tests;
- Rust formatting;
- Rust tests;
- Tauri bundle construction;
- Debian package inspection.

No test claims actual ViMax execution or cross-platform ViMax compatibility.

## Current limitations

- Viable does not execute ViMax.
- The upstream ViMax TUI is not treated as a stable machine API.
- Provider credentials are configured outside Viable and outside exported packages.
- Windows and Linux are recorded from upstream documentation, not verified by Viable execution.
- macOS is unverified.
- Calendar, delivery evidence, publishing, measurement, and learning are not implemented.
- Human accessibility and unfamiliar-user acceptance remain open.

## Related documents

- `../integrations/vimax-video-generation.md`
- `../user/video-production.md`
- `../roadmap/initial-build-sequence.md`
- `../status/current-state.md`
- `../adr/0002-provider-neutral-capability-adapters.md`
- `../adr/0003-product-truth-and-claims-ledger.md`
- `../adr/0004-evidence-provenance-and-partial-failure.md`
- `../adr/0005-human-approval-for-external-action.md`
