import { rm } from "node:fs/promises";
import { resolve } from "node:path";

const targets = Object.freeze({
  core: ["dist"],
  desktop: ["apps/desktop/web/generated"],
  all: ["dist", "apps/desktop/web/generated"],
});

const mode = process.argv[2] ?? "all";
const selected = targets[mode];

if (!selected) {
  console.error(`Unknown clean target: ${mode}. Expected one of ${Object.keys(targets).join(", ")}.`);
  process.exit(1);
}

for (const target of selected) {
  await rm(resolve(process.cwd(), target), { recursive: true, force: true });
}

console.log(`Removed ${selected.join(" and ")} before compilation.`);
