# Security and Privacy

Viable is designed to avoid turning marketability tooling into a credential warehouse or customer-data dumping ground.

## Repository controls

The governed repository validation includes:

- current-tree secret scanning;
- reachable Git-history secret scanning for public-readiness work;
- npm high/critical dependency audit;
- RustSec advisory scanning for Cargo dependencies;
- commit-pinned third-party GitHub Actions;
- validation checkouts with persisted credentials disabled;
- deterministic tests and coverage floors.

## Data boundaries

Do not commit or import:

- credentials, tokens, passwords, cookies, or private keys;
- copied browser sessions;
- private customer datasets;
- confidential operational logs or fixtures;
- private repository contents without explicit approved provenance;
- destination secrets inside activation packages or evidence records.

## External content

Public visibility does not automatically grant permission to scrape, reproduce, republish, or bypass access controls. Source terms, copyright, robots policies, privacy obligations, and applicable law remain separate constraints.

## Vulnerability reporting

Follow [SECURITY.md](https://github.com/MythologIQ-Labs-LLC/Viable/blob/main/SECURITY.md). Do not open a public issue containing exploit details or sensitive vulnerability information before coordinated handling.

## Pre-release boundary

Current automated controls are not a claim that Viable has completed a production security review. Supported release still requires the explicit privacy/security and operational gates recorded in [current state](https://github.com/MythologIQ-Labs-LLC/Viable/blob/main/docs/status/current-state.md).
