import { execFileSync } from "node:child_process";

const tracked = execFileSync("git", ["ls-files"], { encoding: "utf8" })
  .split("\n")
  .filter(Boolean)
  .filter((path) => !path.endsWith("package-lock.json"));

const patterns = [
  /xox[baprs]-[A-Za-z0-9-]{10,}/,
  /gh[oprsu]_[A-Za-z0-9]{20,}/,
  /AKIA[0-9A-Z]{16}/,
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
];

for (const path of tracked) {
  const content = execFileSync("git", ["show", `HEAD:${path}`], { encoding: "utf8" });
  for (const pattern of patterns) {
    if (pattern.test(content)) {
      console.error(`Potential secret in ${path}: ${pattern}`);
      process.exit(1);
    }
  }
}

console.log(`Secret scan passed for ${tracked.length} tracked files.`);
