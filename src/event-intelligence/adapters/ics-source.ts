import type { EventCandidate } from "../domain/event.js";
import type { SourceOutcome } from "../domain/source-outcome.js";
import type { EventSource } from "../ports/event-source.js";

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

const unfold = (input: string): string[] =>
  input.replace(/\r\n/g, "\n").replace(/\n[ \t]/g, "").split("\n");

const decodeText = (value: string): string =>
  value.replace(/\\n/gi, "\n").replace(/\\,/g, ",").replace(/\\;/g, ";").replace(/\\\\/g, "\\");

function dateValue(value: string): string | undefined {
  if (/^\d{8}T\d{6}Z$/.test(value)) {
    return new Date(`${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}T${value.slice(9, 11)}:${value.slice(11, 13)}:${value.slice(13, 15)}Z`).toISOString();
  }
  if (/^\d{8}$/.test(value)) {
    return new Date(`${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}T00:00:00Z`).toISOString();
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.valueOf()) ? undefined : parsed.toISOString();
}

function parseEvents(input: string, sourceId: string, sourceUrl: string, retrievedAt: string): EventCandidate[] {
  const events: EventCandidate[] = [];
  let fields: Map<string, string> | undefined;

  for (const line of unfold(input)) {
    if (line === "BEGIN:VEVENT") {
      fields = new Map();
      continue;
    }
    if (line === "END:VEVENT" && fields) {
      const startsAt = dateValue(fields.get("DTSTART") ?? "");
      const title = fields.get("SUMMARY");
      if (startsAt && title) {
        const event: EventCandidate = {
          externalId: fields.get("UID") ?? `${sourceId}:${startsAt}:${title}`,
          title: decodeText(title),
          startsAt,
          tags: [],
          provenance: { sourceId, sourceUrl, retrievedAt },
          ...(fields.get("DTEND") && dateValue(fields.get("DTEND")!) ? { endsAt: dateValue(fields.get("DTEND")!)! } : {}),
          ...(fields.get("DESCRIPTION") ? { description: decodeText(fields.get("DESCRIPTION")!) } : {}),
          ...(fields.get("LOCATION") ? { location: decodeText(fields.get("LOCATION")!) } : {}),
          ...(fields.get("URL") ? { url: fields.get("URL")! } : {}),
        };
        events.push(event);
      }
      fields = undefined;
      continue;
    }
    if (!fields) continue;
    const separator = line.indexOf(":");
    if (separator < 0) continue;
    const key = line.slice(0, separator).split(";", 1)[0];
    if (key) fields.set(key, line.slice(separator + 1));
  }
  return events;
}

export class IcsEventSource implements EventSource {
  constructor(
    readonly id: string,
    private readonly url: string,
    private readonly fetcher: FetchLike = fetch,
    private readonly clock: () => Date = () => new Date(),
  ) {}

  async collect(signal?: AbortSignal): Promise<SourceOutcome> {
    const observedAt = this.clock().toISOString();
    try {
      const response = await this.fetcher(this.url, signal ? { signal } : undefined);
      if (response.status === 401) return { sourceId: this.id, status: "unauthorized", events: [], observedAt };
      if (response.status === 403) return { sourceId: this.id, status: "forbidden", events: [], observedAt };
      if (response.status === 429) return { sourceId: this.id, status: "rate_limited", events: [], observedAt };
      if (!response.ok) return { sourceId: this.id, status: "unavailable", events: [], observedAt, detail: `HTTP ${response.status}` };

      const events = parseEvents(await response.text(), this.id, this.url, observedAt);
      return { sourceId: this.id, status: events.length > 0 ? "success" : "verified_empty", events, observedAt };
    } catch (error) {
      if (signal?.aborted) return { sourceId: this.id, status: "cancelled", events: [], observedAt };
      return {
        sourceId: this.id,
        status: "transport_failed",
        events: [],
        observedAt,
        detail: error instanceof Error ? error.message : "Unknown transport failure",
      };
    }
  }
}
