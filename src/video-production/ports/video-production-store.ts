import type { VideoProductionWorkspace } from "../domain/video-production.js";

export interface VideoProductionStore {
  load(workspaceId: string): Promise<VideoProductionWorkspace | undefined>;
  save(workspace: VideoProductionWorkspace): Promise<void>;
}
