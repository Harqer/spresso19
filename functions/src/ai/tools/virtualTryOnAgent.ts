import { ai } from "../genkit";
import { z } from "genkit";
import { mediaGenerationTool } from "./mediaGeneration";

export const virtualTryOnAgent = ai.defineTool(
  {
    name: "virtualTryOnAgent",
    description: "Delegate to the Virtual Try-on Subagent. Use this when the user wants to see how a product looks on them.",
    inputSchema: z.object({
      base64Image: z.string().optional().describe("Optional base64 image of the user for try-on"),
      productName: z.string().optional(),
      productImage: z.string().url().optional(),
      mediaType: z.enum(["image", "video"]).default("image"),
      height: z.string().max(32).optional(),
      weight: z.string().max(32).optional(),
      size: z.string().max(32).optional(),
      fitPreference: z.enum(["tailored", "regular", "relaxed", "oversized"]).optional(),
      fabric: z.string().max(80).optional(),
      locationContext: z.string().max(120).optional(),
      customNotes: z.string().max(500).optional(),
      base64Images: z.array(z.object({ data: z.string(), mimeType: z.string() })).max(4).optional(),
    }),
    outputSchema: z.object({
      mediaUrl: z.string().url().or(z.string().startsWith("data:")),
      mediaType: z.enum(["image", "video"]),
      provider: z.enum(["gemini", "higgsfield"]),
    }),
  },
  async ({ base64Image, productName, productImage, mediaType, height, weight, size, fitPreference, fabric, locationContext, customNotes, base64Images }, ctx) => {
    console.log("Delegating to Virtual Try-on Agent");
    return mediaGenerationTool({
      prompt: `Photorealistic virtual try-on ${mediaType} for ${productName || "the selected product"}. Preserve the person's identity and body proportions. Show the garment's actual cut, texture, seams, stretch, density, and drape. Fit guidance: ${[height && `height ${height}`, weight && `weight ${weight}`, size && `usual size ${size}`, fitPreference && `preferred fit ${fitPreference}`, fabric && `fabric ${fabric}`].filter(Boolean).join(", ") || "no measurements supplied"}. Treat the result as a visual estimate, not a measurement guarantee. ${locationContext ? `Use a subtle setting inspired by the user's coarse location: ${locationContext}.` : "Use a neutral setting."} ${customNotes || "Do not change the garment or body shape."}`,
      mediaType,
      imageUrls: productImage ? [productImage] : undefined,
      base64Images: [
        ...(base64Image ? [{ data: base64Image, mimeType: base64Image.match(/^data:([^;]+);/)?.[1] || "image/jpeg" }] : []),
        ...(base64Images || []),
      ].slice(0, 4),
    }, ctx);
  }
);
