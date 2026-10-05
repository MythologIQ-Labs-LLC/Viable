import type { DiscoverySurface } from "./discoverability.js";

/**
 * Dated, sourced guidance about how content on each surface can be discovered
 * by search and answer engines. Platform behavior changes; every profile
 * carries its review date, sources, and confidence so stale guidance is
 * visible rather than treated as permanent truth.
 *
 * Deliberately absent: Domain Authority or any other third-party authority
 * score. Google representatives have publicly said Google does not use such
 * scores, and they are never used as product rules here.
 */

export type GuidanceConfidence = "high" | "medium" | "low";

export type GuidanceSource = Readonly<{
  title: string;
  url: string;
  kind: "first_party" | "third_party";
  published?: string;
}>;

export type DiscoverySurfaceProfile = Readonly<{
  surface: DiscoverySurface;
  label: string;
  /** How Viable can place content on this surface. */
  placement: "connected_or_manual" | "manual_only" | "earned_participation_only";
  externallyIndexable: string;
  answerEngineEvidence: string;
  permanence: string;
  leadGuidance: string;
  metadataGuidance: string;
  limitations: readonly string[];
  confidence: GuidanceConfidence;
  reviewedAt: string;
  sources: readonly GuidanceSource[];
}>;

const REVIEWED_AT = "2026-10-05";

const GOOGLE_GENERATIVE_AI_GUIDE: GuidanceSource = {
  title: "Google Search Central: A new resource for optimizing for generative AI in Google Search",
  url: "https://developers.google.com/search/blog/2026/05/a-new-resource-for-optimizing",
  kind: "first_party",
  published: "2026-05-15",
};
const GOOGLE_AI_FEATURES: GuidanceSource = {
  title: "Google Search Central: AI features and your website",
  url: "https://developers.google.com/search/docs/appearance/ai-features",
  kind: "first_party",
};
const GOOGLE_SPAM_POLICIES: GuidanceSource = {
  title: "Google Search Central: Spam policies (including site reputation abuse)",
  url: "https://developers.google.com/search/docs/essentials/spam-policies",
  kind: "first_party",
};
const SEMRUSH_LINKEDIN_STUDY: GuidanceSource = {
  title: "Semrush: LinkedIn AI visibility study (89K cited LinkedIn URLs)",
  url: "https://www.semrush.com/blog/linkedin-ai-visibility-study/",
  kind: "third_party",
  published: "2026-03-10",
};
const PEEC_CITATION_STUDY: GuidanceSource = {
  title: "Peec AI: Top domains cited by AI search (30M sources)",
  url: "https://peec.ai/blog/top-domains-cited-by-ai-search-analysis-based-on-30m-sources",
  kind: "third_party",
  published: "2026-03-31",
};

export const DISCOVERY_SURFACE_PROFILES: Readonly<Record<DiscoverySurface, DiscoverySurfaceProfile>> = {
  owned_web: {
    surface: "owned_web",
    label: "Owned website, docs, or blog",
    placement: "connected_or_manual",
    externallyIndexable: "Yes when crawlable, indexable, and eligible for snippets; this is the surface the owner fully controls.",
    answerEngineEvidence: "Google states AI Overviews and AI Mode rely on the same fundamentals as Search: indexable, useful, original, non-commodity content. No special markup is required.",
    permanence: "Durable and canonical; accumulates first-party authority under the owner's control.",
    leadGuidance: "State what the page is about, for whom, and the direct answer near the top.",
    metadataGuidance: "Provide an accurate title and meta description; use structured data only where it truthfully applies.",
    limitations: ["Visibility is earned slowly; new pages may not be indexed quickly."],
    confidence: "high",
    reviewedAt: REVIEWED_AT,
    sources: [GOOGLE_GENERATIVE_AI_GUIDE, GOOGLE_AI_FEATURES],
  },
  linkedin_post: {
    surface: "linkedin_post",
    label: "LinkedIn public post",
    placement: "connected_or_manual",
    externallyIndexable: "Posts shared with Anyone are visible off LinkedIn, including to signed-out viewers; search-engine visibility also depends on the member's public profile settings.",
    answerEngineEvidence: "Third-party 2026 studies place LinkedIn among the most-cited domains in AI answers, favoring original, educational, experience-backed content. LinkedIn itself does not document AI-engine retrieval.",
    permanence: "Persistent but feed-oriented; discoverability decays with recency on-platform.",
    leadGuidance: "Make the subject, entity, and core point clear in the opening lines (the feed truncation point is undocumented, roughly 140–210 characters). Natural language, not a fixed formula.",
    metadataGuidance: "Feed posts have no separate SEO fields; the opening text acts as the snippet.",
    limitations: [
      "Requires public (Anyone) visibility for external discovery.",
      "Truncation length is not documented by LinkedIn and varies by device.",
    ],
    confidence: "medium",
    reviewedAt: REVIEWED_AT,
    sources: [
      { title: "LinkedIn Help: post visibility settings", url: "https://www.linkedin.com/help/linkedin/answer/a523141", kind: "first_party" },
      { title: "LinkedIn Help: public profile and search engines", url: "https://www.linkedin.com/help/linkedin/answer/a548106", kind: "first_party" },
      SEMRUSH_LINKEDIN_STUDY,
      PEEC_CITATION_STUDY,
    ],
  },
  linkedin_article: {
    surface: "linkedin_article",
    label: "LinkedIn article or newsletter",
    placement: "manual_only",
    externallyIndexable: "Public articles are indexable and support explicit SEO title and description settings.",
    answerEngineEvidence: "Third-party 2026 research found long-form LinkedIn articles well represented among AI-cited LinkedIn URLs.",
    permanence: "Durable long-form content attached to the author's profile.",
    leadGuidance: "Lead with the question answered and the direct answer; support it with specific evidence.",
    metadataGuidance: "Set the SEO title (about 60 characters shown) and SEO description (about 160 characters) under the article settings.",
    limitations: ["Viable's connected LinkedIn path publishes feed posts only; articles are published manually."],
    confidence: "high",
    reviewedAt: REVIEWED_AT,
    sources: [
      { title: "LinkedIn Help: SEO title and description for articles", url: "https://www.linkedin.com/help/linkedin/answer/a6244140", kind: "first_party" },
      SEMRUSH_LINKEDIN_STUDY,
    ],
  },
  youtube: {
    surface: "youtube",
    label: "YouTube video",
    placement: "manual_only",
    externallyIndexable: "Yes; YouTube search ranks on relevance (title, description, video content), engagement, and quality.",
    answerEngineEvidence: "Third-party 2026 studies place YouTube among the most-cited domains in AI answers.",
    permanence: "Durable; evergreen explanatory content keeps accruing discovery.",
    leadGuidance: "Say what the video answers in the title and the first lines of the description.",
    metadataGuidance: "Write a specific title and description; captions improve accessibility (no first-party source ties them to ranking).",
    limitations: ["Only worthwhile when there is genuinely useful visual or explanatory material."],
    confidence: "medium",
    reviewedAt: REVIEWED_AT,
    sources: [
      { title: "YouTube Help: how YouTube search works", url: "https://support.google.com/youtube/answer/16090438", kind: "first_party" },
      { title: "YouTube Help: video description tips", url: "https://support.google.com/youtube/answer/12948449", kind: "first_party" },
      PEEC_CITATION_STUDY,
    ],
  },
  github: {
    surface: "github",
    label: "GitHub repository, release, or discussion",
    placement: "connected_or_manual",
    externallyIndexable: "Public repository pages and READMEs are commonly indexed; GitHub does not document search-engine indexing.",
    answerEngineEvidence: "Relevant for developer audiences; no reliable first-party evidence of answer-engine weighting.",
    permanence: "Durable and versioned; release notes and READMEs are canonical project truth.",
    leadGuidance: "Open the README or release with what the project is, who it is for, and what changed.",
    metadataGuidance: "Use repository topics (up to 20) and an accurate description so people can find the project.",
    limitations: ["Audience is developer-specific."],
    confidence: "medium",
    reviewedAt: REVIEWED_AT,
    sources: [
      { title: "GitHub Docs: classifying your repository with topics", url: "https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/classifying-your-repository-with-topics", kind: "first_party" },
      { title: "GitHub Docs: about READMEs", url: "https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-readmes", kind: "first_party" },
    ],
  },
  reddit_community: {
    surface: "reddit_community",
    label: "Reddit community participation",
    placement: "earned_participation_only",
    externallyIndexable: "Yes; Google has a data partnership giving it structured access to Reddit content.",
    answerEngineEvidence: "Third-party 2026 studies consistently place Reddit at or near the top of AI-cited domains because of specific, conversational, problem-oriented content.",
    permanence: "Durable threads; value depends on genuine community usefulness.",
    leadGuidance: "Answer the community's actual question first; disclose affiliation; no promotional boilerplate.",
    metadataGuidance: "None; community rules and subreddit norms are authoritative.",
    limitations: [
      "Never automated or cross-posted by Viable.",
      "Reddit defines spam as repeated or unsolicited actions, automated or manual, that negatively affect communities.",
      "Each subreddit's rules override general guidance.",
    ],
    confidence: "high",
    reviewedAt: REVIEWED_AT,
    sources: [
      { title: "Reddit Help: Spam", url: "https://support.reddithelp.com/hc/en-us/articles/360043504051-Spam", kind: "first_party" },
      { title: "Reddit Rules", url: "https://redditinc.com/policies/reddit-rules", kind: "first_party" },
      { title: "Google: expanded Reddit partnership", url: "https://blog.google/company-news/inside-google/company-announcements/expanded-reddit-partnership/", kind: "first_party", published: "2024-02-22" },
      PEEC_CITATION_STUDY,
    ],
  },
};

/** Cross-surface rules that hold regardless of the surface selected. */
export const DISCOVERABILITY_PRINCIPLES: readonly Readonly<{ statement: string; source: GuidanceSource }>[] = [
  {
    statement: "Foundational SEO, meaning crawlable, indexable, useful, and original content, is the basis for AI search features. Special AEO/GEO tricks are not a separate ranking system.",
    source: GOOGLE_GENERATIVE_AI_GUIDE,
  },
  {
    statement: "Do not publish content on an authoritative host merely to exploit that host's ranking signals (site reputation abuse).",
    source: GOOGLE_SPAM_POLICIES,
  },
];
