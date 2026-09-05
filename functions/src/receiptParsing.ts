import { z } from "zod";
import { randomUUID } from "node:crypto";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const RECEIPT_IMAGE_PATTERN = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/;

export type ReceiptPayload = {
  requestId: string;
  mimeType: "image/jpeg" | "image/png" | "image/webp";
  imageBase64: string;
};

export function parseReceiptPayload(data: unknown): ReceiptPayload {
  if (!data || typeof data !== "object") throw new Error("Receipt image is required.");
  const input = data as Record<string, unknown>;
  const imageBase64 = typeof input.imageBase64 === "string" ? input.imageBase64 : "";
  if (!imageBase64) throw new Error("Receipt image is required.");
  const match = RECEIPT_IMAGE_PATTERN.exec(imageBase64);
  if (!match) throw new Error("Unsupported image type or encoding.");
  const encoded = match[2];
  const estimatedBytes = Math.floor((encoded.length * 3) / 4);
  if (estimatedBytes > MAX_IMAGE_BYTES) throw new Error("Receipt image is too large.");
  const requestId = typeof input.requestId === "string" && input.requestId.trim()
    ? input.requestId.trim().slice(0, 120)
    : randomUUID();
  return { requestId, mimeType: match[1] as ReceiptPayload["mimeType"], imageBase64: encoded };
}

export const ParsedReceiptSchema = z.object({
  merchantName: z.string().max(200).nullable(),
  purchaseDate: z.string().max(40).nullable(),
  currency: z.string().regex(/^[A-Z]{3}$/).nullable(),
  total: z.number().nonnegative().nullable(),
  items: z.array(z.object({
    name: z.string().min(1).max(200),
    quantity: z.number().int().positive().max(100).default(1),
    amount: z.number().nonnegative().nullable(),
  }).strict()).max(100),
}).strict();

export type ParsedReceipt = z.infer<typeof ParsedReceiptSchema>;
