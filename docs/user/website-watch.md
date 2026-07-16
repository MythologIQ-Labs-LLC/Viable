# Website Watch in Signals and Market

## Purpose

Website Watch helps you record public website-monitoring intent, import Webdog-compatible change evidence, review the evidence, and turn a reviewed change into proposed work or a Calendar follow-up.

Stage 1 works without a live website provider. It does not crawl websites, call Context.dev, open a webhook listener, or store provider credentials.

## Before you begin

Create or select a Product workspace.

Use Website Watch only for a legitimate, authorized purpose. Public visibility does not authorize bypassing access controls, copying private sessions, ignoring provider terms, or retaining third-party material indefinitely.

## Open Website Watch

1. Open **Signals**.
2. Find the **Website Watch** section.
3. Review the Stage 1 boundary shown above the forms.

Website Watch appears inside Signals because website changes are incoming market evidence. It is not a separate product or a Calendar-owned workflow.

## Create a watched site

Use **Create watched site** to record:

- display name;
- public canonical URL;
- relationship to your product;
- retention class;
- legitimate monitoring purpose;
- named owner;
- authorization confirmation.

Relationships include:

- owned;
- competitor;
- partner;
- regulator;
- community;
- other.

The URL must use HTTP or HTTPS. Viable rejects embedded credentials, localhost, private literal addresses, metadata-service addresses, and credential-like query parameters.

Creating a site does not run a source check.

## Record a watch target

After creating an active watched site, use **Record watch target**.

Choose one target kind:

### Page content

Use for:

- pricing pages;
- positioning and offer pages;
- documentation;
- changelogs;
- job listings;
- partner pages;
- standards and government pages.

Enter a public target URL on the watched-site domain.

### Site links

Use to represent sitemap-link monitoring intent.

Choose:

- added links;
- removed links;
- both.

A page URL is not required for this target type.

### Product price

Use to represent product-price and currency monitoring intent.

Enter the public product-page URL.

### Requested interval

The requested interval records desired monitoring cadence for a future provider adapter. It does not run a worker, schedule a provider job, or prove that a check occurred.

## Import Webdog evidence

Stage 1 accepts Webdog's documented outbound alert payload.

Use **Import Webdog alerts** and either:

- paste JSON; or
- choose one local JSON file.

The import must contain:

- type `webdog_ai.new_alerts`;
- version `1`;
- kind `new_alerts`;
- a public source-instance URL;
- site identity;
- one or more alerts;
- alert, target, title, and dashboard references.

Optional fields include:

- alert kind;
- generated change summary;
- bounded diff preview;
- suppression state;
- suppression reason.

You must also select:

- relationship;
- retention class;
- monitoring purpose;
- named owner;
- authorization confirmation.

## Import rejection

Viable rejects the import when it contains:

- unknown fields;
- unsupported type or version;
- no alerts or more than one hundred alerts;
- input larger than 512 KiB;
- credential-bearing field names;
- secret-like values;
- private or unsupported source URLs;
- alert dashboard URLs on a different origin from the declared Webdog instance.

A rejected import appears as validation failure. It is not converted into an empty result.

## What a successful import creates

A successful import creates:

- a Website Watch source-health record;
- a watched site;
- one or more watch targets;
- bounded snapshot records;
- website-change observations;
- generated-analysis records where supplied;
- correlated Signals Inbox suggestions.

The Website Watch observation and Signals record retain a shared correlation identifier.

## Review source health

Website Watch shows the latest source result and its limitations.

Possible results include:

- change detected;
- verified no change;
- partial;
- unavailable;
- rate limited;
- authentication failed;
- validation failed;
- transport failed;
- offline;
- cancelled.

A source failure never means no change.

A newly created site or target without a provider check has no source result. Configuration is not evidence.

## Understand baseline behavior

The first usable snapshot establishes a baseline.

A baseline cannot prove that no earlier change occurred. Viable therefore records the first no-change result as partial baseline evidence rather than verified no change.

## Review an observation

An observation displays:

- watched site;
- change kind;
- evidence state;
- review state;
- bounded diff preview;
- source and observation time;
- confidence;
- snapshot provenance;
- SHA-256 identity;
- retention state;
- evidence limitations;
- generated analysis, when present;
- correlated Signals review state.

Review the correlated Signals Inbox card.

Choose:

- **Accept with named review**; or
- **Dismiss**.

Enter the reviewer's name.

For website changes, this action synchronizes both:

1. the Signals evidence state;
2. the Website Watch observation review state.

Acceptance does not revise Product Core, pricing, positioning, claims, campaigns, or the canonical ICP.

## Generated analysis

Webdog may include:

- an AI change summary;
- a relevance or suppression recommendation.

Viable displays these inside **Generated analysis, not evidence**.

Generated analysis:

- may help a reviewer understand the alert;
- may be wrong or incomplete;
- may omit its provider model and prompt;
- cannot replace source evidence;
- cannot approve or dismiss itself;
- cannot become Product Core truth automatically.

The Signals summary uses the source alert title and bounded diff preview, not the AI-generated summary.

## Snapshot provenance and deletion

Open **Snapshot provenance** to inspect:

- provider;
- observed URL;
- SHA-256 identity;
- bounded payload reference;
- retention class;
- deletion deadline;
- deletion actor and time, when deleted.

Use **Delete retained snapshot payload** to remove retained payload access while preserving:

- snapshot identity;
- observation relationship;
- hash;
- deletion evidence.

Use **Prune expired snapshots** to apply retention deadlines with a named actor.

Deleting retained content does not delete the fact that an observation existed.

## Create proposed work

After accepting a Signals record, open **Convert to proposed work**.

Choose **Website response action** or another appropriate work type.

Enter:

- title;
- named owner.

This creates a proposed work record. It does not perform the work or approve an external action.

## Create a Calendar follow-up

A Website Watch observation can enter Calendar only after:

- the Signals record is reviewed;
- the Website Watch observation is reviewed.

Open **Create Calendar follow-up** from the observation.

Choose:

- follow-up;
- experiment;
- opportunity;
- approval deadline.

Enter:

- start date and time;
- title;
- named owner;
- timezone;
- notes.

The Calendar entry retains the Website Watch observation identifier as the related record.

This is planning only. It does not publish, notify, approve an external action, or claim delivery.

## Enable and disable records

Use **Disable site** to disable a watched site and its targets.

Use **Enable site** to reactivate the site.

Use target-level enable and disable controls to change individual target intent.

Disabling records does not erase prior evidence.

## Market view

Reviewed website-change signals appear in **Market** under Website changes.

The Market view summarizes reviewed evidence only. It does not:

- calculate ICP truth;
- qualify leads;
- infer sales;
- revise positioning;
- manufacture confidence.

## Offline and recovery behavior

Stage 1 remains useful without network access because:

- watched sites and targets are local records;
- Webdog import accepts local pasted or file-based JSON;
- existing evidence remains reviewable;
- Calendar planning remains local.

A failed import preserves prior successful evidence.

Use **Return to saved inbox** after an operation failure.

## Current limitations

Stage 1 does not provide:

- live crawling;
- scheduled worker execution;
- Context.dev calls;
- Context.dev credential storage;
- Webdog service synchronization;
- a public inbound webhook endpoint;
- live screenshots;
- automatic AI triage execution;
- browser-session or private-page access;
- direct publishing or notifications;
- automatic Product Core or ICP changes.

## Human acceptance still required

Issue #29 remains open until:

- keyboard review is complete;
- screen-reader and assistive-technology review is complete;
- an unfamiliar founder completes watched-site creation through reviewed change and Calendar follow-up without intervention;
- accessibility, clarity, evidence, retention, failure, and recovery findings are remediated.
