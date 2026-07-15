import type { ProductWorkspace } from "../domain/workspace.js";

export interface ProductWorkspaceStore {
  save(workspace: ProductWorkspace): Promise<void>;
  load(workspaceId: string): Promise<ProductWorkspace | undefined>;
}
