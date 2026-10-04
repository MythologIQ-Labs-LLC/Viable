import type {
  ActivationSourceKind,
  ActivationSourceSnapshot,
  DestinationChannel,
} from "../domain/activation-learning.js";

export interface PublicationSourceAuthorityPort {
  resolve(
    workspaceId: string,
    kind: ActivationSourceKind,
    sourceId: string,
    channel: DestinationChannel,
  ): Promise<ActivationSourceSnapshot>;
}