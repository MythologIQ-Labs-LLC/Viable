# Security Policy

## Current support status

Viable is pre-release software. The repository contains substantial implemented and tested functionality, but no Viable version is currently declared a supported production release.

Security reports about the source on `main`, public-readiness work, or distributed test artifacts are still welcome. Pre-release status is not an excuse to collect vulnerabilities like decorative stamps.

## Reporting a vulnerability

**Do not open a public GitHub issue for a suspected vulnerability, exposed secret, credential, private-data leak, or other finding that could increase risk if disclosed immediately.**

Use GitHub's private vulnerability reporting for this repository when that feature is available. If private vulnerability reporting is not available, contact MythologIQ Labs, LLC through a verified official company communication channel and clearly identify the message as a Viable security report.

Do not include live credentials, customer data, or unnecessary personal information in the initial report.

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

Because Viable has no supported production release or security SLA yet, this document does not promise a fixed response or remediation time. A formal vulnerability-intake and patch-expectation policy remains part of release-foundation work.

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

The repository's validation path includes secret-pattern checks, working-tree secret scanning, dependency audit, strict TypeScript validation, deterministic tests, coverage enforcement, and repository viability checks.

These controls reduce risk but do not prove the absence of vulnerabilities. They also do not replace privacy review, dependency-license review, installer signing, update integrity, supported-platform validation, or hands-on security assessment.

## Supported versions

No production version is currently supported.

| Version | Supported |
|---|---|
| `main` / pre-release development | Security reports accepted; no production SLA |
| `0.1.0` metadata | Pre-release; not a supported production release |

This table will be replaced with explicit supported-version and patch-window policy before a supported end-user release.
