"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.virtualTryOnAgent = void 0;
const genkit_1 = require("../genkit");
const genkit_2 = require("genkit");
const mediaGeneration_1 = require("./mediaGeneration");
exports.virtualTryOnAgent = genkit_1.ai.defineTool({
    name: "virtualTryOnAgent",
    description: "Delegate to the Virtual Try-on Subagent. Use this when the user wants to see how a product looks on them.",
    inputSchema: genkit_2.z.object({
        base64Image: genkit_2.z.string().optional().describe("Optional base64 image of the user for try-on"),
        productName: genkit_2.z.string().optional(),
        productImage: genkit_2.z.string().url().optional(),
        mediaType: genkit_2.z.enum(["image", "video"]).default("image"),
        height: genkit_2.z.string().max(32).optional(),
        weight: genkit_2.z.string().max(32).optional(),
        size: genkit_2.z.string().max(32).optional(),
        fitPreference: genkit_2.z.enum(["tailored", "regular", "relaxed", "oversized"]).optional(),
        fabric: genkit_2.z.string().max(80).optional(),
        locationContext: genkit_2.z.string().max(120).optional(),
        customNotes: genkit_2.z.string().max(500).optional(),
        base64Images: genkit_2.z.array(genkit_2.z.object({ data: genkit_2.z.string(), mimeType: genkit_2.z.string() })).max(4).optional(),
    }),
    outputSchema: genkit_2.z.object({
        mediaUrl: genkit_2.z.string().url().or(genkit_2.z.string().startsWith("data:")),
        mediaType: genkit_2.z.enum(["image", "video"]),
        provider: genkit_2.z.enum(["gemini", "higgsfield"]),
    }),
}, async ({ base64Image, productName, productImage, mediaType, height, weight, size, fitPreference, fabric, locationContext, customNotes, base64Images }, ctx) => {
    var _a;
    console.log("Delegating to Virtual Try-on Agent");
    return (0, mediaGeneration_1.mediaGenerationTool)({
        prompt: `Photorealistic virtual try-on ${mediaType} for ${productName || "the selected product"}. Preserve the person's identity and body proportions. Show the garment's actual cut, texture, seams, stretch, density, and drape. Fit guidance: ${[height && `height ${height}`, weight && `weight ${weight}`, size && `usual size ${size}`, fitPreference && `preferred fit ${fitPreference}`, fabric && `fabric ${fabric}`].filter(Boolean).join(", ") || "no measurements supplied"}. Treat the result as a visual estimate, not a measurement guarantee. ${locationContext ? `Use a subtle setting inspired by the user's coarse location: ${locationContext}.` : "Use a neutral setting."} ${customNotes || "Do not change the garment or body shape."}`,
        mediaType,
        imageUrls: productImage ? [productImage] : undefined,
        base64Images: [
            ...(base64Image ? [{ data: base64Image, mimeType: ((_a = base64Image.match(/^data:([^;]+);/)) === null || _a === void 0 ? void 0 : _a[1]) || "image/jpeg" }] : []),
            ...(base64Images || []),
        ].slice(0, 4),
    }, ctx);
});
//# sourceMappingURL=virtualTryOnAgent.js.map