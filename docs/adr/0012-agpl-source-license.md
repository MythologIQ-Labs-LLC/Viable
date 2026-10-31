# ADR-0012: AGPL-3.0 source license

- Status: Accepted
- Date: 2026-10-31
- Supersedes: ADR-0008, for the choice of source license only
- Superseded by: None

## Context

ADR-0008 licensed Viable-owned source code and documentation under the Apache License, Version 2.0. Apache-2.0 lets anyone build a closed, proprietary product or hosted service from Viable without sharing their changes.

Viable is designed to run as a self-hostable PWA, so the realistic route to an unshared fork is a hosted service rather than a redistributed binary. A copyleft license that applies to network use addresses that route; a permissive license does not.

On 2026-10-31 the owner stated that Viable has never been used or distributed. The repository history on that date shows a single human author, Kevin Knapp. The other commits are automated dependency-version updates (Dependabot, GitHub Actions) and AI-assisted work made in the owner's sessions. No outside contributions have been merged.

## Decision

Viable-owned source code and documentation are licensed under the **GNU Affero General Public License, version 3 only** (SPDX: `AGPL-3.0-only`).

1. **`LICENSE` holds the unmodified AGPL-3.0 text.** `package.json` and `apps/desktop/src-tauri/Cargo.toml` declare `AGPL-3.0-only`.
2. **Network use is covered.** Anyone who runs a modified Viable for users over a network must offer those users the corresponding source, as AGPL-3.0 section 13 requires.
3. **The copyright holder is not limited by its own license.** MythologIQ Labs may still offer Viable under other terms, such as a commercial license, hosting or support, as long as it holds the rights to every contribution it relicenses.
4. **Contributions are accepted under AGPL-3.0-only.** A contribution intentionally submitted for inclusion is offered under the repository license unless a separate written agreement says otherwise. Before outside contributions are merged, maintainers decide whether a contributor license agreement is needed to keep point 3 possible.
5. **Everything else in ADR-0008 stands.** That covers trademarks, third-party notices, `private: true` in `package.json`, the dependency-license inventory required before binary distribution, and the separation between public source and supported product release.

## Consequences

### Positive

- A company cannot ship a closed fork or a closed hosted service of Viable; modified versions offered to users must share their source.
- MythologIQ Labs keeps the option of commercial or dual licensing, because it is the sole copyright holder today.
- MIT- and Apache-2.0-licensed dependencies and reviewed sources (Webdog, ViMax) remain compatible with AGPL-3.0 when their notices are preserved.

### Negative

- Some organizations do not allow AGPL software, which may reduce adoption or contribution.
- Anyone, including MythologIQ Labs' partners, who hosts a modified Viable for others must publish the modified source.
- The AGPL has no Apache-style express trademark clause. Trademark limits are stated in `NOTICE.md` instead, and AGPL-3.0 section 7(e) allows declining trademark rights.
- Relicensing outside contributions later needs their authors' agreement or a contributor license agreement.

## Alternatives considered

### Keep Apache-2.0

Rejected by the owner. It permits closed forks and closed hosted services.

### GPL-3.0

Not selected. It does not require source to be offered to users of a network service, which is how Viable is most likely to be run by others.

### AGPL-3.0-or-later

Not selected. "Only" keeps the choice of any future license version with MythologIQ Labs. The license text is the same; only the version clause differs.

## Implementation requirements

- replace `LICENSE` with the AGPL-3.0 text;
- update the license fields in `package.json`, `package-lock.json` and `Cargo.toml`;
- update `NOTICE.md`, `THIRD_PARTY_NOTICES.md`, `README.md`, `CONTRIBUTING.md`, `SUPPORT.md`, `docs/README.md`, `docs/product/provenance-and-ownership.md` and the Licensing wiki page;
- mark ADR-0008 as superseded for the license choice.

## Related requirements and documents

- `LICENSE`
- `NOTICE.md`
- `THIRD_PARTY_NOTICES.md`
- ADR-0008: `docs/adr/0008-public-source-licensing-and-release-boundary.md`
- `docs/product/provenance-and-ownership.md`
