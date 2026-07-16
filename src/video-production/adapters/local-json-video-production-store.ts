import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { VideoProductionWorkspace } from "../domain/video-production.js";
import type { VideoProductionStore } from "../ports/video-production-store.js";

export class LocalJsonVideoProductionStore implements VideoProductionStore {
  constructor(private readonly rootDirectory: string) {}

  async load(workspaceId: string): Promise<VideoProductionWorkspace | undefined> {
    try {
      return JSON.parse(await readFile(this.pathFor(workspaceId), "utf8")) as VideoProductionWorkspace;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
      throw error;
    }
  }

  async save(workspace: VideoProductionWorkspace): Promise<void> {
    const path = this.pathFor(workspace.workspaceId);
    await mkdir(dirname(path), { recursive: true });
    const temporary = `${path}.tmp`;
    await writeFile(temporary, JSON.stringify(workspace, null, 2) + "\n", { encoding: "utf8", mode: 0o600 });
    await rename(temporary, path);
  }

  private pathFor(workspaceId: string): string {
    if (!/^[a-zA-Z0-9_-]+$/.test(workspaceId)) throw new Error("Invalid workspace identifier");
    return join(this.rootDirectory, workspaceId, "video-production.json");
  }
}
