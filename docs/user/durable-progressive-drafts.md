# Durable progressive drafts

Viable treats an incomplete ICP or marketability assessment as working state, not as reviewed authority.

This guide documents the UX-completion slice tracked by issue #74.

## Why drafts are separate from authority

Long Product Core workflows can require substantial thought, evidence review, and correction. Requiring a user to complete everything in one sitting creates two bad incentives: rush the work or lose it.

Viable therefore stores one resumable ICP draft and one resumable marketability-assessment draft inside the local Product workspace. Drafts are additive optional workspace state. Older saved workspaces without draft state remain valid.

A draft does **not**:

- appear as an ICP candidate;
- count as a reviewed or selected ICP;
- appear as a completed marketability assessment;
- approve a claim, campaign, asset, export, schedule, delivery, or outcome;
- silently create evidence relationships.

## ICP draft workflow

ICP creation is split into progressive sections:

1. audience identity and core roles;
2. boundaries, assumptions, and next validation action;
3. problem, fit, and proof dimensions;
4. adoption, viability, strategic fit, and evidence quality.

The user may save after any section and resume later. A **Save draft and continue** action preserves the saved working state and restores the next progressive section after the Product view rerenders. The remembered section is only view position; draft authority remains in the local Product workspace.

Completion is blocked until the candidate has the minimum complete fields required to become an ordinary unreviewed ICP hypothesis, including a name, summary, owner, next validation action, and explained rationale for every ICP dimension.

Completing the draft creates an unreviewed candidate or generated suggestion. It does not review or select the ICP. Existing named review, evidence, disqualifier, and explicit selection safeguards remain downstream.

## Assessment draft workflow

The marketability assessment is split into smaller dimension groups instead of one large one-shot form.

Each finding retains its own:

- rating;
- rationale;
- confidence and freshness;
- owner;
- verification method;
- recommendation;
- explicitly selected supporting evidence.

Completion requires every modeled assessment dimension to be explained. It also requires a **currently reviewed selected ICP with current reviewed Product Core evidence**. A formerly selected ICP whose review was invalidated by Product Truth changes, or whose supporting evidence is no longer reviewed, cannot silently support a new assessment.

## Evidence selection

Reviewed Product Core evidence is presented as available context. Context is not the same thing as support.

For each ICP dimension and each assessment finding, the user intentionally checks the evidence records that support that conclusion. Unchecked reviewed evidence remains contextual and is not written into that conclusion's evidence links.

At completion time, Viable verifies that every selected evidence ID still refers to currently reviewed, non-generated Product Core evidence. If evidence authority changes while a draft is open, completion fails closed and the draft remains available for repair.

A previously linked evidence record that later becomes ineligible remains visibly linked in the draft. Saving unrelated changes does not silently remove it. The user must explicitly uncheck that stale link or restore the evidence to eligible reviewed authority. Completion remains blocked while an ineligible link is retained.

This prevents the earlier behavior where every reviewed evidence record was automatically attached to every ICP dimension and every assessment finding.

## Failure and recovery

Saving a draft writes the draft into the local Product workspace. Reopening the workspace restores the saved values.

If the user edits a progressive form and tries to navigate away before saving, Viable warns that unsaved changes will be lost. Closing or reloading the desktop page with unsaved draft edits also triggers the browser/desktop unload warning where supported.

Validation failures do not rerender the form. The entered values remain on screen, missing required fields are marked in context, and a visible error explains what must be repaired.

If a save fails, the current form remains intact. If draft completion fails after the draft itself was successfully saved, no ICP or assessment authority is created and the saved draft remains resumable.

## Atomic authority creation

Turning a saved ICP draft into an ICP hypothesis is one Product-workspace persistence operation that both creates the unreviewed hypothesis and clears the completed draft.

Turning a saved assessment draft into a completed marketability assessment follows the same rule.

This keeps authority creation from landing without the corresponding draft cleanup, or vice versa.

## Boundaries unchanged

This slice does not add direct publishing, provider delivery, live crawling, CRM behavior, or ViMax execution. It does not weaken named human review. Draft, review, approval, selection, scheduling, export, delivery, provider verification, and observed outcome remain distinct states under their owning contexts.
