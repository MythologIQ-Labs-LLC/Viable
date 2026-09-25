const main = document.querySelector<HTMLElement>("#main");
const live = document.querySelector<HTMLElement>("#live-region");

const escapeHtml = (value: unknown): string => String(value ?? "")
  .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;").replaceAll("'", "&#039;");

type ReviewOption = Readonly<{
  value: string;
  label: string;
  button: HTMLButtonElement;
  primary?: boolean;
}>;

type ReviewConfig = Readonly<{
  key: string;
  heading: string;
  reviewerLabel: string;
  noteLabel?: string;
  noteRequired: boolean;
  options: readonly ReviewOption[];
}>;

const panelReviews = new WeakMap<HTMLElement, ReviewConfig>();

function announce(message: string): void {
  if (live) live.textContent = message;
}

function reviewConfig(button: HTMLButtonElement): ReviewConfig | undefined {
  const card = owningCard(button);
  if (!card) return undefined;
  const id = button.dataset.id;
  if (!id) return undefined;

  const productAction = button.dataset.action;
  if (["review-evidence", "reject-evidence"].includes(productAction ?? "")) {
    return binaryConfig(card, "product-evidence", id, "Review evidence", "Named evidence reviewer", "review-evidence", "Accept evidence", "reject-evidence", "Reject evidence");
  }
  if (["review-icp", "reject-icp"].includes(productAction ?? "")) {
    return binaryConfig(card, "product-icp", id, "Review ICP hypothesis", "Named ICP reviewer", "review-icp", "Accept hypothesis", "reject-icp", "Reject hypothesis");
  }
  if (["approve-claim", "reject-claim"].includes(productAction ?? "")) {
    return binaryConfig(card, "product-claim", id, "Review Product claim", "Named claim reviewer", "approve-claim", "Approve claim", "reject-claim", "Reject claim");
  }

  const signalAction = button.dataset.signalAction;
  if (["accept", "dismiss"].includes(signalAction ?? "")) {
    return binaryConfig(card, "signal", id, "Review signal evidence", "Named signal reviewer", "accept", "Accept evidence", "dismiss", "Dismiss evidence", "signalAction");
  }

  const campaignAction = button.dataset.campaignAction;
  if (campaignAction === "approve-claim") {
    return {
      key: `campaign-claim:${id}`,
      heading: "Approve Product Core claim",
      reviewerLabel: "Named Product Core claim reviewer",
      noteRequired: false,
      options: [{ value: "approved", label: "Approve claim", button, primary: true }],
    };
  }
  if (["review-campaign", "review-asset", "review-variant"].includes(campaignAction ?? "")) {
    return threeWayConfig(card, `campaign-${campaignAction}`, id, campaignAction!, "Named reviewer", "Review note");
  }

  const videoAction = button.dataset.videoAction;
  if (["review-brief", "review-artifact", "review-variant"].includes(videoAction ?? "")) {
    const reviewerLabel = videoAction === "review-brief" ? "Named video brief reviewer" : videoAction === "review-artifact" ? "Named render reviewer" : "Named video variant reviewer";
    return threeWayConfig(card, `video-${videoAction}`, id, videoAction!, reviewerLabel, "Review note", "videoAction");
  }

  const activationAction = button.dataset.activationAction;
  if (activationAction === "review-entry") {
    return threeWayConfig(card, "calendar-review", id, activationAction, "Named external-action reviewer", "Review note covering source, destination, timing, rights, accessibility, and disclosures", "activationAction");
  }

  return undefined;
}

function binaryConfig(
  card: HTMLElement,
  keyPrefix: string,
  id: string,
  heading: string,
  reviewerLabel: string,
  acceptAction: string,
  acceptLabel: string,
  rejectAction: string,
  rejectLabel: string,
  datasetKey: "action" | "signalAction" = "action",
): ReviewConfig | undefined {
  const buttons = [...card.querySelectorAll<HTMLButtonElement>("button")];
  const accept = buttons.find((candidate) => candidate.dataset.id === id && candidate.dataset[datasetKey] === acceptAction);
  const reject = buttons.find((candidate) => candidate.dataset.id === id && candidate.dataset[datasetKey] === rejectAction);
  if (!accept || !reject) return undefined;
  return {
    key: `${keyPrefix}:${id}`,
    heading,
    reviewerLabel,
    noteRequired: false,
    options: [
      { value: "accepted", label: acceptLabel, button: accept, primary: true },
      { value: "rejected", label: rejectLabel, button: reject },
    ],
  };
}

function threeWayConfig(
  card: HTMLElement,
  keyPrefix: string,
  id: string,
  action: string,
  reviewerLabel: string,
  noteLabel: string,
  datasetKey: "campaignAction" | "videoAction" | "activationAction" = "campaignAction",
): ReviewConfig | undefined {
  const candidates = [...card.querySelectorAll<HTMLButtonElement>("button")]
    .filter((candidate) => candidate.dataset.id === id && candidate.dataset[datasetKey] === action);
  const byDecision = (decision: string): HTMLButtonElement | undefined => candidates.find((candidate) => candidate.dataset.decision === decision);
  const approved = byDecision("approved");
  const changes = byDecision("changes_requested");
  const rejected = byDecision("rejected");
  if (!approved || !changes || !rejected) return undefined;
  return {
    key: `${keyPrefix}:${id}`,
    heading: action === "review-entry" ? "Review scheduled external action" : action === "review-campaign" ? "Review campaign" : action === "review-asset" ? "Review canonical asset" : action === "review-brief" ? "Review video brief" : action === "review-artifact" ? "Review imported render" : "Review variant",
    reviewerLabel,
    noteLabel,
    noteRequired: true,
    options: [
      { value: "approved", label: action === "review-entry" ? "Approve and schedule" : "Approve", button: approved, primary: true },
      { value: "changes_requested", label: "Request changes", button: changes },
      { value: "rejected", label: "Reject", button: rejected },
    ],
  };
}

function owningCard(button: HTMLButtonElement): HTMLElement | undefined {
  return button.closest<HTMLElement>("article")
    ?? button.closest<HTMLElement>(".record")
    ?? button.closest<HTMLElement>(".calendar-card")
    ?? undefined;
}

function openReviewPanel(button: HTMLButtonElement, config: ReviewConfig): void {
  const card = owningCard(button);
  if (!card) return;
  const previous = card.querySelector<HTMLElement>("[data-contextual-review]");
  if (previous) {
    panelReviews.delete(previous);
    previous.remove();
  }
  const actions = button.closest<HTMLElement>(".actions");
  if (actions) actions.hidden = true;

  const context = reviewContext(card);
  const panel = document.createElement("section");
  panel.className = "state review-panel";
  panel.dataset.contextualReview = config.key;
  panel.setAttribute("aria-label", config.heading);
  panel.innerHTML = `<div class="review-panel-context">
      <p class="eyebrow">Named human review</p>
      <h5>${escapeHtml(config.heading)}</h5>
      <p><strong>Item</strong> ${escapeHtml(context.title)}</p>
      <p><strong>Evidence and authority context</strong> ${escapeHtml(context.evidence)}</p>
      <p><strong>Prior feedback</strong> ${escapeHtml(context.priorFeedback)}</p>
    </div>
    <form data-contextual-review-form>
      <label>${escapeHtml(config.reviewerLabel)}<input name="reviewer" required autocomplete="name"></label>
      ${config.noteRequired ? `<label>${escapeHtml(config.noteLabel ?? "Review note")}<textarea name="note" required rows="3" placeholder="Record the evidence-backed reason for this decision."></textarea></label>` : `<p class="guidance">This record type stores the named reviewer and decision. Its current authority model has no separate durable review-note field.</p>`}
      <fieldset><legend>Decision</legend><div class="actions">${config.options.map((option) => `<button ${option.primary ? 'class="primary"' : ""} type="submit" name="decision" value="${escapeHtml(option.value)}">${escapeHtml(option.label)}</button>`).join("")}</div></fieldset>
      <button type="button" data-contextual-review-cancel>Cancel review</button>
    </form>`;
  panelReviews.set(panel, config);
  const anchor = actions ?? card.lastElementChild;
  if (anchor) anchor.insertAdjacentElement("beforebegin", panel);
  else card.append(panel);
  panel.querySelector<HTMLInputElement>('input[name="reviewer"]')?.focus();
  announce(`${config.heading} opened with item context and decision controls.`);
}

function reviewContext(card: HTMLElement): Readonly<{ title: string; evidence: string; priorFeedback: string }> {
  const title = card.querySelector("h4, h3, strong")?.textContent?.trim() || "Current review item";
  const evidenceParts = [
    card.querySelector("p")?.textContent?.trim(),
    card.querySelector("dl")?.textContent?.trim(),
    card.querySelector("details")?.textContent?.trim(),
  ].filter((value): value is string => Boolean(value)).map(compact).filter(Boolean);
  const feedback = [...card.querySelectorAll<HTMLElement>(".guidance, .inline-warning")]
    .map((element) => compact(element.textContent ?? ""))
    .find((value) => /review|change|invalid|reject|feedback/i.test(value));
  return {
    title,
    evidence: evidenceParts.slice(0, 3).join(" · ") || "The owning record is visible with this review panel.",
    priorFeedback: feedback || "No prior review feedback is recorded on this visible item.",
  };
}

function compact(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function closePanel(panel: HTMLElement): void {
  const card = panel.closest<HTMLElement>("article, .record, .calendar-card");
  card?.querySelector<HTMLElement>(".actions")?.removeAttribute("hidden");
  panelReviews.delete(panel);
  panel.remove();
}

function replayReview(config: ReviewConfig, decision: string, reviewer: string, note: string): void {
  const option = config.options.find((candidate) => candidate.value === decision);
  if (!option) throw new Error("Review decision is not available for this record");
  const originalPrompt = window.prompt;
  const queue = config.noteRequired ? [reviewer, note] : [reviewer];
  window.prompt = () => queue.shift() ?? null;
  option.button.dataset.contextualReviewBypass = "true";
  try {
    option.button.click();
  } finally {
    delete option.button.dataset.contextualReviewBypass;
    window.prompt = originalPrompt;
  }
}

document.addEventListener("click", (event) => {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>("button");
  if (!button) return;
  if (button.dataset.contextualReviewBypass === "true") return;

  const cancel = button.closest<HTMLButtonElement>("[data-contextual-review-cancel]");
  if (cancel) {
    event.preventDefault();
    event.stopImmediatePropagation();
    const panel = cancel.closest<HTMLElement>("[data-contextual-review]");
    if (panel) closePanel(panel);
    announce("Review panel closed without changing the record.");
    return;
  }

  const config = reviewConfig(button);
  if (!config) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  openReviewPanel(button, config);
}, true);

document.addEventListener("submit", (event) => {
  const form = (event.target as HTMLElement).closest<HTMLFormElement>("form[data-contextual-review-form]");
  if (!form) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  const panel = form.closest<HTMLElement>("[data-contextual-review]");
  if (!panel) return;
  const config = panelReviews.get(panel);
  if (!config) {
    announce("Review could not be recorded because the owning review state changed.");
    return;
  }
  const data = new FormData(form);
  const reviewer = String(data.get("reviewer") ?? "").trim();
  const note = String(data.get("note") ?? "").trim();
  const submitter = (event as SubmitEvent).submitter as HTMLButtonElement | null;
  const decision = submitter?.value ?? "";
  if (!reviewer || (config.noteRequired && !note)) {
    announce("Named reviewer and required review note must be completed before recording the decision.");
    return;
  }
  form.setAttribute("aria-busy", "true");
  try {
    replayReview(config, decision, reviewer, note);
    announce("Review decision sent to the owning workflow for durable recording.");
  } catch (error) {
    form.setAttribute("aria-busy", "false");
    announce(`Review could not be recorded: ${error instanceof Error ? error.message : "Unknown review error"}`);
  }
}, true);
