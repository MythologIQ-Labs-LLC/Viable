# ADR-0007: ICP Hypotheses and Validation Belong to Product Core

- Status: Accepted
- Date: 2026-07-15
- Decision owner: MythologIQ Labs, LLC

## Context

Viable must help founders identify, validate, and refine the proper ideal customer profile for a product.

A broad audience list, social following, event attendee set, repository visitor, anonymous engagement record, or generated persona is not sufficient to establish an ICP.

Without an explicit authority boundary, several failure modes are likely:

- campaigns silently redefine the ICP to match their chosen audience;
- lead-scoring logic treats any reachable person as an ideal customer;
- generated suggestions become accepted customer facts;
- provider profiles become canonical identity or fit records;
- product, campaign, sales, and analytics systems maintain conflicting ICP definitions;
- a single unexplained score hides weak, contradictory, or stale evidence;
- later outcomes overwrite prior reasoning and destroy decision history.

The architecture needs a durable answer for where ICP hypotheses live, how they are changed, and how external evidence affects them.

## Decision

ICP hypotheses are canonical Product Core records.

Product Core owns:

- candidate ICP hypotheses;
- selected, secondary, adjacent, rejected, and historical ICP state;
- organization or customer characteristics;
- users, economic buyers, decision-makers, approvers, influencers, champions, blockers, partners, maintainers, contributors, and disqualifiers;
- problems, urgency, triggers, desired outcomes, and value assumptions;
- product fit, time to value, access, proof, adoption friction, commercial viability, retention potential, and strategic fit;
- anti-ICP and disqualification conditions;
- assumptions, contradictions, confidence, freshness, owner, and last-reviewed date;
- validation experiments and decision criteria;
- revision history and rationale;
- evidence that would cause an ICP to change.

Evidence and Signals may attach evidence to an ICP hypothesis and propose confidence changes.

Marketability Assessment may evaluate ICP clarity and readiness.

Campaigns may target the selected ICP, a narrower audience within it, or a deliberate adjacent-segment experiment.

Relationships and Sales may record fit, qualification, objections, wins, losses, stalls, and adoption outcomes.

Measurement and Learning may calculate observations and recommend review.

None of those contexts may silently rewrite the canonical ICP.

A material ICP change requires an explicit Product Core revision with:

- named owner;
- evidence and contradictions;
- previous and new state;
- rationale;
- affected campaigns, assets, leads, sales work, and assessments;
- timestamp and review history.

## Consequences

### Positive

- Product, campaign, content, lead, sales, and analytics workflows share one ICP authority.
- Generated suggestions remain distinct from reviewed evidence.
- Founders can compare candidate segments without losing rejected or historical reasoning.
- Product changes and market evidence can flag affected assumptions without mutating them automatically.
- Campaign experiments can test adjacent segments while preserving the canonical ICP.
- Anti-ICP and disqualification rules become explicit product records.
- ICP decisions become explainable, reversible, and testable.

### Costs

- Product Core requires additional entities and lifecycle states.
- Cross-context references must be version-aware.
- ICP changes require impact analysis across campaigns, assets, leads, sales, and measurement.
- Interfaces must present evidence and uncertainty without overwhelming unfamiliar founders.
- Validation requires user research and cannot be reduced to a universal numeric threshold.

## Alternatives considered

### Treat ICP as a campaign audience

Rejected because campaigns are temporary and may intentionally target experimental or narrower audiences.

### Treat ICP as a lead-scoring segment

Rejected because lead qualification is downstream from product and market strategy.

### Allow each integration to define audience fit

Rejected because provider-specific profiles and engagement data are evidence, not canonical product authority.

### Generate one ICP automatically from product text

Rejected because generated suggestions cannot replace customer, market, adoption, sales, and product evidence.

### Use one composite ICP score

Rejected as the primary authority because it can conceal assumptions, contradictions, and factor tradeoffs. Summaries may be used only when underlying evidence remains visible.

## Implementation implications

- Add canonical `IcpHypothesisId` and version identifiers.
- Keep ICP state in Product Core persistence.
- Store evidence relationships by identifier rather than copying provider content into ICP records.
- Preserve selected, secondary, adjacent, rejected, and historical states.
- Add explicit revision and impact-analysis operations.
- Add prohibited-transition tests preventing external contexts from directly mutating canonical ICP state.
- Keep anonymous engagement, known contacts, qualified leads, and ICP fit distinct.
- Require generated suggestions to be labeled as suggestions.
- Design unfamiliar-user workflows for creating, comparing, selecting, testing, and revising ICP hypotheses.

## Related requirements and documents

- PRD-ICP-001 through PRD-ICP-008
- PRD-MA-001 through PRD-MA-005
- PRD-LS-001 and PRD-LS-002
- `../product/icp-discovery-and-validation.md`
- `../architecture/icp-domain.md`
- `../roadmap/initial-build-sequence.md`
- GitHub issue #2
