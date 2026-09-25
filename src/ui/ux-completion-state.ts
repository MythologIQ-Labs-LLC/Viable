import type { ReadinessAction } from "../product-core/domain/assessment.js";

export type UxCompletionSurface = "product" | "campaign";

export function selectActiveReadinessAction(actions: readonly ReadinessAction[]): ReadinessAction | undefined {
  return actions.find((candidate) => candidate.status === "in_progress")
    ?? actions.find((candidate) => candidate.status === "open");
}

export class OneShotSurfaceFeedback {
  private readonly messages = new Map<UxCompletionSurface, string>();

  set(surface: UxCompletionSurface, message: string): void {
    const normalized = message.trim();
    if (!normalized) throw new Error("A feedback message is required");
    this.messages.set(surface, normalized);
  }

  consume(surface: UxCompletionSurface): string | undefined {
    const message = this.messages.get(surface);
    this.messages.delete(surface);
    return message;
  }

  clear(surface: UxCompletionSurface): void {
    this.messages.delete(surface);
  }
}
