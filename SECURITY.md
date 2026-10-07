# Security Policy

## Current support status

Viable is pre-release software. The repository contains substantial implemented and tested functionality, but no Viable version is currently declared a supported production release.

Security reports about the source on `main`, public-readiness work, or distributed test artifacts are still welcome. Pre-release status is not an excuse to collect vulnerabilities like decorative stamps.

## Reporting a vulnerability

**Do not open a public GitHub issue for a suspected vulnerability, exposed secret, credential, private-data leak, or other finding that could increase risk if disclosed immediately.**

Use GitHub's private vulnerability reporting for this repository when that feature is available. If private vulnerability reporting is not available, contact MythologIQ Labs, LLC through a verified official company communication channel and clearly identify the message as a Viable security report.

Do not include live credentials, customer data, or unnecessary personal information in the initial report.

## Triage and patch expectations

Viable does not currently promise a contractual response-time SLA. Reports are handled according to demonstrated impact and reachability rather than issue age or scanner score alone.

Once a report can be reproduced or otherwise validated:

1. **Immediate containment takes priority** when a live credential is exposed, active exploitation is observed, or the defect can directly expose or modify private local/provider data. Containment may mean revoking a credential, disabling a capability, withdrawing an affected test artifact, or publishing a temporary mitigation before a complete fix.
2. **Exploitable high-impact defects in distributed builds** should be fixed and revalidated before those builds are promoted further. If no safe patch is ready, the affected build should be marked unsupported or withdrawn rather than left available with a misleading support claim.
3. **Lower-impact or defense-in-depth defects** may be scheduled into normal maintenance when there is a documented workaround or no credible immediate exploitation path.
4. **Dependency advisories are evaluated for reachability and actual Viable use.** A version bump is not automatically a fix, and an advisory is not ignored merely because the vulnerable package is transitive.
5. **A patch is not complete until its relevant behavior is revalidated.** Changes should add the smallest useful regression coverage and pass the repository's exact-head checks. Native changes also require the applicable Rust/Tauri validation; browser-runtime changes require the applicable real-browser validation.
6. **Credential exposure requires rotation or revocation.** Removing a value from source or a later commit does not make a previously exposed credential trustworthy again.

For a future supported release, the **Supported versions** table below is the authority for which release lines receive patches. Viable will not silently imply support for an older line after it has been removed from that table.

Significant fixed vulnerabilities may receive a GitHub security advisory or release note after a patch or mitigation is available. Disclosure timing should be coordinated around user risk and patch availability rather than an arbitrary embargo date. This policy does not ask reporters to conceal a problem indefinitely or waive legitimate disclosure rights.

A useful report includes:

- affected commit, branch, version, or artifact;
- affected component or file;
- a concise description of the impact;
- reproduction steps or a minimal proof of concept;
- preconditions and required permissions;
- whether sensitive data, credentials, external systems, or user action are involved;
- any known mitigation or containment step.

## Disclosure expectations

Please allow maintainers a reasonable opportunity to validate and remediate a report before public disclosure when active exploitation or immediate user safety does not require faster coordination.

Because Viable has no supported production release or contractual security SLA yet, this document does not promise a fixed response or remediation time. The triage and patch expectations above define the current handling contract; supported release lines will be stated explicitly in the version table when they exist.

## Security boundaries

Viable's current security principles include:

- credentials must not enter repository files, evidence, exported packages, logs, screenshots, fixtures, or documentation;
- provider and imported content is untrusted data;
- missing or failed source access must not be converted into successful empty evidence;
- externally consequential actions require named human approval;
- public website visibility does not authorize access-control bypass, copied sessions, abusive crawling, or private-page access;
- future live adapters must define credential storage, request boundaries, timeout/cancellation, redirect and network safety, retention, and deletion behavior before execution;
- generated analysis remains separate from reviewed evidence and cannot silently mutate Product Core authority.

## Automated checks

The repository's governed validation path includes:

- repository viability and Markdown-link checks;
- current tracked-tree secret scanning;
- reachable Git-history secret scanning during public-readiness validation;
- npm high/critical dependency auditing;
- RustSec advisory scanning for the native Cargo dependency graph;
- third-party GitHub Actions pinned to exact commit revisions;
- validation checkouts with persisted GitHub credentials disabled;
- strict core and desktop TypeScript validation;
- deterministic tests and coverage enforcement;
- Rust formatting/tests and native package construction/inspection for affected desktop changes.

Matched secret values are not printed by the repository secret scanners.

These controls reduce risk but do not prove the absence of vulnerabilities. They also do not replace privacy review, dependency-license review, installer signing, update integrity, supported-platform validation, or hands-on security assessment.

## Dependency minimization

Dependency upgrades are not a substitute for dependency justification. Native dependencies and Tauri features that are not used by executable behavior should be removed through package-manager-generated lockfile updates and exact-head validation rather than kept current indefinitely simply because a bot can open a pull request.

Current native dependency-surface minimization is tracked separately under repository hygiene/release-foundation work.

## Supported versions

No production version is currently supported.

| Version | Supported |
|---|---|
| `main` / pre-release development | Security reports accepted; no production SLA |
| `0.1.0` metadata | Pre-release; not a supported production release |

This table will be replaced with explicit supported-version and patch-window policy before a supported end-user release.
