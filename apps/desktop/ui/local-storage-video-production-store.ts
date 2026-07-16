import type { VideoProductionWorkspace } from "../../../src/video-production/domain/video-production.js";
import type { VideoProductionStore } from "../../../src/video-production/ports/video-production-store.js";

const PREFIX = "viable.video-production.";

export class LocalStorageVideoProductionStore implements VideoProductionStore {
  async load(workspaceId: string): Promise<VideoProductionWorkspace | undefined> {
    const value = localStorage.getItem(`${PREFIX}${workspaceId}`);
    return value ? JSON.parse(value) as VideoProductionWorkspace : undefined;
  }

  async save(workspace: VideoProductionWorkspace): Promise<void> {
    localStorage.setItem(`${PREFIX}${workspace.workspaceId}`, JSON.stringify(workspace));
  }
}
