# Third-Party Notices

Viable-owned source code and documentation are licensed under the Apache License, Version 2.0 unless a file or notice states otherwise.

Third-party software, source material, compatibility targets, and dependencies retain their own copyright, license, attribution, trademark, and service terms. The Apache-2.0 license for Viable does not replace or expand those third-party rights.

This document records third-party source that Viable has deliberately reviewed, adapted, or targeted closely enough to require durable provenance and notice. Ordinary package dependencies remain subject to the licenses distributed by their respective projects and package ecosystems.

## Webdog

- Project: `context-dot-dev/webdog`
- Reviewed upstream revision: `13bf5e2cff9f7ee7ad62b7099f6c41575efc2c32`
- Package version reviewed: `0.1.0`
- Copyright: Copyright (c) 2026 Context.dev
- License: MIT
- Upstream source paths reviewed:
  - `src/lib/diff-preview.ts`
  - `src/lib/scraper.ts`
  - `src/lib/context-client.ts`
  - `src/lib/db/schema.ts`
  - `scripts/worker.ts`

Viable independently reimplements provider-neutral website-monitoring concepts informed by those files, including bounded line differences, SHA-256 snapshot identities, due-check calculation, source-failure classification, best-effort screenshot semantics, and fail-open generated relevance recommendations.

No Webdog branding, logos, screenshots, hosted-account model, authentication system, PostgreSQL schema, notification destinations, or deployment configuration are redistributed by Viable.

The Webdog MIT license is reproduced below because copied or substantially adapted portions may be introduced only with explicit source-level attribution and review.

```text
MIT License

Copyright (c) 2026 Context.dev

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES, OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

### Webdog service and content boundaries

The Webdog source license does not provide:

- Context.dev API access or service credits;
- rights to Context.dev or Webdog trademarks;
- rights to monitored third-party website content;
- authorization to bypass access controls, robots policies, provider terms, or applicable law.

Viable keeps Context.dev and Webdog service adapters optional and requires separate integration, privacy, security, cost, and provider-term review before live execution.

## ViMax

- Project: `HKUDS/ViMax`
- Compatibility target: `v1.1.0`
- Reviewed upstream revision: `1f8f650`
- Upstream release date recorded by Viable: 2026-06-08
- Copyright notice recorded by Viable: Copyright (c) 2025
- License: MIT

ViMax is an optional external production tool. Viable does not bundle or install ViMax. The implemented Stage 1 integration exports a provider-neutral video-production package plus a compatibility packet targeting the pinned ViMax Script2Video interface.

The compatibility packet may contain Viable-authored adapter code and a blank configuration template, but it does not redistribute the ViMax application or its Python dependency graph. Generated compatibility packages include an upstream notice so that any copied or substantially adapted ViMax material retains the required MIT notice.

ViMax execution, provider credentials, provider usage, and runtime support remain outside the current Viable application boundary.

See [`docs/integrations/vimax-video-generation.md`](docs/integrations/vimax-video-generation.md) for the exact compatibility and execution boundary.

## Dependency and binary-distribution boundary

The repository uses npm, Cargo, Tauri, TypeScript, and Rust ecosystem dependencies. Those dependencies retain their own licenses.

Public source visibility does not by itself certify that every future binary distribution has a complete transitive dependency notice bundle. Before Viable publishes supported installers or other redistributed binary artifacts, the release process must produce and review a transitive dependency-license inventory and include any notices required by the licenses actually present in that artifact.

That binary-distribution review is a release gate, not a reason to mislabel the source repository as proprietary.
