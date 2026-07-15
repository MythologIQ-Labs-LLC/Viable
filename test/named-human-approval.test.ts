import assert from "node:assert/strict";
import test from "node:test";
import { requireNamedHumanApproval } from "../src/approvals/named-human-approval.js";

test("externally consequential actions require scoped named approval", () => {
  assert.throws(() => requireNamedHumanApproval(undefined, "publish:campaign"), /Named human/);
  assert.throws(
    () => requireNamedHumanApproval({ approvedBy: "Kevin R. Knapp", approvedAt: "2026-07-15T00:00:00Z", scope: "publish:event" }, "publish:campaign"),
    /scope/,
  );
  assert.equal(
    requireNamedHumanApproval({ approvedBy: "Kevin R. Knapp", approvedAt: "2026-07-15T00:00:00Z", scope: "publish:campaign" }, "publish:campaign").approvedBy,
    "Kevin R. Knapp",
  );
});
