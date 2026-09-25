# Guided evidence import and local media review

Viable keeps adapter transport formats available for interoperability, but ordinary users should not have to author JSON, invent correlation IDs, calculate byte sizes, or compute SHA-256 hashes to use the application.

This guide documents the UX-completion slice tracked by issue #75.

## Signals: ordinary guided imports

### Manual evidence

The ordinary manual-evidence form asks for human concepts:

- evidence title;
- what was learned;
- optional public source URL;
- optional observation time;
- confidence;
- optional tags.

Viable constructs the existing manual-adapter payload internally and submits it through the same Signals controller and source lifecycle as the advanced adapter path.

The resulting signal is still an **unreviewed evidence proposal**. Guided import does not review, approve, materialize, schedule, publish, deliver, or measure anything.

### Event Intelligence

For Event Intelligence, the ordinary path is a local JSON file picker rather than a raw textarea.

Before the run reaches Signals, Viable validates:

- bounded file size;
- JSON parseability;
- run identity, status, timestamps, and source outcomes;
- scored-event shape;
- event identity and timestamps;
- HTTP(S) provenance URLs without embedded credentials;
- credential/secret-like content;
- bounded event count.

The existing Event Intelligence adapter remains the source owner after validation. Its scores remain evidence requiring human review, not global authority.

### Webdog

Webdog's existing local-file import remains the ordinary path. Pasting raw Webdog JSON is visibly moved under an Advanced disclosure while retaining the existing size, origin, credential, and authorization checks.

## Advanced raw adapter imports

Raw JSON import remains available for operators and interoperable tools that already produce Viable's documented transport shapes.

It is intentionally labeled **Advanced**. It is not the expected first-use path.

Advanced status does not weaken safety. Manual JSON and Event Intelligence adapters reject secret-like content before it can become Signals evidence.

## Video: import files, not technical metadata

The ordinary Studio import asks the user for:

- the approved production package;
- the final MP4 or WebM render;
- a WebVTT caption file when the approved brief requires captions;
- named importer;
- production result;
- production tool and version;
- a human-readable production note.

Viable derives the technical transport fields that the existing video service requires:

- a bounded generic relative artifact path;
- MIME type;
- exact byte size;
- SHA-256 hash;
- run correlation ID;
- timestamped stage observations.

The user's original local filename is not written into durable artifact metadata. Media bytes are not written to `localStorage` or embedded in Video Production packages.

The existing guarded Video Production service still revalidates current Product Core and Campaign authority before accepting the import.

Failed/cancelled runs and hand-authored technical artifact metadata remain available under the Advanced import path for operators who actually possess those details.

## Why media bytes are session-only

Video artifacts need durable provenance, but browser-style local storage is not an appropriate video-asset repository.

Viable therefore persists the artifact's bounded path, MIME type, byte size, SHA-256 hash, package/brief relationship, tool provenance, stage history, importer, and review lifecycle. The selected media file itself remains a local review attachment for the current desktop session.

This distinction matters:

> durable artifact metadata says which file was reviewed; the local attachment supplies the bytes needed to inspect it now.

Viable never claims that persisted metadata contains the media.

## In-context media review

When an imported artifact is displayed in Studio, its review surface keeps the following together:

- video playback;
- caption track, when attached;
- readable transcript derived from attached WebVTT captions;
- production package and tool provenance;
- importer identity;
- durable MIME type, byte size, and SHA-256;
- caption requirement/status from the approved brief;
- the existing named review controls.

Before a local file is treated as review media, Viable recomputes its SHA-256 and confirms its byte size against the durable artifact record.

If the approved video brief requires captions, the VTT attachment must likewise match the durable caption record.

## Reopening the application

Media attachments are deliberately not persisted. After reopening Viable, the durable artifact and review state remain, but the reviewer must reattach the local render before approval.

Viable recomputes the file hash and enables artifact approval only when the selected render matches the durable final-render metadata. Required captions must also match.

This is preferable to either storing large binary files in browser storage or silently assuming that a same-named file is the same artifact.

## Approval boundary

A guided import does **not** approve a render.

The lifecycle remains:

1. import an unapproved artifact;
2. submit it for named review;
3. inspect a hash-matched local render and required captions in context;
4. approve, request changes, or reject with the existing named reviewer and review note;
5. only an approved artifact can feed the existing platform-variant workflow.

The ordinary UI disables **Approve** while the required local review attachment is missing or does not match durable metadata. Request Changes and Reject remain available because reviewers must still be able to reject an artifact whose bytes are missing, inaccessible, or wrong.

## Failure and recovery

Guided import validation failures are visible in the owning form. The problematic requirement is described without replacing the current form, so entered values and selected files remain available for repair.

Examples include:

- oversized or unsupported files;
- invalid Event Intelligence provenance;
- missing required captions;
- credential-like input;
- local media that does not match durable hash/size metadata;
- a production package or brief that no longer exists.

A failed guided validation does not create Signals or Video authority.

## Security and privacy boundary

Guided imports reject common credential/secret patterns. Video bytes and original local filenames remain outside durable workspace records. Provider credentials are never added to video packages by this workflow.

Viable cannot infer every category of sensitive content inside a user-selected video, caption, evidence statement, or public source. The user remains responsible for rights, consent, and appropriate content handling; existing rights/accessibility/approval safeguards remain authoritative.

## Boundaries unchanged

This slice does not add live crawling, provider execution, direct publishing, CRM behavior, or ViMax execution. It does not claim provider delivery or observed outcome. Draft, review, approval, schedule, export, delivery, provider verification, and outcome remain distinct states under their existing owners.
