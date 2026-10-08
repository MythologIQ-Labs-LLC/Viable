# Support, recovery, and known limitations

Last reviewed: 2026-10-07

Viable is pre-release software. This page defines the current dogfood support boundary and recovery paths. It does not claim that Viable is a supported public end-user release.

## Current support boundary

| Runtime | Current status |
| --- | --- |
| Chromium desktop PWA at `http://localhost:4175` | **Supported for persistent local dogfood.** The production PWA build, IndexedDB authority, backup/restore/deletion, offline shell, user-confirmed update flow, migration, and fail-closed storage behavior are exercised by the repository's real-browser validation. |
| Firefox PWA | **Experimental.** #124 established a working Firefox path, but the first post-#137 main run exposed a smoke-harness database-deletion race. #139 is the active harness correction. No human Firefox dogfood acceptance has been recorded. |
| WebKit / Safari PWA | **Experimental; Safari support is not claimed.** Linux Playwright WebKit still has an undiagnosed renderer crash on a reload after replace-current restore. No real Safari acceptance run has been completed. |
| Native Tauri runtime | **Capability runtime, not the primary dogfood path.** CI builds and packages the Linux desktop runtime. It is required for the operating-system credential vault and connected LinkedIn publishing. Packaged install/upgrade/uninstall behavior has not been hands-on accepted as a supported distribution channel. |

No production browser or operating-system minimum-version table is declared yet. The #36 supported-platform gate remains open until actual supported environments, including any adopted native channel, have enough test and human evidence to justify minimum versions.

## Runtime capability matrix

| Capability | Browser PWA | Native Tauri |
| --- | --- | --- |
| Product truth, ICP, Signals, Campaigns, Studio, Repository Growth, Website Watch, Calendar, measurement, and learning | Available | Available |
| Publication inventory, deterministic policy, and scheduler evaluation while Viable is open | Available | Available |
| Manual activation and export | Available | Available |
| Portable workspace backup, restore, recovery points, quarantine, and deletion | Available | Available through the same web application/storage contract |
| Offline application shell | Available after the service worker controls the build; public GitHub reads still need a network connection | Available locally; public GitHub reads still need a network connection |
| Durable workspace storage | IndexedDB, with persistence state shown in Workspace → Runtime | IndexedDB in the desktop webview |
| Operating-system credential vault | Unavailable by design | Available when the platform vault is available |
| Connected LinkedIn member publishing | Unavailable by design; manual activation remains available | Implemented and exact-head validated; the developer-owned live publication proof in #107 remains open |
| Publishing while Viable is closed or guaranteed exact-time background execution | Unavailable | Not implemented |

The Workspace → Runtime panel is the in-application authority for the capabilities observed in the current session.

## Recovery paths

### Saved workspace data will not open

If Viable fails closed because stored workspace data is unreadable, choose **Open workspace recovery**. Recovery mode loads only the Workspace surface. It does not mutate the data merely by opening.

From recovery mode:

1. export quarantine data when unreadable records exist;
2. restore a validated backup, or deliberately delete the workspace;
3. satisfy the same recovery-point and confirmation requirements used during normal operation;
4. reload Viable after the recovery action succeeds.

### Corrupt or newer-version workspace data

Normal backup is blocked rather than pretending unreadable data is safe. Export the quarantine package first. Replace-current restore and deletion cannot overwrite the only raw copy until the required quarantine export has been made in the current recovery session.

### Browser storage was cleared or evicted

Viable has no hosted copy to restore from. A browser that clears the origin starts Viable as an empty profile. Restore a `viable.workspace-backup` or recovery-point file you control.

The runtime panel shows whether the browser granted persistent storage and provides the request control when available. Real storage-pressure eviction cannot be forced deterministically in every engine, so backups remain necessary even when persistence is granted.

### Before deleting or replacing a workspace

Viable requires an explicit recovery-point decision:

- download a recovery point representing exactly the current workspace state; or
- deliberately continue without one.

A downloaded recovery point is fingerprinted and refused as stale if the workspace changes before the destructive action.

Connected providers must also be disconnected before replace-current restore or workspace deletion. Portable backups never recreate machine-local account authority.

### LinkedIn connection stopped working

Reconnect through Calendar → Publication inventory. Revoked or expired authority becomes reconnect-required rather than blind retry. Use **Disconnect** to remove the operating-system vault credential and local connection metadata together.

An ambiguous publish result is not automatically retried because doing so could duplicate a post.

### Application update

PWA updates require explicit confirmation. The service worker updates application code and cache, not IndexedDB workspace data. Other open tabs are not silently forced to reload.

Before unusual update, storage, or browser experiments, export a workspace backup.

## Support diagnostics

Workspace → Runtime → **Download support diagnostics** creates `viable.support-diagnostics` v1 locally. The report contains build/runtime/storage/capability facts and the browser/webview user-agent only.

It does not contain workspace IDs or content, provider account metadata, credential references, secrets, prompts, logs, raw failure text, backups, quarantine data, or recovery-point contents. See [Support diagnostics](support-diagnostics.md) for the exact boundary.

Downloading a support report does not upload it and is not consent to share it.

## Known limitations

- Viable is not a supported public end-user release.
- A public HTTPS production origin has not been selected because ordinary external distribution has not yet been justified.
- Browser storage is origin-bound. The canonical dogfood origin is exactly `http://localhost:4175`. CI now proves migration between two distinct local origins using only `viable.workspace-backup`: the second origin begins empty, restore makes its own IndexedDB copy, and the first origin remains independent. A real public HTTPS host is still deferred and must repeat this contract when one is selected.
- Firefox remains experimental pending the #139 harness correction and fresh main evidence.
- Linux Playwright WebKit has an undiagnosed restore/reload crash; real Safari has not been accepted.
- Real browser/operating-system storage-pressure eviction and hard quota exhaustion cannot be induced deterministically in every test engine. #137 proves the application behavior with simulated eviction/refused writes and reports actual persistence/quota observations.
- Native packaged install, upgrade, uninstall, and retained-data behavior are not yet an accepted distribution contract.
- LinkedIn member publishing is implemented but is not live-proven until #107 records the developer-owned real publication and clean-install guidance acceptance.
- Closed-app or exact-time publication is not implemented.
- Hands-on keyboard-only, screen-reader, 200% zoom, non-color comprehension, and unfamiliar-user acceptance remain open under #79/#81.
- Public deployment provenance, rollback, interrupted-update handling, and public-origin no-data-transmission evidence remain release-foundation work.

## Reporting a problem

For an ordinary reproducible product problem, record:

- the action you were attempting;
- the expected and observed result;
- the build identity shown in Workspace → Runtime;
- the runtime/browser in use;
- whether the problem survives a normal reload;
- a content-free support diagnostics file when those environment facts are useful.

Do not post access tokens, credentials, private workspace contents, backups, quarantine packages, or recovery-point files into a public issue merely because a support request asks for evidence.

For a suspected vulnerability or exposed credential/data path, follow the private intake and patch-handling policy in [`SECURITY.md`](../../SECURITY.md) instead of opening a public issue with sensitive details.

## What changes this support boundary

A capability becomes supported because evidence exists, not because its code merged. Changes to the boundary require the relevant automated validation plus any hands-on acceptance named by the governing issue. Current implementation state, human acceptance, live external proof, and supported release status remain separate claims.
