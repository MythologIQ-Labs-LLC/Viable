import type { PublicationExecutionWorkspace, PublicationJobStatus } from "../domain/publication-execution.js";

const PENDING_JOB_STATUSES: ReadonlySet<PublicationJobStatus> = new Set(["waiting", "retry_wait", "executing"]);

/**
 * Slice D proves one real provider. Until a provider registry exists, the
 * explicit "Run automation now" proof must refuse to run while automated work
 * for any other channel could reach the LinkedIn adapter.
 *
 * Returns a blocking reason, or undefined when only LinkedIn automation is pending.
 */
export function linkedInOnlyAutomationBlocker(workspace: PublicationExecutionWorkspace): string | undefined {
  const channels = new Map(workspace.destinations.map((destination) => [destination.id, destination.channel]));
  const isLinkedIn = (destinationId: string) => channels.get(destinationId) === "linkedin";

  if ((workspace.publicationJobs ?? []).some((job) => PENDING_JOB_STATUSES.has(job.status) && !isLinkedIn(job.destinationId))) {
    return "A non-LinkedIn publication job is pending. Viable will not route it through the LinkedIn provider.";
  }
  if ((workspace.publicationInventory ?? []).some((item) => item.status === "stocked" && !isLinkedIn(item.destinationId))) {
    return "Non-LinkedIn publication stock is present. Automation stays fail-closed until multi-provider routing is implemented.";
  }
  return undefined;
}
