import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import type { RunStore, StoredEventIntelligenceRun } from "../ports/run-store.js";

export class LocalJsonRunStore implements RunStore {
  constructor(private readonly path: string) {}

  async save(value: StoredEventIntelligenceRun): Promise<void> {
    await mkdir(dirname(this.path), { recursive: true });
    const temporaryPath = `${this.path}.tmp`;
    await writeFile(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, {
      encoding: "utf8",
      mode: 0o600,
    });
    await rename(temporaryPath, this.path);
  }

  async latest(): Promise<StoredEventIntelligenceRun | undefined> {
    try {
      return JSON.parse(await readFile(this.path, "utf8")) as StoredEventIntelligenceRun;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
      throw error;
    }
  }
}
