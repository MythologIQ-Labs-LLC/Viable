import type { RepositoryGrowthWorkspace } from "../domain/repository-growth.js";

export interface RepositoryGrowthStore {
  load(workspaceId: string): Promise<RepositoryGrowthWorkspace | undefined>;
  save(workspace: RepositoryGrowthWorkspace): Promise<void>;
}
