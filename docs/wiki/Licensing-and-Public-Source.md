# Licensing and Public Source

Viable-owned source code and documentation are licensed under the GNU Affero General Public License, version 3 only (AGPL-3.0-only).

## What the AGPL allows

Subject to the license terms, users may:

- use Viable privately or commercially;
- modify it;
- redistribute source or binaries;
- create derivative works.

## What it requires

- Anyone who distributes Viable or a modified version must make the corresponding source available under the same license.
- Anyone who lets people use a modified Viable over a network, for example as a hosted service, must offer those users the corresponding source (AGPL-3.0 section 13).
- Copyright and license notices must be kept.

## What it does not grant

The license does not grant rights to MythologIQ Labs or Viable trademarks, logos, product branding, or trade names beyond reasonable origin attribution.

Third-party dependencies and reviewed source retain their own licenses and notice requirements. See [THIRD_PARTY_NOTICES.md](https://github.com/MythologIQ-Labs-LLC/Viable/blob/main/THIRD_PARTY_NOTICES.md).

## Public source is not product release

Repository visibility, source licensing, npm publication, binary distribution, and supported end-user release are separate decisions.

The root npm package intentionally remains `private: true` to prevent accidental registry publication. That setting does not change the source license.

Supported binary releases require their own transitive dependency-license inventory and release validation.

See [ADR-0012](https://github.com/MythologIQ-Labs-LLC/Viable/blob/main/docs/adr/0012-agpl-source-license.md) for the license decision and [ADR-0008](https://github.com/MythologIQ-Labs-LLC/Viable/blob/main/docs/adr/0008-public-source-licensing-and-release-boundary.md) for the release boundary.
