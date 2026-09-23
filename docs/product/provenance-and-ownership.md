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

Public-source licensing grants the rights stated in the repository license. It does not transfer product ownership, create a support obligation, or grant rights to MythologIQ Labs or Viable branding beyond the license's permitted origin attribution.

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
- cleared through secret, account-reference, destination, organization-context, copyright, and license review.

Ambiguous material remains out until reviewed.

## Hard exclusions

Viable must not import or retain:

- external organization branding, ownership claims, governance files, compliance classifications, or operational policies;
- real API keys, OAuth tokens, webhooks, passwords, cookies, browser sessions, secret values, or secret-bearing environment files;
- real workspace identifiers, channel identifiers, destination identifiers, account IDs, tenant IDs, or production URLs;
- private prompts, reports, logs, screenshots, exports, operational evidence, or confidential fixtures;
- personal or customer data unrelated to a deliberate Viable import workflow;
- package names, application identifiers, icons, release destinations, signing identities, or update channels belonging to another product or environment;
- source or assets that MythologIQ Labs does not have the right to redistribute under Viable's license or a compatible third-party license;
- licensing language that conflicts with Viable's repository license;
- undocumented assumptions that require access to another organization, account, or environment.

Removing visible secret values is not sufficient when surrounding metadata still identifies a real account, destination, or operating environment.

## Sanitization requirements

Before imported material can merge:

1. run secret and credential scanning;
2. scan tracked text for external organization, account, destination, and tenant references;
3. review configuration, examples, fixtures, environment templates, and test data manually;
4. verify copyright ownership or a compatible redistribution right for imported source and assets;
5. replace product identity, package metadata, application identifiers, icons, copyright, release destinations, and update channels where needed;
6. remove operational logs, reports, screenshots, and migration artifacts;
7. verify that example values are synthetic and clearly non-operational;
8. validate the imported behavior in Viable's own CI and package environment;
9. update current-state, third-party notice, and user documentation honestly.

The migration fails closed. Unreviewed or ambiguous content is excluded.

## Licensing posture

ADR-0008 proposes licensing Viable-owned source code and documentation under the Apache License, Version 2.0 as part of the repository's public-readiness work.

Under that posture:

- individuals and organizations may use, modify, redistribute, and commercially use Viable-owned source subject to Apache-2.0;
- MythologIQ Labs retains Viable product ownership, branding, release-policy, and support authority;
- public repository visibility is separate from supported end-user release status;
- `package.json` remains `private: true` until npm publication is separately approved;
- third-party software remains under its own license and notice requirements;
- supported binary distribution requires review of the transitive dependency licenses actually present in that artifact;
- contributions intentionally submitted for inclusion are accepted under the repository license unless a separate agreement states otherwise.

The licensing change is not authoritative until the public-readiness pull request and ADR-0008 are approved and merged.

## Third-party software

Third-party software or substantially adapted source may be used only when:

- its license permits the intended use and redistribution;
- attribution and notice obligations are recorded;
- source and version are known;
- dependency and supply-chain implications are reviewed;
- its license does not silently redefine Viable's distribution terms;
- service access, trademarks, hosted data, and third-party content rights are not confused with source-code licensing rights.

Third-party integrations remain adapters or optional production tools unless an accepted ADR states otherwise.

See `../../THIRD_PARTY_NOTICES.md` for reviewed third-party provenance.

## Contributor-rights boundary

A public repository can receive contributions from people who do not work for MythologIQ Labs. Before such contributions are merged, maintainers must ensure that the contributor has the right to submit the material under the repository license and that copied or adapted third-party source is identified.

Repository history and an author name alone do not prove copyright ownership or assignment. If the licensing authority for a contribution is ambiguous, the contribution remains out until the right to license it is established.

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
- `../adr/0008-public-source-licensing-and-release-boundary.md`
- `../architecture/viable-platform.md`
- `../status/current-state.md`
- `../../LICENSE`
- `../../NOTICE.md`
- `../../THIRD_PARTY_NOTICES.md`
- GitHub issue #1
- GitHub issue #57
