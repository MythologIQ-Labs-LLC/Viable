import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { SignalsInbox } from "../domain/signal.js";
import type { SignalsInboxStore } from "../ports/signals-inbox-store.js";

export class LocalJsonSignalsInboxStore implements SignalsInboxStore {
  constructor(private readonly directory: string) {}

  async load(workspaceId: string): Promise<SignalsInbox | undefined> {
    try {
      return JSON.parse(await readFile(join(this.directory, `${workspaceId}.signals.json`), "utf8")) as SignalsInbox;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
      throw error;
    }
  }

  async save(inbox: SignalsInbox): Promise<void> {
    await mkdir(this.directory, { recursive: true });
    const destination = join(this.directory, `${inbox.workspaceId}.signals.json`);
    const temporary = `${destination}.tmp`;
    await writeFile(temporary, `${JSON.stringify(inbox, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
    await rename(temporary, destination);
  }
}
