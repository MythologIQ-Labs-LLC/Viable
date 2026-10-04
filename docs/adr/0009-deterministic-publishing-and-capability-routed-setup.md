# ADR-0009: Deterministic publishing and capability-routed provider setup

- Status: Proposed
- Date: 2026-10-04
- Supersedes: None
- Superseded by: None

## Context

Viable already owns campaign content, named approval, Calendar intent, manual activation packages, delivery evidence, measurement, retrospectives, and learning. The next operating need is consistent automated distribution of pre-approved content from a local standalone Viable installation.

Two separate problems must be solved without collapsing their trust boundaries:

1. normal publishing must be reliable and must not depend on inference;
2. first-time provider setup may be awkward enough that an API, CLI, MCP surface, desktop-control agent, or guided human workflow is required.

A hosted Viable service is not an assumed product direction. The immediate implementation must work for the local desktop application and MythologIQ-owned accounts.

ADR-0005 requires named human approval before externally consequential action. Automated execution must therefore consume existing authority rather than creating new authority.

## Decision

Viable will implement automated publishing as a deterministic local execution layer over named-human-approved publication inventory.

A generator, model, scheduler, setup agent, or provider adapter cannot approve content or create its own external-action authority.

An unattended publication is permitted only when an exact publication intent has already been approved by a named human and binds the immutable source version, destination, audience context, claims and evidence, rights and disclosure requirements, and bounded publication policy.

Normal publishing does not require inference.

Provider setup will use capability-routed orchestration. A provider recipe declares required setup capabilities. Viable evaluates available execution methods and prefers, in order:

1. native provider API or SDK;
2. official provider CLI;
3. trusted MCP or other machine-readable integration surface;
4. compatible desktop/browser-control agent;
5. guided manual setup.

Executor selection is based on actual harness capabilities, not model or vendor name alone.

The setup agent is optional and limited to setup assistance. It cannot approve or publish campaign content.

Provider credentials will be stored in the operating-system credential store. Viable workspace records contain only opaque credential references and non-secret provider metadata.

Manual activation remains a permanent fallback when connected publishing is unavailable.

## Consequences

### Positive

- scheduled publishing remains available without model inference;
- provider setup complexity can be absorbed by Viable without forcing one AI vendor or harness on the user;
- named human approval remains authoritative;
- provider and setup failures remain explicit;
- credentials remain outside local workspace records and backups;
- manual activation remains useful if a provider changes or revokes access;
- the standalone local product can progress without a hosted-service commitment;
- a future CoreForge integration can consume Viable rather than own Viable's publishing authority.

### Negative

- publication inventory adds a new lifecycle between content approval and delivery;
- provider setup orchestration requires capability discovery and durable resume state;
- unattended local publication requires a reliable background desktop runtime;
- provider adapters require independent maintenance as external APIs change;
- OS-vault behavior must be validated across supported operating systems;
- exact approval and authority revalidation make some high-volume shortcuts intentionally unavailable.

## Alternatives considered

### Require inference for scheduling and publication

Rejected. Content selection, timing, retries, and provider execution can be deterministic after approval. Making normal publication depend on a model would add cost, availability risk, and unnecessary authority ambiguity.

### Let the scheduler generate replacement content when inventory is empty

Rejected. Inventory shortage is an operational signal, not permission to create and publish new material. Viable must publish nothing when no approved item is eligible.

### Approve an entire campaign for unrestricted automatic publishing

Rejected. ADR-0005 binds approval to exact externally consequential content and destination context. Campaign membership alone is insufficient authority.

### Use browser automation as the normal publishing mechanism

Rejected. Provider APIs are the execution boundary for normal publication. Browser automation is brittle and may be used only as a setup aid when no better supported machine interface exists.

### Require CoreForge for setup or publishing

Rejected. Viable remains a standalone product. CoreForge may integrate later through a narrow control boundary if real usage justifies it.

### Design a hosted credential and publishing service now

Rejected. There is no current requirement for hosted Viable infrastructure. Building it now would solve an unproven future business model rather than the current local operating need.

### Expose provider documentation and let the user configure everything manually

Rejected as the default. Guided manual setup remains the final fallback, but Viable should absorb complexity whenever a safe supported automation path exists.

## Implementation implications

- add publication inventory, publication policy, publication job, and publication attempt records to the Approval and External Action context;
- preserve exact source snapshots and asynchronous authority revalidation before reservation and execution;
- add deterministic inventory eligibility, selection, reservation, cooldown, quota, and retry behavior;
- use stable idempotency keys and fail to `outcome_unknown` rather than blindly duplicate ambiguous provider requests;
- add provider-neutral connection and capability contracts;
- add an OS-vault abstraction with no secret material in workspace persistence;
- add setup recipes, executor capability descriptors, human checkpoints, and durable setup-session state;
- add deterministic tests proving insufficient executors cannot be selected and human-only checkpoints cannot be auto-completed;
- add live provider adapters only after the provider-neutral state machine is proven with a fake adapter;
- start with LinkedIn member publishing, then self-managed Meta Facebook Page and Instagram Professional paths;
- add local background desktop execution only when the scheduler and provider path have executable responsibility;
- keep existing manual activation intact as a fallback;
- do not build a CoreForge plugin as part of this implementation program.

## Related requirements and documents

- ADR-0001: local-first workspace authority;
- ADR-0002: provider-neutral adapters;
- ADR-0004: evidence provenance and partial failure;
- ADR-0005: human approval for externally consequential action;
- `docs/architecture/activation-and-learning-domain.md`;
- `docs/architecture/content-inventory-and-automated-publishing.md`;
- issue #7: Calendar, manual activation, outcome, and learning;
- issue #36: release foundations and credential/recovery boundaries where applicable.
