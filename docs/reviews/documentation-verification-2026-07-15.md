# Viable Documentation Verification

- Review date: 2026-07-15
- Review scope: PRD, ADRs, architectural design, product roadmap, experience roadmap, current state, README, documentation index, initial build sequence, and active implementation issues
- Review branch: `agent/documentation-baseline-review`
- Result: Baseline corrected; follow-up traceability closed

## 1. Executive assessment

Viable had a strong product thesis, broad product-scope documentation, a detailed marketability operating model, a comprehensive product roadmap, and a substantial experience design roadmap.

The documentation set nevertheless had three authority gaps:

1. no formal Product Requirements Document with requirement identifiers, MVP definition, quality attributes, metrics, and release gates;
2. no Architecture Decision Record system for durable authority and trust-boundary decisions;
3. an architecture document that still described the earlier opportunity-intelligence shape and did not cover the complete marketability operating system.

This review corrects those gaps and verifies the roadmap against the new PRD and architecture baseline.

## 2. Review results

| Area | Before review | Review action | Result |
|---|---|---|---|
| Product definition | Strong scope and operating model, but no formal PRD | Added `docs/product/PRD.md` | Pass |
| Requirements traceability | Requirements were prose-only | Added stable PRD requirement IDs and traceability sections | Pass with backlog gaps |
| ADR governance | No ADR directory or decision index | Added ADR index and seven accepted foundational ADRs | Pass |
| Architectural design | Stale and too narrow for current product scope | Replaced with complete platform architectural design | Pass |
| Product roadmap | Detailed outcome-based phases 0 through 10 | Verified against PRD domains and architecture | Pass |
| Experience roadmap | Detailed navigation, journeys, states, and patterns | Verified against PRD user and accessibility requirements | Pass |
| Initial build sequence | Coherent vertical slices | Verified dependencies and release gates | Pass |
| Current state | Honest separation of designed and implemented behavior | Updated documentation inventory | Pass |
| README | Platinum product positioning and accurate maturity language | Documentation links require PRD and ADR visibility | Follow-up |
| Implementation backlog | Issues exist for migration, product truth, repository growth, and ViMax | Missing issues for signals, canonical assets, and activation loop | Follow-up |

## 3. PRD verification

### Findings

`docs/product/product-scope.md` and `docs/product/marketability-operating-model.md` define a strong product vision, but neither previously functioned as a complete PRD.

The missing PRD elements were:

- document status and authority;
- primary-user definitions;
- jobs to be done;
- stable requirement identifiers;
- explicit MVP boundary;
- user-experience requirements;
- data and trust requirements;
- quality attributes;
- measurable product and outcome success criteria;
- release gates;
- open product decisions;
- traceability to architecture and roadmap.

### Resolution

`docs/product/PRD.md` now provides the formal product baseline.

### Verification result

Pass. Product requirements now distinguish the intended product from current implementation status.

## 4. ADR verification

### Findings

The product contained durable architectural choices in prose, but no formal decision records. This created a risk that implementation could later reverse foundational boundaries without identifying the decision being changed.

### Resolution

The following accepted ADRs now exist:

1. local-first workspace authority;
2. provider-neutral capability adapters;
3. product truth and claims ledger authority;
4. evidence provenance and explicit partial failure;
5. human approval for externally consequential action;
6. marketability-loop authority and event-intelligence boundary;
7. canonical ICP-hypothesis and validation authority in Product Core.

### Verification result

Pass. The initial ADR set covers the most load-bearing product and trust decisions.

### Future ADR triggers

New ADRs are still required before implementing:

- multi-user collaboration or hosted synchronization;
- account, tenancy, and billing architecture;
- public API, plugin, or MCP authority;
- installer signing, update service, and release channels;
- retention and deletion defaults;
- selected first publishing and outreach adapters if they introduce new authority boundaries;
- managed remote video or model execution;
- a persistence technology that replaces or supplements local SQLite.

## 5. Architectural-design verification

### Findings

The previous architecture document described Viable as an opportunity-intelligence application centered on event discovery, social intelligence, prospects, and outreach.

That model no longer matched the README, product scope, operating model, or roadmap. It omitted:

- Product Core and claims authority;
- marketability assessment;
- campaigns and canonical assets;
- website, SEO, AEO, and conversion;
- public repository growth;
- approvals as a distinct bounded context;
- leads and sales support;
- measurement and learning;
- deployment profiles;
- persistence and file architecture;
- scheduling and jobs;
- security, privacy, observability, backup, recovery, and failure models;
- the event anti-corruption boundary.

### Resolution

`docs/architecture/viable-platform.md` now defines:

- architectural goals and quality attributes;
- system context and deployment profiles;
- container view and bounded contexts;
- context map;
- canonical identities and evidence, operation, and approval models;
- primary data flows;
- adapter architecture;
- persistence, credential, backup, scheduling, security, observability, accessibility, and recovery design;
- technology direction and architecture invariants;
- ADR and PRD relationships;
- explicit implementation-status disclaimer.

### Verification result

Pass as a design baseline. Implementation conformance cannot be verified until the application code is present in this repository.

## 6. Roadmap verification

### Product-roadmap strengths

The product roadmap is appropriately outcome-based and does not invent dates without capacity or platform-access information.

It correctly sequences:

1. sanitized foundation and independent CI;
2. product truth, ICP discovery and validation, and marketability assessment;
3. signal intelligence;
4. positioning and campaigns;
5. content and creative production;
6. website, search, and conversion;
7. approved distribution;
8. leads and sales enablement;
9. video production;
10. measurement and optimization;
11. Viable 1.0 completeness.

The roadmap consistently preserves:

- product truth before content volume;
- evidence before automation;
- canonical assets before channel payloads;
- human approval before external action;
- manual fallbacks;
- provider-neutral adapters;
- measurable exit criteria.

### Initial-build-sequence strengths

The initial build sequence correctly reduces the larger roadmap into complete vertical slices:

1. product truth, ICP discovery and validation, and marketability assessment;
2. signals with events and public repositories;
3. campaign brief and canonical asset;
4. repository growth and launch room;
5. video production package and ViMax prototype;
6. calendar, manual activation, outcome capture, and retrospective.

### Roadmap gaps

- Slice 2 does not yet have a dedicated implementation issue.
- Slice 3 does not yet have a dedicated implementation issue.
- Slice 6 does not yet have a dedicated implementation issue.
- Phase dependencies are documented in prose but not represented as a machine-readable dependency graph.
- Effort, staffing, and release-window estimates are intentionally absent and must be added only when capacity is known.
- Product pricing, packaging, and distribution strategy remain open product decisions.
- External adapter feasibility must be revalidated at implementation time.

### Verification result

Pass. The roadmap is strategically coherent and correctly ordered. Backlog traceability is incomplete but does not invalidate the roadmap.

## 7. Experience-design verification

The experience roadmap aligns with the PRD and architecture through these primary surfaces:

- Home;
- Product;
- Market;
- Signals;
- Campaigns;
- Studio;
- Calendar;
- Leads;
- Sales;
- Analytics;
- Integrations;
- Settings.

It correctly treats public-repository growth as a cross-product workflow rather than a disconnected mini-product. It also correctly treats ViMax as a production tool rather than an information-architecture owner.

The roadmap defines useful cross-cutting patterns for recommendations, evidence, approval, integration capability, failure state, accessibility, and information density.

### Verification result

Pass as a target experience. Usability evidence remains pending implementation and unfamiliar-user testing.

## 8. Cross-document traceability matrix

| PRD capability | Roadmap | Primary experience | ADRs | Current issue coverage |
|---|---|---|---|---|
| Product truth and claims | Phase 1, Slice 1 | Home, Product | ADR-0001, ADR-0003 | Issue #2 |
| ICP discovery and validation | Phase 1, Slice 1 | Home, Product | ADR-0001, ADR-0003, ADR-0004, ADR-0007 | Issue #2 |
| Marketability assessment | Phase 1, Slice 1 | Home, Product | ADR-0003, ADR-0004 | Issue #2 |
| Evidence and signals | Phase 2, Slice 2 | Market, Signals | ADR-0002, ADR-0004, ADR-0006 | Issue #1 partially; dedicated issue missing |
| Event intelligence | Phase 0 and 2, Slice 2 | Signals, Calendar | ADR-0002, ADR-0004, ADR-0006 | Issue #1 |
| Campaigns and canonical assets | Phases 3 and 4, Slice 3 | Campaigns, Studio | ADR-0003, ADR-0005 | Dedicated issue missing |
| Website, SEO, AEO, conversion | Phase 5 | Product, Studio, Analytics | ADR-0002, ADR-0003, ADR-0004 | Dedicated issue missing |
| Public repository growth | Phases 2, 3, 4, 9; Slice 4 | Product, Signals, Campaigns, Analytics | ADR-0002, ADR-0004 | Issue #3 |
| Approved distribution | Phase 6, Slice 6 | Calendar, Integrations | ADR-0002, ADR-0004, ADR-0005 | Dedicated issue missing |
| Leads and sales | Phase 7 | Leads, Sales | ADR-0001, ADR-0002, ADR-0004, ADR-0005 | Dedicated issue missing |
| Video production | Phase 8, Slice 5 | Studio, Calendar | ADR-0002, ADR-0003, ADR-0005 | Issue #4 |
| Measurement and learning | Phase 9, Slice 6 | Analytics | ADR-0001, ADR-0004 | Dedicated issue missing |

## 9. Documentation authority order

When documents appear to conflict, use this authority model:

1. accepted ADRs govern durable architecture and authority decisions;
2. the PRD governs required product outcomes and release gates;
3. the architectural design governs system structure consistent with ADRs and PRD;
4. current state governs what is actually implemented and validated;
5. the roadmap governs sequence and intended outcomes;
6. experience design governs target workflows and interaction patterns;
7. the README is the product front door and must summarize the authorities above without replacing them;
8. issues and pull requests govern scoped implementation work but may not silently redefine product authority.

A material product or architecture change must update the relevant authority documents in the same change set.

## 10. Remaining documentation actions

### Actions identified before Slice 1 implementation

- link the formal PRD and ADR index from the Platinum README;
- add requirement IDs to issue #2 acceptance criteria or implementation plan;
- define initial persistent entity schemas and migrations;
- create an ADR template;
- establish a lightweight documentation-validation check for broken internal links and required authority files.

### Required before MVP release

- user-research evidence and unfamiliar-user acceptance results;
- pricing, packaging, license, support, and distribution decision records;
- retention and deletion policy values;
- installer signing, updates, recovery, and support architecture;
- threat model and privacy data inventory;
- tested backup and restore procedure;
- external integration feasibility records for capabilities included in the release;
- user, operator, troubleshooting, and release documentation.

## 11. Post-review ICP authority correction

A final exact-branch review found that ICP authority was complete in the PRD, ADR-0007, and the dedicated ICP domain architecture but was not explicit enough in the parent platform architecture and issue #2 traceability.

The closure correction:

- adds ICP discovery and validation to the canonical platform marketability loop;
- names canonical ICP hypotheses, revisions, validation, disqualifiers, and history as Product Core responsibilities;
- adds ICP identities to the platform canonical-identity list;
- adds the downstream-mutation prohibition to the platform invariants;
- links ADR-0007 from the platform architecture;
- adds PRD-ICP-001 through PRD-ICP-008 and ADR-0007 to issue #2 traceability.

These corrections clarify existing accepted authority. They do not claim runtime implementation or validation.

## 12. Final verdict

The documentation set is now structurally suitable for disciplined implementation once this review branch is merged.

The product roadmap is broad but coherent. The architecture now matches it. The PRD defines what must be true. The ADRs define the boundaries that implementation may not casually violate. The current-state document remains the honesty mechanism preventing plans from dressing up as shipped software, one of civilization's more persistent administrative hobbies.
