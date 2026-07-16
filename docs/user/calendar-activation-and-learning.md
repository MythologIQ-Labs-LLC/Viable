# Calendar, Manual Activation, Outcomes, and Learning

## Status

This guide describes the implemented internal Slice 6 desktop workflow.

Automated validation and native packaging passed. Hands-on keyboard, assistive-technology, and unfamiliar-user acceptance remain open release gates.

## What this workflow does

Calendar and Analytics let you:

1. record a manual destination without storing credentials;
2. schedule internal planning work;
3. bind approved Campaign, Repository Launch, or Video work to a destination and time;
4. obtain named external-action approval;
5. create and download a manual activation package;
6. record what actually happened;
7. record a baseline and observation window;
8. import explicit performance evidence;
9. complete a retrospective;
10. create a learning-ledger entry with one reversible next action.

The workflow is local first and does not require a publishing API.

## What it does not do

This slice does not:

- connect to social accounts;
- store API keys or OAuth tokens;
- publish automatically;
- claim that a download was published;
- claim provider verification from a human note;
- turn missing metrics into zero;
- automatically rewrite the selected ICP;
- automatically rewrite product claims or positioning;
- provide a general attribution engine.

## Before you begin

You need an active Product workspace.

For external activation, you also need at least one approved source:

- an approved Campaign channel variant;
- a Repository Growth launch room ready for manual launch with a matching approved channel variant;
- an approved Video Production platform variant.

The source must still have current:

- Product Core claims;
- reviewed evidence;
- campaign approval;
- rights and consent;
- accessibility requirements;
- disclosure requirements.

## Calendar and Analytics navigation

The desktop sidebar contains:

- **Calendar** for destinations, timing, review, packages, export handoff, and outcome evidence;
- **Analytics** for baselines, metric imports, comparisons, retrospectives, and the learning ledger.

The pages use the same local workspace but preserve separate responsibilities.

## Step 1: Add a manual destination

Open **Calendar** and find **Destination registry**.

Enter:

- destination label;
- channel;
- non-secret account reference;
- account owner;
- capability notes;
- rate-limit notes;
- manual retry policy;
- data-handling notes.

Confirm that the workspace is authorized to use the destination.

Examples of safe account references:

- `company-page:mythologiq-labs`;
- `repo:MythologIQ-Labs-LLC/Viable`;
- `website:product-homepage`.

Do not enter:

- passwords;
- API keys;
- OAuth tokens;
- cookies;
- browser sessions;
- private headers.

Destinations may be enabled or disabled.

A disabled destination cannot approve or export new external actions.

## Step 2: Add internal planning entries

The unified calendar can record:

- approval deadlines;
- event opportunities;
- experiments;
- follow-ups.

Enter:

- type;
- title;
- owner;
- start;
- optional end;
- timezone;
- optional related record;
- notes.

These entries are scheduled immediately because they do not authorize external publication.

Their activation status is `not applicable`.

## Step 3: Create a draft external action

Calendar displays the form **Bind approved work to a destination and time** when:

- an active destination exists;
- at least one matching approved source exists.

Choose:

- active destination;
- approved source;
- title;
- owner;
- start and optional end;
- timezone;
- notes.

The source list is filtered to match the destination channel.

Examples:

- LinkedIn destination with an approved LinkedIn campaign variant;
- GitHub Release destination with a ready repository launch room and approved GitHub release variant;
- LinkedIn destination with an approved LinkedIn video variant.

Creating the entry produces a draft.

It does not schedule or publish anything.

## Step 4: Submit for destination-bound review

Choose **Submit for destination review**.

Viable rechecks:

- destination state;
- source approval;
- exact source version;
- Product Core claim revisions;
- reviewed evidence;
- rights and consent;
- accessibility;
- disclosures;
- matching channel.

A successful submission changes the schedule state to `in review`.

If authority changed, the submission is blocked.

## Step 5: Review the external action

A named reviewer chooses:

- approve and schedule;
- request changes;
- reject.

The review note should cover:

- source;
- destination;
- timing;
- rights;
- accessibility;
- disclosure requirements;
- readiness for manual activation.

Approving changes the schedule status to `scheduled`.

The activation status remains `not ready`.

This distinction matters. Scheduled work has timing intent and named approval. It has not been exported or delivered.

## Step 6: Create the manual activation package

For an approved scheduled external action, choose **Create manual activation package**.

Viable rechecks current authority again.

The package includes:

- calendar entry;
- timezone;
- named review;
- destination record;
- approved source snapshot;
- exact payload or file reference;
- rights, accessibility, and disclosures;
- idempotency key;
- manual activation instructions.

The package states:

- no credentials included;
- no direct publishing available;
- no delivery claimed;
- no provider verification claimed.

The activation status changes to `ready for manual activation`.

## Step 7: Download the package

Choose **Download package and record handoff**.

The browser downloads a JSON package for manual use.

Viable records the export operation as downloaded.

This means the package was handed off from the application.

It does not mean:

- the destination received it;
- a human completed the action;
- a provider accepted it;
- publication succeeded;
- delivery was verified.

## Interrupted export and recovery

Before a successful download, you may choose **Record interruption**.

Enter what happened, for example:

- browser download was cancelled;
- local disk was unavailable;
- the operator stopped to recheck the destination.

The operation becomes `interrupted`.

Choose **Recover export** to restore it to ready-for-download state.

Recovery does not alter approval or delivery state.

## Step 8: Record delivery, failure, cancellation, or unknown outcome

After a completed export handoff, use **Delivery evidence**.

Choose the completed package. Viable binds the form to the exact Calendar entry.

Select an outcome:

- delivered;
- failed;
- cancelled;
- unknown.

Select an evidence classification:

### Human recorded

Use this when an accountable person records evidence such as:

- public URL;
- screenshot reference;
- publication identifier;
- failure note;
- operator record.

### Provider evidence

Use this when you have a provider export, report, or response reference, but Viable is not claiming independent provider verification.

### Provider verified

Use this only when a provider response identifier exists.

Do not select provider verified merely because a human saw a page or copied a URL.

### Delivered outcome requirements

A delivered outcome requires at least one of:

- delivery URL;
- publication identifier;
- provider response identifier.

It also requires evidence references and a note.

### Failed outcome requirements

A failed outcome requires:

- failure class;
- failure detail;
- evidence references;
- note.

Recording the outcome changes the activation status while preserving the separate schedule status.

## Cancel a Calendar entry

An undelivered entry may be cancelled with a named owner and reason.

A delivered entry cannot be cancelled as though the delivery never occurred.

Historical evidence remains in the workspace.

## Recheck authority

Choose **Recheck source and destination authority** to evaluate current scheduled and reviewed external actions.

Viable checks:

- destination still active;
- source still approved;
- source version still current;
- claims still approved at the referenced revision;
- evidence still reviewed;
- channel still matches;
- rights and consent still valid.

If authority changed before delivery:

- the schedule status becomes `approval invalidated`;
- activation returns to `not ready` unless delivery was already recorded;
- the unexecuted package becomes `authority invalidated`.

Previously recorded delivery evidence is not erased.

## Step 9: Create a measurement plan

Open **Analytics**.

Find **Record what was true before the outcome window**.

Choose a Calendar entry and enter:

- observation-window start;
- observation-window end;
- plan owner;
- baseline metric;
- baseline evidence state;
- numeric value when allowed;
- unit;
- evidence source;
- evidence reference;
- limitation when required;
- baseline-window start and end;
- capture time.

The baseline should be recorded before interpreting the outcome.

## Metric evidence states

Choose the evidence state that describes what you actually know.

### Observed non-zero

Use when a finite non-zero value was observed.

Example:

- three qualified review requests.

A numeric value is required.

### Verified zero

Use only when a supported source or explicit human evidence verified zero.

Example:

- the reviewed inquiry log contained zero qualified inquiries during the complete window.

Viable records the numeric value as zero.

### Delayed

Use when evidence is expected but has not arrived.

Do not enter a numeric value.

State the limitation.

### Partial

Use when some evidence exists but it is incomplete.

A numeric value is optional.

State the limitation.

### Unavailable

Use when access or evidence is unavailable.

Do not enter a numeric value.

State why it is unavailable.

### Not collected

Use when the metric was not collected.

Do not enter a numeric value.

State the limitation.

## Step 10: Import performance evidence

Use **Import one explicit metric observation**.

Choose:

- related Calendar entry;
- import status;
- source classification;
- importer;
- metric;
- evidence state;
- value and unit when allowed;
- evidence source and reference;
- limitation;
- metric window;
- capture time;
- notes.

Import statuses are:

- complete;
- partial;
- delayed;
- unavailable;
- failed.

A complete import may contain only observed or verified-zero evidence.

An unavailable import must not include a numeric value.

The current desktop form imports one metric observation at a time. You may add additional imports for other metrics or newer evidence.

## Step 11: Complete a retrospective

A retrospective becomes eligible when:

- a measurement plan exists;
- at least one performance import exists;
- external actions have recorded delivery, failure, cancellation, or unknown-outcome evidence;
- no retrospective already exists for the Calendar entry.

Enter:

- decision;
- attribution model;
- named owner;
- summary;
- learnings;
- attribution uncertainty;
- evidence references;
- one reversible next action;
- ICP-confidence effect and rationale;
- positioning effect;
- change;
- outcome;
- follow-up.

Decisions are:

- continue;
- iterate;
- stop;
- inconclusive.

## Attribution model and uncertainty

The retrospective requires both.

Models include:

- manual;
- first touch;
- last touch;
- influence;
- unattributed.

Example uncertainty:

> Qualified review requests were manually linked to the launch, but prior conversations and unrelated website visits may also have influenced the outcome.

Do not present attribution as certain when the evidence is incomplete.

## Metric comparisons

Viable calculates a numeric delta only when the baseline and outcome states are compatible numeric evidence:

- observed;
- verified zero.

Example:

- verified-zero baseline: 0 qualified reviews;
- observed outcome: 3 qualified reviews;
- delta: 3.

When states are incompatible, Viable preserves the states and limitation instead of inventing a number.

## Step 12: Review the learning ledger

Completing the retrospective creates a learning entry containing:

- evidence;
- decision;
- change;
- outcome;
- follow-up;
- reversible next action;
- attribution model;
- attribution uncertainty.

The entry is a durable local decision record.

It is not an automatic mutation of Product Core.

## ICP-confidence and positioning effects

A retrospective can record that evidence appears to:

- strengthen ICP confidence;
- weaken ICP confidence;
- produce no change;
- remain unknown.

It can also state a positioning effect.

These are review signals only.

To change the selected ICP, product truth, or approved claims, return to Product Core and use its review workflow.

## Empty and blocked states

### No destination

Create an authorized non-secret destination record.

### No approved source

Return to Campaigns, Repository Growth, or Video Production and complete the relevant approval workflow.

### External scheduling blocked

Confirm that the active destination channel matches an approved source.

### Package creation blocked

Confirm that:

- the entry is scheduled;
- named review exists;
- destination is active;
- source authority is current.

### Delivery form blocked

Download the package first. A scheduled entry or merely created package is insufficient.

### Performance import blocked

Create a measurement plan and baseline first.

### Retrospective blocked

Record:

- baseline;
- performance import;
- outcome evidence for external actions.

## Offline behavior

The implemented workflow remains local and usable without provider APIs.

Offline operation supports:

- destination records;
- planning and scheduling;
- named review;
- package generation;
- download;
- manual evidence entry;
- baselines;
- performance imports;
- retrospectives;
- learning ledger.

A provider URL or export may be entered later when available.

## Error and recovery behavior

Failed operations are not silently saved.

The page displays the error and offers **Return to saved Calendar and Analytics state**.

Interrupted export uses its own explicit recovery flow.

Authority invalidation remains visible rather than automatically recreating approval.

## Accessibility notes

The implemented desktop workflow includes:

- semantic headings;
- labeled form controls;
- keyboard-operable buttons;
- live-region announcements;
- visible textual status;
- responsive layout;
- reduced-motion behavior;
- no reliance on color alone.

Human keyboard and assistive-technology acceptance remains required before issue #7 can close.

## Data safety

Never place credentials in:

- account references;
- capability notes;
- retry policies;
- Calendar notes;
- evidence references;
- outcome notes;
- metric sources;
- retrospective text;
- learning entries.

Packages are credential free by contract.

## Known limitations

- manual destinations only;
- no direct publishing;
- no automatic provider verification;
- no connected analytics imports;
- one metric per desktop measurement form;
- no automatic Product Core or ICP mutation;
- no hosted collaboration;
- no signed public installer;
- human acceptance remains open.

## Related documentation

- [Product Requirements Document](../product/PRD.md)
- [Platform architecture](../architecture/viable-platform.md)
- [Calendar, Activation, Outcome, and Learning architecture](../architecture/activation-and-learning-domain.md)
- [Campaigns and Studio](campaigns-and-studio.md)
- [Repository Growth](repository-growth.md)
- [Video Production](video-production.md)
- [Current state](../status/current-state.md)
