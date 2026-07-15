import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { ProductWorkspace } from "../domain/workspace.js";
import type { ProductWorkspaceStore } from "../ports/product-workspace-store.js";

export class LocalJsonProductWorkspaceStore implements ProductWorkspaceStore {
  constructor(private readonly directory: string) {}

  async save(workspace: ProductWorkspace): Promise<void> {
    await mkdir(this.directory, { recursive: true });
    const destination = join(this.directory, `${workspace.id}.json`);
    const temporary = `${destination}.tmp`;
    await writeFile(temporary, `${JSON.stringify(workspace, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
    await rename(temporary, destination);
  }

  async load(workspaceId: string): Promise<ProductWorkspace | undefined> {
    try {
      return JSON.parse(await readFile(join(this.directory, `${workspaceId}.json`), "utf8")) as ProductWorkspace;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
      throw error;
    }
  }
}
