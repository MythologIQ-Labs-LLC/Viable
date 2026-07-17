import type { RepositoryGrowthWorkspace } from "../../../src/repository-growth/domain/repository-growth.js";
import type { RepositoryGrowthStore } from "../../../src/repository-growth/ports/repository-growth-store.js";
import { readWorkspaceJson, writeWorkspaceJson } from "./local-storage-json.js";

const PREFIX = "viable.repository-growth.";

export class LocalStorageRepositoryGrowthStore implements RepositoryGrowthStore {
  async load(workspaceId: string): Promise<RepositoryGrowthWorkspace> {
    return readWorkspaceJson<RepositoryGrowthWorkspace>(
      localStorage,
      `${PREFIX}${workspaceId}`,
      "Repository Growth workspace",
      { field: "workspaceId", expected: workspaceId },
      { arrays: ["repositories", "assessments", "plans", "launchRooms", "exports", "retrospectives"], strings: ["updatedAt"] },
    ) ?? {
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
    writeWorkspaceJson(localStorage, `${PREFIX}${workspace.workspaceId}`, "Repository Growth workspace", workspace);
  }
}
