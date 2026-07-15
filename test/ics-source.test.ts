import assert from "node:assert/strict";
import test from "node:test";
import { IcsEventSource } from "../src/event-intelligence/adapters/ics-source.js";

const clock = () => new Date("2026-07-15T00:00:00.000Z");

test("ICS source returns success with provenance", async () => {
  const body = [
    "BEGIN:VCALENDAR",
    "BEGIN:VEVENT",
    "UID:event-1",
    "SUMMARY:Founder Forum",
    "DTSTART:20260801T120000Z",
    "LOCATION:Boston\\, MA",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
  const source = new IcsEventSource(
    "community-calendar",
    "https://example.test/events.ics",
    async () => new Response(body, { status: 200 }),
    clock,
  );

  const outcome = await source.collect();
  assert.equal(outcome.status, "success");
  assert.equal(outcome.events[0]?.title, "Founder Forum");
  assert.equal(outcome.events[0]?.location, "Boston, MA");
  assert.equal(outcome.events[0]?.provenance.sourceId, "community-calendar");
});

test("HTTP and transport failures remain explicit", async () => {
  const forbidden = new IcsEventSource("private", "https://example.test", async () => new Response("", { status: 403 }), clock);
  assert.equal((await forbidden.collect()).status, "forbidden");

  const broken = new IcsEventSource("broken", "https://example.test", async () => {
    throw new Error("network down");
  }, clock);
  assert.equal((await broken.collect()).status, "transport_failed");
});
