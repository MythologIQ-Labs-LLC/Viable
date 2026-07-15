# Event Radar sanitization record

Status: implemented, pending independent CI validation

Date: July 15, 2026

Source: `BicameralAI/bicameral-event-radar` at merge commit `5bd0d74bf168827fde64001f4cc771daec4f5fb5`

Authority: the source license identifies MythologIQ Labs, LLC as the Event Radar owner and expressly permits migration into Viable.

## Included capability concepts

- event candidates with source provenance
- deterministic scoring profiles
- explicit per-source collection outcomes
- partial-failure-aware orchestration
- local atomic persistence
- ICS calendar ingestion
- native Viable desktop shell with MythologIQ identity

The implementation is a clean-room Viable bounded context. It does not copy organization content, accounts, credentials, destinations, private fixtures, or operational records.

## Excluded content

- Bicameral organization governance and repository controls
- Slack publishers, channel identifiers, tokens, and user interface behavior
- deployment, signing, release, and production configuration
- migration evidence containing private operational details
- confidential fixtures or ambiguous third-party data
- Event Radar branding as a top-level product identity

## Enforced boundaries

- Event Intelligence emits evidence suggestions only.
- Product Core owns product truth, claims, and canonical ICP hypotheses.
- A downstream bounded context cannot mutate canonical ICP state.
- Externally consequential action requires named, scoped human approval.
- Failed, unauthorized, forbidden, rate-limited, unavailable, or cancelled collection is never represented as verified empty.

## Validation

The branch validation target runs a tracked-file secret scan, strict TypeScript checking, automated tests, Rust formatting, native tests, a release-mode desktop build, Debian installer creation, and package metadata inspection. Signing and cross-platform installer validation remain release gates. This record becomes validated only after independent GitHub CI passes on the pull request.
