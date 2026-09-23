from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    target = Path(path)
    text = target.read_text()
    if old not in text:
        raise SystemExit(f"Patch anchor not found in {path}: {old[:80]!r}")
    target.write_text(text.replace(old, new, 1))


# Product Core claim revision/rejection semantics.
service_path = "src/product-core/services/product-core-service.ts"
service_anchor = '''  async approveClaim(workspaceId: string, claimId: string, reviewer: string): Promise<ProductWorkspace> {'''
service_insert = '''  async reviseClaim(workspaceId: string, claimId: string, input: Readonly<{ statement: string; evidenceIds: readonly string[]; prohibitedContexts: readonly string[]; rationale?: string }>): Promise<ProductWorkspace> {
    if (!input.statement.trim()) throw new Error("Claim statement is required");
    const workspace = await this.required(workspaceId);
    const claim = workspace.claims.find((candidate) => candidate.id === claimId);
    if (!claim) throw new Error("Claim not found");
    return this.persist({
      ...workspace,
      claims: workspace.claims.map((candidate) => candidate.id === claimId ? {
        ...candidate,
        statement: input.statement,
        evidenceIds: input.evidenceIds,
        prohibitedContexts: input.prohibitedContexts,
        rationale: input.rationale,
        status: "proposed",
        revision: candidate.revision + 1,
        reviewedBy: undefined,
        reviewedAt: undefined,
      } : candidate),
    });
  }

  async rejectClaim(workspaceId: string, claimId: string, reviewer: string): Promise<ProductWorkspace> {
    if (!reviewer.trim()) throw new Error("A named claim reviewer is required");
    const workspace = await this.required(workspaceId);
    if (!workspace.claims.some((candidate) => candidate.id === claimId)) throw new Error("Claim not found");
    return this.persist({
      ...workspace,
      claims: workspace.claims.map((candidate) => candidate.id === claimId ? {
        ...candidate,
        status: "rejected",
        revision: candidate.revision + 1,
        reviewedBy: reviewer,
        reviewedAt: this.clock().toISOString(),
      } : candidate),
    });
  }

'''
replace_once(service_path, service_anchor, service_insert + service_anchor)

# Product desktop UI: canonical claims surface and ICP validation experiments.
app_path = "apps/desktop/ui/app.ts"
claim_section = '''function claimSection(value: ProductWorkspace): string {
  const reviewedEvidence = value.evidence.filter((item) => item.reviewStatus === "reviewed" && item.origin !== "generated_suggestion");
  const evidenceName = (id: string): string => value.evidence.find((item) => item.id === id)?.title ?? id;
  return `
    <section class="panel" aria-labelledby="claims-heading">
      <div class="section-heading"><div><p class="eyebrow">Step 3</p><h3 id="claims-heading">Review the claims ledger</h3></div>${statusPill(`${value.claims.length} claims`)}</div>
      <p class="guidance">Claims remain Product Core authority. Approval requires named human review and reviewed non-generated evidence. Editing any claim returns it to proposed review.</p>
      <details><summary>Create a product claim</summary><form data-form="add-claim">
        <label>Claim statement<textarea name="statement" required rows="3" placeholder="What may Viable truthfully claim?"></textarea></label>
        <label>Rationale<textarea name="rationale" rows="2" placeholder="Why is this claim useful and appropriately scoped?"></textarea></label>
        <label>Prohibited contexts, one per line<textarea name="prohibitedContexts" rows="2" placeholder="Contexts where this claim must not be used"></textarea></label>
        <fieldset><legend>Reviewed evidence</legend>
          ${reviewedEvidence.length ? reviewedEvidence.map((item) => `<label class="choice"><input type="checkbox" name="evidenceIds" value="${item.id}">${escapeHtml(item.title)}</label>`).join("") : `<div class="state warning"><strong>No reviewed evidence is available.</strong><span>You may draft a claim, but approval will remain blocked.</span></div>`}
        </fieldset>
        <button class="primary" type="submit">Add proposed claim</button>
      </form></details>
      <div class="cards">${value.claims.length ? value.claims.map((claim) => `<article class="record">
        <div class="record-top"><h4>${escapeHtml(claim.statement)}</h4>${statusPill(`${claim.status} · revision ${claim.revision}`, claim.status)}</div>
        <p>${escapeHtml(claim.rationale || "No rationale recorded")}</p>
        <small>Evidence: ${claim.evidenceIds.length ? claim.evidenceIds.map((id) => escapeHtml(evidenceName(id))).join(", ") : "None selected"}</small>
        <small>Prohibited contexts: ${escapeHtml(claim.prohibitedContexts.join(", ") || "None recorded")}</small>
        ${claim.reviewedBy ? `<small>Last reviewed by ${escapeHtml(claim.reviewedBy)}${claim.reviewedAt ? ` on ${humanDate(claim.reviewedAt)}` : ""}.</small>` : ""}
        <div class="actions">
          ${claim.status === "proposed" ? `<button type="button" data-action="approve-claim" data-id="${claim.id}">Approve claim</button><button type="button" data-action="reject-claim" data-id="${claim.id}">Reject claim</button>` : ""}
        </div>
        <details><summary>Edit claim</summary><form data-form="revise-claim">
          <input type="hidden" name="id" value="${claim.id}">
          <label>Claim statement<textarea name="statement" required rows="3">${escapeHtml(claim.statement)}</textarea></label>
          <label>Rationale<textarea name="rationale" rows="2">${escapeHtml(claim.rationale || "")}</textarea></label>
          <label>Prohibited contexts, one per line<textarea name="prohibitedContexts" rows="2">${escapeHtml(claim.prohibitedContexts.join("\n"))}</textarea></label>
          <fieldset><legend>Reviewed evidence</legend>${reviewedEvidence.length ? reviewedEvidence.map((item) => `<label class="choice"><input type="checkbox" name="evidenceIds" value="${item.id}" ${claim.evidenceIds.includes(item.id) ? "checked" : ""}>${escapeHtml(item.title)}</label>`).join("") : `<span>No reviewed evidence is available.</span>`}</fieldset>
          <button type="submit">Save revision and return to proposed review</button>
        </form></details>
      </article>`).join("") : `<div class="state empty"><strong>No product claims yet.</strong><span>Create claims only after recording the evidence that can support them.</span></div>`}</div>
    </section>`;
}

'''
replace_once(app_path, "function dimensionFields(): string {", claim_section + "function dimensionFields(): string {")
replace_once(app_path, '<p class="eyebrow">Step 3</p><h3 id="icp-heading">', '<p class="eyebrow">Step 4</p><h3 id="icp-heading">')
replace_once(app_path, '<p class="eyebrow">Step 4</p><h3 id="assessment-heading">', '<p class="eyebrow">Step 5</p><h3 id="assessment-heading">')

experiment_surface = '''function experimentSurface(item: IcpHypothesis): string {
  return `<div class="experiment-surface">
    <div class="record-top"><strong>Validation experiments</strong>${statusPill(`${item.experiments.length} experiments`)}</div>
    <p class="guidance">Define the hypothesis, observation window, explicit success and failure criteria, and the decision the evidence will drive.</p>
    <details><summary>Add validation experiment</summary><form data-form="add-experiment">
      <input type="hidden" name="hypothesisId" value="${item.id}">
      <label>Experiment hypothesis<textarea name="hypothesis" required rows="2"></textarea></label>
      <label>Method<textarea name="method" required rows="2" placeholder="Interview, landing-page test, outreach, observation, or another bounded method"></textarea></label>
      <div class="three"><label>Owner<input name="owner" required value="${escapeHtml(item.owner)}"></label><label>Starts on<input name="startsAt" type="date" required></label><label>Observation ends<input name="observationEndsAt" type="date" required></label></div>
      <div class="three"><label>Success criteria<textarea name="successCriteria" required rows="3"></textarea></label><label>Failure criteria<textarea name="failureCriteria" required rows="3"></textarea></label><label>Decision criteria<textarea name="decisionCriteria" required rows="3"></textarea></label></div>
      <button type="submit">Add planned experiment</button>
    </form></details>
    ${item.experiments.length ? `<div class="cards">${item.experiments.map((experiment) => `<article class="record"><div class="record-top"><strong>${escapeHtml(experiment.hypothesis)}</strong>${statusPill(experiment.status)}</div><p>${escapeHtml(experiment.method)}</p><small>${humanDate(experiment.startsAt)} through ${humanDate(experiment.observationEndsAt)} · Owner: ${escapeHtml(experiment.owner)}</small><dl><div><dt>Success</dt><dd>${escapeHtml(experiment.successCriteria.join(" · "))}</dd></div><div><dt>Failure</dt><dd>${escapeHtml(experiment.failureCriteria.join(" · "))}</dd></div><div><dt>Decision</dt><dd>${escapeHtml(experiment.decisionCriteria.join(" · "))}</dd></div></dl></article>`).join("")}</div>` : `<div class="state empty"><strong>No validation experiments yet.</strong><span>A next validation action becomes stronger when its outcome and decision criteria are explicit.</span></div>`}
  </div>`;
}

'''
replace_once(app_path, "function icpCard(item: IcpHypothesis): string {", experiment_surface + "function icpCard(item: IcpHypothesis): string {")
replace_once(app_path, '''    ${item.contradictions.length ? `<div class="inline-warning"><strong>Contradictions:</strong> ${escapeHtml(item.contradictions.join(" · "))}</div>` : ""}''', '''    ${experimentSurface(item)}
    ${item.contradictions.length ? `<div class="inline-warning"><strong>Contradictions:</strong> ${escapeHtml(item.contradictions.join(" · "))}</div>` : ""}''')
replace_once(app_path, '''    ${recovery()}${productTruth(value)}${evidenceSection(value)}${icpSection(value)}${assessmentSection(value)}`;''', '''    ${recovery()}${productTruth(value)}${evidenceSection(value)}${claimSection(value)}${icpSection(value)}${assessmentSection(value)}`;''')

click_anchor = '''  if (action === "review-icp" || action === "reject-icp") {
    const reviewer = prompt("Named ICP reviewer");
    if (reviewer) void act(async () => { workspace = await service.reviewIcp(workspace!.id, id, reviewer, action === "review-icp"); }, "ICP review recorded");
  }
'''
click_replacement = '''  if (action === "review-icp" || action === "reject-icp") {
    const reviewer = prompt("Named ICP reviewer");
    if (reviewer) void act(async () => { workspace = await service.reviewIcp(workspace!.id, id, reviewer, action === "review-icp"); }, "ICP review recorded");
  }
  if (action === "approve-claim" || action === "reject-claim") {
    const reviewer = prompt("Named claim reviewer");
    if (reviewer) void act(async () => {
      workspace = action === "approve-claim"
        ? await service.approveClaim(workspace!.id, id, reviewer)
        : await service.rejectClaim(workspace!.id, id, reviewer);
    }, action === "approve-claim" ? "Claim approved" : "Claim rejected");
  }
'''
replace_once(app_path, click_anchor, click_replacement)

submit_evidence_anchor = '''  if (kind === "add-evidence") void act(async () => {
    const origin = String(form.get("origin")) as "observed";
    workspace = await service.addEvidence(workspace!.id, { title: String(form.get("title")), summary: String(form.get("summary")), origin, observedAt: new Date(String(form.get("observedAt"))).toISOString(), freshnessReviewAt: new Date(String(form.get("freshnessReviewAt"))).toISOString(), reviewStatus: "suggested", confidence: String(form.get("confidence")) as "medium" });
  }, "Evidence added for review");
'''
submit_claims = '''  if (kind === "add-evidence") void act(async () => {
    const origin = String(form.get("origin")) as "observed";
    workspace = await service.addEvidence(workspace!.id, { title: String(form.get("title")), summary: String(form.get("summary")), origin, observedAt: new Date(String(form.get("observedAt"))).toISOString(), freshnessReviewAt: new Date(String(form.get("freshnessReviewAt"))).toISOString(), reviewStatus: "suggested", confidence: String(form.get("confidence")) as "medium" });
  }, "Evidence added for review");
  if (kind === "add-claim") void act(async () => {
    workspace = await service.addClaim(workspace!.id, {
      statement: String(form.get("statement")),
      rationale: String(form.get("rationale")) || undefined,
      evidenceIds: form.getAll("evidenceIds").map(String),
      prohibitedContexts: lines(form.get("prohibitedContexts")),
    });
  }, "Proposed claim added");
  if (kind === "revise-claim") void act(async () => {
    workspace = await service.reviseClaim(workspace!.id, String(form.get("id")), {
      statement: String(form.get("statement")),
      rationale: String(form.get("rationale")) || undefined,
      evidenceIds: form.getAll("evidenceIds").map(String),
      prohibitedContexts: lines(form.get("prohibitedContexts")),
    });
  }, "Claim revision saved for review");
'''
replace_once(app_path, submit_evidence_anchor, submit_claims)

submit_icp_anchor = '''  if (kind === "select-icp") void act(async () => { workspace = await service.selectPrimaryIcp(workspace!.id, String(form.get("id")), String(form.get("reviewer")), String(form.get("rationale"))); }, "Primary ICP selected with revision history");
'''
submit_experiment = '''  if (kind === "add-experiment") void act(async () => {
    workspace = await service.addExperiment(workspace!.id, String(form.get("hypothesisId")), {
      id: crypto.randomUUID(),
      hypothesis: String(form.get("hypothesis")),
      method: String(form.get("method")),
      owner: String(form.get("owner")),
      startsAt: new Date(String(form.get("startsAt"))).toISOString(),
      observationEndsAt: new Date(String(form.get("observationEndsAt"))).toISOString(),
      successCriteria: lines(form.get("successCriteria")),
      failureCriteria: lines(form.get("failureCriteria")),
      decisionCriteria: lines(form.get("decisionCriteria")),
      status: "planned",
    });
  }, "ICP validation experiment added");
  if (kind === "select-icp") void act(async () => { workspace = await service.selectPrimaryIcp(workspace!.id, String(form.get("id")), String(form.get("reviewer")), String(form.get("rationale"))); }, "Primary ICP selected with revision history");
'''
replace_once(app_path, submit_icp_anchor, submit_experiment)

# Core tests: approved-claim edits invalidate approval; rejection records named review.
core_test_path = "test/product-core-service.test.ts"
core_test_append = '''

test("revising an approved claim invalidates approval and increments revision", async () => {
  const { service, store, workspace } = await fixture();
  await service.addEvidence(workspace.id, {
    title: "Founder interview", summary: "Claim verified", origin: "interview",
    observedAt: "2026-07-15T00:00:00Z", freshnessReviewAt: "2026-08-15T00:00:00Z",
    reviewStatus: "reviewed", reviewedBy: "Kevin R. Knapp", reviewedAt: "2026-07-15T00:00:00Z", confidence: "high",
  });
  const evidenceId = store.value!.evidence[0]!.id;
  await service.addClaim(workspace.id, { statement: "Original claim", evidenceIds: [evidenceId], prohibitedContexts: [] });
  const claimId = store.value!.claims[0]!.id;
  await service.approveClaim(workspace.id, claimId, "Kevin R. Knapp");
  const revised = await service.reviseClaim(workspace.id, claimId, { statement: "Revised claim", evidenceIds: [evidenceId], prohibitedContexts: ["Unverified provider claims"], rationale: "Scope changed" });
  assert.equal(revised.claims[0]?.status, "proposed");
  assert.equal(revised.claims[0]?.revision, 3);
  assert.equal(revised.claims[0]?.reviewedBy, undefined);
  assert.equal(revised.claims[0]?.statement, "Revised claim");
});

test("claim rejection requires and records a named reviewer", async () => {
  const { service, store, workspace } = await fixture();
  await service.addClaim(workspace.id, { statement: "Draft claim", evidenceIds: [], prohibitedContexts: [] });
  const claimId = store.value!.claims[0]!.id;
  await assert.rejects(() => service.rejectClaim(workspace.id, claimId, ""), /named claim reviewer/);
  const rejected = await service.rejectClaim(workspace.id, claimId, "Kevin R. Knapp");
  assert.equal(rejected.claims[0]?.status, "rejected");
  assert.equal(rejected.claims[0]?.reviewedBy, "Kevin R. Knapp");
  assert.equal(rejected.claims[0]?.revision, 2);
});
'''
Path(core_test_path).write_text(Path(core_test_path).read_text().rstrip() + core_test_append + "\n")

# Desktop contract tests prove the UI actually calls the existing Product Core authority.
desktop_test_path = "test/product-desktop-workflow.test.ts"
replace_once(desktop_test_path, '''  assert.match(app, /service\\.reviewEvidence/);
  assert.match(app, /service\\.addIcpHypothesis/);''', '''  assert.match(app, /service\\.reviewEvidence/);
  assert.match(app, /service\\.addClaim/);
  assert.match(app, /service\\.reviseClaim/);
  assert.match(app, /service\\.approveClaim/);
  assert.match(app, /service\\.rejectClaim/);
  assert.match(app, /service\\.addIcpHypothesis/);
  assert.match(app, /service\\.addExperiment/);''')
replace_once(desktop_test_path, '''    "Named selector",
  ])''', '''    "Named selector",
    "Review the claims ledger",
    "Approve claim",
    "Editing any claim returns it to proposed review",
    "Validation experiments",
    "Success criteria",
    "Failure criteria",
    "Decision criteria",
  ])''')

# User guide: make claims and validation experiments part of the primary journey, not documented omissions.
guide_path = "docs/user/product-and-icp-workflow.md"
replace_once(guide_path, '''4. Apply named human review to non-generated evidence. Generated suggestions remain visibly separate and cannot become reviewed observed evidence.
5. Create at least two plausible ICP hypotheses.
6. For each hypothesis, record users, economic buyers, champions, blockers, disqualifiers, anti-ICP conditions, assumptions, contradictions, next validation action, change conditions, and an explained assessment for every canonical ICP dimension.
7. Compare candidates dimension by dimension. Viable does not calculate an unexplained composite ICP score.
8. Apply named human review to a candidate.
9. Select a primary ICP only after it has reviewed non-generated evidence, disqualifiers, a next validation action, a named selector, and a rationale.
10. Record an explained marketability assessment across all thirteen readiness dimensions.
11. Convert a readiness gap into an owned action.
12. Return Home to review the next highest-value action, stale evidence, contradictions, and open work.''', '''4. Apply named human review to non-generated evidence. Generated suggestions remain visibly separate and cannot become reviewed observed evidence.
5. Create proposed product claims, link them to reviewed non-generated evidence, record prohibited contexts, and apply named human approval or rejection. Editing a reviewed claim creates a new proposed revision and invalidates the prior approval.
6. Create at least two plausible ICP hypotheses.
7. For each hypothesis, record users, economic buyers, champions, blockers, disqualifiers, anti-ICP conditions, assumptions, contradictions, next validation action, change conditions, and an explained assessment for every canonical ICP dimension.
8. Define validation experiments with an owner, method, observation window, explicit success criteria, failure criteria, and decision criteria.
9. Compare candidates dimension by dimension. Viable does not calculate an unexplained composite ICP score.
10. Apply named human review to a candidate.
11. Select a primary ICP only after it has reviewed non-generated evidence, disqualifiers, a next validation action, a named selector, and a rationale.
12. Record an explained marketability assessment across all thirteen readiness dimensions.
13. Convert a readiness gap into an owned action.
14. Return Home to review the next highest-value action, stale evidence, contradictions, and open work.''')
replace_once(guide_path, '''- Claims are enforced by Product Core but do not yet have a complete desktop editing surface.
- Validation experiments are supported by the domain service but do not yet have a complete desktop editing surface.
''', '''- Claim approval remains intentionally blocked when the selected evidence has not received named review or is generated material.
- Validation experiments are local planning records; connected experiment execution and automatic outcome collection are not implied.
''')

print("Issue #2 Product claims and experiments desktop patch applied.")
