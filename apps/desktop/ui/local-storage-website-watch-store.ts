import type { WebsiteWatchWorkspace } from "../../../src/website-watch/domain/website-watch.js";
import type { WebsiteWatchStore } from "../../../src/website-watch/ports/website-watch-store.js";

const PREFIX = "viable.website-watch.";

export class LocalStorageWebsiteWatchStore implements WebsiteWatchStore {
  async load(workspaceId: string): Promise<WebsiteWatchWorkspace | undefined> {
    const value = localStorage.getItem(`${PREFIX}${workspaceId}`);
    return value ? JSON.parse(value) as WebsiteWatchWorkspace : undefined;
  }

  async save(workspace: WebsiteWatchWorkspace): Promise<void> {
    localStorage.setItem(`${PREFIX}${workspace.workspaceId}`, JSON.stringify(workspace));
  }
}
