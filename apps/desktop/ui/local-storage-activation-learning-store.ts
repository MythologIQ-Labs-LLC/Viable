import type { ActivationLearningWorkspace } from "../../../src/activation-learning/domain/activation-learning.js";
import type { ActivationLearningStore } from "../../../src/activation-learning/ports/activation-learning-store.js";
import { workspaceStorage } from "./workspace-storage.js";
import { readWorkspaceJson, writeWorkspaceJson } from "./local-storage-json.js";

const PREFIX = "viable.activation-learning.";

export class LocalStorageActivationLearningStore implements ActivationLearningStore {
  async load(workspaceId: string): Promise<ActivationLearningWorkspace | undefined> {
    return readWorkspaceJson<ActivationLearningWorkspace>(
      workspaceStorage,
      `${PREFIX}${workspaceId}`,
      "Calendar and Learning workspace",
      { field: "workspaceId", expected: workspaceId },
      {
        arrays: [
          "destinations", "calendarEntries", "publicationPolicies", "publicationInventory", "publicationJobs", "publicationAttempts",
          "packages", "exportOperations", "deliveryOutcomes", "measurementPlans", "performanceImports", "retrospectives", "learningLedger",
        ],
        defaultArrays: ["publicationPolicies", "publicationInventory", "publicationJobs", "publicationAttempts"],
        strings: ["updatedAt"],
      },
    );
  }

  async save(workspace: ActivationLearningWorkspace): Promise<void> {
    writeWorkspaceJson(workspaceStorage, `${PREFIX}${workspace.workspaceId}`, "Calendar and Learning workspace", workspace);
    await workspaceStorage.commit();
  }
}
