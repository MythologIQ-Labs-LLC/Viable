## Outcome

Describe the user, product, maintenance, or governance outcome this change is intended to produce.

## Authority and scope

- Governing issue or requirement:
- ADR / PRD / domain authority affected:
- Bounded contexts affected:
- Explicit non-goals:

## What changed

- 

## Security, privacy, and provenance

- [ ] No credentials, tokens, cookies, private keys, customer-private data, or confidential operational material were added.
- [ ] New or changed third-party source/dependencies have compatible licensing and required attribution.
- [ ] External/provider content remains untrusted data and cannot silently direct tools or runtime behavior.
- [ ] New external action preserves destination identity, named approval, execution evidence, failure state, and recovery boundaries where applicable.
- [ ] This change does not silently redefine Product Core, evidence, approval, or other bounded-context authority.

Explain any checked-item exception or material security/provenance change:

## Validation

- [ ] Repository viability checks pass.
- [ ] Secret scanning passes.
- [ ] Applicable dependency audits pass.
- [ ] Type checks and deterministic tests pass.
- [ ] Native validation passes when desktop/Rust scope is affected.
- [ ] Documentation and Wiki source are synchronized when product behavior or governance changes materially.

Exact head / validation evidence:

## Release and compatibility impact

State whether this changes supported platforms, persistence/schema behavior, backup/restore expectations, installer/update behavior, provider contracts, public APIs, or release posture. If none, state `None`.

## Human acceptance

State any accessibility, unfamiliar-user, operational, or live-provider validation still required. Automated green checks must not be used to imply those gates are complete.
