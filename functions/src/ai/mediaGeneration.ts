import { GoogleGenAI } from "@google/genai";
import { createHash } from "node:crypto";
import { consumeBudget, getCached, setCached, cacheKey } from "./costControls";

type MediaType = "image" | "video";

export interface MediaGenerationOptions {
  prompt: string;
  mediaType: MediaType;
  geminiApiKey?: string;
  higgsfieldKeyId?: string;
  higgsfieldKeySecret?: string;
  imageUrls?: string[];
  base64Images?: Array<{ data: string; mimeType: string }>;
  requesterUid?: string;
  disableCache?: boolean;
  cacheScope?: string;
}

export interface GeneratedMedia {
  mediaUrl: string;
  mediaType: MediaType;
  provider: "gemini" | "higgsfield";
}

const GEMINI_IMAGE_MODELS = [
  // Nano Banana / Nano Flash image generation, with newer preview models first.
  "gemini-3.1-flash-image-preview",
  "gemini-2.5-flash-image",
  "gemini-3-pro-image-preview",
  "gemini-3.1-flash-lite-image-preview",
];
const GEMINI_VIDEO_MODEL = process.env.GEMINI_VIDEO_MODEL || "veo-3.1-generate-preview";

async function imageUrlToInput(url: string) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Reference image download failed (${response.status})`);
  const mimeType = response.headers.get("content-type")?.split(";")[0] || "image/jpeg";
  const data = Buffer.from(await response.arrayBuffer()).toString("base64");
  return { type: "image", mime_type: mimeType, data };
}

async function generateWithGemini(options: MediaGenerationOptions): Promise<GeneratedMedia> {
  if (!options.geminiApiKey) throw new Error("GEMINI_API_KEY is not configured");
  if (options.mediaType !== "image") throw new Error("Gemini fallback currently supports images only");

  const ai = new GoogleGenAI({ apiKey: options.geminiApiKey });
  const input: any[] = [{ type: "text", text: options.prompt }];
  for (const image of options.base64Images || []) {
    input.push({ type: "image", mime_type: image.mimeType, data: image.data.replace(/^data:[^;]+;base64,/, "") });
  }
  for (const url of options.imageUrls || []) input.push(await imageUrlToInput(url));

  let lastError: unknown;
  for (const model of GEMINI_IMAGE_MODELS) {
    try {
      const interaction: any = await ai.interactions.create({
        model,
        input,
        response_format: { type: "image", mime_type: "image/png", aspect_ratio: "3:4", image_size: "1K" },
      });
      const image = interaction.output_image;
      if (!image?.data) throw new Error(`Gemini returned no image for ${model}`);
      return { mediaUrl: `data:${image.mime_type || "image/png"};base64,${image.data}`, mediaType: "image", provider: "gemini" };
    } catch (error) {
      lastError = error;
      console.warn("Gemini image model unavailable; trying the next image model.", { model });
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Gemini image generation failed");
}

async function generateVideoWithGemini(options: MediaGenerationOptions): Promise<GeneratedMedia> {
  if (!options.geminiApiKey) throw new Error("GEMINI_API_KEY is not configured");
  const ai = new GoogleGenAI({ apiKey: options.geminiApiKey });
  const referenceUrl = options.imageUrls?.[0];
  const referenceImage = referenceUrl ? await imageUrlToInput(referenceUrl) : undefined;
  let operation: any = await ai.models.generateVideos({
    model: GEMINI_VIDEO_MODEL,
    prompt: options.prompt,
    image: referenceImage
      ? { imageBytes: referenceImage.data, mimeType: referenceImage.mime_type }
      : undefined,
    config: {
      numberOfVideos: 1,
      durationSeconds: 8,
      aspectRatio: "9:16",
      resolution: "720p",
      personGeneration: "allow_adult",
    },
  });
  const deadline = Date.now() + 120_000;
  while (!operation.done && Date.now() < deadline) {
    await new Promise(resolve => setTimeout(resolve, 5_000));
    operation = await ai.operations.getVideosOperation({ operation });
  }
  if (!operation.done) throw new Error("Gemini video generation timed out");
  if (operation.error) throw new Error("Gemini video generation failed");
  const video = operation.response?.generatedVideos?.[0]?.video;
  if (video?.uri) return { mediaUrl: video.uri, mediaType: "video", provider: "gemini" };
  if (video?.videoBytes) {
    return { mediaUrl: `data:video/mp4;base64,${video.videoBytes}`, mediaType: "video", provider: "gemini" };
  }
  throw new Error("Gemini returned no video");
}

async function generateWithHiggsfield(options: MediaGenerationOptions): Promise<GeneratedMedia> {
  if (!options.higgsfieldKeyId || !options.higgsfieldKeySecret) throw new Error("Higgsfield credentials are not configured");
  if (options.mediaType === "video" && !(options.imageUrls || []).length) throw new Error("Higgsfield video fallback requires a public reference image URL");

  const endpoint = options.mediaType === "video" ? "/v1/image2video/dop" : "/flux-pro/kontext/max/text-to-image";
  const input = options.mediaType === "video"
    ? { model: "dop-turbo", prompt: options.prompt, input_images: (options.imageUrls || []).map(image_url => ({ type: "image_url", image_url })) }
    : { prompt: options.prompt, aspect_ratio: "3:4", safety_tolerance: 2 };
  const authorization = `Key ${options.higgsfieldKeyId}:${options.higgsfieldKeySecret}`;
  const submitted = await fetch(`https://platform.higgsfield.ai${endpoint}`, {
    method: "POST",
    headers: { Authorization: authorization, "Content-Type": "application/json" },
    body: JSON.stringify({ input }),
  });
  if (!submitted.ok) throw new Error(`Higgsfield request failed (${submitted.status})`);
  let status: any = await submitted.json();
  const deadline = Date.now() + 90_000;
  while (status.status !== "completed" && Date.now() < deadline) {
    if (["failed", "nsfw", "canceled"].includes(status.status)) throw new Error(`Higgsfield generation ${status.status}`);
    const statusUrl = status.status_url || (status.request_id && `https://platform.higgsfield.ai/requests/${status.request_id}/status`);
    if (!statusUrl) throw new Error("Higgsfield returned no status URL");
    await new Promise(resolve => setTimeout(resolve, 2_000));
    const polled = await fetch(statusUrl, { headers: { Authorization: authorization } });
    if (!polled.ok) throw new Error(`Higgsfield status request failed (${polled.status})`);
    status = await polled.json();
  }
  if (status.status !== "completed") throw new Error("Higgsfield generation timed out");
  const mediaUrl = options.mediaType === "video" ? status.video?.url : status.images?.[0]?.url;
  if (!mediaUrl) throw new Error("Higgsfield returned no media URL");
  return { mediaUrl, mediaType: options.mediaType, provider: "higgsfield" };
}

export async function generateMediaWithFallback(options: MediaGenerationOptions): Promise<GeneratedMedia> {
  const imageFingerprints = (options.base64Images || []).map((image) =>
    createHash("sha256").update(image.data).digest("hex"));
  const cacheScope = options.cacheScope ?? options.requesterUid ?? "shared";
  const produce = async (): Promise<GeneratedMedia> => {
    if (options.requesterUid) await consumeBudget(options.requesterUid, "media");
    try {
      return options.mediaType === "video"
        ? await generateVideoWithGemini(options)
        : await generateWithGemini(options);
    } catch (geminiError) {
      console.warn("Gemini image generation unavailable; falling back to Higgsfield.", {
        error: "provider_unavailable",
        mediaType: options.mediaType,
      });
      try {
        return await generateWithHiggsfield(options);
      } catch (higgsfieldError) {
        throw higgsfieldError;
      }
    }
  };
  const key = cacheKey("media", {
    cacheScope,
    prompt: options.prompt,
    mediaType: options.mediaType,
    imageUrls: options.imageUrls || [],
    imageFingerprints,
  });
  const recentFailure = failureCache.get(key);
  if (recentFailure) throw recentFailure;
  if (options.disableCache) {
    try {
      return await produce();
    } catch (error) {
      rememberFailure(key, error);
      throw error;
    }
  }
  const cached = await getCached<GeneratedMedia>("media", key);
  if (cached !== undefined) return cached;
  try {
    const value = await produce();
    await setCached("media", key, value);
    return value;
  } catch (error) {
    rememberFailure(key, error);
    throw error;
  }
}

const failureCache = new Map<string, { expiresAt: number; error: Error }>();
const FAILURE_TTL_MS = 30_000;

function rememberFailure(key: string, error: unknown) {
  const normalized = error instanceof Error ? error : new Error(String(error));
  failureCache.set(key, { expiresAt: Date.now() + FAILURE_TTL_MS, error: normalized });
  setTimeout(() => failureCache.delete(key), FAILURE_TTL_MS).unref?.();
}
