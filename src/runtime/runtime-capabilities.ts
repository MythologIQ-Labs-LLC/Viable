/**
 * Runtime capability authority (ADR-0010).
 *
 * The product contract is shared across runtimes. A capability differs only
 * when the runtime genuinely cannot provide it, and every difference carries
 * the concrete reason shown to the user. This module is pure and
 * runtime-neutral: adapters report observed facts, and this function decides
 * what is truthfully available.
 */

export type RuntimeKind = "browser" | "native";

export type CredentialVaultObservation =
  | "available"
  | "inaccessible"
  | "unsupported"
  | "platform_failure"
  | "runtime_unavailable";

export type StoragePersistence = "persisted" | "best_effort" | "unknown";

export type RuntimeObservation = Readonly<{
  runtime: RuntimeKind;
  credentialVault: CredentialVaultObservation;
  /** Native LinkedIn member transport is compiled into this runtime. */
  linkedInTransport: boolean;
  storagePersistence: StoragePersistence;
  /** Engine holding authoritative workspace data. */
  storageEngine: "indexeddb" | "localStorage" | "unavailable";
  offlineShell: boolean;
}>;

export type CapabilityId =
  | "marketability_loop"
  | "inventory_and_scheduling"
  | "manual_activation"
  | "portable_backup"
  | "offline_use"
  | "durable_local_storage"
  | "credential_vault"
  | "connected_linkedin_publishing"
  | "closed_app_publishing";

export type CapabilityState = "available" | "limited" | "unavailable";

export type RuntimeCapability = Readonly<{
  id: CapabilityId;
  label: string;
  state: CapabilityState;
  detail: string;
}>;

export function describeRuntimeCapabilities(observation: RuntimeObservation): readonly RuntimeCapability[] {
  const native = observation.runtime === "native";
  const vaultReady = observation.credentialVault === "available";
  return [
    {
      id: "marketability_loop",
      label: "Product truth, audience, signals, campaigns, content, approval, outcomes, and learning",
      state: "available",
      detail: "The full marketability loop runs on local data in every Viable runtime.",
    },
    {
      id: "inventory_and_scheduling",
      label: "Publication inventory, policy, and scheduling",
      state: "available",
      detail: "Approved stock, publication policy, and scheduler evaluation run while Viable is open.",
    },
    {
      id: "manual_activation",
      label: "Manual activation and exports",
      state: "available",
      detail: "Activation packages and exports download as files; delivery is recorded by a named person.",
    },
    {
      id: "portable_backup",
      label: "Portable workspace backup and restore",
      state: "available",
      detail: "The versioned backup file is the only way data moves between the browser and desktop runtimes.",
    },
    offlineCapability(observation),
    storageCapability(observation),
    {
      id: "credential_vault",
      label: "Operating-system credential vault",
      state: vaultReady ? "available" : "unavailable",
      detail: native
        ? vaultDetail(observation.credentialVault)
        : "Browsers have no operating-system keychain. Viable never stores provider secrets in browser storage.",
    },
    {
      id: "connected_linkedin_publishing",
      label: "Connected LinkedIn member publishing",
      state: native && observation.linkedInTransport && vaultReady ? "available" : "unavailable",
      detail: native
        ? observation.linkedInTransport
          ? vaultReady ? "Available once a LinkedIn destination is connected." : "Requires the credential vault to be available."
          : "Not included in this desktop build."
        : "Requires the Viable desktop runtime: LinkedIn blocks browser requests and needs credentials that browsers cannot hold safely. Manual activation remains available.",
    },
    {
      id: "closed_app_publishing",
      label: "Publishing while Viable is closed",
      state: "unavailable",
      detail: native
        ? "Not yet designed. Automation runs only when you start it while Viable is open."
        : "No browser standard runs a closed web app at an exact time. Automation runs only while Viable is open.",
    },
  ];
}

function offlineCapability(observation: RuntimeObservation): RuntimeCapability {
  if (observation.runtime === "native") {
    return { id: "offline_use", label: "Offline use", state: "available", detail: "The desktop app is installed locally. Public GitHub reads need a connection." };
  }
  return observation.offlineShell
    ? { id: "offline_use", label: "Offline use", state: "available", detail: "This build is cached for offline use. Public GitHub reads need a connection." }
    : { id: "offline_use", label: "Offline use", state: "limited", detail: "The offline copy is not active yet. Reload once while online to enable it." };
}

function storageCapability(observation: RuntimeObservation): RuntimeCapability {
  if (observation.storageEngine === "unavailable") {
    return { id: "durable_local_storage", label: "Durable local storage", state: "unavailable", detail: "Viable's saved data could not be opened in this session. Nothing was changed; close other Viable windows and reload." };
  }
  if (observation.storageEngine === "localStorage") {
    return { id: "durable_local_storage", label: "Durable local storage", state: "limited", detail: "IndexedDB is unavailable here, so Viable is using the browser's small fallback storage (about 5 MB). Keep regular backups." };
  }
  if (observation.runtime === "native") {
    return { id: "durable_local_storage", label: "Durable local storage", state: "available", detail: "Workspace data lives in the desktop app profile. Keep regular backups." };
  }
  switch (observation.storagePersistence) {
    case "persisted":
      return { id: "durable_local_storage", label: "Durable local storage", state: "available", detail: "The browser granted persistent storage, so it will not evict Viable data automatically. Keep regular backups." };
    case "best_effort":
      return { id: "durable_local_storage", label: "Durable local storage", state: "limited", detail: "The browser may clear Viable data under storage pressure or inactivity. Request persistent storage, install Viable, and keep regular backups." };
    case "unknown":
      return { id: "durable_local_storage", label: "Durable local storage", state: "limited", detail: "This browser does not report storage persistence. Keep regular backups." };
  }
}

function vaultDetail(vault: CredentialVaultObservation): string {
  switch (vault) {
    case "available": return "Provider secrets are stored only in the operating-system vault.";
    case "inaccessible": return "The operating-system vault is locked or inaccessible.";
    case "unsupported": return "This system has no supported credential vault; Viable will not fall back to plaintext.";
    case "platform_failure": return "The operating-system vault could not be initialized.";
    case "runtime_unavailable": return "The desktop credential bridge did not respond.";
  }
}
