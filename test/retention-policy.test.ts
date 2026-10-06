import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";
import { WEBSITE_WATCH_SNAPSHOT_RETENTION_DAYS } from "../src/website-watch/domain/website-watch.js";
import {
  AUTOMATIC_DELETION,
  RETENTION_POLICY,
  retainedOutsideWorkspaceDeletion,
} from "../src/workspace-lifecycle/retention-policy.js";
import { WorkspaceLifecycleService } from "../src/workspace-lifecycle/workspace-lifecycle-service.js";

const read = (path: string) => readFile(path, "utf8");

async function sourceFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === "generated" ? [] : sourceFiles(path);
    return path.endsWith(".ts") ? [path] : [];
  }));
  return nested.flat();
}

test("every retention rule states what, where, until when, and what workspace deletion does", () => {
  const ids = RETENTION_POLICY.map((rule) => rule.id);
  assert.equal(new Set(ids).size, ids.length, "rule ids are unique");
  for (const rule of RETENTION_POLICY) {
    assert.ok(rule.data.trim() && rule.location.trim() && rule.keptUntil.trim(), rule.id);
    if (rule.workspaceDeletion === "kept") assert.ok(rule.keptLabel, `${rule.id} must be listed in the deletion scope`);
    if (rule.workspaceDeletion === "removed") assert.equal(rule.keptLabel, undefined, `${rule.id} is removed, so it cannot be listed as kept`);
  }
  assert.equal(AUTOMATIC_DELETION, false);
});

test("the deletion scope preview lists exactly what the policy says deletion keeps", () => {
  const kept = retainedOutsideWorkspaceDeletion();
  for (const rule of RETENTION_POLICY.filter((candidate) => candidate.keptLabel)) assert.ok(kept.includes(rule.keptLabel!), rule.id);
  const storage = { length: 0, key: () => null, getItem: () => null, setItem() {}, removeItem() {} };
  assert.deepEqual(new WorkspaceLifecycleService(storage).inspect("ws").retainedOutsideWorkspace, kept);
  assert.ok(kept.some((label) => /credential vault/.test(label)), "deletion is honest that provider credentials are not removed");
});

test("Website Watch retention deadlines come from the stated policy", async () => {
  assert.deepEqual(WEBSITE_WATCH_SNAPSHOT_RETENTION_DAYS, { ephemeral: 14, standard: 90, extended: null });
  const rule = RETENTION_POLICY.find((candidate) => candidate.id === "website-watch-snapshots")!;
  assert.match(rule.keptUntil, /ephemeral 14 days, standard 90 days, extended no deadline/);
  const adapter = await read("src/website-watch/adapters/webdog-manual-import-source.ts");
  assert.match(adapter, /WEBSITE_WATCH_SNAPSHOT_RETENTION_DAYS\[retentionClass\]/);
  assert.doesNotMatch(adapter, /\? 14 : 90/, "deadlines must not be hard-coded apart from the policy");
});

test("nothing deletes or expires workspace data on its own", async () => {
  const files = [...await sourceFiles("src"), ...await sourceFiles("apps/desktop/ui")];
  const callers = async (pattern: RegExp) => (await Promise.all(files.map(async (file) => (pattern.test(await read(file)) ? [file] : [])))).flat().sort();
  // Snapshot pruning and payload deletion run only from a person's action with a named actor.
  assert.deepEqual(await callers(/\.pruneExpiredSnapshots\(/), ["apps/desktop/ui/signals-view.ts"]);
  const signals = await read("apps/desktop/ui/signals-view.ts");
  assert.match(signals, /action === "website-prune-retention"\) \{\s*const actor = prompt\("Named retention actor"/);
  // Workspace deletion runs only from the Workspace screen's confirmed form.
  assert.deepEqual(await callers(/\.deleteWorkspace\(/), ["apps/desktop/ui/workspace-lifecycle-shell.ts"]);
  // No timer drives a deletion.
  for (const file of files) {
    const source = await read(file);
    assert.doesNotMatch(source, /set(?:Interval|Timeout)\([^)]*(?:prune|delete|purge|expire)/i, file);
  }
});

test("the Workspace screen and user guide state the retention policy", async () => {
  const shell = await read("apps/desktop/ui/workspace-lifecycle-shell.ts");
  assert.equal(shell.match(/\$\{retentionSection\(\)\}/g)?.length, 2, "shown with and without a workspace");
  assert.match(shell, /RETENTION_POLICY\.map\(/);
  assert.match(shell, /Viable never deletes or expires data on its own/);
  const guide = await read("docs/user/workspace-backup-restore-and-deletion.md");
  assert.match(guide, /Viable never deletes or expires data on its own/);
  for (const rule of RETENTION_POLICY) assert.match(guide, new RegExp(`\\| ${rule.id} \\|`), `guide lists ${rule.id}`);
});
