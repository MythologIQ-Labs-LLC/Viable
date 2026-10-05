# Automated Publishing Implementation Decisions

Date: 2026-10-05

This note captures concrete implementation decisions that are narrower than ADR-0009 and may be refined by code evidence without changing the governing architecture.

## Decisions

1. Viable remains standalone and local-first. No hosted publishing service is assumed or required by this implementation.
2. Normal scheduled publishing is deterministic and requires no inference.
3. Approved publication inventory is the execution authority. Empty inventory produces no publication.
4. Each stocked item binds exact source authority, destination, policy, and named-human approval.
5. The first live provider proof is LinkedIn member publishing.
6. The first LinkedIn proof uses a developer-owned LinkedIn application and LinkedIn's open Consumer products, not Community Management or hosted Viable OAuth infrastructure.
7. LinkedIn identity authority uses **Sign in with LinkedIn using OpenID Connect** with `openid` and `profile`. Native validation calls `/v2/userinfo`; the returned application-scoped `sub` becomes the Person URN identifier used by the share request.
8. LinkedIn member publication authority uses the open **Share on LinkedIn** product with `w_member_social`.
9. The first LinkedIn credential bootstrap uses LinkedIn's official Developer Portal Token Generator. The access token is transient input to Viable and is stored only through the native OS credential vault. Workspace state receives only opaque credential references and non-secret connection metadata.
10. Native LinkedIn PKCE remains an optional later setup improvement only when the specific developer application is confirmed PKCE-enabled. Current provider documentation does not justify assuming universal native-PKCE availability.
11. The first self-service LinkedIn proof publishes public text-only member posts through `POST /v2/ugcPosts` with `X-Restli-Protocol-Version: 2.0.0`, because that remains the endpoint explicitly documented by the open Share on LinkedIn product. The newer `/rest/posts` API is not adopted until equivalent self-service entitlement is documented or proven without Community Management approval.
12. Definitive LinkedIn success requires `201 Created` plus `X-RestLi-Id`. A transport or provider failure after dispatch may have begun becomes `outcome_unknown` and is never blindly retried. Only a connection-establishment failure (DNS, TCP, or TLS, before any request bytes are written) is classified `not_dispatched` and becomes a scheduler-bounded retryable failure. Bearer-authorized LinkedIn requests never follow redirects; a redirect is not publication evidence.
13. LinkedIn 401 and 403 authorization failures become reconnect-required. LinkedIn 429 remains retryable only within the deterministic scheduler's configured bounds.
14. A failed attempt to replace a LinkedIn token must preserve an existing working connection if the previous native credential was not overwritten.
15. External provider setup pages open in the operating-system browser through a native command that accepts only named allowlisted destinations. Provider sign-in never runs inside an embedded Viable webview, and the webview cannot ask the native layer to open arbitrary URLs.
16. The first live proof exposes an explicit **Run automation now** scheduler evaluation in the local desktop app. It is a proof/control surface, not a background-runtime decision.
17. Until multi-provider routing is implemented, the Slice D live-proof control fails closed when non-LinkedIn stocked automated work or pending automated jobs are present. Manual activation remains unchanged for those channels.
18. Background execution remains unresolved. Tray lifecycle, autostart, OS task scheduling, or another local runtime mechanism may be evaluated only after the first live provider proof establishes timing and restart requirements. No privileged service is planned from current evidence.
19. Meta integration uses a self-managed user-owned developer application for the initial implementation if and when Meta is selected next.
20. Facebook automation targets Pages, not personal profiles.
21. Instagram automation targets supported Professional account surfaces.
22. Provider setup chooses the least complex supported method in this order: native API/SDK, official CLI, trusted MCP/machine interface, compatible desktop agent, guided manual setup.
23. Executor suitability is capability-based at the harness level, not inferred from the model or vendor name.
24. Human login, MFA, CAPTCHA, legal attestations, and consequential provider consent are explicit pause points and are never automated around.
25. Credentials belong in the operating-system credential store. Viable persists opaque references only.
26. Existing manual activation remains the fallback for every connected destination.
27. CoreForge integration is intentionally deferred until the standalone workflow is proven through dogfood.
28. X is deferred until the first live provider path proves the provider-neutral architecture and another adapter is justified by distribution value.
29. Connected metrics are deferred until publishing is reliable.
30. Search and answer-engine discoverability is a Campaigns / Studio content-strategy concern tracked separately by #110. Third-party Domain Authority or similar scores are not treated as Google ranking truth or deterministic publication authority.
