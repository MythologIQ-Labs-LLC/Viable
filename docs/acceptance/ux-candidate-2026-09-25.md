# UX Acceptance Candidate — 2026-09-25

## Purpose

Freeze one integrated Viable UX baseline for human accessibility and unfamiliar-user acceptance.

This record is not a release declaration. It identifies the code and machine-validation boundary against which human acceptance evidence is collected.

## Frozen baseline

- Repository: `MythologIQ-Labs-LLC/Viable`
- Branch authority: `main`
- Candidate commit: `311eb4831e5ede62833cd0b34c37887189d2c081`
- Final merged UX PR: #92
- UX-completion umbrella: #81
- Accessibility acceptance issue: #79

The candidate contains the complete integrated UX-remediation stack:

- #82 / #72: destination journeys and Product Core action lifecycle;
- #83 / #73: correction, revision, and re-review;
- #85 / #74: durable progressive drafts and explicit evidence selection;
- #87 / #79: deterministic accessibility, recovery, and navigation work;
- #88 / #80: product-wide workspace backup, restore, reset, retention, and deletion;
- #89 / #75: guided imports and in-context media review;
- #90 / #78: intentional channel export selection;
- #91 / #76: cross-workflow Home attention;
- #92 / #77: task-centered navigation, setup, and in-app review.

## Machine-validation baseline

The final integrated `main` commit passed both repository and native desktop validation:

- CI #296: passed on `311eb4831e5ede62833cd0b34c37887189d2c081`;
- Desktop #223: passed on the same commit, including Rust dependency audit, formatting, locked Rust tests, desktop bundling, and Debian package validation.

These checks establish the machine baseline only. They do not satisfy #79 or #81 human acceptance.

## Candidate-control rule

Acceptance results are valid only when the tester records this exact commit or a formally superseding candidate record.

If a P0/P1 remediation changes `main`:

1. create a new candidate record rather than editing this commit identity;
2. record the remediation issues and merged commits;
3. confirm CI and applicable native validation on the new candidate;
4. identify which previous human acceptance results remain valid;
5. rerun every journey materially touched by the remediation;
6. run one complete smoke journey before closing #81.

Do not silently reuse an old result against changed code.

## Workspace control

Every human test must begin from a known workspace state.

The facilitator must record one of:

- a validated Viable backup used as the canonical acceptance seed;
- a documented clean-start procedure that produces the same initial records and state;
- an explicit empty-workspace scenario when emptiness is the behavior under test.

The starting state must be reset or restored before each participant. A tester must not inherit another participant's reviews, approvals, outcomes, learning entries, or failure state.

The seed must contain no credentials, private customer data, confidential external-organization material, or provider secrets.

## Build and environment control

Record the exact build/package source used in every result.

A browser or development-shell exercise may provide useful exploratory evidence but cannot be used to claim packaged-native acceptance where #79 requires native desktop behavior.

If the intended demo platform lacks a validated packaged candidate, record that as a precondition rather than substituting a different environment and claiming equivalence.

## Acceptance exit

This candidate has completed its purpose when either:

- #79 and #81 pass against it; or
- a reproducible P0/P1 finding requires a remediation candidate that supersedes it.

P2/P3 findings do not automatically invalidate the candidate. Their disposition must still be recorded.