import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  createSupportDiagnosticReport,
  serializeSupportDiagnosticReport,
  SUPPORT_DIAGNOSTICS_FORMAT,
  SUPPORT_DIAGNOSTICS_VERSION,
  type SupportDiagnosticInput,
} from "../src/runtime/support-diagnostics.js";
import type { RuntimeObservation } from "../src/runtime/runtime-capabilities.js";

const observation: RuntimeObservation = {
  runtime: "native",
  credentialVault: "available",
  linkedInTransport: true,
  storagePersistence: "unknown",
  storageEngine: "indexeddb",
  offlineShell: false,
};

test("support diagnostics export only the bounded runtime facts", () => {
  const injected = {
    generatedAt: "2026-10-07T05:30:00.000Z",
    observation: {
      ...observation,
      accessToken: "must-not-export",
      workspaceId: "private-workspace",
    },
    build: {
      buildId: "build-123",
      version: "0.1.0",
      commit: "abcdef123456",
      workspaceName: "Private product",
    },
    userAgent: "Viable test browser/1.0",
    workspace: { id: "private-workspace", claims: ["private claim"] },
    rawError: "private local failure text",
    providerAccount: "private-member",
  } as unknown as SupportDiagnosticInput;

  const report = createSupportDiagnosticReport(injected);
  assert.equal(report.format, SUPPORT_DIAGNOSTICS_FORMAT);
  assert.equal(report.version, SUPPORT_DIAGNOSTICS_VERSION);
  assert.deepEqual(report.build, {
    buildId: "build-123",
    version: "0.1.0",
    commit: "abcdef123456",
  });
  assert.deepEqual(report.runtime, {
    kind: "native",
    storageEngine: "indexeddb",
    storagePersistence: "unknown",
    offlineShell: false,
    vaultStatus: "available",
    linkedInTransport: true,
  });
  for (const capability of report.capabilities) {
    assert.deepEqual(Object.keys(capability).sort(), ["id", "state"]);
  }

  const json = JSON.stringify(report);
  for (const forbidden of [
    "must-not-export",
    "private-workspace",
    "Private product",
    "private claim",
    "private local failure text",
    "private-member",
    "accessToken",
    "workspaceId",
    "workspaceName",
    "providerAccount",
    "rawError",
  ]) {
    assert.equal(json.includes(forbidden), false, forbidden);
  }
});

test("support diagnostics serialization is readable and rejects invalid timestamps", () => {
  const input: SupportDiagnosticInput = {
    generatedAt: "2026-10-07T05:30:00.000Z",
    observation,
    userAgent: "Viable test browser/1.0",
  };
  const serialized = serializeSupportDiagnosticReport(input);
  assert.match(serialized, /^\{\n  "format": "viable\.support-diagnostics"/);
  assert.match(serialized, /"userAgent": "Viable test browser\/1\.0"/);
  assert.throws(
    () => createSupportDiagnosticReport({ ...input, generatedAt: "not-a-date" }),
    /timestamp is invalid/,
  );
});

test("Workspace runtime surface explains and exposes the bounded support report", async () => {
  const shell = await readFile("apps/desktop/ui/runtime-capabilities-shell.ts", "utf8");
  assert.match(shell, /data-runtime-action="download-diagnostics"/);
  assert.match(shell, /serializeSupportDiagnosticReport/);
  assert.match(shell, /do not include workspace IDs or content, provider account metadata, tokens, logs, prompts, or raw failure text/);
  assert.doesNotMatch(shell, /workspaceStorage\.getItem/);
});
