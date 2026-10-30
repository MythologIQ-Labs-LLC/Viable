# Viable media candidates

**Status: approved by the owner on 2026-10-30** (screenshots v1 and walkthrough v2). Tracked in [#185](https://github.com/MythologIQ-Labs-LLC/Viable/issues/185).

These are real captures of the Viable interface, recorded from a local production build. Every person, product and record in them is fictional.

| What | Where |
|---|---|
| Screenshots (candidate v1) | [`screenshots/`](screenshots) |
| Walkthrough (candidate v2), poster, captions, transcript | [`video/`](video) |
| Demo fixture used by the walkthrough | [`fixture/ledgerly-media-demo-v1.json`](fixture/ledgerly-media-demo-v1.json) |
| Machine-readable manifest (SHA-256, provenance, alt text, limitations, placement) | [`media-manifest.json`](media-manifest.json) |
| Private owner-review page | https://claude.ai/artifact/PGgvhBoMK3ht8D3cefMFB8 |

The owner asked on 2026-10-30 for the binaries to be committed to GitHub, and approved them the same day, together with the UI they show (#196 and #200).

## Provenance

| | |
|---|---|
| Source | `MythologIQ-Labs-LLC/Viable`, branch `ux/media-refinement-20261030` |
| Commit | `66c2091865844c3e68d93038500b64997eded06f` |
| Build | Viable PWA 0.1.0, build `264de25077f7`, production security headers and CSP, served on localhost |
| Screenshot fixture | `docs/acceptance/seed/ux-acceptance-seed-v2.json` (`ledgerly-ux-acceptance-seed-v2`), SHA-256 `d3dbed27d15a4db78435675b8fa5350713b3c018c72aa0081a26d81a9bfd9fcb` |
| Walkthrough fixture | `fixture/ledgerly-media-demo-v1.json`, SHA-256 `eb13a0eb5d5b7945d047f44a27867282d828591008b96a21e6b12dabc62a2201`. It is the seed above plus a saved assessment draft. Both were entered through the UI and exported with the app's Workspace backup. |
| Environment | Ubuntu 24.04.4, Chromium 141.0.7390.37 headless through Playwright 1.56.1, ffmpeg 6.1.1 |
| Captured | 2026-10-30 (UTC) |
| Viewport | 1600×900 CSS px. Screenshots at 2× (3200×1800); video at 1× |
| Rights | Original captures of MythologIQ Labs software. No audio and no third-party media. The slates use DejaVu Sans (free licence). |

## Walkthrough (v2)

**Story: is this product worth building, and who is it for?**

The walkthrough follows Morgan Reyes, the fictional founder of a bookkeeping product called Ledgerly, through Viable's core loop:

1. Product truth.
2. Reviewed evidence.
3. Claims that need evidence.
4. Two audience hypotheses compared.
5. A new market signal under named review.
6. A completed, explained marketability assessment.
7. A gap turned into an owned next step.

It shows no publishing, campaigns or social posting. Those are downstream extensions of Viable, not its purpose.

**Files** (in `video/`):

| File | What it is |
|---|---|
| `viable-walkthrough-candidate-v2.mp4` | Master. MP4, H.264 High, 1600×900, 30 fps, 85.9 s, about 15 MB, no audio, with a selectable English caption track |
| `viable-walkthrough-candidate-v2-open-captions.mp4` | The same recording with captions burned in, for muted autoplay |
| `viable-walkthrough-candidate-v2-poster.png` | Poster: the completed assessment, at 70.6 s |
| `viable-walkthrough-candidate-v2.en.vtt` | Captions |
| `viable-walkthrough-candidate-v2.transcript.md` | Transcript |

**How it was made:**

- Playwright sent real mouse and keyboard events to the running app, and Chromium's screencast recorded the frames at their real timing.
- The white pointer dot is an overlay that follows those real mouse events.
- The only edits are a 3.5 s opening slate and a 2 s closing slate.
- The assessment has 13 dimensions. Twelve were entered beforehand through the same UI and saved as a draft, which is what the fixture holds. On camera, Morgan rates Proof, completes the assessment, and turns the Offer gap into an owned action.
- Morgan also accepts a competitor signal with a named review.

### Text alternative

Morgan Reyes, the fictional founder of a bookkeeping product called Ledgerly, uses Viable to find out whether Ledgerly is worth building and who it is for.

1. The workspace opens on Home.
2. Product & audience records what Ledgerly does and does not do.
3. Its evidence is listed: owner interviews, private beta usage and pricing objections, each reviewed.
4. One claim is approved because beta usage supports it; another is held back because no outcome evidence exists.
5. Two possible audiences, design studios and solo freelancers, are compared dimension by dimension, each rating with its evidence and confidence.
6. A new competitor announcement stays a suggestion until Morgan accepts it by name.
7. Morgan then finishes a saved marketability assessment for design studios. The result is explained, not scored: strong product truth and audience clarity, but a weak offer, reach and sales readiness.
8. Morgan turns the offer gap into an open action with a named owner.

## Screenshots (v1)

| File | Caption |
|---|---|
| `screenshots/viable-01-home.png` | Home summarises the product's evidence and names the single next step. |
| `screenshots/viable-02-audience-comparison.png` | Two audience hypotheses are compared dimension by dimension, each rating with its evidence and confidence. |
| `screenshots/viable-03-signal-review.png` | An imported signal stays a suggestion until a named person accepts or dismisses it. |
| `screenshots/viable-04-studio-review-feedback.png` | Reviewer decisions and notes appear on the content itself, with the correction form ready. |
| `screenshots/viable-05-calendar-activation.png` | Approved work is scheduled and posted by hand; the delivery shown is a synthetic, human-recorded entry. |
| `screenshots/viable-06-analytics-baseline.png` (alternate) | Missing data is marked unavailable, not zero. |

The alt text for each image is in the manifest. Each image is the browser's own capture, with no cropping or retouching.

For the website, screenshots 1–3 carry the core story. Screenshots 4 and 5 show the downstream marketing tools, so they belong with that section rather than the hero.

## Website handoff (MythologIQ Labs site)

**Suggested description (45 words):**

> Viable helps founders and small teams find out whether a product is worth building and who it is for. It records what the product truly does, weighs reviewed evidence, compares audiences, and explains its marketability assessment, then turns each gap into a named next step.

**Proposed placement:**

| Placement | Asset |
|---|---|
| Product hero | `viable-01-home.png`, or the v2 walkthrough with its poster |
| "Who is it for?" feature | `viable-02-audience-comparison.png` |
| "Evidence before conclusions" feature | `viable-03-signal-review.png` |
| "From evidence to marketing" (secondary) | `viable-04-studio-review-feedback.png`, `viable-05-calendar-activation.png` |
| Product page | The walkthrough, click-to-play. For a muted inline loop, use the open-captions version. |

Do not describe Viable as publishing to social media, running video generation, or being released.

## Superseded

Walkthrough candidate v1 told a publishing story: a LinkedIn post was approved, scheduled and recorded as delivered. Owner feedback was that this misstated Viable's purpose. It was replaced by v2 and is not committed. Its checksum is listed in the manifest.

## Limitations

- Viable runs locally here, and nothing was published anywhere.
- The UI build is an unmerged candidate: [#196](https://github.com/MythologIQ-Labs-LLC/Viable/pull/196) plus [#200](https://github.com/MythologIQ-Labs-LLC/Viable/pull/200).
- Automated checks passed on this build. Person-run accessibility ([#79](https://github.com/MythologIQ-Labs-LLC/Viable/issues/79)) and unfamiliar-user acceptance ([#81](https://github.com/MythologIQ-Labs-LLC/Viable/issues/81)) remain open.
- Screenshot 3's evidence drawer shows an empty `Facts: {}` field. Screenshot 6 shows raw metric keys.
- The assessment card in the walkthrough is a long list with no summary line at the top.

## Approval (owner)

Approved on 2026-10-30, when the owner reviewed the screenshots, walkthrough v2 and the UI candidate and said "Ship it":

- [x] Screenshots 1–5 and the alternate accepted.
- [x] Walkthrough v2 accepted, with its captions, transcript and text alternative.
- [x] Website description accepted.
- [x] UI candidate (#196 and #200) signed off and merged.

Approval of the media does not close the person-run accessibility (#79) or unfamiliar-user (#81) gates, and is not a product release.
