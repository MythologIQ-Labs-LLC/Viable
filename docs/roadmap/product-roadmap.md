# Viable Product Roadmap

## Roadmap intent

This roadmap turns Viable into a marketability operating system that helps a product become easier to understand, discover, trust, evaluate, buy, and improve.

The roadmap is outcome-based. Dates should be assigned only when capacity, platform access, and release ownership are known. Platform integrations must be revalidated before implementation because permissions, pricing, app-review rules, and feature availability change.

## Product thesis

Viable should not be another social scheduler with an AI text box attached.

Its durable value is the shared product and market model that connects:

```text
Product truth
  + market evidence
  + positioning
  + content and creative assets
  + website and search readiness
  + approved distribution
  + leads and sales context
  + measurable outcomes
  = repeatable marketability
```

Event monitoring is retained as an opportunity-signal capability. It is not the center of the product.

## Release principles

1. Build product truth before content volume.
2. Build evidence and strategy before broad automation.
3. Keep canonical content separate from channel payloads.
4. Require human approval before external publication or outreach.
5. Preserve a manual or export path when an API is costly, unavailable, or restricted.
6. Keep platform adapters replaceable.
7. Prefer small complete vertical slices over many disconnected screens.
8. Measure useful outcomes, not merely activity.
9. Make failures, uncertainty, and unsupported claims visible.
10. Keep the README, status, architecture, and roadmap synchronized with implementation.

## Phase 0: Product foundation and sanitized source migration

### Outcome

Viable has a clean MythologIQ-owned foundation, a coherent product identity, and no imported organization-specific content, credentials, or operational assumptions.

### Scope

- Complete the sanitized Event Radar code migration.
- Remove external organization names, branding, governance, destinations, account identifiers, prompts, fixtures, and confidential operations content.
- Run secret, credential, and organization-reference scans.
- Replace package names, application identifiers, icons, copyright, installer metadata, and update channels.
- Preserve only reusable event-product code, generic tests, schemas, and product documentation.
- Establish Viable's product model, marketability operating model, design principles, and architecture.
- Restore complete CI for Node, TypeScript, Rust, desktop, and package smoke testing.

### Exit criteria

- Viable builds and tests independently.
- No external organization or secret-bearing content remains.
- Native desktop identity is fully Viable.
- Event functionality remains usable as an opportunity-signal module.
- Documentation accurately states what is and is not implemented.

## Phase 1: Marketability assessment and product truth

### Outcome

A user can describe or import a product and receive an evidence-backed marketability assessment with prioritized next actions.

### Scope

- Product workspace creation.
- Website, documentation, repository, and manual product imports.
- Product capabilities, limitations, claims, proof, pricing, packaging, offers, and calls to action.
- Audience, buyer, user, influencer, and disqualifier records.
- Marketability dimensions and transparent scoring rubric.
- Evidence, confidence, owner, last-reviewed date, and recommended action for every score.
- Claims ledger with approved, unverified, outdated, prohibited, and conflicting states.
- Asset inventory for website, content, proof, sales, and visual materials.
- Prioritized readiness plan with effort, impact, dependency, and owner.

### Primary experience

```text
Create product workspace
  -> verify product truth
  -> define audiences and offers
  -> inventory proof and assets
  -> run marketability assessment
  -> review evidence and gaps
  -> choose the first priority
```

### Exit criteria

- The assessment can explain every recommendation.
- No generated claim bypasses the claims ledger.
- A user can turn an assessment gap into an owned task or campaign.
- The product has a usable first-run and weekly-review experience.

## Phase 2: Market, event, search, and social intelligence

### Outcome

Viable provides a research inbox that turns supported evidence into useful opportunities, questions, topics, objections, and actions.

### Scope

- Provider-neutral source registry.
- Saved research queries and monitoring schedules.
- Event signals from sanitized Event Radar sources.
- Public feed, website, newsletter, release-note, podcast, video, and news signals.
- Authorized social source adapters where access supports the intended use.
- Search query and Search Console imports.
- Competitor product, pricing, message, content, and release monitoring.
- Review, community, interview, sales-note, and customer-feedback imports.
- Signal deduplication, provenance, freshness, confidence, and partial-failure reporting.
- Topic, question, objection, organization, person, event, competitor, and campaign links.
- Research inbox actions: accept, dismiss, save, tag, assign, connect, or convert to work.

### Exit criteria

- A failed source cannot masquerade as no market activity.
- A user can trace every insight to source evidence.
- The inbox supports daily triage and weekly planning.
- Research can generate a campaign brief, content brief, product feedback item, lead, or sales action.

## Phase 3: Positioning and campaign planning

### Outcome

A user can convert product truth and market evidence into a focused campaign plan.

### Scope

- ICP, persona, job, pain, desired outcome, trigger, objection, and buying-role models.
- Category, alternative, competitive, and differentiation analysis.
- Message hierarchy and value proposition builder.
- Offer design and call-to-action selection.
- Campaign objective, audience, proof, channels, budget, timeline, owner, and success metrics.
- Launch, evergreen, event-driven, account-focused, partnership, and nurture campaign types.
- Campaign asset matrix and dependency graph.
- Claim, brand, accessibility, privacy, and platform-policy review plan.
- Campaign brief approval and version history.

### Exit criteria

- Every campaign has a single primary outcome and audience.
- Every claim and proof point is traceable.
- The campaign identifies what must exist before distribution begins.
- The asset plan can be handed directly to the Content Studio.

## Phase 4: Content and creative studio

### Outcome

Viable produces coherent, evidence-backed asset families from one approved campaign strategy.

### Scope

- Canonical content brief and source packet.
- Content pillars, themes, editorial calendar, and reusable content atoms.
- Website copy, landing pages, blogs, guides, FAQs, comparisons, and case studies.
- Social post families adapted for LinkedIn, Facebook, Instagram, X, Threads, Bluesky, and Mastodon.
- Newsletter, lifecycle email, sales email, and direct-message drafts.
- One-pagers, battlecards, demo scripts, pitch decks, proposals, and launch kits.
- Image briefs, carousel plans, diagrams, thumbnails, and ad concepts.
- Short-video scripts, hooks, shot lists, storyboards, captions, voiceover, aspect ratios, and edit instructions.
- Brand voice, claim, evidence, accessibility, duplication, and channel-fit checks.
- Review queues, comments, version comparison, approval, rejection, and rework.
- Export packages for design and video tools.

### Exit criteria

- One campaign can generate a coordinated asset family without copying the same text into every channel.
- Reviewers can see source evidence and claim state beside the draft.
- Approved canonical assets remain separate from platform-specific variants.
- The studio can produce a complete two-week campaign package.

## Phase 5: Website, SEO, AEO, and conversion

### Outcome

A user can understand and improve how a product website is discovered, interpreted, and converted into action.

### Scope

- Website crawl and content inventory.
- Page purpose, audience, funnel stage, topic, offer, and call-to-action mapping.
- Crawlability, indexability, sitemap, robots, canonical, metadata, structured-data, mobile, performance, HTTPS, and accessibility checks.
- Google Search Console and analytics imports.
- Keyword, question, topic-cluster, and content-gap planning.
- Page briefs and copy review for clarity, proof, differentiation, and conversion.
- Internal linking and content refresh recommendations.
- AEO and answer-readiness checks for direct answers, structured sections, entity consistency, authorship, evidence, and citations.
- Landing-page, form, booking, newsletter, trial, and demo conversion-path review.
- UTM and campaign-link generation.
- Experiment proposals and result tracking.

### Exit criteria

- A user can produce a prioritized website improvement plan.
- Every recommendation identifies the affected page, evidence, expected outcome, and validation method.
- Search and conversion outcomes can feed the measurement model.
- Viable can generate a reviewed landing-page package for a campaign.

## Phase 6: Content calendar and approved distribution

### Outcome

Approved assets can be scheduled, exported, or published through supported adapters with durable evidence and visible failures.

### Scope

- Unified editorial and campaign calendar.
- Canonical asset to channel-variant workflow.
- Destination identity and account ownership verification.
- Scheduling windows, time zones, recurrence, campaign pacing, and conflict detection.
- Manual copy, download, and export paths for every channel.
- LinkedIn publishing adapter assessment and implementation.
- Facebook Pages and Instagram professional publishing adapter assessment and implementation.
- X publishing adapter assessment with explicit usage-cost and feature constraints.
- TikTok and YouTube media publishing adapter assessment and implementation.
- Threads, Bluesky, Mastodon, CMS, newsletter, and email adapters where supported.
- Media validation, alt text, captions, disclosures, and platform-specific constraints.
- Human approval, token health, rate limits, retries, idempotency, and delivery evidence.
- Post-publication URL and status capture.

### Exit criteria

- No adapter can approve its own content.
- A failed or partial publication remains visible and recoverable.
- A user can complete the same campaign through manual exports when API access is unavailable.
- Published content can be connected to performance and lead outcomes.

## Phase 7: Lead capture, CRM, and sales enablement

### Outcome

Viable turns qualified attention into organized human follow-up and better sales conversations.

### Scope

- Forms, bookings, newsletter subscriptions, event contacts, referrals, and manual lead capture.
- Consent, source, campaign, medium, content, and attribution records.
- People, organization, opportunity, and relationship records.
- Evidence-backed deduplication and identity confidence.
- Qualification, lifecycle stage, owner, next action, and reminder queues.
- Transparent lead scoring and disqualification.
- Outreach drafts, templates, review queues, personalization constraints, and approved sending adapters.
- Suppression, unsubscribe, do-not-contact, retention, and deletion controls.
- Account briefs, discovery guides, meeting preparation, objection handling, proof selection, and follow-up.
- Proposal, mutual action plan, handoff, win, loss, stall, and objection records.
- Optional CRM synchronization.

### Exit criteria

- Marketing source and consent remain attached to the relationship record.
- Automated research cannot silently become automated outreach.
- A seller can prepare for and follow up on a meeting from one evidence-backed workspace.
- Sales outcomes update the product, market, and content learning loop.

## Phase 8: Visual and short-video production system

### Outcome

A user can move from campaign idea to reviewable short-form video package and selected production tooling.

### Scope

- Video objective, audience, channel, format, duration, and call-to-action brief.
- Hook, script, storyboard, shot list, b-roll, screen capture, voiceover, caption, music, thumbnail, and edit plan.
- Multiple aspect-ratio and duration variants.
- Product-demo, founder, educational, event, testimonial, launch, and social-proof templates.
- Asset-rights, disclosure, brand, accessibility, caption, and claim checks.
- Tool catalog that recommends production tools based on task, budget, platform, privacy, licensing, and available integrations.
- Export packages for editing, design, captioning, voice, avatar, animation, screen-recording, and generation tools.
- Optional generation adapters where rights, consent, cost, and quality are acceptable.
- Review, approval, render status, final asset, and source-project records.
- TikTok, Instagram Reels, YouTube Shorts, LinkedIn, Facebook, and website output variants.

### Exit criteria

- Viable can produce a complete production-ready package without requiring an embedded video model.
- Tool recommendations explain cost, data handling, rights, limitations, and fit.
- Generated or edited media retains source, consent, disclosure, and approval state.
- Final media can enter the same calendar and measurement workflow as text assets.

## Phase 9: Measurement, attribution, and optimization

### Outcome

Viable helps the user decide what to repeat, stop, change, or test next.

### Scope

- Shared campaign, asset, channel, audience, offer, experiment, lead, and opportunity identifiers.
- Reach, impressions, engagement, clicks, visits, conversion, qualified lead, meeting, opportunity, revenue, retention, cost, and effort metrics.
- Manual, first-touch, last-touch, multi-touch, and influence attribution models with stated uncertainty.
- Channel and asset benchmarks.
- Funnel and cohort views.
- Experiment hypotheses, variants, guardrails, stopping rules, and decisions.
- Content decay and refresh recommendations.
- Opportunity and pipeline feedback.
- Weekly and monthly marketability reviews.
- Learning ledger connecting evidence, decision, change, and outcome.
- Recommendation engine grounded in observed performance and product constraints.

### Exit criteria

- The system distinguishes activity from useful outcomes.
- Attribution always identifies its model and confidence.
- Recommendations link to observed evidence and a reversible next action.
- A user can complete a closed-loop campaign retrospective inside Viable.

## Phase 10: Viable 1.0 marketability operating system

### Outcome

A product team can use Viable as the daily and weekly operating environment for marketability without surrendering product truth or external action to opaque automation.

### Required 1.0 capabilities

- product truth and claims ledger;
- transparent marketability assessment;
- evidence-backed research inbox;
- campaign strategy and planning;
- coordinated content and creative studio;
- website, search, and conversion review;
- calendar, exports, and selected approved publishing adapters;
- lead and organization records;
- outreach review and approved delivery boundaries;
- sales enablement workspace;
- measurement and learning loop;
- local-first authority, credential isolation, backup, recovery, and export;
- accessible native desktop experience;
- reliable installer and update path;
- complete user, operator, integration, security, and architecture documentation.

## Cross-cutting workstreams

### Design system and accessibility

- semantic design tokens;
- light, dark, medium, and reduced-distraction themes;
- keyboard navigation and visible focus;
- screen-reader names, roles, states, and announcements;
- text scaling and reduced motion;
- high-density and simplified views;
- non-color status communication;
- content readability and caption support.

### Trust and governance

- credential vault and scoped connections;
- claims, evidence, approval, identity, and delivery ledgers;
- supported-access decisions per adapter;
- privacy, consent, suppression, retention, and deletion controls;
- provider-content isolation;
- prompt and tool injection resistance;
- role and approval policy;
- audit-friendly local history without positioning Viable as a compliance control system.

### Extensibility

- provider-neutral ports;
- adapter capability manifests;
- import and export contracts;
- local API and optional MCP surface after core permissions exist;
- webhook and automation triggers with explicit scope;
- plugin isolation and version compatibility;
- no platform-specific concepts in canonical product records.

## Integration priority framework

An integration should be prioritized by:

1. user value and audience fit;
2. official or explicitly authorized access;
3. permission and app-review feasibility;
4. predictable cost and rate limits;
5. data quality and provenance;
6. ability to preserve human approval;
7. failure and recovery behavior;
8. portability through manual import or export;
9. maintenance burden;
10. strategic independence from the provider.

## External platform notes

- Google Search guidance and Search Console should inform the website and search workstream, but Viable must not promise rankings.
- X supports authenticated post creation, but endpoint access, advanced features, and costs must be checked when the adapter is implemented.
- TikTok provides an official Content Posting API with app registration, user authorization, scope approval, and audit requirements for broader visibility.
- YouTube provides an official video upload API suitable for an approved media-delivery adapter.
- Meta publishing documentation and app permissions must be reviewed during the Facebook and Instagram adapter assessment.
- LinkedIn access and review requirements must be validated before organization or member publishing is promised.

## Source references

- Google SEO Starter Guide: https://developers.google.com/search/docs/fundamentals/seo-starter-guide
- Google Search Console guide: https://developers.google.com/search/docs/monitor-debug/search-console-start
- X create-post API: https://docs.x.com/x-api/posts/create-post
- TikTok Content Posting API: https://developers.tiktok.com/doc/content-posting-api-get-started/
- YouTube videos.insert API: https://developers.google.com/youtube/v3/docs/videos/insert
- Meta Instagram content publishing: https://developers.facebook.com/docs/instagram-platform/content-publishing/
- Meta Pages posts: https://developers.facebook.com/docs/pages-api/posts/
