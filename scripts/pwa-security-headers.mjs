// Single source of truth for the PWA's HTTP security headers (ADR-0010).
// scripts/build-pwa.mjs writes them to `_headers` for static hosts, and
// scripts/pwa-smoke.mjs serves them so CI exercises the real policy.

// At least as strict as the Tauri CSP. Additions, each with a concrete need:
// - connect-src https://api.github.com: unauthenticated public repository reads
//   (Signals import, Repository Growth collection);
// - img-src/media-src blob:: local media review previews created with
//   URL.createObjectURL (files never leave the device);
// - worker-src/manifest-src 'self': the service worker and web manifest.
export const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self' data: blob:",
  "media-src 'self' blob:",
  "connect-src 'self' https://api.github.com",
  "worker-src 'self'",
  "manifest-src 'self'",
  "font-src 'self'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
].join("; ");

export const SECURITY_HEADERS = Object.freeze({
  "Content-Security-Policy": CONTENT_SECURITY_POLICY,
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "no-referrer",
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Resource-Policy": "same-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=(), bluetooth=(), interest-cohort=()",
  "X-Robots-Tag": "noindex, nofollow",
});

// Application shell files are not content-hashed; revalidate them so a new
// deployment is noticed. The service worker handles offline use.
export const CACHE_HEADERS = Object.freeze({
  "/sw.js": "no-cache",
  "/*": "no-cache",
});
