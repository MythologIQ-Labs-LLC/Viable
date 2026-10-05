import type { DestinationRecord } from "../domain/activation-learning.js";
import type {
  LinkedInMemberConnectionRecord,
  ProviderConnectionWorkspace,
} from "../domain/provider-connection.js";
import type { ActivationLearningStore } from "../ports/activation-learning-store.js";
import type { LinkedInConnectResult, LinkedInNativeProviderPort } from "../ports/linkedin-native-provider.js";
import type { ProviderConnectionStore } from "../ports/provider-connection-store.js";

type Clock = () => Date;
type IdFactory = () => string;
type LinkedInRejectedConnection = Extract<LinkedInConnectResult, { kind: "rejected" }>;

export type LinkedInConnectionAttempt =
  | Readonly<{ kind: "connected"; connection: LinkedInMemberConnectionRecord }>
  | LinkedInRejectedConnection;

export class LinkedInMemberConnectionService {
  constructor(
    private readonly activationStore: ActivationLearningStore,
    private readonly connectionStore: ProviderConnectionStore,
    private readonly nativeProvider: LinkedInNativeProviderPort,
    private readonly clock: Clock = () => new Date(),
    private readonly createId: IdFactory = () => globalThis.crypto.randomUUID(),
  ) {}

  async connectWithDeveloperPortalToken(input: Readonly<{
    workspaceId: string;
    destinationId: string;
    accessToken: string;
    tokenExpiresAt?: string;
  }>): Promise<LinkedInConnectionAttempt> {
    const token = input.accessToken.trim();
    if (!token) throw new Error("LinkedIn access token is required");

    const destination = await this.requireLinkedInDestination(input.workspaceId, input.destinationId);
    const current = await this.loadConnections(input.workspaceId);
    const existing = current.connections.find((candidate) => candidate.destinationId === destination.id);
    const id = existing?.id ?? this.createId();
    const credentialReference = `viable://credential/linkedin/${id}/access_token`;
    const tokenExpiresAt = optionalFutureDate(input.tokenExpiresAt, this.clock());

    const result = await this.nativeProvider.connect({ credentialReference, accessToken: token });
    if (result.kind === "rejected") return result;

    const now = this.clock().toISOString();
    const connection: LinkedInMemberConnectionRecord = {
      id,
      workspaceId: input.workspaceId,
      destinationId: destination.id,
      provider: "linkedin_member",
      authMode: "developer_portal_token",
      credentialReference,
      memberId: result.memberId,
      memberUrn: result.memberUrn,
      requiredScopes: ["openid", "profile", "w_member_social"],
      status: "connected",
      ...(tokenExpiresAt ? { tokenExpiresAt } : {}),
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };

    await this.connectionStore.save({
      workspaceId: input.workspaceId,
      connections: existing
        ? current.connections.map((candidate) => candidate.id === existing.id ? connection : candidate)
        : [...current.connections, connection],
      updatedAt: now,
    });

    return { kind: "connected", connection };
  }

  async getForDestination(workspaceId: string, destinationId: string): Promise<LinkedInMemberConnectionRecord | undefined> {
    return (await this.loadConnections(workspaceId)).connections.find(
      (candidate) => candidate.provider === "linkedin_member" && candidate.destinationId === destinationId,
    ) as LinkedInMemberConnectionRecord | undefined;
  }

  private async requireLinkedInDestination(workspaceId: string, destinationId: string): Promise<DestinationRecord> {
    const workspace = await this.activationStore.load(workspaceId);
    if (!workspace) throw new Error("Calendar and Activation workspace not found");
    const destination = workspace.destinations.find((candidate) => candidate.id === destinationId);
    if (!destination) throw new Error("Publication destination not found");
    if (destination.channel !== "linkedin") throw new Error("LinkedIn member connection requires a LinkedIn destination");
    if (destination.status !== "active") throw new Error("LinkedIn destination is disabled");
    if (!destination.ownershipConfirmed) throw new Error("LinkedIn destination ownership must be confirmed");
    return destination;
  }

  private async loadConnections(workspaceId: string): Promise<ProviderConnectionWorkspace> {
    return await this.connectionStore.load(workspaceId) ?? {
      workspaceId,
      connections: [],
      updatedAt: this.clock().toISOString(),
    };
  }
}

function optionalFutureDate(value: string | undefined, now: Date): string | undefined {
  if (!value?.trim()) return undefined;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) throw new Error("LinkedIn token expiration must be a valid timestamp");
  if (parsed.getTime() <= now.getTime()) throw new Error("LinkedIn token is already expired");
  return parsed.toISOString();
}
