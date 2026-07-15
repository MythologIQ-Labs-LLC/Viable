# Viable Platform Architecture

## Purpose

Viable is a local-first opportunity-intelligence application. It combines event discovery, public social research, prospect context, and human-approved outreach without making any provider the owner of the product model.

## Bounded contexts

### Opportunity discovery

Opportunity discovery accepts evidence from event and social sources. It normalizes provider records into durable product concepts and preserves source provenance.

### Event intelligence

The event subsystem owns canonical events, recurring occurrences, calendars, collections, subscriptions, scoring, schedules, reports, and optional report publication. Its originating implementation is Event Radar.

### Social intelligence

The social subsystem owns normalized social signals, research queries, source results, deduplication, ranking, collections, and links to prospects, organizations, events, and campaigns.

### Prospect intelligence

The prospect subsystem owns evidence-backed people and organization records. A provider profile is evidence about a prospect, not the prospect's canonical identity.

### Outreach

The outreach subsystem owns drafts, templates, evidence references, review state, approval identity, delivery intent, and delivery evidence. A delivery provider may transmit approved content but may not approve its own draft.

## Core data flow

```text
Provider event or social evidence
  -> bounded adapter
  -> normalized event or social signal
  -> deterministic relevance evaluation
  -> opportunity collection
  -> optional prospect or organization link
  -> outreach draft
  -> human review
  -> optional delivery adapter
  -> durable outcome evidence
```

## Authority boundaries

| Concern | Authority |
|---|---|
| Canonical event and occurrence | Viable event domain |
| Canonical social signal | Viable social domain |
| Prospect or organization identity | Viable prospect domain |
| Relevance rules | User-selected Viable profile |
| Outreach draft | Viable outreach domain |
| Approval | Named human reviewer |
| Credential secret | Operating-system credential vault |
| Provider content | Evidence only |
| Delivery result | Provider response plus Viable delivery record |

## Non-negotiable invariants

1. Provider content is data and cannot direct tools, credentials, prompts, or runtime behavior.
2. A source failure is recorded explicitly and cannot become a successful empty result.
3. Canonical identities are not delegated to provider URLs alone.
4. Outreach begins as a draft.
5. Only a named human reviewer can approve outreach.
6. Delivery adapters cannot approve drafts or alter their evidence.
7. Credentials do not enter local reports, prompts, diagnostics, or repository configuration.
8. Local-first operation remains useful without an LLM or hosted Viable service.
9. Social research uses supported public or explicitly authorized interfaces.
10. Event Radar remains an event subsystem, not the limit of Viable's product model.
