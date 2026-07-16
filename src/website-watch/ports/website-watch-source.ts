import type { WebsiteWatchSourceOutcome, WebsiteWatchSourceRegistration } from "../domain/website-watch.js";

export interface WebsiteWatchSource {
  readonly registration: WebsiteWatchSourceRegistration;
  collect(signal?: AbortSignal): Promise<WebsiteWatchSourceOutcome>;
}
