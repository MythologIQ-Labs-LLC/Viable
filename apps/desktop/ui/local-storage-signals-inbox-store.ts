import type { SignalsInbox } from "../../../src/signals/domain/signal.js";
import type { SignalsInboxStore } from "../../../src/signals/ports/signals-inbox-store.js";
import { workspaceStorage } from "./workspace-storage.js";
import { readWorkspaceJson, writeWorkspaceJson } from "./local-storage-json.js";

const PREFIX = "viable.signals-inbox.";

export class LocalStorageSignalsInboxStore implements SignalsInboxStore {
  async load(workspaceId: string): Promise<SignalsInbox | undefined> {
    return readWorkspaceJson<SignalsInbox>(
      workspaceStorage,
      `${PREFIX}${workspaceId}`,
      "Signals Inbox workspace",
      { field: "workspaceId", expected: workspaceId },
      { arrays: ["sources", "sourceHealth", "signals", "conversions"], strings: ["updatedAt"] },
    );
  }

  async save(inbox: SignalsInbox): Promise<void> {
    writeWorkspaceJson(workspaceStorage, `${PREFIX}${inbox.workspaceId}`, "Signals Inbox workspace", inbox);
    await workspaceStorage.commit();
  }
}
