import type { CampaignWorkspace } from "../../../src/campaigns/domain/campaign.js";
import type { CampaignWorkspaceStore } from "../../../src/campaigns/ports/campaign-workspace-store.js";

const PREFIX = "viable.campaign-workspace.";

export class LocalStorageCampaignWorkspaceStore implements CampaignWorkspaceStore {
  async load(workspaceId: string): Promise<CampaignWorkspace | undefined> {
    const value = localStorage.getItem(`${PREFIX}${workspaceId}`);
    return value ? JSON.parse(value) as CampaignWorkspace : undefined;
  }

  async save(workspace: CampaignWorkspace): Promise<void> {
    localStorage.setItem(`${PREFIX}${workspace.workspaceId}`, JSON.stringify(workspace));
  }
}
