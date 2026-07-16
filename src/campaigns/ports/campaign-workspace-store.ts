import type { CampaignWorkspace } from "../domain/campaign.js";

export interface CampaignWorkspaceStore {
  load(workspaceId: string): Promise<CampaignWorkspace | undefined>;
  save(workspace: CampaignWorkspace): Promise<void>;
}
