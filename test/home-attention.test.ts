import assert from "node:assert/strict";
import test from "node:test";
import type { ActivationLearningWorkspace } from "../src/activation-learning/domain/activation-learning.js";
import type { CampaignWorkspace } from "../src/campaigns/domain/campaign.js";
import type { ProductWorkspace } from "../src/product-core/domain/workspace.js";
import type { RepositoryGrowthWorkspace } from "../src/repository-growth/domain/repository-growth.js";
import type { SignalsInbox } from "../src/signals/domain/signal.js";
import { deriveHomeAttention } from "../src/ui/home-attention.js";
import type { VideoProductionWorkspace } from "../src/video-production/domain/video-production.js";

const now = new Date("2026-09-25T12:00:00.000Z");

function productWithOpenAction(): ProductWorkspace {
  return {
    id: "workspace-1",
    createdAt: "2026-09-20T12:00:00.000Z",
    createdBy: "Owner",
    product: { positioning: "Governed local-first marketability", revision: 2 } as ProductWorkspace["product"],
    claims: [],
    evidence: [],
    icpHypotheses: [
      { id: "icp-a", name: "A", status: "selected", reviewStatus: "reviewed", experiments: [], contradictions: [], owner: "Owner" },
      { id: "icp-b", name: "B", status: "candidate", reviewStatus: "reviewed", experiments: [], contradictions: [], owner: "Owner" },
    ] as unknown as ProductWorkspace["icpHypotheses"],
    assessments: [{ id: "assessment-1" }] as unknown as ProductWorkspace["assessments"],
    actions: [{ id: "product-action-1", source: "assessment_gap", sourceId: "finding-1", title: "Fix onboarding proof", owner: "Owner", kind: "action", status: "open", verification: "Verify clean first-run path" }],
  };
}

function signalsWithFailure(): SignalsInbox {
  return {
    workspaceId: "workspace-1",
    sources: [],
    sourceHealth: [],
    signals: [],
    conversions: [{
      id: "conversion-1", signalId: "signal-1", kind: "product_action", title: "Materialize reviewed signal", owner: "Owner",
      createdAt: "2026-09-25T08:00:00.000Z", status: "materialization_failed",
      materializationFailure: { attemptedAt: "2026-09-25T09:00:00.000Z", detail: "Destination authority rejected the write" },
    }],
    updatedAt: "2026-09-25T09:00:00.000Z",
  };
}

function campaignsWithReview(): CampaignWorkspace {
  return {
    workspaceId: "workspace-1",
    campaigns: [{
      id: "campaign-1", workspaceId: "workspace-1", title: "Launch", objective: "Learn", primaryOutcome: "Evidence", primaryAudience: "ICP",
      audienceKind: "test_audience", problem: "Problem", trigger: "Trigger", offer: "Offer", messageHierarchy: [], proof: [], claimReferences: [], evidenceIds: [],
      callToAction: "Try", channels: ["linkedin"], assetPlan: [], owner: "Reviewer", successMeasures: [], dependencies: [], version: 1,
      status: "in_review", createdAt: "2026-09-24T12:00:00.000Z", updatedAt: "2026-09-25T10:00:00.000Z",
    }],
    contentBriefs: [], assets: [], variants: [], exports: [], updatedAt: "2026-09-25T10:00:00.000Z",
  };
}

function repositoryWithPartialEvidence(): RepositoryGrowthWorkspace {
  return {
    workspaceId: "workspace-1",
    repositories: [{
      id: "repo-1", workspaceId: "workspace-1", fullName: "org/repo", owner: "org", name: "repo", url: "https://github.com/org/repo", visibility: "public",
      description: "Repo", topics: [], defaultBranch: "main", archived: false, fork: false, importedAt: "2026-09-25T07:00:00.000Z", importStatus: "partial",
      limitations: ["Contributor sample unavailable"], frontDoor: {} as never, community: {} as never, releases: {} as never, metrics: [],
    }],
    assessments: [], plans: [], launchRooms: [], exports: [], retrospectives: [], updatedAt: "2026-09-25T07:00:00.000Z",
  };
}

function activationWithScheduledAndLearning(): ActivationLearningWorkspace {
  return {
    workspaceId: "workspace-1",
    destinations: [],
    calendarEntries: [{
      id: "entry-1", workspaceId: "workspace-1", kind: "external_activation", title: "Manual LinkedIn post", owner: "Owner",
      startsAt: "2026-09-26T14:00:00.000Z", timezone: "America/New_York", notes: "Manual", scheduleStatus: "scheduled",
      activationStatus: "ready_for_manual_activation", createdAt: "2026-09-24T12:00:00.000Z", updatedAt: "2026-09-25T10:00:00.000Z",
    }],
    packages: [{
      id: "package-1", workspaceId: "workspace-1", calendarEntryId: "entry-1", destinationId: "destination-1", idempotencyKey: "key-1",
      createdAt: "2026-09-25T10:00:00.000Z", createdBy: "Owner", status: "manual_export_ready", credentialsIncluded: false, deliveryClaimed: false, manifest: "{}",
    }],
    exportOperations: [{
      id: "export-1", workspaceId: "workspace-1", packageId: "package-1", status: "ready_for_download", attempts: 0,
      createdAt: "2026-09-25T10:00:00.000Z", updatedAt: "2026-09-25T10:00:00.000Z",
    }],
    deliveryOutcomes: [], measurementPlans: [], performanceImports: [], retrospectives: [],
    learningLedger: [{
      id: "learning-1", workspaceId: "workspace-1", retrospectiveId: "retro-1", calendarEntryId: "entry-old", createdAt: "2026-09-24T18:00:00.000Z",
      createdBy: "Owner", evidence: ["metric-export.csv"], decision: "iterate", change: "Tighten CTA", outcome: "Qualified replies improved", followUp: "Run narrower test",
      reversibleNextAction: "Run narrower CTA test", attributionModel: "manual", attributionUncertainty: "Small sample",
    }],
    updatedAt: "2026-09-25T10:00:00.000Z",
  };
}

const emptyVideo: VideoProductionWorkspace = { workspaceId: "workspace-1", tools: [], briefs: [], packages: [], artifacts: [], variants: [], updatedAt: now.toISOString() };

test("cross-workflow attention orders explicit states without inventing a composite value score", () => {
  const snapshot = deriveHomeAttention({
    product: productWithOpenAction(),
    signals: signalsWithFailure(),
    campaigns: campaignsWithReview(),
    repositoryGrowth: repositoryWithPartialEvidence(),
    video: emptyVideo,
    activation: activationWithScheduledAndLearning(),
  }, now);

  const categories = snapshot.items.map((entry) => entry.category);
  assert.deepEqual(categories, ["recovery", "review", "blocked", "action", "scheduled", "learning"]);
  assert.equal(snapshot.items[0]?.target.surface, "signals");
  assert.equal(snapshot.items[0]?.target.recordId, "conversion-1");
  assert.equal(snapshot.items[1]?.target.recordId, "campaign-1");
  assert.equal(snapshot.items[2]?.target.recordId, "repo-1");
  assert.equal(snapshot.items[3]?.target.recordId, "product-action-1");
  assert.equal(snapshot.items[4]?.target.recordId, "entry-1");
  assert.equal(snapshot.items[5]?.target.recordId, "learning-1");
});

test("no available attention remains explicitly empty rather than fabricating work", () => {
  const snapshot = deriveHomeAttention({}, now);
  assert.deepEqual(snapshot.items, []);
  assert.equal(snapshot.partial, false);
  assert.deepEqual(snapshot.sourceFailures, []);
});

test("partial source failure preserves available recommendations and names the missing scope", () => {
  const snapshot = deriveHomeAttention({
    product: productWithOpenAction(),
    sourceFailures: [{ source: "signals", detail: "Signals local store could not be read" }],
  }, now);

  assert.equal(snapshot.partial, true);
  assert.equal(snapshot.sourceFailures.length, 1);
  assert.equal(snapshot.sourceFailures[0]?.source, "signals");
  assert.equal(snapshot.items.some((entry) => entry.target.recordId === "product-action-1"), true);
});

test("review, correction, and invalidation remain distinct from completion", () => {
  const campaigns = campaignsWithReview();
  const changed = {
    ...campaigns,
    campaigns: campaigns.campaigns.map((campaign) => ({ ...campaign, status: "changes_requested" as const, reviewNote: "Tighten the evidence packet" })),
    contentBriefs: [{
      id: "content-1", workspaceId: "workspace-1", campaignId: "campaign-1", title: "Brief", objective: "Learn", audience: "ICP", primaryOutcome: "Evidence",
      claimReferences: [], evidenceIds: [], pillars: [], themes: [], deliverables: [], sourceNotes: [], owner: "Owner", origin: "human" as const,
      status: "approval_invalidated" as const, createdAt: "2026-09-24T12:00:00.000Z", updatedAt: "2026-09-25T11:00:00.000Z",
    }],
  } satisfies CampaignWorkspace;

  const snapshot = deriveHomeAttention({ campaigns: changed }, now);
  assert.equal(snapshot.items.find((entry) => entry.target.recordId === "campaign-1")?.category, "review");
  assert.equal(snapshot.items.find((entry) => entry.target.recordId === "content-1")?.category, "blocked");
  assert.match(snapshot.items.find((entry) => entry.target.recordId === "campaign-1")?.reason ?? "", /requested changes/i);
  assert.match(snapshot.items.find((entry) => entry.target.recordId === "content-1")?.reason ?? "", /invalidated/i);
});
