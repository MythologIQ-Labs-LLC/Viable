import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { NativeCredentialVaultClient } from "../apps/desktop/ui/native-credential-vault.js";

const read = (path: string): Promise<string> => readFile(path, "utf8");

test("credential vault client fails closed outside the Tauri desktop runtime", async () => {
  const client = new NativeCredentialVaultClient();
  const capability = await client.capability();
  assert.deepEqual(capability, { status: "runtime_unavailable", canStoreSecrets: false });
  await assert.rejects(
    () => client.has("viable://credential/linkedin/connection-1/access_token"),
    /unavailable outside the Viable desktop runtime/,
  );
});

test("frontend credential contract has no raw secret retrieval command", async () => {
  const [commands, client] = await Promise.all([
    read("apps/desktop/src-tauri/src/credential_commands.rs"),
    read("apps/desktop/ui/native-credential-vault.ts"),
  ]);

  for (const command of ["credential_capability", "credential_put", "credential_has", "credential_delete"]) {
    assert.match(commands, new RegExp(`fn ${command}\\b`));
  }
  assert.doesNotMatch(commands, /fn credential_get\b/);
  assert.doesNotMatch(client, /async get\s*\(/);
  assert.doesNotMatch(client, /console\.(?:log|debug|info|warn|error)/);
  assert.match(commands, /SecretValue::new\(secret\.into_bytes\(\)\)/);
  assert.match(commands, /credential_reference_invalid/);
});

test("native store diagnostics classify platform failures without provider detail", async () => {
  const [store, secretContract] = await Promise.all([
    read("apps/desktop/src-tauri/src/native_credential_store.rs"),
    read("apps/desktop/src-tauri/src/credential_store.rs"),
  ]);

  assert.match(store, /classified_failure\("platform_failure"\)/);
  assert.match(store, /classified_failure\("unknown_secure_store_error"\)/);
  assert.doesNotMatch(store, /format!\([^\n]*error/);
  assert.match(secretContract, /SecretValue\(\[REDACTED\]\)/);
  assert.match(secretContract, /self\.0\.fill\(0\)/);
});

test("desktop exposes credential capability status without weakening workspace persistence", async () => {
  const [config, html, statusShell, activationDomain] = await Promise.all([
    read("apps/desktop/src-tauri/tauri.conf.json"),
    read("apps/desktop/web/index.html"),
    read("apps/desktop/ui/credential-vault-status-shell.ts"),
    read("src/activation-learning/domain/activation-learning.ts"),
  ]);

  assert.match(config, /"withGlobalTauri"\s*:\s*true/);
  assert.match(html, /credential-vault-status-shell\.js/);
  assert.match(statusShell, /Viable will not fall back to plaintext credential storage/);
  assert.match(statusShell, /Live provider activation remains disabled/);
  assert.doesNotMatch(activationDomain, /clientSecret|accessToken|refreshToken|credentialSecret/);
});
