# Viable in the Browser (PWA)

## Status

This guide describes the PWA runtime foundation (#114, ADR-0010).

A production HTTPS deployment has **not** been chosen yet. That decision is #114 O4. Until then, the PWA is built and validated in CI and can be served locally.

## What it is

The browser runtime is the same Viable product, delivered as an installable Progressive Web App:

- Your workspace stays **on this device**, in the browser's IndexedDB storage for the Viable origin. Every save is one atomic transaction, so a change is either fully saved or not saved at all. Nothing is uploaded, and there is no Viable account.
- The full marketability loop works. That covers Product Truth, ICP, signals, campaigns, discoverability, content, approval, publication inventory and scheduling, manual activation, outcomes, measurement, and learning.
- It works offline once loaded. The only exception is public GitHub repository reads.

## What differs from the desktop runtime, and why

Open **Workspace**. The **Runtime** panel lists every capability, its state, and the concrete reason for any difference.

| Capability | Browser | Why |
|---|---|---|
| Operating-system credential vault | Not available | Browsers have no keychain API. Viable never stores provider secrets in browser storage. |
| Connected LinkedIn publishing | Not available | LinkedIn blocks browser requests and needs credentials browsers cannot hold safely. Manual activation remains available. |
| Publishing while Viable is closed | Not available in any runtime yet | No browser standard runs a closed web app at an exact time. |

## Keep your data safe

Browsers can clear site data under storage pressure or after long inactivity, unless the site has persistent storage.

- In **Workspace → Runtime**, select **Ask the browser to keep Viable data**. The panel shows whether persistent storage was granted and how much space is in use.
- Installing Viable (browser menu → *Install* or *Add to Dock*) and using it regularly also helps.
- **Back up regularly.** Use **Workspace → Backup** to download a `viable.workspace-backup` file. The same file restores into the browser or the desktop runtime. It is the only way data moves between them, because each runtime has its own separate storage.

### Storage engine and upgrades

- **Existing data:** if you used Viable before IndexedDB storage, your existing data is copied into IndexedDB the first time the new version opens. The Runtime panel reports how many records were copied. The original copy is left untouched.
- **IndexedDB unavailable, never migrated:** if IndexedDB cannot be used in a browser that has never migrated, Viable keeps using the older, smaller browser storage. The Runtime panel shows this.
- **IndexedDB unavailable after migration:** if IndexedDB cannot be opened after your data was migrated, Viable shows a warning. It never falls back to the outdated copy, so nothing is lost or silently diverges. Close other Viable windows and reload.
- **Other open tabs:** changes made in one Viable tab appear in other open tabs without reloading.

## Updates

A new version never replaces the running app silently.

1. Viable shows **A new version of Viable is ready**.
2. You choose **Update now** or **Later**.
3. Choosing **Update now** reloads Viable into the new build. Your local data is kept.

The Runtime panel shows the running build identity (version, content hash, source commit).

## Build and run locally (developers)

```bash
npm ci
npm run pwa:build      # writes dist-pwa/
npm run pwa:smoke      # real-browser validation (needs Chrome/Chromium; set CHROME_PATH if needed)
```

`dist-pwa/` contains:
- `_headers`: the HTTP security headers for static hosts;
- `build-info.json`: the build identity;
- `build-manifest.json`: SHA-256 hashes of every file, for provenance.

Serve the directory over HTTPS, or `http://localhost`, which browsers also treat as secure.

## Related documentation

- [ADR-0010: PWA-first distribution and capability-driven native runtime](../adr/0010-pwa-first-distribution-and-runtime-capabilities.md)
- [PWA runtime planning review](../reviews/pwa-runtime-roadmap-review-2026-10-05.md)
- LinkedIn member publishing in the desktop runtime: PR #109.
