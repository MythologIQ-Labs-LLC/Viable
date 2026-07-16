import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { RepositoryGrowthWorkspace } from "../domain/repository-growth.js";
import type { RepositoryGrowthStore } from "../ports/repository-growth-store.js";

export class LocalJsonRepositoryGrowthStore implements RepositoryGrowthStore {
  constructor(private readonly rootDirectory: string) {}

  async load(workspaceId: string): Promise<RepositoryGrowthWorkspace | undefined> {
    try {
      return JSON.parse(await readFile(this.pathFor(workspaceId), "utf8")) as RepositoryGrowthWorkspace;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
      throw error;
    }
  }

  async save(workspace: RepositoryGrowthWorkspace): Promise<void> {
    const path = this.pathFor(workspace.workspaceId);
    await mkdir(dirname(path), { recursive: true });
    const temporary = path + ".tmp";
    await writeFile(temporary, JSON.stringify(workspace, null, 2) + "\n", { encoding: "utf8", mode: 0o600 });
    await rename(temporary, path);
  }

  private pathFor(workspaceId: string): string {
    if (!/^[a-zA-Z0-9_-]+$/.test(workspaceId)) throw new Error("Invalid workspace identifier");
    return join(this.rootDirectory, workspaceId, "repository-growth.json");
  }
}
