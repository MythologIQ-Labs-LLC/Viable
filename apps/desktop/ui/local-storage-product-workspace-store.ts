import type { ProductWorkspace } from "../../../src/product-core/domain/workspace.js";
import type { ProductWorkspaceStore } from "../../../src/product-core/ports/product-workspace-store.js";
import { workspaceStorage } from "./workspace-storage.js";
import { readStorageString, readWorkspaceJson, removeStorageItems, writeStorageString, writeWorkspaceJson } from "./local-storage-json.js";

const PREFIX = "viable.product-workspace.";
const ACTIVE_KEY = `${PREFIX}active`;

export class LocalStorageProductWorkspaceStore implements ProductWorkspaceStore {
  async save(workspace: ProductWorkspace): Promise<void> {
    writeWorkspaceJson(workspaceStorage, `${PREFIX}${workspace.id}`, "Product workspace", workspace);
    writeStorageString(workspaceStorage, ACTIVE_KEY, "Active Product workspace", workspace.id);
    await workspaceStorage.commit();
  }

  async load(workspaceId: string): Promise<ProductWorkspace | undefined> {
    return readWorkspaceJson<ProductWorkspace>(
      workspaceStorage,
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
    return readStorageString(workspaceStorage, ACTIVE_KEY, "Active Product workspace");
  }

  /** Removal errors throw synchronously; the returned promise settles when the removal is durable. */
  clearActiveWorkspace(): Promise<void> {
    const id = this.activeWorkspaceId();
    removeStorageItems(workspaceStorage, [...(id ? [`${PREFIX}${id}`] : []), ACTIVE_KEY], "Product workspace");
    return workspaceStorage.commit();
  }
}
