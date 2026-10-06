import type { ChannelKind } from "../domain/campaign.js";
import {
  CHANNEL_SURFACES,
  DISCOVERY_INTENTS,
  DISCOVERY_SURFACES,
  type DiscoverabilityBrief,
} from "../domain/discoverability.js";

export type DiscoverabilityFindingSeverity = "conflict" | "advisory";

export type DiscoverabilityFinding = Readonly<{
  code: string;
  severity: DiscoverabilityFindingSeverity;
  message: string;
}>;

const LEAD_CHARACTERS = 200;
const EVIDENCE_INTENTS = new Set(["question_answering", "authority_building", "comparison"]);
const SEO_METADATA_SURFACES = new Set(["linkedin_article", "owned_web"]);
const MAX_SEO_TITLE = 70;
const MAX_SEO_DESCRIPTION = 160;
const REPEATED_TERM_LIMIT = 4;

/** Validates and normalizes author input. Throws on structurally invalid briefs. */
export function normalizeDiscoverabilityBrief(input: DiscoverabilityBrief): DiscoverabilityBrief {
  const intents = unique(input.intents);
  const intendedSurfaces = unique(input.intendedSurfaces);
  if (intents.length === 0) throw new Error("Discoverability requires at least one discovery intent");
  if (intents.some((intent) => !DISCOVERY_INTENTS.includes(intent))) throw new Error("Unknown discovery intent");
  if (intendedSurfaces.some((surface) => !DISCOVERY_SURFACES.includes(surface))) throw new Error("Unknown discovery surface");
  if (input.visibility !== "public" && input.visibility !== "restricted") throw new Error("Discovery visibility must be public or restricted");
  const primaryEntity = input.primaryEntity.trim();
  const coreMessage = input.coreMessage.trim();
  if (!primaryEntity) throw new Error("Discoverability requires the primary entity name");
  if (!coreMessage) throw new Error("Discoverability requires a core message or direct answer");
  const seoTitle = input.seoTitle?.trim();
  const seoDescription = input.seoDescription?.trim();
  const reviewBy = input.reviewBy?.trim();
  if (reviewBy && Number.isNaN(Date.parse(reviewBy))) throw new Error("Discoverability review date must be a valid date");
  return {
    intents,
    topicQuestions: clean(input.topicQuestions),
    primaryEntity,
    categoryTerms: clean(input.categoryTerms),
    coreMessage,
    evidenceNotes: clean(input.evidenceNotes),
    intendedSurfaces,
    visibility: input.visibility,
    ...(seoTitle ? { seoTitle } : {}),
    ...(seoDescription ? { seoDescription } : {}),
    ...(reviewBy ? { reviewBy: new Date(reviewBy).toISOString() } : {}),
  };
}

/**
 * Deterministic review guidance for one channel variant. Conflicts are
 * contradictions in the approved intent and block approval; advisories inform
 * the human reviewer and never change content.
 */
export function assessDiscoverability(
  channel: ChannelKind,
  body: string,
  brief: DiscoverabilityBrief,
  now: Date,
): readonly DiscoverabilityFinding[] {
  const findings: DiscoverabilityFinding[] = [];
  const channelSurfaces = CHANNEL_SURFACES[channel];
  const occupied = brief.intendedSurfaces.filter((surface) => channelSurfaces.includes(surface));

  if (brief.visibility === "restricted") {
    findings.push(conflict(
      "restricted_visibility",
      "External search and answer-engine discovery requires public visibility. Restricted content cannot satisfy the stated discovery intents; make it public or remove the discoverability brief.",
    ));
  }

  if (brief.intendedSurfaces.length > 0 && occupied.length === 0) {
    findings.push(advisory(
      "channel_surface_mismatch",
      "This variant's channel does not occupy any intended discovery surface. Create a variant for an intended surface or adjust the brief.",
    ));
  }

  if (occupied.some((surface) => surface === "linkedin_post" || surface === "linkedin_article")) {
    findings.push(advisory(
      "linkedin_public_audience",
      "LinkedIn content is visible off LinkedIn only when shared with Anyone, and search-engine visibility also depends on the member's public profile settings. Viable's connected member publishing posts publicly; manual posting must choose Anyone.",
    ));
    const lead = body.trim().slice(0, LEAD_CHARACTERS).toLowerCase();
    const leadTerms = [brief.primaryEntity, ...brief.categoryTerms].map((term) => term.toLowerCase());
    if (!leadTerms.some((term) => lead.includes(term))) {
      findings.push(advisory(
        "lead_lacks_subject",
        "The opening lines do not name the entity or its category. Say plainly what this is about early, in natural language; no boilerplate formula is required.",
      ));
    }
  }

  if (brief.intents.some((intent) => EVIDENCE_INTENTS.has(intent)) && brief.evidenceNotes.length === 0) {
    findings.push(advisory(
      "evidence_missing",
      "Answer, comparison, and authority intents are best served by specific first-party evidence or experience. Record what supports the claim.",
    ));
  }

  if (occupied.some((surface) => SEO_METADATA_SURFACES.has(surface))) {
    if (!brief.seoTitle || !brief.seoDescription) {
      findings.push(advisory(
        "seo_metadata_missing",
        "This surface supports an explicit SEO title and description. Provide both so search snippets describe the content accurately.",
      ));
    }
    if (brief.seoTitle && brief.seoTitle.length > MAX_SEO_TITLE) {
      findings.push(advisory("seo_title_long", `SEO titles longer than about ${MAX_SEO_TITLE} characters are commonly truncated in results.`));
    }
    if (brief.seoDescription && brief.seoDescription.length > MAX_SEO_DESCRIPTION) {
      findings.push(advisory("seo_description_long", `SEO descriptions longer than about ${MAX_SEO_DESCRIPTION} characters are commonly truncated in results.`));
    }
  }

  if (brief.intendedSurfaces.includes("reddit_community")) {
    findings.push(advisory(
      "reddit_earned_participation",
      "Reddit is earned community participation, not a distribution channel. Viable will not cross-post there. Participate only where the community and its rules fit, and disclose affiliation.",
    ));
  }

  const repeated = brief.categoryTerms.find((term) => occurrences(body, term) >= REPEATED_TERM_LIMIT);
  if (repeated) {
    findings.push(advisory(
      "term_repetition",
      `"${repeated}" repeats ${occurrences(body, repeated)} times. Repetition for search engines reads as keyword stuffing; write for the reader first.`,
    ));
  }

  if (brief.reviewBy && Date.parse(brief.reviewBy) <= now.getTime()) {
    findings.push(advisory("freshness_review_due", "The discoverability review date has passed. Confirm the content is still current before approving or stocking it."));
  }

  return findings;
}

export function discoverabilityConflicts(findings: readonly DiscoverabilityFinding[]): readonly DiscoverabilityFinding[] {
  return findings.filter((finding) => finding.severity === "conflict");
}

function occurrences(body: string, term: string): number {
  const needle = term.trim().toLowerCase();
  if (!needle) return 0;
  return body.toLowerCase().split(needle).length - 1;
}

function conflict(code: string, message: string): DiscoverabilityFinding {
  return { code, severity: "conflict", message };
}

function advisory(code: string, message: string): DiscoverabilityFinding {
  return { code, severity: "advisory", message };
}

function clean(values: readonly string[]): readonly string[] {
  return unique(values.map((value) => value.trim()).filter(Boolean));
}

function unique<T>(values: readonly T[]): T[] {
  return [...new Set(values)];
}
