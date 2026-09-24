export type RevisionHistoryKind = "product_truth" | "icp" | "campaign" | "content_brief" | "variant";

export type RevisionSummaryField = Readonly<{ label: string; value: string }>;
export type RevisionSnapshotSummary = Readonly<{
  available: boolean;
  fields: readonly RevisionSummaryField[];
  message?: string;
}>;

export function summarizeRevisionSnapshot(snapshot: string, kind: RevisionHistoryKind): RevisionSnapshotSummary {
  let value: unknown;
  try {
    value = JSON.parse(snapshot);
  } catch {
    return { available: false, fields: [], message: "The prior-version snapshot could not be read. Revision metadata remains available." };
  }
  if (!isRecord(value)) return { available: false, fields: [], message: "The prior-version snapshot is not a readable record. Revision metadata remains available." };

  const fields = kind === "product_truth" ? productTruthFields(value)
    : kind === "icp" ? icpFields(value)
      : kind === "campaign" ? campaignFields(value)
        : kind === "content_brief" ? contentBriefFields(value)
          : variantFields(value);
  return fields.length
    ? { available: true, fields }
    : { available: false, fields: [], message: "No readable prior-version values were found. Revision metadata remains available." };
}

function productTruthFields(value: Record<string, unknown>): RevisionSummaryField[] {
  const identity = record(value.identity);
  return compact([
    field("Name", identity.name), field("Description", identity.description), field("Lifecycle", identity.lifecycle),
    field("Supported environments", identity.supportedEnvironments), field("Capabilities", value.capabilities), field("Limitations", value.limitations),
    field("Positioning", value.positioning), field("Alternatives", value.alternatives), field("Differentiation", value.differentiation),
    field("Pricing", value.pricing), field("Packaging", value.packaging), field("Offers", value.offers), field("Calls to action", value.callsToAction),
    field("Brand voice", value.brandVoice), field("Terminology", value.terminology), field("Accessibility constraints", value.accessibilityConstraints),
  ]);
}

function icpFields(value: Record<string, unknown>): RevisionSummaryField[] {
  return compact([
    field("Name", value.name), field("Summary", value.summary), field("Status", value.status), field("Review state", value.reviewStatus),
    field("Owner", value.owner), field("Confidence", value.confidence), field("Disqualifiers", value.disqualifiers),
    field("Assumptions", value.assumptions), field("Contradictions", value.contradictions), field("Next validation action", value.nextValidationAction),
    field("Change conditions", value.changeConditions), field("Last reviewed", value.lastReviewedAt),
  ]);
}

function campaignFields(value: Record<string, unknown>): RevisionSummaryField[] {
  return compact([
    field("Title", value.title), field("Objective", value.objective), field("Primary outcome", value.primaryOutcome), field("Primary audience", value.primaryAudience),
    field("Audience authority", value.audienceKind), field("Problem", value.problem), field("Trigger", value.trigger), field("Offer", value.offer),
    field("Message hierarchy", value.messageHierarchy), field("Proof", value.proof), field("Call to action", value.callToAction), field("Channels", value.channels),
    field("Asset plan", value.assetPlan), field("Owner", value.owner), field("Success measures", value.successMeasures), field("Dependencies", value.dependencies),
    field("Status", value.status), field("Reviewed by", value.reviewedBy), field("Review note", value.reviewNote),
  ]);
}

function contentBriefFields(value: Record<string, unknown>): RevisionSummaryField[] {
  return compact([
    field("Title", value.title), field("Objective", value.objective), field("Audience", value.audience), field("Primary outcome", value.primaryOutcome),
    field("Pillars", value.pillars), field("Themes", value.themes), field("Deliverables", value.deliverables), field("Source notes", value.sourceNotes),
    field("Owner", value.owner), field("Status", value.status), field("Reviewed by", value.reviewedBy), field("Review note", value.reviewNote),
  ]);
}

function variantFields(value: Record<string, unknown>): RevisionSummaryField[] {
  return compact([
    field("Channel", value.channel), field("Body", value.body), field("Constraints", value.constraints), field("Status", value.status),
    field("Reviewed by", value.reviewedBy), field("Review note", value.reviewNote),
  ]);
}

function field(label: string, value: unknown): RevisionSummaryField | undefined {
  const formatted = format(value);
  return formatted ? { label, value: formatted } : undefined;
}

function format(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return value.map(format).filter(Boolean).join(" · ");
  if (isRecord(value)) return Object.entries(value)
    .map(([key, entry]) => `${key} = ${format(entry)}`)
    .filter((entry) => !entry.endsWith(" = "))
    .join(" · ");
  return "";
}

function record(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function compact(values: readonly (RevisionSummaryField | undefined)[]): RevisionSummaryField[] {
  return values.filter((value): value is RevisionSummaryField => Boolean(value));
}
