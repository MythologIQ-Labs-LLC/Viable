import type { ProductWorkspace } from "../../../src/product-core/domain/workspace.js";
import type { ProductWorkspaceStore } from "../../../src/product-core/ports/product-workspace-store.js";
import { readStorageString, readWorkspaceJson, removeStorageItems, writeStorageString, writeWorkspaceJson } from "./local-storage-json.js";

const PREFIX = "viable.product-workspace.";
const ACTIVE_KEY = `${PREFIX}active`;

export class LocalStorageProductWorkspaceStore implements ProductWorkspaceStore {
  async save(workspace: ProductWorkspace): Promise<void> {
    writeWorkspaceJson(localStorage, `${PREFIX}${workspace.id}`, "Product workspace", workspace);
    writeStorageString(localStorage, ACTIVE_KEY, "Active Product workspace", workspace.id);
  }

  async load(workspaceId: string): Promise<ProductWorkspace | undefined> {
    return readWorkspaceJson<ProductWorkspace>(
      localStorage,
      `${PREFIX}${workspaceId}`,
      "Product workspace",
      { field: "id", expected: workspaceId },
      {
        arrays: ["claims", "evidence", "icpHypotheses", "assessments", "actions"],
        records: ["product"],
        strings: ["createdAt", "createdBy"],
      },
    );
  }

  activeWorkspaceId(): string | undefined {
    return readStorageString(localStorage, ACTIVE_KEY, "Active Product workspace");
  }

  clearActiveWorkspace(): void {
    const id = this.activeWorkspaceId();
    removeStorageItems(localStorage, [...(id ? [`${PREFIX}${id}`] : []), ACTIVE_KEY], "Product workspace");
  }
}
