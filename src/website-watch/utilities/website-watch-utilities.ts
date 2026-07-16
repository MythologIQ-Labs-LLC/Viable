import { createHash } from "node:crypto";
import { isIP } from "node:net";

export type WebsiteWatchFailureStatus =
  | "unavailable"
  | "rate_limited"
  | "authentication_failed"
  | "validation_failed"
  | "transport_failed"
  | "offline"
  | "cancelled";

export type BoundedLineDiff = Readonly<{
  preview: string;
  totalAdded: number;
  totalRemoved: number;
  truncated: boolean;
}>;

const secretKeyPattern = /(?:^|[_-])(api[_-]?key|access[_-]?token|refresh[_-]?token|authorization|cookie|password|private[_-]?key|secret|session|webhook)(?:$|[_-])/i;
const secretValuePatterns = [
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
  /\bBearer\s+[A-Za-z0-9._~+/=-]{12,}/i,
  /\b(?:ghp|github_pat|sk)-[A-Za-z0-9_-]{16,}\b/i,
  /\b(?:api[_-]?key|access[_-]?token|refresh[_-]?token|password|secret)\s*[:=]\s*[^\s,;]{8,}/i,
];

export function hashSnapshot(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

export function boundedLineDiff(
  before: string,
  after: string,
  options: Readonly<{ maxComparedLines?: number; maxPreviewLines?: number; maxLineCharacters?: number }> = {},
): BoundedLineDiff {
  const maxComparedLines = Math.max(1, Math.min(options.maxComparedLines ?? 400, 1000));
  const maxPreviewLines = Math.max(1, Math.min(options.maxPreviewLines ?? 8, 40));
  const maxLineCharacters = Math.max(40, Math.min(options.maxLineCharacters ?? 180, 500));
  const beforeLines = before.replaceAll("\r\n", "\n").split("\n");
  const afterLines = after.replaceAll("\r\n", "\n").split("\n");
  const a = beforeLines.slice(0, maxComparedLines);
  const b = afterLines.slice(0, maxComparedLines);
  const table = Array.from({ length: a.length + 1 }, () => new Uint16Array(b.length + 1));

  for (let i = a.length - 1; i >= 0; i -= 1) {
    const row = table[i];
    const next = table[i + 1];
    if (!row || !next) continue;
    for (let j = b.length - 1; j >= 0; j -= 1) {
      row[j] = a[i] === b[j] ? (next[j + 1] ?? 0) + 1 : Math.max(next[j] ?? 0, row[j + 1] ?? 0);
    }
  }

  const added: string[] = [];
  const removed: string[] = [];
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      i += 1;
      j += 1;
      continue;
    }
    const row = table[i];
    const next = table[i + 1];
    if ((next?.[j] ?? 0) >= (row?.[j + 1] ?? 0)) {
      removed.push(a[i] ?? "");
      i += 1;
    } else {
      added.push(b[j] ?? "");
      j += 1;
    }
  }
  while (i < a.length) {
    removed.push(a[i] ?? "");
    i += 1;
  }
  while (j < b.length) {
    added.push(b[j] ?? "");
    j += 1;
  }

  const clipped = (line: string): string => line.length > maxLineCharacters
    ? `${line.slice(0, maxLineCharacters - 1)}…`
    : line;
  const previewLines = [
    ...removed.slice(0, maxPreviewLines).map((line) => `- ${clipped(line)}`),
    ...added.slice(0, maxPreviewLines).map((line) => `+ ${clipped(line)}`),
  ].slice(0, maxPreviewLines);
  const truncated = beforeLines.length > maxComparedLines
    || afterLines.length > maxComparedLines
    || added.length + removed.length > previewLines.length;

  return {
    preview: previewLines.join("\n"),
    totalAdded: added.length + Math.max(0, afterLines.length - maxComparedLines),
    totalRemoved: removed.length + Math.max(0, beforeLines.length - maxComparedLines),
    truncated,
  };
}

export function isTargetCheckDue(nextCheckDueAt: string | undefined, nowMs: number = Date.now()): boolean {
  if (!nextCheckDueAt) return true;
  const parsed = Date.parse(nextCheckDueAt);
  return Number.isNaN(parsed) || nowMs >= parsed;
}

export function computeNextCheckDueAfterSuccess(
  storedNextDueAt: string | undefined,
  checkIntervalMinutes: number,
  nowMs: number,
): string {
  if (!Number.isFinite(checkIntervalMinutes) || checkIntervalMinutes < 15 || checkIntervalMinutes > 43_200) {
    throw new Error("Website watch interval must be between 15 minutes and 30 days");
  }
  const intervalMs = checkIntervalMinutes * 60_000;
  const parsed = storedNextDueAt ? Date.parse(storedNextDueAt) : Number.NaN;
  let next = Number.isNaN(parsed) ? nowMs + intervalMs : parsed + intervalMs;
  while (next <= nowMs) next += intervalMs;
  return new Date(next).toISOString();
}

export function normalizeDomain(input: string): string {
  const value = input.trim().toLocaleLowerCase("en-US");
  const candidate = value.includes("://") ? value : `https://${value}`;
  const url = new URL(candidate);
  return url.hostname.replace(/\.$/, "");
}

export function validatePublicHttpUrl(input: string, label = "URL"): URL {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    throw new Error(`${label} must be a valid absolute URL`);
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error(`${label} must use HTTP or HTTPS`);
  }
  if (url.username || url.password) throw new Error(`${label} must not contain embedded credentials`);
  if (url.port && !/^\d{1,5}$/.test(url.port)) throw new Error(`${label} contains an invalid port`);
  const hostname = url.hostname.replace(/\.$/, "").toLocaleLowerCase("en-US");
  if (!hostname || hostname === "localhost" || hostname.endsWith(".localhost")) {
    throw new Error(`${label} must not target localhost`);
  }
  if (isBlockedAddress(hostname)) throw new Error(`${label} must not target loopback, private, link-local, or reserved addresses`);
  for (const key of url.searchParams.keys()) {
    if (secretKeyPattern.test(key)) throw new Error(`${label} must not contain credential-like query parameters`);
  }
  return url;
}

export function assertSameOrigin(url: string, expectedOrigin: string, label: string): URL {
  const parsed = validatePublicHttpUrl(url, label);
  if (parsed.origin !== expectedOrigin) throw new Error(`${label} must use the declared source-instance origin`);
  return parsed;
}

export function assertNoSecretMaterial(value: unknown, path = "payload"): void {
  if (typeof value === "string") {
    if (secretValuePatterns.some((pattern) => pattern.test(value))) throw new Error(`${path} contains secret-like material`);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertNoSecretMaterial(item, `${path}[${index}]`));
    return;
  }
  if (!value || typeof value !== "object") return;
  for (const [key, item] of Object.entries(value)) {
    if (secretKeyPattern.test(key)) throw new Error(`${path}.${key} is a prohibited credential-bearing field`);
    assertNoSecretMaterial(item, `${path}.${key}`);
  }
}

export function classifyProviderError(error: unknown, aborted = false, offline = false): WebsiteWatchFailureStatus {
  if (aborted) return "cancelled";
  if (offline) return "offline";
  const status = providerStatus(error);
  if (status === 401 || status === 403) return "authentication_failed";
  if (status === 429) return "rate_limited";
  if (status >= 400 && status < 500) return "validation_failed";
  if (status >= 500) return "unavailable";
  if (error instanceof TypeError) return "transport_failed";
  return "transport_failed";
}

function providerStatus(error: unknown): number {
  if (!error || typeof error !== "object") return 0;
  const value = error as { status?: unknown; statusCode?: unknown; code?: unknown };
  if (typeof value.status === "number") return value.status;
  if (typeof value.statusCode === "number") return value.statusCode;
  if (typeof value.code === "number") return value.code;
  return 0;
}

function isBlockedAddress(hostname: string): boolean {
  const ipVersion = isIP(hostname);
  if (ipVersion === 4) {
    const parts = hostname.split(".").map(Number);
    const a = parts[0] ?? -1;
    const b = parts[1] ?? -1;
    if (a === 0 || a === 10 || a === 127) return true;
    if (a === 100 && b >= 64 && b <= 127) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a >= 224) return true;
    return false;
  }
  if (ipVersion === 6) {
    const value = hostname.toLocaleLowerCase("en-US");
    return value === "::" || value === "::1" || value.startsWith("fc") || value.startsWith("fd") || value.startsWith("fe8") || value.startsWith("fe9") || value.startsWith("fea") || value.startsWith("feb");
  }
  return hostname === "metadata.google.internal" || hostname.endsWith(".internal");
}
