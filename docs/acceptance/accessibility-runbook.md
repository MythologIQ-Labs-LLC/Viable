# Accessibility and Recovery Acceptance Runbook

Issue authority: #79  
Candidate baseline: `311eb4831e5ede62833cd0b34c37887189d2c081`

## Goal

Determine whether the integrated Viable desktop candidate can be operated, understood, and recovered hands-on without relying on implementation knowledge or automated-contract assumptions.

This runbook validates the remaining human criteria in #79. It does not replace release-platform validation in #36.

## Required evidence before starting

The facilitator records:

- exact candidate commit;
- build/package source;
- operating system and version;
- display resolution/scaling;
- browser/webview/native shell version where relevant;
- keyboard type/layout if materially relevant;
- screen reader and version for screen-reader runs;
- reduced-motion setting used;
- workspace seed or clean-start identity;
- participant role and facilitator identity without unnecessary personal data.

If the intended environment cannot run a packaged/native candidate, record the run as exploratory rather than packaged-native acceptance.

## Facilitation rule

The facilitator may read the task prompt and answer questions about the test procedure. The facilitator must not teach the application, point to controls, name hidden prerequisites, explain bounded contexts, or complete work for the participant.

Any intervention that helps the participant find or understand product behavior must be recorded. An intervention may constitute a P1 finding even when the task is eventually completed.

## Pass criteria

A run passes only when:

- primary journeys can be completed using keyboard-only operation;
- the same primary journeys remain usable at 200% zoom;
- status and state remain understandable without color or motion;
- required controls have meaningful accessible names and context;
- validation and failure states are perceivable and repairable;
- focus moves predictably after validation, navigation, dialogs, and recovery actions;
- unsaved or failed input is not silently lost;
- native desktop behavior does not introduce a blocker absent from deterministic contracts;
- no P0 or unresolved P1 finding remains for the tested scope.

## Test A — Keyboard-only primary navigation

Use no pointer device after the application opens.

1. Reach the main content from application start.
2. Traverse the primary navigation areas.
3. Open Home attention and follow one recommended action to its authoritative record.
4. Navigate into Product & audience, Signals, Campaigns/Studio, Calendar, Analytics/Learning, and Workspace.
5. Open and close any expandable/advanced section encountered in the primary journey.
6. Return using in-app navigation and Back/Forward where available.
7. Trigger one in-app review surface and move through all actionable controls without submitting an irreversible decision unless the seeded scenario requires it.

Record:

- focus order;
- visible focus;
- keyboard traps;
- unreachable controls;
- unexpected focus resets;
- places where the participant cannot identify what currently has focus;
- whether Back/Forward behavior matches visible state.

## Test B — Form entry, validation, and repair

Using keyboard only:

1. Open a primary editable form in Product, Campaigns/Studio, or another seeded workflow.
2. Enter valid content into several fields.
3. Deliberately leave or make one required field invalid.
4. Submit or continue.
5. Observe the error announcement and visible repair guidance.
6. Repair the invalid field.
7. Complete or save the form.

Pass expectations:

- the invalid field is visibly identified;
- the relationship between the error and control is understandable;
- focus reaches the first useful repair target or a useful visible alert;
- previously entered valid values remain present;
- successful recovery does not duplicate, silently approve, or otherwise mutate unrelated authority.

## Test C — Unsaved-work protection

1. Begin an ICP or Marketability Assessment draft.
2. Enter enough content to create meaningful unsaved work.
3. Attempt to navigate away before saving.
4. Observe the warning/guard behavior.
5. Cancel the navigation and verify the entered work remains.
6. Save the draft.
7. Leave the surface and return.
8. Verify the saved draft resumes from the expected state.

Record any silent loss, confusing warning language, inaccessible dialog behavior, or inability to return to the draft.

## Test D — Deliberate failure and recovery

Use a supported local workflow that can fail safely, such as a malformed/unsupported import or validation error. Do not introduce secrets or malicious external content.

1. Enter or select the test input.
2. Trigger the failure.
3. Observe the visible error and announced state.
4. Confirm successful data from other contexts is not falsely shown as failed or empty.
5. Repair the input.
6. Retry.
7. Verify the repaired operation succeeds without losing unrelated entered work.

Pass expectations:

- failure is explicit and does not become successful empty state;
- the repair step is discoverable;
- entered values/files that can safely remain are retained;
- focus does not disappear into hidden UI;
- success after retry is distinguishable from the prior failure.

## Test E — Review-state comprehension without color

Use grayscale display mode where available, or otherwise cover/ignore color cues and rely on text, shape, position, and accessible naming.

For representative records, identify and explain the difference between:

- draft;
- in review;
- changes requested;
- approved;
- exported;
- scheduled;
- delivered or manually recorded outcome;
- measured/learned.

The participant must not infer provider delivery from approval, scheduling, or export.

Any state that becomes ambiguous without color is a finding.

## Test F — 200% zoom / text-scale

Set the applicable interface zoom or OS text scaling to 200% without changing the test data.

Exercise:

- Home attention;
- one long Product form/draft;
- one in-app review surface;
- Campaign/Studio record view;
- Calendar or Analytics surface;
- Workspace scope/backup/reset view.

Record:

- horizontal scrolling that blocks ordinary completion;
- clipped controls or text;
- overlapping content;
- modal/dialog content that cannot be reached;
- focus moving off-screen with no practical recovery;
- labels separated from their controls;
- status or validation text becoming hidden.

## Test G — Reduced motion

Enable the operating system/browser reduced-motion preference before launching the candidate when possible.

Navigate through the primary surfaces and trigger state changes that normally animate.

Pass expectations:

- no necessary information depends on animation;
- disabling/reducing motion does not remove status or focus cues;
- no motion blocks task completion or causes inaccessible timing behavior.

## Test H — Screen reader

Run at least one screen-reader exercise on the primary accepted desktop platform. Record the exact product and version used.

Exercise:

1. launch and identify application/page title and major landmarks;
2. traverse primary navigation;
3. inspect a Home attention item;
4. complete representative form fields;
5. trigger validation and hear/locate the error;
6. open an in-app review surface and identify item context, reviewer identity, decision controls, and prior feedback where present;
7. inspect state/status information;
8. perform a safe save/retry flow.

Record:

- missing/duplicated names;
- meaningless control names;
- unlabeled status changes;
- reading-order mismatch;
- inaccessible expandable regions;
- context loss when dialogs/panels open or close;
- errors that are visible but not practically discoverable with the screen reader.

## Test I — Workspace recovery boundary

Use a disposable acceptance workspace.

1. Open Workspace management.
2. Review the scope of the workspace and its contexts.
3. Create/download a backup through the product UI.
4. Perform the documented destructive reset/delete path only after confirming the scope.
5. Verify the workspace is removed as described while unrelated preferences/files remain outside the deletion boundary.
6. Restore the validated backup.
7. Verify the restored workspace returns to the expected state.

If corrupt-context quarantine is part of the seeded scenario, verify quarantine export before destructive deletion.

Do not run this test against personal or production data.

## Result classification

Use the shared severity model from `docs/acceptance/README.md`.

Examples:

- keyboard trap preventing completion: P0;
- facilitator must explain where a required review action lives: P1;
- focus order is awkward but completion remains obvious: P2;
- minor spacing issue with no comprehension impact: P3.

## Required rerun after remediation

For every P0/P1 remediation:

1. rerun the exact failed test;
2. rerun the adjacent journey that shares the changed surface;
3. complete one keyboard-only smoke journey from Home to a downstream action;
4. preserve both the failed and passing result records.

## Closure evidence for #79

Before #79 can close, its issue thread must link to result records proving:

- keyboard-only primary journey pass;
- 200% zoom pass;
- non-color/reduced-motion comprehension pass;
- at least one screen-reader pass on the accepted primary environment;
- deliberate failure/recovery pass;
- native desktop behavior pass;
- all P0/P1 findings closed and rerun.

The issue should name any platform not yet accepted rather than implying universal desktop accessibility.