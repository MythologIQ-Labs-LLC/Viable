// Keyboard-only acceptance for the production PWA build (#79 / #81).
//
// Machine evidence for the keyboard and zoom parts of the hands-on gate. It is
// not the human acceptance itself: a person still has to judge whether the
// journeys make sense with a keyboard and a screen reader.
//
// 1. From an empty profile, a person can create a workspace with the keyboard
//    alone: skip link, Tab between fields, arrow keys in a select, Enter to
//    submit; focus then lands in the workspace instead of being lost.
// 2. With the deterministic acceptance seed restored, every enabled view is
//    opened from the primary navigation with Enter, and every Tab stop in the
//    view is walked at 1366x768 and at 640x360 CSS px (about 200% zoom), with
//    reduced motion. Each stop must show a focus indicator, be on screen, not
//    be covered by other UI, not be zero-size, and not sit inside hidden or
//    inert UI. Tabbing must eventually leave the view (no keyboard trap).

import { createServer } from "node:http";
import { access, readFile, writeFile } from "node:fs/promises";
import { extname, join, normalize, resolve, sep } from "node:path";
import { chromium } from "playwright-core";
import { SECURITY_HEADERS } from "./pwa-security-headers.mjs";

const root = process.cwd();
const sourceDir = resolve(root, process.env.VIABLE_PWA_OUT ?? "dist-pwa");
const PORT = 4177;
const HOST = "localhost";
const ORIGIN = `http://${HOST}:${PORT}`;
const seedPath = resolve(root, "docs/acceptance/seed/ux-acceptance-seed-v2.json");
const reportPath = resolve(root, "pwa-keyboard-acceptance-report.json");
const VIEWPORTS = [
  { label: "1366x768", width: 1366, height: 768 },
  { label: "640x360 (about 200% zoom)", width: 640, height: 360 },
];
// Far more stops than any view has; reaching it means focus never left.
const MAX_STOPS_PER_VIEW = 600;
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

function startServer() {
  const server = createServer(async (request, response) => {
    const url = new URL(request.url ?? "/", ORIGIN);
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
    server.listen(PORT, HOST, () => {
      server.removeListener("error", rejectServer);
      resolveServer(server);
    });
  });
}

// Lets focus styles settle: reduced-motion CSS still runs near-zero
// transitions, so the first frame after focus can read a 0px outline.
const settle = (page) => page.evaluate(() => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))));

// Describes the focused element as a sighted keyboard user would meet it.
function focusState(page) {
  return page.evaluate(() => {
    const element = document.activeElement;
    if (!element || element === document.body || element === document.documentElement) return { none: true };
    const style = getComputedStyle(element);
    const outlined = style.outlineStyle !== "none" && parseFloat(style.outlineWidth) > 0;
    const rect = element.getBoundingClientRect();
    const x = Math.min(Math.max(rect.left + Math.min(rect.width / 2, 8), 0), innerWidth - 1);
    const y = Math.min(Math.max(rect.top + Math.min(rect.height / 2, 8), 0), innerHeight - 1);
    const hit = document.elementFromPoint(x, y);
    const labelled = element.labels ? [...element.labels].some((label) => label.contains(hit)) : false;
    const covered = Boolean(hit) && hit !== element && !element.contains(hit) && !hit.contains(element) && !labelled;
    const name = (element.getAttribute("aria-label") || element.labels?.[0]?.innerText || element.innerText || element.getAttribute("name") || element.tagName)
      .replace(/\s+/g, " ").trim().slice(0, 60);
    return {
      none: false,
      inMain: Boolean(element.closest("#main")),
      isMain: element.id === "main",
      label: `${element.tagName.toLowerCase()}${element.type ? `[${element.type}]` : ""} "${name}"`,
      indicator: outlined || style.boxShadow !== "none",
      zeroSize: rect.width === 0 || rect.height === 0,
      offscreen: rect.bottom <= 0 || rect.top >= innerHeight || rect.right <= 0 || rect.left >= innerWidth,
      coveredBy: covered ? `${hit.tagName.toLowerCase()}${hit.id ? `#${hit.id}` : ""}` : "",
      hidden: Boolean(element.closest("[hidden], [inert], [aria-hidden='true']")) || style.visibility === "hidden",
    };
  });
}

async function pressTab(page) {
  await page.keyboard.press("Tab");
  await settle(page);
  return focusState(page);
}

// Tabs forward until `matches` holds for the focused element.
async function tabUntil(page, matches, limit = 40) {
  for (let index = 0; index < limit; index += 1) {
    await pressTab(page);
    if (await page.evaluate(matches)) return true;
  }
  return false;
}

async function keyboardCreateWorkspace(page) {
  await page.goto(`${ORIGIN}/`);
  await page.waitForFunction(() => document.querySelector('form[data-form="create-workspace"]'), undefined, { timeout: 15_000 });
  await page.keyboard.press("Tab");
  check(await page.evaluate(() => document.activeElement?.classList.contains("skip-link")), "first Tab stop is the skip link");
  await page.keyboard.press("Enter");
  await settle(page);
  check(await page.evaluate(() => document.activeElement?.id === "main"), "the skip link moves focus to the workspace");

  const reachedName = await tabUntil(page, () => document.activeElement?.getAttribute("name") === "name");
  check(reachedName, "the product name field is reachable with Tab");
  await page.keyboard.type("Keyboard Ledger");
  await page.keyboard.press("Tab");
  await page.keyboard.type("Bookkeeping for small studios, created without a mouse.");
  await page.keyboard.press("Tab");
  await page.keyboard.press("ArrowDown");
  check(await page.evaluate(() => document.activeElement?.getAttribute("name") === "lifecycle" && document.activeElement.value === "prototype"), "the lifecycle select changes with the arrow keys");
  await page.keyboard.press("Tab");
  await page.keyboard.type("Keyboard Owner");
  await page.keyboard.press("Tab");
  await page.keyboard.type("Windows desktop");
  await page.keyboard.press("Tab");
  check(await page.evaluate(() => document.activeElement?.textContent?.trim() === "Create local workspace"), "Tab reaches the create button after the last field");
  await page.keyboard.press("Enter");
  const created = await page.waitForFunction(() => document.querySelector("#live-region")?.textContent?.includes("Product workspace created"), undefined, { timeout: 10_000 }).then(() => true, () => false);
  check(created, "Enter on the create button creates the workspace and announces it");
  await settle(page);
  const after = await focusState(page);
  check(!after.none && after.inMain, `after creating, focus stays in the workspace (${after.none ? "lost to the page body" : after.label})`);
  check(await page.inputValue('#main input[name="name"]').catch(() => "") === "Keyboard Ledger", "the created workspace holds the typed product name");
}

async function restoreSeed(page) {
  await page.goto(`${ORIGIN}/`);
  await page.waitForFunction(() => document.querySelectorAll("nav button[data-nav]").length > 0, undefined, { timeout: 15_000 });
  await page.click('nav button[data-nav="workspace"]', { noWaitAfter: true });
  await page.waitForSelector("[data-workspace-import]", { timeout: 10_000 });
  await page.setInputFiles("[data-workspace-import]", seedPath);
  await page.waitForSelector("[data-workspace-import-preview]");
  await page.click('[data-workspace-action="restore-empty"]');
  await page.waitForFunction(() => document.querySelector("#live-region")?.textContent?.includes("restored successfully"), undefined, { timeout: 15_000 });
  await page.reload();
  await page.waitForFunction(() => document.querySelectorAll("nav button[data-nav]").length > 0, undefined, { timeout: 15_000 });
}

async function walkView(page, view, viewport) {
  await page.focus(`nav button[data-nav="${view}"]`);
  await page.keyboard.press("Enter");
  await page.waitForFunction((name) => document.querySelector(`nav button[data-nav="${name}"]`)?.getAttribute("aria-current") === "page", view, { timeout: 10_000 });
  await settle(page);
  const landing = await focusState(page);
  check(!landing.none && (landing.isMain || landing.inMain), `${view} @${viewport.label}: Enter on the navigation moves focus into the view`);

  const problems = [];
  let stops = 0;
  let left = false;
  while (stops < MAX_STOPS_PER_VIEW) {
    const state = await pressTab(page);
    if (state.none || !state.inMain) {
      left = true;
      break;
    }
    stops += 1;
    if (state.zeroSize) problems.push(`zero-size Tab stop ${state.label}`);
    else if (state.hidden) problems.push(`Tab stop inside hidden or inert UI ${state.label}`);
    else if (state.offscreen) problems.push(`focused but off screen ${state.label}`);
    else if (state.coveredBy) problems.push(`focused ${state.label} is covered by ${state.coveredBy}`);
    if (!state.indicator) problems.push(`no visible focus indicator on ${state.label}`);
  }
  check(left, `${view} @${viewport.label}: Tab leaves the view after ${stops} stops (no keyboard trap)`);
  const unique = [...new Set(problems)];
  check(unique.length === 0, `${view} @${viewport.label}: every Tab stop is visible, uncovered and shows focus${unique.length ? ` — ${unique.slice(0, 8).join("; ")}` : ""}`);
  return { view, viewport: viewport.label, stops, problems: unique };
}

async function main() {
  const buildInfo = JSON.parse(await readFile(join(sourceDir, "build-info.json"), "utf8"));
  const seed = JSON.parse(await readFile(seedPath, "utf8"));
  if (seed.format !== "viable.workspace-backup" || !seed.workspaceId) throw new Error("Acceptance seed is not a usable Viable workspace backup");

  let server;
  let browser;
  const runtimeErrors = [];
  const views = [];
  try {
    server = await startServer();
    browser = await chromium.launch({ executablePath: await browserPath() });
    const newPage = async (label) => {
      const context = await browser.newContext({ viewport: VIEWPORTS[0], reducedMotion: "reduce" });
      context.setDefaultTimeout(15_000);
      const page = await context.newPage();
      // Restore asks for a native confirmation; this run confirms it.
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

    await keyboardCreateWorkspace(await newPage("create"));

    const seeded = await newPage("seeded");
    await restoreSeed(seeded);
    const enabled = await seeded.$$eval("nav button[data-nav]", (buttons) => buttons.filter((button) => !button.disabled).map((button) => button.dataset.nav));
    check(enabled.length >= 9, `the primary navigation offers every workflow view (${enabled.join(", ")})`);
    for (const viewport of VIEWPORTS) {
      await seeded.setViewportSize({ width: viewport.width, height: viewport.height });
      for (const view of enabled) views.push(await walkView(seeded, view, viewport));
    }

    check(runtimeErrors.length === 0, `no page or CSP errors occurred (${runtimeErrors.join("; ") || "none"})`);

    await writeFile(reportPath, JSON.stringify({
      format: "viable.pwa-keyboard-acceptance-evidence",
      version: 1,
      build: { version: buildInfo.version, buildId: buildInfo.buildId, commit: buildInfo.commit },
      origin: ORIGIN,
      boundary: "Machine keyboard and zoom evidence only; not the human keyboard, screen-reader or unfamiliar-user acceptance in #79/#81.",
      views,
      checks,
      errors: runtimeErrors,
    }, null, 2));

    if (failures.length) throw new Error(`PWA keyboard acceptance failed: ${failures.join("; ")}`);
    const total = views.reduce((sum, view) => sum + view.stops, 0);
    console.log(`Keyboard acceptance passed for build ${String(buildInfo.buildId).slice(0, 12)}: ${views.length} view walks, ${total} Tab stops.`);
  } finally {
    if (browser) await browser.close().catch(() => undefined);
    if (server) await new Promise((done) => server.close(() => done()));
  }
}

await main();
