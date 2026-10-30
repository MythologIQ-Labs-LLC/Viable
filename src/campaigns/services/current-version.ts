import type { CanonicalAsset } from "../domain/campaign.js";

/**
 * Rejects a review decision or correction made against a version other than
 * the record's current one. Another tab (or person) may have revised and
 * resubmitted the record after this view rendered it; a named approval must
 * attach to the content the reviewer actually saw, and a correction must not
 * silently overwrite a newer saved correction.
 *
 * `expected` is the version the acting view rendered. Callers that have no
 * rendered version (tests, internal flows) pass undefined.
 */
export function requireCurrentVersion(record: string, current: number, expected: number | undefined): void {
  if (expected === undefined) return;
  if (!Number.isInteger(expected) || expected !== current) {
    throw new Error(`This ${record} changed after it was opened here: this view shows version ${expected}, but version ${current} is now saved. Nothing was recorded. Open the ${record} again to see the current version before deciding.`);
  }
}

export function currentAssetVersion(asset: CanonicalAsset): number {
  return asset.versions.at(-1)?.version ?? asset.versions.length;
}

/** Reads a rendered version from a form or data attribute; empty means none. */
export function renderedVersion(value: unknown): number | undefined {
  const text = String(value ?? "").trim();
  return text === "" ? undefined : Number(text);
}
