# Viable Glossary

## Purpose

This glossary defines the canonical meaning of important Viable terms. Product documentation, schemas, code, interfaces, tests, generated content, and issue descriptions should use these meanings consistently.

When a term needs a materially different meaning, update this glossary or create an ADR rather than quietly overloading the word.

## Product and market terms

### Product truth

The canonical, reviewed record of what a product currently is and is not, including capabilities, limitations, supported environments, pricing, packaging, offers, claims, proof, terminology, audiences, and constraints.

### Marketability

The degree to which a product can be clearly understood, credibly differentiated, discovered, evaluated, trusted, adopted or purchased, supported in a sales conversation, and improved through measurable learning.

Marketability is broader than promotion. It includes product readiness, audience fit, proof, offer, discoverability, conversion, sales readiness, and measurement.

### Viability

The ability of a product and its go-to-market approach to produce sustainable value for customers and the business. Viable helps users improve and evaluate the factors that contribute to viability, but it does not guarantee commercial success.

### Ideal customer profile or ICP

An evidence-backed description of the organizations or customers most likely to experience the target problem, receive meaningful value from the current product, adopt successfully, and support a viable commercial relationship.

An ICP is distinct from a broad audience, a channel follower, or a fictional persona.

### ICP hypothesis

A proposed ICP that has not yet accumulated enough evidence to be treated as validated.

### Anti-ICP

A customer or organization profile that should be excluded or deprioritized because fit, value, access, economics, requirements, expectations, or safety boundaries make the relationship unsuitable.

### Audience

A group for whom a message, asset, event, or campaign is intended. An audience may be broader or narrower than the ICP and does not automatically represent qualified demand.

### Persona

A role-oriented representation of a type of user, buyer, decision-maker, influencer, blocker, champion, maintainer, contributor, or partner. Personas help describe behavior and context but do not replace evidence-backed ICP analysis.

### User

A person who directly operates or receives value from the product.

### Economic buyer

The person or authority that controls or approves the budget.

### Decision-maker

A person with material authority over whether adoption proceeds.

### Influencer

A person who affects a buying or adoption decision without necessarily owning final authority.

### Champion

A person who actively advocates for adoption and helps move the decision or implementation forward.

### Blocker

A person, process, policy, requirement, or authority that can prevent adoption.

### Disqualifier

A condition that makes a segment, lead, opportunity, campaign, or action unsuitable.

### Positioning

The deliberate explanation of who the product is for, what problem it solves, what outcome it creates, how it differs from alternatives, and why the claims should be believed.

### Offer

The specific evaluation, purchase, trial, pilot, service, package, or next action presented to the intended audience.

### Call to action

The requested next step associated with an asset, campaign, or conversation.

## Evidence and intelligence terms

### Evidence

A sourced record used to support or challenge a claim, assessment, ICP hypothesis, recommendation, decision, or outcome interpretation.

Evidence retains provenance, capture time, freshness, confidence, access limitations, and relevant relationships.

### Provenance

The origin and acquisition context of evidence, including source, retrieval method, timestamp, authorization or access condition, and transformations applied.

### Confidence

A stated assessment of how strongly available evidence supports a conclusion. Confidence must not conceal missing, contradictory, stale, or biased evidence.

### Signal

A normalized observation that may affect product truth, ICP, positioning, campaign strategy, content, outreach, sales, repository growth, or measurement.

A signal is not automatically an opportunity, lead, recommendation, or verified fact.

### Source

A provider, document, feed, website, event system, repository, analytics system, imported record, or manual entry from which evidence or signals are obtained.

### Verified empty result

A successful source operation that authoritatively returned no matching records for the requested scope and time window.

### Partial failure

An operation in which some requested sources or records succeeded and others failed, were unavailable, unsupported, unauthorized, rate-limited, or incomplete.

Partial failure must remain visible and must not become a successful empty result.

### Opportunity

A time-bound or evidence-backed situation in which product, marketing, partnership, community, repository, event, or sales action may create meaningful value.

An opportunity is broader than a sales opportunity unless explicitly classified as one.

### Recommendation

A proposed action connected to evidence, expected outcome, confidence, effort, dependencies, owner, and verification method.

A recommendation is not an approval or command.

## Product truth and claim terms

### Claim

A statement about the product, customer outcome, market, proof, comparison, performance, or offer that may appear in content, sales material, outreach, or product documentation.

### Approved claim

A claim reviewed and permitted for defined contexts based on available evidence.

### Unverified claim

A claim that lacks sufficient evidence or review.

### Outdated claim

A claim that may once have been valid but no longer reflects current product or market reality.

### Conflicting claim

A claim for which available evidence or product records disagree.

### Prohibited claim

A claim that must not be used because it is false, unsupported, deceptive, unsafe, legally restricted, or inconsistent with product authority.

### Retired claim

A previously used claim intentionally removed from future use while retained for history and impact analysis.

### Proof

Evidence deliberately selected to support a claim, such as a demonstration, benchmark, case study, testimonial, reproducible example, release artifact, or validated product behavior.

## Campaign and asset terms

### Campaign

A coordinated, time-bound or evergreen body of work with one primary outcome, a defined audience, offer, message hierarchy, proof, call to action, channels, assets, owner, and success measures.

### Campaign brief

The authoritative strategy record for a campaign.

### Canonical asset

The approved source content and meaning from which channel-specific versions are derived.

### Channel variant

A platform- or destination-specific adaptation of a canonical asset. A channel variant does not become the canonical source of truth.

### Content atom

A reusable unit of approved meaning, evidence, copy, visual direction, proof, or call to action that can be assembled into larger assets.

### Asset

A content, design, website, email, sales, image, audio, video, repository, or campaign artifact managed by Viable.

### Production package

A provider-neutral export containing the approved brief, script or content, claims, evidence, rights, accessibility requirements, formats, assets, and output requirements needed by an external production tool.

### Delivery

The act and recorded result of transmitting approved content to a destination or recipient.

### Publication

A delivery that makes approved content available on a public or audience-facing destination.

### Schedule

An intent to perform an action at a future time. Scheduling does not imply approval or successful delivery.

## Approval and authority terms

### Draft

A record that has not received required review and approval.

### Review

The process of evaluating content, claims, evidence, rights, destination, disclosures, and risks before approval or rejection.

### Approval

A named human decision authorizing a specific revision, claims set, audience, destination, rights state, disclosures, and action scope.

Approval is invalidated by material changes to those bound elements.

### External action

An action that affects a person, account, platform, public audience, lead, customer, repository, or external system. Examples include publishing, messaging, submitting, inviting, uploading, or changing an external record.

### Adapter

A replaceable integration layer that translates Viable's provider-neutral intent into a supported external system capability.

Adapters do not own canonical product truth, evidence, campaigns, assets, approval, leads, or learning.

### Manual fallback

A supported path that allows the user to export, copy, import, download, or record an outcome when a direct API or automation path is unavailable, restricted, costly, or undesirable.

## Relationship and sales terms

### Anonymous engagement

Activity associated with an unknown person or organization. It is not a known contact or qualified lead.

### Known contact

A person with an identifiable relationship record and an appropriate source and consent basis.

### Lead

A known person or organization that may warrant evaluation or follow-up. A lead is not automatically qualified.

### Qualified lead

A lead that meets explicit fit, need, authority, timing, access, consent, and next-action criteria.

### Sales opportunity

A qualified commercial pursuit with defined participants, problem, potential value, stage, owner, next action, and outcome state.

### Relationship record

The evidence-backed canonical record connecting a person or organization to sources, consent, campaigns, interactions, leads, opportunities, roles, and outcomes.

### Consent

A recorded basis for collecting, using, retaining, or contacting a person in a defined context.

### Suppression

A rule preventing communication or processing for a person, organization, destination, or purpose.

## Measurement terms

### Metric

A defined quantitative or categorical measure with a source, calculation, scope, time window, and limitations.

### Baseline

The pre-change measurement or comparison state used to evaluate an intervention.

### Attribution

A model for assigning or describing influence among campaigns, assets, channels, interactions, leads, opportunities, or outcomes.

Attribution must identify its model and uncertainty.

### Experiment

A planned test with a hypothesis, audience or segment, intervention, success and failure conditions, observation window, guardrails, owner, and decision.

### Learning ledger

A durable record connecting evidence, decision, change, outcome, interpretation, and follow-up.

### Useful outcome

A result connected to product or customer value, such as successful evaluation, adoption, contribution, qualified conversation, sales progress, retention, product learning, or a validated decision.

Activity alone is not necessarily a useful outcome.

## Repository-growth terms

### Repository readiness

The degree to which a public repository can be discovered, understood, trusted, installed, used, supported, contributed to, and connected to a sustainable product or commercial path.

### Repository launch room

A coordinated workspace for release readiness, README and quick-start validation, demos, packages, community coverage, campaign assets, launch timing, live triage, metrics, and retrospective.

### Adoption

Meaningful use, installation, dependency, integration, contribution, or continued engagement with a repository or product.

A star alone is not proof of adoption.

### Trending or top-repository placement

An external platform outcome that Viable may observe or estimate with uncertainty but cannot guarantee.

## Event terms

### Event Intelligence

The bounded Viable subsystem that discovers, normalizes, scores, stores, schedules, and reports relevant event opportunities.

Event Intelligence supplies signals to the marketability loop. It does not own product truth, ICP, campaigns, assets, leads, approval, or measurement authority.

### Event opportunity

An event or occurrence that may support research, learning, community participation, partnership, launch, content, outreach, or sales preparation.

## Status terms

### Designed

Documented as intended behavior but not implemented.

### Implemented

Present in the repository but not necessarily validated for release.

### Validated

Implemented and confirmed through the required tests, review, and acceptance evidence.

### Operational

Validated and in active use within a stated environment and support boundary.

### Experimental

Available for evaluation with explicit limitations and no implied production commitment.

### Deprecated

Still present for transition or history but no longer recommended.

## Related documents

- `product/PRD.md`
- `product/icp-discovery-and-validation.md`
- `product/marketability-operating-model.md`
- `architecture/viable-platform.md`
- `adr/README.md`
