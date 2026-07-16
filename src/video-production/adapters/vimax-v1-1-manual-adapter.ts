import type { VideoBrief, VideoProductionToolRecord } from "../domain/video-production.js";

export const VIMAX_V1_1_TOOL: VideoProductionToolRecord = {
  id: "vimax-v1.1.0-manual",
  name: "ViMax",
  version: "v1.1.0",
  revision: "1f8f650",
  sourceUrl: "https://github.com/HKUDS/ViMax/tree/v1.1.0",
  license: "MIT",
  licenseCopyright: "Copyright (c) 2025",
  compatibilityReviewedAt: "2026-07-16",
  runtime: [
    "Python 3.12 or newer",
    "uv-managed Python environment",
    "separately installed ViMax checkout",
    "external user-selected LLM, image, and video providers",
  ],
  supportedOperatingSystems: ["windows", "linux"],
  unverifiedOperatingSystems: ["macOS"],
  obligations: [
    "Retain the upstream MIT copyright and permission notice in copies or substantial portions of ViMax",
    "Treat upstream providers, model licenses, and generated-media rights as separate obligations",
  ],
  limitations: [
    "This adapter exports a manual Script2Video compatibility packet and does not execute ViMax",
    "The v1.1.0 Script2Video entrypoint is a Python example rather than a stable machine job API",
    "Provider credentials are configured outside the exported package",
    "Render completion does not grant Viable approval or publishing authority",
  ],
};

export type VimaxManualAdaptation = Readonly<{
  adapter: "vimax_script2video_manual";
  target: VideoProductionToolRecord;
  status: "manual_template";
  credentialsIncluded: false;
  files: Readonly<Record<string, string>>;
  instructions: readonly string[];
}>;

export function buildVimaxManualAdaptation(brief: VideoBrief): VimaxManualAdaptation {
  const requirements = [
    `Objective: ${brief.objective}`,
    `Audience: ${brief.audience}`,
    `Target duration: ${brief.durationSeconds} seconds`,
    `Platforms: ${brief.platforms.join(", ")}`,
    `Aspect ratios: ${brief.aspectRatios.join(", ")}`,
    ...brief.storyboard.map((scene) => `Scene ${scene.order}: ${scene.purpose}; ${scene.visualDirection}; ${scene.shotConstraints.join("; ")}`),
    ...brief.prohibitedElements.map((item) => `Prohibited: ${item}`),
    ...brief.accessibilityRequirements.map((item) => `Accessibility: ${item}`),
    ...(brief.captionsRequired ? ["Captions are required"] : []),
    ...(brief.audioDescriptionRequired ? ["Audio description is required"] : []),
  ].join("\n");

  const python = [
    "import asyncio",
    "from pipelines.script2video_pipeline import Script2VideoPipeline",
    "",
    `script = ${JSON.stringify(brief.script)}`,
    `user_requirement = ${JSON.stringify(requirements)}`,
    `style = ${JSON.stringify(brief.visualStyle)}`,
    "",
    "async def main():",
    "    pipeline = Script2VideoPipeline.init_from_config(config_path=\"configs/script2video.viable.yaml\")",
    "    await pipeline(script=script, user_requirement=user_requirement, style=style)",
    "",
    "if __name__ == \"__main__\":",
    "    asyncio.run(main())",
    "",
  ].join("\n");

  const yaml = [
    "# Viable intentionally exports no credentials.",
    "# Configure a local copy outside the package before running ViMax.",
    "chat_model:",
    "  init_args:",
    `    model: ${yamlScalar(brief.providers.find((item) => item.kind === "llm")?.model ?? "user-selected")}`,
    `    model_provider: ${yamlScalar(brief.providers.find((item) => item.kind === "llm")?.provider ?? "user-selected")}`,
    "    api_key:",
    "    base_url:",
    "  max_requests_per_minute: null",
    "  max_requests_per_day: null",
    "image_generator:",
    "  class_path: tools.ImageGeneratorNanobananaGoogleAPI",
    "  init_args:",
    "    api_key:",
    "  max_requests_per_minute: 2",
    "  max_requests_per_day: 50",
    "video_generator:",
    "  class_path: tools.VideoGeneratorVeoGoogleAPI",
    "  init_args:",
    "    api_key:",
    "  max_requests_per_minute: 2",
    "  max_requests_per_day: 50",
    `working_dir: .working_dir/viable-${brief.id}`,
    "",
  ].join("\n");

  const notice = [
    "ViMax compatibility target: v1.1.0 (revision 1f8f650)",
    "Upstream: https://github.com/HKUDS/ViMax",
    "License: MIT",
    "Copyright (c) 2025",
    "",
    "The upstream copyright and MIT permission notice must be retained in copies or substantial portions of ViMax.",
    "This compatibility packet does not contain ViMax itself and does not grant rights to third-party models, providers, source assets, or generated media.",
    "",
  ].join("\n");

  return {
    adapter: "vimax_script2video_manual",
    target: VIMAX_V1_1_TOOL,
    status: "manual_template",
    credentialsIncluded: false,
    files: {
      "vimax/main_script2video_viable.py": python,
      "vimax/configs/script2video.viable.yaml": yaml,
      "vimax/UPSTREAM-NOTICE.txt": notice,
    },
    instructions: [
      "Install or check out ViMax v1.1.0 separately and run uv sync in that checkout",
      "Copy the generated Python entrypoint and blank configuration template into the separate ViMax checkout",
      "Configure provider credentials only in the user's local environment or local configuration outside the exported package",
      "Run the adapted entrypoint from the ViMax root directory",
      "Import the resulting artifact manifest, renders, captions, and redacted stage log back into Viable",
      "Do not treat render completion as approval or delivery",
    ],
  };
}

function yamlScalar(value: string): string {
  return JSON.stringify(value.replace(/[\r\n]/g, " ").trim());
}
