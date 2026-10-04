# Automated Publishing Implementation Decisions

Date: 2026-10-04

This note captures concrete implementation decisions that are narrower than ADR-0009 and may be refined by code evidence without changing the governing architecture.

## Decisions

1. Viable remains standalone and local-first. No hosted publishing service is planned in this implementation.
2. Normal scheduled publishing is deterministic and requires no inference.
3. Approved publication inventory is the execution authority. Empty inventory produces no publication.
4. Each stocked item binds exact source authority, destination, policy, and named-human approval.
5. The first live provider proof is LinkedIn member publishing.
6. Meta integration uses a self-managed user-owned developer application for the initial implementation.
7. Facebook automation targets Pages, not personal profiles.
8. Instagram automation targets supported Professional account surfaces.
9. Provider setup chooses the least complex supported method in this order: native API/SDK, official CLI, trusted MCP/machine interface, compatible desktop agent, guided manual setup.
10. Executor suitability is capability-based at the harness level, not inferred from the model or vendor name.
11. Human login, MFA, CAPTCHA, legal attestations, and consequential provider consent are explicit pause points and are never automated around.
12. Credentials belong in the operating-system credential store. Viable persists opaque references only.
13. Existing manual activation remains the fallback for every connected destination.
14. Initial local background execution may use desktop autostart plus tray/background lifecycle. No privileged service is planned.
15. CoreForge integration is intentionally deferred until the standalone workflow is proven through dogfood.
16. X is deferred until LinkedIn and Meta paths prove the provider-neutral architecture and justify another adapter.
17. Connected metrics are deferred until publishing is reliable.
