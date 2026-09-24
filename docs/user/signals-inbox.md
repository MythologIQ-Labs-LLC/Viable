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
9. For a campaign proposal, open **Materialize Campaign brief** and supply the complete Campaign authority fields, including audience, objective, outcome, approved claims, reviewed evidence, channels, call to action, asset plan, and success measures. Successful materialization creates a Campaign-owned draft, not an approved or published campaign.
10. For a content proposal, open **Materialize content brief**, choose an approved Campaign, and supply the content objective, pillars, themes, planned deliverables, source notes, and origin. Successful materialization creates a Campaign-owned content brief that inherits the approved campaign audience, outcome, claim references, and reviewed evidence packet.
11. For a Website Watch response proposal, materialize only when its source is a currently reviewed website-change signal and the correlated Website Watch observation remains reviewed. Supply Calendar planning kind, timing, timezone, and notes; Calendar owns the resulting response plan.
12. For repository-growth work, keep the conversion proposed until it can bind to Repository Growth's finding-backed action authority. Viable does not invent impact, effort, or verification from a title and owner.
13. Open Market to review accepted evidence by type and the limitations that constrain interpretation.

## Materialization state

Signal conversion and authoritative destination creation are separate states.

Viable records:

- the conversion kind;
- named owner;
- proposed, materialized, or materialization-failed state;
- authoritative destination context and record identifier after success;
- materialization time;
- failure detail and attempt time when destination creation fails.

### Product Core materialization

`product_action`, `icp_validation_action`, and `product_feedback` materialize into Product Core readiness actions. The materialized Product Core action records `signal` as its source and the signal conversion identifier as its source ID.

Calling Product Core materialization again for the same conversion returns the existing Product Core action rather than creating a duplicate.

### Campaign materialization

`campaign_brief` can materialize into the Campaign bounded context after the user supplies the full destination-specific brief.

Campaign materialization requires:

- a campaign objective;
- one primary outcome;
- one primary audience;
- test-audience or reviewed selected-ICP authority;
- problem, trigger, and offer;
- message hierarchy;
- at least one approved Product Core claim;
- reviewed non-generated Product Core evidence covering every selected claim evidence reference;
- call to action;
- one or more supported channels;
- asset plan;
- named owner inherited from the signal conversion;
- success measures;
- optional dependencies.

Campaign Service remains authoritative. It rejects unapproved claims, missing or non-reviewed evidence, stale claim authority, prohibited channel contexts, and invalid selected-ICP references.

A successful materialization creates a **draft** Campaign brief only. It does not approve the campaign, create an approved canonical asset, publish content, deliver a message, or authorize external action.

Campaign materialization uses a deterministic destination identity derived from the signal conversion. Retrying the same conversion returns the existing Campaign draft instead of creating a duplicate, including recovery when the destination write succeeded but the Signals-side acknowledgement failed.

### Content brief materialization

`content_brief` materializes into **Campaigns and Assets**, not into a generic Signals-owned task and not directly into a canonical asset.

Content materialization requires an already approved Campaign brief. The content brief inherits the campaign's:

- primary audience;
- primary outcome;
- approved Product Core claim snapshots;
- reviewed Product Core evidence packet.

The user supplies the content-specific fields:

- content objective;
- one or more content pillars;
- optional themes;
- one or more planned deliverables;
- source notes;
- human-authored or generated-suggestion origin.

Campaign Service revalidates Product Core claim and evidence authority before creating the brief. Review revalidates that authority again and requires the parent Campaign to remain approved.

A successful materialization creates a **draft content brief** only. It does not create a canonical asset, channel variant, export package, publishing approval, publication, or delivery claim. Those remain separate downstream stages.

The content destination identifier is deterministic from the signal conversion. Retrying the same conversion returns the existing Campaign-owned content brief rather than creating a duplicate.

Existing Campaign workspaces that predate the `contentBriefs` collection are normalized with an empty collection when loaded by Campaign Service, preserving the additive local-data shape while broader migration and recovery work remains tracked separately.

### Website Watch response materialization through Calendar

`website_watch_action` does not create a duplicate task record inside Website Watch. Website Watch remains authoritative for the reviewed observation, while Calendar remains authoritative for the response plan.

Materialization requires:

- a reviewed `website_change` signal;
- the signal's correlated Website Watch observation identifier;
- that observation to remain in reviewed state;
- one Calendar planning kind: follow-up, experiment, opportunity, or approval deadline;
- a start time and timezone;
- optional end time and planning notes;
- the named owner already recorded on the signal conversion.

The Calendar entry uses a Signals conversion correlation reference for idempotent recovery and records the Website Watch observation identifier in its notes. Retrying after a Calendar write returns the existing Calendar entry instead of creating a duplicate.

This path creates local planning only. It does not publish, notify a provider, revise Product Core, approve an external action, or claim delivery. The existing direct **Create Calendar follow-up** path from a reviewed observation remains available; the materialization path adds conversion-state provenance and retry semantics for `website_watch_action`.

A failed materialization attempt remains visible and can be retried. Successful retry clears the prior failure record.

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
- destination authority not ready;
- recovery to the saved inbox.

One source failure does not discard successful evidence from another source.

## Authority boundaries

Every imported signal begins as a suggestion. Acceptance requires a named reviewer.

Only reviewed signals can become proposed owned work. Signals owns the evidence and conversion record; it does not become the authority for the destination record.

When Product Core materialization succeeds, Product Core owns the resulting readiness action. Signals retains only the traceable materialization reference.

When Campaign materialization succeeds, Campaigns and Assets owns the resulting draft campaign brief. Signals retains the conversion and authoritative destination reference.

When content materialization succeeds, Campaigns and Assets owns the resulting content brief and inherited source packet. Content review, canonical asset creation, asset review, channel variants, export, approval, and external action remain under their existing Campaign and approval boundaries.

When Website Watch response materialization succeeds, Website Watch still owns the reviewed observation and Calendar owns the resulting planning entry. Signals retains the conversion and authoritative Calendar destination reference.

Repository-growth conversions remain proposed until they can satisfy Repository Growth's finding-backed action authority. A conversion does not publish content, contact a person, qualify a lead, mutate the canonical ICP, or grant external-action approval.

Product Core remains authoritative for product truth, claims, canonical ICP hypotheses, and Product Core readiness actions. Campaigns and Assets remains authoritative for campaign briefs, content briefs, canonical assets, variants, and their review state.

## Current limitations

- Live public GitHub access is unauthenticated and subject to public API rate limits.
- GitHub activity is a recent sample rather than a complete activity ledger.
- Source configuration and inbox data currently belong to the local desktop profile.
- Backup, export, restore, and complete migration/recovery behavior remain release-foundation work.
- Repository-growth-action materialization still requires destination-specific implementation that preserves readiness-finding authority.
- Campaign materialization creates a governed draft only; campaign review, approval, asset production, export, and external delivery remain separate workflows.
- Content materialization creates a governed draft content brief only; canonical assets, variants, approval, export, and external delivery remain separate workflows.
- Hands-on screen-reader review and unfamiliar-user acceptance are pending.
