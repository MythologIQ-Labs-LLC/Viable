import type { CampaignWorkspace } from "../../../src/campaigns/domain/campaign.js";
import type { CampaignWorkspaceStore } from "../../../src/campaigns/ports/campaign-workspace-store.js";
import { readWorkspaceJson, writeWorkspaceJson } from "./local-storage-json.js";

const PREFIX = "viable.campaign-workspace.";

export class LocalStorageCampaignWorkspaceStore implements CampaignWorkspaceStore {
  async load(workspaceId: string): Promise<CampaignWorkspace> {
    return readWorkspaceJson<CampaignWorkspace>(
      localStorage,
      `${PREFIX}${workspaceId}`,
      "Campaign workspace",
      { field: "workspaceId", expected: workspaceId },
      { arrays: ["campaigns", "assets", "variants", "exports"], strings: ["updatedAt"] },
    ) ?? {
      workspaceId,
      campaigns: [],
      assets: [],
      variants: [],
      exports: [],
      updatedAt: new Date(0).toISOString(),
    };
  }

  async save(workspace: CampaignWorkspace): Promise<void> {
    writeWorkspaceJson(localStorage, `${PREFIX}${workspace.workspaceId}`, "Campaign workspace", workspace);
  }
}
