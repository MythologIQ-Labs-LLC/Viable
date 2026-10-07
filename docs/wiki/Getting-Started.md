# Getting Started

Viable is currently a pre-release local-first application. The production PWA on the canonical localhost origin is the primary dogfood runtime; the native Tauri runtime exists for capabilities such as the operating-system credential vault and connected provider publishing. This page describes development and dogfood paths, not a supported public installer experience.

## Requirements

- Node.js 22 or newer
- npm
- Rust toolchain for native desktop validation
- Linux Tauri build dependencies when constructing the current Debian package

Webdog, Context.dev, ViMax, model-provider credentials, publishing credentials, and analytics credentials are not required to build or validate the current core application.

## Install dependencies

```bash
npm ci
```

## Run governed validation

```bash
npm run validate
```

The repository validation covers repository integrity, secret scanning, npm dependency audit, strict TypeScript checks, desktop checks, deterministic tests, and coverage enforcement. Native desktop CI additionally validates Rust formatting/tests, RustSec advisory status, Tauri packaging, and Debian package structure.

Useful commands:

```bash
npm run build
npm test
npm run desktop:web:check
npm run desktop:bundle
```

## Learn the application

The current user-guide set is authoritative for implemented workflows:

- [Product and ICP](https://github.com/MythologIQ-Labs-LLC/Viable/blob/main/docs/user/product-and-icp-workflow.md)
- [Signals Inbox](https://github.com/MythologIQ-Labs-LLC/Viable/blob/main/docs/user/signals-inbox.md)
- [Website Watch](https://github.com/MythologIQ-Labs-LLC/Viable/blob/main/docs/user/website-watch.md)
- [Campaigns and Studio](https://github.com/MythologIQ-Labs-LLC/Viable/blob/main/docs/user/campaigns-and-studio.md)
- [Repository Growth](https://github.com/MythologIQ-Labs-LLC/Viable/blob/main/docs/user/repository-growth.md)
- [Video Production](https://github.com/MythologIQ-Labs-LLC/Viable/blob/main/docs/user/video-production.md)
- [Calendar, Activation, Outcomes, and Learning](https://github.com/MythologIQ-Labs-LLC/Viable/blob/main/docs/user/calendar-activation-and-learning.md)
- [Support, recovery, and known limitations](https://github.com/MythologIQ-Labs-LLC/Viable/blob/main/docs/user/support-recovery-known-limitations.md)

## Important release boundary

A green build or working Debian bundle does not mean the product is ready for general distribution. Human accessibility/unfamiliar-user acceptance, supported-platform minimums, public-origin deployment provenance and rollback, interrupted-update handling, any adopted native installation lifecycle, live external-provider proof, and remaining operational release evidence stay separate from implementation completion.
