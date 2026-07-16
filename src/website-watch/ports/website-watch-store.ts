import type { WebsiteWatchWorkspace } from "../domain/website-watch.js";

export interface WebsiteWatchStore {
  load(workspaceId: string): Promise<WebsiteWatchWorkspace | undefined>;
  save(workspace: WebsiteWatchWorkspace): Promise<void>;
}
