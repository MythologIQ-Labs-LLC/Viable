import type { ChannelKind } from "./campaign.js";

/**
 * Discoverability is upstream content strategy owned by Campaigns / Studio.
 * It informs creation and named review of a channel variant. It never grants
 * publication authority, and the scheduler never rewrites approved content
 * for search or answer engines.
 *
 * Third-party authority scores (Domain Authority, Domain Rating, Authority
 * Score) are intentionally absent: they are not search-engine ranking signals
 * and are not product truth.
 */

export type DiscoveryIntent =
  | "branded_search"
  | "category_search"
  | "problem_solution"
  | "comparison"
  | "question_answering"
  | "authority_building"
  | "launch_discovery";

export type DiscoverySurface =
  | "owned_web"
  | "linkedin_post"
  | "linkedin_article"
  | "youtube"
  | "github"
  | "reddit_community";

export type DiscoveryVisibility = "public" | "restricted";

export type DiscoverabilityBrief = Readonly<{
  intents: readonly DiscoveryIntent[];
  /** Questions or topic cluster this content should help answer. */
  topicQuestions: readonly string[];
  /** Product, project, or organization name that must be unambiguous. */
  primaryEntity: string;
  /** Category and use-case terminology the audience actually searches with. */
  categoryTerms: readonly string[];
  /** Concise core message or direct answer. */
  coreMessage: string;
  /** First-party evidence or experience that makes the content worth retrieving. */
  evidenceNotes: readonly string[];
  intendedSurfaces: readonly DiscoverySurface[];
  /** Visibility the approved publication intent requires on the surface. */
  visibility: DiscoveryVisibility;
  /** Explicit SEO title for surfaces that support one (articles, owned pages). */
  seoTitle?: string;
  /** Explicit SEO description for surfaces that support one. */
  seoDescription?: string;
  /** When this content should be reviewed for staleness, if time-sensitive. */
  reviewBy?: string;
}>;

export const DISCOVERY_INTENTS: readonly DiscoveryIntent[] = [
  "branded_search",
  "category_search",
  "problem_solution",
  "comparison",
  "question_answering",
  "authority_building",
  "launch_discovery",
];

export const DISCOVERY_SURFACES: readonly DiscoverySurface[] = [
  "owned_web",
  "linkedin_post",
  "linkedin_article",
  "youtube",
  "github",
  "reddit_community",
];

/** Surfaces a variant for a given publication channel can directly occupy. */
export const CHANNEL_SURFACES: Readonly<Record<ChannelKind, readonly DiscoverySurface[]>> = {
  linkedin: ["linkedin_post", "linkedin_article"],
  website: ["owned_web"],
  github_release: ["github"],
  facebook_page: [],
  instagram_feed: [],
};
