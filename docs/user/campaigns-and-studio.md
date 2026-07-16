# Campaigns and Studio Desktop Workflow

## Status

The Campaigns and Studio desktop workflow is implemented and automatedly validated through PR #18.

The workflow is internal. Hands-on keyboard and assistive-technology review, unfamiliar-user acceptance, and any resulting remediation remain open under issue #6.

No part of this workflow publishes, schedules, sends, or verifies delivery to an external provider.

## Purpose

Campaigns turns reviewed Product Core truth into one focused campaign brief.

Studio turns an approved campaign into one canonical asset, channel-specific variants, and a manual export package while preserving evidence, rights, accessibility, review, and version authority.

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
8. Record the problem, trigger, offer, message hierarchy, proof, call to action, channels, asset plan, owner, success measures, and dependencies.
9. Select the approved claims and reviewed evidence packet.
10. Create the campaign draft.
11. Submit it for review.
12. Record a named approval, rejection, or changes-requested decision with a review note.

A campaign cannot create its own Product Core claims, silently change ICP state, or proceed without reviewed evidence and approved claim authority.

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

1. create a LinkedIn variant;
2. create a website variant;
3. create a GitHub release variant;
4. record the body and constraints for each channel;
5. submit each variant for named review;
6. approve, reject, or request changes for each variant;
7. use the channel comparison table to inspect body, constraints, and review state together.

Channel variants adapt the canonical asset. They do not replace or duplicate canonical authority.

## Recheck Product Core impact

Use **Recheck Product Core claim impact** when Product Core claim authority may have changed.

The service compares each campaign claim snapshot with current Product Core status, revision, statement, evidence, and prohibited channel contexts. A material mismatch invalidates affected campaign, asset, and variant approvals.

## Create a manual export

A manual export becomes available only when all of the following are approved:

- the campaign;
- the canonical asset;
- the LinkedIn variant;
- the website variant;
- the GitHub release variant.

Create the package with a named export creator, inspect the manifest, and download the JSON file.

Every manifest records:

```json
{
  "externalAction": {
    "approvedForPublishing": false,
    "delivered": false
  }
}
```

The package contains no destination, provider account, credential, publishing approval, scheduling instruction, or delivery claim.

## Presentation and recovery states

The workflow presents explicit:

- loading state while Product Core and campaign authority are read;
- empty state when prerequisite records do not exist;
- blocked state when evidence, claim, campaign, asset, or variant approval is missing;
- offline state explaining that local and manual paths remain available;
- error state with the service rejection reason;
- recovery action that reloads the last saved local campaign workspace.

Status is expressed in text and structure rather than color alone. Checkbox controls have bounded, scalable presentation, and the manual manifest is keyboard-scrollable and wraps long values.

## Known limitations

The internal workflow does not yet provide:

- hands-on assistive-technology evidence;
- unfamiliar-user completion evidence;
- campaign-brief or channel-variant content revision methods beyond their existing review transitions;
- external destinations, provider accounts, credentials, schedulers, publishing adapters, or delivery verification;
- multi-user synchronization or hosted collaboration;
- signed or cross-platform end-user installers.

Issue #6 remains open until human accessibility and unfamiliar-user acceptance are completed and any evidenced problems are remediated.
