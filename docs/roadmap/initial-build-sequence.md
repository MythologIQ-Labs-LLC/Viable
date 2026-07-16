# Viable Initial Build Sequence

## Purpose

This sequence identifies the first complete product slices to build after the sanitized Event Radar migration and independent CI are complete.

## Slice 1: Product truth, ICP discovery, and marketability assessment

Status: internal workflow implemented and automatedly validated; hands-on accessibility and unfamiliar-founder acceptance remain open under issue #2.

### User outcome

A founder creates one product workspace, verifies what the product does, identifies and compares credible ICP hypotheses, selects a primary ICP with evidence and disqualifiers, defines the offer, and receives an evidence-backed marketability assessment with prioritized next actions.

### Required capabilities

- product workspace;
- capabilities and limitations;
- claims and proof ledger;
- multiple ICP hypotheses;
- users, buyers, decision-makers, approvers, influencers, champions, blockers, partners, maintainers, contributors, and disqualifiers;
- problem intensity, urgency, product fit, time to value, access, proof, adoption friction, commercial viability, retention potential, strategic fit, and evidence quality;
- anti-ICP and disqualification conditions;
- explicit assumptions, contradictions, confidence, freshness, and owner;
- ICP comparison and validation experiments;
- selected, secondary, adjacent, rejected, and historical ICP candidates;
- positioning and alternatives;
- pricing, packaging, offers, and calls to action;
- marketability dimensions;
- evidence and confidence;
- priority plan;
- Product and Home desktop navigation.

### Why first

Every later campaign, asset, repository recommendation, outreach draft, video script, lead qualification rule, and sales conversation depends on accurate product truth and a defensible understanding of who the product is actually for.

### Exit criteria

- an unfamiliar founder can create and compare at least two plausible ICP hypotheses;
- the selected ICP shows evidence, assumptions, contradictions, disqualifiers, and a next validation action;
- generated suggestions remain distinct from observed evidence;
- the marketability assessment explains every recommendation;
- a product-truth or ICP gap can become an owned action, experiment, campaign, or product-feedback item.

## Slice 2: Signals inbox with events and public repositories

Status: internal workflow implemented and automatedly validated through PR #13; hands-on accessibility and unfamiliar-user acceptance remain open under issue #5.

### User outcome

A user connects or imports event and GitHub repository evidence, reviews new signals, and converts a signal into a product task, ICP validation action, campaign brief, content brief, or repository-growth action.

### Required capabilities

- provider-neutral signals;
- source health and partial failure;
- event signal adapter from sanitized Event Radar functionality;
- GitHub repository metadata and activity import;
- evidence drawer;
- relationship to product truth, ICP hypotheses, campaigns, repositories, people, organizations, and opportunities;
- accept, dismiss, tag, connect, assign, and convert actions;
- Signals and Market desktop navigation.

### Why second

Events provide the inherited opportunity source, while public repositories immediately connect Viable to a high-value MythologIQ use case and the broader marketability thesis. Both also provide evidence that can strengthen, weaken, or challenge ICP assumptions.

## Slice 3: Campaign brief and canonical asset

Status: guarded campaign, canonical-asset, channel-variant, review, invalidation, local-persistence, Campaigns and Studio desktop workflow, channel comparison, and downloadable manual-export journey implemented and automatedly validated through PR #18; hands-on accessibility and unfamiliar-user acceptance remain open under issue #6.

### User outcome

A user converts product truth, the selected ICP or a deliberate test audience, and accepted signals into one approved campaign brief and creates a canonical content asset with evidence, claims, variants, and review state.

### Required capabilities

- campaign objective, ICP or audience;
- problem, trigger, offer, message, proof, and call to action;
- asset matrix;
- canonical asset;
- LinkedIn, website, and GitHub release variants;
- claims, evidence, rights, accessibility, and ICP relationship;
- comments, review, approval, and version history;
- Campaigns and Studio desktop navigation.

### Why third

This proves that Viable can transform product truth, ICP context, and market evidence into useful, governed market action before external automation is added.

### Remaining exit evidence

- hands-on keyboard and assistive-technology review;
- unfamiliar-user completion of the campaign-to-export journey without maintainer intervention;
- remediation of any evidenced accessibility, clarity, or recovery gaps.

## Slice 4: Repository growth and launch room

### User outcome

A maintainer can assess a public repository, fix the highest-impact readiness gaps, prepare a release, coordinate launch assets for the intended ICP or community, and review traffic and adoption outcomes.

### Required capabilities

- repository readiness assessment;
- README, description, homepage, topic, social preview, quick-start, release, community, and trust checks;
- launch checklist and asset matrix;
- explicit target ICP, community, or adopter segment;
- manual social and community exports;
- traffic, referral, clone, release-download, star, fork, issue, discussion, and contributor imports where available;
- launch retrospective;
- no promise of GitHub Trending.

### Why fourth

This creates a differentiated, measurable Viable use case that directly serves MythologIQ's public product portfolio and produces adoption evidence that can refine ICP assumptions.

## Slice 5: Video production package and ViMax prototype

### User outcome

A user converts an approved campaign asset into a production-ready short-video package, runs ViMax separately or through an optional local CLI adapter, and imports the output for review.

### Required capabilities

- video brief;
- approved ICP or audience context;
- approved script and claims;
- storyboard and shot list;
- asset rights and consent;
- platform formats and captions;
- provider-neutral video job manifest;
- manual export and import;
- optional ViMax CLI invocation using OS-vault credential injection;
- render status, artifact manifest, and review state;
- no automatic publishing.

### Why fifth

It validates the creative-production architecture without forcing Viable to bundle a large Python and provider-runtime dependency into the first desktop release.

## Slice 6: Calendar, manual activation, and outcome capture

### User outcome

A user schedules approved assets, exports channel-ready packages, records delivery URLs or outcomes, and completes a campaign or ICP validation retrospective.

### Required capabilities

- unified calendar;
- approval checks;
- manual channel export;
- delivery evidence;
- basic performance imports;
- experiment and retrospective;
- learning ledger;
- ability to connect outcomes to ICP confidence without silently rewriting the canonical ICP.

### Why before publishing adapters

The core operating loop must work without paid or restricted platform APIs. Publishing adapters then improve convenience rather than determining whether the product is useful.

## Release gates for every slice

- product and authority boundaries documented;
- no imported external organization content or credentials;
- secret scanning and dependency review;
- loading, empty, error, partial-success, and recovery states;
- keyboard, screen-reader, text-scale, reduced-motion, caption, and non-color status support;
- tests for prohibited state transitions;
- backup and export impact reviewed;
- README, PRD, ICP specification, status, architecture, roadmap, and user documentation synchronized;
- unfamiliar-user acceptance completed for the slice's primary journey.
