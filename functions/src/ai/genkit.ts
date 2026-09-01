import { genkit } from "genkit";
import { googleAI } from "@genkit-ai/google-genai";
import { enableGoogleCloudTelemetry } from "@genkit-ai/google-cloud";

// Enable native Google Cloud telemetry (Cloud Logging, Trace, etc.)
enableGoogleCloudTelemetry();

export const ai = genkit({
  plugins: [googleAI()],
  model: "googleai/gemini-flash-latest",
  promptDir: "src/ai/prompts",
});
