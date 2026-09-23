# ADR-0008: Public source licensing and release boundary

- Status: Proposed
- Date: 2026-09-23
- Supersedes: None
- Superseded by: None

## Context

Viable was created in a private repository under an interim proprietary source license. That license describes the source as confidential and limits use to private evaluation.

The intended repository posture has changed. MythologIQ Labs wants Viable to be shareable with individuals, small businesses, maintainers, founders, and product teams, including users who may modify the software for their own purposes. No current product strategy requires source exclusivity, a royalty model, or a copyleft obligation.

At the same time, Viable is not yet a supported end-user release. Human accessibility and unfamiliar-user acceptance remain incomplete, and release-foundation work still includes backup and restore, schema migration, product-wide retention and deletion, dependency hardening, installer signing, update and rollback behavior, supported-platform validation, privacy/security review, and operational support.

Repository visibility, source licensing, package publication, binary distribution, and supported product release are therefore separate decisions and must not be collapsed into one status.

Viable also contains deliberate integration work informed by third-party open-source projects. Those projects retain their own license and attribution requirements.

## Decision

Subject to final approval of the public-readiness pull request, Viable-owned source code and documentation will be licensed under the **Apache License, Version 2.0**.

MythologIQ Labs, LLC remains the Viable product and repository owner and the authority for product direction, release policy, branding, support commitments, and commercial offerings.

The following boundaries apply:

1. **Public repository visibility is not a product release.** The repository may be public while Viable remains pre-release and unsupported for production use.
2. **Apache-2.0 is the source license.** It permits use, modification, redistribution, and commercial use subject to its terms, including notice and attribution requirements.
3. **Patent and trademark rights remain explicit.** Apache-2.0 provides its defined contributor patent grant but does not grant permission to use MythologIQ Labs, Viable, or related trade names, product names, logos, or branding except for reasonable origin attribution.
4. **Third-party licenses remain independent.** `THIRD_PARTY_NOTICES.md` records deliberately reviewed source provenance and compatibility targets. Third-party dependencies remain under their respective licenses.
5. **npm publication remains disabled.** The root package remains `private: true` unless package publication is separately designed and approved. That npm safeguard does not change the source license.
6. **Binary distribution requires its own license inventory.** Supported installers or redistributed binary artifacts must include a reviewed transitive dependency-license inventory and required notices for the exact artifact.
7. **Contributions default to Apache-2.0.** Unless explicitly stated otherwise, contributions intentionally submitted for inclusion are accepted under the repository license, consistent with Apache-2.0 Section 5.
8. **Release gates remain authoritative.** Making the repository public does not waive or complete issue #36 or any human acceptance gate.

## Consequences

### Positive

- Viable can be shared, evaluated, modified, and adopted without one-off permission from MythologIQ Labs.
- Small businesses and other users may use Viable commercially without requiring a separate commercial license.
- Apache-2.0 provides an explicit contributor patent grant and a defined trademark boundary.
- MythologIQ Labs can still sell support, hosted services, packaged distributions, customization, or other commercial offerings.
- The repository can become public without making a false claim that Viable is a supported production product.
- MIT-licensed reviewed sources such as Webdog and ViMax remain compatible when their notice obligations are preserved.

### Negative

- Third parties may create and commercially use forks, including proprietary downstream products, as allowed by Apache-2.0.
- MythologIQ Labs cannot rely on source exclusivity as the business model for Apache-licensed versions.
- Public contributions create ongoing provenance and license-review responsibilities.
- Binary releases require a disciplined dependency-license inventory in addition to source-level licensing.

## Alternatives considered

### Retain proprietary source licensing

Rejected for the intended public-sharing posture. A public repository with a restrictive proprietary license would permit viewing while continuing to prohibit ordinary reuse, modification, and distribution. That conflicts with the intended use by individuals and small businesses and creates avoidable ambiguity around what "public" means.

### MIT License

Reasonable but not selected. MIT is simpler and highly permissive, but Apache-2.0 provides a clearer express patent grant and an explicit trademark section that better match a product-oriented repository owned by an LLC.

### Mozilla Public License 2.0

Not selected at this stage. MPL-2.0 would require modifications to MPL-covered files that are distributed to remain available under MPL-2.0. That reciprocal requirement may be useful later if product strategy changes, but it is not required by the current sharing goal.

### GPL or AGPL

Not selected. Strong copyleft, including AGPL network-use obligations, would materially narrow integration and commercialization choices without evidence that reciprocal source publication is a current product requirement.

### Dual licensing

Deferred. Dual licensing adds contributor-rights, commercial-policy, and operational complexity. There is no current evidence that Viable needs a separate proprietary/commercial license alongside Apache-2.0.

## Implementation implications

- replace the interim proprietary `LICENSE` with canonical Apache-2.0 terms;
- align `NOTICE.md`, `THIRD_PARTY_NOTICES.md`, README licensing language, package metadata, and provenance documentation;
- add public contribution, security, and support guidance;
- preserve `package.json` `private: true` until package publication is separately approved;
- retain release-foundation and human-acceptance gates;
- require dependency-license inventory before supported binary distribution;
- verify contributor/provenance authority before the visibility change;
- do not change repository visibility in the same mechanical step as merging licensing documentation unless the exact merged state has passed public-readiness review.

## Related requirements and documents

- `LICENSE`
- `NOTICE.md`
- `THIRD_PARTY_NOTICES.md`
- `docs/product/provenance-and-ownership.md`
- `docs/status/current-state.md`
- `docs/reviews/viability-sweep-2026-07-16.md`
- GitHub issue #36
- GitHub issue #57
