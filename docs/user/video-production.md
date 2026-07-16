# Video Production in Studio

## Purpose

The Video Production workflow converts an approved campaign-linked canonical script into a manual, provider-neutral production package. You run production in a separate environment, then import the resulting evidence and media into Viable for named review.

Viable does not execute ViMax, store provider credentials, schedule media, publish, claim delivery, or measure video in this slice.

## Before you begin

You need:

1. a Product workspace;
2. reviewed Product Core evidence;
3. approved Product Core claims;
4. an approved campaign;
5. an approved canonical script asset;
6. rights and consent information for every source asset;
7. a plan for the LLM, image, and video providers you may use outside Viable.

The workflow will block production if the campaign, script, claims, evidence, rights, or consent are not current.

## Open the workflow

1. Open **Studio**.
2. Scroll to **Studio · Video**.
3. Review the optional production-tool card.

The implemented compatibility target is ViMax `v1.1.0`, revision `1f8f650`. The adapter is manual. It does not install or run ViMax.

## Step 1: Create the video brief

Choose an approved canonical script and record:

- video title;
- objective;
- named owner;
- duration;
- visual style;
- target platforms;
- aspect ratios;
- caption requirement;
- audio-description requirement;
- prohibited elements;
- storyboard;
- source assets and rights;
- LLM provider plan;
- image provider plan;
- video provider plan;
- estimated costs and currency;
- data-handling notes.

### Storyboard format

Enter one scene per line:

```text
seconds | purpose | narration | visual direction | shot constraints
```

Example:

```text
10 | Introduce the problem | Campaign claims drift. | Show disconnected drafts | No customer data
20 | Show the governed workflow | Viable preserves approved truth. | Show Product, Campaigns, and review states | No unapproved brands
```

The total scene duration cannot exceed the approved video duration.

### Source-asset format

Enter one source asset per line:

```text
label | media type | reference | owner | rights basis | sensitive kind | consent status | allowed use
```

Example:

```text
Product UI reference | image/png | assets/product-ui.png | MythologIQ Labs, LLC | Owned product screenshot | none | not_applicable | This campaign
```

Sensitive kinds include:

- likeness;
- voice;
- logo;
- trademark;
- customer asset;
- copyrighted asset.

Sensitive assets require `recorded` consent. Viable rejects a brief that treats missing consent as sufficient.

### Provider plans

Record one plan for each provider kind:

- LLM;
- image;
- video.

Each plan records:

- provider;
- model;
- estimated cost;
- currency;
- data-handling notes.

Do not enter an API key, token, password, provider cookie, session, or other credential. Viable does not need it for the manual workflow and rejects secret-like content from packages and logs.

## Step 2: Review the brief

The brief starts in **draft**.

1. Select **Submit for review**.
2. Provide a named reviewer.
3. Record a review note.
4. Approve, request changes, or reject.

The reviewer should verify:

- the campaign and script are still approved;
- the exact script version is correct;
- claims and evidence are current;
- storyboard scenes match the approved message;
- prohibited elements are complete;
- source rights and consent are sufficient;
- provider costs and data handling are understood;
- captions and other accessibility requirements are present;
- disclosures are complete.

A generator or production tool cannot approve the brief.

## Step 3: Create the manual package

After brief approval:

1. Choose the approved brief.
2. enter the named package creator;
3. select **Create manual production package**;
4. select **Download JSON package**.

The package contains:

- the approved brief;
- exact source-script version;
- claim and evidence references;
- storyboard;
- source-asset rights and consent;
- provider plans and expected costs;
- expected artifacts;
- a ViMax Script2Video compatibility packet;
- a blank provider configuration template;
- upstream MIT notice information;
- manual instructions.

The package explicitly records:

```text
credentials included: false
executed by Viable: false
render approved: false
approved for publishing: false
delivered: false
```

## Step 4: Run production separately

The current ViMax integration is manual.

To use the compatibility packet:

1. install or check out ViMax `v1.1.0` separately;
2. review the upstream MIT license and retain required notices;
3. install its Python 3.12 or newer environment with `uv`;
4. copy the generated Script2Video entrypoint into that separate checkout;
5. copy the blank YAML template;
6. configure credentials only in your local external environment;
7. run production outside Viable;
8. preserve stage history, failures, artifact paths, hashes, and redacted logs.

The upstream project lists Windows and Linux. Viable has not executed the manual adapter on either operating system, and macOS remains unverified.

Do not copy populated provider configuration back into Viable.

## Step 5: Import the run

Choose the production package and record:

- source tool;
- source tool version;
- run correlation ID;
- render status;
- named importer;
- stage observations;
- artifact records;
- redacted log;
- failure class and detail where needed.

### Stage format

Enter one stage per line:

```text
status | stage | ISO timestamp | detail
```

Example:

```text
completed | package_received | 2026-07-16T12:00:00.000Z | Package loaded
completed | completed | 2026-07-16T12:30:00.000Z | Final assembly completed
```

Supported stage states are:

- pending;
- running;
- completed;
- failed;
- cancelled.

Supported stage kinds include package receipt, script loading, storyboard planning, reference preparation, image generation, video generation, audio assembly, caption generation, final assembly, completion, failure, and cancellation.

### Artifact format

Enter one artifact per line:

```text
relationship | relative path | MIME type | size bytes | SHA-256
```

Example:

```text
final_render | output/final.mp4 | video/mp4 | 1024000 | <64-character SHA-256>
captions | output/captions.vtt | text/vtt | 2048 | <64-character SHA-256>
```

Artifact paths must be relative. Absolute paths and path traversal are rejected.

Supported relationships include:

- final render;
- platform render;
- clip;
- image;
- audio;
- captions;
- artifact manifest;
- redacted log.

### Failure handling

A failed or cancelled run must include failure details. Viable preserves the failure, stage history, retained artifacts, and redacted log.

Failure does not become an empty or successful result. A failed render cannot be approved as completed media.

## Step 6: Review the imported artifact

A completed external render enters Viable as:

```text
render status: completed
review status: draft
```

Those states are intentionally separate.

1. Submit the artifact for review.
2. Provide a named reviewer.
3. Record a review note.
4. Approve, request changes, or reject.

Approval should verify:

- current campaign and Product Core authority;
- source script and claims;
- media quality;
- captions;
- visual accessibility;
- rights and consent;
- disclosures;
- artifact manifest and checksums;
- provider or model concerns;
- failure or limitation notes.

Only completed renders with a final-render artifact may be approved. If captions were required, a caption artifact must also exist.

## Step 7: Create platform variants

After artifact approval:

1. choose the approved artifact;
2. choose the platform;
3. choose the approved aspect ratio;
4. choose the render file;
5. choose a caption file when required;
6. record accessibility notes;
7. create the draft variant;
8. submit it for separate named review.

Supported platform records are:

- LinkedIn;
- Instagram Reels;
- YouTube Shorts;
- website.

Platform-variant approval should verify crop, readability, captions, disclosures, and message consistency.

## Authority changes

Use **Recheck Product and Campaign authority** after a material Product Core, campaign, or script change.

Viable may invalidate approval when:

- the campaign is no longer approved;
- the canonical script changes;
- the script version changes;
- a claim is revised or retired;
- evidence is no longer reviewed;
- source rights or consent are no longer sufficient;
- accessibility or disclosure authority changes.

A stale render may remain in the workspace as evidence. It cannot silently inherit approval for the changed product truth.

## Calendar and publishing boundary

Approved video variants cannot enter a Viable calendar yet.

Issue #7 must first implement authoritative records for:

- scheduling;
- destination identity;
- delivery evidence;
- outcomes;
- measurement;
- learning.

Until then:

- approval is not scheduling;
- approval is not publishing;
- approval is not delivery;
- approval is not measurement.

## Recovery states

The workflow includes:

- no approved script;
- no brief;
- no approved brief;
- no package;
- no imported run;
- failed or cancelled run;
- no approved render;
- authority invalidation;
- local operation failure;
- saved-workspace recovery.

A failure in the optional production environment does not damage Product Core, Campaigns, Repository Growth, or other Studio assets.

## Accessibility

The internal workflow includes semantic labels, keyboard-operable controls, non-color status, scalable layouts, reduced-motion behavior, caption requirements, and platform accessibility notes.

Hands-on keyboard and assistive-technology acceptance remains open. Automated checks and semantic source contracts are not a substitute for that review.

## Current limitations

- Viable does not execute ViMax.
- Viable does not install Python or the ViMax dependency graph.
- Viable does not store provider credentials.
- Viable does not validate actual provider costs.
- Windows and Linux are upstream compatibility statements, not Viable execution evidence.
- macOS is unverified.
- cancellation and resume are not implemented because there is no local execution adapter.
- Calendar, publishing, delivery, measurement, and learning are not implemented.
- Human accessibility and unfamiliar-user acceptance remain open.

## Related documents

- `../architecture/video-production-domain.md`
- `../integrations/vimax-video-generation.md`
- `../user/campaigns-and-studio.md`
- `../status/current-state.md`
- `../roadmap/initial-build-sequence.md`
