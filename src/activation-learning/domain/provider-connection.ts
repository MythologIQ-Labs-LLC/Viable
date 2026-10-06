export type ProviderConnectionStatus = "connected" | "reconnect_required" | "disabled";

export type LinkedInMemberConnectionRecord = Readonly<{
  id: string;
  workspaceId: string;
  destinationId: string;
  provider: "linkedin_member";
  authMode: "developer_portal_token";
  credentialReference: string;
  /** Superseded machine-local credential references awaiting idempotent vault cleanup. */
  supersededCredentialReferences?: readonly string[];
  memberId: string;
  memberUrn: string;
  requiredScopes: readonly ["openid", "profile", "w_member_social"];
  status: ProviderConnectionStatus;
  tokenExpiresAt?: string;
  createdAt: string;
  updatedAt: string;
}>;

export type ProviderConnectionRecord = LinkedInMemberConnectionRecord;

export type ProviderConnectionWorkspace = Readonly<{
  workspaceId: string;
  connections: readonly ProviderConnectionRecord[];
  updatedAt: string;
}>;
