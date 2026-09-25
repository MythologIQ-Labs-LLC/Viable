# Task-centered navigation and review

## Purpose

Viable keeps bounded domain ownership internally, but ordinary navigation should answer a user's work question before it teaches the architecture.

The desktop therefore presents work-oriented labels while retaining Product Core, Signals, Campaigns, Studio, Calendar, Analytics, and other authority terms inside the relevant workflow context.

## Primary navigation

The desktop uses these task-oriented labels where the route exists:

- **Home**: see cross-workflow attention and the next explicit action;
- **Product & audience**: verify Product Core truth, evidence, claims, ICP hypotheses, validation, assessments, and readiness work;
- **Review signals**: inspect incoming evidence and turn accepted signals into owned work;
- **Market evidence**: read reviewed market evidence, limitations, and uncertainty;
- **Plan campaigns**: create and review governed campaign work;
- **Create & review**: work on canonical assets, channel variants, exports, and video production records;
- **Calendar**: work with planned and scheduled actions, activation packages, and delivery evidence;
- **Analytics**: record outcomes, compare evidence, run retrospectives, and retain learning.

Internal route identifiers do not change. This is presentation terminology, not a domain migration.

## Work before setup

### Signals

Signals now leads with:

1. evidence waiting in the inbox;
2. proposed work created from reviewed signals;
3. latest source health;
4. source and Website Watch administration on demand.

Website monitoring, public-repository collection, and advanced import controls remain available under **Manage evidence sources**. An empty inbox is still not evidence that the market is empty, and a source failure remains visible rather than disappearing into setup.

### Calendar

Calendar now leads with:

1. existing calendar records;
2. manual activation packages;
3. delivery evidence and outcomes;
4. planning and external-action creation;
5. destination administration on demand.

Non-secret destination configuration remains available under **Manage delivery destinations**. Moving it later in the page does not weaken destination compatibility, approval, rights, accessibility, retry, or delivery-evidence checks.

## Contextual review panels

User-facing review actions no longer require a browser prompt dialog. Selecting a review action opens an in-context review panel beside the record being decided.

The panel keeps together:

- the item being reviewed;
- visible evidence and authority context from the owning record;
- prior review feedback when present;
- named reviewer identity;
- the allowed decision set;
- a required review note for review models that already persist notes.

Campaign, canonical-asset, channel-variant, video, and scheduled external-action reviews preserve their existing durable reviewer, timestamp, decision, and review-note records.

Product evidence, ICP, Product claim, and Signal review currently persist named reviewer, timestamp, and decision but do not have a separate durable review-note field. The interface says so explicitly instead of accepting a note and silently discarding it.

## Authority preservation

The contextual review layer does not implement a second approval service. It captures the review input in the application and replays the existing owning controller action with those values. The controller and its existing service still perform validation and persistence.

This means the UI simplification does not bypass:

- reviewed-evidence requirements;
- claim or ICP gates;
- Campaign and Studio named-review transitions;
- video authority and artifact checks;
- Calendar source, destination, timing, rights, accessibility, disclosure, or scheduling checks.

If the expected owning review action changes or asks for more information than the panel supplied, the compatibility bridge returns no value rather than opening a native browser prompt. The review therefore fails closed.

## Technical vocabulary

Where a technical transition is the implementation mechanism rather than the user's goal, the visible action uses the goal first. Examples include:

- **Create Product action** instead of leading with “materialize in Product Core”;
- **Create Campaign draft**;
- **Create content brief**;
- **Create Calendar response plan**.

The destination authority remains visible in supporting copy and is still enforced by the owning service.