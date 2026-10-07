# ADR-0011: Productization publishing analytics and learning authority

- Status: Accepted
- Date: 2026-10-08
- Supersedes: None
- Superseded by: None

## Context

Viable already owns product truth, ICP hypotheses, marketability assessment, campaign assets, approved external action, publishing intent, outcome evidence, retrospectives, and the learning ledger.

Connected publishing is becoming a real execution capability. The next durable problem is not merely whether Viable can publish to a provider, but whether it can learn from the resulting distribution and improve product-market communication without confusing attention with product success.

A closely related capability is also useful in Job Ranger. That product has a different authority boundary: personal career truth, professional positioning, and personal-brand outcomes. The overlap in provider mechanics is real, but a shared user goal is not. Viable must not become a personal-branding or career-optimization product merely because the same social APIs can technically serve both use cases.

The architecture therefore needs to permit intentionally duplicative provider capabilities while preserving separate domain authority, data models, recommendations, and definitions of success.

## Decision

Viable will treat publishing analytics as part of the productization learning loop.

Viable may publish and measure content on supported personal or organization destinations only when that content is governed by a Viable product, repository, campaign, ICP, marketability, launch, or related productization objective.

Viable does not own a person's career history, employability, target role, recruiter positioning, or personal-brand strategy. Those concerns belong outside Viable, including in Job Ranger when applicable.

The canonical loop is:

```text
Product truth / ICP / marketability objective
  -> content hypothesis
  -> canonical asset and channel variant
  -> named-human approval
  -> publish
  -> provider evidence
  -> time-series analytics snapshots
  -> normalized interpretation
  -> productization outcome
  -> learning ledger
  -> next reversible product/market action
```

### Publication experiment record

Each measured publication should preserve enough context to make later comparisons meaningful:

- destination and provider;
- product, repository, campaign, ICP, or marketability objective;
- exact approved content/version;
- topic and content family;
- hook/opening archetype;
- tone;
- format and attached media;
- intended audience;
- scheduled time, actual publication time, and timezone;
- provider publication identifier;
- explicit experiment hypothesis;
- expected outcome;
- relevant source/evidence provenance.

### Analytics snapshots

Analytics are observations, not mutable summary fields. Viable should preserve time-stamped snapshots so velocity and later changes remain inspectable.

Where a provider supports them, a snapshot may include:

- impressions;
- members/users reached;
- in-network versus out-of-network distribution when available;
- reactions;
- comments;
- reposts/shares;
- saves;
- sends;
- link clicks;
- video plays and watch time;
- profile/page views attributable to content;
- followers gained from content;
- destination-specific conversion events.

Every metric keeps:

- provider/source;
- observed-at timestamp;
- measurement window where applicable;
- evidence state;
- provider metric name or mapping;
- limitation when unavailable, estimated, delayed, or manually captured.

Unavailable is never converted to zero.

### Derived measures

Viable may calculate normalized measures including:

- impressions per reached member/user;
- early distribution velocity;
- out-of-network share;
- engagement per reached member/user;
- comment, repost, and save rates;
- click-through rate;
- profile/page-view conversion;
- follower conversion;
- product-conversion rate where evidence exists.

Derived measures must retain their formula and source snapshots.

### Productization outcomes

Viable optimizes for product-market learning, not social-media engagement as an end in itself.

Higher-value outcome evidence may include:

- repository visits, stars, forks, issues, or discussions attributable where supported;
- product-site visits;
- downloads or installs;
- signups;
- demo requests;
- qualified leads;
- customer conversations;
- purchases or subscriptions;
- other product-specific conversions.

A high-reach post with poor product relevance may be a weak outcome. A lower-reach post that produces qualified product interest may be a strong outcome.

### Recommendation authority

Analytics interpretation and recommendations are advisory.

Viable may recommend:

- topics;
- hook families;
- formats;
- timing windows;
- channels;
- audience refinements;
- follow-up experiments.

It may not infer causality from a single post, silently rewrite product truth, or publish a follow-up without the existing approval boundary.

Timing recommendations require repeated, reasonably comparable observations. Topic, hook, media, tone, audience, and timing should not be credited to one another without enough evidence to separate them.

### Provider access boundary

Publishing permission does not imply analytics permission.

Each provider adapter must declare separate capabilities for:

- publication;
- publication identity retrieval;
- analytics retrieval;
- profile/page analytics;
- media analytics;
- comments/content retrieval;
- demographic analytics.

A provider capability may be unavailable because of app review, scopes, account type, pricing, quota, or policy. Viable must surface that as a capability/evidence state rather than pretending the data does not exist.

For LinkedIn specifically, the existing self-service member-publishing proof and any Community Management analytics access remain separate provider capabilities. Viable must not assume that successful posting grants member analytics or organization analytics access.

### Cross-product boundary with Job Ranger

Viable and Job Ranger may both implement social publishing and analytics.

This is intentional duplication at the product-capability level, not accidental domain overlap.

- Viable owns productization objectives and product-market outcomes.
- Job Ranger owns personal professional positioning and career outcomes.
- Viable does not require Job Ranger.
- Job Ranger does not require Viable.
- Neither product shares canonical workspace state, approval authority, credentials, analytics records, or learning authority with the other.
- A future shared library is acceptable only for stateless/mechanical provider protocol code and must not own product semantics, user intent, authorization policy, storage authority, or recommendation logic.

When the same personal LinkedIn profile could be used by both products, the governing product is determined by the intent of the publication, not by the identity of the account. A founder post intended to market a product belongs to Viable. A post intended to strengthen the person's professional positioning belongs to Job Ranger.

## Consequences

### Positive

- analytics become part of the existing productization loop instead of a detached dashboard;
- attention, engagement, and product conversion remain distinguishable;
- time-series snapshots make early velocity and long-tail performance measurable;
- provider limitations remain explicit;
- timing and content recommendations can be evidence-based without pretending one post proves causality;
- Viable can use personal and organization destinations without becoming a personal-branding product;
- Job Ranger may implement similar mechanics without becoming a Viable module or dependency;
- future provider reuse remains possible without collapsing domain boundaries.

### Negative

- similar provider adapters and analytics concepts may exist in two products;
- some implementation may be intentionally duplicated;
- cross-product consistency must be maintained by architectural discipline rather than shared domain state;
- analytics schemas become richer than a simple metric/value table;
- provider approval and scope boundaries may delay automatic analytics even after publishing works;
- causal attribution remains uncertain and must be represented honestly.

## Alternatives considered

### Put all social publishing and analytics in Viable

Rejected. That would make Viable responsible for personal branding and career optimization, crossing the productization boundary.

### Put all LinkedIn personal-profile activity in Job Ranger

Rejected. A founder's personal profile can be a legitimate product distribution surface. Account identity alone does not determine domain ownership; publication intent does.

### Build one shared social-service product or hosted backend

Rejected for the current architecture. Neither product requires hosted shared infrastructure, and moving authority into a third system would complicate local-first trust and product ownership before the need is proven.

### Force both products to share one canonical analytics schema and database

Rejected. Similar metric mechanics do not imply identical business meaning. Viable and Job Ranger need different objectives, outcome models, and learning authority.

### Optimize for raw engagement

Rejected. Engagement is an intermediate signal. Viable's definition of success is productization learning and product-market outcome evidence.

### Infer best posting time from global best-practice tables

Rejected as authoritative behavior. External benchmarks may seed hypotheses, but Viable should learn from the user's own comparable publication history and preserve uncertainty.

## Implementation implications

- extend Activation and Learning with a provider-neutral publication experiment record;
- bind successful publication evidence to the provider publication identifier;
- add immutable/time-stamped analytics snapshot records rather than overwriting current values;
- distinguish provider-native metrics, derived metrics, and downstream product outcomes;
- preserve explicit unavailable/unknown/estimated/manual evidence states;
- add adapter capability discovery for publication versus analytics scopes;
- support manual analytics entry/import when connected retrieval is unavailable;
- add deterministic derived-metric calculations with formula/version metadata;
- add comparison views by objective, topic, hook, format, channel, and timing window;
- add learning-ledger entries that cite the observations supporting a recommendation;
- keep recommendation output advisory and existing named-human approval authoritative;
- do not block current publishing work on analytics access;
- do not introduce a Job Ranger runtime dependency.

## Related requirements and documents

- ADR-0001: local-first workspace authority;
- ADR-0002: provider-neutral adapters;
- ADR-0004: evidence provenance and partial failure;
- ADR-0005: human approval for externally consequential action;
- ADR-0006: marketability loop and event boundary;
- ADR-0009: deterministic publishing and evidence-gated provider setup;
- `docs/architecture/activation-and-learning-domain.md`;
- `docs/architecture/content-inventory-and-automated-publishing.md`;
- `docs/product/marketability-operating-model.md`;
- `docs/decisions/automated-publishing-implementation-decisions.md`;
- Job Ranger ADR-0001: personal-brand publishing and analytics authority.
