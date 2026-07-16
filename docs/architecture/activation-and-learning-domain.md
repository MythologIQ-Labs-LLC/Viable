# Calendar, Activation, Outcome, and Learning Architecture

## Document control

| Field | Value |
|---|---|
| Status | Implemented domain architecture |
| Last reviewed | 2026-07-16 |
| Implementation issue | #7 |
| Core implementation | PR #26 |
| Desktop implementation | PR #27 |
| Product requirements | `../product/PRD.md` |
| Platform architecture | `viable-platform.md` |
| Approval authority | ADR-0005 |
| Evidence authority | ADR-0004 |
| Product and claim authority | ADR-0003 |
| ICP authority | ADR-0007 |

## Purpose

This document describes the implemented architecture for Viable Calendar, manual activation, delivery and failure evidence, performance import, retrospectives, and the learning ledger.

The implementation completes the first local-first operating loop from approved work to explicit outcome evidence and one reversible next action.

It does not add direct publishing, provider credentials, automatic outreach, CRM mutation, or automatic Product Core changes.

## Architectural contexts

Issue #7 spans two accepted bounded contexts from the platform architecture.

### Approval and External Action

This context owns:

- destination records;
- destination ownership confirmation;
- calendar timing intent;
- destination-bound external-action review;
- schedule status;
- manual activation packages;
- export handoff state;
- delivery, failure, cancellation, and unknown-outcome evidence;
- authority invalidation;
- interrupted export recovery.

It does not own canonical campaign, asset, repository launch, video, claim, evidence, or ICP records.

### Measurement and Learning

This context owns:

- measurement plans;
- pre-activation baselines;
- observation windows;
- performance imports;
- metric evidence states;
- compatible metric comparisons;
- attribution model and uncertainty;
- retrospectives;
- learning-ledger entries;
- reversible next actions;
- advisory ICP-confidence and positioning effects.

It does not silently mutate Product Core, Campaigns, Repository Growth, Video Production, People, Organizations, or Sales records.

## Authority relationships

```text
Product Core
  -> approved claims and reviewed evidence
  -> canonical ICP authority

Campaigns and Studio
  -> approved campaign
  -> approved canonical asset
  -> approved channel variant

Repository Growth
  -> ready launch room
  -> complete required launch checklist
  -> approved campaign asset variants

Video Production
  -> approved video brief and source script
  -> approved render artifact
  -> approved platform variant

Calendar and Manual Activation
  -> destination ownership and channel
  -> timing intent
  -> named external-action review
  -> credential-free manual package
  -> export handoff state
  -> delivery or failure evidence

Measurement and Learning
  -> baseline and observation window
  -> explicit metric evidence states
  -> retrospective
  -> learning-ledger entry
  -> reversible next action
```

Downstream contexts reference authoritative upstream records. They do not copy authority in a way that permits silent drift.

## Core invariants

1. Scheduling does not grant approval.
2. Approval does not prove export.
3. Export does not prove delivery.
4. Delivery requires evidence.
5. Human-recorded evidence is not provider verification.
6. Missing, delayed, partial, unavailable, and not-collected metrics are not zero.
7. A verified zero requires explicit evidence and the numeric value zero.
8. A retrospective states its attribution model and uncertainty.
9. Learning records may propose Product Core or ICP review but cannot apply the change.
10. Source, destination, rights, accessibility, disclosure, claim, or evidence changes can invalidate unexecuted scheduled work.
11. Credentials never enter destination records, packages, outcomes, metric imports, logs, learning entries, or backups.
12. Direct publishing remains outside this slice.

## Destination records

A destination record contains:

- a user-facing label;
- a supported channel;
- a non-secret account reference;
- an accountable account owner;
- explicit ownership confirmation;
- manual capability notes;
- rate-limit notes;
- retry policy;
- data-handling notes;
- active or disabled state.

The initial delivery mode is always `manual_only`.

A destination record must never contain:

- API keys;
- OAuth tokens;
- cookies;
- passwords;
- browser sessions;
- provider credentials;
- copied private headers.

Disabling a destination blocks new review and export. It may invalidate scheduled work that has not already been delivered.

## Calendar records

The implemented calendar supports:

- external activation;
- approval deadlines;
- event opportunities;
- experiments;
- follow-ups.

Internal planning entries may be scheduled directly because they do not authorize external action.

External activation entries begin as drafts and contain:

- title;
- owner;
- start and optional end;
- timezone;
- notes;
- destination;
- source-authority snapshot;
- schedule status;
- activation status.

### Separate status dimensions

Schedule status records timing and approval intent:

- `draft`;
- `in_review`;
- `changes_requested`;
- `scheduled`;
- `rejected`;
- `cancelled`;
- `approval_invalidated`.

Activation status records execution evidence:

- `not_applicable`;
- `not_ready`;
- `ready_for_manual_activation`;
- `delivered`;
- `failed`;
- `cancelled`;
- `outcome_unknown`.

A scheduled entry remains `not_ready` until a current manual activation package exists. It becomes `ready_for_manual_activation` when the package is created. It becomes delivered, failed, cancelled, or unknown only after explicit outcome evidence is recorded.

## Source authority

Calendar can reference three implemented source families.

### Campaign variant

The source requires:

- approved campaign;
- approved canonical asset;
- approved variant matching the destination channel;
- current approved Product Core claim revisions;
- current reviewed evidence;
- rights, accessibility, and disclosure records.

### Repository launch

The source requires:

- launch room status `ready_for_manual_launch` or `retrospective_complete`;
- every required checklist item complete;
- approved campaign;
- approved canonical asset;
- matching approved channel variant;
- current Product Core claims and reviewed evidence.

Repository readiness or launch-room state never substitutes for external-action review.

### Video variant

The source requires:

- approved video platform variant matching the destination channel;
- approved imported artifact;
- approved video brief;
- current approved source-script version;
- approved campaign;
- current Product Core claims and reviewed evidence;
- non-missing consent;
- non-expired source-asset rights;
- accessibility and disclosure requirements.

Render completion remains insufficient. The render and platform variant must be approved inside Viable before Calendar can use them.

## Source snapshots and asynchronous revalidation

When an external entry is created, Viable snapshots:

- source kind and identifier;
- exact source version;
- campaign and canonical asset identifiers;
- audience;
- destination channel;
- approved claim references;
- reviewed evidence identifiers;
- rights;
- accessibility requirements;
- disclosure requirements;
- approved body or file reference;
- repository or video relationship where applicable.

The snapshot is revalidated:

- before entering external-action review;
- before the review decision;
- before manual package creation;
- during explicit authority-impact checks.

A change in current authority blocks the operation or invalidates the scheduled entry and any unexecuted package.

Already recorded delivery evidence is not erased when upstream authority later changes. Historical evidence remains historical evidence.

## Named external-action review

External scheduling requires a named reviewer and review note.

The reviewer evaluates:

- current source approval;
- destination identity and ownership;
- timing;
- channel fit;
- claims and evidence;
- rights and consent;
- accessibility;
- disclosures;
- readiness for manual activation.

Approved review changes the schedule status to `scheduled`.

It does not:

- publish;
- export;
- claim delivery;
- claim provider verification;
- create performance evidence.

## Manual activation packages

A manual package contains:

- schema version;
- calendar entry and timezone;
- named review evidence;
- destination record;
- source-authority snapshot;
- approved payload or file reference;
- idempotency key;
- manual activation instructions.

Every package states:

- `credentialsIncluded: false`;
- `directPublishingAvailable: false`;
- `deliveryClaimed: false`;
- `providerVerified: false`.

The package is useful without a platform API.

## Export operations and recovery

Export operations use separate state:

- `ready_for_download`;
- `downloaded`;
- `interrupted`.

An interrupted export records:

- attempt count;
- interruption detail;
- updated time.

Recovery restores the operation to ready-for-download state.

Recovery does not:

- change source approval;
- change calendar approval;
- claim delivery;
- create performance evidence.

## Delivery and failure evidence

Delivery outcomes may be:

- delivered;
- failed;
- cancelled;
- unknown.

Evidence classifications are:

### Human recorded

The user explicitly records observed evidence such as:

- a public URL;
- a screenshot reference;
- a publication identifier;
- a failure record;
- an operator note.

This is valid evidence but is not provider verification.

### Provider evidence

A provider export, report, or response is attached or referenced, but the integration does not claim that Viable independently verified the provider response.

### Provider verified

This classification requires a provider response identifier. It is unavailable in the current manual-only workflow unless the user supplies valid provider evidence from a supported process.

### Required transition evidence

A scheduled external action cannot become delivered unless:

1. a current manual package exists;
2. the export operation is recorded as downloaded;
3. evidence references exist;
4. delivered status includes a delivery URL, publication identifier, or provider response identifier.

A failed outcome requires failure class and detail.

## Measurement plans

A measurement plan is created before retrospective analysis and contains:

- related calendar entry;
- observation window;
- one or more baseline metric observations;
- named owner;
- creation time.

The desktop Slice 6 workflow records one baseline observation per plan. The domain supports multiple observations.

## Metric evidence states

The implemented metric states are:

| State | Numeric value | Meaning |
|---|---:|---|
| `observed` | Required, non-zero | A source reported or a human recorded a finite non-zero value |
| `verified_zero` | Required, exactly zero | A source explicitly verified zero |
| `delayed` | Prohibited | The expected evidence has not arrived |
| `partial` | Optional | Some evidence exists, but the limitation is explicit |
| `unavailable` | Prohibited | Access or evidence is unavailable |
| `not_collected` | Prohibited | No collection was attempted or supported |

Incomplete states require a limitation.

Unavailable evidence with a numeric zero is rejected.

## Performance imports

Performance imports record:

- source;
- source classification;
- importer;
- import status;
- notes;
- one or more metric observations.

Import statuses are:

- complete;
- partial;
- delayed;
- unavailable;
- failed.

A complete import may contain only observed or verified-zero metrics.

A partial import must expose at least one incomplete state.

An unavailable import may contain only unavailable or not-collected states.

## Metric comparison

Retrospective comparison calculates a numeric delta only when both baseline and outcome use compatible numeric states:

- observed;
- verified zero.

For incompatible states, Viable preserves:

- baseline state;
- outcome state;
- any available values;
- limitation explaining why no delta exists.

No numeric conclusion is invented from unavailable or missing evidence.

## Retrospectives

A retrospective requires:

- measurement plan and baseline;
- at least one performance import;
- delivery, failure, cancellation, or unknown-outcome evidence for external actions;
- summary;
- learnings;
- decision;
- attribution model;
- attribution uncertainty;
- evidence references;
- one reversible next action;
- ICP-confidence effect and rationale;
- positioning effect.

Decisions are:

- continue;
- iterate;
- stop;
- inconclusive.

Attribution models are:

- manual;
- first touch;
- last touch;
- influence;
- unattributed.

The current desktop workflow defaults to manual evidence and requires the user to state uncertainty.

## Learning ledger

Completing a retrospective creates a learning-ledger entry with:

- evidence;
- decision;
- change;
- outcome;
- follow-up;
- reversible next action;
- attribution model;
- attribution uncertainty;
- related calendar and retrospective identifiers;
- named author and time.

The ledger is an evidence-backed decision record, not a hidden optimization engine.

## ICP and positioning boundary

A retrospective may record that evidence appears to:

- strengthen ICP confidence;
- weaken ICP confidence;
- produce no change;
- remain unknown.

It may also record a positioning effect.

These records are proposals for review. They do not mutate:

- the selected ICP;
- ICP status;
- ICP dimensions;
- Product Core claims;
- product truth;
- campaign assets.

Any canonical change must use the appropriate Product Core review workflow.

## Security and privacy

The service rejects common secret patterns in:

- destination records;
- calendar notes;
- packages;
- delivery evidence;
- metric imports;
- retrospective text;
- learning entries.

Local JSON persistence writes atomically with owner-only file permissions where supported.

Browser-profile persistence remains local to the desktop profile.

Future provider adapters must add:

- OS-vault credential references;
- destination identity verification;
- capability and permission discovery;
- retries and idempotency;
- structured provider responses;
- redacted logs;
- rate-limit handling;
- delivery evidence;
- revocation and cleanup behavior.

## Accessibility and presentation

The packaged desktop workflow includes:

- semantic headings and labels;
- keyboard-operable forms and buttons;
- live-region announcements;
- visible focus inherited from the shell;
- non-color status text;
- responsive cards and grids;
- scalable text;
- reduced-motion handling;
- loading, empty, offline, blocked, error, interruption, recovery, invalidation, partial-evidence, and ready states.

Automated contracts are not a substitute for hands-on assistive-technology acceptance.

## Persistence

The implemented local workspace contains:

- destinations;
- calendar entries;
- manual packages;
- export operations;
- delivery outcomes;
- measurement plans;
- performance imports;
- retrospectives;
- learning-ledger entries;
- workspace update time.

No credential is part of the schema.

## Validation

PR #26 validated:

- secret rejection;
- source resolution across Campaigns, Repository Growth, and Video Production;
- named external-action review;
- schedule and activation separation;
- package semantics;
- delivery evidence requirements;
- provider-verification requirements;
- explicit metric states;
- baseline comparison;
- retrospective and learning creation;
- source-authority invalidation;
- export interruption and recovery.

PR #27 validated:

- Calendar and Analytics navigation;
- normal-form user journeys;
- channel filtering;
- package-to-calendar evidence binding;
- loading and recovery states;
- responsive and reduced-motion presentation;
- exact-head TypeScript, Node, Rust, Tauri, and Debian packaging.

## Known limitations

- no direct publishing;
- no automatic provider delivery verification;
- no connected social, CMS, or GitHub release destination adapters;
- no automatic metric import;
- no generalized attribution engine;
- no automatic ICP or Product Core mutation;
- no team collaboration or hosted synchronization;
- no signed installers;
- hands-on accessibility acceptance remains open;
- unfamiliar-user acceptance remains open.

## Future extension points

Future work may add optional provider adapters for:

- LinkedIn;
- website CMS destinations;
- GitHub releases;
- Instagram;
- YouTube;
- analytics and search providers;
- CRM and lead evidence.

Every adapter must preserve the domain records and transitions described here. Convenience may not replace authority, evidence, or manual fallback.
