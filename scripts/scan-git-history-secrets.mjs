import { execFileSync, spawnSync } from "node:child_process";
import { basename } from "node:path";
import { SECRET_PATTERNS } from "./secret-patterns.mjs";

const MAX_BLOB_BYTES = 2 * 1024 * 1024;
const MAX_BUFFER_BYTES = 256 * 1024 * 1024;
const excludedNames = new Set(["package-lock.json", "Cargo.lock"]);

const shallow = execFileSync("git", ["rev-parse", "--is-shallow-repository"], { encoding: "utf8" }).trim();
if (shallow === "true") {
  console.error("Historical secret scan requires a full Git history. Configure checkout with fetch-depth: 0.");
  process.exit(1);
}

const objectListing = execFileSync("git", ["rev-list", "--objects", "--all"], {
  encoding: "utf8",
  maxBuffer: MAX_BUFFER_BYTES,
});

const pathByObject = new Map();
const objectIds = [];
for (const line of objectListing.split("\n")) {
  if (!line) continue;
  const separator = line.indexOf(" ");
  const objectId = separator === -1 ? line : line.slice(0, separator);
  const path = separator === -1 ? "" : line.slice(separator + 1);
  objectIds.push(objectId);
  if (path && !pathByObject.has(objectId)) pathByObject.set(objectId, path);
}

const uniqueObjectIds = [...new Set(objectIds)];
const check = spawnSync(
  "git",
  ["cat-file", "--batch-check=%(objectname) %(objecttype) %(objectsize)"],
  {
    input: `${uniqueObjectIds.join("\n")}\n`,
    encoding: "utf8",
    maxBuffer: MAX_BUFFER_BYTES,
  },
);

if (check.status !== 0) {
  process.stderr.write(check.stderr ?? "Unable to inspect Git object metadata.\n");
  process.exit(check.status ?? 1);
}

const blobs = [];
let skippedLarge = 0;
for (const line of check.stdout.split("\n")) {
  if (!line) continue;
  const [objectId, type, sizeText] = line.split(" ");
  if (type !== "blob") continue;
  const size = Number(sizeText);
  const path = pathByObject.get(objectId) ?? "<historical-path-unavailable>";
  if (excludedNames.has(basename(path))) continue;
  if (!Number.isFinite(size) || size > MAX_BLOB_BYTES) {
    skippedLarge += 1;
    continue;
  }
  blobs.push({ objectId, path, size });
}

const batch = spawnSync("git", ["cat-file", "--batch"], {
  input: `${blobs.map(({ objectId }) => objectId).join("\n")}\n`,
  encoding: null,
  maxBuffer: MAX_BUFFER_BYTES,
});

if (batch.status !== 0 || !batch.stdout) {
  if (batch.stderr) process.stderr.write(batch.stderr);
  else console.error("Unable to read Git history blobs.");
  process.exit(batch.status ?? 1);
}

let offset = 0;
let scanned = 0;
let skippedBinary = 0;

for (const expected of blobs) {
  const headerEnd = batch.stdout.indexOf(0x0a, offset);
  if (headerEnd === -1) throw new Error(`Missing cat-file header for ${expected.objectId}`);

  const header = batch.stdout.subarray(offset, headerEnd).toString("utf8");
  const [objectId, type, sizeText] = header.split(" ");
  const size = Number(sizeText);
  if (objectId !== expected.objectId || type !== "blob" || size !== expected.size) {
    throw new Error(`Unexpected cat-file response for ${expected.objectId}: ${header}`);
  }

  const contentStart = headerEnd + 1;
  const contentEnd = contentStart + size;
  const content = batch.stdout.subarray(contentStart, contentEnd);
  offset = contentEnd + 1;

  if (content.includes(0)) {
    skippedBinary += 1;
    continue;
  }

  const text = content.toString("utf8");
  scanned += 1;
  for (const { name, pattern } of SECRET_PATTERNS) {
    pattern.lastIndex = 0;
    if (pattern.test(text)) {
      console.error(
        `Potential ${name} in reachable Git history object ${objectId} (${expected.path}). ` +
        "The matched value is intentionally not printed.",
      );
      process.exit(1);
    }
  }
}

console.log(
  `Historical secret scan passed for ${scanned} unique reachable text blobs; ` +
  `skipped ${skippedBinary} binary blobs and ${skippedLarge} blobs larger than ${MAX_BLOB_BYTES} bytes.`,
);
