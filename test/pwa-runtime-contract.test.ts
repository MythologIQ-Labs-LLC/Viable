import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

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
  assert.match(desktopIndex, /runtime-capabilities-shell\.js/);
});
