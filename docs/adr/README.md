# Viable Architecture Decision Records

## Purpose

Architecture Decision Records document durable decisions that constrain Viable's product and technical design.

ADRs answer **why a boundary exists**. The PRD defines required outcomes, the architecture documents describe the resulting system, and the roadmap sequences implementation. Once accepted, an ADR is changed only by a new ADR that supersedes it. Humanity has tried silently rewriting past decisions; version control is the less theatrical option.

## Status values

- **Proposed:** under review and not yet authoritative.
- **Accepted:** authoritative for new implementation.
- **Superseded:** replaced by a newer ADR.
- **Deprecated:** retained for historical context but no longer recommended.
- **Rejected:** considered and explicitly not adopted.

## Index

| ADR | Decision | Status |
|---|---|---|
| [ADR-0001](0001-local-first-authority.md) | Local-first workspace is the default system of record | Accepted |
| [ADR-0002](0002-provider-neutral-adapters.md) | External systems integrate through provider-neutral capability adapters | Accepted |
| [ADR-0003](0003-product-truth-and-claims.md) | Product truth and claims ledger govern downstream generated work | Accepted |
| [ADR-0004](0004-evidence-provenance-and-partial-failure.md) | Evidence provenance and explicit partial failure are mandatory | Accepted |
| [ADR-0005](0005-human-approval-for-external-action.md) | Named human approval is required for externally consequential action | Accepted |
| [ADR-0006](0006-marketability-loop-and-event-boundary.md) | The marketability loop is the top-level product model; Event Intelligence is a bounded signal subsystem | Accepted |
| [ADR-0007](0007-icp-hypothesis-and-validation-authority.md) | ICP hypotheses and validation belong to Product Core and cannot be silently rewritten downstream | Accepted |
| [ADR-0008](0008-public-source-licensing-and-release-boundary.md) | Public source licensing and repository visibility remain distinct from supported product release | Proposed |

## Required ADR sections

Every new ADR should contain:

1. status and date;
2. context;
3. decision;
4. consequences;
5. alternatives considered;
6. implementation implications;
7. related requirements and documents.

## Decision review triggers

Create or supersede an ADR when changing:

- canonical data authority;
- product truth, ICP, evidence, approval, identity, or measurement authority;
- local versus hosted execution;
- trust or approval boundaries;
- credential storage;
- provider integration contracts;
- identity and deduplication authority;
- persistence technology or synchronization model;
- multi-user collaboration model;
- public API, plugin, MCP, or automation authority;
- source licensing, public distribution, or release-support boundaries;
- release and update architecture;
- a major bounded-context relationship.
