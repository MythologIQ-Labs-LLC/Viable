import type { ProviderConnectionWorkspace } from "../../../src/activation-learning/domain/provider-connection.js";
import { WORKSPACE_LOCAL_CONNECTION_RECORDS } from "../../../src/workspace-lifecycle/workspace-lifecycle-service.js";
import type { ProviderConnectionStore } from "../../../src/activation-learning/ports/provider-connection-store.js";
import { workspaceStorage } from "./workspace-storage.js";
import { readWorkspaceJson, writeWorkspaceJson } from "./local-storage-json.js";

const PREFIX = WORKSPACE_LOCAL_CONNECTION_RECORDS[0].prefix;

export class LocalStorageProviderConnectionStore implements ProviderConnectionStore {
  async load(workspaceId: string): Promise<ProviderConnectionWorkspace | undefined> {
    return readWorkspaceJson<ProviderConnectionWorkspace>(
      workspaceStorage,
      `${PREFIX}${workspaceId}`,
      "Provider connection workspace",
      { field: "workspaceId", expected: workspaceId },
      {
        arrays: ["connections"],
        strings: ["updatedAt"],
      },
    );
  }

  async save(workspace: ProviderConnectionWorkspace): Promise<void> {
    writeWorkspaceJson(
      workspaceStorage,
      `${PREFIX}${workspace.workspaceId}`,
      "Provider connection workspace",
      workspace,
    );
    await workspaceStorage.commit();
  }

  async delete(workspaceId: string): Promise<void> {
    workspaceStorage.removeItem(`${PREFIX}${workspaceId}`);
    await workspaceStorage.commit();
  }
}
