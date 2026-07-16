import type { ActivationLearningWorkspace } from "../../../src/activation-learning/domain/activation-learning.js";
import type { ActivationLearningStore } from "../../../src/activation-learning/ports/activation-learning-store.js";

const PREFIX = "viable.activation-learning.";

export class LocalStorageActivationLearningStore implements ActivationLearningStore {
  async load(workspaceId: string): Promise<ActivationLearningWorkspace | undefined> {
    const value = localStorage.getItem(`${PREFIX}${workspaceId}`);
    return value ? JSON.parse(value) as ActivationLearningWorkspace : undefined;
  }

  async save(workspace: ActivationLearningWorkspace): Promise<void> {
    localStorage.setItem(`${PREFIX}${workspace.workspaceId}`, JSON.stringify(workspace));
  }
}
