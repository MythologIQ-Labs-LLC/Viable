# UX Acceptance Candidate — 2026-10-06

## Purpose

Freeze one integrated Viable build for human accessibility (#79) and unfamiliar-user (#81) acceptance on the PWA-first runtime (ADR-0010).

This record is not a release declaration. It identifies the exact code, runtime, and machine-validation boundary against which human evidence is collected. **No human acceptance has been performed against it yet.**

It supersedes [UX candidate 2026-09-25](ux-candidate-2026-09-25.md). That candidate predates the PWA runtime, IndexedDB authority, the localhost self-host path, the credential vault, and the publishing foundation, so September results cannot be reused here.

## Start here (facilitator)

You need Node.js 22+, npm, git, and a Chromium desktop browser (Chrome, Edge, or Brave).

```bash
git clone https://github.com/MythologIQ-Labs-LLC/Viable.git   # or: git fetch origin
cd Viable
git checkout fee77c834372cbe967c77f6b86ad79d6638aeafe
npm ci
npm run pwa:selfhost
```

1. Open **http://localhost:4175** in a fresh browser profile. Use exactly that address; another port is a different, empty profile.
2. Open **Workspace → Runtime** and confirm the build identity begins **`1bd83169cbba`** and the storage engine is **IndexedDB**. If the build differs, stop: you are not testing this candidate.
3. Restore the seed: follow [`seed/README.md`](seed/README.md) to restore [`ux-acceptance-seed-v2.json`](seed/ux-acceptance-seed-v2.json) with **Restore into empty profile**. The seed file lives on this acceptance branch; copy it from a checkout of `acceptance/ux-integrated-candidate`, or from `main` once that branch merges.
4. Copy [`RESULT-TEMPLATE.md`](RESULT-TEMPLATE.md) for each participant and run the [accessibility runbook](accessibility-runbook.md) or the [unfamiliar-user runbook](unfamiliar-user-demo-runbook.md).
5. Between participants, delete the workspace from **Workspace** and restore the seed again, or use a new browser profile at the same address.

## Frozen candidate

| Field | Value |
|---|---|
| Candidate commit | `fee77c834372cbe967c77f6b86ad79d6638aeafe` (branch `acceptance/candidate-2026-10-06`) |
| Candidate tree | `137c2e5b7c2d9908b5de2cc9a04f68569f190dd5` |
| Composition | `main` at `aebe800` (#128) + PR #129 at `b94f042` + PR #124 at `7984a60`, merged without conflicts |
| PWA build identity | `1bd83169cbba5396031e60329beb309bcbce2e6acc9c11995ab6ea76e0415200` (content hash, shown in Workspace → Runtime) |
| Accepted environment | Production PWA via `npm run pwa:selfhost` at `http://localhost:4175`, Chromium desktop browser |
| Exploratory only | Firefox, Safari/WebKit, and the native Tauri shell. Results are recorded but do not count toward acceptance |
| Starting seed | `ux-acceptance-seed-v2` (`crc32:c9f2ee2d`) |

The candidate is an integration branch because #124 and #129 had not merged into `main` when this record was written. If both merge unchanged, `main` carries the same application code. Before using `main` instead, confirm that this prints nothing:

```bash
git diff --stat fee77c834372cbe967c77f6b86ad79d6638aeafe origin/main -- apps src scripts package.json package-lock.json
```

If it prints anything, keep testing the candidate commit, or create a superseding record.

## What changed since the 2026-09-25 candidate

- PWA-first runtime: a production build, a service worker that caches the shell only, user-confirmed updates with per-tab consent, and a runtime capability panel (#115, #118, #123, #125, #126, #128).
- IndexedDB workspace authority that fails closed; backup/delete/restore validated in a real browser (#117, #119, #126).
- Publication inventory, deterministic scheduler, native credential vault (#104, #105, #108). In the browser, the vault and connected publishing show as unavailable with a reason.
- Navigation trap and Calendar freeze fixes (#113, #116).
- #129: Signals and Repository Growth live public GitHub collection works. Before it, it always failed. The native CSP allows exactly that origin.
- #124: the app starts in Firefox and WebKit; startup no longer leaves `<main>` marked `aria-busy`, which affected screen-reader behavior on Home, Product, Signals, and Market.

## Machine-validation baseline

| Evidence | Result |
|---|---|
| `npm run validate` on the candidate commit | pass: 311 tests; coverage 86.77% lines, 67.18% branches, 89.30% functions |
| Chromium PWA smoke on the candidate commit | pass, including the new `aria-busy` check |
| Rust fmt and tests on the candidate commit | pass |
| CI dispatch on the candidate commit (run 37430207753) | `validate` (including the Chromium smoke) pass; Firefox full smoke pass; WebKit fails only on offline reload and the update reload, plus the recorded engine limitation, as on PR #124 |
| Seed restore on the candidate build (Chromium) | restored; all 9 views render the seed with 0 page or console errors; `aria-busy` cleared on every view |
| PR #129 exact head `b94f042` | CI, Desktop (Rust 1.88, Tauri bundle, `.deb`), CodeQL, Security audit all pass |
| PR #124 exact head `7984a60` | CI, Desktop, and CodeQL pass; Firefox full smoke passes; WebKit: one engine limitation plus offline/update reload failures (see PR #124) |

These checks establish the machine baseline only. They do not satisfy #79 or #81.

## Known limitations testers should not report as new findings

- Safari is not a supported environment; see PR #124 for the WebKit evidence.
- Connected LinkedIn publishing and the credential vault are unavailable in the browser by design (ADR-0010). Manual activation is the path under test.
- The PWA does not publish while closed and does not promise exact-time publication.
- Live GitHub collection (Signals, Repository Growth) needs network access and is subject to GitHub's unauthenticated rate limit. Do not use it as the deliberate failure fixture.
- Seed limitations are listed in [`seed/README.md`](seed/README.md#known-limitations).

## Candidate-control rule

Acceptance results are valid only for this exact commit and build identity, or for a formally superseding candidate record.

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
