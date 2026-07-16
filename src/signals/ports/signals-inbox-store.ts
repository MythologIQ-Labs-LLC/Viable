import type { SignalsInbox } from "../domain/signal.js";

export interface SignalsInboxStore {
  load(workspaceId: string): Promise<SignalsInbox | undefined>;
  save(inbox: SignalsInbox): Promise<void>;
}
