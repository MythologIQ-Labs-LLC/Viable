import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";
import { pathToFileURL } from "node:url";
import { LocalStorageActivationLearningStore } from "../apps/desktop/ui/local-storage-activation-learning-store.js";
import { LocalStorageCampaignWorkspaceStore } from "../apps/desktop/ui/local-storage-campaign-workspace-store.js";
import { CURRENT_WORKSPACE_SCHEMA_VERSION } from "../apps/desktop/ui/local-storage-json.js";
import { LocalStorageProductWorkspaceStore } from "../apps/desktop/ui/local-storage-product-workspace-store.js";
import { LocalStorageRepositoryGrowthStore } from "../apps/desktop/ui/local-storage-repository-growth-store.js";
import { LocalStorageSignalsInboxStore } from "../apps/desktop/ui/local-storage-signals-inbox-store.js";
import { LocalStorageVideoProductionStore } from "../apps/desktop/ui/local-storage-video-production-store.js";
import { LocalStorageWebsiteWatchStore } from "../apps/desktop/ui/local-storage-website-watch-store.js";
import { ManualJsonSignalSource } from "../src/signals/adapters/manual-json-signal-source.js";
import { SignalsInboxService } from "../src/signals/services/signals-inbox-service.js";
import { deriveHomeAttention } from "../src/ui/home-attention.js";
import {
  PRODUCT_ACTIVE_KEY,
  WORKSPACE_STORAGE_SCHEMA_VERSION,
  WorkspaceLifecycleService,
  type KeyValueStorage,
} from "../src/workspace-lifecycle/workspace-lifecycle-service.js";

// The generator lives in scripts/ and runs against compiled dist/ output, so
// it is imported at runtime from the repository root (tests run from there).
type SeedModule = Readonly<{
  SEED_FILE: string;
  MALFORMED_SIGNALS_FILE: string;
  SEED_WORKSPACE_ID: string;
  SEED_CREATED_AT: string;
  buildAcceptanceSeed(options?: { distDirectory?: string }): Promise<Readonly<{ backup: string; malformedSignalsImport: string; workspaceId: string }>>;
}>;

const root = process.cwd();
const loadGenerator = async (): Promise<SeedModule> => await import(pathToFileURL(resolve(root, "scripts/build-acceptance-seed.mjs")).href) as SeedModule;

class MemoryStorage implements KeyValueStorage, Storage {
  private readonly values = new Map<string, string>();
  get length(): number { return this.values.size; }
  clear(): void { this.values.clear(); }
  key(index: number): string | null { return [...this.values.keys()].sort()[index] ?? null; }
  getItem(key: string): string | null { return this.values.get(key) ?? null; }
  setItem(key: string, value: string): void { this.values.set(key, value); }
  removeItem(key: string): void { this.values.delete(key); }
}

function installLocalStorage(storage: Storage): () => void {
  const previous = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: storage });
  return () => {
    if (previous) Object.defineProperty(globalThis, "localStorage", previous);
    else Reflect.deleteProperty(globalThis, "localStorage");
  };
}

function fieldNames(value: unknown, names: Set<string> = new Set()): Set<string> {
  if (Array.isArray(value)) value.forEach((item) => fieldNames(item, names));
  else if (value && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) {
      names.add(key);
      fieldNames(child, names);
    }
  }
  return names;
}

test("committed acceptance seed is byte-identical to freshly generated output", async () => {
  const generator = await loadGenerator();
  const first = await generator.buildAcceptanceSeed();
  const second = await generator.buildAcceptanceSeed();
  assert.equal(first.backup, second.backup, "two generator runs must be byte-identical");
  assert.equal(await readFile(resolve(root, generator.SEED_FILE), "utf8"), first.backup, "regenerate with `npm run acceptance:seed`");
  assert.equal(await readFile(resolve(root, generator.MALFORMED_SIGNALS_FILE), "utf8"), first.malformedSignalsImport);
});

test("acceptance seed passes restore validation and restores into an empty profile with the expected inventory", async () => {
  const generator = await loadGenerator();
  const text = await readFile(resolve(root, generator.SEED_FILE), "utf8");
  const storage = new MemoryStorage();
  const lifecycle = new WorkspaceLifecycleService(storage, () => new Date("2026-10-06T00:00:00.000Z"));

  const preview = lifecycle.previewImport(text);
  assert.equal(preview.backup.workspaceId, generator.SEED_WORKSPACE_ID);
  assert.equal(preview.backup.createdAt, generator.SEED_CREATED_AT);
  assert.equal(preview.canRestoreIntoEmptyProfile, true);
  assert.equal(preview.conflict, undefined);

  const restored = lifecycle.restoreBackup(text, "empty_profile");
  assert.equal(storage.getItem(PRODUCT_ACTIVE_KEY), generator.SEED_WORKSPACE_ID);
  assert.equal(restored.hasCorruptData, false);
  const counts = Object.fromEntries(restored.contexts.map((context) => [context.name, `${context.status}:${context.recordCount}`]));
  assert.deepEqual(counts, {
    product: "present:9",
    campaign: "present:4",
    signals: "present:5",
    activation: "present:7",
    repositoryGrowth: "absent:0",
    videoProduction: "absent:0",
    websiteWatch: "absent:0",
  });
  assert.equal(restored.totalRecords, 25);
  assert.equal(WORKSPACE_STORAGE_SCHEMA_VERSION, CURRENT_WORKSPACE_SCHEMA_VERSION);

  // The restored profile loads through the real desktop store adapters.
  const restoreGlobal = installLocalStorage(storage);
  try {
    const id = generator.SEED_WORKSPACE_ID;
    const product = await new LocalStorageProductWorkspaceStore().load(id);
    const campaigns = await new LocalStorageCampaignWorkspaceStore().load(id);
    const signals = await new LocalStorageSignalsInboxStore().load(id);
    const activation = await new LocalStorageActivationLearningStore().load(id);
    assert.ok(product && signals && activation);
    assert.equal((await new LocalStorageRepositoryGrowthStore().load(id)).repositories.length, 0);
    assert.equal((await new LocalStorageVideoProductionStore().load(id)).briefs.length, 0);
    assert.equal(await new LocalStorageWebsiteWatchStore().load(id), undefined);

    // Product & audience
    assert.equal(product.product.identity.name, "Ledgerly");
    assert.ok(product.product.positioning.trim());
    assert.deepEqual(product.evidence.map((item) => item.reviewStatus), ["reviewed", "reviewed", "suggested", "reviewed"]);
    assert.deepEqual(product.claims.map((item) => item.status), ["approved", "proposed"]);
    assert.deepEqual(product.icpHypotheses.map((item) => [item.status, item.reviewStatus]), [["selected", "reviewed"], ["candidate", "suggested"]]);
    assert.equal(product.assessments.length, 0);
    assert.deepEqual(product.actions.map((item) => item.status), ["open"]);

    // Signals
    assert.deepEqual(signals.signals.map((item) => [item.status, item.evidenceState]), [["accepted", "reviewed"], ["new", "suggested"], ["new", "suggested"]]);
    assert.ok(signals.signals.every((item) => item.provenance.provider === "manual_import" && item.provenance.retrievedAt));
    assert.deepEqual(signals.sourceHealth.map((item) => item.status), ["success"]);

    // Campaign / Studio: approved brief and asset, one approved and one changes-requested variant, no export yet.
    assert.deepEqual(campaigns.campaigns.map((item) => [item.status, item.channels]), [["approved", ["linkedin", "website"]]]);
    assert.deepEqual(campaigns.assets.map((item) => item.status), ["approved"]);
    assert.deepEqual(campaigns.variants.map((item) => [item.channel, item.status]), [["linkedin", "approved"], ["website", "changes_requested"]]);
    assert.ok(campaigns.variants.every((item) => item.reviewedBy && item.reviewNote));
    assert.equal(campaigns.exports.length, 0);

    // Calendar / outcome / learning
    assert.equal(activation.destinations.length, 2);
    assert.deepEqual(activation.calendarEntries.map((item) => [item.kind, item.scheduleStatus, item.activationStatus]), [
      ["external_activation", "scheduled", "ready_for_manual_activation"],
      ["follow_up", "scheduled", "not_applicable"],
    ]);
    assert.deepEqual(activation.exportOperations.map((item) => item.status), ["downloaded"]);
    assert.equal(activation.deliveryOutcomes.length, 0);
    assert.deepEqual(activation.measurementPlans.flatMap((plan) => plan.baseline.map((metric) => [metric.state, metric.value])), [["observed", 6], ["verified_zero", 0], ["unavailable", undefined]]);
    assert.equal(activation.performanceImports.length + activation.retrospectives.length + activation.learningLedger.length, 0);

    // Home attention: more than one item, spanning current work and later follow-up.
    const attention = deriveHomeAttention({ product, signals, campaigns, activation }, new Date("2026-10-06T00:00:00.000Z"));
    assert.equal(attention.partial, false);
    assert.deepEqual(attention.items.map((item) => item.category), ["review", "review", "review", "blocked", "action", "action", "scheduled", "scheduled"]);
    assert.ok(attention.items.some((item) => item.title === "Correct and resubmit: website variant"));
    assert.ok(attention.items.some((item) => item.title === "Collect outcome evidence for a completed observation window"));
  } finally {
    restoreGlobal();
  }
});

test("acceptance seed contains no secret-like field names, credential patterns, or non-example URLs", async () => {
  const generator = await loadGenerator();
  const text = await readFile(resolve(root, generator.SEED_FILE), "utf8");
  const names = fieldNames(JSON.parse(text));
  const secretField = /(?:^|[_-])(password|secret|api[_-]?key|access[_-]?token|refresh[_-]?token|private[_-]?key|credential)(?:$|[_-])/i;
  assert.deepEqual([...names].filter((name) => secretField.test(name)), []);
  const { SECRET_PATTERNS } = await import(pathToFileURL(resolve(root, "scripts/secret-patterns.mjs")).href) as { SECRET_PATTERNS: readonly Readonly<{ name: string; pattern: RegExp }>[] };
  for (const { name, pattern } of SECRET_PATTERNS) assert.equal(pattern.test(text), false, `seed must not match ${name}`);
  assert.doesNotMatch(text, /bearer\s|-----BEGIN|@[a-z0-9-]+\.[a-z]{2,}/i);
  const hosts = new Set([...text.matchAll(/https?:\/\/([^/"\s\\]+)/g)].map((match) => match[1]));
  assert.deepEqual([...hosts].filter((host) => host !== "example.com" && host !== "example.test"), []);
});

test("deliberate malformed Signals fixture fails validation without creating signals", async () => {
  const generator = await loadGenerator();
  const text = await readFile(resolve(root, generator.MALFORMED_SIGNALS_FILE), "utf8");
  const storage = new MemoryStorage();
  const restoreGlobal = installLocalStorage(storage);
  try {
    const now = () => new Date("2026-10-06T00:00:00.000Z");
    const source = new ManualJsonSignalSource("manual:fixture", text, now().toISOString(), now);
    const inbox = await new SignalsInboxService(new LocalStorageSignalsInboxStore(), now, () => "signal-x").collect("fixture", [source]);
    assert.equal(inbox.signals.length, 0);
    assert.deepEqual(inbox.sourceHealth.map((item) => [item.status, item.detail]), [["validation_failed", "Signal 1 title is required"]]);
  } finally {
    restoreGlobal();
  }
});
