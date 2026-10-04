# ADR-0009: Deterministic publishing and evidence-gated provider setup

- Status: Proposed
- Date: 2026-10-04
- Supersedes: None
- Superseded by: None

## Context

Viable already owns campaign content, named approval, Calendar intent, manual activation packages, delivery evidence, measurement, retrospectives, and learning. The next operating need is consistent automated distribution of pre-approved content from a local standalone Viable installation.

Two different classes of work exist:

1. provider-neutral publication inventory and scheduling, whose core rules are already clear enough to implement;
2. live provider connection and setup behavior, where credential-store mechanics, provider access rules, setup surfaces, and first-provider choice still contain unresolved facts and consequential decisions.

The architecture must not turn those unresolved facts into fictional implementation certainty.

A hosted Viable service is not an assumed product direction. The immediate implementation must work for the local desktop application and MythologIQ-owned accounts.

ADR-0005 requires named human approval before externally consequential action. Automated execution therefore consumes existing authority rather than creating new authority.

## Decision

Viable will implement automated publishing as a deterministic local execution layer over named-human-approved publication inventory.

A generator, model, scheduler, setup agent, or provider adapter cannot approve content or create its own external-action authority.

An unattended publication is permitted only when an exact publication intent has already been approved by a named human and binds the immutable source version, destination, audience context, claims and evidence, rights and disclosure requirements, and bounded publication policy.

Normal inventory selection, scheduling, reservation, retry-state handling, execution bookkeeping, and publication evidence do not require inference.

Provider-specific implementation is evidence-gated. Viable will not commit to a provider adapter, credential-store mechanism, generalized setup-agent framework, MCP dependency, CLI path, browser-automation path, or background-runtime mechanism until the facts required for that decision are established.

For provider setup, Viable should prefer the least complex supported path that satisfies the real provider contract. Candidate mechanisms may include:

1. native provider API or SDK;
2. official provider CLI;
3. trusted MCP or other machine-readable integration surface;
4. compatible desktop/browser-control agent;
5. guided manual setup.

This list is an evaluation order, not a requirement to implement a generalized executor framework before real provider evidence justifies one.

Executor suitability, if automation is required, must be based on actual harness capabilities rather than model or vendor name alone.

Human login, MFA/passkeys, CAPTCHA, legal or business attestations, consequential permission consent, and other provider-mandated human checkpoints remain human actions.

Provider secret material must remain outside Viable workspace authority, exports, backups, logs, prompts, and ordinary diagnostics. The exact secure local credential-storage mechanism and supported operating-system boundary are resolved separately from this ADR.

Manual activation remains a permanent fallback when connected publishing is unavailable.

## Consequences

### Positive

- scheduled publishing can operate without model inference;
- named human approval remains authoritative;
- content inventory and scheduler work can begin immediately without waiting on provider research;
- provider-specific uncertainty is preserved instead of disguised as roadmap certainty;
- provider setup complexity can still be absorbed by Viable when evidence shows a safe automation path;
- secret-storage implementation remains free to follow platform evidence rather than a prematurely chosen library;
- manual activation remains useful if a provider changes, revokes access, or proves unsuitable;
- the standalone local product can progress without a hosted-service commitment;
- a future CoreForge integration can consume Viable rather than own Viable's publishing authority.

### Negative

- provider breadth cannot be fully scheduled in advance;
- some later implementation scopes require research or operator decisions before planning;
- publication inventory adds a lifecycle between content approval and delivery;
- unattended local publication will eventually require a reliable background-runtime decision;
- provider adapters will require independent maintenance as external APIs change.

## Alternatives considered

### Require inference for scheduling and publication

Rejected. Content selection, timing, retries, and execution bookkeeping can be deterministic after approval. Making normal publication depend on a model would add cost, availability risk, and unnecessary authority ambiguity.

### Let the scheduler generate replacement content when inventory is empty

Rejected. Inventory shortage is an operational signal, not permission to create and publish new material. Viable must publish nothing when no approved item is eligible.

### Approve an entire campaign for unrestricted automatic publishing

Rejected. ADR-0005 binds approval to exact externally consequential content and destination context. Campaign membership alone is insufficient authority.

### Use browser automation as the normal publishing mechanism

Rejected. Provider APIs or other supported machine interfaces are the intended execution boundary for normal publication. Browser automation may be evaluated only as a setup aid when provider evidence shows no better supported path.

### Require CoreForge for setup or publishing

Rejected. Viable remains a standalone product. CoreForge may integrate later through a narrow control boundary if real usage justifies it.

### Design hosted credential and publishing infrastructure now

Rejected. There is no current requirement for hosted Viable infrastructure. Building it now would solve an unproven future business model rather than the current local operating need.

### Pre-plan LinkedIn, Meta, Instagram, X, setup agents, background workers, and analytics as fixed slices

Rejected after QOR Roadmap / Wayfinder review. The provider-neutral core is implementation-ready, but later provider work still contains unresolved facts and decisions. Those scopes should graduate into implementation plans only when their prerequisites are resolved.

## Implementation implications

Implementation-ready now:

- add publication inventory and publication policy records to Approval and External Action;
- preserve exact source snapshots and asynchronous authority revalidation;
- add named-human stocking approval;
- add deterministic inventory eligibility, selection, reservation, cooldown, quota, and expiry behavior;
- add publication job and attempt records;
- add stable idempotency identity, retry-state handling, restart reconciliation, and a fake provider adapter;
- keep existing manual activation intact.

Evidence/decision frontier before live-provider implementation:

- determine the local secure credential-store contract and truthful supported-platform boundary;
- select and qualify the first live provider proof from current provider evidence;
- define the self-managed Meta setup contract before deciding whether general setup-executor capability routing is warranted;
- determine background-execution mechanics only after the live provider path proves the actual reliability requirement;
- defer connected metrics until direct publishing is stable.

## Related requirements and documents

- ADR-0001: local-first workspace authority;
- ADR-0002: provider-neutral adapters;
- ADR-0004: evidence provenance and partial failure;
- ADR-0005: human approval for externally consequential action;
- `docs/architecture/activation-and-learning-domain.md`;
- `docs/architecture/content-inventory-and-automated-publishing.md`;
- issue #97: automated-publishing destination and frontier;
- issues #98 and #99: implementation-ready provider-neutral scopes;
- issues #100 through #102: unresolved provider/credential/setup frontier;
- issue #36: release foundations and platform/recovery boundaries where applicable.
