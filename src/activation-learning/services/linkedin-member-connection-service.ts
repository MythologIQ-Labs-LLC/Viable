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
    // Replacement tokens use a fresh vault slot. The old credential stays
    // valid until the new local connection record is durably saved.
    const credentialSlotId = existing ? this.createId() : id;
    const credentialReference = `viable://credential/linkedin/${credentialSlotId}/access_token`;
    const tokenExpiresAt = optionalFutureDate(input.tokenExpiresAt, this.clock());

    const result = await this.nativeProvider.connect({ credentialReference, accessToken: token });
    if (result.kind === "rejected") return result;

    const now = this.clock().toISOString();
    const pendingCleanup = existing
      ? [...new Set([...(existing.supersededCredentialReferences ?? []), existing.credentialReference])]
          .filter((reference) => reference !== credentialReference)
      : [];
    const connection: LinkedInMemberConnectionRecord = {
      id,
      workspaceId: input.workspaceId,
      destinationId: destination.id,
      provider: "linkedin_member",
      authMode: "developer_portal_token",
      credentialReference,
      ...(pendingCleanup.length ? { supersededCredentialReferences: pendingCleanup } : {}),
      memberId: result.memberId,
      memberUrn: result.memberUrn,
      requiredScopes: ["openid", "profile", "w_member_social"],
      status: "connected",
      ...(tokenExpiresAt ? { tokenExpiresAt } : {}),
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };

    try {
      await this.connectionStore.save({
        workspaceId: input.workspaceId,
        connections: existing
          ? current.connections.map((candidate) => candidate.id === existing.id ? connection : candidate)
          : [...current.connections, connection],
        updatedAt: now,
      });
    } catch (error) {
      // Native validation stores the credential before local metadata is
      // committed. Best-effort cleanup avoids stranding a vault entry when
      // local persistence fails; a cleanup failure is still safe because no
      // local record claims the connection exists.
      await this.nativeProvider.disconnect({ credentialReference }).catch(() => undefined);
      throw error;
    }

    let persistedConnection = connection;
    if (pendingCleanup.length) {
      const remaining: string[] = [];
      for (const reference of pendingCleanup) {
        try {
          await this.nativeProvider.disconnect({ credentialReference: reference });
        } catch {
          remaining.push(reference);
        }
      }
      if (remaining.length !== pendingCleanup.length) {
        persistedConnection = {
          ...connection,
          ...(remaining.length ? { supersededCredentialReferences: remaining } : {}),
        };
        if (!remaining.length) delete (persistedConnection as { supersededCredentialReferences?: readonly string[] }).supersededCredentialReferences;
        // If this bookkeeping save fails, the prior record still lists every
        // reference. Retrying cleanup is idempotent, so no credential is lost
        // from the cleanup set.
        await this.connectionStore.save({
          workspaceId: input.workspaceId,
          connections: current.connections.length
            ? current.connections.map((candidate) => candidate.id === id ? persistedConnection : candidate)
            : [persistedConnection],
          updatedAt: now,
        }).catch(() => undefined);
      }
    }

    return { kind: "connected", connection: persistedConnection };
  }

  async disconnect(workspaceId: string, destinationId: string): Promise<void> {
    const current = await this.loadConnections(workspaceId);
    const connection = current.connections.find(
      (candidate) => candidate.provider === "linkedin_member" && candidate.destinationId === destinationId,
    ) as LinkedInMemberConnectionRecord | undefined;
    if (!connection) return;

    // Remove every vault reference first. If local persistence then fails,
    // the remaining record references missing credentials and publishing fails
    // closed. The reverse order could silently orphan a secret.
    const references = [...new Set([
      connection.credentialReference,
      ...(connection.supersededCredentialReferences ?? []),
    ])];
    for (const credentialReference of references) {
      await this.nativeProvider.disconnect({ credentialReference });
    }
    const remaining = current.connections.filter((candidate) => candidate.id !== connection.id);
    if (remaining.length === 0) {
      await this.connectionStore.delete(workspaceId);
      return;
    }
    await this.connectionStore.save({
      workspaceId,
      connections: remaining,
      updatedAt: this.clock().toISOString(),
    });
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
