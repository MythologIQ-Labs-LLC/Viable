import assert from "node:assert/strict";
import test from "node:test";
import {
  assertNoCredentialLikeText,
  buildGuidedManualSignalPayload,
  parseEventIntelligenceImport,
  readableVttTranscript,
} from "../src/imports/guided-import.js";

function eventRun(): Record<string, unknown> {
  const event = {
    externalId: "event-1",
    title: "Annapolis small-business expo",
    description: "Local event with potential customer discovery value.",
    startsAt: "2026-10-10T14:00:00.000Z",
    endsAt: "2026-10-10T18:00:00.000Z",
    location: "Annapolis, MD",
    url: "https://events.example.test/expo",
    tags: ["local", "small-business"],
    provenance: {
      sourceId: "event-source-1",
      sourceUrl: "https://events.example.test/expo",
      retrievedAt: "2026-09-24T20:00:00.000Z",
    },
  };
  return {
    run: {
      runId: "run-1",
      startedAt: "2026-09-24T19:59:00.000Z",
      completedAt: "2026-09-24T20:00:00.000Z",
      status: "success",
      sources: [{ sourceId: "event-source-1", status: "success", events: [event], observedAt: "2026-09-24T20:00:00.000Z" }],
    },
    events: [{ event, score: 87, reasons: ["Good geographic fit", "Relevant audience"], profileVersion: "v1" }],
  };
}

test("guided manual evidence creates the adapter payload without requiring an identifier or raw JSON", () => {
  const payload = JSON.parse(buildGuidedManualSignalPayload({
    title: "Customer asked for easier demo reset",
    summary: "A customer interview identified repeatable demo reset as an adoption concern.",
    sourceUrl: "https://example.test/interview-note",
    observedAt: "2026-09-24T18:00:00-04:00",
    confidence: "high",
    tags: ["customer", "demo"],
  })) as { signals: readonly Record<string, unknown>[] };
  assert.equal(payload.signals.length, 1);
  assert.equal(payload.signals[0]?.kind, "manual");
  assert.equal(payload.signals[0]?.title, "Customer asked for easier demo reset");
  assert.equal(payload.signals[0]?.confidence, "high");
  assert.equal(payload.signals[0]?.externalId, undefined);
});

test("guided manual evidence rejects embedded credentials before adapter collection", () => {
  const fakeProviderKey = ["sk-", "abcdefghijklmnopqrstuv"].join("");
  assert.throws(() => buildGuidedManualSignalPayload({
    title: "Provider diagnostic",
    summary: `api_key=${fakeProviderKey} should never become evidence`,
    confidence: "low",
    tags: [],
  }), /credential or secret-like value/);
});

test("Event Intelligence file import validates and normalizes the expected transport shape", () => {
  const parsed = parseEventIntelligenceImport(JSON.stringify(eventRun()));
  assert.equal(parsed.run.runId, "run-1");
  assert.equal(parsed.run.status, "success");
  assert.equal(parsed.events.length, 1);
  assert.equal(parsed.events[0]?.event.externalId, "event-1");
  assert.equal(parsed.events[0]?.score, 87);
  assert.equal(parsed.events[0]?.event.provenance.sourceUrl, "https://events.example.test/expo");
});

test("Event Intelligence import rejects malformed provenance and credential-like payloads", () => {
  const malformed = eventRun();
  const events = malformed.events as Array<{ event: { provenance: { sourceUrl: string } } }>;
  events[0]!.event.provenance.sourceUrl = "file:///private/event.json";
  assert.throws(() => parseEventIntelligenceImport(JSON.stringify(malformed)), /provenance URL must use HTTP or HTTPS/);

  const secret = eventRun();
  const secretEvents = secret.events as Array<{ event: { description: string } }>;
  const fakeClassicToken = ["ghp_", "abcdefghijklmnopqrstuvwx"].join("");
  secretEvents[0]!.event.description = `access_token=${fakeClassicToken}`;
  assert.throws(() => parseEventIntelligenceImport(JSON.stringify(secret)), /credential or secret-like value/);
});

test("raw secret guard catches common provider credential shapes", () => {
  const fakeProviderKey = ["sk-", "abcdefghijklmnopqrstuvwxyz123456"].join("");
  assert.throws(() => assertNoCredentialLikeText("password=correct-horse-battery-staple", "Import"), /credential or secret-like value/);
  assert.throws(() => assertNoCredentialLikeText(fakeProviderKey, "Import"), /credential or secret-like value/);
});

test("WebVTT transcript extraction keeps readable caption text and drops cue mechanics", () => {
  const transcript = readableVttTranscript(`WEBVTT\n\n1\n00:00:00.000 --> 00:00:02.000\n<v Speaker>Hello <b>there</b>.\n\n2\n00:00:02.000 --> 00:00:04.000\nWelcome to Viable.\n`);
  assert.equal(transcript, "Hello there.\nWelcome to Viable.");
  assert.doesNotMatch(transcript, /-->/);
  assert.doesNotMatch(transcript, /WEBVTT/);
});
