<!-- markdownlint-disable MD033 MD041 -->
<div align="center">

# Viable

### Local-first opportunity intelligence for events, social signals, and human-approved outreach

[![Status: Active foundation](https://img.shields.io/badge/Status-active_foundation-2ea043)](#current-status)
[![Desktop: Tauri 2](https://img.shields.io/badge/Desktop-Tauri_2-24c8db)](apps/desktop/README.md)
[![Runtime: Node 22](https://img.shields.io/badge/Runtime-Node_22-43853d)](package.json)
[![Approach: Local first](https://img.shields.io/badge/Approach-local_first-8957e5)](#product-principles)
[![Outreach: Approval required](https://img.shields.io/badge/Outreach-human_approval_required-b42335)](docs/governance/research-and-outreach-safety.md)
[![License: Proprietary](https://img.shields.io/badge/License-proprietary_all_rights_reserved-b42335)](LICENSE)

</div>

> [!IMPORTANT]
> Viable is a MythologIQ Labs, LLC product created and led by Kevin R. Knapp. Its event-discovery foundation originated as Event Radar and was imported from the temporary Bicameral repository by its author. Viable is the authoritative home for the expanded product. See [NOTICE.md](NOTICE.md).

Viable helps a person or small team identify worthwhile opportunities, understand the surrounding conversation, prepare relevant outreach, and retain enough context to act deliberately. It combines proven local event discovery with a broader opportunity-intelligence model for public social signals and approval-gated outreach.

Viable is not designed to become a bulk messaging engine, autonomous social persona, surveillance system, or compliance control plane. Research may be automated within explicit source and privacy boundaries. External outreach remains a human decision.

## Why Viable exists

Events, social conversations, prospects, and outreach are usually scattered across browser tabs, spreadsheets, saved posts, calendar feeds, and half-finished drafts. The result is predictable: opportunities disappear, context decays, and outreach becomes either generic or never sent.

Viable creates one local workflow:

```text
Discover opportunities
  -> normalize evidence
  -> rank relevance
  -> connect events and social signals
  -> identify people or organizations
  -> prepare outreach drafts
  -> require human review
  -> record the outcome
```

## Product scope

### Event intelligence

The inherited Event Radar foundation is operational and includes:

- public Luma city and public-calendar discovery;
- Meetup Pro network ingestion;
- Eventbrite organization-event ingestion;
- local and remote ICS feeds;
- recurring-event normalization and occurrence projection;
- deterministic scoring with optional Claude Code or Codex CLI scoring;
- local SQLite history, reports, calendars, collections, and schedules;
- optional Slack publication;
- native Tauri desktop packaging and guided setup.

### Social research

The first Viable social-research foundation includes:

- provider-neutral `SocialSource` contracts;
- normalized social signals with author, publication, tags, URL, provenance, and optional engagement metrics;
- bounded public JSON Feed retrieval;
- cross-source canonical-URL deduplication;
- include and exclude term ranking;
- partial-failure reporting so one unavailable source does not erase successful research;
- a local CLI for repeatable research runs.

Platform-specific adapters will be added only where supported access, privacy, and terms permit. Viable will not treat browser-session theft or undocumented private endpoints as a product strategy.

### Outreach

The first outreach foundation includes:

- local outreach drafts for email and social channels;
- evidence references connecting a draft to an event, social signal, or manual note;
- explicit `draft`, `approved`, `rejected`, and `sent` states;
- named human approval before a draft can be marked sent;
- rollback-safe local JSON persistence;
- no automatic sender in the base implementation.

Future sending integrations must preserve the approval boundary, destination identity, rate limits, provider terms, and durable delivery evidence.

## Product principles

1. **Local first.** Core history, preferences, reports, drafts, and approvals belong to the user’s installation.
2. **Evidence before action.** Recommendations and outreach drafts should retain the facts that caused them to exist.
3. **Human-approved outreach.** Research can accelerate judgment. It cannot replace consent and accountability.
4. **Provider-neutral core.** Events, social signals, prospects, and drafts are product concepts, not extensions of one platform’s API.
5. **Supported access only.** Public interfaces and authorized APIs are preferred over fragile private endpoints or saved browser sessions.
6. **Partial failure is visible.** One broken source must not masquerade as an empty market.
7. **Simple normal use.** Ordinary setup should not require JSON editing, cron expressions, invented identifiers, or developer tools.
8. **No compliance inflation.** Viable may follow sensible security practices without pretending to be a SOC 2 control system.

## Architecture

```text
Native Viable desktop
  -> guided local setup
  -> opportunity workspace
       -> event research
       -> social research
       -> prospects and organizations
       -> outreach drafts and approvals
  -> provider-neutral ports
       -> Luma / Meetup / Eventbrite / ICS
       -> public feeds and authorized social APIs
       -> optional approved delivery adapters
  -> local persistence
       -> SQLite event and report history
       -> local outreach draft store
       -> OS credential vault
  -> optional outputs
       -> JSON reports
       -> Slack summaries
       -> reviewed outreach delivery
```

Durable architecture is documented in [Viable platform architecture](docs/architecture/viable-platform.md). The inherited event subsystem retains its detailed ADRs and operations documentation.

## Current status

| Area | Status | Notes |
|---|---|---|
| Event discovery core | Operational | Imported from the completed Event Radar implementation |
| Native desktop | Operational event workspace | Viable rebrand and broader workspace navigation are in progress |
| Guided event setup | Operational | No-code source, preference, and schedule setup |
| Social signal domain | Implemented | Provider-neutral types and provenance |
| Public JSON Feed source | Implemented | Bounded retrieval, normalization, and deterministic ordering |
| Social research ranking | Implemented | Include, exclude, deduplication, freshness, and partial failures |
| Outreach draft lifecycle | Implemented | Draft, approve, reject, and mark-sent states |
| Automatic outreach delivery | Not implemented by design | Requires explicit adapter and preserved human approval |
| Social desktop experience | Planned next | Research inbox, saved searches, signal detail, and prospect linking |
| Prospect and organization graph | Planned next | Evidence-backed identities and relationships |
| Public installer release | Not yet published | Existing packaging foundation must be rebranded and reviewed |

The authoritative status document is [docs/status/current-state.md](docs/status/current-state.md).

## Quick start for developers

Viable currently requires Node.js 22 or newer, npm 10 or newer, Rust 1.88 or newer, and the Tauri 2 prerequisites for desktop development.

```bash
npm ci
npm run check
npm test
npm run viable:health
npm run desktop:dev
```

### Run event research

```bash
npm run viable:events
```

### Run social research

Copy `config/social.example.json`, replace the example feed with an authorized public JSON Feed, then run:

```bash
npm run viable:social -- --config config/social.local.json
```

### Manage outreach drafts

```bash
npm run viable:outreach -- create \
  --channel email \
  --recipient person@example.com \
  --subject "Relevant event" \
  --message "I thought this might be useful."

npm run viable:outreach -- list
npm run viable:outreach -- approve --id <draft-id> --reviewer "Kevin"
npm run viable:outreach -- mark-sent --id <draft-id>
```

The base CLI records state. It does not send the message.

## Installation direction

The inherited Tauri packaging workflow supports native desktop bundles. Before Viable publishes an installer, the product identity, package names, application identifier, icons, release notes, and clean-machine onboarding must be reviewed under MythologIQ ownership.

End users should eventually install Viable without Node.js, npm, Rust, Git, or a repository checkout. The existing [installation guide](INSTALL.md) is being retained as the packaging baseline while Viable-specific release artifacts are prepared.

## Safety and privacy boundaries

Viable must not:

- store provider tokens in plaintext configuration or reports;
- collect private social content without explicit authorization;
- impersonate a user or post through an account without an approved adapter;
- send outreach merely because a score crossed a threshold;
- conceal source failures behind an empty result set;
- infer sensitive personal traits for targeting;
- turn imported provider content into executable instructions;
- claim a message was sent without durable delivery evidence.

See [Research and outreach safety](docs/governance/research-and-outreach-safety.md).

## Repository map

```text
apps/desktop/                 Native Tauri desktop and local IPC bridge
config/                       Example event and social configurations
docs/                         Architecture, product, operations, governance, and roadmap
schemas/                      Machine-readable event and report contracts
src/adapters/sources/         Event and social source adapters
src/adapters/scoring/         Deterministic and optional local model scoring
src/adapters/state/           SQLite and local outreach persistence
src/domain/                   Events, calendars, social signals, outreach, and profiles
src/ports/                    Provider-neutral source, store, scorer, and publisher contracts
src/runtime/                  Event, social, and outreach command-line entrypoints
src/service/                  Event, social research, and outreach application services
tests/                        Deterministic unit, contract, persistence, and integration tests
```

## Roadmap

The next product milestones are:

1. Finish the Viable desktop identity and add first-class Social Research and Outreach navigation.
2. Add saved social searches, research inboxes, tagging, collections, and signal-to-event linking.
3. Add prospect and organization records with evidence-backed deduplication.
4. Add outreach templates, review queues, personalization constraints, and local outcome tracking.
5. Add authorized platform adapters beginning with interfaces that provide stable public or user-authorized access.
6. Add optional delivery adapters only after approval, identity, rate-limit, and evidence requirements are enforced.
7. Produce reviewed MythologIQ-owned installers and clean-machine setup tests.

See [product roadmap](docs/roadmap/product-roadmap.md).

## Source lineage

Viable’s event subsystem originated as Event Radar, authored by Kevin R. Knapp and temporarily developed in the Bicameral GitHub organization. This repository imports that implementation as the foundation for a broader MythologIQ Labs product.

Historical documentation is retained when it explains implemented behavior, but Bicameral-specific ownership, governance, compliance, and licensing claims are not authoritative here. See [NOTICE.md](NOTICE.md).

## License

Copyright © 2026 MythologIQ Labs, LLC. All rights reserved.

This repository is proprietary and is not open source. Private evaluation does not grant production, modification, redistribution, hosting, derivative-work, or commercial rights. See [LICENSE](LICENSE).

## Documentation

- [Documentation index](docs/README.md)
- [Viable platform architecture](docs/architecture/viable-platform.md)
- [Product scope](docs/product/product-scope.md)
- [Current state](docs/status/current-state.md)
- [Product roadmap](docs/roadmap/product-roadmap.md)
- [Research and outreach safety](docs/governance/research-and-outreach-safety.md)
- [Installation guide](INSTALL.md)
- [Event provider standard](docs/providers.md)
- [Event operations index](docs/operations/README.md)
