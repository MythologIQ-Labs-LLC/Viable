# Automated Publishing Planning Review: QOR Roadmap and Wayfinder

Date: 2026-10-04

## Purpose

Re-evaluate the automated-publishing plan before implementation using two planning lenses:

- MythologIQ QOR Roadmap from `MythologIQ-Labs-LLC/Qor-logic`;
- Matt Pocock's upstream Wayfinder skill, the design influence behind QOR Roadmap.

This review is not canonical QOR Roadmap runtime state. Viable does not currently carry a `.qor/roadmaps/.../events.jsonl` state graph. The purpose here is to apply the planning discipline honestly before creating more implementation work.

## Shared lesson

Both systems distinguish a visible destination from an implementation-ready route.

QOR Roadmap is stricter:

- admit long-horizon work only when prerequisite facts, authority decisions, or cross-context dependencies prevent trustworthy planning;
- model facts, decisions, and prerequisites, not implementation tasks;
- expose only the actionable frontier;
- hand a named resolved scope to normal planning only after prerequisites are genuinely settled.

Wayfinder expresses the same principle through:

- destination;
- decision tickets;
- blocking edges;
- actionable frontier;
- intentionally unresolved `Not yet specified` fog;
- handoff to specification/tickets only after the route becomes clear.

## Finding 1: the provider-neutral core is not foggy

Publication inventory and deterministic scheduling are already sufficiently constrained by existing Viable authority:

- Campaigns/Studio owns exact content versions;
- ADR-0005 owns named-human external-action approval;
- Activation already owns destinations, scheduling intent, source snapshots, invalidation, manual packages, delivery evidence, and learning handoff;
- the required deterministic behavior is clear enough to specify and test without any live provider.

Therefore using QOR Roadmap to delay these scopes would be ceremony, not governance.

Implementation-ready frontier:

- issue #98: publication inventory and approval authority;
- issue #99: deterministic scheduler and execution ledger.

These should proceed through normal implementation planning/execution.

## Finding 2: the original provider sequence was premature

The first draft hard-coded:

1. LinkedIn member publishing;
2. Facebook Page;
3. Instagram Professional;
4. X later.

That sequence was plausible, but it was not yet evidence-backed enough to be architecture.

The following facts remain material:

- exact current self-managed authorization path;
- desktop OAuth/callback constraints;
- permission/review requirements;
- safe duplicate reconciliation;
- publication lookup/receipt behavior;
- credential-store support on the operating systems Viable will actually claim;
- clean-install setup complexity;
- provider policy constraints;
- actual MythologIQ distribution value.

The corrected architecture therefore treats the first live provider as a frontier decision, not a fixed implementation slice.

Tracked by #101.

## Finding 3: credential storage is a requirement, not yet a mechanism

The invariant is settled:

> Provider secret material must not enter Viable workspace authority, exports, backups, prompts, or ordinary diagnostics.

The initial draft jumped from that requirement to a specific OS-vault/Tauri implementation contract before establishing cross-platform facts.

The corrected plan preserves the invariant and moves the mechanism/platform boundary into evidence gathering.

Tracked by #100.

## Finding 4: the setup-executor registry may be premature abstraction

The product requirement is sound:

> Viable should absorb setup complexity and should tell the user which available method can actually complete a provider step instead of making them guess which AI/harness has the required capabilities.

The first draft immediately generalized this into:

- setup recipes;
- executor capability descriptors;
- deterministic executor selection;
- generic desktop-agent/MCP/CLI routing.

That may become correct, but Wayfinder's fog rule and QOR's prerequisite model both argue against building the abstraction before at least one difficult provider setup has been studied end to end.

Corrected sequence:

1. establish the exact Meta self-managed setup contract;
2. identify which steps actually vary by execution capability;
3. determine whether a provider-specific guided flow is sufficient;
4. introduce a generic capability registry only if repeated variation proves a real seam.

Tracked by #102.

## Finding 5: background execution should follow live-provider evidence

The destination requires unattended local publishing, but exact runtime mechanics remain uncertain:

- tray/background app;
- start-at-login;
- local scheduled task;
- another OS-native mechanism.

The provider-neutral job state machine should be restart-safe now, but the operating-system lifecycle mechanism should not be selected until live-provider behavior and supported-platform evidence make the requirement concrete.

This remains `Not yet specified` rather than an implementation issue.

## Finding 6: connected analytics is downstream

Connected metric collection is valuable, but publication must first be reliable.

The existing Measurement and Learning domain already supplies the correct evidence-state model. Provider analytics should therefore wait until a real provider publishes successfully and its metric semantics can be mapped without inventing certainty.

This remains `Not yet specified`.

## Corrected topology

```text
DESTINATION
Local Viable can reliably publish approved inventory without inference

READY NOW
  #98 Publication inventory and approval authority
          |
          v
  #99 Deterministic scheduler and execution ledger

RESEARCH / DECISION FRONTIER
  #100 Secure local credential-store contract and supported platforms
  #101 Select and qualify first live provider proof
  #102 Define self-managed Meta setup contract

FOG, NOT IMPLEMENTATION TICKETS YET
  generalized setup-executor registry
  second/later provider adapters
  background/autostart mechanism
  connected analytics breadth
  CoreForge control surface
  commercial onboarding/distribution behavior
```

## Implementation rule

Proceed immediately with #98 and then #99.

Research #100 through #102 may proceed in parallel because those investigations do not require the provider-neutral code to be complete.

Do not turn the unresolved frontier into provider implementation tickets until the relevant facts and decisions are resolved. When a provider scope becomes clear, create the smallest implementation plan that proves one real end-to-end publication path.

## Result

The review narrows the plan rather than slowing it down.

The core product loop is more implementation-ready than the provider tail. Building inventory and deterministic scheduling now creates useful product capability immediately while keeping provider-specific complexity from contaminating the core architecture.
