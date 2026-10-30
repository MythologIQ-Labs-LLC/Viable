import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("Signals action names distinguish cards without changing handler identity", async () => {
  const source = await readFile("apps/desktop/ui/signals-view.ts", "utf8");
  const cardStart = source.indexOf("private signalCard(");
  const cardEnd = source.indexOf("private requiredSignal(", cardStart);
  assert.ok(cardStart >= 0 && cardEnd > cardStart);
  const card = source.slice(cardStart, cardEnd);
  assert.match(card, /aria-label="Signal: \$\{escapeHtml\(signal\.title\)\}"/);
  for (const [action, name] of [
    ["save", "Save signal"],
    ["tag", "Tag signal"],
    ["assign", "Assign signal"],
    ["accept", "Accept signal with named review"],
    ["dismiss", "Dismiss signal"],
  ]) {
    assert.ok(card.includes('data-signal-action="' + action + '"'), action + " action preserved");
    assert.ok(card.includes('aria-label="' + name + ': \u0024{escapeHtml(signal.title)}"'), action + " card-specific accessible name");
  }
  for (const phrase of ["Connect evidence for signal", "Convert signal to proposed work", "Create proposed work from signal"]) {
    assert.ok(card.includes(phrase + ': \u0024{escapeHtml(signal.title)}'), phrase);
  }
  assert.match(card, /aria-label="Connect evidence for signal: \$\{escapeHtml\(signal\.title\)\}">Connect signal/);
  assert.match(card, /escapeHtml\(signal\.title\)/);
});
