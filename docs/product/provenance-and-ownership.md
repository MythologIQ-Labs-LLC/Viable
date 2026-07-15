# Viable Product Provenance and Ownership

## Purpose

This document records durable product ownership, source-provenance, migration, and licensing boundaries for Viable.

It exists to prevent future contributors or automated agents from inferring ownership, permissions, or migration scope from repository location, old operational context, or copied metadata.

## Product ownership

Viable is a MythologIQ Labs, LLC product created and led by Kevin R. Knapp.

MythologIQ Labs, LLC is the authority for:

- Viable product direction;
- product naming and branding;
- repository and release ownership;
- licensing and commercial terms;
- roadmap and architecture decisions;
- distribution and support decisions;
- acceptance of third-party dependencies and integrations.

## Event Radar foundation

The event-intelligence foundation originated as Event Radar, authored by Kevin R. Knapp.

Viable expands that foundation into a broader marketability operating system. Event Radar functionality may be migrated only when it is product-generic, reviewed, sanitized, and appropriate to Viable's architecture.

Event Intelligence remains a bounded Viable subsystem. It does not determine the top-level product model.

## Migration rule

Migration is selective, not a blind repository copy.

Material may be imported only when it is:

- product code required for generic event discovery or related reusable functionality;
- generic schemas, tests, interfaces, or provider abstractions;
- reusable product documentation that does not preserve external ownership or operational assumptions;
- reviewed for current fit with Viable's PRD, ADRs, and architecture;
- cleared through secret, account-reference, destination, and organization-context review.

Ambiguous material remains out until reviewed.

## Hard exclusions

Viable must not import or retain:

- external organization branding, ownership claims, governance files, compliance classifications, or operational policies;
- real API keys, OAuth tokens, webhooks, passwords, cookies, browser sessions, secret values, or secret-bearing environment files;
- real workspace identifiers, channel identifiers, destination identifiers, account IDs, tenant IDs, or production URLs;
- private prompts, reports, logs, screenshots, exports, operational evidence, or confidential fixtures;
- personal or customer data unrelated to a deliberate Viable import workflow;
- package names, application identifiers, icons, release destinations, signing identities, or update channels belonging to another product or environment;
- licensing language that conflicts with Viable's current repository license;
- undocumented assumptions that require access to another organization, account, or environment.

Removing visible secret values is not sufficient when surrounding metadata still identifies a real account, destination, or operating environment.

## Sanitization requirements

Before imported material can merge:

1. run secret and credential scanning;
2. scan tracked text for external organization, account, destination, and tenant references;
3. review configuration, examples, fixtures, environment templates, and test data manually;
4. replace product identity, package metadata, application identifiers, icons, copyright, release destinations, and update channels;
5. remove operational logs, reports, screenshots, and migration artifacts;
6. verify that example values are synthetic and clearly non-operational;
7. validate the imported behavior in Viable's own CI and package environment;
8. update current-state and user documentation honestly.

The migration fails closed. Unreviewed or ambiguous content is excluded.

## Licensing posture

Viable is proprietary unless MythologIQ Labs, LLC explicitly changes the repository license.

Third-party software may be used only when:

- its license permits the intended use;
- attribution and notice obligations are recorded;
- source and version are known;
- dependency and supply-chain implications are reviewed;
- its license does not silently redefine Viable's distribution terms.

Third-party integrations remain adapters or optional production tools unless an accepted ADR states otherwise.

## Repository authority

The Viable repository becomes authoritative for a capability only after that capability is:

- present in the repository;
- sanitized and reviewed;
- aligned with the PRD and accepted ADRs;
- validated through the required tests and release gates;
- accurately represented in `docs/status/current-state.md`.

The existence of a capability in a prior codebase, branch, archive, or conversation does not make it implemented in Viable.

## Historical-context rule

Historical context may be recorded when it explains product authorship, technical lineage, or a durable architectural choice.

Historical context must not:

- imply continuing dependence on an external organization or environment;
- reproduce confidential operational details;
- import obsolete governance or licensing authority;
- expose credentials, accounts, destinations, or private workflows;
- override current Viable documentation.

## Related authority

- `PRD.md`
- `../adr/0006-marketability-loop-and-event-boundary.md`
- `../architecture/viable-platform.md`
- `../status/current-state.md`
- GitHub issue #1
