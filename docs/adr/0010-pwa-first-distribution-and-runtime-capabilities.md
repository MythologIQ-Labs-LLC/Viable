# ADR-0010: PWA-first distribution and capability-driven native runtime

- Status: Accepted
- Date: 2026-10-05
- Supersedes: None. It amends the forward deployment assumptions in `docs/architecture/viable-platform.md` §5.1 and the installer-signing gates in issue #36.
- Superseded by: None

## Context

Viable ships today as a Tauri desktop application. Public native distribution is constrained by code signing:

- Windows SmartScreen and Smart App Control, and macOS Gatekeeper, warn about or block unsigned binaries.
- Viable does not have a dependable public code-signing certificate path, and must plan as though it may never have one.

The Microsoft Store does not remove that dependency for Viable's current packaging. Tauri 2 produces MSI/EXE installers, and Store submissions of MSI/EXE apps must be Authenticode-signed by the developer with a certificate from a CA in Microsoft's Trusted Root Program. Microsoft signs only MSIX submissions, and Tauri has no built-in MSIX output.

Sources:
- <https://v2.tauri.app/distribute/microsoft-store/>
- <https://learn.microsoft.com/en-us/windows/apps/publish/publish-your-app/msi/app-package-requirements>
- <https://learn.microsoft.com/en-us/windows/apps/package-and-deploy/code-signing-options>

Repository evidence (see [the planning review](../reviews/pwa-runtime-roadmap-review-2026-10-05.md)) shows Viable is already structurally a local-first web application:

- The UI is plain ES modules with no inline scripts or styles and no `eval`. It runs unmodified in Chromium without Tauri.
- Every authoritative workspace already persists to origin-scoped browser storage through a versioned envelope, in **both** runtimes.
- A runtime-neutral portable backup (`viable.workspace-backup` v1) already exists.
- The UI makes no network calls; every import is file-based.
- The only native capabilities are:
  - the OS credential vault (`main`);
  - LinkedIn HTTPS publishing and an allowlisted system-browser opener (PR #109).

Viable differs from a pure document-style app in three ways:

1. it holds provider credentials;
2. it performs externally consequential automated publication;
3. it runs a deterministic publication scheduler.

Browsers cannot provide an OS credential vault, and no web standard lets a closed web app execute code at an exact wall-clock time. Periodic Background Sync and Background Sync are Chromium-only and browser-scheduled; Notification Triggers never shipped; Web Push needs an application server. Sources:
- <https://developer.chrome.com/docs/capabilities/periodic-background-sync>
- <https://developer.chrome.com/docs/web-platform/notification-triggers>
- <https://web.dev/articles/push-notifications-overview>

LinkedIn's API rejects browser-origin requests through CORS. Its standard authorization-code flow requires a Client Secret, and PKCE is a separate native-only flow enabled per application. Sources:
- <https://github.com/linkedin-developers/linkedin-api-js-client>
- <https://learn.microsoft.com/en-us/linkedin/shared/authentication/authorization-code-flow>
- <https://learn.microsoft.com/en-us/linkedin/shared/authentication/authorization-code-flow-native>

## Decision

### 1. No certificate prerequisite

A public code-signing certificate is never a prerequisite for Viable to be usable by ordinary people. If a certificate becomes available, it is an optional improvement to native distribution, not a release gate.

### 2. The PWA is the primary mainstream runtime

An installable, local-first Progressive Web App served from an HTTPS origin is Viable's primary cross-platform distribution for Windows, macOS, and Linux. Ordinary browser use remains valid where installation is unavailable.

### 3. No "Viable Lite"

The PWA must provide the full marketability loop (UNDERSTAND → PLAN → CREATE → ACTIVATE → MEASURE → LEARN) wherever browsers can safely provide the behavior:

- Product Truth, ICP, marketability;
- Signals and imports;
- Campaigns, discovery strategy, and content;
- approval;
- publication inventory and policy;
- scheduling and planning;
- manual activation and export;
- outcomes, measurement, and learning;
- backup and restore.

A difference between runtimes is allowed only when it comes from a **real runtime capability**. It must be shown to the user explicitly and never presented as a broken or hidden feature. "The current code uses Tauri" is never a reason.

### 4. The native runtime is a capability extension

The Tauri runtime is retained for capabilities browsers cannot safely satisfy:

- **OS credential vault** for provider secrets;
- **connected provider publishing** that needs stored credentials or CORS-free provider access (LinkedIn member publishing, PR #109);
- **closed-app or background execution**, which remains undesigned and is entered only after the native live proof establishes real timing and restart requirements.

Native-only status must name the concrete platform limitation.

### 5. Shared core and runtime adapters

- Domain and application services are runtime-neutral and are the only source of product rules.
- Runtime adapters own persistence engines, credential storage, provider transport, file and OS integration, packaging, and update mechanics.
- No runtime becomes a second source of product truth.

### 6. Local-first is invariant

- Web delivery does not make data server-authoritative.
- No Viable-hosted account or database is introduced by this decision.
- Local workspace data is never transmitted merely because the UI is web-delivered.
- Native and browser runtimes have separate storage origins. The **portable versioned backup** is the interchange contract; no runtime reads another runtime's storage internals.

### 7. Credential and security parity cannot be faked

- Browser JavaScript does not store provider secrets in this architecture.
- A provider Client Secret never ships in browser code.
- Before any browser provider path is built, that provider must pass this test:
  1. Does it support a standards-compliant public-client OAuth flow?
  2. Is PKCE supported for browser clients?
  3. Is a Client Secret required?
  4. Can tokens be handled in memory under the local-first browser model?
  5. Would browser storage weaken Viable's existing credential promise?
  6. Can an interactive browser flow work without permanent credentials?
  7. Does unattended publishing still require the native runtime?
- LinkedIn fails questions 1–3 today, so LinkedIn connected publishing is native-only.

### 8. Background execution is described truthfully

- The PWA never promises closed-app or exact-time publication. It may evaluate the scheduler while Viable is open.
- No runtime promises "publish at 9:05 even if Viable has been closed for days" until that runtime is proven able to do it.

### 9. Distribution channels and labels

| Channel | Status | Trust boundary |
|---|---|---|
| PWA on an HTTPS origin | **Primary mainstream** (all desktop OSes) | HTTPS origin identity plus deployment provenance (decision 10) |
| Microsoft Store MSIX (Windows native) | **Candidate**, pending a proof of concept that packages the Tauri app as MSIX | Store certification and Microsoft-managed signing |
| Microsoft Store MSI/EXE | **Not cert-free**: requires developer Authenticode signing | Developer certificate |
| Direct GitHub native artifacts | **Development / advanced / archival only** | Checksums and build provenance, labeled honestly as unsigned |
| Native macOS / Linux packages | **Not planned** for ordinary users | n/a |

Documentation must never instruct users to disable SmartScreen, Smart App Control, Defender, Gatekeeper, or equivalent protections.

### 10. PWA deployment trust contract

Production PWA deployment requires:

- HTTPS only;
- a strict CSP and security headers equal to or stricter than the Tauri CSP;
- immutable, versioned build identity visible in the app;
- auditable source-to-deployment provenance;
- a service-worker update lifecycle that never silently swaps code under a running session: updates are user-confirmed, caches are versioned, and old caches are removed only after activation;
- rollback to a previous build;
- no transmission of local Viable data.

Public documentation and product pages on the origin may be indexable for discoverability (#110). Application state is never indexable or uploaded.

## Consequences

### Positive

- Ordinary users can reach Viable without a certificate, an installer warning, or a security bypass.
- The existing UI, domain services, persistence envelope, and backup format carry over, so most work is packaging and runtime adapters rather than a rewrite.
- Native work is focused on capabilities that genuinely need it, so PR #109 keeps its role as the first native capability.
- A real-browser test harness becomes part of validation. It catches defects that static tests cannot, such as the Calendar render loop fixed in PR #113.

### Negative

- Two runtimes must be validated, and capability differences must be designed and explained.
- Browser storage can be evicted. Durable-storage requests, quota visibility, and backup guidance become product requirements.
- Connected publishing is unavailable to PWA-only users until a provider passes the provider test or the native runtime reaches them through a cert-free channel.
- Hosting, deployment, and service-worker update discipline become new operational responsibilities.

## Alternatives considered

### Acquire a public code-signing certificate and stay native-first

Rejected as a prerequisite: availability and cost are not dependable. Signing remains an optional enhancement.

### Microsoft Store MSI/EXE as the cert-free Windows path

Rejected as cert-free. The Store requires developer Authenticode signing for MSI/EXE submissions.

### Unsigned direct binaries for ordinary users

Rejected. Normal users would have to bypass OS protections.

### Hosted Viable service with server-side credentials and scheduling

Not adopted. It contradicts ADR-0001 and would need its own ADR (platform architecture §5.3).

### Store provider tokens in browser storage for PWA parity

Rejected. It silently weakens the credential promise made by the native vault boundary.

## Implementation implications

- Build a static PWA output from the existing web UI, with a manifest, icons, a versioned service worker, build identity, and a strict CSP.
- Add a runtime capability model, the single authority for what the current runtime can do, and surface it in the UI.
- Request durable storage. Surface persistence and quota state, and guide users to back up.
- Move authoritative browser persistence to IndexedDB in a dedicated slice. This first makes `WorkspaceLifecycleService` asynchronous; the domain store ports are already asynchronous.
- Add real-browser smoke validation to CI.
- Choose a production origin and host, then add deployment provenance and rollback.
- Run a Microsoft Store MSIX proof of concept for the Tauri runtime as an independent track.
- Re-scope issue #36: installer signing is no longer a mainstream release gate.

## Related requirements and documents

- [PWA runtime planning review](../reviews/pwa-runtime-roadmap-review-2026-10-05.md)
- ADR-0001 (local-first authority), ADR-0002 (provider-neutral adapters), ADR-0005 (human approval), ADR-0009 (deterministic publishing)
- `docs/architecture/viable-platform.md` §5 deployment profiles
- Issues: #36 (release foundation), #97 (automated publishing umbrella), #107 / PR #109 (native LinkedIn proof), #110 (discoverability)
- PR #113 (Calendar render-loop fix found by the browser run)
- Reference: Job Ranger `docs/design/DISTRIBUTION_ARCHITECTURE.md` (informing, not copied)
