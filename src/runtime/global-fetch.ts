/**
 * The runtime's `fetch`, safe to store as an injectable dependency.
 *
 * Browsers (Window.fetch) and WebKit webviews reject a call whose receiver is
 * not the global object. A default parameter such as `fetcher = fetch` invoked
 * as `this.fetcher(url)` passes the adapter as the receiver and throws
 * "Illegal invocation" before any request is made. This wrapper calls `fetch`
 * as a plain function, and looks it up at call time.
 */
export function globalFetch(input: string, init?: RequestInit): Promise<Response> {
  return fetch(input, init);
}
