export type NamedHumanApproval = Readonly<{
  approvedBy: string;
  approvedAt: string;
  scope: string;
}>;

export function requireNamedHumanApproval(
  approval: NamedHumanApproval | undefined,
  requiredScope: string,
): NamedHumanApproval {
  if (!approval?.approvedBy.trim()) throw new Error("Named human approval is required");
  if (approval.scope !== requiredScope) throw new Error("Approval scope does not match the action");
  if (Number.isNaN(Date.parse(approval.approvedAt))) throw new Error("Approval timestamp is invalid");
  return approval;
}
