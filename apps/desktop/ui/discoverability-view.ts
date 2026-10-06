import type { ChannelVariant } from "../../../src/campaigns/domain/campaign.js";
import {
  CHANNEL_SURFACES,
  DISCOVERY_INTENTS,
  DISCOVERY_SURFACES,
  type DiscoverabilityBrief,
  type DiscoveryIntent,
  type DiscoverySurface,
} from "../../../src/campaigns/domain/discoverability.js";
import { DISCOVERY_SURFACE_PROFILES } from "../../../src/campaigns/domain/discovery-surface-profiles.js";
import { assessDiscoverability } from "../../../src/campaigns/services/discoverability-assessment.js";

const INTENT_LABELS: Record<DiscoveryIntent, string> = {
  branded_search: "Branded search",
  category_search: "Category search",
  problem_solution: "Problem / solution search",
  comparison: "Comparison queries",
  question_answering: "Question answering",
  authority_building: "Authority building",
  launch_discovery: "Launch discovery",
};

const escapeHtml = (value: unknown): string => String(value ?? "")
  .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;").replaceAll("'", "&#039;");
const lines = (value: FormDataEntryValue | null): string[] =>
  String(value ?? "").split("\n").map((item) => item.trim()).filter(Boolean);
const text = (form: FormData, name: string): string => String(form.get(name) ?? "").trim();

/** Optional fieldset for the channel-variant creation form. */
export function discoverabilityFieldset(): string {
  const intents = DISCOVERY_INTENTS.map((intent) =>
    `<label><input type="checkbox" name="discoveryIntents" value="${intent}"> ${INTENT_LABELS[intent]}</label>`).join("");
  const surfaces = DISCOVERY_SURFACES.map((surface) =>
    `<label><input type="checkbox" name="discoverySurfaces" value="${surface}"> ${escapeHtml(DISCOVERY_SURFACE_PROFILES[surface].label)}</label>`).join("");
  return `<details class="discoverability"><summary>Discoverability strategy (optional)</summary>
    <p class="guidance">Plan how people and answer engines should find this variant. This informs named review; it never grants publication authority, and Viable never rewrites approved content for search.</p>
    <fieldset class="dimension"><legend>Discovery intents</legend>${intents}</fieldset>
    <label>Primary entity<input name="discoveryEntity" placeholder="Product, project, or organization name"></label>
    <label>Category and use-case terms, one per line<textarea name="discoveryCategoryTerms" rows="2"></textarea></label>
    <label>Questions this content answers, one per line<textarea name="discoveryQuestions" rows="3"></textarea></label>
    <label>Core message or direct answer<textarea name="discoveryCoreMessage" rows="2"></textarea></label>
    <label>Supporting first-party evidence or experience, one per line<textarea name="discoveryEvidence" rows="2"></textarea></label>
    <fieldset class="dimension"><legend>Intended discovery surfaces</legend>${surfaces}</fieldset>
    <label>Visibility<select name="discoveryVisibility"><option value="public">Public</option><option value="restricted">Restricted</option></select></label>
    <label>SEO title <span class="optional">articles and owned pages</span><input name="discoverySeoTitle"></label>
    <label>SEO description <span class="optional">articles and owned pages</span><input name="discoverySeoDescription"></label>
    <label>Review for freshness by <span class="optional">optional</span><input name="discoveryReviewBy" type="date"></label>
  </details>`;
}

/** Returns a brief only when the author actually started one. */
export function discoverabilityFromForm(form: FormData): DiscoverabilityBrief | undefined {
  const intents = form.getAll("discoveryIntents").map(String) as DiscoveryIntent[];
  const primaryEntity = text(form, "discoveryEntity");
  const coreMessage = text(form, "discoveryCoreMessage");
  if (intents.length === 0 && !primaryEntity && !coreMessage) return undefined;
  const seoTitle = text(form, "discoverySeoTitle");
  const seoDescription = text(form, "discoverySeoDescription");
  const reviewBy = text(form, "discoveryReviewBy");
  return {
    intents,
    topicQuestions: lines(form.get("discoveryQuestions")),
    primaryEntity,
    categoryTerms: lines(form.get("discoveryCategoryTerms")),
    coreMessage,
    evidenceNotes: lines(form.get("discoveryEvidence")),
    intendedSurfaces: form.getAll("discoverySurfaces").map(String) as DiscoverySurface[],
    visibility: text(form, "discoveryVisibility") === "restricted" ? "restricted" : "public",
    ...(seoTitle ? { seoTitle } : {}),
    ...(seoDescription ? { seoDescription } : {}),
    ...(reviewBy ? { reviewBy } : {}),
  };
}

/** Reviewer-facing summary, findings, and dated surface guidance for one variant. */
export function discoverabilityPanel(variant: ChannelVariant, now = new Date()): string {
  const brief = variant.discoverability;
  if (!brief) return "";
  const findings = assessDiscoverability(variant.channel, variant.body, brief, now);
  const findingList = findings.length
    ? `<ul class="discoverability-findings">${findings.map((finding) =>
      `<li><span class="pill ${finding.severity === "conflict" ? "error" : "warning"}">${finding.severity}</span> ${escapeHtml(finding.message)}</li>`).join("")}</ul>`
    : `<p class="guidance">No discoverability findings.</p>`;
  const occupied = brief.intendedSurfaces.filter((surface) => CHANNEL_SURFACES[variant.channel].includes(surface));
  const guidance = occupied.map((surface) => {
    const profile = DISCOVERY_SURFACE_PROFILES[surface];
    return `<li><strong>${escapeHtml(profile.label)}</strong>: ${escapeHtml(profile.leadGuidance)} <small>Guidance reviewed ${escapeHtml(profile.reviewedAt)} · ${escapeHtml(profile.confidence)} confidence · ${profile.sources.length} sources</small></li>`;
  }).join("");
  return `<details class="discoverability"><summary>Discoverability: ${escapeHtml(brief.intents.map((intent) => INTENT_LABELS[intent]).join(", "))}</summary>
    <p><strong>Entity:</strong> ${escapeHtml(brief.primaryEntity)} · <strong>Core message:</strong> ${escapeHtml(brief.coreMessage)}</p>
    ${brief.topicQuestions.length ? `<p><strong>Answers:</strong> ${escapeHtml(brief.topicQuestions.join(" · "))}</p>` : ""}
    ${findingList}
    ${guidance ? `<ul>${guidance}</ul>` : ""}
  </details>`;
}
