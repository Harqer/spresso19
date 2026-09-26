import { z } from "zod";

const MAX_PROMPT_LENGTH = 4000;
const MAX_LOCALE_LENGTH = 16;

/** Client input contains intent only. Thread ownership is resolved server-side. */
export const ChatRequestSchema = z.object({
  prompt: z.string().trim().min(1).max(MAX_PROMPT_LENGTH),
  locale: z.string().trim().min(2).max(MAX_LOCALE_LENGTH).optional(),
}).strict();

/** Finalized Gemini Live transcription only; audio/video payloads never cross this boundary. */
export const LiveTurnRequestSchema = z.object({
  turnId: z.string().trim().min(1).max(128).regex(/^[A-Za-z0-9_-]+$/),
  userTranscript: z.string().trim().max(4000),
  assistantTranscript: z.string().trim().max(8000),
}).strict().refine(
  (turn) => turn.userTranscript.length > 0 || turn.assistantTranscript.length > 0,
  "A finalized voice turn must contain transcript text.",
);

const TextBlockSchema = z.object({
  type: z.literal("text"),
  text: z.string().trim().min(1).max(8000),
}).strict();

const ProductCardBlockSchema = z.object({
  type: z.literal("product_card"),
  productId: z.string().min(1).max(160),
  title: z.string().min(1).max(240),
  merchantUrl: z.string().url().refine((value) => value.startsWith("https://"), "merchantUrl must use HTTPS"),
  source: z.enum(["parallel", "serpapi", "apify", "kitesurf"]),
  imageUrl: z.string().url().refine((value) => value.startsWith("https://"), "imageUrl must use HTTPS").optional(),
  price: z.object({ amount: z.number().nonnegative(), currency: z.string().regex(/^[A-Z]{3}$/) }).strict().optional(),
}).strict();

const CitationListBlockSchema = z.object({
  type: z.literal("citation_list"),
  citations: z.array(z.object({
    title: z.string().min(1).max(240),
    url: z.string().url().refine((value) => value.startsWith("https://"), "citation URL must use HTTPS"),
  }).strict()).max(20),
}).strict();

export const StructuredResponseBlockSchema = z.discriminatedUnion("type", [
  TextBlockSchema,
  ProductCardBlockSchema,
  CitationListBlockSchema,
]);

const ToolResultSchema = z.object({
  productId: z.string().min(1).max(160),
  title: z.string().min(1).max(240),
  merchantUrl: z.string().url().refine((value) => value.startsWith("https://"), "merchantUrl must use HTTPS"),
  source: z.enum(["parallel", "serpapi", "apify", "kitesurf"]),
}).strict();

/** Model output is descriptive only; financial and external actions are excluded. */
export const AssistantResponseSchema = z.object({
  text: z.string().trim().min(1).max(8000),
  blocks: z.array(StructuredResponseBlockSchema).max(50).optional(),
  products: z.array(ToolResultSchema).max(20).optional(),
}).strict();

/** Outfit-provider output: descriptive selection only, bounded like all model output. */
export const OutfitProposalSchema = z.object({
  title: z.string().trim().min(1).max(240).optional(),
  stylingAdvice: z.string().trim().min(1).max(2000).optional(),
  selectedItemIds: z.array(z.string().min(1).max(160)).min(1).max(50),
  weatherMatchScore: z.number().min(0).max(100),
}).strict();

/** Creator-campaign output: descriptive marketing copy only, bounded. */
export const CreatorCampaignSchema = z.object({
  campaignTitle: z.string().trim().min(1).max(240),
  socialMediaCopy: z.string().trim().min(1).max(2000),
  suggestedTags: z.array(z.string().trim().min(1).max(60)).min(1).max(20),
}).strict();

export type ChatRequest = z.infer<typeof ChatRequestSchema>;
export type AssistantResponse = z.infer<typeof AssistantResponseSchema>;

/**
 * Delimits provider or merchant text from instructions and bounds its size.
 * This is not a prompt-injection "filter"; the model policy must still treat
 * the delimited value as data and ignore instructions inside it.
 */
export function sanitizeUntrustedText(value: string, maxLength: number): string {
  const bounded = value.slice(0, Math.max(0, maxLength));
  const prefix = "[UNTRUSTED_DATA]\n";
  const suffix = "\n[/UNTRUSTED_DATA]";
  if (maxLength <= prefix.length + suffix.length) return bounded.slice(0, maxLength);
  const contentLength = maxLength - prefix.length - suffix.length;
  return `${prefix}${bounded.slice(0, contentLength)}${suffix}`;
}

export function serializeToolResult(value: unknown): z.infer<typeof ToolResultSchema> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return ToolResultSchema.parse(value);
  }
  const candidate = value as Record<string, unknown>;
  return ToolResultSchema.parse({
    productId: candidate.productId,
    title: candidate.title,
    merchantUrl: candidate.merchantUrl,
    source: candidate.source,
  });
}
