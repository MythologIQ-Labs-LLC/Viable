import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

// Shell load order lives in the single desktop entry module.
const entry = await readFile("apps/desktop/ui/entry.ts", "utf8");

const read = (path: string) => readFile(new URL(`../../${path}`, import.meta.url), "utf8");

test("PWA security headers keep a strict CSP with only justified additions", async () => {
  const headers = await read("scripts/pwa-security-headers.mjs");
  assert.match(headers, /"default-src 'self'"/);
  assert.match(headers, /"script-src 'self'"/);
  assert.match(headers, /"style-src 'self'"/);
  assert.match(headers, /"object-src 'none'"/);
  assert.match(headers, /"frame-ancestors 'none'"/);
  assert.match(headers, /"connect-src 'self' https:\/\/api\.github\.com"/);
  assert.doesNotMatch(headers, /unsafe-inline|unsafe-eval|\*\./);
  assert.match(headers, /"X-Robots-Tag": "noindex, nofollow"/);
});

test("service worker never swaps code under a running session and never touches workspace data", async () => {
  const sw = await read("apps/desktop/pwa/sw.template.js");
  // skipWaiting only in response to the person's explicit update confirmation.
  assert.equal(sw.match(/skipWaiting\(\)/g)?.length, 1);
  assert.match(sw, /VIABLE_ACTIVATE_UPDATE"\) self\.skipWaiting\(\)/);
  assert.match(sw, /viable-shell-\$\{BUILD_ID\}/);
  assert.match(sw, /if \(request\.method !== "GET"\) return;/);
  assert.match(sw, /if \(url\.origin !== self\.location\.origin\) return;/);
  assert.doesNotMatch(sw, /localStorage|indexedDB|postMessage\(.*workspace/i);
  const runtime = await read("apps/desktop/ui/pwa-runtime.ts");
  assert.match(runtime, /data-pwa-action="update"/);
  assert.doesNotMatch(runtime, /skipWaiting/);
});

test("PWA build derives immutable build identity from shipped content and keeps the desktop shell untouched", async () => {
  const build = await read("scripts/build-pwa.mjs");
  assert.match(build, /const buildId = sha256\(/);
  assert.match(build, /build-manifest\.json/);
  assert.doesNotMatch(build, /new Date\(|Date\.now\(/, "builds must be deterministic");
  const desktopIndex = await read("apps/desktop/web/index.html");
  assert.doesNotMatch(desktopIndex, /pwa-runtime\.js|manifest\.webmanifest/, "the desktop runtime never registers a service worker");
  assert.match(entry, /runtime-capabilities-shell\.js/);
});

test("every workspace store persists through the shared durable storage and awaits the commit", async () => {
  const stores = [
    "activation-learning", "campaign-workspace", "product-workspace", "repository-growth",
    "signals-inbox", "video-production", "website-watch",
  ];
  for (const name of stores) {
    const source = await read(`apps/desktop/ui/local-storage-${name}-store.ts`);
    assert.doesNotMatch(source, /\blocalStorage\b/, `${name} store must not bypass workspace storage`);
    assert.match(source, /workspaceStorage/, name);
    assert.match(source, /await workspaceStorage\.commit\(\);/, `${name} save must resolve only after a durable commit`);
  }
  const lifecycle = await read("apps/desktop/ui/workspace-lifecycle-shell.ts");
  assert.doesNotMatch(lifecycle, /\blocalStorage\b/);
  assert.match(lifecycle, /new WorkspaceLifecycleService\(workspaceStorage\)/);
  const storage = await read("apps/desktop/ui/workspace-storage.ts");
  assert.match(storage, /durability: "strict"/);
  assert.doesNotMatch(storage, /ENGINE_MARKER|markerSet/, "IndexedDB authority must not depend on a best-effort localStorage marker");
  assert.match(
    storage,
    /catch \(error\)[\s\S]*showUnavailableBanner\(reason\)[\s\S]*engine: "unavailable"/,
    "any IndexedDB open failure must fail closed rather than read a possibly stale localStorage copy",
  );
  assert.equal(
    storage.match(/storage: liveLocalStorage/g)?.length,
    1,
    "localStorage fallback is allowed only when IndexedDB is not exposed by the runtime",
  );
  assert.match(storage, /await withinLoadTimeout\(DurableKeyValueStorage\.open\(/, "loading saved data is bounded so startup can never hang");
});

test("workspace deletion purges the legacy localStorage copy only after the IndexedDB deletion is durable", async () => {
  const lifecycle = await read("apps/desktop/ui/workspace-lifecycle-shell.ts");
  assert.match(
    lifecycle,
    /lifecycle\.deleteWorkspace\(workspaceId, \{ recoveryPoint \}\);\s*await workspaceStorage\.commit\(\);[\s\S]*?purgeLegacyWorkspaceRecords\(workspaceScopedKeys\(workspaceId\), \{ key: PRODUCT_ACTIVE_KEY, value: workspaceId \}\);[\s\S]*?announce\("Product-wide local workspace deletion completed"\)/,
    "the legacy copy must be purged after the commit and before deletion is announced",
  );
  const storage = await read("apps/desktop/ui/workspace-storage.ts");
  assert.match(
    storage,
    /export function purgeLegacyWorkspaceRecords[\s\S]*?if \(opened\.status\.engine !== "indexeddb"[\s\S]*?return 0;/,
    "the purge runs only when IndexedDB is the authority; otherwise localStorage is the authority or nothing was deleted",
  );
});
