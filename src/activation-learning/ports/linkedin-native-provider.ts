export type LinkedInConnectResult =
  | Readonly<{
      kind: "connected";
      memberId: string;
      memberUrn: string;
    }>
  | Readonly<{
      kind: "rejected";
      failureClass: "invalid_token" | "insufficient_scope" | "rate_limited" | "provider_failure" | "local_unavailable";
      detail: string;
    }>;

export type LinkedInPublishResult =
  | Readonly<{
      kind: "published";
      publicationId: string;
      providerResponseId: string;
    }>
  | Readonly<{
      kind: "rate_limited";
      detail: string;
    }>
  | Readonly<{
      kind: "reconnect_required";
      detail: string;
    }>
  | Readonly<{
      kind: "local_unavailable";
      detail: string;
    }>
  | Readonly<{
      kind: "provider_rejected";
      detail: string;
    }>
  | Readonly<{
      kind: "outcome_unknown";
      detail: string;
    }>;

export interface LinkedInNativeProviderPort {
  connect(input: Readonly<{
    credentialReference: string;
    accessToken: string;
  }>): Promise<LinkedInConnectResult>;

  publishText(input: Readonly<{
    credentialReference: string;
    memberUrn: string;
    text: string;
  }>): Promise<LinkedInPublishResult>;
}
