# Viable Documentation

This directory is the authoritative documentation set for Viable.

## Documentation authority

When documents conflict, use this order:

1. accepted Architecture Decision Records;
2. Product Requirements Document;
3. platform architectural design;
4. current implementation state;
5. product and experience roadmaps;
6. product operating-model and supporting design documents;
7. README summaries;
8. issues and pull requests for scoped implementation work.

Issues and pull requests may implement or propose changes, but they may not silently redefine product or architectural authority.

## Start here

- [Product Requirements Document](product/PRD.md)
- [Architecture Decision Records](adr/README.md)
- [Platform architectural design](architecture/viable-platform.md)
- [Current state](status/current-state.md)
- [Product roadmap](roadmap/product-roadmap.md)
- [Experience design roadmap](roadmap/design-roadmap.md)
- [Documentation verification](reviews/documentation-verification-2026-07-15.md)

## Product

- [Product Requirements Document](product/PRD.md)
- [Product scope](product/product-scope.md)
- [Marketability operating model](product/marketability-operating-model.md)
- [Open-source repository growth](product/open-source-repository-growth.md)

## Architecture

- [Platform architectural design](architecture/viable-platform.md)
- [ADR index](adr/README.md)
- [ADR template](adr/TEMPLATE.md)

## Roadmap

- [Product roadmap](roadmap/product-roadmap.md)
- [Experience design roadmap](roadmap/design-roadmap.md)
- [Initial build sequence](roadmap/initial-build-sequence.md)

## Integrations

- [ViMax video generation assessment](integrations/vimax-video-generation.md)

## Governance and safety

- [Research, content, and outreach safety](governance/research-and-outreach-safety.md)

## Status and reviews

- [Current state](status/current-state.md)
- [Documentation verification, 2026-07-15](reviews/documentation-verification-2026-07-15.md)

## Source migration

- GitHub issue #1 is the implementation authority for the sanitized Event Radar product-code migration.
- No external organization content, credentials, account identifiers, destinations, prompts, logs, reports, confidential fixtures, or secret-bearing material may be imported.
- Imported event functionality must respect ADR-0006 and remain a bounded subsystem inside the wider marketability architecture.

## Documentation expectations

Documentation must distinguish:

- required product behavior;
- accepted architecture decisions;
- designed architecture;
- implemented behavior;
- validated behavior;
- planned behavior;
- optional integrations;
- external platform assumptions;
- known limitations;
- decisions that require current revalidation.

A material product or architectural change must update the PRD, ADRs, architecture, roadmap, current state, README, and user documentation that it affects.
