# ViMax Video Generation Integration Assessment

## Document control

| Field | Value |
|---|---|
| Status | Stage 1 manual compatibility implemented; execution adapter deferred |
| Last reviewed | 2026-07-16 |
| Upstream repository | `HKUDS/ViMax` |
| Compatibility target | `v1.1.0`, revision `1f8f650` |
| Implementation | PRs #23 and #24 |
| Product issue | GitHub issue #4 |

## Decision

ViMax is an optional, removable production-tool adapter for Viable.

The implemented integration is a provider-neutral manual package and artifact-import workflow. Viable does not install or execute ViMax, bundle its Python dependency graph, inject credentials, call media providers, schedule media, publish, claim delivery, or measure performance.

Viable remains authoritative for:

- product truth;
- ICP and audience context;
- campaign intent;
- approved claims and evidence;
- approved canonical script and exact version;
- storyboard constraints;
- source assets, rights, consent, and disclosures;
- provider choice, cost estimate, and data-handling notes;
- video brief approval;
- imported render review;
- platform-variant review;
- future calendar, publishing, delivery, and measurement records.

ViMax may be used separately to orchestrate production steps. It cannot grant Viable approval or external-action authority.

## Upstream revalidation

The implementation review pinned ViMax at:

- tag: `v1.1.0`;
- revision: `1f8f650`;
- release date: 2026-06-08;
- license: MIT;
- copyright notice: Copyright (c) 2025;
- runtime: Python 3.12 or newer;
- environment management: `uv`;
- upstream-listed operating systems: Linux and Windows;
- unverified operating system: macOS.

The upstream project contains:

- idea-to-video workflows;
- script-to-video workflows;
- novel-to-video workflows;
- script and storyboard planning;
- reference-image handling;
- image and video generation;
- consistency checks;
- audio and video assembly;
- session and working-directory behavior;
- provider configuration through YAML or environment values.

The root `vimax tui` entrypoint is interactive. It is not treated as a stable machine job API.

The pinned Script2Video example calls `Script2VideoPipeline.init_from_config(...)` and accepts:

- script;
- user requirement;
- style;
- YAML configuration.

The upstream YAML supports blank API-key fields. Viable therefore exports a blank template and never populated credentials.

## Implemented Stage 1

### Provider-neutral video brief

Viable records:

- approved campaign and canonical script;
- exact script version;
- claim revisions and reviewed evidence;
- objective, audience, duration, platforms, and aspect ratios;
- visual style and prohibited elements;
- storyboard scenes and shot constraints;
- captions, audio description, accessibility, and disclosures;
- source-asset rights and consent;
- LLM, image, and video provider plans;
- estimated costs, currency, and data-handling notes;
- named owner and review state.

### Manual package

The export contains:

- the approved video brief;
- script authority references;
- storyboard;
- source-asset manifest;
- provider plan;
- expected artifacts;
- a pinned ViMax Script2Video compatibility packet;
- a blank provider YAML template;
- an upstream notice file;
- manual run and re-import instructions.

The package explicitly records:

```text
credentials included: false
executed by Viable: false
render approved: false
approved for publishing: false
delivered: false
```

### ViMax compatibility packet

The implemented packet contains:

- `vimax/main_script2video_viable.py`;
- `vimax/configs/script2video.viable.yaml`;
- `vimax/UPSTREAM-NOTICE.txt`.

The generated Python file adapts the approved script, storyboard constraints, target duration, platforms, aspect ratios, prohibited elements, and accessibility requirements to the pinned Script2Video entrypoint.

The YAML template contains blank credential fields.

The notice records the pinned upstream target and the obligation to retain the MIT copyright and permission notice in copies or substantial portions of ViMax.

The compatibility packet does not contain ViMax itself.

### Artifact import

Viable imports:

- source tool and version;
- correlation ID;
- completed, partial, failed, or cancelled status;
- stage history;
- failure class and detail;
- relative artifact paths;
- MIME types and sizes;
- SHA-256 values;
- final render, platform render, clip, image, audio, caption, manifest, and redacted-log relationships;
- redacted logs;
- source brief and package relationships;
- named importer;
- separate review state.

Render completion remains distinct from approval.

### Platform variants

Approved imported artifacts may produce separately reviewed variants for:

- LinkedIn;
- Instagram Reels;
- YouTube Shorts;
- website.

Variant approval verifies platform crop, captions, accessibility, disclosures, and message consistency.

## Architecture boundary

```text
Product Core
  -> approved claims and evidence

Campaigns and Assets
  -> approved campaign
  -> approved canonical script and version

Video Production
  -> reviewed video brief
  -> provider-neutral package
  -> optional ViMax compatibility packet

External production environment
  -> provider calls and media assembly
  -> stage evidence and artifacts

Video Production
  -> imported unapproved artifact
  -> named render review
  -> named platform-variant review

Issue #7, later
  -> Calendar
  -> publishing and delivery evidence
  -> measurement and learning
```

## Authority revalidation

External production may outlive the approval state used to create the package. Viable revalidates current authority at:

- package creation;
- run import;
- artifact approval;
- variant creation;
- variant approval.

The service checks the current campaign, script, version, claims, reviewed evidence, rights, consent, accessibility, and disclosure relationships.

Stale output may remain as retained evidence, but it cannot silently inherit current approval.

## Credential posture

No credential may enter:

- Product Core;
- campaign or canonical asset records;
- video briefs;
- exported packages;
- compatibility files;
- artifact metadata;
- imported logs;
- repository files;
- screenshots or documentation fixtures.

The Stage 1 workflow does not use an OS vault because it does not execute a provider or local worker.

A future execution adapter must use scoped environment injection from an operating-system vault and must create temporary, bounded, redacted configuration.

## Runtime and supply-chain posture

ViMax requires a separate Python environment and includes a broad AI and media dependency graph. Upstream dependencies include provider SDKs, LangChain components, FAISS, MoviePy, OpenCV, media-processing packages, and model clients.

The implemented boundary avoids adding those packages to the Tauri desktop distribution.

Before any managed worker or CLI execution ships, Viable must define:

- version and health checks;
- checksum or signature verification;
- installation and update ownership;
- dependency and vulnerability scanning;
- job submission and cancellation;
- progress and stage reporting;
- structured errors;
- resource, disk, and retention limits;
- bounded working directories;
- redacted logs;
- artifact manifests;
- rollback and uninstall behavior;
- support expectations for Windows, Linux, and macOS.

## Operating-system posture

Upstream documentation lists Linux and Windows.

Viable has not executed the Stage 1 package on either operating system because Stage 1 is manual and does not invoke ViMax.

Therefore:

- Linux compatibility is recorded as an upstream statement, not Viable evidence;
- Windows compatibility is recorded as an upstream statement, not Viable evidence;
- macOS remains unverified and unclaimed;
- cross-platform execution acceptance remains a future CLI-adapter gate.

## Rights and identity posture

Video production increases the risk of rights and identity misuse. Viable records source, owner, rights basis, consent, allowed use, prohibited use, expiration, and disclosures for:

- likeness;
- voice;
- logo;
- trademark;
- customer asset;
- copyrighted asset;
- generated media.

Sensitive assets require recorded consent. Missing consent is not converted into approval.

Provider and model terms remain separate obligations. The upstream MIT license does not grant rights to source media, provider models, customer assets, or generated likenesses.

## Failure semantics

The workflow preserves:

- partial production;
- failed stages;
- cancelled stages;
- failure detail;
- retained artifacts;
- redacted logs;
- unapproved review state.

A failed or cancelled run cannot be approved as a completed render.

## Accessibility

The brief and variant records include:

- caption requirements;
- audio-description requirements;
- visual accessibility constraints;
- platform accessibility notes;
- disclosures.

The internal Studio workflow includes semantic labels, keyboard-operable controls, non-color status, scalable layout, and reduced-motion behavior.

Hands-on keyboard and assistive-technology acceptance remains open.

## Deferred Stage 2: Local CLI adapter

A local CLI adapter remains deferred because the pinned upstream TUI is interactive and no stable machine-safe contract has been accepted.

A future adapter requires:

- noninteractive invocation;
- version and health contract;
- explicit job ID;
- cancellation;
- progress reporting;
- structured stage events;
- structured errors;
- deterministic output manifest;
- bounded working directory;
- environment-only credential injection;
- redacted logs;
- cleanup and retention behavior;
- cross-platform execution validation.

Implementation convenience must not convert the interactive TUI into an assumed API.

## Deferred Stage 3: Managed local worker

A managed local worker remains optional and requires a separate architecture and operational decision.

It must remain removable and cannot become required for core Viable planning, approval, package export, artifact import, or review.

## Deferred Stage 4: Remote execution

Remote execution is not planned for the current product stage.

Any future remote service requires explicit decisions for identity, tenant isolation, uploaded media, location, retention, provider data use, costs, deletion, export, and incident handling.

## Acceptance status

| Criterion | Status |
|---|---|
| ViMax version and license recorded | Implemented |
| Provider-neutral approved package | Implemented |
| Blank-credential Script2Video compatibility packet | Implemented |
| Provider choice, costs, and data handling | Implemented |
| Rights and consent manifest | Implemented |
| Render stages and failures visible | Implemented |
| Artifact manifest and source relationships | Implemented |
| Render completion separate from approval | Implemented |
| Named final render approval | Implemented |
| Separately reviewed platform variants | Implemented |
| Calendar and measurement handoff | Blocked on issue #7 |
| Local ViMax execution | Deferred |
| Cancellation and resume | Deferred with execution adapter |
| Windows execution validation | Not performed |
| Linux execution validation | Not performed |
| macOS execution validation | Not performed and not claimed |
| Human accessibility acceptance | Open |
| Unfamiliar-user acceptance | Open |

## Related documents

- `../architecture/video-production-domain.md`
- `../user/video-production.md`
- `../roadmap/initial-build-sequence.md`
- `../status/current-state.md`
- GitHub issue #4

## Upstream references

- Repository: https://github.com/HKUDS/ViMax
- Pinned tag: https://github.com/HKUDS/ViMax/tree/v1.1.0
- Technical report: https://arxiv.org/abs/2606.07649

The upstream project and dependency graph must be revalidated before any execution adapter is implemented.
