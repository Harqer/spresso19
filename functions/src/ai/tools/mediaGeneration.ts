import { defineSecret } from "firebase-functions/params";
import { z } from "genkit";
import { ai } from "../genkit";
import { generateMediaWithFallback } from "../mediaGeneration";

const geminiApiKey = defineSecret("GEMINI_API_KEY");
const higgsfieldKeyId = defineSecret("HIGGSFIELD_API_KEY_ID");
const higgsfieldKeySecret = defineSecret("HIGGSFIELD_KEY_SECRET");

export const mediaGenerationTool = ai.defineTool(
  {
    name: "mediaGeneration",
    description: "Generate a product image or short product motion clip. Try Gemini Nano Banana image generation first and use Higgsfield only when Gemini image generation is unavailable.",
    inputSchema: z.object({
      prompt: z.string().min(1).max(4000),
      mediaType: z.enum(["image", "video"]),
      imageUrls: z.array(z.string().url()).max(4).optional(),
      base64Images: z.array(z.object({ data: z.string(), mimeType: z.string() })).max(4).optional(),
    }),
    outputSchema: z.object({
      mediaUrl: z.string().url().or(z.string().startsWith("data:")),
      mediaType: z.enum(["image", "video"]),
      provider: z.enum(["gemini", "higgsfield"]),
    }),
  },
  async ({ prompt, mediaType, imageUrls, base64Images }, ctx) => {
    if (!ctx.context?.auth?.uid) throw new Error("Unauthenticated media generation attempt blocked.");
    return generateMediaWithFallback({
      prompt,
      mediaType,
      imageUrls,
      base64Images,
      requesterUid: ctx.context?.auth?.uid,
      geminiApiKey: geminiApiKey.value(),
      higgsfieldKeyId: higgsfieldKeyId.value(),
      higgsfieldKeySecret: higgsfieldKeySecret.value(),
    });
  },
);
