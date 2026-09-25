# Viable Acceptance Program

This directory contains the human acceptance procedure for the integrated Viable UX candidate.

Human acceptance is intentionally separate from deterministic CI, code review, and implementation completion. A passing build proves that the software satisfies its automated contracts. It does not prove that an unfamiliar person can understand, complete, recover, or explain the product journey.

## Current candidate

The current frozen acceptance baseline is documented in [UX candidate 2026-09-25](ux-candidate-2026-09-25.md).

Do not silently move an acceptance run to a newer commit. If the candidate changes, record the new commit, validation evidence, reason for the change, and which prior acceptance evidence must be rerun.

## Acceptance tracks

### Accessibility and recovery

Use [Accessibility acceptance runbook](accessibility-runbook.md) for issue #79.

This track verifies hands-on keyboard operation, screen-reader behavior, 200% zoom, reduced motion, non-color status comprehension, deliberate failure recovery, unsaved-work protection, and native desktop behavior.

### Unfamiliar-user demo

Use [Unfamiliar-user demo runbook](unfamiliar-user-demo-runbook.md) for issue #81 and the linked vertical-slice acceptance gates.

This track verifies whether an intended user can understand and complete the marketability workflow without presenter rescue or architectural coaching.

## Recording evidence

Copy [Acceptance result template](RESULT-TEMPLATE.md) for every participant/environment run. Never overwrite a prior result to make a later rerun look like the original run passed.

Each result must record:

- exact candidate commit;
- build/package source;
- operating system and relevant assistive technology;
- starting workspace/fixture identity;
- facilitator and participant role without unnecessary personal data;
- task outcome and elapsed time;
- wrong turns and facilitator interventions;
- observed defects and severity;
- whether the run is valid, invalid, passed, failed, or requires remediation;
- linked remediation issues and rerun evidence.

## Finding severity

Use the same severity language across both tracks:

- **P0 blocker**: the user cannot complete or safely recover, data or authority can be lost/misrepresented, or the workflow creates a materially unsafe state.
- **P1 material friction**: the user requires facilitator rescue, seriously misunderstands state/authority, or repeatedly cannot discover the correct path without outside help.
- **P2 friction**: the user completes independently but encounters avoidable confusion, delay, or repeated wrong turns.
- **P3 polish**: cosmetic or preference-level finding that does not materially affect comprehension, completion, recovery, or state truthfulness.

P0 and P1 findings block closure of the affected acceptance gate. P2 findings should be fixed when inexpensive or explicitly scheduled. P3 findings belong in ordinary backlog unless they combine into a broader usability pattern.

## Remediation discipline

Create a narrow issue only for a reproducible finding. Include:

1. candidate commit and acceptance result that exposed it;
2. observed behavior rather than an inferred redesign;
3. expected user outcome;
4. severity and why;
5. exact journey/surface;
6. acceptance criterion for the fix;
7. required rerun scope.

Do not turn acceptance into an unbounded redesign program. After remediation, rerun the affected journey and one full smoke journey. Preserve the original failed result alongside the passing rerun.

## Closure rule

Issue #79 closes only when its documented hands-on accessibility criteria pass on the accepted environment set.

Issue #81 closes only when the unfamiliar-user demo gate passes without presenter rescue and any P0/P1 findings are remediated and rerun.

Linked product/release issues retain their own remaining gates. Closing #79 or #81 does not automatically declare Viable a supported end-user release.