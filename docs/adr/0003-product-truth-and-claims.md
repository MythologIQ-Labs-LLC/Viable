# ADR-0003: Product truth and claims ledger authority

- Status: Accepted
- Date: 2026-07-15

## Context

Viable is expected to produce or coordinate website copy, social content, repository launches, sales material, email, outreach, image briefs, and video scripts. Without a canonical product record, generated work will drift, invent capabilities, repeat obsolete language, or make claims that lack proof.

Prompt instructions alone are not sufficient governance for product claims.

## Decision

Viable shall maintain a canonical product-truth model and claims ledger that govern downstream assessment, recommendation, campaign, content, outreach, and sales workflows.

Product truth includes:

- capabilities and limitations;
- supported environments and dependencies;
- audiences and buying roles;
- problems, outcomes, triggers, and objections;
- positioning, categories, alternatives, and differentiation;
- pricing, packaging, offers, and calls to action;
- terminology, brand voice, visual constraints, and accessibility expectations;
- proof and source evidence.

Claims shall use explicit states:

- approved;
- unverified;
- outdated;
- conflicting;
- prohibited;
- retired.

Generated and imported assets shall identify the claims and evidence they use. A generated asset cannot promote an unverified, conflicting, prohibited, or retired claim without an explicit review decision.

## Consequences

### Positive

- product language remains consistent across channels;
- unsupported claims can be detected before distribution;
- reviewers can see why content says what it says;
- product changes can identify affected assets and campaigns;
- assessments and recommendations share one authority.

### Negative

- product records require active maintenance and review dates;
- content generation may be blocked until claims are clarified;
- importing existing assets requires claim extraction and reconciliation;
- users must distinguish product truth from aspirational roadmap language.

## Alternatives considered

### Prompt-only product context

Rejected because prompts are transient, difficult to audit, and unable to provide durable claim state or impact analysis.

### Treat every document as equal authority

Rejected because conflicting documents would make product truth indeterminate.

## Implementation implications

- stable product, capability, limitation, claim, proof, and evidence entities;
- version history and last-reviewed timestamps;
- contradiction detection and explicit resolution;
- impact queries from changed claims to assets and campaigns;
- generation services consume approved product context rather than arbitrary repository text;
- roadmap items remain separate from currently supported capabilities.

## Related requirements and documents

- PRD: PRD-PT and PRD-CA requirements
- Operating model: Product truth and claims
- Architecture: Product Core bounded context
- Roadmap: Phase 1 and all content-producing phases
