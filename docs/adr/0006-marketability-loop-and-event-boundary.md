# ADR-0006: Marketability loop and event-intelligence boundary

- Status: Accepted
- Date: 2026-07-15

## Context

Viable evolved from an event-discovery foundation into a broader product for product truth, market research, campaigns, content, repository growth, website readiness, distribution, leads, sales support, video production, and measurement.

Without an explicit boundary, inherited event concepts could dominate navigation, persistence, scoring, scheduling, and product terminology even though events represent only one kind of market signal.

## Decision

The marketability loop is Viable's top-level product model:

```text
Assess
  -> understand
  -> position
  -> create
  -> activate
  -> capture demand
  -> support sales
  -> measure
  -> learn
```

Event intelligence is a bounded signal subsystem inside the Understand and Activate portions of that loop.

The event subsystem may own:

- canonical events and occurrences;
- recurrence and cancellation normalization;
- event sources and subscriptions;
- event-specific calendars and collections;
- event relevance evaluation;
- event reports and opportunity links.

It does not own:

- the product truth model;
- the global evidence model;
- all calendars or campaign scheduling;
- audience, campaign, asset, claim, approval, lead, sales, or measurement authority;
- top-level navigation or product identity.

Shared concepts shall use Viable-wide identifiers and contracts rather than promoting event-specific structures into universal records without review.

## Consequences

### Positive

- inherited event capability remains valuable without constraining the product;
- new signal sources can use common evidence and opportunity models;
- campaign and content workflows remain provider-neutral;
- the roadmap can sequence event migration separately from product-truth implementation;
- top-level navigation reflects user decisions rather than source types.

### Negative

- inherited event code may require refactoring at context boundaries;
- duplicate calendar, schedule, or evidence concepts must be reconciled deliberately;
- migration cannot be treated as a blind repository copy;
- adapters and persistence schemas may require anti-corruption layers.

## Alternatives considered

### Event Radar as the core application with added modules

Rejected because event concepts would remain structurally privileged and would not represent the full marketability operating model.

### Remove event functionality and rebuild later

Rejected because the event subsystem provides proven value and a useful first signal source.

## Implementation implications

- create an anti-corruption boundary around imported event code;
- map event evidence into the shared Evidence and Signal contracts;
- keep event recurrence and provider normalization within the Event Intelligence context;
- use the global calendar for campaign, review, release, publication, experiment, and sales dates;
- document and test which context owns each persisted record;
- avoid event-specific language in top-level product APIs and navigation.

## Related requirements and documents

- PRD: PRD-SI-001, PRD-SI-006 and MVP definition
- Architecture: context map and event anti-corruption layer
- Roadmap: Phase 0, Phase 2, and initial build Slice 2
