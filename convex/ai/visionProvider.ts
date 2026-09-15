import { z } from "zod";

/**
 * Apify Google-Lens provider adapter for visual search.
 *
 * Pure functions only: the Convex action boundary (`convex/vision.ts`) owns
 * auth, media ownership, and configuration; this module owns provider I/O and
 * normalization onto the visual-listing contract.
 */

const APIFY_LENS_ACTOR_URL = "https://api.apify.com/v2/actors/borderline~google-lens/run-sync-get-dataset-items";
const APIFY_LENS_TIMEOUT_MS = 30_000;

export const VisualListingSchema = z
  .object({
    id: z.string().trim().min(1).max(256),
    name: z.string().trim().min(1).max(256),
    brand: z.string().trim().min(1).max(160).optional(),
    category: z.string().trim().min(1).max(120).optional(),
    imageUrl: z.string().url().startsWith("https://").max(2048).optional(),
    merchantUrl: z.string().url().startsWith("https://").max(2048),
    source: z.literal("apify"),
    providerListingId: z.string().trim().min(1).max(256).optional(),
    observedPrice: z
      .object({
        amount: z.number().positive(),
        currency: z.string().regex(/^[A-Za-z]{3}$/),
        evidenceUrl: z.string().url().startsWith("https://").max(2048),
      })
      .optional(),
    videoUrl: z.string().url().startsWith("https://").max(2048).optional(),
    rating: z.number().min(0).max(5).optional(),
    reviewCount: z.number().int().nonnegative().optional(),
    reviewSummary: z.string().trim().min(1).max(500).optional(),
    discoveredAt: z.string().datetime(),
  })
  .strict();

export type VisualListing = z.infer<typeof VisualListingSchema>;

/** Raw provider rows are untrusted shapes accessed through type guards only. */
type ApifyLensResult = Record<string, unknown>;

function firstString(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value;
  }
  return undefined;
}

function firstNumber(...values: unknown[]): number | undefined {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string") {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return undefined;
}

function httpsUrl(value: unknown): string | undefined {
  const raw = firstString(value);
  if (!raw) return undefined;
  try {
    const url = new URL(raw);
    return url.protocol === "https:" ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

/** Maps one Apify Lens result onto the visual-listing contract; skips unusable rows. */
export function normalizeApifyResult(item: unknown, discoveredAt: string): VisualListing | undefined {
  if (!item || typeof item !== "object" || Array.isArray(item)) return undefined;
  const row = item as ApifyLensResult;
  const merchantUrl = httpsUrl(row.productUrl ?? row.url ?? row.link);
  const name = firstString(row.name, row.title)?.trim();
  if (!merchantUrl || !name) return undefined;

  const providerId = firstString(row.id, row.productId, row.sku, String(row.id ?? ""));
  const priceAmount = firstNumber(row.price ?? row.currentPrice);
  const currency = firstString(row.currency)?.toUpperCase();
  const observedPrice =
    priceAmount && priceAmount > 0 && currency
      ? { amount: priceAmount, currency, evidenceUrl: merchantUrl }
      : undefined;
  const rating = firstNumber(row.rating ?? row.stars);
  const reviewCount = firstNumber(row.reviewCount ?? row.reviewsCount);
  const parsed = VisualListingSchema.safeParse({
    id: providerId ? `${merchantUrl}#${providerId}`.slice(0, 256) : merchantUrl.slice(0, 256),
    name,
    ...(firstString(row.brand, row.merchant) ? { brand: firstString(row.brand, row.merchant) } : {}),
    ...(firstString(row.category) ? { category: firstString(row.category) } : {}),
    ...(httpsUrl(row.imageUrl ?? row.image ?? row.thumbnail) ? { imageUrl: httpsUrl(row.imageUrl ?? row.image ?? row.thumbnail) } : {}),
    merchantUrl,
    source: "apify" as const,
    ...(providerId ? { providerListingId: providerId } : {}),
    ...(observedPrice ? { observedPrice } : {}),
    ...(httpsUrl(row.videoUrl ?? row.video ?? row.video_url) ? { videoUrl: httpsUrl(row.videoUrl ?? row.video ?? row.video_url) } : {}),
    ...(rating !== undefined && rating >= 0 && rating <= 5 ? { rating } : {}),
    ...(reviewCount !== undefined && Number.isInteger(reviewCount) && reviewCount >= 0 ? { reviewCount } : {}),
    ...(firstString(row.reviewSummary, row.review_summary) ? { reviewSummary: firstString(row.reviewSummary, row.review_summary) } : {}),
    discoveredAt,
  });
  return parsed.success ? parsed.data : undefined;
}

export type FetchImplementation = typeof fetch;

export async function fetchVisionListings(
  imageBase64: string,
  apiToken: string,
  { fetchImpl = fetch, timeoutMs = APIFY_LENS_TIMEOUT_MS }: { fetchImpl?: FetchImplementation; timeoutMs?: number } = {},
): Promise<VisualListing[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(APIFY_LENS_ACTOR_URL, {
      method: "POST",
      signal: controller.signal,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiToken}` },
      body: JSON.stringify({
        searchTypes: ["all", "products", "visual-match"],
        imagesBase64: [imageBase64],
        language: "en",
      }),
    });
    if (!response.ok) throw new Error(`Visual search provider returned HTTP ${response.status}.`);
    const results: unknown = await response.json();
    if (!Array.isArray(results)) throw new Error("Visual search provider returned an unexpected payload.");
    const seen = new Set<string>();
    const discoveredAt = new Date().toISOString();
    return results
      .flatMap((result: unknown) => {
        const normalized = normalizeApifyResult(result, discoveredAt);
        if (!normalized || seen.has(normalized.id)) return [];
        seen.add(normalized.id);
        return [normalized];
      })
      .slice(0, 30);
  } finally {
    clearTimeout(timeout);
  }
}
