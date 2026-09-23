# Signals Inbox and Market evidence workflow

## Purpose

This guide covers the internal Signals Inbox and Market evidence workflow implemented for Viable Slice 2.

Signals are evidence proposals. They do not rewrite product truth, select an ICP, qualify a lead, create an approved campaign, or authorize external action.

## Source paths

### Public GitHub repository

Enter a public repository as `owner/repository`.

Viable uses unauthenticated read-only GitHub API access for repository metadata and a recent public-activity sample. Rate limits, unavailable endpoints, and missing metrics remain explicit. A missing metric is not recorded as zero.

### Event Intelligence import

Paste a sanitized local Event Intelligence run containing `run` and `events`.

Successful event evidence is preserved when other event sources fail. A failed source remains failed and never becomes a verified-empty result. Event scores and reasons remain bounded evidence requiring review.

### Manual JSON import

Paste a local JSON object with a `signals` array. Each signal requires a title and summary. Optional fields include kind, confidence, observed time, source URL, external identifier, and tags.

Manual imports are limited to 100 signals per operation. Imported content is untrusted data and cannot direct tools, credentials, prompts, or runtime behavior.

## Primary journey

1. Open Signals from the desktop navigation.
2. Configure a public repository source, import an Event Intelligence run, or use manual JSON.
3. Review source health before interpreting the inbox.
4. Open the evidence drawer for provenance, retrieval time, freshness, confidence, facts, limitations, and relationships.
5. Accept useful evidence with a named reviewer, or dismiss it.
6. Save, tag, assign, or connect the signal to a product, ICP hypothesis, topic, repository, or opportunity.
7. Convert a reviewed signal into named proposed work.
8. For a product action, ICP validation action, or product-feedback proposal, materialize the proposal into Product Core. The Product Core record retains the signal-conversion origin, and retry is idempotent rather than duplicating work.
9. For campaign, content, repository-growth, or Website Watch work, keep the conversion proposed until the destination-specific authority fields are supplied. Viable does not invent incomplete authoritative records from a title and owner.
10. Open Market to review accepted evidence by type and the limitations that constrain interpretation.

## Materialization state

Signal conversion and authoritative destination creation are separate states.

For Product Core materialization, Viable records:

- the conversion kind;
- named owner;
- proposed, materialized, or materialization-failed state;
- the authoritative Product Core record identifier after success;
- materialization time;
- failure detail and attempt time when destination creation fails.

`product_action`, `icp_validation_action`, and `product_feedback` currently materialize into Product Core readiness actions. The materialized Product Core action records `signal` as its source and the signal conversion identifier as its source ID.

Calling materialization again for the same conversion returns the existing Product Core action rather than creating a duplicate.

A failed attempt remains visible and can be retried. Successful retry clears the prior failure record.

## State behavior

The workflow distinguishes:

- loading;
- an empty local inbox;
- successful collection;
- verified-empty collection;
- partial success;
- unsupported capability;
- unauthorized or forbidden access;
- rate limiting;
- unavailable sources;
- validation failure;
- transport failure;
- cancellation;
- offline manual operation;
- proposed conversion;
- materialized authoritative work;
- materialization failure and retry;
- recovery to the saved inbox.

One source failure does not discard successful evidence from another source.

## Authority boundaries

Every imported signal begins as a suggestion. Acceptance requires a named reviewer.

Only reviewed signals can become proposed owned work. Signals owns the evidence and conversion record; it does not become the authority for the destination record.

When Product Core materialization succeeds, Product Core owns the resulting readiness action. Signals retains only the traceable materialization reference.

Campaign, content, repository-growth, and Website Watch conversions remain proposed until their destination-specific requirements can be satisfied. A conversion does not create an approved campaign, publish content, contact a person, qualify a lead, or mutate the canonical ICP.

Product Core remains authoritative for product truth, claims, canonical ICP hypotheses, and Product Core readiness actions.

## Current limitations

- Live public GitHub access is unauthenticated and subject to public API rate limits.
- GitHub activity is a recent sample rather than a complete activity ledger.
- Source configuration and inbox data currently belong to the local desktop profile.
- Backup, export, restore, and complete migration/recovery behavior remain release-foundation work.
- Campaign-brief, content-brief, repository-growth-action, and Website Watch action materialization still require destination-specific implementation and authority inputs.
- Hands-on screen-reader review and unfamiliar-user acceptance are pending.
