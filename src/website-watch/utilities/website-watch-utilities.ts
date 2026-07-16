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

const sha256Constants = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

export function hashSnapshot(value: string): string {
  const source = new TextEncoder().encode(value);
  const bitLength = source.length * 8;
  const paddedLength = Math.ceil((source.length + 9) / 64) * 64;
  const bytes = new Uint8Array(paddedLength);
  bytes.set(source);
  bytes[source.length] = 0x80;
  const view = new DataView(bytes.buffer);
  const high = Math.floor(bitLength / 0x1_0000_0000);
  const low = bitLength >>> 0;
  view.setUint32(paddedLength - 8, high, false);
  view.setUint32(paddedLength - 4, low, false);

  const state = new Uint32Array([
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  ]);
  const words = new Uint32Array(64);
  for (let offset = 0; offset < bytes.length; offset += 64) {
    for (let index = 0; index < 16; index += 1) words[index] = view.getUint32(offset + index * 4, false);
    for (let index = 16; index < 64; index += 1) {
      const a = words[index - 15] ?? 0;
      const b = words[index - 2] ?? 0;
      const s0 = rotateRight(a, 7) ^ rotateRight(a, 18) ^ (a >>> 3);
      const s1 = rotateRight(b, 17) ^ rotateRight(b, 19) ^ (b >>> 10);
      words[index] = ((words[index - 16] ?? 0) + s0 + (words[index - 7] ?? 0) + s1) >>> 0;
    }
    let a = state[0] ?? 0;
    let b = state[1] ?? 0;
    let c = state[2] ?? 0;
    let d = state[3] ?? 0;
    let e = state[4] ?? 0;
    let f = state[5] ?? 0;
    let g = state[6] ?? 0;
    let h = state[7] ?? 0;
    for (let index = 0; index < 64; index += 1) {
      const sigma1 = rotateRight(e, 6) ^ rotateRight(e, 11) ^ rotateRight(e, 25);
      const choice = (e & f) ^ (~e & g);
      const first = (h + sigma1 + choice + (sha256Constants[index] ?? 0) + (words[index] ?? 0)) >>> 0;
      const sigma0 = rotateRight(a, 2) ^ rotateRight(a, 13) ^ rotateRight(a, 22);
      const majority = (a & b) ^ (a & c) ^ (b & c);
      const second = (sigma0 + majority) >>> 0;
      h = g;
      g = f;
      f = e;
      e = (d + first) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (first + second) >>> 0;
    }
    state[0] = ((state[0] ?? 0) + a) >>> 0;
    state[1] = ((state[1] ?? 0) + b) >>> 0;
    state[2] = ((state[2] ?? 0) + c) >>> 0;
    state[3] = ((state[3] ?? 0) + d) >>> 0;
    state[4] = ((state[4] ?? 0) + e) >>> 0;
    state[5] = ((state[5] ?? 0) + f) >>> 0;
    state[6] = ((state[6] ?? 0) + g) >>> 0;
    state[7] = ((state[7] ?? 0) + h) >>> 0;
  }
  return [...state].map((word) => word.toString(16).padStart(8, "0")).join("");
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
  return stripIpv6Brackets(url.hostname.replace(/\.$/, ""));
}

export function validatePublicHttpUrl(input: string, label = "URL"): URL {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    throw new Error(`${label} must be a valid absolute URL`);
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error(`${label} must use HTTP or HTTPS`);
  if (url.username || url.password) throw new Error(`${label} must not contain embedded credentials`);
  if (url.port && !/^\d{1,5}$/.test(url.port)) throw new Error(`${label} contains an invalid port`);
  const hostname = stripIpv6Brackets(url.hostname.replace(/\.$/, "").toLocaleLowerCase("en-US"));
  if (!hostname || hostname === "localhost" || hostname.endsWith(".localhost")) throw new Error(`${label} must not target localhost`);
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

function rotateRight(value: number, shift: number): number {
  return (value >>> shift) | (value << (32 - shift));
}

function providerStatus(error: unknown): number {
  if (!error || typeof error !== "object") return 0;
  const value = error as { status?: unknown; statusCode?: unknown; code?: unknown };
  if (typeof value.status === "number") return value.status;
  if (typeof value.statusCode === "number") return value.statusCode;
  if (typeof value.code === "number") return value.code;
  return 0;
}

function stripIpv6Brackets(hostname: string): string {
  return hostname.startsWith("[") && hostname.endsWith("]") ? hostname.slice(1, -1) : hostname;
}

function isBlockedAddress(hostname: string): boolean {
  const ipv4 = parseIpv4(hostname);
  if (ipv4) return isBlockedIpv4(ipv4);
  const ipv6 = parseIpv6(hostname);
  if (ipv6) {
    const [first = 0, second = 0] = ipv6;
    if (ipv6.every((value) => value === 0)) return true;
    if (ipv6.slice(0, 7).every((value) => value === 0) && ipv6[7] === 1) return true;
    if ((first & 0xfe00) === 0xfc00) return true;
    if ((first & 0xffc0) === 0xfe80) return true;
    if ((first & 0xff00) === 0xff00) return true;
    if (first === 0x2001 && second === 0x0db8) return true;
    if (ipv6.slice(0, 5).every((value) => value === 0) && ipv6[5] === 0xffff) {
      return isBlockedIpv4([(ipv6[6] ?? 0) >>> 8, (ipv6[6] ?? 0) & 0xff, (ipv6[7] ?? 0) >>> 8, (ipv6[7] ?? 0) & 0xff]);
    }
    return false;
  }
  return hostname === "metadata.google.internal" || hostname.endsWith(".internal");
}

function parseIpv4(value: string): [number, number, number, number] | undefined {
  const parts = value.split(".");
  if (parts.length !== 4) return undefined;
  const numbers = parts.map((part) => /^\d{1,3}$/.test(part) ? Number(part) : Number.NaN);
  if (numbers.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return undefined;
  return [numbers[0] ?? 0, numbers[1] ?? 0, numbers[2] ?? 0, numbers[3] ?? 0];
}

function isBlockedIpv4(parts: readonly number[]): boolean {
  const a = parts[0] ?? -1;
  const b = parts[1] ?? -1;
  if (a === 0 || a === 10 || a === 127) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 0 && (parts[2] ?? -1) === 0) return true;
  if (a === 192 && b === 168) return true;
  if (a === 198 && (b === 18 || b === 19)) return true;
  if (a === 198 && b === 51 && (parts[2] ?? -1) === 100) return true;
  if (a === 203 && b === 0 && (parts[2] ?? -1) === 113) return true;
  if (a >= 224) return true;
  return false;
}

function parseIpv6(value: string): number[] | undefined {
  if (!value.includes(":")) return undefined;
  let normalized = value.toLocaleLowerCase("en-US");
  const embedded = normalized.match(/(?:^|:)(\d{1,3}(?:\.\d{1,3}){3})$/)?.[1];
  if (embedded) {
    const ipv4 = parseIpv4(embedded);
    if (!ipv4) return undefined;
    const replacement = `${((ipv4[0] << 8) | ipv4[1]).toString(16)}:${((ipv4[2] << 8) | ipv4[3]).toString(16)}`;
    normalized = normalized.slice(0, normalized.length - embedded.length) + replacement;
  }
  const halves = normalized.split("::");
  if (halves.length > 2) return undefined;
  const left = halves[0] ? halves[0].split(":") : [];
  const right = halves[1] ? halves[1].split(":") : [];
  if (halves.length === 1 && left.length !== 8) return undefined;
  const missing = 8 - left.length - right.length;
  if (missing < 0 || (halves.length === 2 && missing < 1)) return undefined;
  const strings = [...left, ...Array.from({ length: missing }, () => "0"), ...right];
  if (strings.length !== 8 || strings.some((part) => !/^[0-9a-f]{1,4}$/.test(part))) return undefined;
  return strings.map((part) => Number.parseInt(part, 16));
}
