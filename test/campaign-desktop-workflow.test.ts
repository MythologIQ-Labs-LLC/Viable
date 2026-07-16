import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path: string): Promise<string> => readFile(path, "utf8");

test("desktop exposes Campaigns and Studio workflows", async () => {
  const [shell, view, html] = await Promise.all([
    read("apps/desktop/ui/campaign-shell.ts"),
    read("apps/desktop/ui/campaigns-view.ts"),
    read("apps/desktop/web/index.html"),
  ]);
  assert.match(shell, /data-nav/);
  assert.match(shell, /CampaignsViewController/);
  assert.match(html, /campaign-shell\.js/);
  for (const marker of [
    "One outcome. One audience. Traceable truth.",
    "Canonical first. Channel second.",
    "Product Core prerequisite",
    "Channel comparison",
    "Create manual export package",
    "Not approved for publishing",
    "Return to saved campaign workspace",
  ]) assert.match(view, new RegExp(marker));
});

test("campaign desktop workflow preserves authority and explicit states", async () => {
  const view = await read("apps/desktop/ui/campaigns-view.ts");
  for (const marker of [
    "Generated suggestions excluded",
    "Campaign creation is intentionally blocked",
    "No approved campaign is available",
    "No asset family is export-ready",
    "Campaign operation failed",
    "Offline-ready campaign authority",
    "manual export requires",
    "detectClaimImpact",
  ]) assert.match(view, new RegExp(marker, "i"));
});

test("desktop TypeScript includes campaign domain and services", async () => {
  const config = await read("apps/desktop/tsconfig.json");
  assert.match(config, /src\/campaigns\/domain/);
  assert.match(config, /src\/campaigns\/ports/);
  assert.match(config, /src\/campaigns\/services/);
});
