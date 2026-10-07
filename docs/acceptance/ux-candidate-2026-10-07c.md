# UX Acceptance Candidate — 2026-10-07c

## Purpose

Freeze one integrated Viable build for human accessibility (#79) and unfamiliar-user (#81) acceptance on the PWA-first runtime (ADR-0010).

This record is not a release declaration. It identifies the exact code, runtime, and machine-validation boundary against which human evidence is collected. **No human acceptance has been performed against it yet.**

It supersedes [UX candidate 2026-10-07b](ux-candidate-2026-10-07b.md), recorded the same day. The QA P3 fixes #157–#161 changed the application after that candidate was frozen, so its build identity no longer matches `main`. No human results were recorded against the 2026-10-07b candidate, so none need to be rerun.

## Start here (facilitator)

You need Node.js 22+, npm, git, and a Chromium desktop browser (Chrome, Edge, or Brave).

```bash
git clone https://github.com/MythologIQ-Labs-LLC/Viable.git   # or: git fetch origin
cd Viable
git checkout 7285d0dde0c14b6dd84490613edc8cb8f5f242ac
npm ci
npm run pwa:selfhost
```

1. Open **http://localhost:4175** in a fresh browser profile. Use exactly that address; another port is a different, empty profile.
2. Open **Workspace → Runtime** and confirm the build identity begins **`d8047c019a59`** and the storage engine is **IndexedDB**. If the build differs, stop: you are not testing this candidate.
3. Restore the seed: follow [`seed/README.md`](seed/README.md) to restore [`ux-acceptance-seed-v2.json`](seed/ux-acceptance-seed-v2.json) with **Restore into empty profile**. **Home** shows the eight attention items straight away; you do not need to reload.
4. Copy [`RESULT-TEMPLATE.md`](RESULT-TEMPLATE.md) for each participant and run the [accessibility runbook](accessibility-runbook.md) or the [unfamiliar-user runbook](unfamiliar-user-demo-runbook.md).
5. Between participants, delete the workspace from **Workspace** and restore the seed again, or use a new browser profile at the same address.

## Frozen candidate

| Field | Value |
|---|---|
| Candidate commit | `7285d0dde0c14b6dd84490613edc8cb8f5f242ac` on `main` (#163) |
| Composition | The 2026-10-07b candidate (`faffc1e`) plus #162 (evidence recheck history) and #163 (readable names, duplicate-proposal notice, load-failure state, announcements). The documentation-only commits #155 and `8cc5b57` do not change the build |
| PWA build identity | `d8047c019a59843dce735ba8cafc2a8960db5a42ad25d09b62f3485afc9c29cc` (content hash, shown in Workspace → Runtime) |
| Accepted environment | Production PWA via `npm run pwa:selfhost` at `http://localhost:4175`, Chromium desktop browser |
| Exploratory only | Firefox, Safari/WebKit, and the native Tauri shell. Results are recorded but do not count toward acceptance |
| Starting seed | `ux-acceptance-seed-v2` (`crc32:c9f2ee2d`), unchanged |

The build identity hashes only the files the PWA ships, so documentation commits after `7285d0d`, including the one that adds this record, do not change it. Current `main` may be used for a session **only if Workspace → Runtime reports `d8047c019a59…`**. Otherwise check out the candidate commit above or record a superseding candidate.

## What changed since the 2026-10-07b candidate

- **Evidence recheck history (#159).** Rechecking stale evidence keeps the original review (who accepted it, and when) and adds the recheck to a history. The evidence card shows the most recent recheck. The next review date can be at most three years ahead.
- **Readable names (#157).** Signals and Website Watch name each source by its label and when it was configured, for example "Manual JSON import (9/7/2026, 9:00:00 AM)", instead of an internal identifier. Video briefs show the script's title. The Website Watch planning note names the site and time. Repository Growth statuses read Open, In progress, Completed, and Dismissed.
- **Earlier proposals shown (#158).** Before converting a signal again, its convert form lists the proposals it already produced. Converting again is still allowed.
- **Load failures fail closed (#160).** If a workspace cannot be reloaded from storage, the screen says nothing was changed, shows no previously loaded content, and offers **Try loading again**.
- **Announcements (#161).** Workspace → Runtime announces the storage-persistence result and the support-diagnostics download.

None of these changes alters what is recorded, who must be named, or any approval rule.

## Machine-validation baseline

| Evidence | Result |
|---|---|
| PR #162 and PR #163 exact heads | CI `validate` (deterministic tests plus the Chromium PWA smoke), Desktop (Rust 1.88, Tauri bundle, `.deb`), CodeQL, and Security audit passed. Firefox and WebKit matrices dispatched on both PR heads: Firefox passed the full smoke; WebKit's only failure was the pre-existing replace-current reload crash |
| `main` at `7285d0d` | CI (`validate`, including the Chromium smoke), Desktop, and CodeQL passed (CI run 37699411087, Desktop run 37699411181) |
| Firefox / WebKit matrix on `main` at `7285d0d` | Firefox 142: the full smoke passed. WebKit 26 (exploratory; the matrix job does not block merges): every seeded-journey check passed; the only failure was the pre-existing, undiagnosed renderer crash on reload after a replace-current restore. Safari remains unsupported |
| `npm run validate` on the candidate tree | pass: 388 tests |
| Seed restore on the candidate build (Chromium 154, Windows, fresh profile) | restored without reload; Workspace shows 4/7 contexts and 25 records; Home shows the eight documented items in order; all 9 views render with `aria-busy` cleared; 0 page or console errors |

These checks establish the machine baseline only. They do not satisfy #79 or #81.

## Known limitations testers should not report as new findings

- Safari is not a supported environment.
- Connected LinkedIn publishing and the credential vault are unavailable in the browser by design (ADR-0010). Manual activation is the path under test.
- The PWA does not publish while closed and does not promise exact-time publication.
- Live GitHub collection needs network access and is subject to GitHub's unauthenticated rate limit. Do not use it as the deliberate failure fixture.
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
