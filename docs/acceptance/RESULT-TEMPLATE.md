# Acceptance Result — TEMPLATE

Copy this file for each acceptance run. Use a filename such as:

`YYYY-MM-DD-<track>-<participant-or-environment-label>.md`

Do not replace a failed result with a later passing rerun. Preserve both.

## Run identity

- Track: accessibility / unfamiliar-user / combined / smoke rerun
- Result: pending / pass / conditional / fail / invalid
- Candidate commit:
- Build/package source:
- Run date and local time:
- Facilitator:
- Participant role/category:
- Prior Viable familiarity:
- Workspace seed/backup identity:

## Environment

- Operating system and version:
- Native package/build type:
- Display resolution/scaling:
- Interface zoom/text scale:
- Reduced motion setting:
- Screen reader and version, if used:
- Keyboard-only run: yes / no
- Other relevant environment details:

## Scenario

- Starting state:
- Task prompt/scenario:
- Intended channel set, if applicable:
- Deliberate failure used, if applicable:
- Destructive workspace test performed: yes / no

## Timing

- Start time:
- Time to first meaningful action:
- Total elapsed time:
- Pauses attributable to product confusion:
- Pauses attributable to test/environment setup:

## Journey results

| Journey | Outcome | Wrong turns | Facilitator intervention | Notes |
| --- | --- | ---: | --- | --- |
| Find next action | | | | |
| Product truth / evidence / ICP | | | | |
| Campaign/content review and correction | | | | |
| Intended-channel export | | | | |
| Delivery/outcome/learning | | | | |
| Deliberate failure recovery | | | | |
| State comprehension | | | | |
| Workspace management | | | | |
| Accessibility-specific exercises | | | | |

Use `not applicable` rather than silently leaving a required journey ambiguous.

## State comprehension

Record the participant's own explanation of consequential states where tested.

- Draft:
- In review / changes requested:
- Approved:
- Exported:
- Scheduled:
- Delivered / human-recorded outcome:
- Provider verified, if present:
- Measured / learned:

Note any incorrect real-world consequence the participant assigned to a state.

## Accessibility observations

- Visible focus:
- Focus order:
- Keyboard traps/unreachable controls:
- Accessible names/context:
- Validation announcement and repair:
- 200% zoom behavior:
- Reduced-motion behavior:
- Non-color status comprehension:
- Screen-reader reading order/context:
- Native desktop-specific behavior:

## Failure and recovery observation

- Failure introduced:
- Failure visible and understandable:
- Entered work retained:
- Repair discoverable without rescue:
- Retry successful:
- Unrelated state preserved:
- Notes:

## Facilitator interventions

Record every intervention that changed what the participant did next.

| Time/journey | Intervention | Why it occurred | Would participant likely have progressed without it? |
| --- | --- | --- | --- |
| | | | |

A rescue intervention should normally be triaged as a P1 candidate finding until reviewed.

## Findings

| ID | Severity | Surface/journey | Observed behavior | Expected outcome | Reproducible? | Linked issue |
| --- | --- | --- | --- | --- | --- | --- |
| F-01 | | | | | | |

Severity definitions are in `docs/acceptance/README.md`.

## Participant comments

Record brief, relevant think-aloud comments that help explain observed comprehension or confusion. Do not collect unnecessary personal information.

- 

## Facilitator assessment

- Did the participant complete independently?
- Did the participant correctly understand consequential states?
- Did the participant recover from the deliberate failure independently?
- Were any P0/P1 findings exposed?
- Is this run valid acceptance evidence?
- Why?

## Required remediation/rerun

- Blocking issues:
- P2/P3 disposition:
- Exact journeys to rerun:
- Full smoke rerun required: yes / no
- Superseding candidate required: yes / no

## Final disposition

Choose one and explain:

- **PASS** — valid evidence for the tested acceptance scope; no unresolved P0/P1 finding.
- **CONDITIONAL** — useful evidence, but blocking remediation/rerun remains.
- **FAIL** — the acceptance criterion was not met.
- **INVALID** — the run cannot be counted because candidate, seed, coaching, or environment control was compromised.

Disposition rationale:
