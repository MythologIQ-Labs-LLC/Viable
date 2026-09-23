from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    target = Path(path)
    text = target.read_text()
    if old not in text:
        raise SystemExit(f"Patch anchor not found in {path}: {old[:100]!r}")
    target.write_text(text.replace(old, new, 1))

path = "apps/desktop/ui/signals-view.ts"
replace_once(path,
'''import type { ConversionKind, SignalRecord, SignalsInbox, SourceHealth } from "../../../src/signals/domain/signal.js";
import { SignalsInboxService } from "../../../src/signals/services/signals-inbox-service.js";''',
'''import type { ConversionKind, SignalConversion, SignalRecord, SignalsInbox, SourceHealth } from "../../../src/signals/domain/signal.js";
import { SignalsInboxService } from "../../../src/signals/services/signals-inbox-service.js";
import { isProductMaterializationKind, SignalWorkMaterializationService } from "../../../src/signals/services/signal-work-materialization-service.js";''')

replace_once(path,
'''  ["success", "success_change_detected", "accepted", "reviewed", "converted", "change_detected", "scheduled"].includes(status) ? "implemented"
    : ["partial", "rate_limited", "saved", "suggested", "verified_empty", "verified_no_change", "baseline", "offline", "cancelled"].includes(status) ? "warning"
      : ["transport_failed", "validation_failed", "authentication_failed", "unavailable", "forbidden", "unauthorized", "dismissed", "rejected", "disabled"].includes(status) ? "error"''',
'''  ["success", "success_change_detected", "accepted", "reviewed", "converted", "change_detected", "scheduled", "materialized"].includes(status) ? "implemented"
    : ["partial", "rate_limited", "saved", "suggested", "verified_empty", "verified_no_change", "baseline", "offline", "cancelled"].includes(status) ? "warning"
      : ["transport_failed", "validation_failed", "authentication_failed", "unavailable", "forbidden", "unauthorized", "dismissed", "rejected", "disabled", "materialization_failed"].includes(status) ? "error"''')

replace_once(path,
'''  private readonly signalsStore = new LocalStorageSignalsInboxStore();
  private readonly websiteStore = new LocalStorageWebsiteWatchStore();
  private readonly service = new SignalsInboxService(this.signalsStore);
  private readonly websiteService = new WebsiteWatchService(this.websiteStore);
  private readonly activationService = new ActivationLearningService(
    new LocalStorageActivationLearningStore(),
    new LocalStorageProductWorkspaceStore(),''',
'''  private readonly signalsStore = new LocalStorageSignalsInboxStore();
  private readonly websiteStore = new LocalStorageWebsiteWatchStore();
  private readonly productStore = new LocalStorageProductWorkspaceStore();
  private readonly service = new SignalsInboxService(this.signalsStore);
  private readonly materializationService = new SignalWorkMaterializationService(this.signalsStore, this.productStore);
  private readonly websiteService = new WebsiteWatchService(this.websiteStore);
  private readonly activationService = new ActivationLearningService(
    new LocalStorageActivationLearningStore(),
    this.productStore,''')

replace_once(path,
'''      if (action === "save") {
        this.inbox = await this.service.save(this.workspaceId, id);
        return "Signal saved";
      }''',
'''      if (action === "materialize-product") {
        const result = await this.materializationService.materializeProductCore(this.workspaceId, id);
        this.inbox = result.inbox;
        return "Signal work materialized into authoritative Product Core";
      }
      if (action === "save") {
        this.inbox = await this.service.save(this.workspaceId, id);
        return "Signal saved";
      }''')

replace_once(path,
'''      <section class="panel" aria-labelledby="work-heading"><div class="section-heading"><div><p class="eyebrow">Proposed work</p><h3 id="work-heading">Signal conversions</h3></div>${pill(`${inbox.conversions.length} proposals`)}</div>
        <div class="cards">${inbox.conversions.length ? inbox.conversions.map((item) => `<article class="record"><div class="record-top"><h4>${escapeHtml(item.title)}</h4>${pill(item.status)}</div><p>${escapeHtml(item.kind.replaceAll("_", " "))}</p><small>Owner: ${escapeHtml(item.owner)} · Created ${humanDate(item.createdAt)}</small></article>`).join("") : `<div class="state empty"><strong>No conversions yet.</strong><span>Only accepted reviewed signals can become proposed work.</span></div>`}</div>
      </section>`;''',
'''      <section class="panel" aria-labelledby="work-heading"><div class="section-heading"><div><p class="eyebrow">Proposed work</p><h3 id="work-heading">Signal conversions</h3></div>${pill(`${inbox.conversions.length} proposals`)}</div>
        <p class="guidance">Product actions, ICP validation actions, and product feedback can be materialized into Product Core now. Campaign, content, repository-growth, and Website Watch conversions remain proposed until their destination-specific authority inputs are supplied.</p>
        <div class="cards">${inbox.conversions.length ? inbox.conversions.map((item) => this.conversionCard(item)).join("") : `<div class="state empty"><strong>No conversions yet.</strong><span>Only accepted reviewed signals can become proposed work.</span></div>`}</div>
      </section>`;''')

helper = '''
  private conversionCard(item: SignalConversion): string {
    const productMaterialization = isProductMaterializationKind(item.kind);
    const destination = item.materialization;
    const failure = item.materializationFailure;
    return `<article class="record signal-conversion">
      <div class="record-top"><h4>${escapeHtml(item.title)}</h4>${pill(item.status)}</div>
      <p>${escapeHtml(item.kind.replaceAll("_", " "))}</p>
      <small>Owner: ${escapeHtml(item.owner)} · Created ${humanDate(item.createdAt)}</small>
      ${destination ? `<p><strong>Authoritative destination:</strong> ${escapeHtml(destination.context)} · <code>${escapeHtml(destination.recordId)}</code> · ${humanDate(destination.materializedAt)}</p>` : ""}
      ${failure ? `<div class="inline-warning"><strong>Materialization failed.</strong> ${escapeHtml(failure.detail)} · ${humanDate(failure.attemptedAt)}</div>` : ""}
      ${productMaterialization && item.status !== "materialized" ? `<button type="button" data-signal-action="materialize-product" data-id="${escapeHtml(item.id)}">${item.status === "materialization_failed" ? "Retry Product Core materialization" : "Materialize in Product Core"}</button>` : ""}
      ${!productMaterialization && item.status === "proposed" ? `<small>Destination-specific fields and authority checks are still required before this proposal can create an authoritative record.</small>` : ""}
    </article>`;
  }

'''
replace_once(path, '''  private websiteWatchSection(): string {''', helper + '''  private websiteWatchSection(): string {''')

# Contract tests prove the materialization controls and honest boundary are present.
test_path = "test/signal-desktop-workflow.test.ts"
replace_once(test_path,
'''    "Convert to proposed work",
    "Evidence before action",
    "does not calculate ICP truth",''',
'''    "Convert to proposed work",
    "Materialize in Product Core",
    "Authoritative destination",
    "Destination-specific fields and authority checks",
    "Evidence before action",
    "does not calculate ICP truth",''')
replace_once(test_path,
'''  ]) assert.match(view, new RegExp(marker));
});''',
'''  ]) assert.match(view, new RegExp(marker));
  assert.match(view, /SignalWorkMaterializationService/);
  assert.match(view, /materializeProductCore/);
});''')

print("Issue #5 Product Core materialization UI patch applied.")
