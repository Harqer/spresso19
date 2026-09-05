import { genkit } from "genkit";
import { googleAI } from "@genkit-ai/google-genai";
import { enableGoogleCloudTelemetry } from "@genkit-ai/google-cloud";

// Enable native Google Cloud telemetry when the runtime has an explicit project.
// This keeps local Genkit CLI registration usable without attempting ambient ADC discovery.
if (process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT || process.env.FIREBASE_CONFIG) {
  enableGoogleCloudTelemetry();
}

export const ai = genkit({
  plugins: [googleAI()],
  model: "googleai/gemini-3.1-flash-lite-preview",
  promptDir: "src/ai/prompts",
});
