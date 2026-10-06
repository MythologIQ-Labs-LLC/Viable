import type { WebsiteWatchWorkspace } from "../../../src/website-watch/domain/website-watch.js";
import type { WebsiteWatchStore } from "../../../src/website-watch/ports/website-watch-store.js";
import { workspaceStorage } from "./workspace-storage.js";
import { readWorkspaceJson, writeWorkspaceJson } from "./local-storage-json.js";

const PREFIX = "viable.website-watch.";

export class LocalStorageWebsiteWatchStore implements WebsiteWatchStore {
  async load(workspaceId: string): Promise<WebsiteWatchWorkspace | undefined> {
    return readWorkspaceJson<WebsiteWatchWorkspace>(
      workspaceStorage,
      `${PREFIX}${workspaceId}`,
      "Website Watch workspace",
      { field: "workspaceId", expected: workspaceId },
      {
        arrays: ["sources", "sourceHealth", "sites", "targets", "snapshots", "observations", "generatedAnalyses"],
        strings: ["updatedAt"],
      },
    );
  }

  async save(workspace: WebsiteWatchWorkspace): Promise<void> {
    writeWorkspaceJson(workspaceStorage, `${PREFIX}${workspace.workspaceId}`, "Website Watch workspace", workspace);
    await workspaceStorage.commit();
  }
}
