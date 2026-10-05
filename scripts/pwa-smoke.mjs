// Real-browser smoke validation for the Viable PWA (ADR-0010).
//
// Serves dist-pwa/ on localhost with the production security headers and
// drives a local-first workflow in Chromium:
//   install service worker -> create a Product workspace -> reload (persists)
//   -> open every workspace view (including Calendar, regression for #113)
//   -> Workspace runtime panel reports truthful capabilities and build identity
//   -> offline reload still works from the shell cache
//   -> a new build is offered but never applied until the person confirms.
//
// Any page error, CSP violation, or unresponsive view fails the run.
// Browser: CHROME_PATH, else common system/Playwright locations.

import { createServer } from "node:http";
import { access, readFile, writeFile, cp, rm } from "node:fs/promises";
import { extname, join, normalize, resolve, sep } from "node:path";
import { chromium } from "playwright-core";
import { SECURITY_HEADERS } from "./pwa-security-headers.mjs";

const source = resolve(process.cwd(), process.env.VIABLE_PWA_OUT ?? "dist-pwa");
const served = resolve(process.cwd(), "dist-pwa-smoke");
const TYPES = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".json": "application/json", ".webmanifest": "application/manifest+json", ".png": "image/png",
};

async function browserPath() {
  const candidates = [
    process.env.CHROME_PATH,
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    process.env.PLAYWRIGHT_BROWSERS_PATH && join(process.env.PLAYWRIGHT_BROWSERS_PATH, "chromium-1194/chrome-linux/chrome"),
    "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  ].filter(Boolean);
  for (const candidate of candidates) {
    try { await access(candidate); return candidate; } catch { /* next */ }
  }
  throw new Error("No Chrome/Chromium found. Set CHROME_PATH.");
}

function startServer() {
  const server = createServer(async (request, response) => {
    const url = new URL(request.url ?? "/", "http://localhost");
    const path = normalize(decodeURIComponent(url.pathname === "/" ? "/index.html" : url.pathname));
    const file = join(served, path);
    if (!file.startsWith(served + sep)) { response.writeHead(403).end(); return; }
    try {
      const body = await readFile(file);
      // HSTS and upgrade-insecure-requests are meaningless on http://localhost.
      const headers = { ...SECURITY_HEADERS, "Content-Type": TYPES[extname(file)] ?? "application/octet-stream", "Cache-Control": "no-cache" };
      headers["Content-Security-Policy"] = headers["Content-Security-Policy"].replace("; upgrade-insecure-requests", "");
      delete headers["Strict-Transport-Security"];
      response.writeHead(200, headers).end(body);
    } catch {
      response.writeHead(404).end();
    }
  });
  return new Promise((resolveServer) => server.listen(0, "127.0.0.1", () => resolveServer(server)));
}

const failures = [];
function check(condition, message) {
  if (!condition) failures.push(message);
  console.log(`${condition ? "ok  " : "FAIL"} ${message}`);
}

async function responsive(page, label) {
  // A hung main thread (e.g. a MutationObserver render loop) never answers.
  const answered = await Promise.race([
    page.evaluate(() => true).catch(() => false),
    new Promise((resolveTimeout) => setTimeout(() => resolveTimeout(false), 5000)),
  ]);
  check(answered === true, `${label}: page stays responsive`);
  return answered === true;
}

async function mainText(page) {
  return ((await page.textContent("#main")) ?? "").replace(/\s+/g, " ").trim();
}

async function run() {
  await rm(served, { recursive: true, force: true });
  await cp(source, served, { recursive: true });
  const buildInfo = JSON.parse(await readFile(join(served, "build-info.json"), "utf8"));
  const server = await startServer();
  const origin = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({ executablePath: await browserPath() });
  const context = await browser.newContext();
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
  page.on("dialog", (dialog) => void dialog.accept());
  page.on("console", (message) => { if (message.type() === "error") errors.push(`console: ${message.text()}`); });
  await page.addInitScript(() => {
    document.addEventListener("securitypolicyviolation", (event) => console.error(`CSP violation: ${event.violatedDirective} ${event.blockedURI}`));
  });

  try {
    await page.goto(`${origin}/`);
    const swReady = await page.evaluate(async () => {
      const registration = await navigator.serviceWorker.ready;
      return Boolean(registration.active);
    });
    check(swReady, "service worker installs and activates");
    check(await page.locator('link[rel="manifest"]').count() === 1, "web app manifest is linked");
    const manifest = await (await page.request.get(`${origin}/manifest.webmanifest`)).json();
    check(manifest.display === "standalone" && manifest.icons.some((icon) => icon.sizes === "512x512"), "manifest is installable (standalone, 512px icon)");

    // Reload so the page is controlled by the service worker.
    await page.reload();
    check(await page.evaluate(() => Boolean(navigator.serviceWorker.controller)), "page is controlled by the service worker after reload");

    // Create a Product workspace through the real UI.
    const form = page.locator("#main form").first();
    for (const field of await form.locator("input[required], textarea[required]").all()) {
      const type = await field.getAttribute("type");
      if (type === "checkbox") await field.check();
      else if (!(await field.inputValue())) await field.fill("PWA smoke product");
    }
    await form.locator('button[type="submit"]').first().click();
    await page.waitForFunction(() => document.querySelector("#live-region")?.textContent?.includes("Product workspace created"));
    check(true, "Product workspace created through the UI");

    await page.reload();
    await page.waitForFunction(() => document.querySelector("#main")?.textContent?.includes("PWA smoke product"));
    check(true, "workspace persists across reload in browser storage");

    const views = await page.$$eval("nav button[data-nav]", (buttons) => buttons.map((button) => button.dataset.nav));
    check(views.length >= 9, `navigation exposes ${views.length} workspace views`);
    for (const view of views) {
      await page.click(`nav button[data-nav="${view}"]`, { timeout: 5000, noWaitAfter: true }).catch(() => undefined);
      if (!await responsive(page, `view "${view}"`)) break;
      await page.waitForTimeout(150);
    }
    // Every view must be reachable from every other view, mark exactly one
    // current item, and record it in the URL (regression for #116).
    const stuck = [];
    for (const from of views) {
      for (const to of views) {
        if (from === to) continue;
        await page.click(`nav button[data-nav="${from}"]`, { noWaitAfter: true });
        await page.waitForFunction((nav) => document.querySelector(`nav button[data-nav="${nav}"]`)?.getAttribute("aria-current") === "page", from, { timeout: 4000 }).catch(() => undefined);
        await page.click(`nav button[data-nav="${to}"]`, { noWaitAfter: true });
        const reached = await page.waitForFunction((nav) => {
          const current = [...document.querySelectorAll('nav button[aria-current="page"]')].map((button) => button.dataset.nav);
          return current.length === 1 && current[0] === nav && location.hash === `#${nav}`;
        }, to, { timeout: 4000 }).then(() => true, () => false);
        if (!reached) stuck.push(`${from}->${to}`);
      }
    }
    check(stuck.length === 0, `all ${views.length * (views.length - 1)} view-to-view transitions navigate and record history${stuck.length ? ` (failed: ${stuck.join(", ")})` : ""}`);
    // The final transition was <last view> -> <second-to-last view>; Back returns to the last view.
    await page.goBack();
    const back = await page.waitForFunction((nav) => document.querySelector(`nav button[data-nav="${nav}"]`)?.getAttribute("aria-current") === "page", views.at(-1), { timeout: 4000 }).then(() => true, () => false);
    check(back, "browser Back returns to the previous view");

    await page.click('nav button[data-nav="calendar"]', { noWaitAfter: true });
    if (await responsive(page, "Calendar re-entry")) {
      const vaultShown = await page.waitForFunction(
        () => /requires the Viable desktop runtime/.test(document.querySelector("#credential-vault-status")?.textContent ?? ""),
        undefined,
        { timeout: 8000 },
      ).then(() => true, () => false);
      check(vaultShown, `Calendar renders and states the credential vault needs the desktop runtime${vaultShown ? "" : ` (main: ${(await mainText(page)).slice(0, 160)})`}`);
    }

    await page.click('nav button[data-nav="workspace"]', { noWaitAfter: true });
    await page.waitForSelector('[data-runtime-capabilities] [data-capability="connected_linkedin_publishing"]', { timeout: 10000 });
    const panel = (await page.locator("[data-runtime-capabilities]").textContent()) ?? "";
    check(panel.includes("Viable in the browser"), "runtime panel identifies the browser runtime");
    check(panel.includes(buildInfo.buildId.slice(0, 12)), "runtime panel reports the running build identity");
    const linkedIn = (await page.locator('[data-capability="connected_linkedin_publishing"]').textContent()) ?? "";
    const linkedInState = (await page.locator('[data-capability="connected_linkedin_publishing"] .pill').textContent())?.trim();
    check(linkedInState === "unavailable" && /desktop runtime/.test(linkedIn), "connected LinkedIn publishing is shown as unavailable with its reason");
    const loopState = (await page.locator('[data-capability="marketability_loop"] .pill').textContent())?.trim();
    check(loopState === "available", "full marketability loop is available in the browser");

    // Durable storage: workspace data is committed to IndexedDB.
    const idbKeys = () => page.evaluate(() => new Promise((resolveKeys, rejectKeys) => {
      const open = indexedDB.open("viable-workspace");
      open.onsuccess = () => {
        const request = open.result.transaction("kv", "readonly").objectStore("kv").getAllKeys();
        request.onsuccess = () => { resolveKeys(request.result); open.result.close(); };
        request.onerror = () => rejectKeys(request.error);
      };
      open.onerror = () => rejectKeys(open.error);
    }));
    const productKey = (keys) => keys.find((key) => typeof key === "string" && key.startsWith("viable.product-workspace.") && key !== "viable.product-workspace.active");
    const storedKey = productKey(await idbKeys());
    check(Boolean(storedKey), "workspace data is committed to IndexedDB");
    const engine = await page.locator("[data-storage-engine]").getAttribute("data-storage-engine");
    check(engine === "indexeddb", `runtime panel reports the IndexedDB storage engine (${engine})`);

    // Browser backup -> delete -> restore round trip (#36), observed from a second tab.
    const second = await context.newPage();
    second.on("pageerror", (error) => errors.push(`second tab pageerror: ${error.message}`));
    await second.goto(`${origin}/`);
    await second.waitForFunction(() => document.querySelector("#main")?.textContent?.includes("PWA smoke product"));
    await page.click('nav button[data-nav="workspace"]', { noWaitAfter: true });
    await page.waitForSelector('[data-workspace-action="backup"]');
    const [download] = await Promise.all([page.waitForEvent("download"), page.click('[data-workspace-action="backup"]')]);
    const backupPath = join(served, "..", "dist-pwa-smoke-backup.json");
    await download.saveAs(backupPath);
    const backup = JSON.parse(await readFile(backupPath, "utf8"));
    check(backup.format === "viable.workspace-backup" && backup.contexts?.product?.product?.identity?.name === "PWA smoke product", "workspace backup downloads with unwrapped domain data");

    await page.check('[data-workspace-delete] input[name="scopeConfirmed"]');
    await page.fill('[data-workspace-delete] input[name="confirmation"]', "DELETE");
    await page.click('[data-workspace-delete] button[type="submit"]');
    await page.waitForFunction(() => document.querySelector("#live-region")?.textContent?.includes("deletion completed"), undefined, { timeout: 10000 });
    check(!productKey(await idbKeys()), "deletion is durable in IndexedDB");
    await second.click('nav button[data-nav="workspace"]', { noWaitAfter: true });
    const crossTab = await second.waitForFunction(() => /does not currently contain a Viable workspace/.test(document.querySelector("#main")?.textContent ?? ""), undefined, { timeout: 8000 }).then(() => true, () => false);
    check(crossTab, "another open tab sees the deletion without reloading");

    await page.setInputFiles("[data-workspace-import]", backupPath);
    await page.waitForSelector("[data-workspace-import-preview]", { timeout: 10000 });
    await page.click('[data-workspace-action="restore-empty"]');
    await page.waitForFunction(() => document.querySelector("#live-region")?.textContent?.includes("restored successfully"), undefined, { timeout: 10000 });
    check(productKey(await idbKeys()) === storedKey, "restore into an empty profile is durable in IndexedDB");
    await page.reload();
    await page.waitForFunction(() => document.querySelector("#main")?.textContent?.includes("PWA smoke product"), undefined, { timeout: 10000 });
    check(true, "restored workspace survives reload");
    await second.close();
    await rm(backupPath, { force: true });

    // Offline: the shell must load from the service worker cache.
    await page.click('nav button[data-nav="home"]', { noWaitAfter: true });
    await context.setOffline(true);
    const offlineLoaded = await page.reload().then(() => page.waitForFunction(
      () => document.querySelector("#main")?.textContent?.includes("PWA smoke product"),
      undefined,
      { timeout: 10000 },
    )).then(() => true, (error) => { console.log(`offline diagnostic: ${error.message.split("\n")[0]}`); return false; });
    check(offlineLoaded, `offline reload serves the cached shell with local workspace data${offlineLoaded ? "" : ` (main: ${(await mainText(page).catch(() => "unavailable")).slice(0, 160)})`}`);
    await context.setOffline(false);

    // Update contract: a new build is offered, never applied silently.
    const nextBuildId = `${buildInfo.buildId.slice(0, 56)}feedface`;
    await writeFile(join(served, "build-info.json"), JSON.stringify({ ...buildInfo, buildId: nextBuildId }));
    const sw = await readFile(join(served, "sw.js"), "utf8");
    await writeFile(join(served, "sw.js"), sw.replace(buildInfo.buildId, nextBuildId));
    await page.evaluate(async () => (await navigator.serviceWorker.getRegistration())?.update());
    await page.waitForSelector("[data-pwa-update]", { timeout: 15000 });
    check(true, "new build is announced to the person");
    const stillOld = await page.evaluate(async () => (await (await fetch("build-info.json")).json()).buildId);
    check(stillOld === buildInfo.buildId, "running session keeps its build until the person confirms");
    await Promise.all([
      page.waitForEvent("load", { timeout: 15000 }),
      page.click('[data-pwa-action="update"]'),
    ]);
    const updated = await page.evaluate(async () => (await (await fetch("build-info.json")).json()).buildId);
    check(updated === nextBuildId, "confirmed update reloads into the new build");
    await page.waitForFunction(() => document.querySelector("#main")?.textContent?.includes("PWA smoke product"), undefined, { timeout: 10000 });
    check(true, "local workspace data survives the update");
    const caches = await page.evaluate(async () => (await globalThis.caches.keys()).filter((name) => name.startsWith("viable-shell-")));
    check(caches.length === 1, `old build cache removed after activation (${caches.length} shell cache)`);

    // Upgrade path: a person with data in pre-IndexedDB storage keeps it.
    const upgradeContext = await browser.newContext();
    const upgrade = await upgradeContext.newPage();
    upgrade.on("pageerror", (error) => errors.push(`upgrade pageerror: ${error.message}`));
    const legacyWorkspace = { ...backup.contexts.product, id: "legacy-ws", product: { ...backup.contexts.product.product, identity: { ...backup.contexts.product.product.identity, name: "Legacy upgrade product" } } };
    await upgrade.addInitScript((value) => {
      if (!localStorage.getItem("viable.product-workspace.active")) {
        localStorage.setItem("viable.product-workspace.legacy-ws", JSON.stringify({ schemaVersion: 1, workspace: value }));
        localStorage.setItem("viable.product-workspace.active", "legacy-ws");
      }
    }, legacyWorkspace);
    await upgrade.goto(`${origin}/`);
    const migrated = await upgrade.waitForFunction(() => document.querySelector("#main")?.textContent?.includes("Legacy upgrade product"), undefined, { timeout: 10000 }).then(() => true, () => false);
    check(migrated, "existing browser-storage workspace is migrated to IndexedDB and shown after upgrade");
    await upgrade.click('nav button[data-nav="workspace"]', { noWaitAfter: true });
    await upgrade.waitForSelector("[data-storage-engine]", { timeout: 10000 });
    const migrationText = (await upgrade.locator("[data-storage-engine]").textContent()) ?? "";
    check(/2 saved records were copied/.test(migrationText), "runtime panel reports the migration");
    const legacyKept = await upgrade.evaluate(() => localStorage.getItem("viable.product-workspace.active"));
    check(legacyKept === "legacy-ws", "legacy storage copy is left untouched as a recovery source");
    await upgradeContext.close();

    // IndexedDB failure handling. Previously migrated profile: fail closed
    // (stale localStorage copy is never shown). Never-migrated profile: keep
    // using localStorage, which still holds the only copy.
    for (const migratedBefore of [true, false]) {
      const failContext = await browser.newContext();
      const failPage = await failContext.newPage();
      await failPage.addInitScript(([value, marked]) => {
        localStorage.setItem("viable.product-workspace.legacy-ws", JSON.stringify({ schemaVersion: 1, workspace: value }));
        localStorage.setItem("viable.product-workspace.active", "legacy-ws");
        if (marked) localStorage.setItem("viable-storage-engine", "indexeddb");
        IDBFactory.prototype.open = function () { throw new DOMException("simulated failure", "UnknownError"); };
      }, [legacyWorkspace, migratedBefore]);
      await failPage.goto(`${origin}/`);
      await failPage.waitForTimeout(1500);
      const text = (await failPage.textContent("body")) ?? "";
      if (migratedBefore) {
        check(/saved Viable data could not be opened/.test(text) && !/Legacy upgrade product/.test(text), "IndexedDB failure after migration fails closed and never shows the stale legacy copy");
      } else {
        check(/Legacy upgrade product/.test(text), "IndexedDB failure before any migration keeps working from localStorage");
      }
      await failContext.close();
    }

    check(errors.length === 0, `no page errors or CSP violations${errors.length ? `: ${errors.join(" | ")}` : ""}`);
  } finally {
    await browser.close();
    server.close();
    await rm(served, { recursive: true, force: true });
  }
}

await run();
if (failures.length) {
  console.error(`\nPWA smoke failed (${failures.length}):\n- ${failures.join("\n- ")}`);
  process.exit(1);
}
console.log("\nPWA smoke passed.");
