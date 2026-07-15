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
> Viable is a MythologIQ Labs, LLC product created and led by Kevin R. Knapp. It expands the Event Radar product foundation into a broader opportunity-intelligence platform for events, social research, prospects, and governed outreach.

Viable helps a person or small team identify worthwhile opportunities, understand the surrounding conversation, prepare relevant outreach, and retain enough context to act deliberately.

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

The Event Radar foundation includes:

- public Luma city and public-calendar discovery;
- Meetup Pro network ingestion;
- Eventbrite organization-event ingestion;
- local and remote ICS feeds;
- recurring-event normalization and occurrence projection;
- deterministic scoring with optional local model-assisted scoring;
- local SQLite history, reports, calendars, collections, and schedules;
- optional approved report publication;
- native Tauri desktop packaging and guided setup.

### Social research

The Viable social-research foundation includes:

- provider-neutral social-source contracts;
- normalized social signals with author, publication, tags, URL, provenance, and optional engagement metrics;
- bounded public-feed retrieval;
- cross-source canonical-URL deduplication;
- include and exclude term ranking;
- partial-failure reporting so one unavailable source does not erase successful research;
- repeatable local research runs.

Platform-specific adapters will be added only where supported access, privacy, and terms permit. Viable will not rely on undocumented private endpoints, copied browser sessions, or embedded credentials.

### Outreach

The outreach foundation includes:

- local outreach drafts for email and social channels;
- evidence references connecting a draft to an event, social signal, or manual note;
- explicit `draft`, `approved`, `rejected`, and `sent` states;
- named human approval before a draft can be marked sent;
- rollback-safe local persistence;
- no automatic sender in the base implementation.

Future delivery integrations must preserve the approval boundary, destination identity, rate limits, provider terms, and durable delivery evidence.

## Product principles

1. **Local first.** Core history, preferences, reports, drafts, and approvals belong to the user’s installation.
2. **Evidence before action.** Recommendations and outreach drafts retain the facts that caused them to exist.
3. **Human-approved outreach.** Research can accelerate judgment. It cannot replace consent and accountability.
4. **Provider-neutral core.** Events, social signals, prospects, and drafts are product concepts, not extensions of one platform’s API.
5. **Supported access only.** Public interfaces and authorized APIs are preferred over fragile private endpoints or copied sessions.
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
       -> reviewed summaries
       -> reviewed outreach delivery
```

Durable architecture is documented in [Viable platform architecture](docs/architecture/viable-platform.md).

## Current status

| Area | Status | Notes |
|---|---|---|
| Viable product identity | Established | MythologIQ ownership and proprietary license |
| Platinum README | Established | Product front door and authoritative positioning |
| Event Radar source migration | In progress | Only sanitized, product-generic code and documentation will be imported |
| Event intelligence design | Mature source available | Event Radar foundation |
| Social signal domain | In progress | Provider-neutral types and provenance |
| Social research ranking | In progress | Include, exclude, deduplication, freshness, and partial failures |
| Outreach draft lifecycle | In progress | Draft, approve, reject, and mark-sent states |
| Automatic outreach delivery | Not implemented by design | Requires explicit adapter and preserved human approval |
| Social desktop experience | Planned next | Research inbox, saved searches, signal detail, and prospect linking |
| Prospect and organization graph | Planned next | Evidence-backed identities and relationships |
| Public installer release | Not yet published | Product identity and package validation required |

The authoritative status document is [docs/status/current-state.md](docs/status/current-state.md).

## Development direction

Once the source migration is complete, development will use Node.js 22 or newer, npm 10 or newer, Rust 1.88 or newer, and the Tauri 2 prerequisites.

Expected validation baseline:

```bash
npm ci
npm run check
npm test
npm run viable:health
npm run desktop:check
```

## Security, privacy, and migration boundaries

Viable must not contain:

- organization-specific branding or governance content from another repository;
- real API keys, OAuth tokens, webhooks, passwords, cookies, session profiles, or credential references tied to a real account;
- real Slack channels, workspace identifiers, email addresses, account IDs, destination IDs, or production URLs;
- exported prompts, logs, reports, fixtures, or test data containing confidential operational information;
- provider tokens in plaintext configuration, reports, diagnostics, backups, prompts, command arguments, or logs;
- private social content without explicit authorization;
- automatic outreach based solely on a score;
- executable instructions derived from imported provider content.

All imported material must pass:

1. secret scanning;
2. organization-name and account-reference scanning;
3. configuration and fixture review;
4. documentation review;
5. package-identity review;
6. deterministic tests before merge.

See [Research and outreach safety](docs/governance/research-and-outreach-safety.md).

## Roadmap

The next product milestones are:

1. Complete a sanitized Event Radar source migration into Viable.
2. Rebrand the native desktop, package identifiers, icons, and installer assets.
3. Add first-class Social Research and Outreach navigation.
4. Add saved social searches, research inboxes, tagging, collections, and signal-to-event linking.
5. Add prospect and organization records with evidence-backed deduplication.
6. Add outreach templates, review queues, personalization constraints, and local outcome tracking.
7. Add authorized platform adapters beginning with stable public or user-authorized access.
8. Produce reviewed MythologIQ-owned installers and clean-machine setup tests.

See [product roadmap](docs/roadmap/product-roadmap.md).

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
