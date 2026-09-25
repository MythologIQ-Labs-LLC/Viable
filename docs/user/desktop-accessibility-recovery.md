# Desktop accessibility and recovery

Viable treats accessibility and recovery as part of the workflow contract, not as visual polish.

This guide documents the deterministic implementation work tracked by issue #79 and separates it from the hands-on acceptance that still has to be performed on target desktop environments.

## Visible form repair

Primary desktop forms use native controls and native constraint validation. Viable enhances invalid controls so that repair information is also available in the application surface:

- the invalid control receives `aria-invalid="true"`;
- the validation message is rendered next to that control;
- the control references the message through `aria-describedby`;
- the first invalid control receives focus;
- changing the control clears its prior inline error state.

This supplements native validation rather than replacing browser or operating-system accessibility behavior.

## Async failure recovery

For ordinary forms that still rerender their owning surface after a service failure, Viable snapshots the submitted string values before the mutation is attempted.

If the operation fails and the owning surface rerenders:

- the submitted values are restored into the matching form;
- a visible, focusable `role="alert"` states that the form was not saved;
- when the failure message maps to a repairable control, that control is marked invalid, associated with the error, and focused;
- otherwise the visible alert itself receives focus.

The snapshot is recovery state only. It does not write Product Core, Campaign, Signal, or other workflow authority.

Revision-aware and progressive-draft forms retain their own existing in-place recovery behavior and are not overridden by this fallback.

## Programmatic labels

Viable keeps visible labels authoritative when one label clearly owns one control.

When a control is unlabeled or a legacy label contains multiple controls, the desktop enhancement supplies a programmatic `aria-label` derived from the owning form or fieldset plus the control name. This avoids two controls sharing one ambiguous accessible name while preserving the visible UI.

## Predictable navigation and history

Stateful desktop navigation is mirrored into the current URL fragment and browser/Tauri history state.

- activating a navigation control pushes the selected surface into history;
- Back and Forward restore the corresponding enabled navigation surface;
- a valid fragment can restore a surface when the shell becomes available;
- an invalid or unavailable fragment falls back to the actual current surface rather than stranding the user;
- navigation remains subject to existing unsaved-draft protection, so route handling does not bypass draft warnings.

The history layer stores navigation position only. It does not become an authority store.

## Status without color or motion

Status pills and state panels continue to carry textual labels such as `draft`, `approved`, `warning`, `offline-ready`, or the underlying record state. Color is supplementary. Reduced-motion behavior remains governed by the desktop CSS media query rather than by removing state information.

## Hands-on acceptance still required

Deterministic tests can verify markup contracts, focus-management code paths, recovery semantics, and desktop packaging. They cannot honestly prove how a keyboard, screen reader, operating-system focus model, or 200% zoom behaves in a real packaged application.

Before issue #79 can be considered fully accepted, the packaged candidate must be exercised hands-on and the results recorded for each target environment:

| Check | Required evidence |
| --- | --- |
| Keyboard only | Complete the primary Product -> Campaign -> export journey without pointer input; record traps, unreachable controls, and unexpected focus movement. |
| Screen reader | Verify headings, form names, validation announcements, status changes, navigation, dialogs/prompts, and recovery messages with the target platform reader. |
| 200% zoom | Verify no essential control, text, comparison, or workflow action is clipped, overlapped, or made unreachable. |
| Reduced motion | Enable OS reduced-motion preference and verify information and focus movement remain understandable without animation dependence. |
| Non-color status | Verify draft/review/approval/error/stale states remain distinguishable in text when color cues are ignored. |
| Failure recovery | Trigger validation and local persistence failures and verify input is retained or restored with a visible, announced repair path. |
| Native desktop | Repeat the critical checks in the packaged Tauri application, not only a browser-hosted build. |

Record the operating system, application build/commit, assistive technology and version, viewport/zoom conditions, pass/fail result, defect link, and remediation commit for every run.

## Boundaries unchanged

Accessibility and recovery enhancements do not approve work, create provider delivery claims, publish content, or change record ownership. Draft, review, approval, schedule, export, delivery, provider verification, and observed outcome remain distinct states under their owning contexts.
