# ADR-0005: Human approval for externally consequential action

- Status: Accepted
- Date: 2026-07-15

## Context

Viable may generate content, schedule publications, prepare outreach, coordinate repository launches, submit media-production jobs, and eventually invoke delivery adapters. These actions can affect reputation, consent, legal exposure, platform accounts, customers, prospects, and public records.

A relevance score, generated draft, completed render, or scheduled time does not constitute authority to act externally.

## Decision

A named human must approve externally consequential action before execution.

The following states remain distinct:

- draft;
- in review;
- changes requested;
- approved;
- rejected;
- scheduled;
- executing;
- delivered or published;
- partially delivered;
- failed;
- cancelled;
- measured.

Approval shall bind to:

- the exact content or asset version;
- campaign and product context;
- claims and supporting evidence;
- destination identity;
- intended audience;
- rights, consent, disclosures, and accessibility requirements;
- the approving human identity and time.

Changing material content, claims, destination, audience, rights, or disclosure state invalidates approval and requires review again.

Adapters, generators, schedulers, and model providers cannot approve their own output. Render completion is not approval. Research scores cannot automatically create outreach authority.

## Consequences

### Positive

- responsibility remains visible;
- generated content cannot silently become public action;
- destination and version mismatches are detectable;
- review can include claim, evidence, consent, and rights context;
- delivery failures remain separate from approval state.

### Negative

- approval queues can slow high-volume operations;
- roles and delegation require careful design;
- edits after approval require re-review;
- unattended automation remains bounded.

## Alternatives considered

### Threshold-based automatic approval

Rejected because a score cannot represent consent, legal authority, reputational judgment, or destination correctness.

### Provider draft or scheduled state as approval

Rejected because provider state does not express Viable's evidence and authority model.

## Implementation implications

- immutable content or asset versions for approval;
- reviewer identity and timestamp;
- policy checks before scheduling and execution;
- reapproval triggers for material changes;
- delivery adapters accept approved intents only;
- tests prohibit draft-to-delivered and generator-to-approved transitions;
- emergency cancellation and visible failure recovery.

## Related requirements and documents

- PRD: PRD-CA-003, PRD-EX-001 through PRD-EX-006, PRD-LS requirements
- Governance: `docs/governance/research-and-outreach-safety.md`
- Architecture: Approval and External Action bounded contexts
- Roadmap: Phases 3, 4, 6, 7, and 8
