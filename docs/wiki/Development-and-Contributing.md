# Development and Contributing

Viable accepts changes only when they preserve product authority and evidence boundaries, not merely because the code compiles.

## Before changing code

Read the authority relevant to the work:

- [PRD](https://github.com/MythologIQ-Labs-LLC/Viable/blob/main/docs/product/PRD.md)
- [ADR index](https://github.com/MythologIQ-Labs-LLC/Viable/blob/main/docs/adr/README.md)
- [Platform architecture](https://github.com/MythologIQ-Labs-LLC/Viable/blob/main/docs/architecture/viable-platform.md)
- [Current state](https://github.com/MythologIQ-Labs-LLC/Viable/blob/main/docs/status/current-state.md)
- the relevant domain architecture and user guide

## Validation

Run:

```bash
npm ci
npm run validate
```

Native desktop changes should also satisfy the repository's Desktop workflow, including Rust formatting/tests, RustSec advisory checks, package construction, and package inspection.

## Contribution rules

- preserve Product Core authority;
- keep generated suggestions distinct from reviewed evidence;
- represent unavailable/partial/failed states truthfully;
- do not add hidden publishing or mutation paths;
- do not introduce credentials or customer-private material;
- document new providers as adapters with explicit terms and failure semantics;
- update affected docs and Wiki source when product behavior materially changes.

See [CONTRIBUTING.md](https://github.com/MythologIQ-Labs-LLC/Viable/blob/main/CONTRIBUTING.md) for the full contribution contract.
