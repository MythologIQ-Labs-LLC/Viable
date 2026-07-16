import type { ActivationLearningWorkspace } from "../domain/activation-learning.js";

export interface ActivationLearningStore {
  load(workspaceId: string): Promise<ActivationLearningWorkspace | undefined>;
  save(workspace: ActivationLearningWorkspace): Promise<void>;
}
