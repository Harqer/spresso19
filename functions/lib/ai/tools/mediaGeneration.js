"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mediaGenerationTool = void 0;
const params_1 = require("firebase-functions/params");
const genkit_1 = require("genkit");
const genkit_2 = require("../genkit");
const mediaGeneration_1 = require("../mediaGeneration");
const geminiApiKey = (0, params_1.defineSecret)("GEMINI_API_KEY");
const higgsfieldKeyId = (0, params_1.defineSecret)("HIGGSFIELD_API_KEY_ID");
const higgsfieldKeySecret = (0, params_1.defineSecret)("HIGGSFIELD_KEY_SECRET");
exports.mediaGenerationTool = genkit_2.ai.defineTool({
    name: "mediaGeneration",
    description: "Generate a product image or short product motion clip. Try Gemini Nano Banana image generation first and use Higgsfield only when Gemini image generation is unavailable.",
    inputSchema: genkit_1.z.object({
        prompt: genkit_1.z.string().min(1).max(4000),
        mediaType: genkit_1.z.enum(["image", "video"]),
        imageUrls: genkit_1.z.array(genkit_1.z.string().url()).max(4).optional(),
        base64Images: genkit_1.z.array(genkit_1.z.object({ data: genkit_1.z.string(), mimeType: genkit_1.z.string() })).max(4).optional(),
    }),
    outputSchema: genkit_1.z.object({
        mediaUrl: genkit_1.z.string().url().or(genkit_1.z.string().startsWith("data:")),
        mediaType: genkit_1.z.enum(["image", "video"]),
        provider: genkit_1.z.enum(["gemini", "higgsfield"]),
    }),
}, async ({ prompt, mediaType, imageUrls, base64Images }, ctx) => {
    var _a, _b, _c, _d;
    if (!((_b = (_a = ctx.context) === null || _a === void 0 ? void 0 : _a.auth) === null || _b === void 0 ? void 0 : _b.uid))
        throw new Error("Unauthenticated media generation attempt blocked.");
    return (0, mediaGeneration_1.generateMediaWithFallback)({
        prompt,
        mediaType,
        imageUrls,
        base64Images,
        requesterUid: (_d = (_c = ctx.context) === null || _c === void 0 ? void 0 : _c.auth) === null || _d === void 0 ? void 0 : _d.uid,
        geminiApiKey: geminiApiKey.value(),
        higgsfieldKeyId: higgsfieldKeyId.value(),
        higgsfieldKeySecret: higgsfieldKeySecret.value(),
    });
});
//# sourceMappingURL=mediaGeneration.js.map