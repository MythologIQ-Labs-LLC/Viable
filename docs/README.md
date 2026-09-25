# Viable Documentation

This directory is the authoritative documentation set for Viable.

## Documentation authority

When documents conflict, use this order:

1. accepted Architecture Decision Records;
2. Product Requirements Document;
3. platform and domain architectural designs;
4. current implementation state;
5. product and experience roadmaps;
6. product operating-model and integration documents;
7. README and Wiki summaries;
8. issues and pull requests for scoped implementation work.

Issues and pull requests may implement or propose changes, but they may not silently redefine product or architectural authority.

## Start here

For someone evaluating the project or contributing to the public source, read:

1. [Product Requirements Document](product/PRD.md)
2. [Architecture Decision Records](adr/README.md)
3. [Platform architectural design](architecture/viable-platform.md)
4. [Current implementation state](status/current-state.md)
5. [Product provenance and ownership](product/provenance-and-ownership.md)
6. [Canonical glossary](GLOSSARY.md)
7. the domain architecture and user guide relevant to the work being considered.

Maintainers resuming an active implementation session should additionally read [Current session handoff](handoff/CURRENT.md). The handoff is continuity context, not required background for a public user or contributor.

## Wiki source

The curated GitHub Wiki content is source-controlled under [`docs/wiki/`](wiki/README.md). The Wiki is an orientation and operating layer, not a competing authority. Material changes to product scope, architecture, capability, security posture, licensing, or contribution rules should update the relevant Wiki source page in the same governed change before the GitHub Wiki copy is refreshed.

## Public source, license, and contribution boundaries

- Viable-owned source and documentation are licensed under [Apache License 2.0](../LICENSE) as accepted in [ADR-0008](adr/0008-public-source-licensing-and-release-boundary.md).
- [NOTICE](../NOTICE.md) records product ownership and source-provenance boundaries.
- [Third-party notices](../THIRD_PARTY_NOTICES.md) record deliberately reviewed third-party source and compatibility targets.
- [Contributing](../CONTRIBUTING.md) defines contribution, testing, provenance, and contribution-license expectations.
- [Security](../SECURITY.md) defines vulnerability-reporting guidance.
- [Support](../SUPPORT.md) defines the current pre-release support posture.

Public repository visibility is distinct from a supported end-user product release. Release readiness remains governed by the current implementation state, human acceptance gates, and release-foundation work.

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
- [Repository Growth domain architectural design](architecture/repository-growth-domain.md)
- [Video Production domain architectural design](architecture/video-production-domain.md)
- [Calendar, Activation, Outcome, and Learning architecture](architecture/activation-and-learning-domain.md)
- [Website Watch domain architecture](architecture/website-watch-domain.md)
- [ADR index](adr/README.md)
- [ADR template](adr/TEMPLATE.md)

## Roadmap

- [Product roadmap](roadmap/product-roadmap.md)
- [Experience design roadmap](roadmap/design-roadmap.md)
- [Initial build sequence](roadmap/initial-build-sequence.md)

## Decisions

- [Open decisions register](decisions/open-decisions.md)

Resolved durable decisions belong in ADRs, the PRD, domain architecture, or a named integration decision. Open questions must not silently become implementation facts.

## Integrations

- [ViMax video generation assessment and implemented Stage 1 boundary](integrations/vimax-video-generation.md)
- [Webdog website monitoring assessment and implemented Stage 1 boundary](integrations/webdog-website-monitoring.md)

Integration access, versions, pricing, scopes, licenses, provider terms, runtime assumptions, and review requirements must be revalidated when implementation begins or materially changes.

## Governance and safety

- [Research, content, and outreach safety](governance/research-and-outreach-safety.md)
- [Public source licensing and release boundary](adr/0008-public-source-licensing-and-release-boundary.md)
- [Third-party notices](../THIRD_PARTY_NOTICES.md)

## Human acceptance

- [Acceptance program](acceptance/README.md)
- [Frozen UX acceptance candidate, 2026-09-25](acceptance/ux-candidate-2026-09-25.md)
- [Accessibility and recovery acceptance runbook](acceptance/accessibility-runbook.md)
- [Unfamiliar-user demo acceptance runbook](acceptance/unfamiliar-user-demo-runbook.md)
- [Acceptance workspace seed specification](acceptance/acceptance-seed-spec.md)
- [Acceptance result template](acceptance/RESULT-TEMPLATE.md)

Human acceptance evidence is deliberately separate from automated CI and implementation completion. Acceptance results must identify the exact candidate, environment, workspace seed, facilitator interventions, findings, remediation, and rerun evidence.

## User guides

- [Product and ICP desktop workflow](user/product-and-icp-workflow.md)
- [Signals Inbox and Market evidence workflow](user/signals-inbox.md)
- [Website Watch in Signals and Market](user/website-watch.md)
- [Campaigns and Studio desktop workflow](user/campaigns-and-studio.md)
- [Public Repository Growth and Launch workflow](user/repository-growth.md)
- [Video Production in Studio](user/video-production.md)
- [Calendar, Manual Activation, Outcomes, and Learning](user/calendar-activation-and-learning.md)

## Wiki pages

- [Wiki source index](wiki/README.md)
- [Home](wiki/Home.md)
- [Getting Started](wiki/Getting-Started.md)
- [Product Model](wiki/Product-Model.md)
- [Workflows](wiki/Workflows.md)
- [Architecture and Governance](wiki/Architecture-and-Governance.md)
- [Integrations](wiki/Integrations.md)
- [Security and Privacy](wiki/Security-and-Privacy.md)
- [Development and Contributing](wiki/Development-and-Contributing.md)
- [Licensing and Public Source](wiki/Licensing-and-Public-Source.md)

## Status and reviews

- [Current state](status/current-state.md)
- [Automated viability sweep, 2026-07-16](reviews/viability-sweep-2026-07-16.md)
- [Documentation verification, 2026-07-15](reviews/documentation-verification-2026-07-15.md)
- [Documentation verification closure, 2026-07-15](reviews/documentation-verification-closure-2026-07-15.md)

## Maintainer continuity

- [Current session handoff](handoff/CURRENT.md)
- [Detailed session capture, 2026-07-15](handoff/session-context-2026-07-15.md)

These files preserve implementation continuity. They do not override accepted product, architecture, licensing, or current-state authority.

## Source migration

- GitHub issue #1 is the implementation authority for the sanitized Event Radar product-code migration.
- [Product provenance and ownership](product/provenance-and-ownership.md) defines the durable migration and ownership boundary.
- No external-organization content, credentials, account identifiers, destinations, prompts, logs, reports, confidential fixtures, or secret-bearing material may be imported.
- Imported event functionality must respect ADR-0006 and remain a bounded subsystem inside the wider marketability architecture.
- Website Watch may use Webdog-compatible public alert evidence but must not import Webdog credentials, account sessions, hosted database state, private monitored content, notification destinations, or secret-bearing configuration.

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

A material product or architectural change must update the PRD, ADRs, architecture, roadmap, current state, README, issues, integration assessments, third-party notices, relevant Wiki source, and user documentation that it affects.

The current handoff should be refreshed when a major product boundary, accepted decision, issue sequence, migration posture, integration posture, or open decision changes materially.
