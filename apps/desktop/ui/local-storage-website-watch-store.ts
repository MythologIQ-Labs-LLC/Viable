import type { WebsiteWatchWorkspace } from "../../../src/website-watch/domain/website-watch.js";
import type { WebsiteWatchStore } from "../../../src/website-watch/ports/website-watch-store.js";
import { readWorkspaceJson, writeWorkspaceJson } from "./local-storage-json.js";

const PREFIX = "viable.website-watch.";

export class LocalStorageWebsiteWatchStore implements WebsiteWatchStore {
  async load(workspaceId: string): Promise<WebsiteWatchWorkspace | undefined> {
    return readWorkspaceJson<WebsiteWatchWorkspace>(
      localStorage,
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
    writeWorkspaceJson(localStorage, `${PREFIX}${workspace.workspaceId}`, "Website Watch workspace", workspace);
  }
}
