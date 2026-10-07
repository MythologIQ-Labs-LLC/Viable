# Acceptance workspace seed `ux-acceptance-seed-v2`

This directory holds the canonical starting workspace for human acceptance runs ([accessibility](../accessibility-runbook.md) and [unfamiliar-user demo](../unfamiliar-user-demo-runbook.md)), built to the [acceptance seed specification](../acceptance-seed-spec.md).

| Field | Value |
| --- | --- |
| Facilitator label | `ux-acceptance-seed-v2` (v2 marks the PWA-era seed; the v1 label named in the September plan was never built) |
| File | [`ux-acceptance-seed-v2.json`](ux-acceptance-seed-v2.json), a `viable.workspace-backup` version 1 file |
| Workspace ID | `ledgerly-ux-acceptance-seed-v2` |
| Backup integrity checksum | `crc32:c9f2ee2d` (detects accidental change; not a signature) |
| Backup creation date | 2026-10-01T12:00:00Z (fixed, so the output is reproducible) |
| Built from | `acceptance/ux-integrated-candidate` at `8805ac8` (main `aebe800` + runbooks). Also verified restoring and rendering on candidate `fee77c8` (build `1bd83169cbba`; [UX candidate 2026-10-06](../ux-candidate-2026-10-06.md)) and on candidate `445378c` (build `86c2c9a956b4`; [UX candidate 2026-10-07](../ux-candidate-2026-10-07.md)) |
| Deliberate failure fixture | [`malformed-signals-import.json`](malformed-signals-import.json) |
| Intended channel set | LinkedIn (approved, ready to export) and Website (changes requested, not yet exportable) |

The seed is synthetic. "Ledgerly" is an invented bookkeeping assistant for independent creative studios. The people named in it ("Morgan Reyes", owner; "Sam Okafor", reviewer) are invented and have no contact details. It contains no credentials, tokens, or account identifiers. All links use `example.com`.

## What it contains

Counts are the record counts that the Workspace screen shows after restore.

| Context | Status | Records | Starting state |
| --- | --- | --- | --- |
| Product Core | present | 9 | Product truth at revision 2 with history. 4 evidence items: 3 reviewed, of which "Agency pricing objection notes" is past its freshness-review date; 1 not reviewed (public forum thread). 2 claims: 1 approved (receipt-matching claim), 1 proposed without approval. 2 ICP hypotheses: "Independent design studios" is selected and reviewed, with a recorded contradiction and a planned validation experiment; "Solo freelance creatives" is an unreviewed candidate backed only by unreviewed evidence. No marketability assessment. 1 open readiness action. |
| Campaigns and exports | present | 4 | 1 approved campaign brief, "Close the month in an afternoon", which uses the selected ICP and the approved claim and is intended for LinkedIn and Website. 1 approved canonical asset. LinkedIn variant approved. Website variant has **changes requested** by Sam Okafor, with a note explaining that the copy overstates the approved claim and lacks alt text. No export packages yet. |
| Signals | present | 5 | 1 manual JSON import source, recorded as successful, with provenance (source ID, retrieval time, `example.com` source URLs). 3 signals: 1 accepted (reviewed) and linked to the studio ICP, which can be converted into owned work; 2 new, unreviewed suggestions. No conversions. |
| Calendar and Learning | present | 7 | 2 manual-only destinations (a LinkedIn company page and website announcements). The external action "LinkedIn launch post: month-end close" (15 Sep 2026) is approved and scheduled, and its manual package has been downloaded. **No delivery outcome is recorded.** A measurement plan covers 15–29 Sep 2026, with a baseline that includes an observed value (6 waitlist sign-ups), a verified zero (0 demo requests), and an unavailable metric (impressions: missing, not zero). 1 follow-up planning entry on 14 Oct 2026. No performance import, retrospective, or learning entry. |
| Repository Growth | absent | 0 | Not part of this scenario. |
| Video Production | absent | 0 | Not part of this scenario. |
| Website Watch | absent | 0 | Not part of this scenario. |

Total: 25 counted records.

### Home attention at start

Home shows eight items, in this order:

1. Review signal: Competitor announces automatic receipt capture for agencies (review)
2. Review signal: Accountant newsletter reminds freelancers of the quarterly estimate deadline (review)
3. Correct and resubmit: website variant (review)
4. Recheck stale evidence: Agency pricing objection notes (blocked)
5. Publish a studio pricing page that avoids per-seat pricing (action)
6. Run the marketability assessment (action)
7. Record delivery or failure evidence: LinkedIn launch post: month-end close (scheduled)
8. Collect outcome evidence for a completed observation window (scheduled)

### The participant's work

- **Product and audience:** review the forum evidence and the freelancer ICP, compare the two ICPs, decide whether the studio ICP remains the primary audience, recheck the stale evidence, and run the assessment. Revising Product Truth in the app moves the selected ICP back to re-review. That in turn invalidates the campaign authority that depends on it, which is the revision-invalidation path.
- **Signals:** review the two unreviewed signals, and convert the accepted signal into owned work.
- **Campaigns and Studio:** correct the website variant, resubmit it, and get it re-approved by a named reviewer. Create a manual export that contains only LinkedIn, either before or after the website correction.
- **Calendar, outcome, and learning:** record the LinkedIn post's delivery evidence as human-recorded (not provider-verified), import performance evidence against the baseline (the impressions metric stays unavailable, not zero), complete the retrospective, and read the learning entry and its suggested next action.

## Restore the seed (facilitator steps)

1. Start Viable with `npm run pwa:selfhost` and open **http://localhost:4175** in the browser profile the participant will use. Use exactly this address: browser storage belongs to one origin, so a different host or port is a different, empty profile.
2. Select **Workspace** in the left navigation.
3. Under "Restore a Viable workspace backup", choose **Workspace backup file** and select `docs/acceptance/seed/ux-acceptance-seed-v2.json`.
4. Check the preview. It should say "Backup validated for Ledgerly", with workspace ID `ledgerly-ux-acceptance-seed-v2`.
5. Select **Restore into empty profile**, then confirm the dialog.
6. Wait for the "restored successfully" message. Then check that the Workspace screen shows 4 of 7 contexts present and 25 counted records.
7. Select **Home** and check that the eight attention items listed above appear.

If **Restore into empty profile** is disabled, the profile already holds workspace data. Reset it first (see the next section).

## Reset between participants

Never clean up a mutated workspace by hand. Restore the canonical seed instead:

- **Same browser profile:** go to **Workspace**, open "Delete or reset this workspace", tick the scope checkbox, type `DELETE`, confirm, then restore the seed again using the steps above.
- **Fresh browser profile:** alternatively, use a new browser profile or a private window, still at `http://localhost:4175`, and restore the seed there.

## Deliberate failure fixture

[`malformed-signals-import.json`](malformed-signals-import.json) is valid JSON in the manual Signals import shape, but its only signal has no title. To reproduce the failure:

1. Go to **Signals** and open **Advanced: raw JSON adapter imports**.
2. Paste the file's contents into **Manual signal import → Signals JSON**.
3. Select **Validate and import**.

The whole import is rejected. No signals are created, and the seeded signals are unchanged. The page shows a "Partial source health" warning with the source status `validation_failed`, and the source health shows "Signal 1 title is required". Home also gains a "Check Signals source" recovery item.

This fixture uses the Advanced disclosure. For a failure on the ordinary path, submit Signals' **Record manual evidence** form with the title empty, which triggers required-field validation.

Fixing the payload and importing it again creates a new manual source. Per the current code, each raw import gets a new source ID, so the earlier failed source health entry stays listed until the seed is restored.

## Regenerate

```sh
npm run acceptance:seed
# equivalent to: npm run build && node scripts/build-acceptance-seed.mjs
```

[`scripts/build-acceptance-seed.mjs`](../../../scripts/build-acceptance-seed.mjs) builds the seed through the compiled domain services: Product Core, Product revision, Campaign, Signals Inbox with the manual JSON source, and Activation/Learning. It persists through the real desktop local-storage store adapters, with their versioned envelope, over in-memory storage, and exports with `WorkspaceLifecycleService.createBackup`. The clock is scripted and IDs are deterministic, so two runs produce byte-identical files. `test/acceptance-seed.test.ts` checks that the committed files equal fresh output, that the backup validates and restores into an empty profile with the counts above, that it contains no secret-like field names or credential patterns, and that the failure fixture fails as described.

If a schema change or a workflow change alters the generated output, give the seed a new version label instead of overwriting `v2` in place. Old acceptance results cite `v2`.

## Known limitations

- **The audience decision that needs confirmation is the secondary ICP, not the primary one.** The domain requires campaign approval, variant approval, export, and calendar scheduling to rest on a selected *and reviewed* ICP. So the seed cannot start with the primary ICP awaiting re-review and still have an approved, exportable channel. The confirmation work is the unreviewed "Solo freelance creatives" candidate, together with a recorded contradiction and a planned experiment on the primary ICP. Selecting the freelancer ICP is refused until its forum evidence is reviewed.
- **Delivery, outcome, performance, retrospective, and learning records are not pre-seeded.** These are the participant's work. Until a retrospective is completed, Home shows no "learning" item. The later-action items at start are the two "scheduled" follow-ups.
- **No legacy all-channel export package** is included, so that comparison in Journey 4 does not apply.
- **No Signals conversion** is pre-seeded. The accepted signal is ready to be converted.
- **Repository Growth, Video Production, and Website Watch are absent.** The specification does not require them. Their screens show their empty states.
- **Dates are fixed in September–October 2026, but Home evaluates them against the viewer's clock.** The stale-evidence and evidence-due items appear on any date after 29 Sep 2026. After 31 Mar 2027 and 30 Jun 2027, more evidence becomes stale and Home gains extra items. The planned experiment (12 Oct 2026) and the follow-up entry (14 Oct 2026) will show past dates. Regenerate with shifted dates if runs happen after March 2027.
- **The generator depends on the core build.** The desktop store adapters reach `dist/apps/desktop/ui/` only because `test/acceptance-seed.test.ts` imports them. If they are missing, run the full `npm run build`.
