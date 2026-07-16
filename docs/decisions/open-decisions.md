# Viable Open Decisions Register

## Purpose

This register records product, commercial, technical, operational, privacy, and integration questions that are intentionally unresolved.

An unresolved question must not silently become an implementation decision merely because one contributor or agent selected the easiest local option.

Each decision should be resolved through the appropriate PRD update, ADR, issue, domain architecture, integration decision, or product decision before the dependent implementation becomes authoritative.

## Decision states

- **Open:** Evidence or ownership is incomplete.
- **Researching:** Active investigation is underway.
- **Ready for decision:** Options and evidence are sufficient for an owner decision.
- **Deferred:** The decision is intentionally postponed until a named trigger.
- **Resolved:** Authority is recorded in an ADR, PRD update, domain architecture, integration decision, or product decision.

## Current decisions

| ID | Question | Current assumption or decision | Trigger | Required authority | State |
|---|---|---|---|---|---|
| OD-001 | What is Viable's first commercial package? | Product value should be proven through a complete local-first vertical slice before final pricing. | Before external beta recruitment or paid distribution | Product decision and PRD update | Open |
| OD-002 | Is Viable single-user only, collaborative, or both? | Local single-user authority is the baseline. Collaboration must be additive and must not weaken local ownership or approval semantics. | Before team workspace implementation | ADR | Deferred |
| OD-003 | Will Viable provide hosted synchronization? | No hosted service is required for the base product. | Before cross-device or team synchronization | ADR plus privacy review | Deferred |
| OD-004 | Which AI capabilities are included versus BYOK? | Core product workflows should remain useful without a hosted model. Provider usage, cost, and data handling must be visible. | Before production model integration | Product decision and ADR | Open |
| OD-005 | Which social publishing adapter is first? | Manual export comes before direct publishing. Adapter priority depends on audience fit, official access, scope, review requirements, cost, and maintenance burden. | When a direct publishing adapter is proposed | Integration assessment and ADR if architecture changes | Deferred |
| OD-006 | Which analytics and search integrations are first? | Manual import is implemented for the first complete loop. Provider priority remains unresolved. | Before a connected analytics or search adapter | Integration assessment | Open |
| OD-007 | Which CRM or lead-capture integration is first? | Viable owns relationship context; CRM synchronization remains optional. | Before external CRM synchronization | Integration assessment and ADR if authority changes | Deferred |
| OD-008 | What retention defaults apply to contacts, outreach, evidence, analytics, logs, and media? | Retention must be explicit, minimal, configurable, and connected to deletion and export behavior. Website Watch Stage 1 implements bounded snapshot retention classes, but that local decision does not resolve product-wide retention. | Before storing real personal or outreach data | Privacy decision and ADR | Open |
| OD-009 | How are installers signed and updated? | The product is not release-ready until installer identity, signing, update, rollback, and support expectations are validated. | Before public beta installer | Operational ADR | Open |
| OD-010 | Does Viable expose a public API, plugin surface, or MCP server? | No external automation authority should exist before permissions, scopes, identities, audit state, and data authority are implemented. | After core contexts and permissions exist | ADR | Deferred |
| OD-011 | How is ViMax integrated? | Stage 1 is resolved as a provider-neutral manual package, blank-credential ViMax v1.1.0 compatibility packet, structured artifact import, and Viable-owned review. ViMax remains optional and removable. Local execution is deferred until a stable noninteractive contract supports version checks, cancellation, progress, structured errors, bounded storage, credential injection, and cross-platform validation. | Reopen only when a local execution adapter is proposed | `docs/integrations/vimax-video-generation.md` and `docs/architecture/video-production-domain.md` | Resolved |
| OD-012 | Which model, image, voice, and video providers are supported? | Providers remain user-selectable adapters with cost and data-handling disclosure. | Before managed generation | Integration assessments | Open |
| OD-013 | What are Viable's telemetry defaults? | Product telemetry should be off or minimal by default until explicitly designed, disclosed, and consented to. | Before external testing | Privacy decision and ADR | Open |
| OD-014 | What backup format and recovery guarantees are supported? | Backup must preserve authoritative product data and exclude secrets. | Before MVP release gate | Architecture decision and validation plan | Open |
| OD-015 | What is the first persistent schema and migration policy? | Canonical identities and context ownership must be stable before implementation. | Before durable cross-version migration support | ADR and schema design | Open |
| OD-016 | How are multi-workspace and multi-product relationships modeled? | One user may manage multiple products, but authority and data boundaries must remain explicit. | During Product Workspace implementation | Domain decision | Open |
| OD-017 | How is ICP confidence summarized? | Evidence, contradictions, freshness, and factors remain visible. A single unexplained ICP score is prohibited. | During issue #2 | Product decision and UX validation | Open |
| OD-018 | What evidence is required before an ICP is considered validated? | Validation should be contextual and evidence-based rather than a universal threshold. | During issue #2 and user research | Product decision | Open |
| OD-019 | What is the first target customer segment for Viable itself? | Founders, maintainers, and small product teams are the broad initial market, but Viable must use its own ICP workflow to select and validate a narrower launch ICP. | Before external beta positioning | Product research and decision | Open |
| OD-020 | How does Viable support public repositories that are not commercial products? | Repository health and adoption value remain useful even when no sales path exists. Commercial conversion must be optional. | During issue #3 | Product decision | Open |
| OD-021 | What qualifies as a verified external delivery outcome? | Slice 6 resolves the initial boundary: scheduled intent and package export are insufficient. Delivery requires a completed export handoff plus explicit evidence. Human-recorded evidence remains distinct from provider evidence, and provider verification requires a provider response identifier. | Reopen when a provider publishing adapter changes the evidence contract | `docs/architecture/activation-and-learning-domain.md` and issue #7 | Resolved |
| OD-022 | Which attribution models ship first? | Slice 6 ships manual, first-touch, last-touch, influence, and unattributed labels as user-selected retrospective models. Every result requires explicit uncertainty. No automatic attribution engine is claimed. | Reopen before automated or multi-touch attribution computation | `docs/architecture/activation-and-learning-domain.md` and issue #7 | Resolved |
| OD-023 | When does Viable support remote or managed workers? | Local execution and manual export are preferred until a remote workload has clear user value, isolation, cost, cancellation, and privacy controls. | Before hosted generation or automation | ADR | Deferred |
| OD-024 | What is the long-term relationship between Event Radar and Viable? | Viable is the authoritative expanded product. Event Intelligence is a bounded subsystem. The prior product repository is not a runtime dependency. | After sanitized migration and release planning | Product and repository decision | Open |
| OD-025 | How should Webdog and Context.dev support website monitoring? | Stage 1 is implemented as a Viable-owned provider-neutral Website Watch domain, browser-safe monitoring utilities, strict Webdog-compatible manual import, correlated Signals evidence, named review, retention and deletion, and reviewed Calendar planning. Webdog and Context.dev remain optional adapters. Viable does not import Webdog's hosted application, authentication, database, credential, notification, team, or deployment model. | Reopen when a live Context.dev adapter or stable Webdog service API is proposed | `docs/integrations/webdog-website-monitoring.md`, `docs/architecture/website-watch-domain.md`, and issue #29 | Resolved |

## Required decision format

Before resolving an entry, record:

- the decision owner;
- options considered;
- evidence reviewed;
- affected PRD requirements;
- affected ADRs and contexts;
- security, privacy, accessibility, cost, and migration effects;
- implementation and rollback consequences;
- the authoritative document or issue containing the resolution.

## Review cadence

Review this register:

- before starting a roadmap phase;
- when a temporary implementation choice would cross a product or authority boundary;
- when an external provider changes access, pricing, scopes, or terms;
- before beta, release-candidate, and general-availability gates;
- during monthly product and architecture review once implementation is active.

## Related documents

- `../product/PRD.md`
- `../product/icp-discovery-and-validation.md`
- `../adr/README.md`
- `../architecture/viable-platform.md`
- `../architecture/activation-and-learning-domain.md`
- `../architecture/website-watch-domain.md`
- `../integrations/webdog-website-monitoring.md`
- `../roadmap/product-roadmap.md`
- `../status/current-state.md`
