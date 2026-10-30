# Viable media candidates (v1)

**Status: pending owner approval. Not for public use.** Tracked in [#185](https://github.com/MythologIQ-Labs-LLC/Viable/issues/185).

These are real captures of the Viable interface, recorded from a local production build. Every person, product and record in them is fictional.

- **Owner review page (private):** https://claude.ai/artifact/PGgvhBoMK3ht8D3cefMFB8. It has the screenshots, both video versions, the poster, captions and transcript.
- **Machine-readable manifest:** [`media-manifest.json`](media-manifest.json). It covers every file, with its SHA-256, provenance, caption, alt text, limitations and proposed placement.
- **Captions:** [`viable-walkthrough-candidate-v1.en.vtt`](viable-walkthrough-candidate-v1.en.vtt)
- **Transcript:** [`viable-walkthrough-candidate-v1.transcript.md`](viable-walkthrough-candidate-v1.transcript.md)

Binaries (PNG and MP4) are kept out of Git until they are approved. After approval, the accepted screenshots can be committed for the README gallery and the website, and checked against the SHA-256 values in the manifest.

## Provenance

| | |
|---|---|
| Source | `MythologIQ-Labs-LLC/Viable`, branch `ux/media-refinement-20261030` |
| Commit | `66c2091865844c3e68d93038500b64997eded06f` |
| Build | Viable PWA 0.1.0, build `264de25077f7`, production security headers and CSP, served on localhost |
| Fixture | `docs/acceptance/seed/ux-acceptance-seed-v2.json` (`ledgerly-ux-acceptance-seed-v2`), SHA-256 `d3dbed27d15a4db78435675b8fa5350713b3c018c72aa0081a26d81a9bfd9fcb`, restored through the app's Workspace import |
| Environment | Ubuntu 24.04.4, Chromium 141.0.7390.37 headless through Playwright 1.56.1, ffmpeg 6.1.1 |
| Captured | 2026-10-30 (UTC) |
| Viewport | 1600×900 CSS px. Screenshots at 2× (3200×1800); video at 1× |
| Rights | Original captures of MythologIQ Labs software. No audio and no third-party media. The slates use DejaVu Sans (free licence). |

## How the media were made

- **Screenshots:** the browser's own viewport captures, with no cropping, compositing or retouching. Before each capture the app was put in its state through the UI: the seed was restored through Workspace import, and the delivery outcome in screenshot 5 was recorded through the Calendar form.
- **Walkthrough:** Playwright sent real mouse and keyboard events to the running app, and Chromium's screencast recorded the frames at their real timing. The white pointer dot is an overlay that follows those real mouse events. The only edits are a 4 s opening slate and a 2.5 s closing slate. No interface was generated or simulated.
- **Actions performed in the recording**, all in the synthetic workspace:
  - Morgan Reyes accepts a competitor signal with a named review.
  - Morgan corrects the Website variant that Sam Okafor had sent back, and resubmits it.
  - Sam Okafor approves it with a note.
  - Morgan records a delivered outcome as `human_recorded`, with the synthetic publication id `synthetic-demo-post-1`.

## Screenshots

| File | Caption |
|---|---|
| `viable-01-home.png` | Home summarises the product's evidence and names the single next step. |
| `viable-02-audience-comparison.png` | Two audience hypotheses are compared dimension by dimension, each rating with its evidence and confidence. |
| `viable-03-signal-review.png` | An imported signal stays a suggestion until a named person accepts or dismisses it. |
| `viable-04-studio-review-feedback.png` | Reviewer decisions and notes appear on the content itself, with the correction form ready. |
| `viable-05-calendar-activation.png` | Approved work is scheduled and posted by hand; the delivery shown is a synthetic, human-recorded entry. |
| `viable-06-analytics-baseline.png` (alternate) | Missing data is marked unavailable, not zero. |

The alt text for each image is in the manifest.

## Walkthrough

`viable-walkthrough-candidate-v1.mp4`:

- MP4, H.264 High, 1600×900, 30 fps, 85.5 s, about 12.6 MB.
- No audio.
- An English caption track is embedded, and the same captions are in the sidecar `.vtt`.

`viable-walkthrough-candidate-v1-open-captions.mp4` is the same recording with the captions burned in, for muted autoplay. The poster is `viable-walkthrough-candidate-v1-poster.png`, the Studio change request at 35.9 s.

The narrative follows one person's journey: product truth → audience evidence → reviewed marketing → measured result.

### Text alternative

Morgan Reyes, the fictional founder of a bookkeeping product called Ledgerly, opens Viable to decide who to market to and what can honestly be said.

1. Home names the next step.
2. Product & audience shows what Ledgerly does and does not do. It compares two audiences dimension by dimension, each rating with its evidence and confidence.
3. Morgan reviews an imported competitor signal and accepts it as evidence under their own name.
4. In Studio, the reviewer Sam Okafor had sent the website copy back for overstating the approved claim. Morgan rewrites and resubmits it, and Sam approves it by name after seeing the earlier request beside the new version.
5. Calendar states that no publishing API is connected. The approved post is scheduled for manual activation. After posting by hand, Morgan records the delivery as human-recorded evidence.
6. Analytics shows the baseline, where a missing impressions figure is marked unavailable, not zero.

## Website handoff (MythologIQ Labs site)

**Suggested description (46 words):**

> Viable helps a small team decide whether and how to market a product, using only claims it can back with evidence. It compares audiences, keeps imported signals as suggestions until a named person reviews them, and records every approval, activation and result on your own device.

**Proposed placement:**

| Placement | Asset |
|---|---|
| Product hero | `viable-01-home.png` |
| "Evidence before action" feature | `viable-02-audience-comparison.png`, `viable-03-signal-review.png` |
| "Every decision named" feature | `viable-04-studio-review-feedback.png` |
| "Activation and learning" feature | `viable-05-calendar-activation.png` |
| Product page, below the hero | The walkthrough, click-to-play with the poster. For a muted inline loop, use the open-captions version. |

Do not autoplay with sound (there is none). Do not describe Viable as publishing to LinkedIn, running video generation, or being released.

## Limitations

- Viable runs locally here. It does not publish to LinkedIn or any other provider. The delivery shown was recorded by hand with a synthetic identifier.
- Video Production and integrated video generation are neither shown nor claimed.
- The UI build is an unmerged candidate: [#196](https://github.com/MythologIQ-Labs-LLC/Viable/pull/196) plus the refinement PR for this media.
- Automated checks passed on this build. Person-run accessibility ([#79](https://github.com/MythologIQ-Labs-LLC/Viable/issues/79)) and unfamiliar-user acceptance ([#81](https://github.com/MythologIQ-Labs-LLC/Viable/issues/81)) remain open.
- Screenshot 3's evidence drawer shows an empty `Facts: {}` field, and screenshot 6 shows raw metric keys.

## Approval checklist (owner)

- [ ] Screenshots 1–5 accepted, or replacements requested.
- [ ] Walkthrough accepted, or changes requested.
- [ ] Captions, transcript and text alternative accepted.
- [ ] Website description accepted.
- [ ] UI candidate (#196 and the refinement PR) visually signed off and merged before the media are used publicly.
