# Public Repository Growth and Launch Workflow

## Purpose

This guide explains the implemented internal workflow for assessing a public GitHub repository, creating owned readiness work, coordinating an approved manual launch, and comparing outcomes with a pre-launch baseline.

The workflow is part of Product. It is not a disconnected growth tool, a direct publisher, or a promise that a repository will reach GitHub Trending.

## Current maturity

The repository-growth core and Product-integrated desktop workflow are implemented and automatedly validated through PRs #20 and #21.

The workflow is still internal. Hands-on keyboard and assistive-technology acceptance, unfamiliar-maintainer completion, and remediation from those reviews remain open under issue #3.

## Authority boundaries

- Product Core remains authoritative for product evidence and approved claims.
- Campaigns remains authoritative for approved campaign briefs, canonical assets, and channel variants.
- Repository Growth may assess public repository evidence and coordinate launch work, but it cannot silently revise product truth, claims, ICP state, campaigns, or approved assets.
- Stars, forks, watchers, downloads, contributors, and public issue counts are activity signals. They are not proof of adoption, commercial value, or ICP fit.
- Missing repository traffic, referral, clone, dependent, integration, or commercial-inquiry access remains unavailable. It does not become zero.
- Manual export does not grant publishing approval and does not claim delivery.
- No credentials, GitHub account tokens, destinations, or private repository content enter the implemented workflow.

## Prerequisites

Before creating a repository launch room:

1. Create a Product workspace.
2. Record and review non-generated evidence.
3. Propose and approve at least one Product Core claim.
4. Create and approve a campaign with one primary audience and outcome.
5. Create and approve a canonical asset.
6. Create and approve LinkedIn, website, and GitHub release variants.

Repository assessment and growth planning can begin before campaign authority exists. Launch-room creation remains blocked until the approved asset family is available.

## Open the workflow

1. Open **Product**.
2. Find **Public repository product surface** beneath the Product header.
3. Select **Open repository growth**.

Repository Growth remains visually and operationally subordinate to Product authority.

## Import public evidence

Enter a public GitHub repository using `owner/repository` format and provide a named import owner.

The public import may collect:

- repository identity, description, homepage, topics, language, default branch, archive state, and fork state;
- README content and detected quick-start, demo, documentation, and limitation language;
- community-profile evidence;
- license, security, support, contributing, code-of-conduct, issue-template, and pull-request-template presence;
- a bounded release sample and release-asset download counts;
- a bounded contributor sample;
- public stars, forks, watchers, and open-issue counts.

Secondary source failures produce a partial import. Successful evidence remains available while the failed checks and limitations remain visible.

## Understand metric states

Every metric has an evidence state:

- **Observed** means a numeric value was retrieved or manually recorded.
- **Verified zero** means the source was successfully checked and explicitly returned zero.
- **Unavailable** means the workflow lacks supported access or evidence.
- **Not collected** means no collection or observation was attempted.

Only observed and verified-zero values participate in numeric baseline comparisons. Unavailable and not-collected evidence remains non-numeric.

## Run the readiness assessment

Select **Run explained readiness assessment**.

The deterministic assessment covers:

1. problem clarity;
2. product credibility;
3. time to value;
4. discoverability;
5. differentiation;
6. trust;
7. community readiness;
8. release discipline;
9. distribution;
10. adoption evidence;
11. sustainability;
12. commercial path.

Every finding shows:

- evidence;
- rating;
- confidence;
- impact;
- effort;
- owner;
- recommendation;
- verification method.

The ratings prioritize controllable readiness work. They do not predict GitHub Trending, virality, sales, or adoption.

## Create and work the growth plan

Select **Create prioritized growth plan** after an assessment exists.

The plan includes findings rated below ready, ordered by impact and effort. Each action has an owner, verification method, and explicit status:

- open;
- in progress;
- completed;
- dismissed.

Complete or dismiss actions only with a reason grounded in repository evidence and the intended audience.

## Bind reviewed Signals work to an existing growth action

A reviewed `repository` or `repository_activity` signal may be converted to **Repository growth action** in Signals. The conversion does not create a second Repository Growth task.

Before the conversion can materialize, this workflow must already contain:

- the same imported repository;
- a readiness assessment for that repository;
- a growth plan created from that assessment;
- an active `open` or `in_progress` action derived from a finding rated below ready.

In Signals, choose **Bind to Repository Growth action** and select the active action. Viable revalidates the repository relationship, plan and assessment ownership, finding identity, action status, and the finding-derived recommendation, impact, effort, and verification.

On success, Signals records the authoritative Repository Growth action identifier. Repository Growth keeps ownership of the action and its status. The binding does not rename the action, change its owner, alter its prioritization fields, or mark it complete.

## Create a launch room

When an approved campaign asset family exists, complete the launch-room form.

Record:

- launch-room title;
- release tag;
- approved canonical asset;
- primary audience;
- desired outcome;
- required checklist;
- maintainer coverage owner and responsibility;
- coverage window;
- observation window;
- retrospective time;
- named launch owner.

The launch-room audience must match the approved campaign audience. Product Core claim revisions and reviewed evidence are revalidated when the room is created and again when a manual export is created.

## Verify launch readiness

Every required checklist item begins open.

Select an item and record named verification evidence. The launch room becomes **ready for manual launch** only when every required item is complete.

Typical checks include:

- README and quick start frozen;
- release artifact tested in a clean environment;
- release notes and limitations approved;
- repository topics and social preview reviewed;
- community rules checked;
- launch assets approved;
- maintainer coverage scheduled.

## Create the manual launch export

When the room is ready, select **Create manual launch export** and provide a named export creator.

The downloaded manifest contains:

- repository and release identity;
- audience and desired outcome;
- checklist and maintainer coverage;
- baseline metric evidence;
- approved campaign claims and evidence references;
- approved canonical asset body, rights, accessibility, and disclosure requirements;
- approved LinkedIn, website, and GitHub release variants;
- manual destination categories.

The manifest explicitly records:

- `approvedForPublishing: false`;
- `delivered: false`;
- `credentialsIncluded: false`.

Use the package to perform authorized manual launch work. The export itself does not prove that any external action occurred.

## Complete the retrospective

After the observation window ends, record:

- named retrospective owner;
- summary;
- concrete learnings;
- one reversible next action;
- observed or explicitly unavailable outcome metrics.

The retrospective compares compatible numeric outcomes with the launch-room baseline. It does not calculate a delta when either side is unavailable or not collected.

Interpret attention metrics cautiously. A star increase may indicate visibility, but adoption requires stronger evidence such as successful first use, repeat use, dependents, integrations, user stories, qualified inquiries, or commercial progression.

## Recovery behavior

If a repository operation fails:

- the failure remains visible;
- previously saved repository evidence and plans remain intact;
- select **Return to saved repository workspace** to recover the last persisted state;
- live GitHub access can be retried later without erasing local work.

## Known limitations

- Only public unauthenticated GitHub import is implemented.
- Authenticated traffic, referral, clone, dependent, integration, and private repository adapters are not implemented.
- GitHub write operations and release creation are not implemented.
- Direct publishing is not implemented.
- The workflow does not guarantee Trending, search placement, virality, adoption, leads, or sales.
- Human accessibility and unfamiliar-maintainer acceptance remain release gates.
