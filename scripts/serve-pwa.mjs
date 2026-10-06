// Canonical pre-demand self-host server for the Viable PWA (ADR-0010).
//
// This is intentionally a tiny static server, not an application backend.
// It serves the already-built local-first PWA at one stable loopback origin so
// IndexedDB and service-worker state do not appear to disappear because a
// development server silently selected another port.

import { createServer } from "node:http";
import { access, readFile } from "node:fs/promises";
import { extname, join, normalize, resolve, sep } from "node:path";
import { SECURITY_HEADERS } from "./pwa-security-headers.mjs";

const HOST = "localhost";
const PORT = 4175;
const ORIGIN = `http://${HOST}:${PORT}`;
const ROOT = resolve(process.cwd(), process.env.VIABLE_PWA_OUT ?? "dist-pwa");

const TYPES = Object.freeze({
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".wasm": "application/wasm",
});

function localHeaders(file) {
  const headers = {
    ...SECURITY_HEADERS,
    "Content-Type": TYPES[extname(file)] ?? "application/octet-stream",
    "Cache-Control": "no-cache",
  };
  // HSTS and upgrade-insecure-requests are production HTTPS controls. Loopback
  // HTTP is a secure-context exception for local development/testing.
  headers["Content-Security-Policy"] = headers["Content-Security-Policy"].replace("; upgrade-insecure-requests", "");
  delete headers["Strict-Transport-Security"];
  return headers;
}

function resolveRequestPath(requestUrl) {
  const url = new URL(requestUrl ?? "/", ORIGIN);
  const pathname = url.pathname === "/" ? "/index.html" : url.pathname;
  const normalized = normalize(decodeURIComponent(pathname));
  const file = join(ROOT, normalized);
  if (!file.startsWith(ROOT + sep)) return null;
  return file;
}

async function main() {
  try {
    await access(join(ROOT, "index.html"));
  } catch {
    console.error("Viable PWA build not found. Run `npm run pwa:build` first.");
    process.exitCode = 1;
    return;
  }

  const server = createServer(async (request, response) => {
    let file;
    try {
      file = resolveRequestPath(request.url);
    } catch {
      response.writeHead(400).end("Bad request");
      return;
    }

    if (!file) {
      response.writeHead(403).end("Forbidden");
      return;
    }

    try {
      const body = await readFile(file);
      response.writeHead(200, localHeaders(file)).end(body);
    } catch (error) {
      if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
        response.writeHead(404).end("Not found");
        return;
      }
      console.error(error);
      response.writeHead(500).end("Local server error");
    }
  });

  server.on("error", (error) => {
    if (error && typeof error === "object" && "code" in error && error.code === "EADDRINUSE") {
      console.error(`Viable's canonical localhost origin ${ORIGIN} is already in use. Stop the process using port ${PORT}; Viable will not silently move to another origin.`);
      process.exitCode = 1;
      return;
    }
    throw error;
  });

  server.listen(PORT, HOST, () => {
    console.log(`Viable is available at ${ORIGIN}`);
    console.log("Keep this hostname and port stable for persisted local test profiles. Press Ctrl+C to stop.");
  });

  const stop = () => server.close(() => process.exit(0));
  process.once("SIGINT", stop);
  process.once("SIGTERM", stop);
}

await main();
