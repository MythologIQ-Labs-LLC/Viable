# Revision, correction, and re-review

Viable treats correction as a governed continuation of an existing record, not as a replacement that erases what was previously reviewed.

This guide documents the correction slice tracked by issue #73. It applies to Product Truth, ICP hypotheses, validation experiments, Campaign briefs, Campaign-owned content briefs, canonical assets, and channel variants.

## Core rule

When important authority changes, Viable keeps the prior state and makes the current review state explicit.

A correction must not:

- silently overwrite a previously reviewed decision;
- preserve approval when the approved material has materially changed;
- replace a selected ICP without named review;
- imply publishing, provider delivery, or an observed outcome;
- rewrite historical export packages to match newer authority.

## Product Truth

The Product workflow exposes every modeled user-controlled Product Truth field in one revision-aware editor:

- product name and description;
- lifecycle and supported environments;
- capabilities and limitations;
- positioning, alternatives, and differentiation;
- pricing and packaging;
- offers and calls to action;
- brand voice;
- preferred terminology;
- accessibility constraints.

Saving requires a named editor and revision rationale. Viable records the prior revision as a snapshot plus the changed field names before incrementing Product Truth revision.

A Product Truth change continues to flag the selected ICP for review. Product, ICP, claim, and Campaign authority remain separate records.

## ICP correction

An ICP hypothesis can be corrected without creating a second hypothesis solely to repair the first one.

Correction includes the modeled audience roles, dimension ratings and rationale, evidence references, disqualifiers, anti-ICP conditions, assumptions, contradictions, confidence, owner, next validation action, and change conditions.

Saving a correction requires a named editor and rationale. Viable records the prior ICP snapshot and changed fields, increments the hypothesis revision, and returns the corrected hypothesis to candidate review.

If the ICP was selected, correction does **not** silently make the new revision the selected authority. The corrected hypothesis must receive named review and then be explicitly selected again.

## Validation experiment lifecycle

Validation experiments now progress through an explicit lifecycle:

```text
planned
  -> active
      -> completed
      -> cancelled
  -> cancelled
```

Starting requires a named actor. Completion requires a named actor plus:

- outcome evidence;
- an outcome summary;
- the decision the evidence supports.

Cancellation requires a named actor and rationale. Completion and cancellation are distinct states.

Experiment outcomes are evidence about an ICP hypothesis. They do not silently rewrite the ICP or select it.

## Campaign correction

A Campaign brief can be corrected in place after changes are requested, rejection, or an earlier approval.

The correction editor exposes the governed Campaign fields, including audience authority, Product Core claim/evidence references, message hierarchy, channels, offer, call to action, asset plan, success measures, dependencies, and owner.

A saved correction:

- requires a named editor and rationale;
- records the prior Campaign version and changed fields;
- increments Campaign version;
- clears current review attribution because the new version has not been reviewed;
- returns a non-approved Campaign to draft;
- changes a previously approved Campaign to `approval_invalidated`;
- invalidates approved descendant content briefs, canonical assets, and channel variants when the governing Campaign changed.

The corrected Campaign must then enter the existing named review lifecycle again.

## Content brief correction

Campaign-owned `ContentBrief` records can be corrected after changes are requested rather than abandoned and recreated.

The correction preserves the Campaign relationship, audience, primary outcome, Product Core claim snapshot, evidence packet, and origin. User-controlled content planning fields can be revised with a named editor and rationale.

The previous content-brief version is retained in correction history. The corrected record returns to draft, or to `approval_invalidated` when a previously approved brief is changed, and must be resubmitted for named review.

## Canonical asset correction

Canonical asset correction already uses explicit asset versions. Editing an approved canonical asset invalidates that asset approval and approved channel variants derived from it. A new canonical version then requires named re-review.

Issue #73 preserves that behavior rather than creating a competing revision mechanism.

## Channel variant correction

A channel variant can be corrected in place with a named editor and rationale. Viable records the prior version, increments the variant version, and returns the corrected variant to draft. Editing an approved variant changes it to `approval_invalidated`.

The corrected variant must re-enter named review before it can participate in a new manual export package.

## Downstream authority revalidation

Campaign approval depends on current Product Core claim/evidence authority and, when the Campaign uses a selected ICP, current selected-ICP authority.

Product Core corrections therefore revalidate dependent Campaign authority. When the authority used by an approved Campaign is no longer valid, the Campaign becomes `approval_invalidated`, and approved descendants are invalidated under their existing ownership boundaries.

The invalidated Campaign and descendants retain prior review context and append the reason approval was invalidated. Nothing is silently re-approved after upstream authority is corrected.

## Historical exports are immutable

A manual export package records what was approved at the time it was created. Later Product Core, Campaign, asset, or variant corrections do not rewrite or delete that historical package.

A historical export also does not become evidence of publication or delivery. Its manifest continues to distinguish export readiness from publishing approval and provider delivery.

## Failure and recovery

Correction forms preserve entered values when validation or local storage rejects a mutation. Errors are shown in the correction context, and saved authority is not intentionally changed on a failed mutation.

Product Truth input parsing is handled inside the same recoverable mutation path, so malformed terminology such as a line missing `term = preferred wording` is shown in context instead of escaping as an unhandled form error.

Product Core correction and dependent Campaign revalidation are two local authority writes. If the Product Truth or ICP correction saves successfully but dependent Campaign revalidation fails afterward, Viable does **not** claim that the correction was unsaved. The correction remains durable, the UI reports that downstream revalidation is incomplete, and the background revalidator leaves that Product Core signature retryable rather than marking the failed revalidation as handled. Reopening Product Core or Campaigns retries the revalidation path.

No correction workflow requires the user to edit JSON, invent internal record identifiers, or use a terminal.

## Boundaries deliberately unchanged

This correction slice does not add direct publishing, provider delivery, live crawling, CRM behavior, or ViMax execution. Draft, review, approval, scheduling, export, delivery, provider verification, and outcome evidence remain separate states under their owning contexts.
