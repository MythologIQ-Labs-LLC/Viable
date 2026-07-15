# ICP Discovery and Validation

## Purpose

Viable must help founders identify, validate, and refine the ideal customer profile for a product.

An ICP is not a decorative persona, a broad industry label, or a list of everyone who might conceivably use the product. It is an evidence-backed description of the organizations or customers most likely to experience the target problem, receive meaningful value, adopt successfully, and support a viable commercial relationship.

## Product outcome

A founder should be able to use Viable to answer:

1. Who experiences the problem strongly enough to act?
2. Who can obtain meaningful value from the current product?
3. Who can buy, approve, influence, use, block, or champion adoption?
4. Which candidate segment has the strongest combination of urgency, fit, access, proof, and commercial viability?
5. Which customers should be explicitly excluded or deprioritized?
6. What evidence supports the ICP?
7. What remains an assumption?
8. What should be tested next?
9. How should the ICP change when product or market evidence changes?

## ICP model

Each ICP record should contain:

- segment name and status;
- organization or customer type;
- industry or category where relevant;
- size, maturity, geography, and operating environment where relevant;
- product and technical context;
- target problem and current workaround;
- urgency and triggering events;
- desired outcome and measurable value;
- user roles;
- economic buyer;
- decision-maker;
- approver;
- influencer;
- champion;
- blocker;
- procurement or security constraints;
- budget or willingness-to-pay evidence;
- buying motion and expected sales cycle;
- adoption prerequisites;
- disqualifiers and anti-ICP conditions;
- reachable channels, communities, events, search behavior, and repositories;
- proof available for this segment;
- confidence, evidence, contradictions, owner, and last-reviewed date.

## Candidate segment comparison

Viable should allow founders to compare ICP candidates across explicit dimensions:

| Dimension | Core question |
|---|---|
| Problem intensity | How painful, frequent, costly, or risky is the problem? |
| Urgency | What causes the segment to act now rather than later? |
| Product fit | Can the current product solve the problem without unsupported promises? |
| Time to value | How quickly can the segment reach a meaningful outcome? |
| Access | Can the founder reliably reach and learn from this segment? |
| Buyer clarity | Is it clear who can approve and fund adoption? |
| Proof | Is there credible evidence that the product works for this segment? |
| Adoption friction | What technical, procurement, policy, migration, or behavior barriers exist? |
| Commercial viability | Can acquisition, support, and delivery costs support a viable business? |
| Retention potential | Is the value recurring or durable enough to support continued use? |
| Strategic fit | Does the segment reinforce the intended product direction? |
| Evidence quality | How much of the profile is observed rather than assumed? |

Viable must not hide these factors inside an unexplained composite score. It may summarize fit using ranges or classifications, but the underlying evidence and uncertainty must remain visible.

## Discovery workflow

```text
Establish product truth
  -> identify problems and outcomes
  -> propose candidate segments
  -> map users, buyers, influencers, blockers, and champions
  -> gather market, customer, event, search, social, repository, and sales evidence
  -> compare candidate segments
  -> identify assumptions and contradictions
  -> select a primary ICP hypothesis
  -> define disqualifiers and anti-ICP conditions
  -> create validation experiments
  -> observe adoption, conversion, retention, and sales evidence
  -> refine or replace the ICP
```

## Evidence sources

ICP evidence may come from:

- founder and customer interviews;
- product usage and onboarding outcomes;
- support and success themes;
- sales notes, objections, wins, losses, and stalls;
- website and search behavior;
- public social and community discussions;
- events and professional communities;
- public repository users, contributors, dependents, and inquiries;
- competitor positioning and customer evidence;
- pricing, procurement, and implementation conversations;
- referrals, partnerships, and ecosystem signals;
- manually imported research.

Every evidence item must preserve source, date, provenance, access limitations, confidence, and relationship to the ICP hypothesis.

## Validation experiments

Viable should help founders turn uncertainty into explicit experiments, such as:

- interview a defined number of people in the candidate segment;
- test a landing page or message with one segment;
- compare response to two problem statements;
- offer a demo, trial, pilot, or implementation review;
- test willingness to provide data, time, access, or payment;
- measure successful onboarding and time to value;
- compare qualified conversations by channel or community;
- test whether the assumed buyer can actually approve purchase;
- examine why qualified prospects reject, delay, or abandon adoption.

Each experiment should define the hypothesis, segment, evidence required, success and failure conditions, observation window, owner, and resulting decision.

## Anti-ICP and disqualification

Viable must help users record who the product is not for.

Disqualifiers may include:

- problem is too weak or infrequent;
- product cannot currently deliver the required outcome;
- required integrations or environments are unsupported;
- procurement, regulatory, security, or privacy requirements exceed the product posture;
- implementation or support cost is structurally uneconomic;
- buyer authority or budget is absent;
- expected behavior conflicts with product safety or governance boundaries;
- customer requires deceptive growth, spam, surveillance, unsupported claims, or bypassed access controls;
- customer expectations would force the product away from its intended strategy.

A broad reachable audience must not silently become the ICP, and anonymous engagement must not silently become a qualified lead.

## Relationship to positioning and campaigns

The selected ICP informs:

- product positioning;
- value proposition;
- offer and packaging;
- proof selection;
- website and landing-page content;
- SEO and AEO planning;
- event and community monitoring;
- public repository growth plans;
- campaign audiences and channel strategy;
- content and video briefs;
- lead qualification;
- sales preparation;
- product feedback and roadmap learning.

Campaigns may target narrower audiences within an ICP or test adjacent candidate segments, but they must not rewrite the canonical ICP without evidence and review.

## Required product behavior

- The founder can create and compare multiple ICP hypotheses.
- User, buyer, decision-maker, influencer, champion, blocker, partner, contributor, and disqualifier remain distinct roles.
- Every ICP conclusion displays evidence, confidence, contradictions, and freshness.
- The system distinguishes observed facts from assumptions and generated suggestions.
- A founder can choose one primary ICP while retaining secondary and rejected candidates.
- Changes to product truth can flag affected ICP assumptions.
- Signals, campaigns, leads, sales outcomes, adoption, and retention can update ICP confidence.
- Viable can recommend validation work but cannot declare an ICP proven without supporting evidence.
- ICP history and rationale remain available after revisions.

## Success criteria

Viable succeeds at ICP discovery when a founder can explain:

1. why the chosen ICP is more attractive than the alternatives;
2. which evidence supports the choice;
3. which assumptions remain uncertain;
4. who uses, buys, approves, influences, champions, or blocks adoption;
5. who is explicitly excluded;
6. what validation action happens next;
7. what evidence would cause the ICP to change.

## Related documents

- `PRD.md`
- `marketability-operating-model.md`
- `product-scope.md`
- `../architecture/viable-platform.md`
- `../roadmap/initial-build-sequence.md`
- GitHub issue #2
