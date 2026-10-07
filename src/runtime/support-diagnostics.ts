import {
  describeRuntimeCapabilities,
  type CapabilityId,
  type CapabilityState,
  type RuntimeObservation,
} from "./runtime-capabilities.js";

export const SUPPORT_DIAGNOSTICS_FORMAT = "viable.support-diagnostics" as const;
export const SUPPORT_DIAGNOSTICS_VERSION = 1 as const;

export type SupportDiagnosticBuildInfo = Readonly<{
  buildId: string;
  version: string;
  commit: string;
}>;

export type SupportDiagnosticReport = Readonly<{
  format: typeof SUPPORT_DIAGNOSTICS_FORMAT;
  version: typeof SUPPORT_DIAGNOSTICS_VERSION;
  generatedAt: string;
  build?: SupportDiagnosticBuildInfo;
  runtime: Readonly<{
    kind: RuntimeObservation["runtime"];
    storageEngine: RuntimeObservation["storageEngine"];
    storagePersistence: RuntimeObservation["storagePersistence"];
    offlineShell: boolean;
    vaultStatus: RuntimeObservation["credentialVault"];
    linkedInTransport: boolean;
  }>;
  capabilities: readonly Readonly<{
    id: CapabilityId;
    state: CapabilityState;
  }>[];
  environment?: Readonly<{
    userAgent: string;
  }>;
}>;

export type SupportDiagnosticInput = Readonly<{
  generatedAt: string;
  observation: RuntimeObservation;
  build?: SupportDiagnosticBuildInfo;
  userAgent?: string;
}>;

/**
 * Builds a deliberately content-free support report.
 *
 * The function accepts runtime facts only. It has no workspace-storage,
 * provider-connection, log, prompt, or error-text dependency, so callers cannot
 * accidentally turn a support report into a workspace export.
 */
export function createSupportDiagnosticReport(input: SupportDiagnosticInput): SupportDiagnosticReport {
  if (!Number.isFinite(Date.parse(input.generatedAt))) throw new Error("Support diagnostic timestamp is invalid");

  const capabilities = describeRuntimeCapabilities(input.observation).map(({ id, state }) => ({ id, state }));
  return {
    format: SUPPORT_DIAGNOSTICS_FORMAT,
    version: SUPPORT_DIAGNOSTICS_VERSION,
    generatedAt: input.generatedAt,
    ...(input.build ? {
      build: {
        buildId: input.build.buildId,
        version: input.build.version,
        commit: input.build.commit,
      },
    } : {}),
    runtime: {
      kind: input.observation.runtime,
      storageEngine: input.observation.storageEngine,
      storagePersistence: input.observation.storagePersistence,
      offlineShell: input.observation.offlineShell,
      vaultStatus: input.observation.credentialVault,
      linkedInTransport: input.observation.linkedInTransport,
    },
    capabilities,
    ...(input.userAgent?.trim() ? { environment: { userAgent: input.userAgent } } : {}),
  };
}

export function serializeSupportDiagnosticReport(input: SupportDiagnosticInput): string {
  return JSON.stringify(createSupportDiagnosticReport(input), null, 2);
}
