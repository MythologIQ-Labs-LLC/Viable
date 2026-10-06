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
// Engine: PWA_BROWSER=chromium (default) | firefox | webkit. Chromium uses
// CHROME_PATH or a system/Playwright Chrome; Firefox and WebKit use
// Playwright's matched engine builds (installed in CI). Capability-dependent
// checks assert graceful behavior where an engine lacks a capability, and
// every limitation is written to pwa-smoke-report-<engine>.json.

import { createServer } from "node:http";
import { access, readFile, writeFile, cp, rm } from "node:fs/promises";
import { extname, join, normalize, resolve, sep } from "node:path";
import { chromium, firefox, webkit } from "playwright-core";
import { SECURITY_HEADERS } from "./pwa-security-headers.mjs";

const source = resolve(process.cwd(), process.env.VIABLE_PWA_OUT ?? "dist-pwa");
const served = resolve(process.cwd(), "dist-pwa-smoke");
const SMOKE_HOST = "localhost";
const SMOKE_PORT = 4175;
const SMOKE_ORIGIN = `http://${SMOKE_HOST}:${SMOKE_PORT}`;
// An app-free page used to tell an engine defect from a Viable defect.
const ENGINE_CONTROL_PATH = "/__engine-control.html";
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
    if (url.pathname === ENGINE_CONTROL_PATH) {
      response.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-cache" }).end("<!doctype html><title>engine control</title><p id=control>engine control</p>");
      return;
    }
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
  return new Promise((resolveServer, rejectServer) => {
    server.once("error", rejectServer);
    server.listen(SMOKE_PORT, SMOKE_HOST, () => {
      server.removeListener("error", rejectServer);
      resolveServer(server);
    });
  });
}

const BROWSER = process.env.PWA_BROWSER ?? "chromium";
const ENGINES = { chromium, firefox, webkit };
if (!ENGINES[BROWSER]) throw new Error(`Unknown PWA_BROWSER ${BROWSER}; expected chromium, firefox, or webkit`);

const failures = [];
const results = [];
const limitations = [];
function check(condition, message) {
  if (!condition) failures.push(message);
  results.push({ check: message, ok: Boolean(condition) });
  console.log(`${condition ? "ok  " : "FAIL"} ${message}`);
}
function limitation(message) {
  limitations.push(message);
  console.log(`LIMIT ${message}`);
}
// Bounds any step that has no built-in timeout (page.evaluate never times out),
// so an engine that never settles a promise is a recorded failure, not a hang.
function withTimeout(promise, ms, label) {
  let timer;
  return Promise.race([
    promise,
    new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(`${label} did not finish within ${ms / 1000}s`)), ms); }),
  ]).finally(() => clearTimeout(timer));
}

const SECTION_TIMEOUT_MS = 90_000;

// The main page, described in the log whenever a section fails.
let diagnosticPage;

// What the page was doing when a section failed: still loading, controlled by
// the service worker, app rendered or not.
async function describePage(page) {
  if (!page) return "no page";
  return withTimeout(page.evaluate(() => JSON.stringify({
    url: location.href,
    readyState: document.readyState,
    controlled: Boolean(navigator.serviceWorker?.controller),
    navButtons: document.querySelectorAll("nav button[data-nav]").length,
    body: (document.body?.innerText ?? "").replace(/\s+/g, " ").slice(0, 200),
  })), 5_000, "page state").catch((error) => `unavailable (${error.message.split("\n")[0]})`);
}

// Reloads the page. Playwright's Firefox driver can leave page.reload()
// pending forever when the URL has a #hash (microsoft/playwright#21145), and
// Viable records the current view in the hash. In Firefox, navigate to the
// same document without the hash instead; the app restores its default view.
function reload(page) {
  return BROWSER === "firefox" ? page.goto(page.url().split("#")[0]) : page.reload();
}

// WebKit refuses more than 100 history writes per 10 s; a person never comes
// close, but 72 back-to-back transitions do. Pace each transition click.
const TRANSITION_PACE_MS = 120;

// Waits until the app has rendered and stopped re-rendering, as a person would
// before typing. The page "load" event is not a readiness signal: engines
// differ on whether it waits for modules still in a top-level await, and the
// app re-renders once its stores finish loading.
async function settled(page) {
  await page.waitForFunction(() => document.querySelectorAll("nav button[data-nav]").length > 0);
  await withTimeout(page.evaluate(() => new Promise((resolveQuiet) => {
    const main = document.querySelector("#main");
    let quiet;
    const cap = setTimeout(done, 5000);
    const observer = new MutationObserver(() => { clearTimeout(quiet); quiet = setTimeout(done, 500); });
    function done() { clearTimeout(quiet); clearTimeout(cap); observer.disconnect(); resolveQuiet(); }
    quiet = setTimeout(done, 500);
    observer.observe(main, { childList: true, subtree: true });
  })), 10_000, "app settle");
}

// Runs one independent section; an exception or timeout is recorded as a
// failure without hiding the results of later sections.
async function section(name, body) {
  try {
    await withTimeout(body(), SECTION_TIMEOUT_MS, name);
  } catch (error) {
    check(false, `${name}: ${(error instanceof Error ? error.message : String(error)).split("\n")[0]}`);
    console.log(`  page state: ${await describePage(diagnosticPage)}`);
  }
}

// API presence is not access: an engine can expose localStorage and IndexedDB
// yet refuse them for this document (SecurityError). Probe real access.
function storageAccess(page) {
  return withTimeout(page.evaluate(async () => {
    const outcome = (error) => `${error?.name ?? "Error"}: ${error?.message ?? String(error)}`;
    let local = "ok";
    try { localStorage.getItem("viable-smoke-probe"); } catch (error) { local = outcome(error); }
    let idb = "ok";
    try {
      await new Promise((resolveOpen, rejectOpen) => {
        const open = indexedDB.open("viable-smoke-probe");
        open.onsuccess = () => { open.result.close(); indexedDB.deleteDatabase("viable-smoke-probe"); resolveOpen(); };
        open.onerror = () => rejectOpen(open.error);
      });
    } catch (error) { idb = outcome(error); }
    return { origin: location.origin, isSecureContext: window.isSecureContext, localStorage: local, indexedDB: idb };
  }), 15_000, "storage access probe").catch((error) => ({ probeError: error.message.split("\n")[0] }));
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
  const origin = SMOKE_ORIGIN;
  const browser = BROWSER === "chromium"
    ? await chromium.launch({ executablePath: await browserPath() })
    : await ENGINES[BROWSER].launch();
  console.log(`Engine: ${BROWSER} ${browser.version()}`);
  const context = await browser.newContext();
  context.setDefaultTimeout(15_000);
  const errors = [];
  async function instrumentedPage() {
    const created = await context.newPage();
    created.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
    created.on("dialog", (dialog) => void dialog.accept());
    created.on("console", (message) => {
      if (message.type() === "error") errors.push(`console: ${message.text()}`);
      else if (message.type() === "warning") console.log(`  page warning: ${message.text()}`);
    });
    await created.addInitScript(() => {
      document.addEventListener("securitypolicyviolation", (event) => console.error(`CSP violation: ${event.violatedDirective} ${event.blockedURI}`));
    });
    diagnosticPage = created;
    return created;
  }
  // Replaced only when an engine defect kills the renderer (see reloadOrEngineDefect).
  let page = await instrumentedPage();

  // Playwright's Linux WebKit build crashes or hangs its renderer when a page
  // is reloaded after going Back across several pushState entries. It
  // reproduces on an app-free page (scripts/pwa-restore-reload-probe.mjs,
  // CI run 37426515169). When a WebKit reload fails, rerun that app-free
  // control in a fresh context. Only if the control fails too is the failure
  // recorded as an engine limitation; the run then continues on a fresh page
  // of the same profile. Otherwise the original failure stands.
  async function engineControlFails() {
    const controlContext = await browser.newContext();
    try {
      const control = await controlContext.newPage();
      await control.goto(`${origin}${ENGINE_CONTROL_PATH}`);
      await control.evaluate(async () => {
        for (let index = 0; index < 10; index += 1) {
          history.pushState({ index }, "", `#entry-${index}`);
          await new Promise((resolveWait) => setTimeout(resolveWait, 150));
        }
      });
      await control.goBack();
      await control.waitForTimeout(300);
      return await withTimeout(control.reload(), 20_000, "control reload").then(() => false, () => true);
    } finally {
      await controlContext.close().catch(() => undefined);
    }
  }
  async function reloadOrEngineDefect(label) {
    const failure = await withTimeout(reload(page), 20_000, `${label} reload`).then(() => undefined, (error) => error);
    if (!failure) return;
    if (BROWSER !== "webkit" || !(await engineControlFails())) throw failure;
    limitation(`${label}: the reload did not complete (${String(failure.message ?? failure).split("\n")[0]}), and the app-free control (pushState x10, Back, reload) failed the same way in a fresh context. Recorded as a Playwright WebKit engine defect, not a Viable failure; continuing on a fresh page`);
    await page.close().catch(() => undefined);
    page = await instrumentedPage();
    await page.goto(`${origin}/`);
  }

  let support = {};
  const storageAccessReport = {};
  let backup;
  try {
    await page.goto(`${origin}/`);
    support = await withTimeout(page.evaluate(() => ({
      serviceWorker: "serviceWorker" in navigator && window.isSecureContext,
      indexedDB: typeof indexedDB !== "undefined",
      broadcastChannel: typeof BroadcastChannel !== "undefined",
      storagePersist: typeof navigator.storage?.persist === "function",
      storageEstimate: typeof navigator.storage?.estimate === "function",
    })), 15_000, "capability probe");
    console.log(`Support: ${JSON.stringify(support)}`);
    storageAccessReport.beforeServiceWorker = await storageAccess(page);
    console.log(`Storage access (first load): ${JSON.stringify(storageAccessReport.beforeServiceWorker)}`);
    check(await page.locator('link[rel="manifest"]').count() === 1, "web app manifest is linked");
    const manifest = await (await page.request.get(`${origin}/manifest.webmanifest`)).json();
    check(manifest.display === "standalone" && manifest.icons.some((icon) => icon.sizes === "512x512"), "manifest is installable (standalone, 512px icon)");
    if (support.serviceWorker) {
      await section("service worker", async () => {
          const swReady = await withTimeout(page.evaluate(async () => Boolean((await navigator.serviceWorker.ready).active)), 20_000, "navigator.serviceWorker.ready");
          check(swReady, "service worker installs and activates");
          await reload(page);
          check(await page.evaluate(() => Boolean(navigator.serviceWorker.controller)), "page is controlled by the service worker after reload");
          storageAccessReport.serviceWorkerControlled = await storageAccess(page);
          console.log(`Storage access (service-worker controlled): ${JSON.stringify(storageAccessReport.serviceWorkerControlled)}`);
      });
    } else {
      limitation("service workers unavailable: no offline shell or update prompt; Viable runs online");
    }
    if (!support.storagePersist) limitation("navigator.storage.persist() unavailable: durable-storage request not offered");

    // Create a Product workspace through the real UI.
    await section("workspace creation", async () => {
      await settled(page);
      const form = page.locator("#main form").first();
      for (const field of await form.locator("input[required], textarea[required]").all()) {
        const type = await field.getAttribute("type");
        if (type === "checkbox") await field.check();
        else if (!(await field.inputValue())) await field.fill("PWA smoke product");
      }
      await form.locator('button[type="submit"]').first().click();
      await page.waitForFunction(() => document.querySelector("#live-region")?.textContent?.includes("Product workspace created"));
      check(true, "Product workspace created through the UI");

      await reload(page);
      await page.waitForFunction(() => document.querySelector("#main")?.textContent?.includes("PWA smoke product"));
      check(true, "workspace persists across reload in browser storage");
      // index.html starts <main aria-busy="true">; a rendered view must clear it.
      const busyCleared = await page.waitForFunction(() => document.querySelector("#main")?.getAttribute("aria-busy") === "false", undefined, { timeout: 5000 }).then(() => true, () => false);
      check(busyCleared, "main region is not left aria-busy after startup");
    });

    await section("navigation", async () => {
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
          await page.waitForTimeout(TRANSITION_PACE_MS);
          await page.click(`nav button[data-nav="${from}"]`, { noWaitAfter: true });
          await page.waitForFunction((nav) => document.querySelector(`nav button[data-nav="${nav}"]`)?.getAttribute("aria-current") === "page", from, { timeout: 4000 }).catch(() => undefined);
          await page.waitForTimeout(TRANSITION_PACE_MS);
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
    });

    await section("Calendar and runtime panel", async () => {
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
    });

    await section("durable storage, backup, delete, restore", async () => {
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
      backup = JSON.parse(await readFile(backupPath, "utf8"));
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
      // The cross-tab check is done.
      await second.close();
      // First reload after the navigation section's Back (see reloadOrEngineDefect).
      await reloadOrEngineDefect("restored workspace reload");
      await page.waitForFunction(() => document.querySelector("#main")?.textContent?.includes("PWA smoke product"), undefined, { timeout: 10000 });
      check(true, "restored workspace survives reload");
      await rm(backupPath, { force: true });
    });

    // Offline: the shell must load from the service worker cache.
    if (support.serviceWorker) await section("offline and update contract", async () => {
      await page.click('nav button[data-nav="home"]', { noWaitAfter: true });
      await context.setOffline(true);
      const offlineLoaded = await reload(page).then(() => page.waitForFunction(
        () => document.querySelector("#main")?.textContent?.includes("PWA smoke product"),
        undefined,
        { timeout: 10000 },
      )).then(() => true, (error) => { console.log(`offline diagnostic: ${error.message.split("\n")[0]}`); return false; });
      check(offlineLoaded, `offline reload serves the cached shell with local workspace data${offlineLoaded ? "" : ` (main: ${(await mainText(page).catch(() => "unavailable")).slice(0, 160)})`}`);
      await context.setOffline(false);

      // Update contract: a new build is offered, never applied silently.
      // A second open tab stands in for unsaved work. Origin-wide service-worker
      // activation must not reload that tab until it independently confirms.
      const updateObserver = await context.newPage();
      await updateObserver.goto(`${origin}/`);
      await updateObserver.waitForFunction(() => document.querySelector("#main")?.textContent?.includes("PWA smoke product"), undefined, { timeout: 10000 });
      await updateObserver.evaluate(() => { globalThis.__viableUpdateSentinel = "unsaved-tab-state"; });

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
      check(updated === nextBuildId, "confirmed update reloads the initiating tab into the new build");
      await page.waitForFunction(() => document.querySelector("#main")?.textContent?.includes("PWA smoke product"), undefined, { timeout: 10000 });
      check(true, "local workspace data survives the update");

      await updateObserver.waitForSelector("[data-pwa-update-active]", { timeout: 15000 });
      const observerStayedLoaded = await updateObserver.evaluate(() => globalThis.__viableUpdateSentinel === "unsaved-tab-state");
      check(observerStayedLoaded, "another open tab is not reloaded by someone else's update confirmation");
      await Promise.all([
        updateObserver.waitForEvent("load", { timeout: 15000 }),
        updateObserver.click('[data-pwa-action="reload"]'),
      ]);
      await updateObserver.waitForFunction(() => document.querySelector("#main")?.textContent?.includes("PWA smoke product"), undefined, { timeout: 10000 });
      check(true, "another open tab reloads only after its own confirmation");
      await updateObserver.close();

      const caches = await page.evaluate(async () => (await globalThis.caches.keys()).filter((name) => name.startsWith("viable-shell-")));
      check(caches.length === 1, `old build cache removed after activation (${caches.length} shell cache)`);
    });

    // Upgrade path: a person with data in pre-IndexedDB storage keeps it.
    if (!backup) throw new Error("backup unavailable; migration checks need a product fixture");
    const legacyWorkspace = { ...backup.contexts.product, id: "legacy-ws", product: { ...backup.contexts.product.product, identity: { ...backup.contexts.product.product.identity, name: "Legacy upgrade product" } } };
    await section("upgrade migration", async () => {
      const upgradeContext = await browser.newContext();
      const upgrade = await upgradeContext.newPage();
      upgrade.on("pageerror", (error) => errors.push(`upgrade pageerror: ${error.message}`));
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
    });

    // IndexedDB is the authority whenever the browser exposes it. If opening
    // that authority fails, Viable must never guess that a legacy localStorage
    // copy is safe, because it may be stale after a prior migration.
    await section("IndexedDB failure handling", async () => {
      const failContext = await browser.newContext();
      const failPage = await failContext.newPage();
      await failPage.addInitScript((value) => {
        localStorage.setItem("viable.product-workspace.legacy-ws", JSON.stringify({ schemaVersion: 1, workspace: value }));
        localStorage.setItem("viable.product-workspace.active", "legacy-ws");
        IDBFactory.prototype.open = function () { throw new DOMException("simulated failure", "UnknownError"); };
      }, legacyWorkspace);
      await failPage.goto(`${origin}/`);
      await failPage.waitForTimeout(1500);
      const text = (await failPage.textContent("body")) ?? "";
      check(
        /saved Viable data could not be opened/.test(text) && !/Legacy upgrade product/.test(text),
        "IndexedDB authority failure always fails closed and never resurrects a legacy localStorage copy",
      );
      await failContext.close();
    });

    check(errors.length === 0, `no page errors or CSP violations${errors.length ? `: ${errors.join(" | ")}` : ""}`);
  } catch (error) {
    check(false, `smoke aborted: ${(error instanceof Error ? error.message : String(error)).split("\n")[0]}`);
  } finally {
    const uniqueErrors = [...new Set(errors)];
    // Printed (not only written to the report) so a CI log alone explains a failure.
    if (uniqueErrors.length) console.log(`Page errors (${uniqueErrors.length}):\n  ${uniqueErrors.join("\n  ")}`);
    await writeFile(`pwa-smoke-report-${BROWSER}.json`, `${JSON.stringify({ browser: BROWSER, version: browser.version(), support, storageAccess: storageAccessReport, results, limitations, errors: uniqueErrors }, null, 2)}\n`);
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
console.log(`\nPWA smoke passed in ${BROWSER}${limitations.length ? ` with ${limitations.length} documented limitation(s)` : ""}.`);
