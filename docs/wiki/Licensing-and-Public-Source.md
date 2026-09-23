# Licensing and Public Source

Viable-owned source code and documentation are intended to be available under the Apache License, Version 2.0 once the public-readiness licensing decision is accepted and merged.

## What Apache-2.0 allows

Subject to the license terms, users may:

- use Viable privately or commercially;
- modify it;
- redistribute source or binaries;
- create derivative works.

Apache-2.0 also includes an express contributor patent grant.

## What it does not grant

The license does not grant general rights to MythologIQ Labs or Viable trademarks, logos, product branding, or trade names beyond reasonable origin attribution.

Third-party dependencies and reviewed source retain their own licenses and notice requirements. See [THIRD_PARTY_NOTICES.md](https://github.com/MythologIQ-Labs-LLC/Viable/blob/main/THIRD_PARTY_NOTICES.md).

## Public source is not product release

Repository visibility, source licensing, npm publication, binary distribution, and supported end-user release are separate decisions.

The root npm package intentionally remains `private: true` to prevent accidental registry publication. That setting does not make Apache-licensed source proprietary.

Supported binary releases require their own transitive dependency-license inventory and release validation.

See [ADR-0008](https://github.com/MythologIQ-Labs-LLC/Viable/blob/main/docs/adr/0008-public-source-licensing-and-release-boundary.md) for the governing decision record.
