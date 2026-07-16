import assert from "node:assert/strict";
import test from "node:test";
import { hashSnapshot, validatePublicHttpUrl } from "../src/website-watch/utilities/website-watch-utilities.js";

test("browser-safe SHA-256 matches canonical vectors", () => {
  assert.equal(hashSnapshot(""), "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
  assert.equal(hashSnapshot("abc"), "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  assert.equal(hashSnapshot("Viable website evidence"), "6db6931dfbf19cc0338eef7ab1afbb40bb767bb29d44db81cd005679074be0b0");
});

test("browser-safe literal address validation rejects private IPv6 and permits public IPv6", () => {
  assert.throws(() => validatePublicHttpUrl("http://[::1]/"), /private|loopback|reserved/);
  assert.throws(() => validatePublicHttpUrl("http://[fc00::1]/"), /private|loopback|reserved/);
  assert.throws(() => validatePublicHttpUrl("http://[fe80::1]/"), /private|link-local|reserved/);
  assert.equal(validatePublicHttpUrl("https://[2606:4700:4700::1111]/").protocol, "https:");
});
