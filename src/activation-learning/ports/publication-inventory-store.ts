import type { PublicationInventoryWorkspace } from "../domain/publication-inventory.js";

export interface PublicationInventoryStore {
  load(workspaceId: string): Promise<PublicationInventoryWorkspace | undefined>;
  save(workspace: PublicationInventoryWorkspace): Promise<void>;
}