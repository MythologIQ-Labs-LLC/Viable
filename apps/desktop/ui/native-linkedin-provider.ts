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

  private requiredInvoke(): Invoke {
    const invoke = globalThis.window?.__TAURI__?.core?.invoke as Invoke | undefined;
    if (!invoke) throw new Error("LinkedIn connection requires the Viable desktop runtime");
    return invoke;
  }
}
