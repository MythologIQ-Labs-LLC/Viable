# Contributing to Viable

Thank you for considering a contribution to Viable.

Viable is a governed, local-first marketability operating system. Contributions are welcome when they strengthen the product without weakening its evidence, provenance, approval, privacy, security, or authority boundaries.

## Before contributing

Read the following first:

1. [`README.md`](README.md)
2. [`docs/product/PRD.md`](docs/product/PRD.md)
3. [`docs/adr/README.md`](docs/adr/README.md)
4. [`docs/architecture/viable-platform.md`](docs/architecture/viable-platform.md)
5. [`docs/status/current-state.md`](docs/status/current-state.md)
6. the relevant domain architecture and user guide for the area you are changing.

The documentation authority order is defined in [`docs/README.md`](docs/README.md). An issue or pull request may implement an accepted direction, but it may not silently redefine product authority.

## Contribution principles

### Preserve authority boundaries

Do not bypass or duplicate the established authority model:

- Product Core owns canonical product truth, claims, and ICP hypotheses.
- Signals and Market owns externally observed evidence and source health.
- Campaigns and Studio owns campaign intent and canonical/variant assets.
- Repository Growth owns repository assessment and launch-room state.
- Approval and External Action owns destinations, timing, destination-bound review, activation packages, and delivery evidence.
- Measurement and Learning owns baselines, metric evidence, retrospectives, attribution uncertainty, and learning entries.

If a change requires a new authority boundary, persistence model, approval model, credential model, public API, plugin authority, or release architecture, propose an ADR rather than smuggling the decision into implementation.

### Keep evidence honest

- Generated suggestions are not reviewed evidence.
- Missing, unavailable, delayed, partial, failed, and verified-zero are distinct states.
- A configured source is not proof that collection occurred.
- A scheduled action is not proof of export or delivery.
- Delivery is not proof of successful outcome.
- Attention is not proof of adoption, qualification, or revenue.

### Keep external action governed

Do not add autonomous publishing, outreach, account mutation, or other consequential external action that bypasses named human review and current authority checks.

### Protect secrets and private data

Never commit:

- API keys, OAuth tokens, cookies, session data, passwords, private keys, or webhooks;
- real customer or personal data;
- private prompts, reports, logs, screenshots, or operational exports;
- production account, tenant, workspace, channel, destination, or environment identifiers;
- proprietary third-party source or assets without a documented redistribution right.

Synthetic fixtures must be clearly non-operational.

## Source provenance and licensing

Viable-owned source and documentation are proposed for licensing under Apache License 2.0 through ADR-0008 and the public-readiness pull request.

Unless you explicitly state otherwise before submission, a contribution intentionally submitted for inclusion in Viable is offered under the repository's applicable license, consistent with Apache-2.0 Section 5.

By submitting a contribution, you represent that you have the right to license the material you submit. Identify copied, adapted, or generated material whose provenance or license is not obvious. Do not submit code, documentation, images, datasets, or other assets whose rights are uncertain.

Use of AI-assisted development does not change contributor responsibility for correctness, provenance, licensing, security, testing, or reviewability.

## Development setup

Requirements:

- Node.js 22 or newer;
- npm;
- Rust toolchain for native desktop validation when relevant;
- Linux Tauri dependencies when building the current Debian bundle.

Install dependencies:

```bash
npm ci
```

Run the governed repository validation:

```bash
npm run validate
```

The full validation includes repository viability checks, secret scanning, npm dependency audit, strict TypeScript checks, deterministic tests, and coverage enforcement.

Native or shared desktop changes may also require:

```bash
npm run desktop:check
npm run desktop:bundle
```

Do not manually edit generated lockfiles. Use the appropriate package manager and include the resulting lockfile change.

## Pull request expectations

Keep pull requests focused enough to review as one coherent change.

A strong pull request explains:

- the user or product problem;
- the governing issue, requirement, or ADR;
- the authority boundaries affected;
- what changed and what deliberately did not change;
- tests and validation performed;
- security, privacy, provenance, and license implications;
- failure and recovery behavior when relevant;
- documentation that was updated.

Do not claim production readiness from CI alone. A green workflow is evidence that a workflow passed. Humanity has repeatedly tried promoting that fact into a business outcome; Viable declines the tradition.

## Documentation changes

Material changes should update every authoritative document they affect. Depending on the scope, that can include:

- PRD;
- ADRs;
- domain architecture;
- current state;
- roadmap;
- integration assessment;
- user guidance;
- README;
- third-party notices;
- current maintainer handoff.

Historical handoff documents should not be rewritten merely to make history match the present.

## Issues and proposals

Use GitHub issues for reproducible bugs, scoped product gaps, documentation problems, and implementation proposals.

Before proposing a large feature, check the PRD, ADRs, roadmap, current state, and existing issues. Viable already has an unusually complete product model, and adding a second authority for the same concept is not innovation, merely paperwork with runtime consequences.

## Security issues

Do not report suspected vulnerabilities, exposed secrets, or sensitive security findings in a public issue. Follow [`SECURITY.md`](SECURITY.md).

## Support questions

See [`SUPPORT.md`](SUPPORT.md) for the current pre-release support posture.
