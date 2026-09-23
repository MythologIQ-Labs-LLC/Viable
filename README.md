<!-- markdownlint-disable MD033 MD041 -->
<div align="center">

<p align="center">
  <img src="assets/brand/viable-banner.png" alt="Viable — Local Intelligence. Real Opportunities. Tangible Impact." width="100%">
</p>

# Viable

### A local-first marketability operating system for products, public repositories, founders, maintainers, and small teams

[![License: Apache-2.0](https://img.shields.io/badge/License-Apache--2.0-0b7285)](LICENSE)
[![Approach: Local first](https://img.shields.io/badge/Approach-local_first-8957e5)](#product-principles)
[![Evidence: Explicit state](https://img.shields.io/badge/Evidence-explicit_state-0b7285)](docs/adr/0004-evidence-provenance-and-partial-failure.md)
[![Approval: Named human](https://img.shields.io/badge/Approval-named_human-b42335)](docs/adr/0005-human-approval-for-external-action.md)
[![Status: Pre-release](https://img.shields.io/badge/Status-pre--release-b7791f)](#current-maturity)

</div>

> [!IMPORTANT]
> **Public source is not the same thing as a supported product release.** Viable's implemented core is substantial and automatedly validated, but end-user release gates remain open for accessibility, unfamiliar-user acceptance, backup and restore, schema migration, product-wide retention and deletion, installer signing, update and rollback behavior, supported-platform validation, privacy/security review, and operational support.

## What Viable is

Viable helps a founder or small product team answer a deceptively difficult question: **what should we do next to make this product more viable, and what evidence supports that decision?**

It connects product truth, ideal-customer-profile discovery, marketability assessment, external signals, campaigns, public-repository readiness, production workflows, approved external action, outcomes, and learning through one governed model.

```text
Establish product truth
  -> form and validate ICP hypotheses
  -> assess marketability
  -> collect and review market evidence
  -> choose positioning, offers, and experiments
  -> create canonical campaign assets
  -> adapt approved assets to destinations and formats
  -> review external action
  -> schedule and activate through supported or manual paths
  -> record delivery, failure, and outcome evidence
  -> compare results with a baseline
  -> choose the next reversible action
  -> refine product, ICP, message, offer, source, and channel plan
```

Viable began with event-intelligence roots, but events are now deliberately one signal source inside a larger system. The product model already anticipates website, search, social, community, repository, competitor, customer, support, and sales evidence without allowing any one integration to become the product center.

## Why it exists

Small teams routinely split marketability work across product notes, spreadsheets, analytics tools, social schedulers, repository dashboards, design tools, event feeds, website monitors, CRMs, and half-finished campaign drafts. The predictable result is authority drift:

- marketing begins before the product and ICP are sufficiently understood;
- generated copy turns assumptions into apparent facts;
- claims diverge across websites, releases, social posts, sales material, and videos;
- failed data collection is mistaken for "nothing happened";
- attention is mistaken for adoption;
- scheduling is mistaken for publication;
- publication is mistaken for success;
- metrics accumulate without a durable learning loop.

Viable makes those distinctions explicit and reviewable.

## Implemented today

| Area | Current implementation |
|---|---|
| Product Truth | Canonical capabilities, limitations, claims, evidence, positioning, offers, and product constraints |
| ICP Discovery | Multiple hypotheses, buying/user roles, disqualifiers, contradictions, experiments, selection, and revision history |
| Marketability Assessment | Explained readiness findings with evidence, confidence, ownership, and next actions |
| Signals and Market | Bounded event and public-repository evidence, source health, review, tagging, assignment, and work conversion |
| Website Watch | Stage 1 watched-site model and strict Webdog-compatible manual evidence import; no live crawling yet |
| Campaigns and Studio | Campaign briefs, canonical assets, channel variants, rights/accessibility metadata, review, and manual export |
| Repository Growth | Public-repository assessment, prioritized plans, launch rooms, manual packages, baselines, and retrospectives |
| Video Production | Provider-neutral video briefs and packages, ViMax compatibility packet, artifact import, and named review |
| Calendar and Activation | Destination records, timing, destination-bound review, manual activation packages, and outcome evidence |
| Analytics and Learning | Baselines, explicit metric-evidence states, retrospectives, attribution uncertainty, and learning ledger |

The implemented workflows are local-first and designed to remain useful without mandatory hosted Viable infrastructure or a required LLM.

## Planned product surface

Viable's approved product model is broader than the currently connected adapters. Future work may include:

- live website and competitor monitoring;
- search and AEO/SEO evidence;
- social and community signals;
- connected publishing and delivery verification;
- connected analytics;
- relationship, organization, lead, and opportunity records;
- sales preparation and feedback loops;
- additional provider-neutral ingestion and output adapters.

Those are product directions, not current capability claims. New integrations must preserve the same evidence, provenance, approval, failure-state, and authority boundaries as the existing system.

## Product principles

1. **Local first.** The user's workspace is the default authority for product records, evidence, drafts, approvals, outcomes, and learning.
2. **Product truth before content volume.** Viable does not scale unsupported claims.
3. **Evidence before action.** Observations, generated suggestions, reviewed evidence, and conclusions remain distinguishable.
4. **Named human approval.** Research and generation may accelerate judgment but do not replace accountability for consequential external action.
5. **Provider-neutral core.** External platforms are adapters, not the domain model.
6. **Partial failure stays visible.** Unavailable, partial, delayed, failed, and verified-empty are different states.
7. **Manual fallback is a feature.** Restricted or unavailable APIs should not make the core workflow useless.
8. **No secret sprawl.** Credentials do not belong in evidence, packages, logs, fixtures, screenshots, or repository files.
9. **No fake growth.** Viable does not automate spam, fake stars, fabricated testimonials, reciprocal engagement rings, or manufactured adoption.
10. **Respect source boundaries.** Public visibility is not permission to bypass access controls, provider terms, copyright, robots policies, or applicable law.

See the accepted [Architecture Decision Records](docs/adr/README.md) for the durable authority model.

## Current maturity

Viable has completed the automated implementation of its initial six internal product slices plus Website Watch Stage 1. The authoritative implementation record is [`docs/status/current-state.md`](docs/status/current-state.md).

That does **not** mean the application is ready for a supported end-user release.

The remaining release-foundation work is tracked primarily in GitHub issue #36 and includes:

- hands-on accessibility and unfamiliar-user acceptance across the major workflows;
- explicit schema versions and cross-version migration behavior;
- backup, restore, corruption recovery, retention, and deletion propagation;
- native dependency minimization and release-artifact license inventory;
- signed installers and publisher identity;
- update integrity, interruption, rollback, upgrade, and uninstall behavior;
- Windows validation and a deliberate macOS packaging/notarization posture;
- privacy, security, diagnostics, vulnerability intake, support, and release operations.

Automated validation includes npm high/critical dependency auditing, Rust dependency advisory scanning, repository and reachable-history secret scanning, pinned GitHub Actions, deterministic tests, coverage enforcement, and native package validation. Those checks provide evidence about an artifact. They do not substitute for the remaining release gates.

## Architecture and governance

The product uses explicit bounded authority rather than a collection of features sharing a navigation bar:

```text
Product Core
  -> product truth, claims, ICP hypotheses

Signals and Market
  -> externally observed evidence, source health, Website Watch

Campaigns and Studio
  -> approved campaign intent, canonical assets, channel/production variants

Repository Growth
  -> repository assessment, owned plans, launch rooms, bounded retrospectives

Approval and External Action
  -> destinations, Calendar timing, review, manual activation, delivery evidence

Measurement and Learning
  -> baselines, metrics, retrospectives, attribution uncertainty, next actions

Future Relationships and Sales
  -> only after its authority model is approved
```

Documentation authority is defined in [`docs/README.md`](docs/README.md). Accepted ADRs and the PRD outrank Wiki/README summaries and implementation issues when they conflict.

## Development

### Requirements

- Node.js 22 or newer;
- npm;
- Rust toolchain for native desktop validation;
- Linux Tauri build dependencies for Debian package construction when building the desktop bundle.

Webdog, Context.dev, ViMax, Python, publishing credentials, analytics credentials, and website-monitoring credentials are not required to build or validate the current Viable desktop application.

### Install development dependencies

```bash
npm ci
```

### Run governed repository validation

```bash
npm run validate
```

That validation includes repository viability checks, current-tree and reachable-history secret scanning, npm dependency audit, strict TypeScript checks, deterministic tests, and coverage enforcement. Native desktop validation additionally performs Rust dependency advisory scanning, Rust formatting/tests, Tauri bundle construction, and package inspection.

Useful individual commands:

```bash
npm run build
npm test
npm run desktop:web:check
npm run desktop:bundle
```

The desktop bundle command currently targets a Debian package. Supported end-user platform claims remain governed separately from build-system capability.

## Documentation map

Start with:

1. [Product Requirements Document](docs/product/PRD.md)
2. [Architecture Decision Records](docs/adr/README.md)
3. [Platform architecture](docs/architecture/viable-platform.md)
4. [Current implementation state](docs/status/current-state.md)
5. [Product provenance and ownership](docs/product/provenance-and-ownership.md)
6. [Documentation index](docs/README.md)
7. [Wiki source](docs/wiki/README.md)

Domain and user documentation is indexed from [`docs/README.md`](docs/README.md). The source-controlled Wiki pages under `docs/wiki/` are curated orientation pages intended to be mirrored into the GitHub Wiki; they do not override repository authority.

The session handoff under `docs/handoff/` is maintainer continuity context, not required reading for someone evaluating or using the public source.

## Contributing

Contributions are governed by [`CONTRIBUTING.md`](CONTRIBUTING.md). In particular:

- preserve Product Core, evidence, approval, and bounded-context authority;
- do not submit secrets, customer data, private operational material, or content you do not have the right to license;
- keep generated suggestions distinct from reviewed evidence;
- run the required validation for the scope you change;
- contributions intentionally submitted for inclusion are accepted under Apache-2.0 unless explicitly agreed otherwise.

## Security and support

- Security reporting: [`SECURITY.md`](SECURITY.md)
- Support posture: [`SUPPORT.md`](SUPPORT.md)

Viable is pre-release. Public source visibility does not create a production support commitment or service-level agreement.

## License

Viable-owned source code and documentation are available under the [Apache License 2.0](LICENSE), as accepted in [ADR-0008](docs/adr/0008-public-source-licensing-and-release-boundary.md).

Apache-2.0 permits use, modification, redistribution, and commercial use under its terms. It also includes an express contributor patent grant and does not grant rights to MythologIQ Labs or Viable trademarks and branding beyond reasonable origin attribution.

Third-party projects and dependencies retain their own licenses. See [`NOTICE.md`](NOTICE.md) and [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md).

The npm package remains marked `private: true` intentionally to prevent accidental registry publication. That publishing safeguard does not make the repository source proprietary.
