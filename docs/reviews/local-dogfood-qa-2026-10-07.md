# Local Dogfood QA and Remediation — 2026-10-07

## Scope and status

| Field | Value |
|---|---|
| Starting `main` | `379050badeada9f84ff2a9afa8c39b5d3b7e4cb6` |
| Runtime exercised | Production PWA (`npm run pwa:build`, served by `scripts/serve-pwa.mjs`) at `http://localhost:4175` |
| Browser | Google Chrome 154 (Windows 10), fresh profile per journey, driven by Playwright 1.56 |
| Starting states | Empty profile, and the committed `ux-acceptance-seed-v2` restored into an empty profile |
| Viewports | 1280×720, 1366×768, 1440×900, 1920×1080; 640×360 and 683×384 CSS px as a 200% zoom approximation |
| Kind of evidence | Automated, machine-driven. **This is not human acceptance.** It does not satisfy #79 or #81, and no screen reader was used. |

This record explains what an automated pass through the real product found and what changed. The acceptance candidate record (`docs/acceptance/ux-candidate-2026-10-06.md`) is not edited by this work; a superseding candidate must be recorded before human sessions run against the changed build.

## Journeys exercised

- First run with no workspace: every view, the empty states, creating a workspace with a failed submission first, reload persistence.
- Seed restore, then Home and every "Open exact record" target, Back, and reload.
- Product Core: evidence review, the review panel (cancel, Escape, decisions), claim rejection, ICP review, a resumable marketability assessment (failed completion, saved draft, reload, completion), readiness action start, and stale-evidence recheck.
- Signals: accept, dismiss, tag, convert to Product action and Campaign brief, materialize both, "Open created item", Back, reload, repeated conversion, a malformed raw import (the seed's failure fixture), and the manual evidence form.
- Website Watch Stage 1: watched-site validation (missing authorization, private address), a Webdog import with an off-origin dashboard link (rejected), a valid import, review, conversion to a website response action, and materialization into Calendar.
- Campaigns and Studio: correcting the changes-requested website variant, resubmitting, named re-approval, a LinkedIn-only export, and the manifest download.
- Video Production Stage 1: brief creation (failed then complete), submission, named approval, and a manual package.
- Calendar and Analytics: human-recorded delivery evidence, a performance import refused for a numeric value on an unavailable metric, a refused "complete" import of an unavailable metric, an observed import, a retrospective, and the learning entry reaching Home.
- Repository Growth: invalid input, live public GitHub collection through the production-default adapter, readiness assessment, and the prioritized plan.
- Workspace: backup, durable delete, support diagnostics content, persistent-storage request. Replace-current restore, recovery points, recovery mode, quarantine, offline reload, and service-worker update were covered by the repository smoke, which passed.

No page errors or CSP violations occurred in any journey. The only console error was an expected `404` from `api.github.com` for an absent repository resource during live collection.

## Defects found and fixed

| # | Severity | Defect | Fix |
|---|---|---|---|
| 1 | P1 | After restoring a backup into an empty profile, Home, Product, Signals, and Market still showed "Create a product workspace" until a reload. Following the seed instructions, a facilitator would see an empty product. | Those views reload the workspace from storage on navigation instead of rendering a cached copy (`apps/desktop/ui/app.ts`). |
| 2 | P1 | After a durable workspace deletion, Home and Product still showed the deleted workspace until a reload. | Same fix as #1. |
| 3 | P1 | Home's "Recheck stale evidence" had no recheck operation anywhere; the record it opened had no actions, so the blocker could never be cleared. | New Product Core `recheckEvidence`: a named reviewer either confirms the evidence with a next freshness-review date of tomorrow or later, or withdraws it. Withdrawal returns approved claims that cite it to proposed review and records a contradiction on ICP hypotheses that rely on it. Product shows the recheck form on stale reviewed evidence. |
| 4 | P1 | Author `display` rules overrode the `hidden` attribute, so UI the shells meant to hide stayed visible. Most visibly, Product showed two Product Truth editors, one of them a legacy form. | `[hidden] { display: none !important; }`. |
| 5 | P1 | Exposed by #4: cancelling a review panel restored the panel's own button row instead of the record's, so the record's review buttons disappeared. | The panel remembers the row it hid and the control that opened it; closing restores that row and returns focus. Escape also closes the panel. |
| 6 | P2 | A rejected Signals import was announced as "Manual evidence import evaluated" (Webdog: "imported for named review"), and the pasted payload was cleared. | Failed collections are reported as failures, so the existing recovery shell restores the form; the recorded source health is unchanged. |
| 7 | P2 | A restored form inside a collapsed disclosure was invisible after the error re-render. | Recovery opens enclosing disclosures before focusing. |
| 8 | P2 | After most actions, focus fell to the document body. | Focus returns to the record the person acted on (or to the main region). |
| 9 | P2 | "Open created item" for a Website Watch Calendar entry focused the page, not the entry. | Calendar cards carry their entry ID and are targeted directly. |
| 10 | P2 | Home labelled due dates and freshness dates as "Recorded time", for example "Recorded time 10/30/2026" for a future due date. All nine open buttons were named "Open exact record". | Items carry an accurate date label; each open button's accessible name includes its item title. |
| 11 | P2 | Studio said "Calendar handoff is not implemented", but Calendar accepts approved video platform variants. | Replaced with accurate next-step guidance. |
| 12 | P2 | In an empty profile, Campaigns, Studio, Calendar, and Analytics said "Open Product…" with no control. Product did not mention restoring a backup. | Added navigation controls in both places. |
| 13 | P2 | At about 200% zoom, Product, Studio, and Workspace scrolled sideways because tables forced a 1000 px column. | The narrow layout column can shrink; tables scroll in their own wrapper. |
| 14 | P3 | Records focused by a workflow showed no focus outline. | Focused records show an outline. |
| 15 | Dev | `npm run validate` failed on a Windows checkout: CRLF line endings broke byte-identical fixture tests, and one test compared OS-specific paths. | `.gitattributes` checks text out with LF; the test uses repository-relative POSIX paths. |
| 16 | P2 | Back and Forward could skip or cycle between pages whose views load before rendering (Signals and Market on `main`; Home and Product once they reload on navigation). The history shell judged the outcome before the page changed and overwrote the entry it was restoring. | History restoration waits for the navigation to settle before correcting the entry. |

An independent code review of the remediation found, and this work fixed before commit: per-record recheck forms shared a recovery locator, so a failed recheck could restore its values into another evidence card (the recovery shell now keys per-record forms by record ID); the browser and Product Core judged "a future date" against different times; withdrawn evidence still counted as stale on Home; withdrawal left Product Core claims approved; a missing collection outcome was reported as success; and the Back/Forward defect above.

Regression evidence: behavioral checks in the real-browser PWA smoke (section "seeded acceptance journeys", which fails on the unfixed `main` and passes with these fixes) and the Product Core tests in `test/evidence-recheck.test.ts`. The Calendar "Open created item" focus fix is verified by the QA harness only; driving Website Watch into Calendar is too heavy for the every-pull-request smoke.

## Remaining findings

| Severity | Finding |
|---|---|
| P2 | Repository Growth has no URL or history state. Reload returns to Product, and Back skips it (#146). |
| P2 | (#147) Several actions still use native `prompt()` dialogs (Signals tag/assign/save/delete/prune, Repository Growth checklist evidence and export creator, Calendar cancellation and interrupted export). Review decisions use inline panels, so the interaction model is inconsistent. |
| P3 | Raw identifiers appear in secondary text: source IDs such as `manual:1791397663568`, `asset-1 · v1`, and an observation ID inside a prefilled Calendar note. Repository Growth action status options show raw values such as `in_progress`. |
| P3 | Converting the same signal again creates a duplicate proposal without a warning. |
| P3 | A recheck replaces the evidence's `reviewedBy`/`reviewedAt`; there is no separate recheck history. The next review date has no upper bound. |
| P3 | If a navigation-time workspace load fails, the recovery banner reads "That change was not saved." and the last loaded copy stays visible. |
| P3 | The persistent-storage request result and the diagnostics download are not announced to assistive technology. |
| Harness | On Windows with system Chrome 154, the smoke passes every check and writes its report but does not exit while closing the browser. CI uses Playwright's pinned Chromium on Linux. |

## What this does not establish

- Keyboard traversal, zoom, and focus checks were automated approximations. Human keyboard-only, 200% zoom, non-color, screen-reader, and unfamiliar-user acceptance (#79, #81) remain open.
- Firefox and WebKit were not run locally. The cross-browser matrix runs in CI on `main`.
- No LinkedIn or other external publication was attempted (#107).
- The native Tauri runtime was not exercised.

## Follow-up, later on 2026-10-07

This section was added after the record above and leaves it unchanged.

- #146: Repository Growth now has its own address inside Product. Reload, Back, and Forward work (#150).
- #147: the remaining browser prompts are inline, labelled forms (#152).
- #149: the WebKit stop in the seeded smoke journeys was a harness issue, not a Viable defect. WebKit gives a summary nested inside a closed `<details>` a layout box, so Playwright reported it visible; an app-free control page reproduces this. The smoke now opens disclosures from their own state (#151).
- A later harness finding: Playwright's Firefox `page.reload()` on a `#hash` URL adds a history entry, which broke a new smoke check on `main`. Diagnostic runs showed that Viable returns to the right page on Back in Firefox and WebKit, and the check now reloads from inside the page (#153).

At that point the current acceptance candidate was [UX candidate 2026-10-07b](../acceptance/ux-candidate-2026-10-07b.md), and the P3 findings listed above were still open.

## Second follow-up, later on 2026-10-07

The P3 findings were filed as issues and fixed:

- #157 readable names instead of internal identifiers, and #158 the earlier-proposal notice (both #163);
- #159 recheck history that keeps the original review, with a three-year limit on the next review date (#162);
- #160 a fail-closed load-failure state, and #161 announcements on the runtime panel (both #163).

The current acceptance candidate is [UX candidate 2026-10-07c](../acceptance/ux-candidate-2026-10-07c.md). The Windows-only smoke teardown hang (Harness row above) is the only finding from this record still open.

