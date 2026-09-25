# Home attention and next action

## Purpose

Home answers a narrow question: **what recorded Viable work needs attention now, and why?**

It does this by reading the existing local workflow stores and presenting their explicit states in one place. Home is not a new authority layer. It does not approve records, edit domain state, materialize work, publish content, claim delivery, or manufacture a business-value score.

## Attention order

Home uses a deterministic state order:

1. **Recovery needed**: an explicit operation or evidence flow failed or was interrupted.
2. **Review needed**: a named review, correction, or resubmission is waiting.
3. **Blocked or stale**: authority is invalidated, evidence is stale or partial, or a required gate is incomplete.
4. **Owned action**: an existing action or prerequisite is open or already in progress.
5. **Scheduled follow-up**: a recorded time or lifecycle state requires export, delivery evidence, or outcome collection.
6. **Learning**: evidence is ready for a retrospective, or the latest learning ledger has a reversible next action to consider.

Within a category, ordering uses recorded timestamps, a stable workflow order, and stable record identifiers. Viable does not infer ROI, urgency, likelihood of success, or business value where the owning workflow has not recorded those facts.

## What Home reads

Home can surface attention from:

- Product Core: stale evidence, ICP review state, active validation experiments, readiness actions, and explicit prerequisites;
- Signals: source failures, failed materialization, and unreviewed signal evidence;
- Campaigns and Studio: campaign, content-brief, canonical-asset, and channel-variant review or invalidation state;
- Repository Growth: partial evidence, finding-backed actions, launch checklist state, export readiness, and retrospective timing;
- Video Production: review state, production-package readiness, partial runs, and failed runs;
- Calendar: scheduling review, authority invalidation, package readiness, interrupted export, delivery evidence gaps, and failed delivery;
- Analytics and Learning: delayed or failed performance evidence, completed observation windows without outcome evidence, retrospective readiness, and the latest retained learning-ledger decision.

These records remain owned by their original bounded contexts.

## Opening work from Home

Each attention card opens the owning workflow and attempts to focus the exact authoritative record. When the item represents a prerequisite rather than an existing record, Home opens the exact prerequisite section instead.

Examples:

- a Product Core readiness action opens that action record;
- a failed Signal conversion opens that conversion in Signals;
- a Campaign review item opens its Campaign record;
- an invalidated channel variant opens the variant in Studio;
- a Repository Growth action opens the finding-backed action in its repository workspace;
- a Calendar item opens its calendar record;
- an Analytics item opens its measurement, performance, retrospective, or learning surface.

Navigation does not change approval or lifecycle state.

## Partial local context

Each workflow store is loaded independently. If one store cannot be read, Home keeps recommendations derived from the stores that did load and shows a visible partial-context warning naming the failed source and error.

A missing or unreadable workflow is never treated as:

- no work;
- verified empty;
- successful;
- completed;
- evidence that the market or product has no remaining problems.

## Empty attention state

If no explicit attention item is found, Home says that no recorded attention state is currently waiting in the successfully loaded workflows. This is deliberately weaker than saying there is no work to do.

## Authority boundary

Home is an aggregation and navigation surface only. Mutation remains with Product Core, Signals, Campaigns and Studio, Repository Growth, Video Production, Calendar, Analytics, and their existing named-review services.

That boundary is important: a convenient dashboard should reduce searching, not quietly become a second database with opinions.