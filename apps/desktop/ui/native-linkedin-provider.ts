import type {
  LinkedInConnectResult,
  LinkedInNativeProviderPort,
  LinkedInPublishResult,
} from "../../../src/activation-learning/ports/linkedin-native-provider.js";

type Invoke = <T>(command: string, args?: Record<string, unknown>) => Promise<T>;

export class NativeLinkedInProviderClient implements LinkedInNativeProviderPort {
  async connect(input: Readonly<{
    credentialReference: string;
    accessToken: string;
  }>): Promise<LinkedInConnectResult> {
    return this.requiredInvoke()<LinkedInConnectResult>("linkedin_connect_member", {
      credentialReference: input.credentialReference,
      accessToken: input.accessToken,
    });
  }

  async publishText(input: Readonly<{
    credentialReference: string;
    memberUrn: string;
    text: string;
  }>): Promise<LinkedInPublishResult> {
    return this.requiredInvoke()<LinkedInPublishResult>("linkedin_publish_text", {
      credentialReference: input.credentialReference,
      memberUrn: input.memberUrn,
      text: input.text,
    });
  }

  async disconnect(input: Readonly<{ credentialReference: string }>): Promise<void> {
    if (!input.credentialReference.startsWith("viable://credential/linkedin/")) {
      throw new Error("LinkedIn credential reference is invalid");
    }
    const result = await this.requiredInvoke()<Readonly<{ reference: string; present: boolean }>>("credential_delete", {
      reference: input.credentialReference,
    });
    if (result.present) throw new Error("LinkedIn credential could not be removed from the native vault");
  }

  async openSetupPage(destination: "linkedin_developer_apps" | "linkedin_token_generator"): Promise<void> {
    await this.requiredInvoke()<void>("open_external_destination", { destination });
  }

  private requiredInvoke(): Invoke {
    const invoke = globalThis.window?.__TAURI__?.core?.invoke as Invoke | undefined;
    if (!invoke) throw new Error("LinkedIn connection requires the Viable desktop runtime");
    return invoke;
  }
}
