# UX Acceptance Candidate — 2026-10-07

## Purpose

Freeze one integrated Viable build for human accessibility (#79) and unfamiliar-user (#81) acceptance on the PWA-first runtime (ADR-0010).

This record is not a release declaration. It identifies the exact code, runtime, and machine-validation boundary against which human evidence is collected. **No human acceptance has been performed against it yet.**

It supersedes [UX candidate 2026-10-06](ux-candidate-2026-10-06.md). A machine-driven pass through that candidate's production build found P1 defects. One of them breaks the first facilitator step: right after restoring the seed, Home showed "Create a product workspace" until the page was reloaded. #145 fixes them. No human results were recorded against the 2026-10-06 candidate, so none need to be rerun.

## Start here (facilitator)

You need Node.js 22+, npm, git, and a Chromium desktop browser (Chrome, Edge, or Brave).

```bash
git clone https://github.com/MythologIQ-Labs-LLC/Viable.git   # or: git fetch origin
cd Viable
git checkout 445378c2dcce08c8393d205237dded53277b4764
npm ci
npm run pwa:selfhost
```

1. Open **http://localhost:4175** in a fresh browser profile. Use exactly that address; another port is a different, empty profile.
2. Open **Workspace → Runtime** and confirm the build identity begins **`86c2c9a956b4`** and the storage engine is **IndexedDB**. If the build differs, stop: you are not testing this candidate.
3. Restore the seed: follow [`seed/README.md`](seed/README.md) to restore [`ux-acceptance-seed-v2.json`](seed/ux-acceptance-seed-v2.json) with **Restore into empty profile**. You do not need to reload: **Home** shows the eight attention items straight away.
4. Copy [`RESULT-TEMPLATE.md`](RESULT-TEMPLATE.md) for each participant and run the [accessibility runbook](accessibility-runbook.md) or the [unfamiliar-user runbook](unfamiliar-user-demo-runbook.md).
5. Between participants, delete the workspace from **Workspace** and restore the seed again, or use a new browser profile at the same address.

## Frozen candidate

| Field | Value |
|---|---|
| Candidate commit | `445378c2dcce08c8393d205237dded53277b4764` on `main` (#145) |
| Composition | `main` at `379050b` (#139–#143) plus the local-dogfood QA remediation (#145) |
| PWA build identity | `86c2c9a956b4bb6ccb42639362b819e0948b7d514abea06aab44cd9f49b28a20` (content hash, shown in Workspace → Runtime) |
| Accepted environment | Production PWA via `npm run pwa:selfhost` at `http://localhost:4175`, Chromium desktop browser |
| Exploratory only | Firefox, Safari/WebKit, and the native Tauri shell. Results are recorded but do not count toward acceptance |
| Starting seed | `ux-acceptance-seed-v2` (`crc32:c9f2ee2d`), unchanged |

The build identity hashes only the files the PWA ships. Documentation commits after `445378c`, including the one that adds this record, do not change it. Current `main` may therefore be used for a session **only if Workspace → Runtime reports `86c2c9a956b4…`**. If it reports anything else, check out the candidate commit above or record a superseding candidate.

## What changed since the 2026-10-06 candidate

The changes come from #145. The full record is [`docs/reviews/local-dogfood-qa-2026-10-07.md`](../reviews/local-dogfood-qa-2026-10-07.md).

- **Restore and delete take effect immediately.** Home, Product, Signals, and Market reload the workspace from storage when you open them. Before, Home showed an empty profile right after a restore and the deleted workspace right after a delete.
- **Stale evidence can be rechecked.** The Home item "Recheck stale evidence" now opens a recheck form. A named reviewer either keeps the evidence with a next review date of tomorrow or later, or withdraws it. Withdrawal returns approved claims that cite the evidence to proposed review and adds a contradiction to ICP hypotheses that rely on it. The seed's "Agency pricing objection notes" item is this path.
- **Hidden UI stays hidden.** Product now shows one Product Truth editor, not two. Cancelling a review panel, or pressing Escape, keeps the record's review controls and returns focus to them.
- **Failed imports say so.** A rejected import, including the seed's [malformed failure fixture](seed/malformed-signals-import.json), is announced as failed. The pasted text stays in the form, and its section reopens.
- **Navigation and focus.**
  - Back and Forward return to the exact previous and next pages.
  - After an action, focus returns to the record that was acted on.
  - "Open created item" focuses the exact Calendar entry.
- **Wording and layout.**
  - Home labels its dates for what they are, such as "Due" or "Freshness review due".
  - Each Home open button has a distinct accessible name.
  - Empty-profile screens link to Product and to restoring a backup.
  - Studio no longer says Calendar cannot accept approved video variants.
  - The layout reflows without sideways scrolling at about 200% zoom.

The [seed README](seed/README.md) and the runbooks are unchanged. Their steps already expected Home to show the seed straight after restore, and already named "recheck the stale evidence" as participant work; this build is the first that supports both.

## Machine-validation baseline

| Evidence | Result |
|---|---|
| PR #145 exact head `723cff6` | CI `validate` (deterministic tests plus the Chromium PWA smoke) passed; Desktop (Rust 1.88, Tauri bundle, `.deb`), CodeQL (actions, JavaScript/TypeScript, Rust), and Security audit passed |
| `main` at `445378c` | CI (`validate`, including the Chromium smoke with the seeded acceptance journeys), Desktop, CodeQL, and Security audit passed (CI run 37675364783, Desktop run 37675364849) |
| Firefox / WebKit matrix on `main` at `445378c` | Firefox 142: the full smoke passed, including every seeded acceptance journey check. WebKit 26 (exploratory; the matrix job is non-blocking): the seeded journeys passed through restore without reload, Back/Forward, recheck, and review-panel cancel/Escape, then timed out opening the Signals raw-import disclosure. That step is undiagnosed and not yet classified as an engine or Viable defect (#149). The pre-existing, undiagnosed WebKit renderer crash on reload after replace-current restore also recurred. Safari remains unsupported |
| `npm run validate` on the candidate tree | pass: 386 tests; coverage 89.85% lines, 71.14% branches, 89.99% functions |
| Seeded acceptance journeys (new smoke section) | pass on the candidate; the same checks fail on the previous `main` (`379050b`) |
| Seed restore on the candidate build (Chromium 154, Windows, fresh profile) | restored without reload; Workspace shows 4/7 contexts and 25 records; Home shows the eight documented items in order; all 9 views render with `aria-busy` cleared; 0 page or console errors |

These checks establish the machine baseline only. They do not satisfy #79 or #81.

## Known limitations testers should not report as new findings

- Safari is not a supported environment.
- Connected LinkedIn publishing and the credential vault are unavailable in the browser by design (ADR-0010). Manual activation is the path under test.
- The PWA does not publish while closed and does not promise exact-time publication.
- Live GitHub collection needs network access and is subject to GitHub's unauthenticated rate limit. Do not use it as the deliberate failure fixture.
- Repository Growth has no address or history entry of its own. Reload returns to Product, and Back skips it (#146).
- Some actions still open a browser prompt instead of an inline form, for example Signals **Tag**, **Assign**, and **Save** (#147). Named review uses inline panels.
- Seed limitations are listed in [`seed/README.md`](seed/README.md#known-limitations).

## Candidate-control rule

Acceptance results are valid only for this exact build identity, or for a formally superseding candidate record.

If a P0/P1 remediation changes the application:

1. create a new candidate record rather than editing this one;
2. record the remediation issues and merged commits;
3. confirm CI and applicable native validation on the new candidate;
4. identify which previous human results remain valid;
5. rerun every journey materially touched by the remediation;
6. run one complete smoke journey before closing #81.

## Human gates this candidate exists to serve

None of these is satisfied by anything above:

- keyboard-only operation of the primary journeys;
- operation at 200% zoom;
- status understandable without color or motion (including Test J, runtime status);
- unfamiliar-user journeys with recorded participant role, environment, findings, and remediation;
- at least one screen-reader pass on the accepted environment.

## Acceptance exit

This candidate has completed its purpose when either:

- #79 and #81 pass against it; or
- a reproducible P0/P1 finding requires a remediation candidate that supersedes it.
