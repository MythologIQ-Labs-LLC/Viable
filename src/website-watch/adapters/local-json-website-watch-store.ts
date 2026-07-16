import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { WebsiteWatchWorkspace } from "../domain/website-watch.js";
import type { WebsiteWatchStore } from "../ports/website-watch-store.js";

export class LocalJsonWebsiteWatchStore implements WebsiteWatchStore {
  constructor(private readonly directory: string) {}

  async load(workspaceId: string): Promise<WebsiteWatchWorkspace | undefined> {
    try {
      return JSON.parse(await readFile(join(this.directory, `${workspaceId}.website-watch.json`), "utf8")) as WebsiteWatchWorkspace;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
      throw error;
    }
  }

  async save(workspace: WebsiteWatchWorkspace): Promise<void> {
    await mkdir(this.directory, { recursive: true });
    const destination = join(this.directory, `${workspace.workspaceId}.website-watch.json`);
    const temporary = `${destination}.tmp`;
    await writeFile(temporary, `${JSON.stringify(workspace, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
    await rename(temporary, destination);
  }
}
