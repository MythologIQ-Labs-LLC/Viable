# Content Inventory and Automated Publishing Architecture

## Document control

| Field | Value |
|---|---|
| Status | Proposed implementation architecture |
| Last reviewed | 2026-10-04 |
| Owning context | Approval and External Action |
| Related implementation | Calendar, Activation, Outcome, and Learning |
| Product requirements | `../product/PRD.md` |
| Platform architecture | `viable-platform.md` |
| Existing activation architecture | `activation-and-learning-domain.md` |
| Approval authority | ADR-0005 |
| Provider boundary | ADR-0002 |
| Local authority | ADR-0001 |
| New decision | ADR-0009 |
| Program issue | #97 |

## Purpose

This document defines the stable architecture for locally managed publication inventory and deterministic automated publishing in Viable.

The immediate product is the standalone local Viable desktop application. This architecture does not assume a hosted Viable service, multi-tenant SaaS, managed customer credentials, CoreForge, or a future commercial distribution model.

The operating need is concrete: approved MythologIQ content should be prepared in advance, held as inventory, and distributed consistently without requiring a human to manually copy and publish each item at the scheduled time.

The document deliberately separates:

- **settled architecture**, which is ready to implement;
- **provider-specific decision frontier**, where facts must be established before implementation planning is trustworthy.

This separation follows the QOR Roadmap / Wayfinder discipline: do not turn future uncertainty into fictional implementation slices merely because the destination is visible.

## Product outcome

The intended end state is:

1. a user creates or imports campaign content through existing Viable workflows;
2. an exact channel variant is approved for external use;
3. the approved publication unit enters durable inventory under a bounded publication policy;
4. Viable deterministically selects only eligible approved inventory;
5. a provider-neutral execution ledger creates and tracks publication jobs;
6. a live provider adapter, once separately qualified, publishes without inference;
7. provider response or failure evidence is recorded truthfully;
8. manual activation remains available when direct publishing is unavailable;
9. provider metrics may later feed the existing Measurement and Learning context.

The core inventory and scheduling path must work without an LLM or agent.

## Non-goals

This architecture does not:

- create hosted Viable infrastructure;
- create shared MythologIQ social-publishing infrastructure;
- require CoreForge;
- allow a generator, model, scheduler, provider adapter, or setup agent to approve its own output;
- generate replacement content when inventory is empty;
- silently modify Product Core, campaign claims, ICPs, or canonical assets;
- automate provider legal attestations, MFA, passkeys, CAPTCHAs, or consequential consent that must be performed by the user;
- automate personal Facebook profile publishing;
- promise a particular provider before that provider is qualified;
- require browser automation for normal publication;
- make direct publishing a prerequisite for existing manual activation;
- pre-build a generalized setup-agent ecosystem before real provider evidence proves one is needed.

## Architectural principle

The system separates content authority, activation authority, execution, and evidence.

```text
CONTENT AUTHORITY
Campaigns / Studio
  approved canonical asset
  approved channel variant
        |
        v
ACTIVATION AUTHORITY
Publication Inventory
  exact source version
  exact destination
  bounded publication policy
  named human approval
        |
        v
DETERMINISTIC EXECUTION
Scheduler -> Publication Job -> Provider Port
        |
        v
EVIDENCE
provider receipt / failure / publication identity
        |
        v
MEASUREMENT AND LEARNING
existing Viable outcome loop
```

Inference may help create content before approval. It is not required to select, schedule, reserve, retry, reconcile, verify, or record an approved publication.

## Relationship to ADR-0005

ADR-0005 remains authoritative.

Automated publishing does not mean automatic approval.

A publication may execute without a human present only when a named human has already approved an exact immutable publication intent containing:

- exact source variant and version;
- destination identity;
- audience inherited from the approved source;
- claims and evidence snapshot;
- rights, consent, disclosure, and accessibility requirements;
- availability window;
- publication policy;
- approving human identity and time.

Material source, destination, or policy changes invalidate unexecuted approval.

The scheduler executes authority. It does not create authority.

## Bounded-context ownership

### Campaigns and Studio owns

- campaign briefs;
- canonical assets;
- channel variants;
- source content versions;
- claims and evidence relationships;
- rights, disclosures, and accessibility metadata;
- content review and approval.

### Approval and External Action owns

Implementation-ready now:

- destinations;
- publication policies;
- publication inventory;
- inventory review and approval;
- inventory eligibility;
- reservation and scheduling;
- publication jobs;
- publication attempts;
- deterministic execution bookkeeping;
- direct-publication outcome state once a provider port exists.

Future provider-specific extensions may include:

- provider connections;
- provider capability snapshots;
- provider setup sessions;
- secure credential references;
- provider receipts.

Those extensions must preserve this context boundary but are not implementation-authorized merely by appearing here.

### Measurement and Learning owns

- observation windows;
- performance imports;
- metric evidence states;
- comparisons;
- retrospectives;
- learning-ledger entries.

No automated-publishing component owns duplicate campaign, claim, evidence, ICP, or learning authority.

# Implementation-ready architecture

The following domain contracts are sufficiently specified to build now.

## Channel model

The current Campaign and Activation channel types are narrower than publication inventory requires.

The first additive channel vocabulary should support the content surfaces already required by the immediate product direction:

```ts
export type ChannelKind =
  | "linkedin"
  | "facebook_page"
  | "instagram_feed"
  | "instagram_reels"
  | "website"
  | "github_release";
```

A channel type indicates the user-facing publication surface. It does not imply that a live provider adapter exists.

Do not add unused future channels merely because they may be interesting later.

## PublicationPolicy

A publication policy expresses deterministic timing and quota rules. It does not approve content.

```ts
export type PublicationPolicy = Readonly<{
  id: string;
  workspaceId: string;
  label: string;
  destinationId: string;
  timezone: string;
  allowedWeekdays: readonly number[];
  allowedWindows: readonly Readonly<{
    start: string;
    end: string;
  }>[];
  minimumCooldownMinutes: number;
  maximumPerDay?: number;
  maximumPerWeek?: number;
  lateToleranceMinutes: number;
  retryLimit: number;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}>;
```

Required rules:

- the policy cannot grant content approval;
- disabling a policy blocks new reservations;
- changing a material policy field invalidates approval where that change alters the publication intent;
- timing calculations use the policy timezone explicitly;
- missing inventory never authorizes generation.

## PublicationInventoryItem

The inventory item is the central new authority record.

```ts
export type PublicationInventoryStatus =
  | "draft"
  | "in_review"
  | "changes_requested"
  | "stocked"
  | "reserved"
  | "depleted"
  | "approval_invalidated"
  | "retired";

export type PublicationInventoryItem = Readonly<{
  id: string;
  workspaceId: string;
  destinationId: string;
  policyId: string;
  source: ActivationSourceSnapshot;
  status: PublicationInventoryStatus;
  priority: number;
  availableFrom: string;
  expiresAt?: string;
  maxUses: number;
  useCount: number;
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNote?: string;
  createdAt: string;
  updatedAt: string;
}>;
```

First-delivery rules:

- `maxUses` defaults to `1`;
- reuse must be explicit;
- an item becomes `stocked` only through named human review;
- no generator, scheduler, or provider port can create a stocked item;
- current source authority is revalidated before review completion, reservation, and execution;
- material source change produces `approval_invalidated` for unexecuted stock;
- a retired or depleted item cannot be selected;
- zero eligible stock produces no publication.

## PublicationJob

A publication job represents one intended execution of one reserved inventory use.

```ts
export type PublicationJobStatus =
  | "reserved"
  | "waiting"
  | "executing"
  | "retry_wait"
  | "published"
  | "failed"
  | "cancelled"
  | "authority_invalidated"
  | "outcome_unknown";

export type PublicationJob = Readonly<{
  id: string;
  workspaceId: string;
  inventoryItemId: string;
  destinationId: string;
  scheduledFor: string;
  idempotencyKey: string;
  status: PublicationJobStatus;
  attemptCount: number;
  nextAttemptAt?: string;
  providerPublicationId?: string;
  providerResponseId?: string;
  publicationUrl?: string;
  failureClass?: string;
  failureDetail?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}>;
```

A connection identifier may be added after the live-provider connection contract is resolved. Do not bake an unqualified credential architecture into this initial record.

## PublicationAttempt

Each execution attempt is separately auditable.

```ts
export type PublicationAttempt = Readonly<{
  id: string;
  jobId: string;
  attemptNumber: number;
  startedAt: string;
  completedAt: string;
  outcome:
    | "published"
    | "retryable_failure"
    | "terminal_failure"
    | "unknown";
  providerResponseId?: string;
  failureClass?: string;
  redactedDetail: string;
}>;
```

No secret-bearing provider payload may be persisted in an attempt.

## Deterministic scheduler

At each scheduler evaluation, Viable:

1. loads enabled publication policies;
2. determines which policies permit activity at the candidate time;
3. excludes destinations or policies that reached configured daily/weekly limits;
4. excludes destinations inside cooldown periods;
5. selects only `stocked` inventory whose availability range includes the candidate time;
6. revalidates source and destination authority;
7. orders eligible items by:
   1. lower numeric priority value;
   2. earliest expiration;
   3. oldest approval time;
   4. stable item identifier as final tie-breaker;
8. atomically reserves one use;
9. creates one publication job with a stable idempotency identity;
10. leaves execution to the provider port once one is available.

The scheduler must never create or rewrite content.

When no item is eligible, Viable records or exposes an inventory-gap state and publishes nothing.

## Idempotency and duplicate prevention

Every automated publication has a stable Viable identity derived from:

- workspace;
- inventory item;
- destination;
- exact source version;
- use ordinal.

Retry preserves the same job identity.

Provider-specific duplicate prevention is intentionally not assumed. Until a selected provider proves a safe reconciliation mechanism, ambiguous execution results must become `outcome_unknown` rather than triggering a blind retry.

## Provider-neutral port

The provider-neutral execution seam can be defined and tested before any live provider is chosen.

```ts
export interface PublishingProviderPort {
  publish(request: PublishRequest): Promise<PublishResult>;
  lookupPublication?(
    request: PublicationLookupRequest,
  ): Promise<PublicationLookupResult>;
}
```

The initial deterministic suite should use a fake provider implementation supporting:

- success;
- retryable failure;
- terminal failure;
- ambiguous outcome;
- optional lookup reconciliation.

`PublishRequest` receives an already approved immutable source snapshot and destination identity. The provider port has no authority to modify substantive content.

## Restart behavior

All jobs persist before execution.

On restart:

1. load waiting, executing, and retry-wait jobs;
2. treat jobs left in `executing` as indeterminate until reconciliation occurs;
3. execute a late waiting job only when still within `lateToleranceMinutes`;
4. otherwise mark it as missed/failed in a truthful state that requires deliberate rescheduling;
5. never silently publish stale content because the application was offline.

## Retry behavior

The provider-neutral state machine supports retryable and terminal failure classes without assuming provider-specific semantics.

Rules:

- bounded retries only;
- preserve the same job identity;
- revalidate source, destination, and policy authority before every retry;
- stop for authority invalidation;
- ambiguous outcome becomes `outcome_unknown` unless a provider-specific lookup contract can resolve it;
- provider-specific rate-limit and authentication classification is added only with evidence from the chosen provider.

## Manual fallback

Existing manual activation remains first-class.

```text
Approved inventory item
        |
        +--> direct provider path unavailable
        |
        v
existing credential-free manual activation package
        |
        v
human publishes manually
        |
        v
existing delivery evidence workflow
```

Direct-publishing failure must never strand approved content.

## Persistence additions for the first implementation

Extend the Activation and Learning workspace with additive collections:

```ts
publicationPolicies
publicationInventory
publicationJobs
publicationAttempts
```

Legacy workspaces load these as empty collections until a general migration framework supersedes additive normalization.

No provider credentials enter these collections.

## UI model for the first implementation

### Inventory

Add Inventory beneath Calendar/Activation rather than creating a new top-level bounded context.

Each item shows:

- campaign/source title;
- destination;
- channel;
- approval state;
- available window;
- expiration;
- uses remaining;
- priority;
- block/invalidation reason.

Primary actions:

- submit for review;
- approve and stock;
- request changes;
- reject;
- retire;
- inspect source authority;
- use existing manual activation path when desired.

### Automation status

Before a live provider exists, the status surface can truthfully show:

- automation enabled/paused for deterministic scheduling;
- next reserved/waiting job in fake or test mode only where appropriate;
- inventory coverage;
- blocked/invalidated inventory;
- failed or unknown jobs;
- inventory depletion warnings.

Do not display a live-provider-ready claim before live provider evidence exists.

## Deterministic test requirements

The provider-neutral implementation must prove at minimum:

- draft inventory cannot be reserved;
- a generator cannot create stocked inventory;
- source authority changes invalidate stocked inventory;
- destination changes block eligibility;
- disabled policies block eligibility;
- availability, expiry, cooldown, and quota rules are deterministic;
- tie-breaking produces repeatable selection;
- one inventory use cannot be concurrently reserved twice;
- empty stock produces no publication candidate;
- the same job cannot execute twice after confirmed publication;
- ambiguous execution becomes unknown rather than a blind duplicate retry;
- authority invalidation halts retry;
- restart reconciliation does not silently republish an indeterminate job;
- existing manual activation behavior remains valid;
- persisted provider-neutral workspace data contains no secret material.

# Provider-specific decision frontier

The following work is intentionally not implementation-authorized yet.

## Secure credential boundary

Settled requirement:

> Provider secret material must not enter Viable workspace authority, exported packages, ordinary logs, prompts, screenshots, or backups.

Unresolved facts:

- which OS-native or Rust/Tauri mechanism satisfies this on the operating systems we will actually support;
- Linux keyring/backend behavior and failure modes;
- the first truthful supported-platform boundary;
- the narrow test seam for proving secret isolation.

Tracked by issue #100.

No architecture document should pretend the exact library or platform mechanism is selected until that issue resolves.

## First live provider

No provider is architecturally privileged as the first implementation.

The first live proof should be selected from current evidence using:

- self-managed access feasibility;
- authentication/setup complexity;
- ability to publish from a local desktop app;
- publication identifiers and reconciliation support;
- duplicate-risk behavior;
- policy and permission constraints;
- real MythologIQ distribution value;
- smallest useful unproven surface.

Tracked by issue #101.

LinkedIn member publishing and Facebook Page publishing are candidates, not a pre-decided sequence.

## Meta self-managed setup

The intended Meta posture remains local/self-managed if Meta is selected or later added:

- user-owned developer application;
- user-controlled account/page assets;
- Viable absorbs avoidable setup complexity;
- human checkpoints remain human.

But the exact setup path is not yet settled.

Research must establish:

- what Meta requires today;
- which steps have supported APIs/CLIs/machine interfaces;
- what MCP actually contributes;
- whether browser/desktop automation is safe and worthwhile;
- what must remain login/MFA/consent/legal human interaction;
- how Viable validates completion afterward.

Tracked by issue #102.

## Setup executor abstraction

A generalized executor-capability registry is **not** yet part of the implementation-ready architecture.

If real provider research shows several setup paths genuinely vary by capabilities such as browser navigation, local shell, MCP, session resume, or human handoff, Viable may introduce a capability descriptor at that seam.

Until then, provider-specific guided setup may be the simpler and more truthful design.

This preserves the original product requirement:

> The user should be told which available method can actually complete the next step, rather than being forced to guess which AI service or harness has the needed capabilities.

It does not force us to build an abstraction before we have two real implementations to compare.

## Background execution

The destination requires unattended local publication eventually, but the exact mechanism remains unresolved.

Potential mechanisms include desktop background/tray lifecycle, start-at-login, OS task scheduling, or another local runtime pattern.

Do not select one until the first live provider path proves:

- how precise timing needs to be;
- whether the main application must remain alive;
- what restart/reconciliation looks like with real provider behavior;
- which operating systems are actually in the supported boundary.

No privileged operating-system service is justified by current evidence.

## Connected metrics

Provider metric collection is downstream of reliable publication.

Do not implement connected analytics until:

- a live publication adapter is stable;
- provider metric semantics are understood;
- observations can map cleanly into the existing explicit `observed`, `verified_zero`, `partial`, `delayed`, `unavailable`, and `not_collected` evidence states.

Metrics never authorize automatic Product Core or ICP mutation.

# Current implementation frontier

## Scope A: publication inventory and approval authority

Tracked by #98.

Exit evidence:

- approved content can sit durably in inventory;
- only named-human review can produce stocked authority;
- source/policy/destination invalidation is truthful;
- no live provider is required;
- manual activation remains unchanged.

## Scope B: deterministic scheduler and execution ledger

Tracked by #99.

Exit evidence:

- deterministic candidate selection and reservation are proven;
- job/attempt state is restart-safe;
- fake-provider success/failure/unknown behavior is proven;
- duplicate prevention rules are explicit;
- no credential or live provider is required.

## Handoff rule

After #98 and #99, do not automatically proceed to a hard-coded provider slice.

Resolve the credential/provider/setup frontier first. When those facts and authority decisions are settled, create the smallest named implementation scope that is genuinely ready and hand that scope to normal implementation planning.

# Future CoreForge relationship

CoreForge is not a dependency of this architecture.

If a future integration is justified by dogfood, CoreForge should call a narrow Viable control surface such as:

- inspect inventory health;
- request or import proposed content;
- inspect blocked publication/setup work;
- pause or resume automation;
- read campaign and publication outcomes.

CoreForge must not bypass Viable approval, source authority, destination authority, or execution evidence.

No CoreForge plugin should be implemented until the standalone Viable workflow is proven.

## Program acceptance boundary

The first automated-publishing program succeeds when:

- MythologIQ can maintain named-human-approved publication inventory inside Viable;
- Viable selects inventory deterministically without inference;
- the scheduler/job state machine is proven against deterministic provider behavior;
- a separately qualified live provider eventually completes one real end-to-end publication path;
- provider secret material remains outside workspace authority;
- failure, revocation, unknown outcomes, and restart behavior are truthful;
- provider setup is presented as one Viable task with complexity absorbed where evidence permits;
- manual activation remains usable whenever automation is unavailable.

Provider breadth, generalized setup-agent infrastructure, connected analytics, hosted infrastructure, and commercial onboarding are not required to prove this first product capability.
