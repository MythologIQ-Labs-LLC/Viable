import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { SECRET_PATTERNS } from "./secret-patterns.mjs";

const excluded = new Set(["package-lock.json", "apps/desktop/src-tauri/Cargo.lock"]);
const tracked = execFileSync("git", ["ls-files", "-z"], { encoding: "utf8" })
  .split("\0")
  .filter(Boolean)
  .filter((path) => !excluded.has(path));

let scanned = 0;
let skippedBinary = 0;

for (const path of tracked) {
  let content;
  try {
    content = await readFile(path);
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") continue;
    throw error;
  }

  if (content.includes(0)) {
    skippedBinary += 1;
    continue;
  }

  const text = content.toString("utf8");
  scanned += 1;
  for (const { name, pattern } of SECRET_PATTERNS) {
    if (pattern.test(text)) {
      console.error(`Potential ${name} in ${path}. The matched value is intentionally not printed.`);
      process.exit(1);
    }
  }
}

console.log(`Secret scan passed for ${scanned} tracked text files; skipped ${skippedBinary} binary files.`);
