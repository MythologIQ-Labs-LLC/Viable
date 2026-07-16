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
7. Convert a reviewed signal into a named proposed product action, ICP validation action, campaign brief, content brief, repository-growth action, or product-feedback item.
8. Open Market to review accepted evidence by type and the limitations that constrain interpretation.

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
- recovery to the saved inbox.

One source failure does not discard successful evidence from another source.

## Authority boundaries

Every imported signal begins as a suggestion. Acceptance requires a named reviewer.

Only reviewed signals can become proposed owned work. A conversion remains proposed. It does not create an approved campaign, publish content, contact a person, qualify a lead, or mutate the canonical ICP.

Product Core remains authoritative for product truth, claims, and canonical ICP hypotheses.

## Current limitations

- Live public GitHub access is unauthenticated and subject to public API rate limits.
- GitHub activity is a recent sample rather than a complete activity ledger.
- Source configuration and inbox data currently belong to the local desktop profile.
- Backup, export, restore, schema migration, and SQLite persistence are not complete.
- Direct campaign, content, repository-growth, and product-task materialization are not implemented. Conversions remain proposed work records.
- Hands-on screen-reader review and unfamiliar-user acceptance are pending.
