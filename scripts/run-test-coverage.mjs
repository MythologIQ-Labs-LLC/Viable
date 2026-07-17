import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

async function testFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await testFiles(path));
    else if (entry.isFile() && entry.name.endsWith(".test.js")) files.push(path);
  }
  return files.sort();
}

const files = await testFiles("dist/test");
if (files.length === 0) throw new Error("No compiled deterministic tests were found in dist/test");

const lines = process.env.VIABLE_COVERAGE_LINES ?? "85";
const functions = process.env.VIABLE_COVERAGE_FUNCTIONS ?? "85";
const branches = process.env.VIABLE_COVERAGE_BRANCHES ?? "55";

console.log(`Enforcing core coverage floors: ${lines}% lines, ${branches}% branches, ${functions}% functions.`);

const result = spawnSync(process.execPath, [
  "--test",
  "--experimental-test-coverage",
  "--test-coverage-include=dist/src/**/*.js",
  "--test-coverage-exclude=dist/src/**/ports/**/*.js",
  `--test-coverage-lines=${lines}`,
  `--test-coverage-functions=${functions}`,
  `--test-coverage-branches=${branches}`,
  ...files,
], { stdio: "inherit" });

if (result.error) throw result.error;
process.exit(result.status ?? 1);
