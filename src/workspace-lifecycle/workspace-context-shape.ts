type Shape = Readonly<{
  arrays: readonly string[];
  optionalArrays?: readonly string[];
  records?: readonly string[];
  optionalRecords?: readonly string[];
  strings?: readonly string[];
}>;

const SHAPES: Readonly<Record<string, Shape>> = {
  product: {
    arrays: ["claims", "evidence", "icpHypotheses", "assessments", "actions"],
    records: ["product"],
    optionalRecords: ["drafts"],
    strings: ["createdAt", "createdBy"],
  },
  campaign: {
    arrays: ["campaigns", "assets", "variants", "exports"],
    optionalArrays: ["contentBriefs"],
    strings: ["updatedAt"],
  },
  signals: {
    arrays: ["sources", "sourceHealth", "signals", "conversions"],
    strings: ["updatedAt"],
  },
  activation: {
    arrays: ["destinations", "calendarEntries", "packages", "exportOperations", "deliveryOutcomes", "measurementPlans", "performanceImports", "retrospectives", "learningLedger"],
    strings: ["updatedAt"],
  },
  repositoryGrowth: {
    arrays: ["repositories", "assessments", "plans", "launchRooms", "exports", "retrospectives"],
    strings: ["updatedAt"],
  },
  videoProduction: {
    arrays: ["tools", "briefs", "packages", "artifacts", "variants"],
    strings: ["updatedAt"],
  },
  websiteWatch: {
    arrays: ["sources", "sourceHealth", "sites", "targets", "snapshots", "observations", "generatedAnalyses"],
    strings: ["updatedAt"],
  },
};

export function assertWorkspaceContextShape(name: string, value: Readonly<Record<string, unknown>>, label: string): void {
  const shape = SHAPES[name];
  if (!shape) throw new Error(`Unsupported workspace context: ${name}`);
  for (const field of shape.arrays) {
    if (!Array.isArray(value[field])) throw new Error(`${label} field ${field} must be an array`);
  }
  for (const field of shape.optionalArrays ?? []) {
    if (value[field] !== undefined && !Array.isArray(value[field])) throw new Error(`${label} optional field ${field} must be an array when present`);
  }
  for (const field of shape.records ?? []) {
    if (!isRecord(value[field])) throw new Error(`${label} field ${field} must be an object`);
  }
  for (const field of shape.optionalRecords ?? []) {
    if (value[field] !== undefined && !isRecord(value[field])) throw new Error(`${label} optional field ${field} must be an object when present`);
  }
  for (const field of shape.strings ?? []) {
    if (typeof value[field] !== "string") throw new Error(`${label} field ${field} must be a string`);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
