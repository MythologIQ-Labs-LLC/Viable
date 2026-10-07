import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path: string) => readFile(new URL(`../../${path}`, import.meta.url), "utf8");

function directives(policy: string): Map<string, string[]> {
  return new Map(policy.split(";").map((part) => part.trim().split(/\s+/)).filter((parts) => parts[0]).map(([name, ...values]) => [name!, values]));
}

// Issue #114 O5. Measured in the native WebKitGTK webview: without connect-src
// the policy fell back to default-src 'self' and blocked the public GitHub
// reads used by Signals and Repository Growth, and without media-src it blocked
// the blob: URLs Studio media review plays from local files.
test("native Tauri CSP allows exactly the network and media sources the UI uses", async () => {
  const config = JSON.parse(await read("apps/desktop/src-tauri/tauri.conf.json")) as { app: { security: { csp: string } } };
  const native = directives(config.app.security.csp);
  assert.deepEqual(native.get("default-src"), ["'self'"]);
  assert.deepEqual(native.get("script-src"), ["'self'"]);
  assert.deepEqual(native.get("style-src"), ["'self'"]);
  assert.deepEqual(native.get("img-src"), ["'self'", "data:"]);
  assert.deepEqual(native.get("media-src"), ["'self'", "blob:"], "local media review previews only");
  // ipc: / http://ipc.localhost are Tauri's own IPC transport (Linux/macOS and
  // Windows); api.github.com is the only external origin.
  assert.deepEqual(native.get("connect-src"), ["'self'", "ipc:", "http://ipc.localhost", "https://api.github.com"]);
  assert.doesNotMatch(config.app.security.csp, /unsafe-inline|unsafe-eval|\*|https:(?!\/\/)|http:(?!\/\/ipc\.localhost)/);
});

test("the native and PWA policies allow the same single external network origin", async () => {
  const { CONTENT_SECURITY_POLICY } = await import(new URL("../../scripts/pwa-security-headers.mjs", import.meta.url).href) as { CONTENT_SECURITY_POLICY: string };
  const pwa = directives(CONTENT_SECURITY_POLICY);
  const config = JSON.parse(await read("apps/desktop/src-tauri/tauri.conf.json")) as { app: { security: { csp: string } } };
  const native = directives(config.app.security.csp);
  const external = (values: string[] | undefined) => (values ?? []).filter((value) => value.startsWith("https://"));
  assert.deepEqual(external(native.get("connect-src")), external(pwa.get("connect-src")));
  for (const adapter of ["src/signals/adapters/github-public-repository-source.ts", "src/repository-growth/adapters/github-public-repository-growth-source.ts"]) {
    assert.match(await read(adapter), /https:\/\/api\.github\.com\/repos\//, `${adapter} reads only the allowlisted origin`);
  }
});
