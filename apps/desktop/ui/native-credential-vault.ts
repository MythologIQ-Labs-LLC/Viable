export type NativeCredentialCapabilityStatus =
  | "available"
  | "inaccessible"
  | "unsupported"
  | "platform_failure"
  | "runtime_unavailable";

export type NativeCredentialCapability = Readonly<{
  status: NativeCredentialCapabilityStatus;
  canStoreSecrets: boolean;
}>;

export type NativeCredentialReferenceState = Readonly<{
  reference: string;
  present: boolean;
}>;

type Invoke = <T>(command: string, args?: Record<string, unknown>) => Promise<T>;

type TauriGlobal = Readonly<{
  core?: Readonly<{
    invoke?: Invoke;
  }>;
}>;

declare global {
  interface Window {
    __TAURI__?: TauriGlobal;
  }
}

export class NativeCredentialVaultClient {
  async capability(): Promise<NativeCredentialCapability> {
    const invoke = this.invoke();
    if (!invoke) return { status: "runtime_unavailable", canStoreSecrets: false };
    try {
      return await invoke<NativeCredentialCapability>("credential_capability");
    } catch {
      return { status: "platform_failure", canStoreSecrets: false };
    }
  }

  async put(reference: string, secret: string): Promise<NativeCredentialReferenceState> {
    return this.requiredInvoke()<NativeCredentialReferenceState>("credential_put", { reference, secret });
  }

  async has(reference: string): Promise<NativeCredentialReferenceState> {
    return this.requiredInvoke()<NativeCredentialReferenceState>("credential_has", { reference });
  }

  async delete(reference: string): Promise<NativeCredentialReferenceState> {
    return this.requiredInvoke()<NativeCredentialReferenceState>("credential_delete", { reference });
  }

  private invoke(): Invoke | undefined {
    return globalThis.window?.__TAURI__?.core?.invoke;
  }

  private requiredInvoke(): Invoke {
    const invoke = this.invoke();
    if (!invoke) throw new Error("Native credential vault is unavailable outside the Viable desktop runtime");
    return invoke;
  }
}
