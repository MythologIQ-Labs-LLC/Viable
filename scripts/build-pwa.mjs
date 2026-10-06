// Builds the static, local-first PWA from the existing desktop web UI
// (ADR-0010). Run after `npm run desktop:web`.
//
// Output (dist-pwa/):
// - the application shell: index.html (with manifest, CSP, and PWA runtime
//   injected), stylesheets, and compiled JavaScript (no .d.ts or source maps);
// - manifest.webmanifest and icons;
// - build-info.json: immutable build identity (content hash, version, commit);
// - build-manifest.json: SHA-256 of every shipped file, for provenance;
// - sw.js: versioned service worker precaching exactly these files;
// - _headers: HTTP security and cache headers for static hosts.
//
// The build is deterministic for a given source tree: no timestamps.

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { copyFile, mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve, sep } from "node:path";
import { CACHE_HEADERS, CONTENT_SECURITY_POLICY, SECURITY_HEADERS } from "./pwa-security-headers.mjs";

const root = process.cwd();
const web = resolve(root, "apps/desktop/web");
const pwaSource = resolve(root, "apps/desktop/pwa");
const out = resolve(root, process.env.VIABLE_PWA_OUT ?? "dist-pwa");

const posix = (path) => path.split(sep).join("/");
const sha256 = (data) => createHash("sha256").update(data).digest("hex");

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(full));
    else files.push(full);
  }
  return files;
}

async function copyInto(source, target) {
  await mkdir(dirname(target), { recursive: true });
  await copyFile(source, target);
}

function sourceCommit() {
  if (process.env.GITHUB_SHA) return process.env.GITHUB_SHA;
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim();
  } catch {
    return "unknown";
  }
}

// CSP delivered by <meta> cannot carry frame-ancestors or
// upgrade-insecure-requests (browsers ignore and warn); the HTTP header does.
function metaPolicy() {
  return CONTENT_SECURITY_POLICY.split("; ")
    .filter((directive) => !directive.startsWith("frame-ancestors") && directive !== "upgrade-insecure-requests")
    .join("; ");
}

function transformIndex(html) {
  const head = [
    `    <meta http-equiv="Content-Security-Policy" content="${metaPolicy()}" />`,
    `    <meta name="theme-color" content="#090d12" />`,
    `    <meta name="robots" content="noindex, nofollow" />`,
    `    <link rel="manifest" href="manifest.webmanifest" />`,
    `    <link rel="icon" type="image/png" sizes="32x32" href="icons/favicon-32.png" />`,
    `    <link rel="apple-touch-icon" href="icons/apple-touch-icon.png" />`,
    `    <link rel="stylesheet" href="pwa.css" />`,
  ].join("\n");
  if (!html.includes("<meta charset=\"UTF-8\" />")) throw new Error("index.html charset anchor not found");
  if (!html.includes("</body>")) throw new Error("index.html body anchor not found");
  return html
    .replace("<meta charset=\"UTF-8\" />", `<meta charset="UTF-8" />\n${head}`)
    .replace("</body>", `    <script type="module" src="generated/apps/desktop/ui/pwa-runtime.js"></script>\n  </body>`)
    .replace("Reading Product Core state from this desktop profile.", "Reading Product Core state stored on this device.");
}

async function main() {
  try {
    await stat(join(web, "generated/apps/desktop/ui/bootstrap.js"));
  } catch {
    throw new Error("Compiled web UI not found. Run `npm run desktop:web` first.");
  }
  await rm(out, { recursive: true, force: true });
  await mkdir(out, { recursive: true });

  for (const file of await walk(web)) {
    const path = posix(relative(web, file));
    if (path === "index.html") continue;
    if (path.endsWith(".d.ts") || path.endsWith(".map")) continue;
    await copyInto(file, join(out, path));
  }
  await writeFile(join(out, "index.html"), transformIndex(await readFile(join(web, "index.html"), "utf8")));
  await copyInto(join(pwaSource, "pwa.css"), join(out, "pwa.css"));
  for (const icon of await walk(join(pwaSource, "icons"))) {
    await copyInto(icon, join(out, "icons", posix(relative(join(pwaSource, "icons"), icon))));
  }

  const pkg = JSON.parse(await readFile(join(root, "package.json"), "utf8"));
  const manifest = {
    id: "./",
    name: "Viable",
    short_name: "Viable",
    description: "Local-first marketability operating system. Your workspace stays on this device.",
    start_url: "./",
    scope: "./",
    display: "standalone",
    background_color: "#090d12",
    theme_color: "#090d12",
    icons: [
      { src: "icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
  await writeFile(join(out, "manifest.webmanifest"), `${JSON.stringify(manifest, null, 2)}\n`);

  // Identity is derived from the exact shipped shell, so any change to code,
  // markup, styles, icons, or manifest produces a new build and a new cache.
  const shellFiles = (await walk(out)).map((file) => posix(relative(out, file))).sort();
  const hashes = {};
  for (const path of shellFiles) hashes[path] = sha256(await readFile(join(out, path)));
  const buildId = sha256(shellFiles.map((path) => `${path}\0${hashes[path]}`).join("\n"));

  const buildInfo = { format: "viable.pwa-build", version: pkg.version, buildId, commit: sourceCommit() };
  await writeFile(join(out, "build-info.json"), `${JSON.stringify(buildInfo, null, 2)}\n`);
  await writeFile(join(out, "build-manifest.json"), `${JSON.stringify({ ...buildInfo, files: hashes }, null, 2)}\n`);

  // build-manifest.json is provenance for auditors, not part of the running shell.
  const precache = [...shellFiles.filter((path) => path !== "build-manifest.json"), "build-info.json"];
  const template = await readFile(join(pwaSource, "sw.template.js"), "utf8");
  if (!template.includes("__VIABLE_BUILD_ID__") || !template.includes("__VIABLE_PRECACHE__")) throw new Error("service worker template placeholders missing");
  await writeFile(join(out, "sw.js"), template
    .replace("__VIABLE_BUILD_ID__", buildId)
    .replace("__VIABLE_PRECACHE__", JSON.stringify(precache)));

  const headerLines = ["/*", ...Object.entries(SECURITY_HEADERS).map(([name, value]) => `  ${name}: ${value}`)];
  for (const [path, value] of Object.entries(CACHE_HEADERS)) headerLines.push(path, `  Cache-Control: ${value}`);
  await writeFile(join(out, "_headers"), `${headerLines.join("\n")}\n`);

  console.log(`Built Viable PWA ${pkg.version} (${buildId.slice(0, 12)}) with ${precache.length} precached files into ${posix(relative(root, out))}/`);
}

await main();
