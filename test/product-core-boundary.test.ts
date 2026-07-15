import assert from "node:assert/strict";
import test from "node:test";
import { rejectDownstreamIcpMutation } from "../src/product-core/boundaries.js";

test("Event Intelligence cannot mutate canonical ICP state", () => {
  assert.throws(() => rejectDownstreamIcpMutation("event_intelligence"), /may contribute evidence/);
});
