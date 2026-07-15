# ViMax Video Generation Integration Assessment

## Decision

ViMax is a strong candidate for an optional Viable video-orchestration adapter and reference implementation.

It should not become Viable's canonical video domain, credential store, approval authority, or only generation path. Viable should own the campaign brief, product claims, audience, script approval, asset rights, job intent, review state, final asset record, and distribution workflow. ViMax may orchestrate the production steps behind an explicit generation job.

## Why ViMax is relevant

ViMax is an MIT-licensed agentic video-generation framework that coordinates:

- idea-to-video workflows;
- script-to-video workflows;
- novel-to-video workflows;
- script generation;
- storyboard and shot planning;
- reference image management;
- image generation and consistency review;
- video generation;
- audio and video assembly;
- session resume and render status.

This aligns with Viable's planned short-video production system, especially for campaigns that need a script, storyboard, visual references, multiple shots, captions, and reviewable output rather than one isolated generated clip.

## Current implementation characteristics

| Concern | ViMax posture | Viable implication |
|---|---|---|
| License | MIT | Integration and modification are permitted with attribution and license retention |
| Runtime | Python 3.12 with `uv` | Requires a separate managed runtime or external worker beside the Tauri and Node application |
| Supported OS listed | Linux and Windows | macOS support must be tested rather than assumed |
| Orchestration | Multi-agent pipeline and TUI | Useful backend, but Viable should provide the product-facing workflow |
| Providers | Configurable LLM, image, and video endpoints | Good adapter boundary, but model availability, cost, and terms remain external |
| Credentials | YAML or environment-variable API keys | Viable must inject scoped secrets from the OS vault and must not copy keys into project files |
| Media assembly | MoviePy, OpenCV, scene detection | Useful for local artifact assembly and inspection |
| Retrieval | FAISS and LangChain dependencies | Requires review for local storage, model calls, and supply-chain footprint |
| Packaging | Developer-oriented clone and `uv sync` flow | Not yet suitable as an invisible end-user dependency without packaging work |
| Interface | Python entrypoints and TUI | Start with a job-package or CLI adapter, then consider a local service |

## Recommended integration boundary

```text
Viable campaign and product truth
  -> approved video brief
  -> approved script, claims, and source assets
  -> Viable video job manifest
  -> ViMax adapter
       -> script and storyboard orchestration
       -> image and video provider calls
       -> consistency and assembly workflow
  -> local working artifacts
  -> Viable review queue
  -> approved final video and variants
  -> Viable calendar and delivery adapters
  -> performance and learning record
```

ViMax cannot:

- approve a campaign or script;
- invent unverified product claims;
- select a real person, customer, logo, voice, likeness, or copyrighted asset without recorded rights;
- access provider credentials directly from Viable configuration files;
- publish generated media;
- mark an output approved merely because the render completed;
- become the source of truth for the campaign, product, or final asset.

## Integration stages

### Stage 1: Tool catalog and manual export

Viable generates a production package containing:

- video brief;
- target platforms and aspect ratios;
- approved script;
- scene and shot constraints;
- product claims and supporting evidence;
- brand style and prohibited elements;
- asset manifest and rights metadata;
- caption and accessibility requirements;
- output and review requirements.

The user exports the package and runs ViMax separately. Completed media is imported back into Viable.

This validates creative fit without binding the desktop product to a Python runtime or provider costs.

### Stage 2: Local CLI adapter

Viable launches a separately installed ViMax command with:

- a generated temporary job directory;
- a sanitized configuration;
- environment-injected credential references;
- bounded working storage;
- explicit provider selection;
- job and correlation identifiers.

Viable captures structured status, output paths, provider usage, failures, and logs after redaction.

### Stage 3: Managed local worker

Viable optionally installs or connects to a version-pinned local ViMax worker.

Required capabilities include:

- health and version contract;
- job submission and cancellation;
- progress and stage reporting;
- resumable jobs;
- resource and disk limits;
- scoped provider credentials;
- artifact manifest;
- structured errors;
- cleanup and retention policy;
- signed or checksum-verified distribution.

### Stage 4: Optional remote execution

Remote execution should be considered only when local compute or provider orchestration becomes impractical.

It requires explicit disclosure and controls for:

- uploaded scripts, images, audio, and video;
- storage location and retention;
- model and provider data use;
- identity, access, and tenant isolation;
- cost budgets and approval;
- deletion and export;
- generated-media rights and disclosures.

A remote service must remain optional. Viable's planning, review, and export workflow must still function without it.

## Viable video job manifest

The adapter should receive a provider-neutral manifest similar to:

```json
{
  "jobId": "video_job_123",
  "campaignId": "campaign_123",
  "objective": "Explain the product problem and invite a demo",
  "audience": "Small software product teams",
  "format": {
    "durationSeconds": 30,
    "aspectRatios": ["9:16", "1:1", "16:9"],
    "platforms": ["linkedin", "instagram-reels", "youtube-shorts"]
  },
  "script": {
    "status": "approved",
    "text": "...",
    "claimIds": ["claim_12"]
  },
  "style": {
    "visualDirection": "Clean product demonstration",
    "prohibitedElements": ["unapproved logos", "invented testimonials"]
  },
  "assets": [],
  "accessibility": {
    "captionsRequired": true,
    "audioDescriptionRequired": false
  },
  "providers": {
    "llm": "user-selected",
    "image": "user-selected",
    "video": "user-selected"
  }
}
```

Provider credentials never enter this manifest.

## Product risks

### Provider cost and availability

ViMax orchestrates generation but does not eliminate model costs. The examples use external LLM, image, and video APIs. Viable must estimate cost before submission, enforce user budgets where possible, and provide an export-only alternative.

### Quality and repeatability

Multi-agent orchestration can improve planning while still producing inconsistent media. Viable needs review, variant comparison, retry reasons, source preservation, and the ability to replace one production stage without repeating the entire campaign process.

### Supply chain

The Python environment includes AI SDKs, LangChain components, FAISS, MoviePy, OpenCV, and provider clients. Viable must pin and scan the worker separately from the desktop application.

### Credential isolation

ViMax supports keys in local YAML or environment variables. Viable must use environment injection from the operating-system vault and create temporary redacted configuration. No credential may be committed, placed in the video project, included in logs, or copied into an export package.

### Rights and identity

AutoCameo and reference-image workflows make consent and rights especially important. Viable must track the source, owner, consent, allowed use, expiration, and disclosure requirements for each likeness, voice, logo, customer asset, and generated element.

### Product complexity

Bundling the full ViMax runtime into the first Viable desktop release would create a large packaging, update, support, and security burden. The manual export and optional local adapter stages should precede any bundled worker.

## Acceptance criteria for a ViMax adapter

- ViMax version and license are recorded.
- The adapter can generate from an approved Viable job manifest.
- No external organization data or secret is embedded in the integration.
- Credentials are injected from the OS vault and are absent from files and logs.
- The user chooses providers and sees expected costs and data-handling notes.
- Render stages and failures are visible.
- Jobs can be cancelled and resumed where ViMax supports it.
- Every output has an artifact manifest and source relationship.
- Render completion does not equal approval.
- Final media re-enters Viable's review, calendar, distribution, and measurement workflow.
- Uninstalling or disabling ViMax does not damage the rest of Viable.

## Upstream references

- Repository: https://github.com/HKUDS/ViMax
- Technical report: https://arxiv.org/abs/2606.07649

The upstream repository and its dependencies must be reviewed again at implementation time because the project is actively changing.
