import type { ProviderConnectionWorkspace } from "../domain/provider-connection.js";

export interface ProviderConnectionStore {
  load(workspaceId: string): Promise<ProviderConnectionWorkspace | undefined>;
  save(workspace: ProviderConnectionWorkspace): Promise<void>;
}
