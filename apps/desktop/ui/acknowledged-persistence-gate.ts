export type AcknowledgedPersistenceState = "idle" | "pending" | "saved" | "failed";

export type AcknowledgedPersistenceResult<T> =
  | Readonly<{ accepted: false; state: "pending" }>
  | Readonly<{ accepted: true; state: "saved"; value: T }>
  | Readonly<{ accepted: true; state: "failed"; error: unknown }>;

export class AcknowledgedPersistenceGate {
  private current: AcknowledgedPersistenceState = "idle";

  get state(): AcknowledgedPersistenceState {
    return this.current;
  }

  async run<T>(operation: () => Promise<T>): Promise<AcknowledgedPersistenceResult<T>> {
    if (this.current === "pending") return { accepted: false, state: "pending" };
    this.current = "pending";
    try {
      const value = await operation();
      this.current = "saved";
      return { accepted: true, state: "saved", value };
    } catch (error) {
      this.current = "failed";
      return { accepted: true, state: "failed", error };
    }
  }

  reset(): boolean {
    if (this.current === "pending") return false;
    this.current = "idle";
    return true;
  }
}
