# ADR-0004: Evidence provenance and explicit partial failure

- Status: Accepted
- Date: 2026-07-15

## Context

Viable will combine evidence from providers with different availability, permissions, quality, freshness, and semantics. An empty result can mean no relevant activity, missing access, expired credentials, rate limiting, parser failure, unsupported capability, or a genuine absence of evidence.

Recommendations, assessments, claims, and attribution become untrustworthy when provenance or failure state is hidden.

## Decision

Evidence provenance and explicit partial-failure semantics are mandatory across research, assessment, delivery, and measurement workflows.

Every material evidence record shall retain, where applicable:

- source type and source identifier;
- original URL or provider reference;
- retrieval or import time;
- observed publication or event time;
- authorization and access mode;
- normalization version;
- freshness and confidence;
- related product, topic, person, organization, campaign, asset, or metric;
- known limitations and transformations.

Source and destination operations shall distinguish:

- success with results;
- success with a verified empty result;
- partial success;
- unsupported capability;
- unauthorized or expired authorization;
- permission denied;
- rate limited;
- unavailable;
- validation or parsing failure;
- transport failure;
- cancelled operation.

A failed source cannot be converted into a successful empty result. A failed delivery cannot be represented as delivered. Missing metrics cannot be represented as zero.

## Consequences

### Positive

- users can trace recommendations and claims to evidence;
- partial outages do not erase valid results from other sources;
- missing access is not confused with market inactivity;
- retries and recovery can be targeted correctly;
- attribution can state uncertainty honestly.

### Negative

- operation and evidence models are more complex;
- adapters must normalize detailed failure states;
- the interface must communicate uncertainty without overwhelming users;
- evidence retention and deletion require deliberate policy.

## Alternatives considered

### Best-effort results with warnings in logs

Rejected because logs are not durable product state and are invisible to most users.

### Treat all failures as empty collections

Rejected because it creates false confidence and corrupts downstream decisions.

## Implementation implications

- common operation-result and evidence-provenance contracts;
- independent source execution and aggregation;
- visible source health and last-success state;
- retry policy based on failure class;
- redacted diagnostics linked to operation identifiers;
- evidence freshness and retention policies;
- tests proving that failure cannot become empty success.

## Related requirements and documents

- PRD: PRD-MA-002, PRD-MA-005, PRD-SI-002, PRD-SI-003, PRD-GH-003, PRD-EX-004, PRD-ML-002
- Architecture: evidence, operation, observability, and failure models
- Roadmap: every phase that imports evidence or performs delivery
