import type { EventCandidate, ScoredEvent } from "../domain/event.js";
import type { ScoringProfile, ScoringRule } from "../domain/profile.js";

const normalize = (value: string): string => value.trim().toLocaleLowerCase("en-US");

function fieldValue(event: EventCandidate, rule: ScoringRule): string {
  if (rule.field === "tags") return event.tags.join(" ");
  return event[rule.field] ?? "";
}

export function scoreEvent(event: EventCandidate, profile: ScoringProfile): ScoredEvent {
  const matched = profile.rules.filter((rule) =>
    normalize(fieldValue(event, rule)).includes(normalize(rule.includes)),
  );

  return {
    event,
    score: matched.reduce((total, rule) => total + rule.weight, 0),
    reasons: matched.map((rule) => rule.reason),
    profileVersion: `${profile.id}@${profile.version}`,
  };
}
