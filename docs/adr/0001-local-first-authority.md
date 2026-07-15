# ADR-0001: Local-first workspace authority

- Status: Accepted
- Date: 2026-07-15

## Context

Viable handles product truth, research evidence, claims, campaigns, content, approvals, contacts, outreach, and learning records. Making a hosted service mandatory would increase privacy exposure, cost, operational dependency, and implementation scope before the core product model is proven.

The product must remain useful when external APIs, model providers, or a Viable-hosted service are unavailable.

## Decision

The local Viable workspace is the default system of record for canonical product and operating data.

Local authority includes:

- product truth, claims, proof, audiences, positioning, offers, and brand constraints;
- normalized evidence and provenance;
- assessments, recommendations, and decisions;
- campaigns, canonical assets, variants, reviews, and approvals;
- schedules, delivery intent, and recorded outcomes;
- contacts, organizations, consent, suppression, and follow-up state;
- experiments, retrospectives, and learning records.

Credentials are not workspace records. They belong in the operating-system credential vault or an equivalent scoped secret store.

Optional hosted synchronization, collaboration, backup, or execution may be added later, but it must not silently replace local authority. Any synchronization model requires a new ADR covering identity, conflict resolution, encryption, retention, deletion, and offline behavior.

## Consequences

### Positive

- useful offline and manual workflows remain possible;
- users retain inspectable and exportable authority over core records;
- external platform failures do not erase the product model;
- secrets can remain isolated from reports, prompts, backups, and repository content;
- a hosted business model can be evaluated without blocking the first usable product.

### Negative

- local backup, recovery, migration, and update behavior become first-class responsibilities;
- multi-device and multi-user collaboration are deferred;
- some platform actions still require network access and external accounts;
- local storage growth and performance must be managed explicitly.

## Alternatives considered

### Hosted service as the primary authority

Rejected for the first product baseline because it creates unnecessary infrastructure, privacy, account, billing, and availability dependencies.

### Provider-owned records as authority

Rejected because providers cannot own Viable's canonical product, campaign, approval, or relationship model.

## Implementation implications

- persisted records require stable identifiers and schema migrations;
- backups and exports exclude secrets;
- restore behavior must be validated;
- adapters normalize external evidence into local records;
- synchronization remains an optional future capability;
- the application remains useful without an LLM.

## Related requirements and documents

- PRD: PRD-PT, PRD-SI, PRD-EX, PRD-ML requirements
- Architecture: local workspace, persistence, credential, backup, and deployment views
- Roadmap: Phase 0 and every subsequent slice
