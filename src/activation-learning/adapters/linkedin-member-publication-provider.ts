import type { LinkedInMemberConnectionRecord, ProviderConnectionWorkspace } from "../domain/provider-connection.js";
import type { LinkedInNativeProviderPort } from "../ports/linkedin-native-provider.js";
import type { ProviderConnectionStore } from "../ports/provider-connection-store.js";
import type {
  PublicationProviderOutcome,
  PublicationProviderPort,
  PublicationProviderRequest,
} from "../ports/publication-provider.js";

type Clock = () => Date;

export class LinkedInMemberPublicationProvider implements PublicationProviderPort {
  constructor(
    private readonly connectionStore: ProviderConnectionStore,
    private readonly nativeProvider: LinkedInNativeProviderPort,
    private readonly clock: Clock = () => new Date(),
  ) {}

  async publish(request: PublicationProviderRequest): Promise<PublicationProviderOutcome> {
    if (request.destination.channel !== "linkedin") {
      return terminal("provider_channel_mismatch", "LinkedIn provider can publish only to LinkedIn destinations.");
    }

    const text = request.source.body?.trim();
    if (!text) {
      return terminal("linkedin_text_missing", "LinkedIn text publication requires approved source body text.");
    }

    const workspace = await this.connectionStore.load(request.job.workspaceId);
    const connection = linkedinConnection(workspace, request.destination.id);
    if (!connection) {
      return terminal("provider_connection_missing", "No LinkedIn member connection is configured for this destination.");
    }
    if (connection.status === "disabled") {
      return terminal("provider_connection_disabled", "LinkedIn member connection is disabled.");
    }
    if (connection.status === "reconnect_required") {
      return terminal("reconnect_required", "LinkedIn authorization must be reconnected before publishing.");
    }
    if (connection.tokenExpiresAt && Date.parse(connection.tokenExpiresAt) <= this.clock().getTime()) {
      await this.markReconnectRequired(workspace!, connection);
      return terminal("reconnect_required", "LinkedIn access token is expired.");
    }

    let result;
    try {
      result = await this.nativeProvider.publishText({
        credentialReference: connection.credentialReference,
        memberUrn: connection.memberUrn,
        text,
      });
    } catch {
      return {
        kind: "outcome_unknown",
        detail: "LinkedIn publishing ended without a definitive provider outcome after dispatch became possible.",
      };
    }

    switch (result.kind) {
      case "published":
        return {
          kind: "published",
          publicationId: result.publicationId,
          providerResponseId: result.providerResponseId,
        };
      case "rate_limited":
        return {
          kind: "retryable_failure",
          failureClass: "linkedin_rate_limited",
          detail: result.detail,
        };
      case "reconnect_required":
        await this.markReconnectRequired(workspace!, connection);
        return terminal("reconnect_required", result.detail);
      case "provider_rejected":
        return terminal("linkedin_provider_rejected", result.detail);
      case "outcome_unknown":
        return { kind: "outcome_unknown", detail: result.detail };
    }
  }

  private async markReconnectRequired(
    workspace: ProviderConnectionWorkspace,
    connection: LinkedInMemberConnectionRecord,
  ): Promise<void> {
    const now = this.clock().toISOString();
    await this.connectionStore.save({
      ...workspace,
      connections: workspace.connections.map((candidate) => candidate.id === connection.id
        ? { ...candidate, status: "reconnect_required" as const, updatedAt: now }
        : candidate),
      updatedAt: now,
    });
  }
}

function linkedinConnection(
  workspace: ProviderConnectionWorkspace | undefined,
  destinationId: string,
): LinkedInMemberConnectionRecord | undefined {
  return workspace?.connections.find(
    (candidate) => candidate.provider === "linkedin_member" && candidate.destinationId === destinationId,
  ) as LinkedInMemberConnectionRecord | undefined;
}

function terminal(failureClass: string, detail: string): PublicationProviderOutcome {
  return { kind: "terminal_failure", failureClass, detail };
}
