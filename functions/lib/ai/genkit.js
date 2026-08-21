"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ai = void 0;
const genkit_1 = require("genkit");
const google_genai_1 = require("@genkit-ai/google-genai");
const google_cloud_1 = require("@genkit-ai/google-cloud");
// Enable native Google Cloud telemetry (Cloud Logging, Trace, etc.)
(0, google_cloud_1.enableGoogleCloudTelemetry)();
exports.ai = (0, genkit_1.genkit)({
    plugins: [(0, google_genai_1.googleAI)()],
    model: "googleai/gemini-1.5-flash",
    promptDir: "src/ai/prompts",
});
//# sourceMappingURL=genkit.js.map