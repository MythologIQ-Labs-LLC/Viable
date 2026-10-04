import type { PublicationInventoryWorkspace } from "../../../src/activation-learning/domain/publication-inventory.js";
import type { PublicationInventoryStore } from "../../../src/activation-learning/ports/publication-inventory-store.js";
import { readWorkspaceJson, writeWorkspaceJson } from "./local-storage-json.js";

const PREFIX = "viable.publication-inventory.";

export class LocalStoragePublicationInventoryStore implements PublicationInventoryStore {
  async load(workspaceId: string): Promise<PublicationInventoryWorkspace | undefined> {
    return readWorkspaceJson<PublicationInventoryWorkspace>(
      localStorage,
      `${PREFIX}${workspaceId}`,
      "Publication Inventory workspace",
      { field: "workspaceId", expected: workspaceId },
      {
        arrays: ["policies", "items"],
        strings: ["updatedAt"],
      },
    );
  }

  async save(workspace: PublicationInventoryWorkspace): Promise<void> {
    writeWorkspaceJson(localStorage, `${PREFIX}${workspace.workspaceId}`, "Publication Inventory workspace", workspace);
  }
}
