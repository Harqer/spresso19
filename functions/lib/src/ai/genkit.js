"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ai = void 0;
const genkit_1 = require("genkit");
const google_genai_1 = require("@genkit-ai/google-genai");
const dotprompt_1 = require("@genkit-ai/dotprompt");
exports.ai = (0, genkit_1.genkit)({
    plugins: [(0, google_genai_1.googleAI)(), (0, dotprompt_1.dotprompt)({ dir: "src/ai/prompts" })],
    model: "googleai/gemini-1.5-flash",
});
//# sourceMappingURL=genkit.js.map