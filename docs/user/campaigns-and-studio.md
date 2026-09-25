# Campaigns and Studio Desktop Workflow

## Status

The Campaigns and Studio desktop workflow is implemented and automatedly validated through PR #18. Signals-to-Campaign materialization landed through PR #67, and Campaign-owned content-brief materialization landed through PR #68 as the governed content destination for reviewed signal work. UX completion issue #78 adds explicit package-level channel selection so manual exports do not silently expand beyond campaign intent.

The workflow is internal. Hands-on keyboard and assistive-technology review, unfamiliar-user acceptance, and any resulting remediation remain open under issue #6 and the relevant Signals acceptance work.

No part of this workflow publishes, schedules, sends, or verifies delivery to an external provider.

## Purpose

Campaigns turns reviewed Product Core truth into one focused campaign brief.

Campaigns and Assets also owns content briefs derived from approved campaigns. A content brief is a governed source packet for downstream asset work; it is not itself a canonical asset or publishing instruction.

Studio turns an approved campaign into one canonical asset, the channel-specific variants that campaign actually intends to use, and intentional manual export packages while preserving evidence, rights, accessibility, review, and version authority.

## Prerequisites

Create or open a Product workspace first.

Before a campaign can be created, the workspace needs:

1. at least one reviewed, non-generated evidence record;
2. at least one proposed Product Core claim linked to reviewed evidence;
3. named approval of that claim;
4. either a reviewed selected ICP or a deliberate test audience.

Campaigns includes the missing claim-prerequisite path so a user can propose and approve evidence-backed claims without weakening Product Core authority.

## Create a campaign brief

1. Open **Campaigns**.
2. Review the readiness metrics for evidence, claims, campaigns, and selected ICP state.
3. Propose a Product Core claim when no approved claim exists.
4. Select supporting reviewed evidence and any channel contexts where the claim is prohibited.
5. Approve the proposed claim with a named reviewer.
6. Enter one campaign objective, one primary outcome, and one primary audience.
7. Choose the selected ICP or a deliberate test audience.
8. Record the problem, trigger, offer, message hierarchy, proof, call to action, intended channels, asset plan, owner, success measures, and dependencies.
9. Select the approved claims and reviewed evidence packet.
10. Create the campaign draft.
11. Submit it for review.
12. Record a named approval, rejection, or changes-requested decision with a review note.

A campaign cannot create its own Product Core claims, silently change ICP state, or proceed without reviewed evidence and approved claim authority.

## Materialize a content brief from reviewed signal work

A reviewed Signals conversion with kind `content_brief` can materialize into Campaigns and Assets only after an approved Campaign exists.

From **Signals**:

1. open the proposed content conversion;
2. choose an approved Campaign;
3. enter the content objective;
4. enter one or more content pillars;
5. optionally record themes;
6. enter one or more planned deliverables;
7. record source notes;
8. identify whether the brief is human-authored or a generated suggestion;
9. create the governed content brief.

The resulting draft inherits the approved Campaign's primary audience, primary outcome, approved Product Core claim snapshots, and reviewed Product Core evidence packet. Campaign Service revalidates that authority before creation.

Content brief review is a distinct domain transition. Named review revalidates Product Core claim/evidence authority and requires the parent Campaign to remain approved.

A content brief does not create a canonical asset, channel variant, manual export, publishing approval, publication, or delivery claim. Those remain separate downstream records and decisions.

Materialization uses a deterministic destination identifier derived from the Signals conversion, so retry returns the same authoritative content brief instead of creating duplicates.

## Create a canonical asset

1. Open **Studio** after a campaign is approved.
2. Select the approved campaign.
3. Enter the canonical title and channel-neutral body.
4. Record a named owner and whether the content is human-authored or a generated suggestion.
5. Record rights, accessibility requirements, and disclosure requirements.
6. Create the canonical asset draft.
7. Add comments or save a new canonical version when needed.
8. Submit the asset for review.
9. Record a named approval, rejection, or changes-requested decision.

Generated suggestions remain drafts until named review. Material revisions invalidate prior asset and variant approval where required by the domain service.

## Create and compare channel variants

After the canonical asset is approved:

1. create variants only for channels the approved campaign intends to use;
2. record the body and constraints for each needed channel;
3. submit each variant for named review;
4. approve, reject, or request changes for each variant;
5. use the channel comparison table to inspect body, constraints, and review state together.

A LinkedIn-only campaign does not need website or GitHub release work merely to satisfy an export rule. A two-channel campaign needs only those two channel variants for a two-channel package. Additional campaign-intended variants can remain draft or uncreated until a package actually needs them.

Channel variants adapt the canonical asset. They do not replace or duplicate canonical authority.

## Recheck Product Core impact

Use **Recheck Product Core claim impact** when Product Core claim authority may have changed.

The service compares each campaign claim snapshot with current Product Core status, revision, statement, evidence, and prohibited channel contexts. A material mismatch invalidates affected campaign, approved content brief, asset, and variant approvals.

## Create a manual export

A manual export requires:

- an approved campaign;
- its approved canonical asset;
- at least one package channel selected from the campaign's approved intent;
- an approved channel variant for every channel selected into that package.

Studio presents each export-ready asset family separately. The package selector shows only the campaign's intended channels. Currently approved intended channels begin checked as a visible convenience preset; uncheck any approved channel that should not be part of this package. Campaign-intended channels whose variants are not yet approved remain visible but disabled rather than being silently added or silently blocking unrelated channels.

This means a one-channel or two-channel package can be created without unrelated variants. The previous all-three behavior remains available when LinkedIn, website, and GitHub release are all part of campaign intent and all three approved variants are selected.

Create the package with a named export creator, inspect the included-channel summary and manifest, and download the JSON file.

Every new manifest explicitly records campaign intent and package inclusion, for example:

```json
{
  "campaign": {
    "intendedChannels": ["linkedin", "website"]
  },
  "includedChannels": ["linkedin"],
  "externalAction": {
    "approvedForPublishing": false,
    "delivered": false
  }
}
```

The package contains no destination, provider account, credential, publishing approval, scheduling instruction, or delivery claim.

Calendar compatibility remains a separate authority check. Scheduling an external action still requires an approved variant whose channel exactly matches the active destination. Narrowing a manual export package does not weaken that rule and does not create scheduling authority.

## Presentation and recovery states

The workflow presents explicit:

- loading state while Product Core and campaign authority are read;
- empty state when prerequisite records do not exist;
- blocked state when evidence, claim, campaign, asset, or selected variant approval is missing;
- offline state explaining that local and manual paths remain available;
- error state with the service rejection reason;
- recovery action that reloads the last saved local campaign workspace.

Signals content materialization also presents an explicit blocked state when no approved Campaign is available and retains materialization failure/retry state in the Signals conversion record.

Status is expressed in text and structure rather than color alone. Checkbox controls have bounded, scalable presentation, and the manual manifest is keyboard-scrollable and wraps long values.

## Compatibility note

`contentBriefs` is an additive Campaign workspace collection. Campaign Service normalizes older saved Campaign workspaces that do not contain this collection to an empty list before using them.

`channels` on `ManualExportPackage` is also additive. New packages persist their selected channel list. Older packages do not have this field because the previous service could only produce the LinkedIn + website + GitHub release all-three package. The desktop therefore represents a missing package `channels` field as a **Legacy all-channel package** without rewriting the saved record.

These are bounded compatibility measures, not a substitute for the product-wide schema migration, backup, restore, and corruption-recovery work tracked under the release foundation.

## Known limitations

The internal workflow does not yet provide:

- hands-on assistive-technology evidence;
- unfamiliar-user completion evidence;
- a dedicated Campaigns/Studio presentation for browsing and reviewing content briefs created from Signals;
- content-brief revision UI;
- external destinations, provider accounts, credentials, schedulers, publishing adapters, or delivery verification;
- multi-user synchronization or hosted collaboration;
- signed or cross-platform end-user installers.

Issue #6 remains open until human accessibility and unfamiliar-user acceptance are completed and any evidenced problems are remediated.