import type { ProductWorkspace } from "../../../src/product-core/domain/workspace.js";
import type { ProductWorkspaceStore } from "../../../src/product-core/ports/product-workspace-store.js";

const PREFIX = "viable.product-workspace.";

export class LocalStorageProductWorkspaceStore implements ProductWorkspaceStore {
  async save(workspace: ProductWorkspace): Promise<void> {
    localStorage.setItem(`${PREFIX}${workspace.id}`, JSON.stringify(workspace));
    localStorage.setItem(`${PREFIX}active`, workspace.id);
  }

  async load(workspaceId: string): Promise<ProductWorkspace | undefined> {
    const value = localStorage.getItem(`${PREFIX}${workspaceId}`);
    return value ? JSON.parse(value) as ProductWorkspace : undefined;
  }

  activeWorkspaceId(): string | undefined {
    return localStorage.getItem(`${PREFIX}active`) ?? undefined;
  }

  clearActiveWorkspace(): void {
    const id = this.activeWorkspaceId();
    if (id) localStorage.removeItem(`${PREFIX}${id}`);
    localStorage.removeItem(`${PREFIX}active`);
  }
}
