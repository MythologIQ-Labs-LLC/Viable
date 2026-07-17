# Viable Automated Viability Sweep

## Document control

| Field | Value |
|---|---|
| Status | Automated pre-human viability review |
| Review date | 2026-07-16 |
| Scope | Repository integrity, deterministic behavior, desktop persistence, CI, dependency risk, security scanning, packaging, and documentation consistency |
| Human acceptance | Explicitly excluded from completion claims |
| Release conclusion | Internal implementation is materially hardened; external release readiness remains incomplete |

## Purpose

This sweep identifies everything that can be refined, tested, or validated without substituting automation for hands-on accessibility, unfamiliar-user completion, product judgment, or live-provider evidence.

The review follows Viable's normal evidence boundary:

- a passing compiler is not user acceptance;
- a generated package is not a supported public release;
- a configured adapter is not live-provider validation;
- an automated semantic check is not assistive-technology evidence;
- a local persistence shape check is not a cross-version migration guarantee.

## Automated findings remediated

### Clean and reproducible builds

Previous local builds compiled into existing `dist` and desktop generated-output directories. Deleted or renamed sources and tests could therefore leave stale JavaScript behind outside fresh CI checkouts.

Remediation:

- core compilation removes `dist` first;
- desktop web compilation removes `apps/desktop/web/generated` first;
- unknown clean targets fail explicitly;
- generated output remains ignored and is checked for accidental tracking.

### Native CI coverage

The native workflow previously did not run for shared `src/**` changes, root TypeScript configuration changes, or build-clean behavior, even though the desktop webview consumes shared source.

Remediation:

- pull requests and `main` pushes affecting shared source now trigger native validation;
- root `tsconfig.json` and the clean-build script are included in native workflow paths;
- the declared Rust minimum is tested at exactly `1.88.0` rather than a floating stable toolchain.

### Desktop persistence integrity

Desktop stores previously cast unchecked `JSON.parse` output directly into authoritative workspace types. Malformed, mismatched, or incomplete profile data could enter authority services or strand the application during startup.

Remediation:

- all seven desktop workspace stores use one shared persistence integrity boundary;
- workspace identity is validated;
- required collections, records, and timestamps are validated before use;
- malformed or incompatible saved values are preserved rather than silently overwritten or deleted;
- storage-read, quota, serialization, and incomplete-removal failures remain explicit;
- Product workspace active-identity metadata is guarded;
- a desktop bootstrap catches startup and unhandled asynchronous failures and renders a visible recovery state.

This is minimum structural validation. It is not a finalized schema-version or migration system.

### Secret scanning

The prior scanner read committed `HEAD` blobs instead of the checked-out working tree, so local modifications could avoid inspection. Its signature set was also narrow.

Remediation:

- tracked working-tree text files are scanned directly;
- deleted tracked files are handled;
- binary files and lockfiles are bounded explicitly;
- Slack, GitHub, AWS, Google, OpenAI, Anthropic, npm, GitLab, and private-key signatures are checked;
- matched secret values are never printed;
- positive and negative signature fixtures are tested without storing realistic credential values;
- failure diagnostics are retained as CI artifacts.

### Dependency and workflow supply chain

Remediation:

- npm dependencies fail CI on high or critical audit findings;
- npm, Cargo, and GitHub Actions receive bounded weekly Dependabot update proposals;
- GitHub Actions are pinned to full commit revisions already observed in successful runs;
- repository viability checks prevent reverting to mutable third-party action tags;
- checkout credentials are not persisted after validation checkout.

### Test coverage

Node's built-in coverage runner now executes every compiled deterministic test and measures reusable core source while excluding type-only ports.

Observed baseline during this sweep:

| Metric | Observed |
|---|---:|
| Lines | 88.69% |
| Branches | 62.44% |
| Functions | 89.81% |

Enforced floors:

| Metric | Required |
|---|---:|
| Lines | 85% |
| Branches | 55% |
| Functions | 85% |

The floors preserve regression detection without pretending uniform coverage quality across every domain. The coverage report remains visible so low-coverage services can receive targeted tests when changed.

### Repository consistency

The automated viability gate now checks:

- package, Tauri, and Cargo version alignment;
- Node and Rust runtime contracts;
- clean-build wiring;
- generated-output hygiene;
- native workflow trigger coverage;
- exact Rust minimum validation;
- pinned third-party Actions;
- Dependabot presence;
- Tauri Content Security Policy directives and absence of unsafe inline or eval permissions;
- shared integrity usage in every desktop workspace store;
- local Markdown link existence and repository-bound paths.

## Deterministic validation performed

The sweep validates:

- repository viability gate;
- working-tree secret scan;
- npm high-severity audit;
- strict core TypeScript;
- strict desktop TypeScript;
- complete deterministic Node test suite;
- coverage floors;
- malformed local JSON preservation;
- workspace identity and shape rejection;
- storage access and quota failures;
- serialization and incomplete deletion failures;
- Product workspace save, load, activation, and deletion;
- guarded desktop startup and unhandled rejection presentation;
- Rust formatting on Rust 1.88.0;
- Rust tests on Rust 1.88.0;
- clean Tauri bundle construction;
- Debian package inspection.

## Additional machine-observable findings

### Rust dependency surface

`apps/desktop/src-tauri/Cargo.toml` currently declares features and dependencies that are not exercised by the minimal Tauri shell, including autostart, Tokio, tray-icon support, and serialization dependencies.

This should be reviewed and minimized, but the change must regenerate and validate `Cargo.lock` through Cargo rather than manually editing the lockfile. It remains a separate dependency-hygiene task.

### Product-wide durable storage

Desktop browser-profile validation is stronger, but Viable still lacks:

- explicit schema versions;
- tested forward and backward migrations;
- atomic product-wide backup;
- restore validation;
- recovery-point guarantees;
- product-wide retention and deletion policy;
- corruption quarantine and user-controlled export of malformed raw records.

These remain release-foundation work, not reasons to weaken the new local checks.

### Release engineering

Automation still cannot claim:

- signed installers;
- trusted publisher identity;
- update-channel security;
- rollback behavior;
- Windows installer validation;
- macOS packaging or notarization;
- upgrade testing across released schema versions;
- operational support readiness.

### Live external systems

This sweep does not validate direct publishing, provider delivery evidence, connected analytics, Context.dev, a live Webdog service, actual ViMax execution, or provider credentials. Those require separately approved adapters, safe credential handling, and live test plans.

## Human-dependent gates preserved

The following remain human work:

- keyboard-only completion across primary journeys;
- screen-reader and assistive-technology review;
- text scaling and cognitive clarity evaluation;
- unfamiliar-founder or unfamiliar-maintainer completion without intervention;
- validation that evidence labels, blocked states, recovery language, and next actions are understandable;
- remediation driven by those findings;
- product-owner approval of launch ICP, packaging, pricing, and release posture.

## Conclusion

The automated implementation is more viable than before the sweep:

- stale builds are prevented;
- shared-core desktop changes receive native validation;
- minimum Rust compatibility is tested;
- dependency and workflow supply chains are monitored and pinned;
- secret scanning covers checked-out content;
- coverage regression has enforceable floors;
- corrupted local workspaces fail visibly without silent mutation;
- repository and documentation consistency are machine checked.

Viable is still not ready for public or commercial end-user release. The next work should prioritize human acceptance and the remaining release foundations rather than expanding product scope merely because automated CI is green.
