# Product and ICP desktop workflow

## Purpose

This guide covers the internal Home and Product workflow implemented for Viable Slice 1.

The workflow is local-first. It does not require an external account, publishing destination, or credential. Data currently belongs to the desktop profile in which it was created.

## Primary journey

1. Create a product workspace with a product name, plain-language description, lifecycle, supported environments, and named owner.
2. Verify product truth by recording current capabilities, limitations, positioning, alternatives, differentiation, offers, and calls to action.
3. Record evidence with its origin, observation date, freshness-review date, and confidence.
4. Apply named human review to non-generated evidence. Generated suggestions remain visibly separate and cannot become reviewed observed evidence.
5. Create at least two plausible ICP hypotheses.
6. For each hypothesis, record users, economic buyers, champions, blockers, disqualifiers, anti-ICP conditions, assumptions, contradictions, next validation action, change conditions, and an explained assessment for every canonical ICP dimension.
7. Compare candidates dimension by dimension. Viable does not calculate an unexplained composite ICP score.
8. Apply named human review to a candidate.
9. Select a primary ICP only after it has reviewed non-generated evidence, disqualifiers, a next validation action, a named selector, and a rationale.
10. Record an explained marketability assessment across all thirteen readiness dimensions.
11. Convert a readiness gap into an owned action.
12. Return Home to review the next highest-value action, stale evidence, contradictions, and open work.

## Authority and safety

Product Core owns product truth, claims, and canonical ICP hypotheses. Signals and later bounded contexts may contribute evidence, but they cannot silently select or revise the primary ICP.

A generated suggestion is not observed evidence. A broad audience, event attendee, repository visitor, follower, or anonymous interaction is not automatically an ICP or qualified lead.

Externally consequential action is outside this workflow and continues to require named human approval for the exact action scope.

## State behavior

The desktop workflow visibly distinguishes:

- loading;
- an empty workspace;
- local and offline-ready operation;
- stale evidence;
- unresolved contradictions;
- blocked ICP selection;
- blocked assessment;
- failed persistence;
- recovery to the last saved workspace.

Status is communicated with text and structure as well as color.

## Current limitations

- Data is stored in the current desktop webview profile. Backup, export, restore, and schema migration are not complete.
- Claims are enforced by Product Core but do not yet have a complete desktop editing surface.
- Validation experiments are supported by the domain service but do not yet have a complete desktop editing surface.
- Hands-on screen-reader review and unfamiliar-founder acceptance are pending.
- The internal Debian package is validated, but signing, cross-platform installers, updates, and end-user release are not ready.
