import assert from "node:assert/strict";
import test from "node:test";
import { AcknowledgedPersistenceGate } from "../apps/desktop/ui/acknowledged-persistence-gate.js";

test("acknowledged persistence gate refuses overlapping user mutations", async () => {
  const gate = new AcknowledgedPersistenceGate();
  let release!: () => void;
  const blocked = new Promise<void>((resolve) => { release = resolve; });

  const first = gate.run(async () => {
    await blocked;
    return "saved";
  });
  assert.equal(gate.state, "pending");

  const second = await gate.run(async () => "should-not-run");
  assert.deepEqual(second, { accepted: false, state: "pending" });

  release();
  const firstResult = await first;
  assert.deepEqual(firstResult, { accepted: true, state: "saved", value: "saved" });
  assert.equal(gate.state, "saved");
});

test("failed persistence remains explicit and a later retry can be acknowledged", async () => {
  const gate = new AcknowledgedPersistenceGate();

  const failed = await gate.run(async () => {
    throw new Error("disk full");
  });
  assert.equal(failed.accepted, true);
  assert.equal(failed.state, "failed");
  assert.match(failed.error instanceof Error ? failed.error.message : "", /disk full/);
  assert.equal(gate.state, "failed");

  const retried = await gate.run(async () => "recovered");
  assert.deepEqual(retried, { accepted: true, state: "saved", value: "recovered" });
  assert.equal(gate.state, "saved");
});

test("idle reset is explicit and never clears a pending mutation", async () => {
  const gate = new AcknowledgedPersistenceGate();
  assert.equal(gate.reset(), true);
  let release!: () => void;
  const blocked = new Promise<void>((resolve) => { release = resolve; });
  const running = gate.run(async () => { await blocked; return "saved"; });
  assert.equal(gate.reset(), false);
  release();
  await running;
  assert.equal(gate.reset(), true);
  assert.equal(gate.state, "idle");
});
