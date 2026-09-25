# Acceptance Workspace Seed Specification

## Purpose

Define a reproducible starting workspace for #79 accessibility acceptance and #81 unfamiliar-user demo acceptance without embedding credentials, private customer data, or real external-organization content in the repository.

This document defines the required shape of the seed. The seed itself may be created through the normal Viable UI and exported as a validated local backup for facilitator use.

## Seed principles

The acceptance seed must be:

- synthetic and non-confidential;
- realistic enough to exercise the actual product journey;
- deterministic across participants;
- free of credentials, tokens, private account identifiers, and provider secrets;
- intentionally incomplete in a few places so the participant has meaningful work to discover;
- rich enough to exercise review, correction, export, outcome, learning, failure recovery, and workspace management;
- reset or restored before every participant.

Do not use a maintainer's live Viable workspace as the acceptance seed.

## Required starting state

### Product & audience

Provide one synthetic product workspace with:

- enough product truth to understand what the product does;
- at least one reviewed evidence item;
- at least one additional evidence item that is contextual or not yet reviewed so evidence-state distinctions remain visible;
- at least two plausible ICP hypotheses or a state from which the participant can create/compare a second hypothesis;
- one audience decision that requires confirmation, revision, or re-review rather than beginning fully complete;
- no real customer/company identity.

The seed should make it possible to test explicit per-conclusion evidence selection and revision invalidation without requiring the participant to invent technical identifiers.

### Signals / Market evidence

Provide at least one synthetic signal/evidence scenario that:

- has clear provenance;
- can be reviewed in-app;
- can lead to an owned downstream action or Campaign/Content work;
- does not require live crawling or provider credentials.

Keep any raw/advanced adapter material out of the ordinary path unless the acceptance scenario explicitly tests the Advanced disclosure.

### Campaigns / Studio

Provide a campaign/content state that can exercise:

- creation or continuation from current authority;
- named review;
- changes requested;
- correction;
- resubmission/re-review;
- approved channel variants;
- intentional export of fewer than all supported channels.

At least one intended channel should be ready for export. Another channel may be absent/unapproved to prove that unrelated variants do not block an intentionally narrower package.

### Calendar / outcome / learning

Provide enough seeded context for the participant to:

- identify a schedulable or already planned external action;
- distinguish approved, exported, scheduled, and delivered states;
- record human-provided delivery/outcome evidence without falsely claiming provider verification;
- inspect a baseline or measurement state;
- reach a retrospective/learning action.

Missing or unavailable metrics must remain distinct from zero.

### Home attention

The starting seed should produce more than one valid attention item so the participant has to understand prioritization rather than simply clicking the only available option.

At least one item should represent meaningful current work such as review/recovery/blocked authority, and another should represent a later action or learning follow-up.

### Workspace management

The seed must be disposable and restorable.

Before participant use, the facilitator must prove that:

1. a backup can be created through Viable;
2. the backup passes the product's restore validation;
3. restoring the backup returns the expected record counts/states;
4. reset/delete scope is understood;
5. no unrelated local preferences or files are unintentionally treated as workspace data.

## Deliberate failure fixture

Prepare one safe failure that can be reproduced consistently without secrets or external dependencies.

Preferred failure categories:

- required-field validation;
- unsupported/malformed bounded import fixture;
- stale authority that requires a visible re-review/correction path.

Avoid failures caused by internet availability, rate limits, real provider authentication, or any environment dependency the participant cannot reasonably repair inside Viable.

The failure should test whether the product preserves entered work and exposes an actionable recovery path, not whether the participant can debug infrastructure.

## Participant-specific mutation boundary

During a run, participants may create/revise/review/export/record outcomes inside the disposable seed. After the run, do not manually clean individual records and reuse the mutated workspace.

Restore the canonical seed instead. This prevents accidental leakage of:

- prior approvals;
- prior reviewer identities;
- completed actions;
- delivery evidence;
- learned next actions;
- failure/recovery state;
- participant-specific navigation state.

## Seed versioning

Give every seed a stable facilitator label such as:

`ux-acceptance-seed-v1`

Record:

- candidate commit used to create/validate it;
- backup checksum/integrity identity provided by Viable where available;
- creation date;
- synthetic scenario summary;
- expected record/state inventory;
- deliberate failure fixture;
- intended channel set;
- any known limitation.

If a remediation changes schema or materially changes the starting workflow, create a new seed version. Do not overwrite the prior seed identity in old acceptance results.

## Pre-run verification checklist

Before each human session:

- [ ] exact acceptance candidate/build recorded;
- [ ] canonical seed restored/reset;
- [ ] expected Product/Audience state present;
- [ ] expected Signals/Market evidence present;
- [ ] Campaign/Studio correction path available;
- [ ] intended export-channel scenario available;
- [ ] Calendar/outcome/learning path available;
- [ ] deliberate failure fixture available;
- [ ] no prior participant identity/evidence remains;
- [ ] no credential/private-data material present;
- [ ] facilitator result file copied from `RESULT-TEMPLATE.md`.

If any item fails, repair the test setup before starting the participant timer. Do not convert setup failure into a product usability finding unless the setup itself is the behavior being tested.