import { createHash } from "node:crypto";
import { z } from "zod";

const MAX_INLINE_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_REMOTE_IMAGE_URL_LENGTH = 2_048;

const optionalText = (max: number) => z.preprocess(
  value => value === "" ? undefined : value,
  z.string().trim().min(1).max(max).optional(),
);

const imageInput = z.preprocess(value => value === "" ? undefined : value, z.string().optional())
  .superRefine((value, context) => {
    if (value === undefined) return;
    if (value.length > MAX_REMOTE_IMAGE_URL_LENGTH && !value.startsWith("data:")) {
      context.addIssue({ code: "custom", message: "Image reference is too large." });
      return;
    }
    const dataMatch = value.match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+={0,2})$/i);
    if (dataMatch) {
      const encoded = dataMatch[2];
      const bytes = Math.floor((encoded.length * 3) / 4) - (encoded.endsWith("==") ? 2 : encoded.endsWith("=") ? 1 : 0);
      if (bytes < 1 || bytes > MAX_INLINE_IMAGE_BYTES) {
        context.addIssue({ code: "custom", message: "Image must be between 1 byte and 5 MB." });
      }
      return;
    }
    try {
      const url = new URL(value);
      if (url.protocol !== "https:") throw new Error("HTTPS required");
    } catch {
      context.addIssue({ code: "custom", message: "Image must be an HTTPS URL or supported inline image." });
    }
  });

export const VirtualTryOnRequestSchema = z.object({
  productId: optionalText(256),
  productName: optionalText(256),
  productImage: imageInput,
  userPhotoBase64: imageInput,
  mediaType: z.enum(["image", "video"]),
  height: optionalText(32),
  weight: optionalText(32),
  size: optionalText(32),
  fitPreference: z.enum(["tailored", "regular", "relaxed", "oversized"]).optional(),
  fabric: optionalText(80),
  locationContext: optionalText(120),
  customNotes: optionalText(500),
  idempotencyKey: z.string().uuid().optional(),
}).strict().superRefine((value, context) => {
  if (!value.productId && !value.productName) {
    context.addIssue({ code: "custom", message: "A product is required." });
  }
});

export type VirtualTryOnRequest = z.infer<typeof VirtualTryOnRequestSchema>;

export function parseVirtualTryOnRequest(value: unknown): VirtualTryOnRequest {
  return VirtualTryOnRequestSchema.parse(value);
}

export type ProviderCredentials = {
  geminiApiKey?: string;
  higgsfieldKeyId?: string;
  higgsfieldKeySecret?: string;
};

export function providerAvailabilityError(credentials: ProviderCredentials): string | null {
  if (credentials.geminiApiKey || (credentials.higgsfieldKeyId && credentials.higgsfieldKeySecret)) return null;
  return "Virtual try-on is temporarily unavailable.";
}

export function isAlreadyExistsError(error: unknown): boolean {
  const code = (error as { code?: unknown } | null)?.code;
  return code === 6 || code === "6" || code === "already-exists" || code === "ALREADY_EXISTS";
}

export function safeVirtualTryOnError(error: unknown): string {
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  if (message.includes("timed out") || message.includes("timeout") || message.includes("aborted")) {
    return "Virtual try-on took too long. Please try again.";
  }
  if (message.includes("cancel")) return "Virtual try-on was cancelled. Please try again.";
  return "Virtual try-on is unavailable right now. Please try again.";
}

export type VirtualTryOnResult = {
  mediaUrl: string;
  mediaType: "image" | "video";
  provider: "gemini" | "higgsfield";
};

export function parseVirtualTryOnResult(value: unknown): VirtualTryOnResult {
  const result = z.object({
    mediaUrl: z.union([
      z.string().url().refine(url => url.startsWith("https://"), "Output URL must use HTTPS"),
      z.string().regex(/^data:video\/(?:mp4|webm);base64,[A-Za-z0-9+/]+=*$/i),
      z.string().regex(/^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/]+=*$/i),
    ]),
    mediaType: z.enum(["image", "video"]),
    provider: z.enum(["gemini", "higgsfield"]),
  }).strict().parse(value);
  if (result.mediaUrl.startsWith("data:image/") && result.mediaType !== "image") {
    throw new Error("Generated media type does not match the output payload.");
  }
  if (result.mediaUrl.startsWith("data:video/") && result.mediaType !== "video") {
    throw new Error("Generated media type does not match the output payload.");
  }
  return result;
}

export function createVirtualTryOnJobMetadata(input: {
  uid: string;
  jobId: string;
  mediaType: "image" | "video";
  provider?: "gemini" | "higgsfield";
  mediaUrl?: string;
  status: "running" | "completed" | "failed";
  createdAt?: string;
}) {
  return {
    uid: input.uid,
    jobId: input.jobId,
    kind: "virtual_try_on" as const,
    mediaType: input.mediaType,
    status: input.status,
    hasOutput: input.status === "completed",
    ...(input.status === "completed" && input.mediaUrl ? { outputHash: createHash("sha256").update(input.mediaUrl).digest("hex") } : {}),
    ...(input.provider ? { provider: input.provider } : {}),
    createdAt: input.createdAt ?? new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}
