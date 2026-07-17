import type { VideoProductionWorkspace } from "../../../src/video-production/domain/video-production.js";
import type { VideoProductionStore } from "../../../src/video-production/ports/video-production-store.js";
import { readWorkspaceJson, writeWorkspaceJson } from "./local-storage-json.js";

const PREFIX = "viable.video-production.";

export class LocalStorageVideoProductionStore implements VideoProductionStore {
  async load(workspaceId: string): Promise<VideoProductionWorkspace> {
    return readWorkspaceJson<VideoProductionWorkspace>(
      localStorage,
      `${PREFIX}${workspaceId}`,
      "Video Production workspace",
      { field: "workspaceId", expected: workspaceId },
      { arrays: ["tools", "briefs", "packages", "artifacts", "variants"], strings: ["updatedAt"] },
    ) ?? {
      workspaceId,
      tools: [],
      briefs: [],
      packages: [],
      artifacts: [],
      variants: [],
      updatedAt: new Date().toISOString(),
    };
  }

  async save(workspace: VideoProductionWorkspace): Promise<void> {
    writeWorkspaceJson(localStorage, `${PREFIX}${workspace.workspaceId}`, "Video Production workspace", workspace);
  }
}
