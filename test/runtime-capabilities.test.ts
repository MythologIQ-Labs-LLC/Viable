import assert from "node:assert/strict";
import test from "node:test";
import { describeRuntimeCapabilities, type RuntimeObservation } from "../src/runtime/runtime-capabilities.js";

const browser: RuntimeObservation = {
  runtime: "browser",
  credentialVault: "runtime_unavailable",
  linkedInTransport: false,
  storagePersistence: "best_effort",
  offlineShell: true,
};

const native: RuntimeObservation = {
  runtime: "native",
  credentialVault: "available",
  linkedInTransport: true,
  storagePersistence: "unknown",
  offlineShell: false,
};

const state = (observation: RuntimeObservation) =>
  Object.fromEntries(describeRuntimeCapabilities(observation).map((item) => [item.id, item.state]));

test("browser runtime keeps full marketability parity and names real capability limits", () => {
  const caps = state(browser);
  for (const id of ["marketability_loop", "inventory_and_scheduling", "manual_activation", "portable_backup", "offline_use"]) {
    assert.equal(caps[id], "available", id);
  }
  assert.equal(caps.credential_vault, "unavailable");
  assert.equal(caps.connected_linkedin_publishing, "unavailable");
  assert.equal(caps.closed_app_publishing, "unavailable");
  assert.equal(caps.durable_local_storage, "limited");
});

test("every unavailable or limited capability explains the concrete reason", () => {
  for (const observation of [browser, native, { ...native, credentialVault: "inaccessible" as const }]) {
    for (const capability of describeRuntimeCapabilities(observation)) {
      assert.ok(capability.detail.length > 20, capability.id);
    }
  }
  const linkedIn = describeRuntimeCapabilities(browser).find((item) => item.id === "connected_linkedin_publishing")!;
  assert.match(linkedIn.detail, /desktop runtime/);
  assert.match(linkedIn.detail, /Manual activation remains available/);
});

test("native connected publishing requires both the LinkedIn transport and an available vault", () => {
  assert.equal(state(native).connected_linkedin_publishing, "available");
  assert.equal(state({ ...native, credentialVault: "inaccessible" }).connected_linkedin_publishing, "unavailable");
  assert.equal(state({ ...native, linkedInTransport: false }).connected_linkedin_publishing, "unavailable");
});

test("no runtime claims closed-app exact-time publishing", () => {
  assert.equal(state(browser).closed_app_publishing, "unavailable");
  assert.equal(state(native).closed_app_publishing, "unavailable");
});

test("browser storage durability reflects the persistence grant", () => {
  assert.equal(state({ ...browser, storagePersistence: "persisted" }).durable_local_storage, "available");
  assert.equal(state({ ...browser, storagePersistence: "unknown" }).durable_local_storage, "limited");
  assert.equal(state({ ...browser, offlineShell: false }).offline_use, "limited");
});
