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

## Purpose

This document defines the next Viable activation slice: locally managed content inventory, deterministic scheduling, automated provider publishing, provider-verified execution evidence, and guided setup orchestration for provider connections.

The immediate target is the standalone local Viable desktop application. This architecture does not assume a hosted Viable service, multi-tenant SaaS, managed provider credentials, or a future commercial distribution model.

The implementation exists to solve a concrete internal operating need: approved MythologIQ content should be prepared in advance, placed into inventory, and distributed consistently without requiring a human to manually copy and publish each item at the scheduled time.

## Product outcome

A user can:

1. create or import campaign content through existing Viable workflows;
2. approve an exact channel variant for an exact destination and bounded publication policy;
3. place that approved publication unit into inventory;
4. allow Viable to select eligible inventory deterministically;
5. publish through a connected provider without inference;
6. record provider response evidence and failure state;
7. preserve manual export as a fallback;
8. later measure outcomes through the existing Measurement and Learning context.

The core activation path must continue to operate when no model provider or agent is available.

## Non-goals

This slice does not:

- create a hosted Viable service;
- create a shared MythologIQ social-publishing backend;
- require CoreForge;
- allow a generator, model, scheduler, provider adapter, or setup agent to approve its own content;
- generate new content because inventory is low;
- silently modify Product Core, campaign claims, ICPs, or canonical assets;
- automate provider legal attestations, MFA, passkeys, CAPTCHAs, or consent that must be performed by the user;
- automate personal Facebook profile publishing;
- promise support for every provider before a provider adapter is implemented and validated;
- use browser automation as the publishing runtime;
- make direct publishing a prerequisite for the existing manual activation workflow.

## Architectural principle

The system separates three concerns that must not collapse into one another:

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
Scheduler -> Publication Job -> Provider Adapter
        |
        v
EVIDENCE
Provider receipt / failure / publication identifier
        |
        v
MEASUREMENT AND LEARNING
existing Viable outcome loop
```

Inference may help create content before approval. It is not required to select, schedule, execute, retry, verify, or record an approved publication.

## Relationship to ADR-0005

ADR-0005 remains authoritative.

Automated publishing does not mean automatic approval.

A publication may execute without a human present only when a named human has already approved an exact immutable publication intent containing:

- the exact source variant and version;
- destination identity;
- intended audience inherited from the approved source;
- claims and evidence snapshot;
- rights, consent, disclosures, and accessibility requirements;
- allowed publication window;
- publication policy;
- approving human identity and time.

Material source or destination changes invalidate the inventory approval before execution.

The scheduler executes authority. It does not create authority.

## Bounded-context ownership

### Campaigns and Studio owns

- campaign briefs;
- canonical assets;
- channel variants;
- source content versions;
- claim and evidence relationships;
- rights, disclosure, and accessibility metadata;
- content review and approval.

### Approval and External Action owns

- destinations;
- provider connections;
- provider capability snapshots;
- publication inventory;
- publication policies;
- inventory approval;
- reservation and scheduling;
- publication jobs;
- execution attempts;
- provider receipts;
- direct-publishing failures;
- setup recipes and setup state;
- executor capability routing for optional setup assistance.

### Measurement and Learning owns

- observation windows;
- provider metric imports;
- comparisons;
- retrospectives;
- learning-ledger entries.

No new component owns duplicate campaign, claim, evidence, ICP, or learning authority.

## Domain model

### DestinationRecord extension

The current `DestinationRecord` is manual-only. It should be extended without moving credentials into the workspace.

Proposed additions:

```ts
export type DeliveryMode = "manual_only" | "provider_connected";

export type DestinationRecord = Readonly<{
  // existing fields
  deliveryMode: DeliveryMode;
  providerConnectionId?: string;
}>;
```

A destination may remain manual-only permanently.

Disabling a destination blocks new reservations and new provider execution. Historical evidence remains intact.

### ProviderConnection

A provider connection contains only non-secret metadata and a reference to credentials held outside the Viable workspace.

```ts
export type ProviderKind = "linkedin" | "meta" | "x";

export type ProviderConnectionState =
  | "setup_required"
  | "ready"
  | "degraded"
  | "reauthorization_required"
  | "revoked"
  | "disabled";

export type ProviderConnection = Readonly<{
  id: string;
  workspaceId: string;
  provider: ProviderKind;
  label: string;
  accountReference: string;
  credentialReference: string;
  state: ProviderConnectionState;
  capabilitySnapshotId?: string;
  lastValidatedAt?: string;
  limitation?: string;
  createdAt: string;
  updatedAt: string;
}>;
```

`credentialReference` is an opaque identifier for an operating-system credential-store entry. It is not a token, client secret, refresh token, cookie, password, or browser session.

### ProviderCapabilitySnapshot

Provider capability must be observed rather than assumed.

```ts
export type ProviderCapabilitySnapshot = Readonly<{
  id: string;
  connectionId: string;
  capturedAt: string;
  canPublishText: boolean;
  canPublishLink: boolean;
  canPublishImage: boolean;
  canPublishVideo: boolean;
  canReadPublicationStatus: boolean;
  canReadMetrics: boolean;
  accountKinds: readonly string[];
  providerLimits: readonly string[];
  limitations: readonly string[];
}>;
```

UI labels must reflect actual capability state. A connected account is not automatically a publish-capable account.

### PublicationPolicy

A publication policy is deterministic scheduling authority, not content authority.

```ts
export type PublicationPolicy = Readonly<{
  id: string;
  workspaceId: string;
  label: string;
  destinationId: string;
  timezone: string;
  allowedWeekdays: readonly number[];
  allowedWindows: readonly Readonly<{ start: string; end: string }>[];
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

The scheduler may choose only a time allowed by the policy.

### PublicationInventoryItem

The inventory item is the central new record.

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

For the first implementation, `maxUses` defaults to `1`. Reuse must be explicit. Viable must not repeatedly recycle a post merely because inventory is empty.

An item becomes `stocked` only after named human approval.

An item becomes `approval_invalidated` when the exact source authority, destination, or governing publication policy changes materially.

### PublicationJob

A publication job is an execution record created only after an eligible inventory item is reserved.

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
  connectionId: string;
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

### PublicationAttempt

Each provider call is separately recorded so retry behavior is auditable.

```ts
export type PublicationAttempt = Readonly<{
  id: string;
  jobId: string;
  attemptNumber: number;
  startedAt: string;
  completedAt: string;
  outcome: "published" | "retryable_failure" | "terminal_failure" | "unknown";
  providerResponseId?: string;
  failureClass?: string;
  redactedDetail: string;
}>;
```

No secret-bearing provider payload is retained.

## Deterministic scheduler

The scheduler does not use inference.

At each scheduler tick it:

1. loads active publication policies;
2. calculates destinations eligible to publish at the current time;
3. excludes destinations already at daily or weekly limits;
4. excludes destinations inside cooldown periods;
5. selects `stocked` inventory items whose availability window includes the candidate time;
6. revalidates current source authority;
7. validates destination state and provider capability;
8. orders eligible items by:
   1. lower numeric priority value;
   2. earliest expiration;
   3. oldest approval time;
   4. stable item identifier as the final deterministic tie-breaker;
9. atomically reserves one item;
10. creates one publication job with an idempotency key;
11. executes at `scheduledFor`.

The scheduler must never generate content to satisfy a schedule.

When no approved item is eligible, Viable records an inventory-gap state and publishes nothing.

## Idempotency and duplicate prevention

Every automated publication must have a stable idempotency identity derived from:

- workspace;
- inventory item;
- destination;
- exact source version;
- use ordinal.

A provider retry must reuse the same Viable job identity.

Before retrying an ambiguous provider failure, the adapter should query provider state when supported. If the provider cannot disambiguate whether the previous request succeeded, the job becomes `outcome_unknown` rather than risking an automatic duplicate.

## Provider adapter contract

Adapters implement a provider-neutral port.

```ts
export interface PublishingProviderAdapter {
  provider: ProviderKind;

  validateConnection(connection: ProviderConnection): Promise<ConnectionValidationResult>;
  discoverCapabilities(connection: ProviderConnection): Promise<ProviderCapabilitySnapshot>;
  publish(request: PublishRequest): Promise<PublishResult>;
  lookupPublication?(request: PublicationLookupRequest): Promise<PublicationLookupResult>;
  collectMetrics?(request: MetricCollectionRequest): Promise<MetricCollectionResult>;
}
```

`PublishRequest` receives an already approved immutable source snapshot plus destination identity. It never receives authority to modify the content.

Provider-specific formatting may reject an invalid payload. It may not rewrite the substantive message without returning the item to review.

## Initial provider sequence

Implementation should proceed in this order:

1. provider-neutral inventory, scheduler, execution ledger, and connection contracts;
2. LinkedIn member publishing as the first live provider proof because it offers the smallest useful integration surface;
3. Meta Facebook Page publishing using a user-owned Meta developer application;
4. Meta Instagram Professional publishing through the same self-managed Meta application where supported;
5. X only after the first three paths are stable enough to justify another adapter.

This is sequencing, not a commitment to a future hosted product.

## Provider setup orchestration

Provider setup is modeled as a task that Viable attempts to simplify, not as documentation the user must decipher.

### Setup method ranking

For each provider recipe, Viable should prefer methods in this order:

1. native provider API or SDK;
2. official provider CLI;
3. trusted MCP or machine-readable integration surface;
4. compatible desktop/browser-control agent;
5. guided manual setup.

The first compatible, policy-safe method wins unless the user explicitly chooses another supported path.

### SetupRecipe

```ts
export type SetupMethod = "native" | "cli" | "mcp" | "desktop_agent" | "guided_manual";

export type SetupRequirement =
  | "browser_navigation"
  | "desktop_control"
  | "local_shell"
  | "mcp"
  | "filesystem"
  | "session_resume"
  | "human_handoff"
  | "secret_safe";

export type SetupRecipe = Readonly<{
  provider: ProviderKind;
  version: string;
  methods: readonly Readonly<{
    method: SetupMethod;
    requirements: readonly SetupRequirement[];
    instructionsTemplateId: string;
  }>[];
  requiredHumanGates: readonly string[];
  validationChecks: readonly string[];
}>;
```

### ExecutorCapabilityDescriptor

Viable must reason about the actual harness, not just a model or vendor name.

```ts
export type ExecutorCapabilityDescriptor = Readonly<{
  id: string;
  label: string;
  capabilities: readonly SetupRequirement[];
  availability: "available" | "unavailable" | "unknown";
  invocationMode: "direct" | "external_launch" | "instruction_packet";
  securityNotes: readonly string[];
}>;
```

A text-only assistant and a desktop-control agent are different executors even when they use the same underlying model family.

### Deterministic executor selection

Viable selects an executor by:

1. evaluating the setup recipe requirements;
2. eliminating executors missing any required capability;
3. eliminating executors that cannot satisfy required human checkpoints or secret-handling constraints;
4. preferring a direct machine contract over an external launch;
5. preferring a provider-supported CLI or MCP path over generic browser automation;
6. displaying the selected method and why it is appropriate;
7. falling back to guided manual setup when no compatible automation path exists.

A model does not choose its own executor.

### Human checkpoints

Automation must pause for user action when the provider requires:

- account login;
- MFA or passkey confirmation;
- CAPTCHA;
- legal or business attestations;
- granting consequential permissions;
- explicit provider consent;
- any secret-reveal interaction that the provider intentionally gates behind user action.

The setup process resumes from durable state after the checkpoint.

## Setup agent boundary

An agent is an optional installer assistant, not part of normal publishing.

The setup agent may:

- navigate provider developer portals;
- fill non-secret configuration fields;
- enter redirect URIs provided by Viable;
- select documented products or scopes;
- return non-secret identifiers;
- pause for login, MFA, CAPTCHA, consent, or legal confirmation;
- resume after the user completes the checkpoint;
- run Viable-provided validation checks.

The setup agent may not:

- accept legal terms for the user;
- bypass access controls;
- defeat MFA or CAPTCHA;
- invent permission choices;
- approve content;
- publish campaign content during setup;
- retain provider secrets in prompts, transcripts, logs, or workspace records.

## Credential authority

Provider credentials are not part of the Viable workspace.

The implementation must add an OS-vault abstraction exposed to the TypeScript service layer through narrow Tauri commands.

Required operations:

```text
storeCredential(reference, secretMaterial)
readCredential(reference)
deleteCredential(reference)
credentialExists(reference)
```

The workspace stores only the opaque reference.

Diagnostics, exports, backups, screenshots, tests, and logs must never include secret material.

Credential reads should occur only immediately before a provider operation and should not be persisted in application state longer than required for that operation.

## Local background execution

The initial automated publishing runtime remains local.

For reliable unattended publication, the desktop application should support a local background mode:

- start at user login when the user enables publishing automation;
- keep the scheduler and provider worker active while the main window is hidden or minimized;
- expose a visible status indicator and a way to pause all automation;
- resume queued jobs after application restart;
- never require a hosted Viable service.

Tauri tray and autostart capabilities should be added only when this worker is implemented. They were previously removed as unused dependencies and should not return before they have executable responsibility.

The system must not install a privileged operating-system service in the initial slice.

## Restart and missed-job behavior

All publication jobs persist before execution.

On restart, Viable:

1. loads waiting, executing, and retry-wait jobs;
2. treats jobs left in `executing` as indeterminate until provider lookup or reconciliation occurs;
3. executes a late waiting job only if it remains inside the policy `lateToleranceMinutes` window;
4. otherwise records the job as missed and requires rescheduling or a new reservation;
5. never silently publishes stale content simply because the app was offline.

## Retry behavior

Retryable failures include provider-declared temporary availability, rate limiting, and selected transport failures.

Retry behavior:

- honor provider `Retry-After` or equivalent when available;
- use bounded exponential backoff otherwise;
- never exceed policy retry limit;
- revalidate source authority, destination state, connection state, and credential availability before each retry;
- stop immediately for revoked authorization, invalid permission, invalid content, rights invalidation, or destination disablement;
- preserve the original job and idempotency identity.

## Manual fallback

Existing manual activation remains supported.

When a provider connection is unavailable, unsupported, revoked, or degraded, Viable may offer:

```text
Approved inventory item
        |
        +--> automated provider path unavailable
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

The failure of direct publishing must not strand approved content.

## Channel model expansion

The existing Campaign `ChannelKind` and Activation `DestinationChannel` sets are narrower than this initiative requires.

The first schema change should introduce explicit supported social channels without conflating account type with provider identity.

Initial target set:

```ts
export type ChannelKind =
  | "linkedin"
  | "facebook_page"
  | "instagram_feed"
  | "instagram_reels"
  | "website"
  | "github_release";
```

`x` should be added with its provider adapter rather than as unused schema surface.

Channel additions require updates to Campaign variant creation, filtering, export selection, Calendar source resolution, desktop forms, fixtures, and deterministic tests.

## UI model

### Inventory

Add a first-class Inventory surface under Calendar/Activation rather than a new top-level bounded context.

Each item shows:

- campaign and source title;
- destination;
- channel;
- approval status;
- available window;
- expiration;
- uses remaining;
- priority;
- next eligibility;
- invalidation or block reason.

Primary actions:

- review;
- approve and stock;
- request changes;
- retire;
- reschedule policy;
- publish manually;
- inspect source authority.

### Automation status

The Calendar/Activation surface shows:

- automation enabled or paused;
- next scheduled publication;
- inventory coverage by destination;
- connection health;
- blocked inventory;
- failed or unknown jobs;
- replenishment warnings.

### Provider setup

Provider setup must be one Viable task.

The UI should show:

```text
Connect Facebook Page

Viable can automate most of this setup.
Recommended setup method: <detected method>
Human actions required: login, MFA, permission confirmation

[Start setup]
```

If no compatible automation executor exists, the same workflow becomes guided manual setup. The user should not have to locate separate documentation to complete ordinary setup.

## Persistence changes

Extend the Activation and Learning workspace with additive collections:

```ts
providerConnections
providerCapabilitySnapshots
publicationPolicies
publicationInventory
publicationJobs
publicationAttempts
setupSessions
```

Existing legacy workspaces must load with these collections defaulted to empty until a schema migration framework supersedes additive normalization.

No credential material enters these collections.

## Security invariants

1. Provider credentials remain in the OS credential store.
2. Prompt or agent transcripts cannot contain provider secrets.
3. A provider adapter can publish only a currently approved inventory item.
4. A scheduler cannot approve content.
5. A setup agent cannot publish content.
6. A provider adapter cannot rewrite substantive content.
7. Revoked credentials fail closed.
8. Unknown execution outcomes do not trigger blind retries that can create duplicates.
9. Every provider response stored by Viable is redacted and bounded.
10. Manual fallback remains available without copying secrets into export packages.

## Deterministic test requirements

The implementation must add tests proving at minimum:

- draft inventory cannot be reserved;
- a generator cannot create stocked inventory;
- source authority changes invalidate stocked inventory;
- destination changes block reservation;
- disabled policies block reservation;
- cooldown and quota rules are deterministic;
- tie-breaking produces repeatable selection;
- one inventory item cannot be concurrently reserved twice;
- the same publication job does not publish twice;
- ambiguous provider outcomes become unknown rather than blind retry;
- terminal authentication failures do not retry;
- provider credentials never appear in persisted workspace data;
- setup executor matching rejects insufficient capabilities;
- required human checkpoints cannot be auto-completed;
- manual fallback remains usable when the provider adapter is unavailable;
- restart reconciliation does not silently republish an indeterminate job.

## Implementation sequence

### Slice A: inventory and authority foundation

1. Expand channel types for Facebook Page and Instagram feed.
2. Add `PublicationPolicy` and `PublicationInventoryItem` domain types.
3. Add create, submit, review, stock, retire, invalidate, and eligibility service operations.
4. Reuse `ActivationSourceSnapshot` resolution and asynchronous source revalidation.
5. Add additive workspace persistence and legacy normalization.
6. Add deterministic inventory and approval tests.
7. Add Inventory UI beneath Calendar/Activation.

Exit condition: approved content can sit in durable inventory, but nothing publishes automatically.

### Slice B: deterministic scheduler and publication ledger

1. Add reservation algorithm.
2. Add `PublicationJob` and `PublicationAttempt` records.
3. Add idempotency and restart reconciliation.
4. Add retry classification and bounded backoff.
5. Add automation pause and status UI.
6. Add a fake provider adapter for complete deterministic tests.

Exit condition: the full scheduling and execution state machine is proven without a live provider.

### Slice C: credential vault and connection core

1. Add narrow Rust/Tauri OS-vault abstraction.
2. Add `ProviderConnection` and `ProviderCapabilitySnapshot`.
3. Add connection validation and capability discovery ports.
4. Add secret scanning and persistence tests covering the new boundary.
5. Add connect, revalidate, revoke, and delete flows.

Exit condition: Viable can hold a provider connection without storing credentials in workspace authority.

### Slice D: LinkedIn live proof

1. Implement self-managed LinkedIn connection recipe.
2. Implement LinkedIn member publishing adapter.
3. Publish a real approved MythologIQ inventory item.
4. Record publication identifier, response identifier, URL, and delivery evidence.
5. Test failure, revocation, retry, and duplicate prevention.

Exit condition: a scheduled MythologIQ LinkedIn publication completes end to end from stocked content to provider-verified evidence.

### Slice E: Meta self-managed setup and Facebook Page publishing

1. Add Meta setup recipe for a user-owned developer application.
2. Detect compatible setup automation paths.
3. Add guided manual setup as guaranteed fallback.
4. Implement Facebook Page capability discovery and publishing.
5. Validate token refresh/revalidation and revoked-permission handling.
6. Publish a real MythologIQ Facebook Page item.

Exit condition: clean local setup plus real scheduled Facebook Page publication works without Viable-operated provider infrastructure.

### Slice F: Instagram Professional publishing

1. Reuse the Meta connection where valid.
2. Add Instagram Professional account discovery.
3. Add feed publishing.
4. Add Reels only after feed behavior is stable and media requirements are proven.
5. Record provider-verified outcomes.

Exit condition: supported Instagram content publishes through the same deterministic inventory and job path.

### Slice G: background reliability

1. Add local autostart opt-in.
2. Add background/tray lifecycle.
3. Exercise restart and late-job behavior.
4. Add prominent pause-all control.
5. Validate Windows and Linux behavior on real installations.

Exit condition: Viable can run the local publishing worker unattended without a hosted service.

### Slice H: connected outcome collection

Only after direct publication is stable:

1. collect provider-supported publication metrics;
2. map them into existing explicit metric evidence states;
3. preserve unavailable and partial distinctions;
4. feed existing retrospectives and learning ledger.

This does not authorize automatic Product Core or ICP mutation.

## First implementation boundary

Implementation should begin immediately with Slice A and the provider-neutral portion of Slice B.

Do not block that work on:

- Meta app review;
- LinkedIn organization access;
- a CoreForge plugin;
- MCP availability;
- desktop-agent availability;
- hosted infrastructure;
- connected analytics;
- a future commercial Viable distribution decision.

The first useful milestone is local and self-contained: MythologIQ-approved content can be stocked in Viable and deterministically selected for publication.

## Future CoreForge relationship

CoreForge is not a dependency of this architecture.

If a future Viable integration is justified, CoreForge should call a narrow Viable control surface such as:

- inspect inventory health;
- request or import proposed content;
- inspect blocked setup or publication work;
- pause or resume automation;
- read campaign and publication outcomes.

CoreForge must not bypass Viable approval, source authority, destination authority, or execution evidence.

No CoreForge plugin should be implemented until the standalone Viable workflow is proven through dogfood.

## Acceptance criteria for the program

The automated publishing program is successful when:

- MythologIQ can maintain approved content inventory inside Viable;
- Viable selects publication units deterministically;
- no inference is required for normal scheduled publishing;
- a human approves exact source authority before unattended execution;
- provider credentials stay outside workspace persistence;
- at least LinkedIn and Facebook Page publishing complete from the local desktop application;
- failures, revocation, retries, unknown outcomes, and restart recovery are truthful and visible;
- provider setup is a guided Viable task rather than an external documentation hunt;
- manual activation remains available whenever automation is unavailable;
- provider-verified publication evidence can enter the existing measurement and learning loop.
