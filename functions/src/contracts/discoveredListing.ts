import { z } from "zod";

export const DiscoveredListingSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  brand: z.string().min(1).optional(),
  category: z.string().min(1).optional(),
  imageUrl: z.string().url().refine(value => value.startsWith("https://"), "imageUrl must use HTTPS").optional(),
  merchantUrl: z.string().url().refine(value => value.startsWith("https://"), "merchantUrl must use HTTPS"),
  source: z.enum(["parallel", "serpapi", "apify", "kitesurf"]),
  providerListingId: z.string().min(1).optional(),
  observedPrice: z.object({
    amount: z.number().positive(),
    currency: z.string().regex(/^[A-Z]{3}$/),
    evidenceUrl: z.string().url().refine(value => value.startsWith("https://"), "evidenceUrl must use HTTPS")
  }).optional(),
  videoUrl: z.string().url().refine(value => value.startsWith("https://"), "videoUrl must use HTTPS").optional(),
  rating: z.number().min(0).max(5).optional(),
  reviewCount: z.number().int().nonnegative().optional(),
  reviewSummary: z.string().trim().min(1).max(500).optional(),
  discoveredAt: z.string().datetime(),
  expiresAt: z.string().datetime().optional(),
  confidence: z.number().min(0).max(1).optional()
}).strict();

export type DiscoveredListing = z.infer<typeof DiscoveredListingSchema>;

export type CartListingSnapshot = DiscoveredListing & {
  quantity: number;
  addedAt: string;
};

export type MerchantStagingResult = {
  status: "staged" | "incompatible" | "failed";
  finalUrl?: string;
  observedPrice?: DiscoveredListing["observedPrice"];
  steps: string[];
  failureReason?: "disallowed_domain" | "login_required" | "bot_challenge" | "unsupported_checkout" | "network_error" | "missing_listing";
};

export function canonicalMerchantUrl(value: string): string {
  const url = new URL(value);
  if (url.protocol !== "https:") throw new Error("Merchant URLs must use HTTPS");
  url.hash = "";
  url.hostname = url.hostname.toLowerCase();
  for (const key of [...url.searchParams.keys()]) {
    if (/^(utm_|ref$|src$|campaign$)/i.test(key)) url.searchParams.delete(key);
  }
  url.searchParams.sort();
  return url.toString();
}

export function stableListingId(source: DiscoveredListing["source"], merchantUrl: string, providerListingId?: string): string {
  const input = `${source}:${canonicalMerchantUrl(merchantUrl)}:${providerListingId || ""}`;
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `${source}-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}
