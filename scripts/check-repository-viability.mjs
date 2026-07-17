import { execFileSync } from "node:child_process";
import { readFile, stat } from "node:fs/promises";
import { dirname, relative, resolve, sep } from "node:path";

const root = process.cwd();
const failures = [];
const read = (path) => readFile(resolve(root, path), "utf8");
const gitFiles = (...patterns) => execFileSync("git", ["ls-files", "--", ...patterns], { encoding: "utf8" }).split("\n").filter(Boolean);
const requireCondition = (condition, message) => { if (!condition) failures.push(message); };

const packageJson = JSON.parse(await read("package.json"));
const tauriConfig = JSON.parse(await read("apps/desktop/src-tauri/tauri.conf.json"));
const cargoToml = await read("apps/desktop/src-tauri/Cargo.toml");
const cargoVersion = cargoToml.match(/^version\s*=\s*"([^"]+)"/m)?.[1];
const rustVersion = cargoToml.match(/^rust-version\s*=\s*"([^"]+)"/m)?.[1];

requireCondition(packageJson.version === tauriConfig.version, "package.json and tauri.conf.json versions must match");
requireCondition(packageJson.version === cargoVersion, "package.json and Cargo.toml versions must match");
requireCondition(packageJson.engines?.node === ">=22", "The declared Node runtime contract must remain explicit");
requireCondition(rustVersion === "1.88", "Cargo.toml rust-version must remain synchronized with the validated minimum toolchain");
requireCondition(packageJson.scripts?.build?.includes("clean:core"), "Core builds must remove stale output before compilation");
requireCondition(packageJson.scripts?.["desktop:web"]?.includes("clean:desktop"), "Desktop web builds must remove stale output before compilation");

const gitignore = await read(".gitignore");
requireCondition(gitignore.split(/\r?\n/).includes("dist/"), "dist must remain ignored");
requireCondition(gitignore.split(/\r?\n/).includes("apps/desktop/web/generated/"), "desktop generated output must remain ignored");
const trackedGenerated = gitFiles("dist/**", "apps/desktop/web/generated/**");
requireCondition(trackedGenerated.length === 0, `Generated build output must not be tracked: ${trackedGenerated.join(", ")}`);

const desktopWorkflow = await read(".github/workflows/desktop.yml");
for (const requiredPath of ['- "src/**"', '- "tsconfig.json"', '- "scripts/clean-build.mjs"']) {
  const count = desktopWorkflow.split(requiredPath).length - 1;
  requireCondition(count >= 2, `Desktop workflow must cover ${requiredPath.slice(2)} for pull requests and main pushes`);
}
requireCondition(desktopWorkflow.includes('toolchain: "1.88.0"'), "Desktop CI must validate the declared Rust minimum version");

const csp = tauriConfig.app?.security?.csp ?? "";
for (const directive of ["default-src 'self'", "img-src 'self' data:", "style-src 'self'", "script-src 'self'"]) {
  requireCondition(csp.includes(directive), `Tauri CSP is missing ${directive}`);
}
requireCondition(!csp.includes("'unsafe-inline'"), "Tauri CSP must not allow unsafe-inline");
requireCondition(!csp.includes("'unsafe-eval'"), "Tauri CSP must not allow unsafe-eval");

const storageFiles = [
  "apps/desktop/ui/local-storage-product-workspace-store.ts",
  "apps/desktop/ui/local-storage-signals-inbox-store.ts",
  "apps/desktop/ui/local-storage-campaign-workspace-store.ts",
  "apps/desktop/ui/local-storage-repository-growth-store.ts",
  "apps/desktop/ui/local-storage-video-production-store.ts",
  "apps/desktop/ui/local-storage-activation-learning-store.ts",
  "apps/desktop/ui/local-storage-website-watch-store.ts",
];
for (const path of storageFiles) {
  const content = await read(path);
  requireCondition(content.includes("readWorkspaceJson"), `${path} must use shared local-storage integrity validation`);
  requireCondition(content.includes("writeWorkspaceJson"), `${path} must use shared local-storage write error handling`);
  requireCondition(!content.includes("JSON.parse"), `${path} must not cast unchecked JSON directly into an authority workspace`);
}

async function exists(path) {
  try { await stat(path); return true; } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") return false;
    throw error;
  }
}

function destinations(markdown) {
  const values = [];
  for (const match of markdown.matchAll(/!?\[[^\]]*\]\(([^)]+)\)/g)) values.push(match[1]);
  for (const match of markdown.matchAll(/^\s*\[[^\]]+\]:\s*(\S+)/gm)) values.push(match[1]);
  return values;
}

for (const path of gitFiles("*.md", "docs/**/*.md")) {
  const markdown = await read(path);
  for (let destination of destinations(markdown)) {
    destination = destination.trim();
    if (destination.startsWith("<") && destination.endsWith(">")) destination = destination.slice(1, -1);
    if (!destination || destination.startsWith("#") || /^(?:https?:|mailto:|data:)/i.test(destination)) continue;
    destination = destination.split("#", 1)[0].split("?", 1)[0];
    if (!destination) continue;
    try { destination = decodeURIComponent(destination); } catch { failures.push(`${path} contains an invalid encoded link: ${destination}`); continue; }
    if (destination.startsWith("/")) { failures.push(`${path} uses unsupported repository-absolute link ${destination}`); continue; }
    const target = resolve(root, dirname(path), destination);
    const escaped = relative(root, target).split(sep)[0] === "..";
    if (escaped) { failures.push(`${path} link escapes the repository: ${destination}`); continue; }
    if (!await exists(target)) failures.push(`${path} links to missing path ${destination}`);
  }
}

if (failures.length > 0) {
  console.error("Repository viability checks failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Repository viability checks passed across versions, build hygiene, workflow coverage, CSP, ${storageFiles.length} local stores, and Markdown links.`);
