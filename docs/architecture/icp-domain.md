# ICP Domain Architectural Design

## Document control

| Field | Value |
|---|---|
| Status | Approved domain-design baseline; implementation pending |
| Last reviewed | 2026-07-15 |
| Product requirements | `../product/PRD.md` |
| Product behavior | `../product/icp-discovery-and-validation.md` |
| Architecture decision | `../adr/0007-icp-hypothesis-and-validation-authority.md` |
| Parent architecture | `viable-platform.md` |

## Purpose

This document defines the architecture required for Viable to help founders identify, compare, validate, select, and revise the proper ideal customer profile without confusing audiences, contacts, leads, or provider engagement with canonical ICP authority.

## Context ownership

ICP hypotheses belong to Product Core.

Other contexts contribute evidence and outcomes:

```text
Evidence and Signals
  -> evidence relationships and confidence proposals

Marketability Assessment
  -> ICP clarity and readiness evaluation

Campaigns and Assets
  -> target audiences and adjacent-segment experiments

Relationships and Sales
  -> fit, qualification, objections, wins, losses, stalls, adoption

Measurement and Learning
  -> outcomes, experiment results, and review recommendations

All of the above
  -> explicit Product Core review
  -> canonical ICP revision
```

No downstream context may directly mutate canonical ICP state.

## Canonical identities

The domain should include:

- `IcpHypothesisId`
- `IcpHypothesisVersionId`
- `IcpCandidateComparisonId`
- `IcpRevisionId`
- `IcpValidationExperimentId`
- `IcpFactorObservationId`
- `IcpDisqualifierId`
- `IcpRoleId`

Existing identifiers may be referenced:

- `ProductId`
- `EvidenceId`
- `SignalId`
- `AudienceId`
- `CampaignId`
- `PersonId`
- `OrganizationId`
- `OpportunityId`
- `ExperimentId`
- `MetricObservationId`
- `LearningEntryId`

Provider identifiers remain adapter references and evidence. They are not canonical ICP identity.

## Core aggregates

### ICP hypothesis

Owns:

- product relationship;
- name and description;
- lifecycle state;
- organization or customer characteristics;
- problem, urgency, triggers, desired outcomes, and value assumptions;
- roles and buying structure;
- product fit and prerequisites;
- adoption friction and constraints;
- commercial and retention assumptions;
- anti-ICP and disqualifiers;
- confidence summary;
- owner and last-reviewed date;
- current version;
- revision history.

### ICP version

A version is immutable after supersession and contains:

- factor values;
- assumption and evidence references;
- contradictions;
- selected role definitions;
- disqualifiers;
- confidence rationale;
- evidence that would change the hypothesis;
- review decision and timestamp.

### Candidate comparison

A comparison references two or more ICP hypotheses and evaluates:

- problem intensity;
- urgency;
- product fit;
- time to value;
- access;
- buyer clarity;
- proof;
- adoption friction;
- commercial viability;
- retention potential;
- strategic fit;
- evidence quality.

The comparison may provide ranges or classifications, but it must preserve factor-level evidence and cannot become an unexplained universal score.

### Validation experiment

Owns:

- hypothesis being tested;
- target segment and sample;
- assumption;
- intervention or research method;
- success and failure conditions;
- observation window;
- owner;
- evidence collected;
- result;
- decision and follow-up.

### Disqualifier

Owns:

- condition;
- reason;
- scope;
- evidence;
- severity;
- override policy if any;
- review date.

Disqualifiers are not negative labels applied to people. They are explicit fit, product, commercial, safety, policy, or delivery constraints.

## Lifecycle states

### ICP hypothesis states

- `draft`
- `researching`
- `candidate`
- `selected`
- `secondary`
- `adjacent`
- `rejected`
- `superseded`
- `retired`

Only one ICP hypothesis should normally be selected as primary for a product at a time. The product may retain multiple secondary or adjacent candidates.

### Validation experiment states

- `draft`
- `approved`
- `active`
- `completed`
- `inconclusive`
- `cancelled`
- `superseded`

### Revision states

- `proposed`
- `under_review`
- `accepted`
- `rejected`
- `superseded`

## Required invariants

1. A generated suggestion cannot become a selected ICP without explicit review.
2. A campaign audience cannot directly overwrite canonical ICP state.
3. A lead score cannot define the ICP.
4. Anonymous engagement cannot become a known contact or qualified lead.
5. Provider profiles cannot become canonical people, organizations, or ICP records by themselves.
6. A selected ICP must have at least one explicit evidence relationship, one stated uncertainty, and one review owner.
7. A rejected or superseded ICP remains available for history and comparison.
8. Material product-truth changes flag affected ICP assumptions.
9. ICP revisions record prior state, new state, evidence, rationale, owner, and affected records.
10. Confidence summaries expose factor-level evidence and contradictions.
11. Missing evidence is not negative evidence unless explicitly classified.
12. The domain cannot claim an ICP is validated through a universal threshold without a product decision defining the relevant context.

## Evidence relationships

Evidence is linked, not copied into the canonical ICP aggregate.

A relationship includes:

- `EvidenceId`;
- ICP hypothesis and version;
- factor affected;
- support, contradiction, or neutral classification;
- relevance and confidence;
- freshness;
- reviewer;
- notes and limitations.

Possible factors include:

- problem intensity;
- urgency;
- trigger;
- product fit;
- time to value;
- buyer authority;
- budget;
- access;
- proof;
- implementation friction;
- procurement friction;
- security or privacy constraints;
- commercial viability;
- retention potential;
- strategic fit.

## Impact analysis

When an ICP revision is proposed, Viable should identify affected:

- marketability assessments;
- campaigns;
- canonical assets and variants;
- website pages and offers;
- SEO and AEO plans;
- repository-growth plans;
- leads and qualification rules;
- account briefs and sales material;
- active experiments;
- scheduled work;
- attribution and measurement cohorts.

Affected records are flagged for review. They are not rewritten automatically.

## Application services

Expected application operations include:

- create ICP hypothesis;
- clone or derive candidate;
- attach evidence;
- record contradiction;
- define roles and buying structure;
- add or remove disqualifier;
- compare candidates;
- select primary ICP;
- classify secondary, adjacent, rejected, or retired candidates;
- create validation experiment;
- record experiment result;
- propose confidence change;
- propose ICP revision;
- review and accept or reject revision;
- run impact analysis;
- export ICP evidence packet and history.

## Presentation requirements

The founder experience should provide:

- guided candidate creation;
- plain-language factor explanations;
- clear distinction between evidence, assumptions, and generated suggestions;
- comparison without false precision;
- visible disqualifiers and anti-ICP conditions;
- evidence drawer and contradiction state;
- next validation action;
- revision and impact history;
- simplified, standard, and high-density views where useful;
- keyboard, screen-reader, scalable-text, reduced-motion, and non-color status support.

## Persistence

ICP persistence should support:

- immutable historical versions;
- explicit current-version pointers;
- evidence relationships by identifier;
- factor observations;
- role records;
- disqualifiers;
- validation experiments;
- revision decisions;
- impact-analysis records;
- migration and schema versioning;
- backup and export without credentials.

The initial physical schema remains an open implementation decision.

## Events and signals

Signals may propose ICP-related actions, such as:

- attach evidence;
- investigate a contradiction;
- create a validation experiment;
- compare a new candidate segment;
- review a disqualifier;
- reassess positioning or offer;
- flag a changed assumption.

Signals cannot directly select or revise the canonical ICP.

## Campaigns and adjacent-segment tests

A campaign must declare whether it:

- targets the selected ICP;
- targets a narrower audience within the selected ICP;
- tests a secondary or adjacent ICP;
- targets a non-commercial community or contributor audience;
- lacks sufficient ICP context and requires review.

Results from adjacent-segment campaigns feed the evidence and learning systems. They do not automatically redefine the selected ICP.

## Leads and sales

Relationship records may include ICP-fit observations, but fit is only one qualification dimension.

The system must distinguish:

- audience signal;
- anonymous engagement;
- known contact;
- ICP fit;
- qualified lead;
- sales opportunity;
- customer, partner, contributor, or maintainer relationship.

## Measurement

Useful ICP measures may include:

- time to first evidence-backed hypothesis;
- number and quality of candidates compared;
- proportion of selected factors supported by reviewed evidence;
- unresolved contradiction count and age;
- validation-experiment completion;
- conversion, adoption, time-to-value, retention, and sales outcomes by ICP version;
- frequency and rationale of ICP revisions;
- outcomes from adjacent-segment tests.

Every measure states its source, time window, model, and limitations.

## Testing requirements

Deterministic tests should cover:

- generator cannot select ICP;
- campaign cannot mutate ICP;
- lead score cannot mutate ICP;
- selected ICP requires review authority;
- revision preserves history;
- evidence relationship retains provenance;
- contradictory evidence remains visible;
- disqualifiers survive version changes unless explicitly reviewed;
- product-truth change triggers impact analysis;
- missing evidence does not become negative evidence;
- anonymous engagement remains distinct from a known contact;
- backup and export preserve ICP history without secrets.

## Related authority

- `../product/PRD.md`
- `../product/icp-discovery-and-validation.md`
- `../adr/0007-icp-hypothesis-and-validation-authority.md`
- `viable-platform.md`
- `../roadmap/initial-build-sequence.md`
- GitHub issue #2
