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
const ENGINE_CONTROL_SW_PATH = "/__engine-control-sw.js";
let engineControlSwVersion = 1;
let engineControlPrecache = [ENGINE_CONTROL_PATH];
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
    if (url.pathname === ENGINE_CONTROL_SW_PATH) {
      response.writeHead(200, { "Content-Type": "text/javascript; charset=utf-8", "Cache-Control": "no-cache", "Service-Worker-Allowed": "/" }).end(`
const CACHE = "viable-engine-control-v${engineControlSwVersion}";
const PRECACHE = ${JSON.stringify(engineControlPrecache)};
self.addEventListener("install", (event) => event.waitUntil(
  caches.open(CACHE).then((cache) => cache.addAll(PRECACHE.map((path) => new Request(path, { cache: "reload" })))),
));
self.addEventListener("activate", (event) => event.waitUntil((async () => {
  const names = await caches.keys();
  await Promise.all(names.filter((name) => name.startsWith("viable-engine-control-v") && name !== CACHE).map((name) => caches.delete(name)));
  await self.clients.claim();
})()));
self.addEventListener("message", (event) => {
  if (event.data?.type === "ACTIVATE") void self.skipWaiting();
});
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (url.origin === self.location.origin && url.pathname === "${ENGINE_CONTROL_PATH}") {
    event.respondWith(caches.match(event.request).then((cached) => cached ?? fetch(event.request)));
  }
});
`);
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
  // Make the app-free WebKit update control exercise the same precache volume
  // and cache churn as the production service worker without executing Viable
  // application code. This distinguishes a WebKit service-worker/cache defect
  // from a failure in Viable's post-update startup path.
  const productionWorker = await readFile(join(served, "sw.js"), "utf8");
  const precacheMatch = productionWorker.match(/const PRECACHE = (\[[^\n]+\]);/);
  if (!precacheMatch) throw new Error("Production service-worker precache list not found");
  engineControlPrecache = [...JSON.parse(precacheMatch[1]), ENGINE_CONTROL_PATH];
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
  // Replaced only to avoid a WebKit engine defect (see webkitHistoryReloadDefectPresent).
  let page = await instrumentedPage();

  // Playwright's Linux WebKit build crashes or hangs its renderer when a page
  // is reloaded after going Back across several pushState entries. It
  // reproduces on an app-free page with no Viable code
  // (scripts/pwa-restore-reload-probe.mjs; CI runs 37426515169, 37428688989),
  // and a hung renderer also takes down later pages of the same browser.
  // In WebKit, the app-free control runs in a separately launched browser.
  // While it still fails, the page that went Back is replaced by a fresh page
  // of the same profile before any further reload, so every later check
  // still runs. Chromium and Firefox keep covering reload after Back. Once
  // the engine is fixed, the control passes and the same page is kept.
  async function webkitHistoryReloadDefectPresent() {
    const isolated = await ENGINES.webkit.launch();
    try {
      const control = await (await isolated.newContext()).newPage();
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
      await isolated.close().catch(() => undefined);
    }
  }
  
  // Playwright's Linux WebKit can fail a reload while its context is
  // emulating offline mode even for an app-free page cached by a minimal
  // service worker. Run this control in a separate browser so a harness
  // failure cannot poison the Viable smoke context.
  async function webkitOfflineReloadDefectPresent() {
    const isolated = await ENGINES.webkit.launch();
    try {
      const isolatedContext = await isolated.newContext();
      const control = await isolatedContext.newPage();
      await control.goto(`${origin}${ENGINE_CONTROL_PATH}`);
      const registered = await withTimeout(control.evaluate(async (workerPath) => {
        const registration = await navigator.serviceWorker.register(workerPath, { scope: "/" });
        await navigator.serviceWorker.ready;
        return Boolean(registration.active);
      }, ENGINE_CONTROL_SW_PATH), 20_000, "control service worker registration").catch(() => false);
      if (!registered) return false;
      await control.reload();
      if (!await control.evaluate(() => Boolean(navigator.serviceWorker.controller))) return false;
      await isolatedContext.setOffline(true);
      return await withTimeout(control.reload(), 20_000, "offline control reload").then(() => false, () => true);
    } finally {
      await isolated.close().catch(() => undefined);
    }
  }

  // An app-free single-tab control mirrors the exact WebKit diagnostic path
  // used below: install a service worker, publish a changed worker, activate it
  // only after an explicit message, then reload from controllerchange. The
  // second Viable tab is deliberately closed in the WebKit diagnostic, so the
  // control must also be single-tab. A multi-tab control can pass while this
  // single-tab reload still crashes, which would incorrectly blame Viable.
  async function webkitUpdateReloadDefectPresent() {
    engineControlSwVersion = 1;
    const isolated = await ENGINES.webkit.launch();
    try {
      const isolatedContext = await isolated.newContext();
      const control = await isolatedContext.newPage();
      await control.goto(`${origin}${ENGINE_CONTROL_PATH}`);
      await withTimeout(control.evaluate(async (workerPath) => {
        await navigator.serviceWorker.register(workerPath, { scope: "/" });
        await navigator.serviceWorker.ready;
      }, ENGINE_CONTROL_SW_PATH), 20_000, "update control service worker registration");
      await control.reload();
      if (!await control.evaluate(() => Boolean(navigator.serviceWorker.controller))) return false;

      engineControlSwVersion = 2;
      await control.evaluate(async () => {
        const registration = await navigator.serviceWorker.getRegistration();
        if (!registration) throw new Error("control registration missing");
        await registration.update();
      });
      const waiting = await control.waitForFunction(async () => Boolean((await navigator.serviceWorker.getRegistration())?.waiting), undefined, { timeout: 15000 }).then(() => true, () => false);
      if (!waiting) return false;

      await control.evaluate(() => {
        navigator.serviceWorker.addEventListener("controllerchange", () => window.location.reload(), { once: true });
      });
      const load = control.waitForEvent("load", { timeout: 15000 }).then(() => true, () => false);
      await control.evaluate(async () => {
        const registration = await navigator.serviceWorker.getRegistration();
        registration?.waiting?.postMessage({ type: "ACTIVATE" });
      });
      return !(await load);
    } finally {
      engineControlSwVersion = 1;
      await isolated.close().catch(() => undefined);
    }
  }

  let support = {};
  const storageAccessReport = {};
  let storageDurabilityReport = null;
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

    if (BROWSER === "webkit" && await webkitHistoryReloadDefectPresent()) {
      limitation("WebKit engine defect: reloading after Back across pushState entries crashes or hangs the renderer, reproduced on an app-free page in a separate browser. The remaining checks continue on a fresh page of the same profile; Chromium and Firefox cover reload after Back");
      await page.close();
      page = await instrumentedPage();
      await page.goto(`${origin}/`);
      await settled(page);
    }

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
      const retentionRules = await page.locator("[data-workspace-retention] [data-retention-rule]").count();
      check(retentionRules >= 10, `Workspace screen states the retention policy (${retentionRules} rules)`);

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

      // Recovery points (#36): deletion needs an explicit decision, and the
      // downloaded recovery point must restore what deletion removed.
      await page.check('[data-workspace-delete] input[name="scopeConfirmed"]');
      await page.fill('[data-workspace-delete] input[name="confirmation"]', "DELETE");
      await page.click('[data-workspace-delete] button[type="submit"]');
      const refused = await page.waitForFunction(() => /Download a recovery point/.test(document.querySelector("[data-workspace-action-error]")?.textContent ?? ""), undefined, { timeout: 5000 }).then(() => true, () => false);
      check(refused && productKey(await idbKeys()) === storedKey, "deletion without a recovery-point decision is refused and changes nothing");
      const [pointDownload] = await Promise.all([page.waitForEvent("download"), page.click('[data-workspace-delete] [data-workspace-action="recovery-point"]')]);
      const recoveryPath = join(served, "..", "dist-pwa-smoke-recovery-point.json");
      await pointDownload.saveAs(recoveryPath);
      const recoveryPoint = JSON.parse(await readFile(recoveryPath, "utf8"));
      check(
        /^viable-recovery-point-/.test(pointDownload.suggestedFilename()) && recoveryPoint.format === "viable.workspace-backup" && JSON.stringify(recoveryPoint.contexts) === JSON.stringify(backup.contexts),
        "recovery point downloads as an ordinary backup of exactly the current state",
      );
      const pointCurrent = await page.locator("[data-workspace-delete] [data-recovery-point]").getAttribute("data-recovery-point");
      check(pointCurrent === "current", `deletion form shows the recovery point as current (${pointCurrent})`);
      await page.check('[data-workspace-delete] input[name="scopeConfirmed"]');
      await page.fill('[data-workspace-delete] input[name="confirmation"]', "DELETE");
      await page.click('[data-workspace-delete] button[type="submit"]');
      await page.waitForFunction(() => document.querySelector("#live-region")?.textContent?.includes("deletion completed"), undefined, { timeout: 10000 });
      check(!productKey(await idbKeys()), "deletion is durable in IndexedDB");
      await second.click('nav button[data-nav="workspace"]', { noWaitAfter: true });
      const crossTab = await second.waitForFunction(() => /does not currently contain a Viable workspace/.test(document.querySelector("#main")?.textContent ?? ""), undefined, { timeout: 8000 }).then(() => true, () => false);
      check(crossTab, "another open tab sees the deletion without reloading");

      await page.setInputFiles("[data-workspace-import]", recoveryPath);
      await page.waitForSelector("[data-workspace-import-preview]", { timeout: 10000 });
      await page.click('[data-workspace-action="restore-empty"]');
      await page.waitForFunction(() => document.querySelector("#live-region")?.textContent?.includes("restored successfully"), undefined, { timeout: 10000 });
      check(productKey(await idbKeys()) === storedKey, "the recovery point restores the deleted workspace into the empty profile, durably in IndexedDB");
      await rm(recoveryPath, { force: true });
      // The cross-tab check is done.
      await second.close();
      await reload(page);
      await page.waitForFunction(() => document.querySelector("#main")?.textContent?.includes("PWA smoke product"), undefined, { timeout: 10000 });
      check(true, "restored workspace survives reload");
      await rm(backupPath, { force: true });
    });

    // Offline: the shell must load from the service worker cache.
    if (support.serviceWorker) await section("offline and update contract", async () => {
      await page.click('nav button[data-nav="home"]', { noWaitAfter: true });
      const webkitOfflineHarnessDefect = BROWSER === "webkit" && await webkitOfflineReloadDefectPresent();
      if (webkitOfflineHarnessDefect) {
        limitation("WebKit engine/harness limitation: Playwright offline emulation fails a reload even for an app-free page cached by a minimal service worker. Chromium and Firefox cover Viable offline reload; real Safari requires hands-on validation");
      } else {
        await context.setOffline(true);
        const offlineLoaded = await reload(page).then(() => page.waitForFunction(
          () => document.querySelector("#main")?.textContent?.includes("PWA smoke product"),
          undefined,
          { timeout: 10000 },
        )).then(() => true, (error) => { console.log(`offline diagnostic: ${error.message.split("\\n")[0]}`); return false; });
        check(offlineLoaded, `offline reload serves the cached shell with local workspace data${offlineLoaded ? "" : ` (main: ${(await mainText(page).catch(() => "unavailable")).slice(0, 160)})`}`);
        await context.setOffline(false);
      }

      // Update contract: a new build is offered, never applied silently.
      const webkitUpdateHarnessDefect = BROWSER === "webkit" && await webkitUpdateReloadDefectPresent();
      if (webkitUpdateHarnessDefect) {
        limitation("WebKit engine/harness limitation: a blank page using the same user-confirmed service-worker activation and controllerchange reload does not produce a load event. Chromium and Firefox cover Viable update activation; real Safari requires hands-on validation");
        return;
      }

      // A second open tab stands in for unsaved work. Origin-wide service-worker
      // activation must not reload that tab until it independently confirms.
      const updateObserver = await context.newPage();
      await updateObserver.goto(`${origin}/`);
      await updateObserver.waitForFunction(() => document.querySelector("#main")?.textContent?.includes("PWA smoke product"), undefined, { timeout: 10000 });
      await updateObserver.evaluate(() => { globalThis.__viableUpdateSentinel = "unsaved-tab-state"; });
      const webkitSingleTabDiagnostic = BROWSER === "webkit";
      if (webkitSingleTabDiagnostic) {
        await updateObserver.close();
        limitation("WebKit diagnostic: the update activation is being retried with the second Viable tab closed to isolate a multi-tab runtime interaction");
      }

      const nextBuildId = `${buildInfo.buildId.slice(0, 56)}feedface`;
      await writeFile(join(served, "build-info.json"), JSON.stringify({ ...buildInfo, buildId: nextBuildId }));
      const sw = await readFile(join(served, "sw.js"), "utf8");
      await writeFile(join(served, "sw.js"), sw.replace(buildInfo.buildId, nextBuildId));
      await page.evaluate(async () => (await navigator.serviceWorker.getRegistration())?.update());
      await page.waitForSelector("[data-pwa-update]", { timeout: 15000 });
      check(true, "new build is announced to the person");
      const stillOld = await page.evaluate(async () => (await (await fetch("build-info.json")).json()).buildId);
      check(stillOld === buildInfo.buildId, "running session keeps its build until the person confirms");
      if (BROWSER === "webkit") {
        await page.evaluate(() => {
          const key = "__viableSmokeUpdateEvents";
          const mark = (event) => {
            const prior = localStorage.getItem(key);
            localStorage.setItem(key, prior ? `${prior},${event}` : event);
          };
          localStorage.setItem(key, "armed");
          navigator.serviceWorker.addEventListener("controllerchange", () => mark("controllerchange"));
          window.addEventListener("beforeunload", () => mark("beforeunload"));
          window.addEventListener("pagehide", () => mark("pagehide"));
        });
      }
      try {
        await Promise.all([
          page.waitForEvent("load", { timeout: 15000 }),
          page.click('[data-pwa-action="update"]'),
        ]);
      } catch (error) {
        if (BROWSER === "webkit") {
          let forensic = { events: "unavailable", active: null, waiting: null, contextAlive: false };
          try {
            const witness = await context.newPage();
            await witness.goto(`${origin}${ENGINE_CONTROL_PATH}`);
            forensic = await witness.evaluate(async () => {
              const registration = await navigator.serviceWorker.getRegistration("/");
              return {
                events: localStorage.getItem("__viableSmokeUpdateEvents") ?? "none",
                active: registration?.active?.scriptURL ?? null,
                waiting: registration?.waiting?.scriptURL ?? null,
                contextAlive: true,
              };
            });
            await witness.close();
          } catch { /* diagnostic only */ }
          console.log(`update forensic: ${JSON.stringify(forensic)}`);
        }
        throw error;
      }
      const updated = await page.evaluate(async () => (await (await fetch("build-info.json")).json()).buildId);
      check(updated === nextBuildId, "confirmed update reloads the initiating tab into the new build");
      await page.waitForFunction(() => document.querySelector("#main")?.textContent?.includes("PWA smoke product"), undefined, { timeout: 10000 });
      check(true, "local workspace data survives the update");
      if (webkitSingleTabDiagnostic) return;

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

      // Deleting the workspace must not leave it behind in the legacy copy (#36).
      upgrade.on("dialog", (dialog) => void dialog.accept());
      await upgrade.check('[data-workspace-delete] input[name="declineRecoveryPoint"]');
      await upgrade.check('[data-workspace-delete] input[name="scopeConfirmed"]');
      await upgrade.fill('[data-workspace-delete] input[name="confirmation"]', "DELETE");
      await upgrade.click('[data-workspace-delete] button[type="submit"]');
      await upgrade.waitForFunction(() => document.querySelector("#live-region")?.textContent?.includes("deletion completed"), undefined, { timeout: 10000 });
      const legacyLeft = await upgrade.evaluate(() => ["viable.product-workspace.legacy-ws", "viable.product-workspace.active"].filter((key) => localStorage.getItem(key) !== null));
      check(legacyLeft.length === 0, `deleting a migrated workspace also removes its legacy storage copy${legacyLeft.length ? ` (left: ${legacyLeft.join(", ")})` : ""}`);
      await upgradeContext.close();
    });

    // Restore into an existing profile (#36): replace-current restore,
    // driven through the Workspace screen against real IndexedDB.
    await section("replace-current restore", async () => {
      const replaceContext = await browser.newContext({ acceptDownloads: true });
      const replace = await replaceContext.newPage();
      replace.on("pageerror", (error) => errors.push(`replace pageerror: ${error.message}`));
      replace.on("dialog", (dialog) => void dialog.accept());
      const productKey = "viable.product-workspace.replace-ws";
      const named = (name) => ({ ...backup.contexts.product, id: "replace-ws", product: { ...backup.contexts.product.product, identity: { ...backup.contexts.product.product.identity, name } } });
      await replace.addInitScript((value) => {
        if (!localStorage.getItem("viable.product-workspace.active")) {
          localStorage.setItem("viable.product-workspace.replace-ws", JSON.stringify({ schemaVersion: 1, workspace: value }));
          localStorage.setItem("viable.product-workspace.active", "replace-ws");
        }
      }, named("Replace original"));
      const idb = (operation, key, value) => replace.evaluate(([op, k, v]) => new Promise((resolveIdb, rejectIdb) => {
        const open = indexedDB.open("viable-workspace");
        open.onerror = () => rejectIdb(open.error);
        open.onsuccess = () => {
          const transaction = open.result.transaction("kv", op === "get" ? "readonly" : "readwrite");
          const request = op === "get" ? transaction.objectStore("kv").get(k) : transaction.objectStore("kv").put(v, k);
          transaction.oncomplete = () => { open.result.close(); resolveIdb(op === "get" ? request.result : undefined); };
          transaction.onerror = () => rejectIdb(transaction.error);
        };
      }), [operation, key, value]);
      const storedName = async () => JSON.parse((await idb("get", productKey)) ?? "null")?.workspace?.product?.identity?.name;
      const openWorkspace = async () => {
        await replace.click('nav button[data-nav="workspace"]', { noWaitAfter: true });
        await replace.waitForSelector("[data-workspace-import]", { timeout: 10000 });
      };
      const download = async (selector, name) => {
        const [file] = await Promise.all([replace.waitForEvent("download"), replace.click(selector)]);
        const path = join(served, "..", `dist-pwa-smoke-${name}.json`);
        await file.saveAs(path);
        return path;
      };
      const chooseBackup = async (path) => {
        await replace.setInputFiles("[data-workspace-import]", path);
        await replace.waitForSelector("[data-workspace-import-preview]", { timeout: 10000 });
      };
      const paths = [];
      try {
        await replace.goto(`${origin}/`);
        await replace.waitForFunction(() => document.querySelector("#main")?.textContent?.includes("Replace original"), undefined, { timeout: 10000 });
        await openWorkspace();
        const originalPath = await download('[data-workspace-action="backup"]', "replace-original");
        paths.push(originalPath);

        // Later work changes the stored workspace after that backup was taken.
        const current = JSON.parse(await idb("get", productKey));
        current.workspace.product.identity.name = "Replace newer";
        await idb("put", productKey, JSON.stringify(current));
        await reload(replace);
        await replace.waitForFunction(() => document.querySelector("#main")?.textContent?.includes("Replace newer"), undefined, { timeout: 10000 });
        await openWorkspace();

        await chooseBackup(originalPath);
        const replaceEnabled = await replace.locator('[data-workspace-action="restore-replace"]').isEnabled();
        const emptyDisabled = await replace.locator('[data-workspace-action="restore-empty"]').isDisabled();
        check(replaceEnabled && emptyDisabled, "a backup of the same workspace offers replace-current, not empty-profile restore");

        await replace.click('[data-workspace-action="restore-replace"]');
        const refused = await replace.waitForFunction(() => /recovery point/i.test(document.querySelector("[data-workspace-action-error]")?.textContent ?? ""), undefined, { timeout: 5000 }).then(() => true, () => false);
        check(refused && (await storedName()) === "Replace newer", "replace-current restore without a recovery-point decision is refused and changes nothing");

        const recoveryPath = await download('section[aria-labelledby="restore-heading"] [data-workspace-action="recovery-point"]', "replace-recovery-point");
        paths.push(recoveryPath);
        const recovery = JSON.parse(await readFile(recoveryPath, "utf8"));
        check(recovery.contexts?.product?.product?.identity?.name === "Replace newer", "the recovery point captures the state about to be replaced");

        await replace.click('[data-workspace-action="restore-replace"]');
        await replace.waitForFunction(() => document.querySelector("#live-region")?.textContent?.includes("restored successfully"), undefined, { timeout: 10000 });
        check((await storedName()) === "Replace original", "replace-current restore overwrites the existing workspace durably in IndexedDB");
        await reload(replace);
        const survived = await replace.waitForFunction(() => document.querySelector("#main")?.textContent?.includes("Replace original"), undefined, { timeout: 10000 }).then(() => true, () => false);
        check(survived, "the replaced workspace survives reload");

        // The recovery point undoes the replacement through the same flow.
        await openWorkspace();
        await chooseBackup(recoveryPath);
        await replace.check("[data-workspace-restore-decline]");
        await replace.click('[data-workspace-action="restore-replace"]');
        await replace.waitForFunction(() => document.querySelector("#live-region")?.textContent?.includes("restored successfully"), undefined, { timeout: 10000 });
        check((await storedName()) === "Replace newer", "restoring the recovery point undoes the replacement");

        // Corrupt stored data fails closed at startup without being changed,
        // and recovery mode makes the Workspace screen reachable (#36).
        await idb("put", "viable.signals-inbox.replace-ws", "{corrupt");
        await reload(replace);
        const failedClosed = await replace.waitForFunction(() => /could not open the local workspace/i.test(document.body?.textContent ?? ""), undefined, { timeout: 10000 }).then(() => true, () => false);
        check(
          failedClosed && (await idb("get", "viable.signals-inbox.replace-ws")) === "{corrupt" && (await storedName()) === "Replace newer",
          "corrupt stored data fails closed at startup and nothing is changed",
        );
        await replace.click('[data-startup-action="recover"]');
        await replace.waitForSelector("[data-workspace-recovery-mode]", { timeout: 10000 });
        check(true, "startup failure offers workspace recovery mode");

        await chooseBackup(originalPath);
        const gated = await replace.locator("[data-workspace-restore-quarantine]").isVisible() && await replace.locator('[data-workspace-action="restore-replace"]').isDisabled();
        check(gated, "in recovery mode, replacing corrupt data is blocked until quarantine is exported");
        const quarantinePath = await download('[data-workspace-action="quarantine"]', "replace-quarantine");
        paths.push(quarantinePath);
        const quarantine = JSON.parse(await readFile(quarantinePath, "utf8"));
        check(quarantine.entries?.some((entry) => entry.raw === "{corrupt"), "quarantine export preserves the unreadable raw record");

        await chooseBackup(originalPath);
        const pointBlocked = await replace.locator('section[aria-labelledby="restore-heading"] [data-workspace-action="recovery-point"]').isDisabled();
        await replace.check("[data-workspace-restore-decline]");
        await replace.click('[data-workspace-action="restore-replace"]');
        await replace.waitForFunction(() => document.querySelector("#live-region")?.textContent?.includes("restored successfully"), undefined, { timeout: 10000 });
        check(
          pointBlocked && (await storedName()) === "Replace original" && (await idb("get", "viable.signals-inbox.replace-ws")) === undefined,
          "recovery mode replaces the corrupt workspace from a backup after an explicit decision",
        );
        await replace.click('[data-workspace-action="reload-app"]');
        const recovered = await replace.waitForFunction(() => document.querySelector("#main")?.textContent?.includes("Replace original") && !/could not open the local workspace/i.test(document.body?.textContent ?? ""), undefined, { timeout: 15000 }).then(() => true, () => false);
        check(recovered, "after recovery, Viable starts normally");
      } finally {
        for (const path of paths) await rm(path, { force: true });
        await replaceContext.close();
      }
    });

    // Seeded acceptance journeys (2026-10-07 local-dogfood QA). Each check
    // drives a defect that was reproduced in this production build: restore
    // and delete must show up without a reload, stale evidence must be
    // recheckable, a cancelled review must leave the record reviewable, and a
    // rejected import must say so and keep what the person pasted.
    await section("seeded acceptance journeys", async () => {
      const journeyContext = await browser.newContext({ viewport: { width: 1366, height: 768 } });
      const journey = await journeyContext.newPage();
      journey.on("pageerror", (error) => errors.push(`journey pageerror: ${error.message}`));
      const journeyDialogs = [];
      journey.on("dialog", (dialog) => { journeyDialogs.push(dialog.message()); void dialog.accept(); });
      const seedPath = resolve(process.cwd(), "docs/acceptance/seed/ux-acceptance-seed-v2.json");
      const malformed = await readFile(resolve(process.cwd(), "docs/acceptance/seed/malformed-signals-import.json"), "utf8");
      const go = async (view) => {
        await journey.click(`nav button[data-nav="${view}"]`, { noWaitAfter: true });
        await settled(journey);
      };
      const liveText = async () => (await journey.locator("#live-region").textContent()) ?? "";
      const focusedText = () => journey.evaluate(() => (document.activeElement?.textContent ?? "").replace(/\s+/g, " ").trim());
      try {
        await journey.goto(`${origin}/`);
        await settled(journey);
        await go("calendar");
        await journey.getByRole("button", { name: "Open Product to create or restore a workspace" }).click();
        await settled(journey);
        check(await journey.locator('form[data-form="create-workspace"]').isVisible(), "an empty-profile workflow screen links to where a workspace can be created");

        await go("workspace");
        await journey.setInputFiles("[data-workspace-import]", seedPath);
        await journey.waitForSelector("[data-workspace-import-preview]", { timeout: 10000 });
        await journey.click('[data-workspace-action="restore-empty"]');
        await journey.waitForFunction(() => document.querySelector("#live-region")?.textContent?.includes("restored successfully"), undefined, { timeout: 15000 });
        await go("home");
        const restoredHome = await journey.waitForFunction(() => document.querySelectorAll("[data-home-attention-item]").length >= 8, undefined, { timeout: 5000 }).then(() => true, () => false);
        check(restoredHome && !(await journey.locator('form[data-form="create-workspace"]').count()), "Home shows the restored workspace without a reload");
        const openNames = await journey.locator("[data-home-attention-item] button[data-home-attention-open]").evaluateAll((buttons) => buttons.map((button) => button.getAttribute("aria-label")));
        check(openNames.length > 1 && new Set(openNames).size === openNames.length, "every Home open control has a distinct accessible name");

        // Views reload their workspace before rendering; Back and Forward must
        // still land on exactly the previous and next pages.
        for (const view of ["product", "signals", "home"]) await go(view);
        const current = async () => (await journey.locator('nav button[data-nav][aria-current="page"]').getAttribute("data-nav")) ?? "";
        const step = async (direction) => {
          await (direction === "back" ? journey.goBack() : journey.goForward());
          await settled(journey);
          return current();
        };
        const walked = [await step("back"), await step("back"), await step("forward"), await step("forward")];
        check(walked.join(",") === "signals,product,signals,home", `Back and Forward return to the exact previous pages (${walked.join(" → ")})`);

        await journey.click('[data-home-attention-open="product:evidence:evidence-4"]');
        await settled(journey);
        const stale = journey.locator("#main article", { hasText: "Agency pricing objection notes" }).first();
        await stale.locator('input[name="reviewer"]').fill("Smoke Reviewer");
        await stale.getByRole("button", { name: "Still valid: set next review" }).click();
        const keptReviewer = await stale.locator('input[name="reviewer"]').inputValue();
        check(keptReviewer === "Smoke Reviewer" && await stale.locator('input[name="nextFreshnessReviewAt"]').evaluate((input) => !input.checkValidity()), "a recheck without a future date is refused in place and keeps the reviewer");
        const nextYear = `${new Date().getFullYear() + 1}-06-30`;
        await stale.locator('input[name="nextFreshnessReviewAt"]').fill(nextYear);
        await stale.getByRole("button", { name: "Still valid: set next review" }).click();
        await journey.waitForFunction(() => document.querySelector("#live-region")?.textContent?.includes("Evidence rechecked"), undefined, { timeout: 10000 });
        await go("home");
        check(!(await journey.locator('[data-home-attention-open="product:evidence:evidence-4"]').count()), "rechecked evidence leaves Home's stale-evidence blockers");

        await go("product");
        const forum = journey.locator("#main article", { hasText: "Freelancer forum thread about invoice chasing" }).first();
        const accept = forum.getByRole("button", { name: "Accept with named review" });
        await accept.click();
        await forum.getByRole("button", { name: "Cancel review" }).click();
        check(await accept.isVisible() && (await focusedText()) === "Accept with named review", "cancelling a review restores the record's review controls and returns focus to them");
        await accept.click();
        await journey.keyboard.press("Escape");
        check(!(await forum.locator("[data-contextual-review]").count()) && await accept.isVisible(), "Escape closes a review panel without changing the record");

        await go("signals");
        const advanced = journey.locator("summary", { hasText: "Advanced: raw JSON adapter imports" }).first();
        const sources = journey.locator("summary", { hasText: "Manage evidence sources" }).first();
        if (!(await advanced.isVisible())) await sources.click();
        await advanced.click();
        const raw = journey.locator('form[data-form="signals-manual-import"]');
        await raw.locator('textarea[name="payload"]').fill(malformed);
        await raw.locator('button[type="submit"]').click();
        await journey.waitForFunction(() => /failed/i.test(document.querySelector("#live-region")?.textContent ?? ""), undefined, { timeout: 10000 }).catch(() => undefined);
        await settled(journey);
        const rawPayload = journey.locator('form[data-form="signals-manual-import"] textarea[name="payload"]');
        check(/failed/i.test(await liveText()) && await rawPayload.isVisible() && (await rawPayload.inputValue()) === malformed, "a rejected import is reported as failed and keeps the pasted payload visible");

        // Actions that ask for a value use inline, labelled forms (#147).
        const dialogsBefore = journeyDialogs.length;
        const competitor = journey.locator("#main article", { hasText: "Competitor announces automatic receipt capture" }).first();
        await competitor.getByRole("button", { name: "Tag", exact: true }).click();
        const tagPanel = journey.locator("[data-inline-input]");
        const tagField = tagPanel.locator('input[name="tags"]');
        const fieldFocused = await tagField.evaluate((input) => input === document.activeElement).catch(() => false);
        await tagField.fill("smoke-tag");
        await tagPanel.locator('button[type="submit"]').click();
        await journey.waitForFunction(() => document.querySelector("#live-region")?.textContent?.includes("Signal tags updated"), undefined, { timeout: 10000 }).catch(() => undefined);
        await settled(journey);
        const tagged = ((await journey.locator("#main article", { hasText: "Competitor announces automatic receipt capture" }).first().textContent()) ?? "").includes("smoke-tag");
        check(fieldFocused && tagged && journeyDialogs.length === dialogsBefore, "tagging a signal uses an inline form, not a browser dialog, and records the tag");

        // A two-field inline form must answer the controller's prompts in
        // order: reviewer, then note (#147).
        await go("calendar");
        const fillRequired = async (form) => {
          for (const field of await form.locator("input[required], textarea[required]").all()) {
            if (await field.inputValue()) continue;
            const type = await field.getAttribute("type");
            if (type === "checkbox") await field.check();
            else await field.fill(type === "datetime-local" ? "2026-11-02T10:00" : type === "number" ? "1" : type === "time" ? "09:00" : "Smoke Owner");
          }
        };
        const policy = journey.locator('form[data-form="publication-policy"]');
        await fillRequired(policy);
        await policy.locator('button[type="submit"]').click();
        await settled(journey);
        const stock = journey.locator('form[data-form="publication-inventory-item"]');
        await fillRequired(stock);
        await stock.locator('button[type="submit"]').click();
        await settled(journey);
        await journey.locator('[data-publication-action="submit-publication-item"]').first().click();
        await settled(journey);
        await journey.locator('[data-publication-action="review-publication-item"][data-decision="approved"]').first().click();
        const reviewPanel = journey.locator("[data-inline-input]");
        const reviewer = reviewPanel.locator('input[name="actor"]');
        await journey.waitForFunction(() => document.querySelector('[data-inline-input] input[name="actor"]')?.value === "Morgan Reyes", undefined, { timeout: 5000 }).catch(() => undefined);
        const prefilled = await reviewer.inputValue();
        await reviewer.fill("Smoke Reviewer");
        await reviewPanel.locator('textarea[name="note"]').fill("Smoke review note: content, destination, timing, rights.");
        await reviewPanel.locator('button[type="submit"]').click();
        await journey.waitForFunction(() => document.querySelector("#live-region")?.textContent?.includes("approved and stocked"), undefined, { timeout: 10000 }).catch(() => undefined);
        await settled(journey);
        const stocked = (await journey.locator("#main").textContent()) ?? "";
        check(prefilled === "Morgan Reyes" && stocked.includes("Smoke Reviewer ·") && stocked.includes("Review note: Smoke review note"), `a two-field inline review records reviewer and note in order (prefilled ${prefilled || "nothing"})`);
        check(journeyDialogs.length === dialogsBefore, "no browser dialog opened for inline-form actions");

        await journey.setViewportSize({ width: 640, height: 360 });
        for (const view of ["product", "studio", "workspace"]) {
          await go(view);
          const sideways = await journey.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
          check(!sideways, `at 640×360 CSS px (about 200% zoom) ${view} does not scroll sideways`);
        }
        await journey.setViewportSize({ width: 1366, height: 768 });

        await go("workspace");
        const deletion = journey.locator("[data-workspace-delete]");
        await deletion.locator('[name="scopeConfirmed"]').check();
        await deletion.locator('[name="declineRecoveryPoint"]').check();
        await deletion.locator('[name="confirmation"]').fill("DELETE");
        await deletion.locator('button[type="submit"]').click();
        await journey.waitForFunction(() => document.querySelector("#live-region")?.textContent?.includes("deletion completed"), undefined, { timeout: 10000 });
        await go("home");
        check(await journey.locator('form[data-form="create-workspace"]').isVisible() && !((await journey.locator("#main").textContent()) ?? "").includes("Ledgerly"), "Home stops showing a deleted workspace without a reload");
      } finally {
        await journeyContext.close();
      }
    });

    // Browser storage durability (#36): what this engine reports, and what
    // Viable does when the browser clears or refuses storage. Real eviction
    // under storage pressure cannot be triggered on demand, so it is simulated
    // by clearing the origin's storage, which is what eviction does.
    await section("storage durability and eviction recovery", async () => {
      const evictContext = await browser.newContext({ acceptDownloads: true });
      const evict = await evictContext.newPage();
      evict.on("pageerror", (error) => errors.push(`eviction pageerror: ${error.message}`));
      evict.on("dialog", (dialog) => void dialog.accept());
      const workspace = { ...backup.contexts.product, id: "evict-ws", product: { ...backup.contexts.product.product, identity: { ...backup.contexts.product.product.identity, name: "Eviction product" } } };
      await evict.addInitScript((value) => {
        if (location.pathname === "/" && !sessionStorage.getItem("viable-smoke-seeded")) {
          sessionStorage.setItem("viable-smoke-seeded", "1");
          localStorage.setItem("viable.product-workspace.evict-ws", JSON.stringify({ schemaVersion: 1, workspace: value }));
          localStorage.setItem("viable.product-workspace.active", "evict-ws");
        }
      }, workspace);
      const backupPath = join(served, "..", "dist-pwa-smoke-eviction-backup.json");
      try {
        await evict.goto(`${origin}/`);
        await evict.waitForFunction(() => document.querySelector("#main")?.textContent?.includes("Eviction product"), undefined, { timeout: 10000 });

        const facts = await evict.evaluate(async () => {
          const persisted = typeof navigator.storage?.persisted === "function" ? await navigator.storage.persisted() : null;
          const estimate = typeof navigator.storage?.estimate === "function" ? await navigator.storage.estimate().catch(() => null) : null;
          const request = typeof navigator.storage?.persist === "function"
            ? await Promise.race([navigator.storage.persist().then(String, (error) => `error: ${error?.name}`), new Promise((done) => setTimeout(() => done("no answer within 5s"), 5000))])
            : "unavailable";
          return { persistedAtStart: persisted, usage: estimate?.usage ?? null, quota: estimate?.quota ?? null, persistRequest: request };
        });
        storageDurabilityReport = facts;
        console.log(`Storage durability: ${JSON.stringify(facts)}`);
        await evict.click('nav button[data-nav="workspace"]', { noWaitAfter: true });
        await evict.waitForSelector("[data-storage-persistence]", { timeout: 10000 });
        const shown = await evict.locator("[data-storage-persistence]").getAttribute("data-storage-persistence");
        const persistedNow = await evict.evaluate(async () => (typeof navigator.storage?.persisted === "function" ? navigator.storage.persisted() : null));
        const expected = persistedNow === null ? "unknown" : persistedNow ? "persisted" : "best_effort";
        check(shown === expected || (facts.persistedAtStart === false && persistedNow === true), `runtime panel reports this browser's storage persistence truthfully (${shown}; browser says ${expected})`);

        const [file] = await Promise.all([evict.waitForEvent("download"), evict.click('[data-workspace-action="backup"]')]);
        await file.saveAs(backupPath);

        // Eviction: the browser clears this origin's storage while Viable is
        // closed. Close the app page first: a page merely navigated away from
        // can keep its IndexedDB connection alive in the back/forward cache
        // (Firefox), which blocks the deletion. The rest continues on a new
        // page without the seeding script.
        await evict.close();
        const after = await evictContext.newPage();
        after.on("pageerror", (error) => errors.push(`eviction pageerror: ${error.message}`));
        after.on("dialog", (dialog) => void dialog.accept());
        await after.goto(`${origin}${ENGINE_CONTROL_PATH}`);
        // The deletion request's own events are not the evidence: in Firefox a
        // just-closed page can hold its connection for a while, so the request
        // reports "blocked" and completes only later. What matters is the
        // outcome, checked below after Viable restarts.
        const deletion = await after.evaluate(() => new Promise((done) => {
          localStorage.clear();
          const timer = setTimeout(() => done("pending (connection still held)"), 5000);
          const request = indexedDB.deleteDatabase("viable-workspace");
          request.onsuccess = () => { clearTimeout(timer); done("completed"); };
          request.onerror = () => { clearTimeout(timer); done(`error: ${request.error?.name}`); };
        }));
        console.log(`Eviction deletion request: ${deletion}`);
        await after.goto(`${origin}/`);
        const freshStart = await after.waitForFunction(() => {
          const text = document.body?.textContent ?? "";
          return document.querySelector("#main form") && !text.includes("Eviction product") && !/could not (be )?open/i.test(text);
        }, undefined, { timeout: 20000 }).then(() => true, () => false);
        const leftover = await after.evaluate(() => new Promise((done) => {
          const local = Object.keys(localStorage).filter((key) => key.includes("evict-ws"));
          const open = indexedDB.open("viable-workspace");
          open.onerror = () => done({ local, indexedDB: [`open failed: ${open.error?.name}`] });
          open.onsuccess = () => {
            const db = open.result;
            if (!db.objectStoreNames.contains("kv")) { db.close(); done({ local, indexedDB: [] }); return; }
            const keys = db.transaction("kv", "readonly").objectStore("kv").getAllKeys();
            keys.onsuccess = () => { db.close(); done({ local, indexedDB: keys.result.filter((key) => String(key).includes("evict-ws")) }); };
            keys.onerror = () => { db.close(); done({ local, indexedDB: ["read failed"] }); };
          };
        }));
        check(
          !deletion.startsWith("error") && leftover.local.length === 0 && leftover.indexedDB.length === 0,
          `origin storage cleared to simulate eviction: no evicted record survives (${JSON.stringify(leftover)}; deletion request ${deletion})`,
        );
        check(freshStart, "after eviction Viable starts as a clean, empty profile without errors or stale data");

        await after.click('nav button[data-nav="workspace"]', { noWaitAfter: true });
        await after.waitForSelector("[data-workspace-import]", { timeout: 10000 });
        await after.setInputFiles("[data-workspace-import]", backupPath);
        await after.waitForSelector("[data-workspace-import-preview]", { timeout: 10000 });
        await after.click('[data-workspace-action="restore-empty"]');
        await after.waitForFunction(() => document.querySelector("#live-region")?.textContent?.includes("restored successfully"), undefined, { timeout: 10000 });
        await reload(after);
        const restored = await after.waitForFunction(() => document.querySelector("#main")?.textContent?.includes("Eviction product"), undefined, { timeout: 10000 }).then(() => true, () => false);
        check(restored, "a backup restores the workspace after eviction and survives reload");
      } finally {
        await rm(backupPath, { force: true });
        await evictContext.close();
      }
    });

    // Refused writes (#36): when an origin runs out of quota the browser
    // aborts the write transaction. Chromium's DevTools quota override changes
    // the reported quota but does not enforce it on IndexedDB writes (verified
    // with a 1 MB write), so the refusal is simulated by aborting Viable's
    // write transactions, in every engine. A refused save must be reported as
    // failed, never as saved, and must leave nothing half-written.
    await section("refused storage writes", async () => {
      const refuseContext = await browser.newContext();
      const refuse = await refuseContext.newPage();
      refuse.on("pageerror", (error) => errors.push(`refused-write pageerror: ${error.message}`));
      await refuse.addInitScript(() => {
        const open = IDBDatabase.prototype.transaction;
        IDBDatabase.prototype.transaction = function (...args) {
          const transaction = open.apply(this, args);
          if (globalThis.__viableSmokeRefuseWrites && args[1] === "readwrite") queueMicrotask(() => { try { transaction.abort(); } catch { /* already finished */ } });
          return transaction;
        };
      });
      try {
        await refuse.goto(`${origin}/`);
        await refuse.waitForSelector("#main form", { timeout: 10000 });
        await refuse.evaluate(() => { globalThis.__viableSmokeRefuseWrites = true; });
        const form = refuse.locator("#main form").first();
        for (const field of await form.locator("input[required], textarea[required]").all()) {
          const type = await field.getAttribute("type");
          if (type === "checkbox") await field.check();
          else if (!(await field.inputValue())) await field.fill("Refused product");
        }
        await form.locator('button[type="submit"]').first().click();
        const reported = await refuse.waitForFunction(() => /could not|not saved|failed/i.test(document.querySelector("#live-region")?.textContent ?? "") || document.querySelector("#main [role=alert]"), undefined, { timeout: 10000 }).then(() => true, () => false);
        const live = (await refuse.locator("#live-region").textContent()) ?? "";
        console.log(`Refused write outcome: ${live}`);
        check(reported && !/Product workspace created/.test(live), "a save the browser refuses is reported as failed, not as saved");
        await refuse.evaluate(() => { globalThis.__viableSmokeRefuseWrites = false; });
        await reload(refuse);
        const nothingKept = await refuse.waitForFunction(() => document.querySelector("#main form") && !(document.querySelector("#main")?.textContent ?? "").includes("Refused product"), undefined, { timeout: 10000 }).then(() => true, () => false);
        check(nothingKept, "a refused save leaves no half-written workspace after reload");
      } finally {
        await refuseContext.close();
      }
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
    await writeFile(`pwa-smoke-report-${BROWSER}.json`, `${JSON.stringify({ browser: BROWSER, version: browser.version(), support, storageAccess: storageAccessReport, storageDurability: storageDurabilityReport, results, limitations, errors: uniqueErrors }, null, 2)}\n`);
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
