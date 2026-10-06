// Reproducer for the WebKit renderer crash on the reload after a workspace
// restore (PR #124). It isolates the steps of the smoke's restore sequence:
// backup download, setInputFiles, restore parsing/writing, the confirm
// dialogs, a second same-origin tab, service-worker control, an extra
// IndexedDB connection, and the reload itself.
//
// Each variant runs in a freshly launched browser so one crash cannot
// contaminate another. A variant passes when the reload after its steps
// renders the workspace without a renderer crash.
//
//   PWA_BROWSER=webkit node scripts/pwa-restore-reload-probe.mjs
//
// Writes pwa-restore-reload-probe-<engine>.json. Exit code is 0 even when a
// variant crashes: this is a diagnostic, not a gate.

import { createServer } from "node:http";
import { access, readFile, writeFile, cp, rm } from "node:fs/promises";
import { extname, join, normalize, resolve, sep } from "node:path";
import { chromium, firefox, webkit } from "playwright-core";
import { SECURITY_HEADERS } from "./pwa-security-headers.mjs";

const source = resolve(process.cwd(), process.env.VIABLE_PWA_OUT ?? "dist-pwa");
const served = resolve(process.cwd(), "dist-pwa-probe");
const ORIGIN = "http://localhost:4175";
const BROWSER = process.env.PWA_BROWSER ?? "webkit";
const RUNS = Number(process.env.PROBE_RUNS ?? 3);
// PROBE_VARIANTS (regex over variant names) and PROBE_SERVICE_WORKERS
// ("allow,block") narrow a run.
const ENGINES = { chromium, firefox, webkit };
const TYPES = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".json": "application/json", ".webmanifest": "application/manifest+json", ".png": "image/png",
};

function startServer() {
  const server = createServer(async (request, response) => {
    const url = new URL(request.url ?? "/", "http://localhost");
    // An app-free page, to tell engine behavior from Viable's own code.
    if (url.pathname === "/__probe-blank.html") {
      response.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-cache" }).end("<!doctype html><title>blank</title><p id=blank>blank page</p>");
      return;
    }
    const file = join(served, normalize(decodeURIComponent(url.pathname === "/" ? "/index.html" : url.pathname)));
    if (!file.startsWith(served + sep)) { response.writeHead(403).end(); return; }
    try {
      const body = await readFile(file);
      const headers = { ...SECURITY_HEADERS, "Content-Type": TYPES[extname(file)] ?? "application/octet-stream", "Cache-Control": "no-cache" };
      headers["Content-Security-Policy"] = headers["Content-Security-Policy"].replace("; upgrade-insecure-requests", "");
      delete headers["Strict-Transport-Security"];
      response.writeHead(200, headers).end(body);
    } catch {
      response.writeHead(404).end();
    }
  });
  return new Promise((resolveServer) => server.listen(4175, "localhost", () => resolveServer(server)));
}

async function chromePath() {
  for (const candidate of [process.env.CHROME_PATH, "/opt/pw-browsers/chromium-1194/chrome-linux/chrome", "/usr/bin/chromium"].filter(Boolean)) {
    try { await access(candidate); return candidate; } catch { /* next */ }
  }
  return undefined;
}

const hasProduct = (page) => page.waitForFunction(() => document.querySelector("#main")?.textContent?.includes("Probe product"), undefined, { timeout: 10000 });

async function createWorkspace(page) {
  await page.waitForFunction(() => document.querySelectorAll("nav button[data-nav]").length > 0);
  await page.waitForTimeout(1500);
  const form = page.locator("#main form").first();
  for (const field of await form.locator("input[required], textarea[required]").all()) {
    if (await field.getAttribute("type") === "checkbox") await field.check();
    else if (!(await field.inputValue())) await field.fill("Probe product");
  }
  await form.locator('button[type="submit"]').first().click();
  await page.waitForFunction(() => document.querySelector("#live-region")?.textContent?.includes("Product workspace created"));
}

async function openWorkspaceView(page) {
  await page.click('nav button[data-nav="workspace"]', { noWaitAfter: true });
  await page.waitForSelector('[data-workspace-action="backup"], [data-workspace-import]');
}

async function downloadBackup(page, path) {
  await openWorkspaceView(page);
  const [download] = await Promise.all([page.waitForEvent("download"), page.click('[data-workspace-action="backup"]')]);
  await download.saveAs(path);
}

async function deleteWorkspace(page) {
  await page.check('[data-workspace-delete] input[name="scopeConfirmed"]');
  await page.fill('[data-workspace-delete] input[name="confirmation"]', "DELETE");
  await page.click('[data-workspace-delete] button[type="submit"]');
  await page.waitForFunction(() => document.querySelector("#live-region")?.textContent?.includes("deletion completed"), undefined, { timeout: 10000 });
}

async function restore(page, path) {
  await page.setInputFiles("[data-workspace-import]", path);
  await page.waitForSelector("[data-workspace-import-preview]", { timeout: 10000 });
  await page.click('[data-workspace-action="restore-empty"]');
  await page.waitForFunction(() => document.querySelector("#live-region")?.textContent?.includes("restored successfully"), undefined, { timeout: 10000 });
}

// The smoke inspects IndexedDB from the page with a second connection.
const idbKeys = (page) => page.evaluate(() => new Promise((resolveKeys, rejectKeys) => {
  const open = indexedDB.open("viable-workspace");
  open.onsuccess = () => {
    const request = open.result.transaction("kv", "readonly").objectStore("kv").getAllKeys();
    request.onsuccess = () => { resolveKeys(request.result.length); open.result.close(); };
    request.onerror = () => rejectKeys(request.error);
  };
  open.onerror = () => rejectKeys(open.error);
}));

// The smoke's navigation phase: every view-to-view transition, paced to stay
// under WebKit's history-write limit, then Back.
async function navigateAllTransitions(page, limit = Infinity, { back = true } = {}) {
  const views = await page.$$eval("nav button[data-nav]", (buttons) => buttons.map((button) => button.dataset.nav));
  let transitions = 0;
  for (const from of views) {
    for (const to of views) {
      if (from === to || transitions >= limit) continue;
      transitions += 1;
      await page.waitForTimeout(120);
      await page.click(`nav button[data-nav="${from}"]`, { noWaitAfter: true });
      await page.waitForTimeout(120);
      await page.click(`nav button[data-nav="${to}"]`, { noWaitAfter: true });
      await page.waitForFunction((nav) => location.hash === `#${nav}`, to, { timeout: 4000 }).catch(() => undefined);
    }
  }
  if (back) {
    await page.goBack();
    await page.waitForTimeout(300);
  }
}

// App-free history writes on the blank page.
async function blankHistory(page, { back, viaHash, count = 10 }) {
  await page.evaluate(async ({ viaHash: hashOnly, count: total }) => {
    for (let index = 0; index < total; index += 1) {
      if (hashOnly) location.hash = `entry-${index}`; else history.pushState({ entry: index }, "", `#entry-${index}`);
      await new Promise((resolveWait) => setTimeout(resolveWait, 150));
    }
  }, { viaHash, count });
  if (back) { await page.goBack(); await page.waitForTimeout(300); }
}

// Every variant starts from a service-worker-controlled page with a saved
// workspace (unless noted) and ends with the reload under test.
const VARIANTS = {
  "baseline: workspace, reload": async () => {},
  "accepted confirm() dialog, reload": async ({ page }) => {
    await page.evaluate(() => { window.confirm("probe"); });
  },
  "backup download, reload": async ({ page, path }) => { await downloadBackup(page, path); },
  "backup download + setInputFiles preview (no restore), reload": async ({ page, path }) => {
    await downloadBackup(page, path);
    await page.setInputFiles("[data-workspace-import]", path);
    await page.waitForSelector("[data-workspace-import-preview]", { timeout: 10000 });
  },
  "extra page IndexedDB connection, reload": async ({ page }) => { await idbKeys(page); },
  "delete (confirm dialog), reload": async ({ page, path }) => {
    await downloadBackup(page, path);
    await deleteWorkspace(page);
    return { expectEmpty: true };
  },
  "full: download, delete, setInputFiles, restore, reload": async ({ page, path }) => {
    await downloadBackup(page, path);
    await deleteWorkspace(page);
    await restore(page, path);
  },
  "full, confirm() stubbed in page (no Playwright dialog), reload": async ({ page, path }) => {
    await page.evaluate(() => { window.confirm = () => true; });
    await downloadBackup(page, path);
    await deleteWorkspace(page);
    await restore(page, path);
  },
  "full + extra IndexedDB connections (as the smoke does), reload": async ({ page, path }) => {
    await idbKeys(page);
    await downloadBackup(page, path);
    await deleteWorkspace(page);
    await idbKeys(page);
    await restore(page, path);
    await idbKeys(page);
  },
  "full with a second same-origin tab open, reload": async ({ page, path, context }) => {
    const second = await context.newPage();
    await second.goto(`${ORIGIN}/`);
    await hasProduct(second);
    await downloadBackup(page, path);
    await deleteWorkspace(page);
    await restore(page, path);
  },
  "72 view transitions + Back, reload (no restore)": async ({ page }) => { await navigateAllTransitions(page); },
  "72 view transitions + Back, then full restore, reload": async ({ page, path }) => {
    await navigateAllTransitions(page);
    await downloadBackup(page, path);
    await deleteWorkspace(page);
    await restore(page, path);
  },
  "10 view transitions + Back, reload": async ({ page }) => { await navigateAllTransitions(page, 10); },
  "pushState x150 (no app navigation), reload": async ({ page }) => {
    await page.evaluate(async () => {
      for (let index = 0; index < 150; index += 1) {
        try { history.pushState(null, "", `#probe-${index}`); } catch { /* throttled */ }
        await new Promise((resolveWait) => setTimeout(resolveWait, 150));
      }
    });
  },
  "10 view transitions, no Back, reload": async ({ page }) => {
    await navigateAllTransitions(page, 10, { back: false });
    return { anyView: true };
  },
  "1 view transition + Back, reload": async ({ page }) => { await navigateAllTransitions(page, 1); },
  "pushState x10 + Back (app page), reload": async ({ page }) => {
    await page.evaluate(() => { for (let index = 0; index < 10; index += 1) history.pushState({ probe: index }, "", `#probe-${index}`); });
    await page.goBack();
    await page.waitForTimeout(300);
  },
  "blank page (no app): pushState x10 + Back, reload": async ({ page }) => blankHistory(page, { back: true, viaHash: false }),
  "blank page (no app): location.hash x10 + Back, reload": async ({ page }) => blankHistory(page, { back: true, viaHash: true }),
  "blank page (no app): pushState x10, no Back, reload": async ({ page }) => blankHistory(page, { back: false, viaHash: false }),
  "blank page (no app): pushState x1 + Back, reload": async ({ page }) => blankHistory(page, { back: true, viaHash: false, count: 1 }),
  "full, reload via goto instead of reload": async ({ page, path }) => {
    await downloadBackup(page, path);
    await deleteWorkspace(page);
    await restore(page, path);
    return { goto: true };
  },
};

async function runVariant(name, body, { serviceWorkers }) {
  const launch = BROWSER === "chromium" ? { executablePath: await chromePath() } : {};
  const browser = await ENGINES[BROWSER].launch(launch);
  const context = await browser.newContext({ serviceWorkers, acceptDownloads: true });
  context.setDefaultTimeout(15_000);
  const page = await context.newPage();
  const events = [];
  let crashed = false;
  page.on("crash", () => { crashed = true; events.push("page crash event"); });
  page.on("pageerror", (error) => events.push(`pageerror: ${error.message}`));
  page.on("dialog", (dialog) => { events.push(`dialog: ${dialog.type()}`); void dialog.accept(); });
  const path = join(served, "..", `dist-pwa-probe-backup-${process.pid}.json`);
  let stage = "load";
  try {
    if (name.startsWith("blank page")) {
      await page.goto(`${ORIGIN}/__probe-blank.html`);
      stage = "steps";
      await body({ page, path, context });
      stage = "reload";
      await page.reload();
      stage = "render after reload";
      await page.waitForSelector("#blank", { timeout: 10000 });
      return { outcome: "ok", stage: "done", events };
    }
    await page.goto(`${ORIGIN}/`);
    if (serviceWorkers === "allow") {
      stage = "service worker";
      await page.evaluate(async () => { await navigator.serviceWorker.ready; });
      await page.reload();
      if (!await page.evaluate(() => Boolean(navigator.serviceWorker.controller))) events.push("page not service-worker controlled");
    }
    stage = "create workspace";
    await createWorkspace(page);
    stage = "steps";
    const how = (await body({ page, path, context })) ?? {};
    stage = "reload";
    if (how.goto) await page.goto(page.url()); else await page.reload();
    stage = "render after reload";
    if (how.anyView) await page.waitForFunction(() => document.querySelectorAll("nav button[data-nav]").length > 0 && document.querySelector("#main")?.getAttribute("aria-busy") !== "true", undefined, { timeout: 10000 });
    else if (how.expectEmpty) await page.waitForFunction(() => document.querySelectorAll("nav button[data-nav]").length > 0 && !document.querySelector("#main")?.textContent?.includes("Probe product"), undefined, { timeout: 10000 });
    else await hasProduct(page);
    return { outcome: "ok", stage: "done", events };
  } catch (error) {
    return { outcome: crashed ? "renderer crash" : "error", stage, error: String(error?.message ?? error).split("\n")[0], events };
  } finally {
    await browser.close().catch(() => undefined);
    await rm(path, { force: true });
  }
}

await rm(served, { recursive: true, force: true });
await cp(source, served, { recursive: true });
const server = await startServer();
const report = { browser: BROWSER, runsPerVariant: RUNS, variants: [] };
try {
  const only = process.env.PROBE_VARIANTS ? new RegExp(process.env.PROBE_VARIANTS) : undefined;
  for (const serviceWorkers of (process.env.PROBE_SERVICE_WORKERS ?? "allow,block").split(",")) {
    for (const [name, body] of Object.entries(VARIANTS)) {
      if (only && !only.test(name)) continue;
      const label = `${name} [service workers: ${serviceWorkers}]`;
      const runs = [];
      for (let run = 0; run < RUNS; run += 1) runs.push(await runVariant(name, body, { serviceWorkers }));
      const failed = runs.filter((entry) => entry.outcome !== "ok").length;
      console.log(`${failed ? "FAIL" : "ok  "} ${failed}/${RUNS} ${label}`);
      for (const entry of runs.filter((item) => item.outcome !== "ok")) console.log(`       ${entry.outcome} at ${entry.stage}: ${entry.error} ${entry.events.join("; ")}`);
      report.variants.push({ variant: label, failed, runs });
    }
  }
} finally {
  server.close();
  await rm(served, { recursive: true, force: true });
  await writeFile(`pwa-restore-reload-probe-${BROWSER}.json`, `${JSON.stringify(report, null, 2)}\n`);
}
