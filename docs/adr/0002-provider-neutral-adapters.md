# ADR-0002: Provider-neutral capability adapters

- Status: Accepted
- Date: 2026-07-15

## Context

Viable may interact with event providers, public repositories, websites, search and analytics platforms, social networks, content management systems, email services, CRMs, design tools, video systems, local models, and automation runtimes.

Provider APIs, pricing, scopes, app review, terms, rate limits, and feature availability change. Embedding provider-specific concepts in the canonical domain would make the product brittle and would let external platforms define Viable's information architecture.

## Decision

External systems integrate through versioned, provider-neutral capability adapters.

The Viable core owns:

- canonical product, evidence, audience, campaign, asset, approval, identity, lead, and learning records;
- scheduling and delivery intent;
- provider-independent status and failure semantics;
- destination identity references;
- manual fallback requirements.

An adapter owns:

- provider authorization and scope negotiation;
- provider payload formatting;
- API or supported public-interface calls;
- rate-limit and provider-specific retry handling;
- response normalization;
- capability and limitation reporting.

Each adapter shall expose a capability manifest covering supported reads, writes, authentication, required scopes, cost notes, rate limits, data handling, health, version, limitations, and manual fallback.

## Consequences

### Positive

- providers remain replaceable;
- core workflows can operate through manual import and export;
- changing platform economics does not redefine the product model;
- unsupported capabilities are visible rather than assumed;
- adapters can be tested against common contracts.

### Negative

- common contracts require careful design and versioning;
- provider differences cannot always be hidden behind one lowest-common-denominator interface;
- capability negotiation adds implementation work;
- some integrations will remain partial by design.

## Alternatives considered

### Provider-specific modules as top-level product areas

Rejected because this would turn Viable into a collection of disconnected platform clients.

### One universal connector interface

Rejected as too vague. Research, publishing, analytics, storage, video production, and CRM synchronization require distinct capability contracts.

## Implementation implications

- define separate ports for source retrieval, publishing, analytics import, delivery, storage, production jobs, and synchronization;
- version capability manifests and payload schemas;
- preserve raw provider identifiers only as evidence or adapter references;
- distinguish unsupported, unauthorized, unavailable, failed, partial, and empty states;
- require current feasibility review before promising a platform capability;
- maintain manual import or export for critical workflows where practical.

## Related requirements and documents

- PRD: PRD-SI, PRD-CA, PRD-WE, PRD-GH, PRD-EX, PRD-LS requirements
- Architecture: adapter layer and external-system boundaries
- Roadmap: Phases 2, 5, 6, 7, 8, and 9
