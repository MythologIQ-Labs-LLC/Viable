import type {
  ActivationSourceKind,
  ActivationSourceSnapshot,
  DestinationChannel,
} from "../domain/activation-learning.js";

/**
 * Resolves current approved source authority for publication inventory.
 * Implementations must return the exact requested source kind and identifier
 * for the requested destination channel or fail closed.
 */
export interface PublicationSourceAuthorityPort {
  resolve(
    workspaceId: string,
    kind: ActivationSourceKind,
    sourceId: string,
    channel: DestinationChannel,
  ): Promise<ActivationSourceSnapshot>;
}