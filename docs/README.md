# Viable Documentation

This directory is the authoritative documentation set for Viable.

## Documentation authority

When documents conflict, use this order:

1. accepted Architecture Decision Records;
2. Product Requirements Document;
3. platform and domain architectural designs;
4. current implementation state;
5. product and experience roadmaps;
6. product operating-model and supporting design documents;
7. README summaries;
8. issues and pull requests for scoped implementation work.

Issues and pull requests may implement or propose changes, but they may not silently redefine product or architectural authority.

## Start here

For a new session or contributor, read:

1. [Current session handoff](handoff/CURRENT.md)
2. [Product Requirements Document](product/PRD.md)
3. [ICP discovery and validation](product/icp-discovery-and-validation.md)
4. [Architecture Decision Records](adr/README.md)
5. [Platform architectural design](architecture/viable-platform.md)
6. [ICP domain architectural design](architecture/icp-domain.md)
7. [Current state](status/current-state.md)
8. [Initial build sequence](roadmap/initial-build-sequence.md)
9. [Open decisions](decisions/open-decisions.md)

Supporting review records:

- [Documentation verification](reviews/documentation-verification-2026-07-15.md)
- [Documentation verification closure](reviews/documentation-verification-closure-2026-07-15.md)

## Handoff and terminology

- [Current session handoff](handoff/CURRENT.md)
- [Detailed session capture, 2026-07-15](handoff/session-context-2026-07-15.md)
- [Canonical glossary](GLOSSARY.md)

## Product

- [Product Requirements Document](product/PRD.md)
- [Product scope](product/product-scope.md)
- [ICP discovery and validation](product/icp-discovery-and-validation.md)
- [Marketability operating model](product/marketability-operating-model.md)
- [Open-source repository growth](product/open-source-repository-growth.md)
- [Product provenance and ownership](product/provenance-and-ownership.md)

## Architecture

- [Platform architectural design](architecture/viable-platform.md)
- [ICP domain architectural design](architecture/icp-domain.md)
- [ADR index](adr/README.md)
- [ADR template](adr/TEMPLATE.md)

## Roadmap

- [Product roadmap](roadmap/product-roadmap.md)
- [Experience design roadmap](roadmap/design-roadmap.md)
- [Initial build sequence](roadmap/initial-build-sequence.md)

## Decisions

- [Open decisions register](decisions/open-decisions.md)

Resolved durable decisions belong in ADRs, the PRD, or another named authority. Open questions must not silently become implementation facts.

## Integrations

- [ViMax video generation assessment](integrations/vimax-video-generation.md)

Integration access, pricing, scopes, provider terms, and review requirements must be revalidated when implementation begins.

## Governance and safety

- [Research, content, and outreach safety](governance/research-and-outreach-safety.md)

## User guides

- [Product and ICP desktop workflow](user/product-and-icp-workflow.md)
- [Signals Inbox and Market evidence workflow](user/signals-inbox.md)
- [Campaigns and Studio desktop workflow](user/campaigns-and-studio.md)
- [Public Repository Growth and Launch workflow](user/repository-growth.md)

## Status and reviews

- [Current state](status/current-state.md)
- [Documentation verification, 2026-07-15](reviews/documentation-verification-2026-07-15.md)
- [Documentation verification closure, 2026-07-15](reviews/documentation-verification-closure-2026-07-15.md)

## Source migration

- GitHub issue #1 is the implementation authority for the sanitized Event Radar product-code migration.
- [Product provenance and ownership](product/provenance-and-ownership.md) defines the durable migration and ownership boundary.
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

A material product or architectural change must update the PRD, ADRs, architecture, roadmap, current state, README, issues, and user documentation that it affects.

The current handoff should be refreshed when a major product boundary, accepted decision, issue sequence, migration posture, or open decision changes materially.
