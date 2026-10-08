// Proves the explicit migration contract between two distinct PWA origins.
//
// Browser storage and service workers are origin-bound. This check serves the
// exact same production PWA build on two localhost ports, restores a known
// workspace on origin A, exports Viable's own portable backup, proves origin B
// starts empty, restores that downloaded backup on B, and finally proves both
// origins retain independent durable copies.
//
// Port 4176 is a test-only stand-in for "a different future origin". This does
// not claim a public HTTPS deployment exists or has been accepted.

import { createServer } from "node:http";
import { access, readFile, rm, writeFile } from "node:fs/promises";
import { extname, join, normalize, resolve, sep } from "node:path";
import { chromium } from "playwright-core";
import { SECURITY_HEADERS } from "./pwa-security-headers.mjs";

const root = process.cwd();
const sourceDir = resolve(root, process.env.VIABLE_PWA_OUT ?? "dist-pwa");
const SOURCE_PORT = 4175;
const DESTINATION_PORT = 4176;
const HOST = "localhost";
const SOURCE_ORIGIN = `http://${HOST}:${SOURCE_PORT}`;
const DESTINATION_ORIGIN = `http://${HOST}:${DESTINATION_PORT}`;
const seedPath = resolve(root, "docs/acceptance/seed/ux-acceptance-seed-v2.json");
const migratedBackupPath = resolve(root, "pwa-origin-migration-backup.json");
const reportPath = resolve(root, "pwa-origin-migration-report.json");
const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".webmanifest": "application/manifest+json",
  ".png": "image/png",
};

const checks = [];
const failures = [];
function check(condition, message) {
  const ok = Boolean(condition);
  checks.push({ check: message, ok });
  if (!ok) failures.push(message);
  console.log(`${ok ? "ok  " : "FAIL"} ${message}`);
}

async function browserPath() {
  const candidates = [
    process.env.CHROME_PATH,
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
  ].filter(Boolean);
  for (const candidate of candidates) {
    try {
      await access(candidate);
      return candidate;
    } catch {
      // Try the next installed browser.
    }
  }
  throw new Error("No Chrome/Chromium found. Set CHROME_PATH.");
}

function startServer(port) {
  const server = createServer(async (request, response) => {
    const url = new URL(request.url ?? "/", `http://${HOST}:${port}`);
    const requested = normalize(decodeURIComponent(url.pathname === "/" ? "index.html" : url.pathname.replace(/^\/+/, "")));
    const file = join(sourceDir, requested);
    if (file !== sourceDir && !file.startsWith(sourceDir + sep)) {
      response.writeHead(403).end();
      return;
    }
    try {
      const body = await readFile(file);
      const headers = {
        ...SECURITY_HEADERS,
        "Content-Type": TYPES[extname(file)] ?? "application/octet-stream",
        "Cache-Control": "no-cache",
      };
      // These production HTTPS directives are meaningless on localhost.
      headers["Content-Security-Policy"] = headers["Content-Security-Policy"].replace("; upgrade-insecure-requests", "");
      delete headers["Strict-Transport-Security"];
      response.writeHead(200, headers).end(body);
    } catch {
      response.writeHead(404).end();
    }
  });
  return new Promise((resolveServer, rejectServer) => {
    server.once("error", rejectServer);
    server.listen(port, HOST, () => {
      server.removeListener("error", rejectServer);
      resolveServer(server);
    });
  });
}

function closeServer(server) {
  return new Promise((resolveClose) => server.close(() => resolveClose()));
}

async function waitForApp(page) {
  await page.waitForFunction(() => document.querySelectorAll("nav button[data-nav]").length > 0, undefined, { timeout: 15_000 });
}

async function openWorkspace(page) {
  await page.click('nav button[data-nav="workspace"]', { noWaitAfter: true });
  await page.waitForSelector("[data-workspace-import]", { timeout: 10_000 });
}

async function indexedDbKeys(page) {
  return page.evaluate(() => new Promise((resolveKeys, rejectKeys) => {
    const open = indexedDB.open("viable-workspace");
    open.onerror = () => rejectKeys(open.error);
    open.onsuccess = () => {
      const db = open.result;
      if (!db.objectStoreNames.contains("kv")) {
        db.close();
        resolveKeys([]);
        return;
      }
      const request = db.transaction("kv", "readonly").objectStore("kv").getAllKeys();
      request.onsuccess = () => {
        const keys = request.result.filter((key) => typeof key === "string");
        db.close();
        resolveKeys(keys);
      };
      request.onerror = () => {
        db.close();
        rejectKeys(request.error);
      };
    };
  }));
}

function productKey(keys, workspaceId) {
  return keys.find((key) => key === `viable.product-workspace.${workspaceId}`);
}

async function main() {
  const buildInfo = JSON.parse(await readFile(join(sourceDir, "build-info.json"), "utf8"));
  const seed = JSON.parse(await readFile(seedPath, "utf8"));
  const workspaceId = seed.workspaceId;
  const productName = seed.contexts?.product?.product?.identity?.name;
  if (seed.format !== "viable.workspace-backup" || !workspaceId || !productName) {
    throw new Error("Acceptance seed is not a usable Viable workspace backup");
  }

  let sourceServer;
  let destinationServer;
  let browser;
  let context;
  const runtimeErrors = [];
  try {
    sourceServer = await startServer(SOURCE_PORT);
    destinationServer = await startServer(DESTINATION_PORT);
    browser = await chromium.launch({ executablePath: await browserPath() });
    context = await browser.newContext({ acceptDownloads: true });
    context.setDefaultTimeout(15_000);

    const newPage = async (label) => {
      const page = await context.newPage();
      page.on("dialog", (dialog) => void dialog.accept());
      page.on("pageerror", (error) => runtimeErrors.push(`${label} pageerror: ${error.message}`));
      page.on("console", (message) => {
        if (message.type() === "error") runtimeErrors.push(`${label} console: ${message.text()}`);
      });
      await page.addInitScript(() => {
        document.addEventListener("securitypolicyviolation", (event) => {
          console.error(`CSP violation: ${event.violatedDirective} ${event.blockedURI}`);
        });
      });
      return page;
    };

    check(SOURCE_ORIGIN !== DESTINATION_ORIGIN, "source and destination are distinct browser origins");

    const source = await newPage("source");
    await source.goto(`${SOURCE_ORIGIN}/`);
    await waitForApp(source);
    await openWorkspace(source);
    await source.setInputFiles("[data-workspace-import]", seedPath);
    await source.waitForSelector("[data-workspace-import-preview]");
    await source.click('[data-workspace-action="restore-empty"]');
    await source.waitForFunction(() => document.querySelector("#live-region")?.textContent?.includes("restored successfully"));
    await source.reload();
    await waitForApp(source);
    const sourceRendered = await source.waitForFunction(
      (name) => (document.querySelector("#main")?.textContent ?? "").includes(name),
      productName,
      { timeout: 10_000 },
    ).then(() => true, () => false);
    check(sourceRendered, `source origin restores and renders ${productName}`);

    const sourceKeys = await indexedDbKeys(source);
    check(Boolean(productKey(sourceKeys, workspaceId)), "source origin stores the workspace in its own IndexedDB");

    await openWorkspace(source);
    const [download] = await Promise.all([
      source.waitForEvent("download"),
      source.click('[data-workspace-action="backup"]'),
    ]);
    await download.saveAs(migratedBackupPath);
    const exported = JSON.parse(await readFile(migratedBackupPath, "utf8"));
    check(
      exported.format === "viable.workspace-backup"
        && exported.workspaceId === workspaceId
        && exported.contexts?.product?.product?.identity?.name === productName,
      "source origin exports the portable workspace backup used for migration",
    );

    const destination = await newPage("destination");
    await destination.goto(`${DESTINATION_ORIGIN}/`);
    await waitForApp(destination);
    const destinationBeforeText = (await destination.locator("#main").textContent()) ?? "";
    const destinationBeforeKeys = await indexedDbKeys(destination);
    check(!destinationBeforeText.includes(productName), "destination origin does not inherit source workspace UI state");
    check(!productKey(destinationBeforeKeys, workspaceId), "destination origin does not inherit source IndexedDB data");

    await openWorkspace(destination);
    await destination.setInputFiles("[data-workspace-import]", migratedBackupPath);
    await destination.waitForSelector("[data-workspace-import-preview]");
    await destination.click('[data-workspace-action="restore-empty"]');
    await destination.waitForFunction(() => document.querySelector("#live-region")?.textContent?.includes("restored successfully"));
    await destination.reload();
    await waitForApp(destination);
    const destinationRendered = await destination.waitForFunction(
      (name) => (document.querySelector("#main")?.textContent ?? "").includes(name),
      productName,
      { timeout: 10_000 },
    ).then(() => true, () => false);
    check(destinationRendered, "destination origin restores the exported backup");

    const destinationAfterKeys = await indexedDbKeys(destination);
    check(Boolean(productKey(destinationAfterKeys, workspaceId)), "destination origin persists the restored workspace in its own IndexedDB");

    await source.reload();
    await waitForApp(source);
    const sourceStillRendered = await source.waitForFunction(
      (name) => (document.querySelector("#main")?.textContent ?? "").includes(name),
      productName,
      { timeout: 10_000 },
    ).then(() => true, () => false);
    check(sourceStillRendered, "source origin remains independently persisted after destination restore");

    const sourceAfterKeys = await indexedDbKeys(source);
    check(Boolean(productKey(sourceAfterKeys, workspaceId)), "source IndexedDB remains intact after migration to the second origin");

    check(runtimeErrors.length === 0, `no page or CSP errors occurred (${runtimeErrors.join("; ") || "none"})`);

    await writeFile(reportPath, JSON.stringify({
      format: "viable.pwa-origin-migration-evidence",
      version: 1,
      build: {
        version: buildInfo.version,
        buildId: buildInfo.buildId,
        commit: buildInfo.commit,
      },
      sourceOrigin: SOURCE_ORIGIN,
      destinationOrigin: DESTINATION_ORIGIN,
      workspaceId,
      checks,
      errors: runtimeErrors,
    }, null, 2));

    if (failures.length) {
      throw new Error(`PWA origin migration validation failed: ${failures.join("; ")}`);
    }
    console.log(`Origin migration validation passed for build ${String(buildInfo.buildId).slice(0, 12)} using portable backup/restore.`);
  } finally {
    await rm(migratedBackupPath, { force: true });
    if (context) await context.close().catch(() => undefined);
    if (browser) await browser.close().catch(() => undefined);
    if (destinationServer) await closeServer(destinationServer);
    if (sourceServer) await closeServer(sourceServer);
  }
}

await main();
