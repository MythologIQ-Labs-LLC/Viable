# Publishing Analytics and Deterministic Composition Guidance

## Purpose

This document turns ADR-0011 into an implementation-ready architecture for two related Viable capabilities:

1. **deterministic composition guidance** for productization content;
2. **provider-backed publishing analytics and learning** after publication.

The design deliberately does **not** require model inference. Viable may later offer optional inference behind its normal authority boundaries, but the baseline product must be useful when no model, API key, or hosted service exists.

The guiding rule is:

> **Viable may structure, validate, compare, and recommend from explicit evidence. It does not need to generate prose to help a user make a better product-marketing decision.**

## Product boundary

This domain exists to improve the market presence of a product, repository, launch, campaign, or offer.

It is not a personal-branding system.

A personal social account may still be a valid destination when the publication objective is productization. Destination identity does not change domain ownership. Intent does.

## High-level flow

```text
Product truth / ICP / marketability objective
               |
               v
      Composition Brief
               |
               v
  User-authored channel variant
               |
               v
 Deterministic Guidance Engine
               |
               v
 Named-human approval / stock
               |
               v
 Existing deterministic publisher
               |
               v
 Provider publication receipt
               |
               v
 Analytics Snapshot Collector
               |
               v
 Derived Metrics + Cohort Comparison
               |
               v
 Productization Learning Record
               |
               v
 Advisory next experiment
```

## 1. Deterministic composition guidance

### 1.1 Composition is structured guidance, not generation

The composer guides the user through decisions that should exist before prose is finalized.

A `CompositionBrief` records:

```ts
type CompositionObjective =
  | "awareness"
  | "problem_education"
  | "product_proof"
  | "release"
  | "repository_growth"
  | "lead_generation"
  | "customer_evidence"
  | "market_learning"
  | "other";

interface CompositionBrief {
  id: string;
  productId: string;
  campaignId?: string;
  icpHypothesisId?: string;
  objective: CompositionObjective;
  primaryAudience: string;
  desiredOutcome: string;
  topic: string;
  contentFamily:
    | "observation"
    | "contradiction"
    | "problem_solution"
    | "build_proof"
    | "release_note"
    | "case_evidence"
    | "how_it_works"
    | "opinion"
    | "other";
  hookArchetype?: string;
  toneConstraints: string[];
  requiredClaims: string[];
  prohibitedClaims: string[];
  evidenceReferences: string[];
  destinationId: string;
  format: "text" | "image" | "video" | "document" | "link";
  mediaAssetIds: string[];
  callToAction?: string;
  externalLinkPolicy: "body" | "comment" | "none";
  hypothesis: string;
  createdAt: string;
}
```

The user authors the actual content. Viable can provide structured prompts such as:

- What should the reader understand after this post?
- What tension or problem makes the topic worth attention?
- What evidence supports the central claim?
- What action should the reader take, if any?
- Does this post stand alone for someone who did not see prior posts?
- Is this a product claim, a market observation, or an experiment?
- Which variable is intentionally being tested?

These are forms and checklists, not generated copy.

### 1.2 Hook archetypes

Viable may offer selectable hook structures without writing the user's sentence.

Examples:

| Archetype | Guidance |
| --- | --- |
| Contradiction | Put two true facts beside each other that appear difficult to reconcile. |
| Concrete experience | Begin with one specific event or observation rather than a general thesis. |
| Counterintuitive claim | State the conclusion that challenges the expected interpretation. |
| Cost of the status quo | Make the operational or human consequence concrete. |
| Product proof | Lead with what now exists or works, then show evidence. |
| Question | Ask a question only when the rest of the post answers or investigates it. |

The system stores the selected archetype so later analytics can compare like with like.

### 1.3 Deterministic guidance rules

The guidance engine returns findings, not rewritten prose.

```ts
interface GuidanceFinding {
  id: string;
  severity: "info" | "warning" | "blocking";
  ruleId: string;
  message: string;
  evidence?: string;
  remediationHint?: string;
}
```

Initial rules should include:

- channel character/format limits;
- empty or whitespace-only body;
- body identical to an already-published asset;
- missing composition objective;
- missing destination;
- missing approval authority;
- required claim without evidence reference;
- prohibited or stale product claim;
- unapproved factual assertion copied from Product Core;
- external link that violates the selected link policy;
- image/video without required accessibility text or metadata;
- unsupported media type for the destination;
- excessive hashtag count based on configured policy;
- continuity-dependent opening when the brief requires standalone discovery;
- call to action missing when the objective requires one;
- product-proof objective without a referenced proof artifact;
- experiment marked as single-variable when multiple tracked variables changed;
- scheduled time outside the selected experiment window;
- content variant stale because Product Core or ICP authority changed.

A finding never edits the content automatically.

### 1.4 Composition readiness facets

Do not collapse composition quality into one opaque score.

Expose separate states:

- **Truth readiness**: claims and evidence are current.
- **Audience readiness**: audience and intended outcome are explicit.
- **Message readiness**: topic, hook archetype, and CTA are explicit.
- **Channel readiness**: destination constraints are satisfied.
- **Experiment readiness**: hypothesis and changed variables are explicit.
- **Approval readiness**: named-human approval is valid.

A publication may proceed only when existing external-action rules allow it.

## 2. Publication experiment identity

Successful publication must bind the exact experiment context to the provider receipt.

```ts
interface PublicationExperiment {
  id: string;
  compositionBriefId: string;
  approvedAssetVersionId: string;
  destinationId: string;
  provider: string;
  scheduledFor?: string;
  publishedAt?: string;
  timezone: string;
  providerPublicationId?: string;
  status:
    | "draft"
    | "approved"
    | "scheduled"
    | "publishing"
    | "published"
    | "outcome_unknown"
    | "failed";
  changedVariables: Array<
    "topic" | "hook" | "tone" | "format" | "media" | "timing" | "audience" | "cta"
  >;
}
```

The provider publication ID is required before automatic provider analytics can be associated with the experiment.

## 3. Provider capability contract

Provider integrations must advertise capabilities instead of assuming feature parity.

```ts
interface SocialProviderCapabilities {
  publishText: boolean;
  publishImage: boolean;
  publishVideo: boolean;
  publicationReceipt: boolean;
  postAnalytics: boolean;
  profileOrPageAnalytics: boolean;
  mediaAnalytics: boolean;
  commentContent: boolean;
  demographicAnalytics: boolean;
}

interface SocialAnalyticsProvider {
  capabilities(): Promise<SocialProviderCapabilities>;
  collectPostAnalytics(input: {
    destinationId: string;
    providerPublicationId: string;
    window?: { from: string; to: string };
  }): Promise<ProviderAnalyticsResult>;
}
```

Authentication, scopes, quotas, review status, and runtime availability remain provider-specific adapter concerns.

A publishing-capable provider may legitimately report analytics as unavailable.

## 4. Analytics snapshots

### 4.1 Snapshots are append-only observations

Do not overwrite one mutable "current analytics" record.

```ts
type EvidenceState =
  | "observed"
  | "manual"
  | "estimated"
  | "unavailable"
  | "unknown";

interface AnalyticsObservation {
  metric: string;
  value?: number;
  unit: "count" | "ratio" | "milliseconds" | "seconds";
  evidenceState: EvidenceState;
  providerMetric?: string;
  limitation?: string;
}

interface AnalyticsSnapshot {
  id: string;
  publicationExperimentId: string;
  capturedAt: string;
  windowStartsAt?: string;
  windowEndsAt?: string;
  source: string;
  observations: AnalyticsObservation[];
}
```

Suggested standard checkpoints are operational defaults, not hard requirements:

- approximately 1 hour;
- 3 hours;
- 24 hours;
- 48 hours;
- 7 days.

If Viable is not running or the provider cannot be queried at the exact checkpoint, capture the next available observation and preserve the actual capture time.

### 4.2 Canonical metric families

Normalize provider-native metrics into families while preserving the original provider metric name.

**Distribution**

- impressions;
- members/users reached;
- in-network impressions;
- out-of-network impressions;
- video starts/plays.

**Response**

- reactions/likes;
- comments;
- reposts/shares;
- saves;
- sends;
- link clicks;
- watch time.

**Brand/product conversion**

- profile/page views attributable to content;
- followers gained;
- repository visits when evidenced;
- website visits;
- downloads;
- signups;
- demo requests;
- leads;
- purchases/subscriptions.

Missing metrics remain unavailable, never zero.

## 5. Deterministic derived metrics

Derived metrics are pure functions over snapshots.

Examples:

```text
impressions_per_reached = impressions / members_reached
engagements = reactions + comments + reposts + saves + sends
engagement_per_reached = engagements / members_reached
comment_rate = comments / members_reached
save_rate = saves / members_reached
profile_conversion = profile_views_from_content / members_reached
follower_conversion = followers_gained / members_reached
out_of_network_share = out_of_network_impressions / impressions
velocity_1h = impressions_at_1h / elapsed_hours
```

Rules:

- division by zero returns unavailable, not zero;
- every derived value records source snapshot IDs;
- formulas are versioned;
- provider and manually captured inputs may not be silently mixed without provenance.

## 6. Comparison cohorts

Analytics are useful only when compared to a meaningful cohort.

A `ComparisonCohort` can filter by:

- destination;
- objective;
- audience;
- content family;
- hook archetype;
- format;
- media presence;
- weekday;
- time bucket;
- campaign;
- product;
- publication age.

The UI should prefer medians and distributions over a single average when sample sizes are small or skewed.

Do not claim "best time" from one breakout post.

### 6.1 Deterministic evidence tiers

An initial conservative policy:

- **Insufficient**: fewer than 3 comparable observations in a cohort.
- **Emerging**: at least 3 comparable observations across at least 2 different dates.
- **Repeatable candidate**: at least 5 comparable observations and the direction of the effect is consistent in at least 4.
- **Established local pattern**: at least 8 comparable observations across at least 4 weeks, with no single post contributing more than half of the total outcome being cited.

These labels are product guidance, not statistical proof. The UI must say so.

## 7. Guidance after publication

The learning engine is deterministic and evidence-citing.

Example output:

> Contradiction hooks have produced higher median out-of-network reach than product-proof hooks in 4 of 5 comparable LinkedIn text posts. Comment conversion is not consistently higher. Treat stronger discovery as an emerging pattern, not proof of causality.

Or:

> Thursday afternoon currently has only two comparable posts. There is not enough evidence to recommend it over Tuesday morning.

Every recommendation stores:

- rule/version;
- cohort filters;
- source experiment IDs;
- source snapshot IDs;
- calculated evidence;
- confidence label from the deterministic policy;
- limitation text.

## 8. Productization-specific interpretation

Viable must keep intermediate attention metrics separate from product outcomes.

A post can be:

- high distribution / low product conversion;
- low distribution / high product conversion;
- high discussion / wrong audience;
- high save rate / low click rate;
- strong repository growth / weak social engagement.

The UI should show these as facets rather than one "success score."

Suggested outcome facets:

- **Discovery**
- **Conversation**
- **Retention/utility** (save/watch behavior)
- **Destination conversion**
- **Product conversion**
- **Evidence quality**

## 9. Manual fallback

Connected analytics are not a prerequisite for the domain.

The user may enter a manual snapshot with:

- metric;
- value;
- source label;
- capture time;
- optional screenshot/evidence reference;
- limitation.

Manual data is visibly marked and never silently upgraded to provider-observed evidence.

This preserves the learning loop while provider access is pending, revoked, rate-limited, or unsupported.

## 10. Runtime and credential boundary

- provider secrets never enter portable workspace backups;
- provider connection state is runtime capability state;
- the PWA may expose manual composition, export, and analytics import even when live provider credentials are unavailable;
- native runtimes may expose secure credential storage and connected provider execution when supported;
- no runtime may pretend a provider capability exists when it does not;
- no background analytics collection is assumed until Viable has an explicit background-runtime design.

## 11. Implementation slices

### Slice A: composition brief and deterministic guidance

- add `CompositionBrief`;
- add hook/content-family taxonomy;
- add deterministic guidance findings;
- add readiness facets;
- wire into Campaigns/Studio;
- no provider work.

### Slice B: publication experiment binding

- bind approved channel variant to experiment context;
- persist changed-variable metadata and hypothesis;
- attach provider publication receipt to the experiment.

### Slice C: analytics evidence model

- add append-only snapshots and normalized observations;
- add manual snapshot entry/import;
- add deterministic derived metrics.

### Slice D: LinkedIn analytics adapter

- add capability/scopes discovery;
- map supported LinkedIn member/org metrics into normalized observations;
- fail honestly when analytics entitlement is absent.

### Slice E: cohort comparison and learning

- add comparable-post filters;
- add deterministic evidence tiers;
- add source-citing learning records;
- surface advisory next-experiment guidance.

### Slice F: product conversion evidence

- connect social experiment IDs to repository/site/download/lead evidence where supported;
- preserve attribution uncertainty.

## 12. Non-goals

- AI-written posts as a requirement;
- automatic rewriting at publish time;
- autonomous campaign creation;
- universal social-media "best practices" presented as truth;
- a single engagement/success score;
- personal career branding;
- silent scraping of unsupported provider analytics;
- a dependency on Job Ranger.

## Related documents

- ADR-0011: Productization publishing analytics and learning authority;
- ADR-0002: provider-neutral adapters;
- ADR-0004: evidence provenance and partial failure;
- ADR-0005: human approval for external action;
- ADR-0009: deterministic publishing and evidence-gated provider setup;
- `activation-and-learning-domain.md`;
- `content-inventory-and-automated-publishing.md`;
- `../decisions/automated-publishing-implementation-decisions.md`.
