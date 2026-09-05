"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ai = void 0;
const genkit_1 = require("genkit");
const google_genai_1 = require("@genkit-ai/google-genai");
const google_cloud_1 = require("@genkit-ai/google-cloud");
// Enable native Google Cloud telemetry when the runtime has an explicit project.
// This keeps local Genkit CLI registration usable without attempting ambient ADC discovery.
if (process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT || process.env.FIREBASE_CONFIG) {
    (0, google_cloud_1.enableGoogleCloudTelemetry)();
}
exports.ai = (0, genkit_1.genkit)({
    plugins: [(0, google_genai_1.googleAI)()],
    model: "googleai/gemini-3.1-flash-lite-preview",
    promptDir: "src/ai/prompts",
});
//# sourceMappingURL=genkit.js.map