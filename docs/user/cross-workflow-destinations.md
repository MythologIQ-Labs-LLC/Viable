# Cross-workflow destinations and Product Core actions

This guide documents the UX-completion slice tracked by issue #72. It connects successful cross-context conversions to the record that owns the resulting work without moving authority into Signals or Home.

## Authority rule

A cross-workflow conversion has two records with different jobs:

- Signals owns the reviewed evidence, proposed conversion, materialization result, retry/failure state, and a reference to the created destination.
- The destination context owns the created record and every later lifecycle change.

The desktop therefore shows **Open created item** after successful materialization. The opaque destination identifier is retained internally for deterministic lookup and idempotency, but normal users do not need to read, copy, or invent it.

| Materialized work | Authoritative destination | What the link opens |
| --- | --- | --- |
| Product action, ICP validation action, product feedback | Product Core | Exact readiness action |
| Campaign brief | Campaigns | Exact Campaign brief |
| Content brief | Campaigns | Exact Campaign-owned ContentBrief |
| Website Watch response action | Calendar | Exact Calendar planning entry |
| Repository Growth action | Repository Growth | Exact finding-backed action |

Signals does not approve, complete, dismiss, schedule, publish, deliver, or measure the destination record.

## Product Core readiness actions

Product Core readiness actions now have an explicit local lifecycle:

```text
open
  -> in_progress
      -> completed
      -> dismissed
  -> dismissed
```

`cancelled` remains readable as a legacy closed status for saved-data compatibility.

### Start

An open action requires a named actor to enter `in_progress`. The action records who started it and when.

### Assign owner

An open or in-progress action can be reassigned. Reassignment requires:

- the named actor making the change;
- the new owner;
- an explicit assignment rationale.

The current owner is authoritative. Prior assignment actor, time, and rationale remain visible on the action.

### Complete

Only an in-progress action can be completed. Completion requires a named actor plus at least one of:

- verification/completion evidence; or
- an explicit completion rationale when external evidence is not applicable.

The action retains the completion actor, time, evidence, and rationale. Completing an action does not approve another context, claim delivery, or claim an outcome.

### Dismiss

An open or in-progress action can be dismissed only with a named actor and explicit rationale. Dismissal is not completion and is stored separately.

### Verification guidance

Assessment-derived readiness actions preserve the assessment finding's verification method when the action can be matched deterministically to that finding. Older saved actions and Signal-derived actions remain valid when this optional field is absent; they still require completion evidence or rationale before closing as completed.

## Home

Home may surface an active Product Core readiness action as the next meaningful work item. It prefers an in-progress action over an open action and provides a direct **Open Product Core action** control.

Home does not own or mutate action state. It is only a navigation surface.

## Campaign-owned ContentBrief lifecycle

Content briefs created from reviewed Signal work remain Campaign-owned. Campaigns now renders those records and exposes the lifecycle already enforced by `CampaignService`:

```text
draft
  -> in_review
      -> approved
      -> changes_requested -> in_review
      -> rejected
approval_invalidated -> in_review
```

A content brief card shows the owning campaign, audience, primary outcome, owner, claim/evidence packet counts, content pillars, themes, deliverables, source notes, origin, and prior named review.

Submission and review continue to revalidate the approved parent Campaign and Product Core claim/evidence references. Review requires a named reviewer and review note. A request for changes can be resubmitted for a later named review.

ContentBrief approval does **not** create or imply:

- a canonical asset;
- a channel variant;
- a schedule;
- an export;
- publishing approval;
- publication or provider delivery;
- an observed outcome.

Those remain separate records and decisions.

## Loading, empty, error, recovery, and success states

The added destination surfaces expose explicit local states:

- loading while authoritative local state is read;
- empty when no readiness actions or content briefs exist;
- blocked lifecycle controls when a transition is not legal;
- inline errors when a mutation is rejected or storage fails;
- retry from saved state for load failures;
- visible saved confirmation after a successful transition.

Mutation failures do not rerender the submitted lifecycle form, so entered reviewer, evidence, or rationale text remains available for correction and retry.

## Saved-data compatibility

The Product Core schema change is additive. Existing readiness actions containing only the older fields remain valid. New lifecycle attribution fields are optional until the corresponding transition occurs.

Campaign `contentBriefs` remains an additive optional collection. Older Campaign workspaces without that collection continue to normalize to an empty content-brief list when Campaign authority is used.

No migration erases or rewrites prior records.

## Boundaries deliberately unchanged

This UX slice does not add direct publishing, provider delivery, live crawling, CRM behavior, or ViMax execution. Draft, review, approval, scheduling, export, delivery, provider verification, and outcome evidence remain distinct states under their existing owning contexts.
