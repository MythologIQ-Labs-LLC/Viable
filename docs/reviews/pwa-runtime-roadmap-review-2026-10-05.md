# PWA-First Runtime Planning Review: QOR Roadmap and Wayfinder

Date: 2026-10-05

## Purpose

Decide the smallest correct architecture for making Viable usable by ordinary people **without depending on a public code-signing certificate**, while preserving local-first authority and keeping native capability where it genuinely earns its existence.

This review applies the same planning discipline as [`automated-publishing-roadmap-review-2026-10-04.md`](automated-publishing-roadmap-review-2026-10-04.md):

- MythologIQ **QOR Roadmap**: admit long-horizon work only where prerequisite facts, authority decisions, or cross-context dependencies prevent trustworthy planning; model facts, decisions, and prerequisites rather than tasks; expose only the actionable frontier.
- Matt Pocock's **Wayfinder** (the upstream influence): destination, decision tickets, blocking edges, actionable frontier, and explicit `Not yet specified` fog.

It is not canonical QOR Roadmap runtime state. Viable does not carry a `.qor/roadmaps/.../events.jsonl` graph.

The reference architecture is Job Ranger's `docs/design/DISTRIBUTION_ARCHITECTURE.md`. It informs this review; it is not copied. Viable differs materially because it holds provider credentials, performs automated external publication, and runs a deterministic scheduler.

## Destination

An ordinary user on Windows, macOS, or Linux can install or open Viable and perform the complete marketability loop on local data:

```text
UNDERSTAND → PLAN → CREATE → ACTIVATE → MEASURE → LEARN
```

- Viable needs no public code-signing certificate and no Viable-hosted account.
- Native capability is offered only where browsers cannot safely or reliably satisfy the product contract.
- Runtime differences are shown truthfully.

## Evidence gathered (resolved facts)

All facts below were established by inspecting `main` at `98aaed4` and by running the built desktop UI in headless Chromium with no Tauri runtime.

| ID | Fact | Evidence |
|---|---|---|
| F1 | The Viable UI is already a standard web application. It consists of 36 TypeScript modules compiled by `tsc` into ES modules, with no bundler, no inline scripts or styles, and no `eval`. | `apps/desktop/ui`, `apps/desktop/web/index.html`; grep for `style="`, inline `<script>`, `eval(`/`new Function` returned nothing |
| F2 | The UI boots, creates a Product workspace, persists it, survives reload, and renders all nine workspaces in plain Chromium with `window.__TAURI__` undefined. | Headless Chromium run 2026-10-05. The only HTTP error was a missing `favicon.ico`. |
| F3 | **Persistence is already browser storage in both runtimes.** Every authoritative workspace store writes origin-scoped `localStorage` through the shared v1 schema envelope (`local-storage-json.ts`). The Tauri runtime has no Rust persistence. | `apps/desktop/ui/local-storage-*-store.ts`; `src-tauri/src` contains only credential and (on #109) LinkedIn commands |
| F4 | A runtime-neutral portable backup already exists: `viable.workspace-backup` v1. It includes a checksum, rejects credential-looking fields, and supports empty-profile and replace restore modes plus a quarantine export. It runs over a synchronous `KeyValueStorage` interface. | `src/workspace-lifecycle/workspace-lifecycle-service.ts` |
| F5 | Domain persistence ports are already asynchronous (`load`/`save` return `Promise`), so a different browser storage engine can be adopted without changing domain services. `WorkspaceLifecycleService` is the synchronous exception. | `src/*/ports/*-store.ts` |
| F6 | The UI makes **no network calls** on `main`. Signals, Webdog, Event Intelligence, and media are manual, file-based imports, so the browser runtime can be fully offline once its shell is cached. | grep for `fetch(`/`XMLHttpRequest` in `apps/desktop/ui` and the UI-reachable `src` code returned nothing |
| F7 | File interaction already uses standard browser APIs: Blob downloads, `<input type="file">`, and Web Crypto SHA-256. Media renders are not persisted; only hash, size, and type metadata are stored, and files are re-attached for review. | `guided-import-media-review-shell.ts`, `workspace-lifecycle-shell.ts`, the `*-view.ts` download helpers |
| F8 | On `main` the only native capability is the credential vault (`credential_capability/put/has/delete`). PR #109 adds the LinkedIn HTTPS commands and an allowlisted system-browser opener. | `src-tauri/src/lib.rs` on `main` and on `feature/linkedin-member-proof-slice-d` |
| F9 | **No runtime has background execution today.** The scheduler runs only when invoked; on #109 that is the explicit **Run automation now** control. | `publication-scheduler-service.ts`; `linkedin-connection-shell.ts` (#109) |
| F10 | Native and browser runtimes have different storage origins (`tauri://localhost` vs an HTTPS origin), so they never share data implicitly. The portable backup is the only interchange. | Origin model; F3, F4 |
| F11 | A runtime-independent defect existed: opening Calendar froze the page because of a self-triggering `MutationObserver` render loop in `credential-vault-status-shell.ts`. Static desktop tests could not detect it; a real browser run did. | Fixed in PR #113 |

Facts about browser platforms (background execution, storage durability, CORS, Store packaging) come from current first-party documentation. They are recorded with sources and confidence in [ADR-0010](../adr/0010-pwa-first-distribution-and-runtime-capabilities.md).

## Runtime capability inventory

Classification follows the real reason for each placement, not the current implementation language.

### Shared / runtime-neutral

These behave identically in every runtime because they are domain or application logic with no host dependency:

- Product Core: truth, claims, evidence, ICP, marketability assessment;
- Signals, Website Watch import, Event Intelligence import, Repository Growth, Video Production package authority;
- Campaigns / Studio, including discoverability strategy (#110 / PR #112);
- named-human approval (ADR-0005);
- publication inventory, publication policy, and the deterministic scheduler (#104, #105);
- outcomes, measurement, retrospectives, and learning ledger;
- the schema envelope, the portable backup format, quarantine;
- provider-connection *metadata* model (non-secret).

### Browser-capable (standard web APIs suffice)

- persistence (already browser storage; engine choice is decision D2);
- backup export and import (Blob download, file input);
- manual activation packages and every JSON export;
- media verification by hash (Web Crypto);
- offline operation (service worker shell cache, F6);
- installability (Web App Manifest plus service worker);
- app-open scheduling evaluation (the scheduler running while Viable is open);
- external links (a normal browser opens them in a new tab; the native allowlisted opener exists only because a webview is not a browser).

### Native-required (concrete reason)

| Capability | Why browsers cannot satisfy the product contract |
|---|---|
| OS credential vault | Browser JavaScript has no OS keychain API. Any browser-stored provider token is readable by script on the origin and persists in profile storage, which is weaker than the promise made by Slice C (#100/#106/#108). |
| LinkedIn connected publishing (#109) | It needs a stored long-lived member token (above). LinkedIn's self-service flow is server- or native-oriented: the standard authorization code flow requires a Client Secret, which must never ship in browser JavaScript, and PKCE is enabled per application. Native HTTPS also avoids browser CORS entirely. |
| Unattended or closed-app publication | No standard browser API runs a closed web app's code at an exact wall-clock time (see ADR-0010 sources). Native background execution is itself still undesigned (fog N3). |

### Unresolved (needs evidence before classification)

| ID | Question | Why it is not blocking now |
|---|---|---|
| O1 | ~~Does `api.linkedin.com` answer CORS preflights for browser origins?~~ **Resolved:** LinkedIn's official JavaScript client states that CORS blocks browser requests and supports Node.js servers only. A direct test from this environment was impossible because the egress proxy blocks LinkedIn. | Browser-direct LinkedIn publishing would need a relay, which is a hosted service (N2). LinkedIn connected publishing is native-only. |
| O2 | Microsoft Store path for the Tauri runtime. **Narrowed by evidence.** Tauri 2 produces only MSI/EXE. A Store "EXE or MSI app" submission must be Authenticode-signed by the developer with a CA-trusted certificate, and Microsoft signs only MSIX submissions. A cert-free Windows-native Store path therefore requires MSIX wrapping of the Tauri app, e.g. Microsoft's winapp CLI Tauri guide, which is unverified. | The PWA does not depend on it. The Win32 Store route does **not** remove the certificate dependency, so the only candidate is the MSIX route, and it needs a proof of concept. |
| O3 | Real-world browser storage eviction and quota for Viable-sized workspaces in Safari, Firefox, and Chromium, with and without installation and `navigator.storage.persist()`. | It informs D2's second step. It does not block shipping the PWA shell with durable-storage requests and backup guidance. |
| O4 | Production hosting origin and deployment provider (domain, CDN, header support, provenance attestations). | This needs Kevin's decision. The PWA can be built and validated in CI without a public deployment. |

## Decisions

| ID | Decision | State |
|---|---|---|
| D1 | The PWA is the primary mainstream cross-platform distribution. A public code-signing certificate is never a prerequisite. The native runtime is a capability extension. | **Resolved** by the owner on 2026-10-05; recorded as ADR-0010 |
| D2 | Browser persistence engine. Keep the working, versioned `localStorage` adapters for the first PWA slice, request durable storage, and surface quota and persistence state. Move authoritative stores to IndexedDB in a dedicated slice, which first makes `WorkspaceLifecycleService` asynchronous. | **Resolved for sequencing**. The engine move itself is earned work, not fog: F5 shows the ports already fit. |
| D3 | Provider credentials in the PWA. No provider secret is stored by browser JavaScript in this architecture. The PWA offers manual activation and full inventory and scheduling planning; connected publishing is a native capability. Any future browser provider path must pass the seven-question provider test in ADR-0010 per provider. | **Resolved** |
| D4 | Native distribution. Direct GitHub binaries are development or advanced artifacts, labeled honestly. A Microsoft Store **MSIX** package is the only candidate cert-free Windows-native mainstream path, pending an O2 proof of concept; the Store's MSI/EXE route still needs a developer certificate. macOS and Linux native packages are not planned for ordinary users. | **Resolved** for posture; O2 remains open |
| D5 | Background execution. The PWA never promises closed-app or exact-time publication. A native background design remains fog (N3), entered only after the native live proof establishes timing and restart requirements. | **Resolved** for truthfulness; design remains fog |
| D6 | Production deployment trust. HTTPS only, strict CSP and security headers, immutable build identity, source-to-deployment provenance, and a safe service-worker update lifecycle with rollback. No silent upload of local data. | Contract **resolved**; hosting choice depends on O4 |

## Blocking edges

```text
D1 ──► ADR-0010 ──► PWA runtime foundation (frontier)
                        │
                        ├─► IndexedDB persistence slice (needs: async lifecycle service; O3 informs quota UX)
                        ├─► Production deployment (needs: O4 hosting decision)
                        └─► Capability parity validation across browsers (needs: deployment or CI matrix)
D3 + F8 ──► #109 native LinkedIn proof keeps its role (native capability runtime)
D5 ──► native background design (fog N3; needs live native proof evidence)
O2 ──► Microsoft Store track (independent)
```

## Actionable frontier

These have no unresolved prerequisites:

1. **ADR-0010**: record D1 through D6.
2. **PR #113**: Calendar render-loop fix. This is a prerequisite for any honest "complete workflow in the browser" claim.
3. **PWA runtime foundation** (first implementation slice):
   - build a static PWA output from the existing web UI;
   - Web App Manifest and icons;
   - versioned service worker shell cache with explicit, user-confirmed updates and immutable build identity;
   - strict CSP aligned with the Tauri CSP;
   - a runtime capability model that reports truthfully which capabilities the current runtime has;
   - durable-storage request and storage status;
   - a real-browser smoke test in CI that drives a local-first workflow, including Calendar, and offline reload.
4. Reconcile issue #36: signing is no longer a mainstream release gate.

## Not yet specified (fog)

These are deliberately not implementation tickets yet:

- **N1** Interactive browser-side provider publishing, per provider. It depends on each provider's CORS and public-client OAuth support; LinkedIn is already excluded by O1.
- **N2** Hosted credential or relay services. Excluded by ADR-0001 unless a future ADR introduces a hosted profile (platform architecture §5.3).
- **N3** Native background or closed-app execution design (tray, autostart, OS scheduler), after the native live proof.
- **N4** Microsoft Store submission mechanics (after O2).
- **N5** Cross-runtime migration UX beyond the portable backup, such as guided native-to-PWA moves.
- **N6** Public product and documentation surfaces on the HTTPS origin for discoverability (#110). The application's private state must never be indexable.

## Slice D (#107 / PR #109) classification

From code inspection of `feature/linkedin-member-proof-slice-d` at `8b44863`:

| Component | Location | Classification |
|---|---|---|
| `PublicationProviderPort` | `src/activation-learning/ports/publication-provider.ts` | shared |
| Scheduler, attempt ledger, outcome semantics (`published`, `retryable_failure`, `terminal_failure`, `outcome_unknown`), interrupted-execution reconciliation | `publication-scheduler-service.ts` | shared |
| Idempotency, bounded retry, never blind-retry ambiguity | scheduler + adapter mapping | shared |
| Provider connection metadata (`LinkedInMemberConnectionRecord`) and store port | `domain/provider-connection.ts`, `ports/provider-connection-store.ts` | shared (non-secret) |
| `LinkedInMemberPublicationProvider` (adapter semantics: 201 + `X-RestLi-Id`, 401/403 reconnect, 429, `not_dispatched`) | `adapters/linkedin-member-publication-provider.ts` | shared provider adapter over a native transport port |
| `LinkedInNativeProviderPort` | `ports/linkedin-native-provider.ts` | shared port; native implementation |
| LinkedIn-only fail-closed frontier guard | `services/linkedin-automation-frontier.ts` | shared |
| OS credential vault | `src-tauri/src/credential_*`, `native_credential_store.rs` | native |
| LinkedIn HTTPS transport (OIDC userinfo, ugcPosts, blocking pool, no redirects) | `src-tauri/src/linkedin_provider.rs` | native |
| Allowlisted system-browser opener | `src-tauri/src/external_links.rs` | native-specific. A browser runtime opens links natively. |
| Token Generator setup UI | `apps/desktop/ui/linkedin-connection-shell.ts` | runtime-specific. It must show "requires the Viable desktop runtime" in the PWA, which it already does because it is gated on vault capability. |
| **Run automation now** | same shell | shared UI action. In the PWA it can evaluate and schedule, but publishes only through a provider the runtime actually has. |
| Background publication | none | unresolved (N3) |
| Manual activation fallback | Calendar / Activation | shared |

**Conclusion for #109.** The new architecture retains a native capability runtime, and connected LinkedIn publishing is classified as native. The #109 proof is therefore still valid and still the right first connected-provider proof. No correction to #109 is required by this architecture. Its live dogfood step stays paused only until ADR-0010 is accepted.

## Credential handling rule for the eventual live proof

When the native live proof proceeds:

- Kevin enters the LinkedIn token **directly into Viable's LinkedIn connection UI** in the native runtime.
- The token never goes into Claude, a prompt, chat, GitHub, an issue, a secret store, terminal history, `.env`, source, fixtures, or logs.
- The native boundary validates it through OIDC and stores it only in the OS credential vault.
- Afterwards, only non-secret state is inspected: connection metadata, member URN, job and attempt records, and the provider post ID.
