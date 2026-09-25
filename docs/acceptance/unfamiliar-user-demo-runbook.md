# Unfamiliar-User Demo Acceptance Runbook

Issue authority: #81  
Candidate baseline: `311eb4831e5ede62833cd0b34c37887189d2c081`

## Goal

Determine whether an intended user who does not know Viable's internal architecture can understand and complete the primary marketability journey without presenter rescue.

This is product acceptance, not a guided demo rehearsal. The facilitator observes. The participant drives.

## Participant profile

Prefer participants who resemble the intended user but have not been taught Viable's implementation model.

Suitable examples include:

- a founder or small-business operator;
- a product/marketing generalist;
- a maintainer responsible for getting a product in front of the right audience;
- another technically capable person who has not worked on the Viable architecture.

Do not use a participant as unfamiliar-user evidence if they already know how Product Core, Signals, Campaign, Calendar, or Learning authority is wired internally.

Record role/category only. Do not collect unnecessary personal information.

## Test sequence

Run one pilot first. Use the pilot to catch an obvious P0/P1 problem in the test setup or product before spending additional participant time.

After any pilot-blocking remediation, run at least two additional unfamiliar-user sessions against the same accepted candidate/workspace seed. If the results materially conflict, run another session or explain why the evidence is sufficient.

## Starting state

Every participant starts from the same known acceptance seed unless the scenario explicitly tests an empty workspace.

Before each run:

1. restore/reset the workspace to the canonical acceptance seed;
2. verify no prior participant's approvals, reviews, learning entries, outcomes, or failures remain;
3. verify the exact candidate/build identity;
4. start timing before the task prompt is read;
5. do not pre-navigate the participant to the "right" surface.

The seed must contain no credentials, confidential customer data, or private external-organization content.

## Participant prompt

Read this prompt substantially as written:

> You are preparing this product for a small marketing push. Use Viable to understand what needs your attention, establish who the product is for and the evidence supporting that choice, create and review campaign content, prepare only the channel output you intend to use, record what happened after the work went out, and determine what Viable suggests you do next. If something fails, use the application to understand and recover from it.

Do not explain where to start.

Do not define Product Core, bounded contexts, Signals authority, canonical assets, destination registries, or other implementation terminology unless the product itself exposes the term and the participant asks what the displayed text means. If that explanation is necessary for progress, record a facilitator intervention.

## Facilitation rules

The facilitator may:

- repeat the task prompt;
- ask the participant to think aloud;
- ask neutral questions such as "What are you looking for?" or "What do you think that status means?";
- stop a destructive action if test safety requires it;
- stop the session if data integrity or participant safety is at risk.

The facilitator must not:

- point to the correct navigation item;
- tell the participant what button to press;
- explain hidden prerequisites;
- supply an internal record ID;
- translate architecture into a workflow path;
- perform the action for the participant;
- tell the participant that a state is approved/exported/delivered/measured before they determine it from the UI.

Every rescue that changes the participant's next action is recorded.

## Journey 1 — Find the next action

From application start, ask the participant to begin the task.

Observe whether they can:

- identify where Viable expects attention;
- understand why that work is surfaced;
- navigate to the exact owning record/prerequisite;
- distinguish a recommendation from an automatic action.

Record time to first meaningful action and wrong turns before it.

## Journey 2 — Establish or revise product truth and audience

The participant must work with Product & audience to:

- inspect or revise product truth;
- inspect evidence and understand what is reviewed/current;
- create, revise, compare, or select an ICP as required by the seed;
- understand evidence linked to conclusions rather than assuming all visible evidence supports everything;
- identify any stale/re-review state created by a revision.

The participant should be able to explain, in their own words:

- who the product is for;
- what evidence supports that choice;
- what remains assumption or uncertainty;
- whether the audience choice is actually reviewed/selected.

## Journey 3 — Create, review, correct, and reapprove campaign/content work

Using the established Product authority, the participant must:

1. create or open relevant campaign/content work;
2. understand its current lifecycle state;
3. submit/review it through the in-app review surface;
4. encounter or intentionally use a changes-requested path;
5. make the required correction;
6. resubmit/re-review;
7. reach the valid approved state without bypassing evidence or named review.

Observe whether review context, prior feedback, reviewer identity, and allowed decisions are understandable without architectural explanation.

## Journey 4 — Export only intended channels

The participant chooses a bounded channel set for the scenario, for example one or two approved intended channels.

They must:

- understand Campaign channel intent;
- identify which variants are approved;
- create an export containing only intended/selected channels;
- explain that export does not mean provider publication or delivery;
- distinguish a legacy all-channel package if one is present in the seed.

A participant who believes package creation means "it has been published" has exposed a material comprehension defect even if the click path completed.

## Journey 5 — Record delivery/outcome and reach learning

Using the manual activation/outcome workflow, the participant must:

- locate the relevant Calendar/external-action record;
- understand schedule versus approval versus export;
- record the scenario's delivery/result evidence using the appropriate classification;
- avoid claiming provider verification when only human-recorded evidence exists;
- inspect performance/baseline evidence as provided by the scenario;
- complete or inspect a retrospective/learning entry;
- identify a learning-driven next action.

The participant should be able to explain what Viable knows, what it does not know, and what action remains human/provisional.

## Journey 6 — Deliberate recovery exercise

Introduce one safe, known failure from the seed/runbook, such as an invalid import or incomplete required field.

Do not tell the participant how to repair it.

Observe whether the participant can:

- identify that the operation failed;
- understand why;
- locate the relevant repair step;
- retry without losing unrelated entered work;
- distinguish the successful retry from the previous failure.

If facilitator rescue is required, record at least a P1 candidate finding until triage proves otherwise.

## Journey 7 — State comprehension check

Without turning the session into a vocabulary quiz, show representative records encountered during the run and ask the participant what has happened to each.

They should correctly distinguish, where represented:

- draft;
- in review / changes requested;
- approved;
- exported;
- scheduled;
- delivered or human-recorded outcome;
- provider-verified state if present;
- measured / learned.

The participant does not need to use internal architecture words. They do need to understand the real-world consequence of each state.

## Journey 8 — Workspace reset comprehension

Use a disposable acceptance workspace or discuss the operation before confirmation if the session seed must be preserved.

Ask the participant to determine:

- where workspace management lives;
- what a backup includes;
- what a reset/delete will remove;
- what remains outside Viable;
- how they would return to a known demo state.

For at least one controlled run, complete backup, destructive reset, and restore using the Workspace acceptance procedure.

## Metrics to capture

Record at minimum:

- time to first meaningful action;
- total task time;
- journey completion status;
- number of wrong turns that materially delay progress;
- number and nature of facilitator interventions;
- abandonment or skipped journey;
- state/authority misunderstandings;
- labels/controls repeatedly searched for;
- errors recovered without help;
- spontaneous participant comments that explain confusion or confidence.

Do not reduce the result to completion time alone. A fast participant who incorrectly believes an exported package was delivered has not passed the product comprehension gate.

## Acceptance interpretation

### Pass

A participant independently completes the primary journey, correctly understands consequential states, recovers from the deliberate failure, and requires no P1-level facilitator rescue.

### Conditional / remediation required

The participant completes but exposes a reproducible P0/P1 defect, consequential state misunderstanding, or facilitator-rescue dependency.

Create a narrow remediation issue and preserve the run as failed/conditional evidence.

### Invalid run

Mark the run invalid if:

- the candidate changed during the session;
- the seed was not reset as required;
- the facilitator coached the participant before the observed difficulty could be recorded;
- the environment fails independently of the product in a way that prevents meaningful testing;
- the participant is not actually unfamiliar with the workflow.

Invalid runs are retained but do not count toward #81 closure.

## Remediation and rerun

For each P0/P1 finding:

1. create a narrow linked issue;
2. fix through normal governed PR/validation;
3. create or update the candidate record if the code changes;
4. rerun the affected journey with a fresh or appropriately reset participant/session;
5. run one full smoke journey after all blocking remediation is integrated.

Do not rewrite the original acceptance result from fail to pass.

## Closure evidence for #81

Before #81 closes, the issue must link to evidence showing:

- the accepted candidate identity;
- #79 accessibility acceptance or an explicit reason its remaining scope is independently tracked without blocking the intended demo environment;
- successful unfamiliar-user runs following the sequence above;
- no unresolved P0/P1 findings;
- a final complete smoke journey after the last blocking remediation;
- recorded disposition for remaining P2/P3 findings.

Closure of #81 means the integrated UX has passed the bounded unfamiliar-user demo gate. It does not by itself satisfy installer signing, supported-platform, migration, update, or other release-foundation requirements in #36.