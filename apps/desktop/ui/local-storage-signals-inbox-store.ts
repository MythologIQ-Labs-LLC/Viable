import type { SignalsInbox } from "../../../src/signals/domain/signal.js";
import type { SignalsInboxStore } from "../../../src/signals/ports/signals-inbox-store.js";

const PREFIX = "viable.signals-inbox.";

export class LocalStorageSignalsInboxStore implements SignalsInboxStore {
  async load(workspaceId: string): Promise<SignalsInbox | undefined> {
    const value = localStorage.getItem(`${PREFIX}${workspaceId}`);
    return value ? JSON.parse(value) as SignalsInbox : undefined;
  }

  async save(inbox: SignalsInbox): Promise<void> {
    localStorage.setItem(`${PREFIX}${inbox.workspaceId}`, JSON.stringify(inbox));
  }
}
