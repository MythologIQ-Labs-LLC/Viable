import type { RepositoryGrowthWorkspace } from "../../../src/repository-growth/domain/repository-growth.js";
import type { RepositoryGrowthStore } from "../../../src/repository-growth/ports/repository-growth-store.js";

const PREFIX = "viable.repository-growth.";

export class LocalStorageRepositoryGrowthStore implements RepositoryGrowthStore {
  async load(workspaceId: string): Promise<RepositoryGrowthWorkspace> {
    const value = localStorage.getItem(`${PREFIX}${workspaceId}`);
    return value ? JSON.parse(value) as RepositoryGrowthWorkspace : {
      workspaceId,
      repositories: [],
      assessments: [],
      plans: [],
      launchRooms: [],
      exports: [],
      retrospectives: [],
      updatedAt: new Date().toISOString(),
    };
  }

  async save(workspace: RepositoryGrowthWorkspace): Promise<void> {
    localStorage.setItem(`${PREFIX}${workspace.workspaceId}`, JSON.stringify(workspace));
  }
}
