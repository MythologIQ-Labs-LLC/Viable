# Support diagnostics

Viable can export a small local support report from **Workspace → Runtime → Download support diagnostics**.

The report exists to answer environment questions without turning diagnostics into a second workspace export.

## What the report contains

`viable.support-diagnostics` version 1 contains only:

- the report creation timestamp;
- Viable build version, build ID, and source commit when the build exposes them;
- runtime kind (`browser` or `native`);
- authoritative storage engine and storage-persistence state;
- whether the offline shell is currently controlling the page;
- credential-vault availability as a state only, never a credential or reference;
- whether the native LinkedIn transport is present;
- each runtime capability ID and its current availability state;
- the browser/webview user-agent string.

The report does **not** include capability explanation text because those explanations can change with product copy while the support facts remain the same.

## What the report does not contain

The diagnostics export deliberately has no dependency on workspace storage, provider-connection storage, logs, prompts, or raw error objects.

It does not include:

- workspace IDs or product names;
- Product Core claims, evidence, ICPs, actions, or drafts;
- Campaign, Signals, Calendar/Learning, Repository Growth, Video Production, or Website Watch records;
- URLs collected from workspace data;
- provider account/member metadata;
- opaque credential references;
- access tokens, refresh tokens, passwords, client secrets, API keys, or private keys;
- prompts or model inputs/outputs;
- application logs;
- raw startup, storage, provider, or network failure text;
- backup, quarantine, or recovery-point contents.

Adding any of those fields requires an explicit product decision and new tests. They are not implicitly allowed because the file is called “diagnostics.”

## Local-only behavior

Downloading support diagnostics creates a JSON file on the device through the browser/desktop download mechanism. Viable does not upload or transmit the report.

Creating the file is not consent to share it. The person who downloaded it decides whether to inspect, keep, delete, or send it.

## Support use

When reporting a reproducible runtime problem, attach the support diagnostics file only when its environment facts are useful. Workspace backups and quarantine exports are separate artifacts with different data boundaries and should not be requested merely because a support report exists.
