import { WEBSITE_WATCH_SNAPSHOT_RETENTION_DAYS } from "../website-watch/domain/website-watch.js";

// Product-wide retention and deletion defaults (#36). This is the single
// stated policy: the Workspace screen renders it, workspace deletion derives
// what it keeps from it, and tests hold the code to it.
//
// The governing default: Viable never deletes or expires data on its own.
// Data stays until the person changes, replaces or deletes it. Dates such as a
// Website Watch retention deadline or a publication-inventory expiry only make
// something eligible or unavailable; removal is always a person's action.

export type WorkspaceDeletionEffect = "removed" | "kept" | "blocks_deletion" | "not_workspace_data";

export type RetentionRule = Readonly<{
  id: string;
  data: string;
  location: string;
  keptUntil: string;
  workspaceDeletion: WorkspaceDeletionEffect;
  /** Shown in the deletion scope when workspace deletion keeps this data. */
  keptLabel?: string;
}>;

const days = (value: number | null): string => (value === null ? "no deadline" : `${value} days`);
const snapshotDays = WEBSITE_WATCH_SNAPSHOT_RETENTION_DAYS;

export const AUTOMATIC_DELETION = false as const;

export const RETENTION_POLICY: readonly RetentionRule[] = [
  {
    id: "workspace-data",
    data: "Workspace data: Product Core, Campaigns, Signals, Calendar and Learning, Repository Growth, Video Production and Website Watch, including their histories, ledgers and approvals",
    location: "This browser profile or desktop app (IndexedDB)",
    keptUntil: "Until you change it in its workflow, replace it from a backup, or delete the workspace. Nothing expires automatically.",
    workspaceDeletion: "removed",
  },
  {
    id: "website-watch-snapshots",
    data: "Website Watch snapshot payloads and screenshot references",
    location: "Inside the workspace",
    keptUntil: `Eligible for pruning after the site's retention class: ephemeral ${days(snapshotDays.ephemeral)}, standard ${days(snapshotDays.standard)}, extended ${days(snapshotDays.extended)}. Removed only when a named person runs "Prune expired snapshots" or deletes a payload; the observation record stays.`,
    workspaceDeletion: "removed",
  },
  {
    id: "active-pointer",
    data: "Which workspace is active",
    location: "This browser profile or desktop app",
    keptUntil: "Until another workspace becomes active or this one is deleted.",
    workspaceDeletion: "removed",
  },
  {
    id: "legacy-copy",
    data: "Pre-IndexedDB copy of workspace data, left by the one-time storage upgrade as a recovery source",
    location: "This browser profile (localStorage)",
    keptUntil: "Until that workspace is deleted. Copies of workspaces deleted before deletion purged them remain until you clear this site's data in the browser.",
    workspaceDeletion: "removed",
  },
  {
    id: "migration-marker",
    data: "Record that the storage upgrade ran (time and record count only, no workspace content)",
    location: "This browser profile or desktop app (IndexedDB)",
    keptUntil: "For the life of the browser profile, so the upgrade never runs twice.",
    workspaceDeletion: "kept",
    keptLabel: "The storage-upgrade record (time and count only, no workspace content)",
  },
  {
    id: "exported-files",
    data: "Backups, recovery points and quarantine exports",
    location: "Files you downloaded, outside Viable",
    keptUntil: "Until you delete the files. Viable cannot see or remove them.",
    workspaceDeletion: "kept",
    keptLabel: "Backup, recovery-point and quarantine files you exported outside the app",
  },
  {
    id: "provider-connections",
    data: "Connected-provider metadata: destination authority, opaque credential reference, provider identity and connection status",
    location: "This browser profile or desktop app (IndexedDB); never contains the provider secret",
    keptUntil: "Until you disconnect the provider. Workspace replacement and deletion are blocked while this record exists.",
    workspaceDeletion: "blocks_deletion",
  },
  {
    id: "provider-credentials",
    data: "Provider credentials (desktop only)",
    location: "The operating system's credential vault, never workspace data, browser storage or backups",
    keptUntil: "Until you disconnect the provider or a superseded-credential cleanup completes. Workspace deletion does not directly operate on the credential vault.",
    workspaceDeletion: "kept",
    keptLabel: "Provider credentials in the operating system's credential vault (desktop only)",
  },
  {
    id: "app-shell-cache",
    data: "Viable's own code and assets for offline use (browser app only)",
    location: "This browser profile (service-worker cache)",
    keptUntil: "Until you confirm an update; the previous build's cache is then removed. Contains no workspace data.",
    workspaceDeletion: "not_workspace_data",
    keptLabel: "Viable application files and code",
  },
  {
    id: "draft-step-position",
    data: "Which step of a multi-step draft a tab was showing",
    location: "This browser tab (sessionStorage)",
    keptUntil: "Until the tab is closed. Contains no draft content.",
    workspaceDeletion: "not_workspace_data",
  },
  {
    id: "browser-eviction",
    data: "Everything Viable stores in a browser",
    location: "This browser profile",
    keptUntil: "The browser may clear site data under storage pressure unless it has granted persistent storage. Ask it to keep Viable data from the Workspace screen, and keep backups.",
    workspaceDeletion: "not_workspace_data",
  },
];

/** What workspace deletion leaves in place, for the deletion scope preview. */
export function retainedOutsideWorkspaceDeletion(): readonly string[] {
  return [
    ...RETENTION_POLICY.flatMap((rule) => (rule.keptLabel ? [rule.keptLabel] : [])),
    "Unrelated operating-system or browser preferences",
  ];
}
