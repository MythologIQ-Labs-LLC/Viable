export type ProductIdentity = Readonly<{
  name: string;
  description: string;
  lifecycle: "concept" | "prototype" | "private_beta" | "public_beta" | "general_availability" | "retired";
  supportedEnvironments: readonly string[];
}>;

export type ProductTruth = Readonly<{
  identity: ProductIdentity;
  capabilities: readonly string[];
  limitations: readonly string[];
  positioning: string;
  alternatives: readonly string[];
  differentiation: readonly string[];
  pricing: readonly string[];
  packaging: readonly string[];
  offers: readonly string[];
  callsToAction: readonly string[];
  brandVoice: readonly string[];
  terminology: Readonly<Record<string, string>>;
  accessibilityConstraints: readonly string[];
  revision: number;
  updatedAt: string;
  updatedBy: string;
}>;
