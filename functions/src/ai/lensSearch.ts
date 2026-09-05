import { normalizeApifyResults } from "./providers/apifyAdapter";
import type { DiscoveredListing } from "../contracts/discoveredListing";

const APIFY_LENS_ACTOR_URL = "https://api.apify.com/v2/actors/borderline~google-lens/run-sync-get-dataset-items";
const APIFY_LENS_TIMEOUT_MS = 15_000;

export type FetchImplementation = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export function parseLensApifyResults(results: unknown[], options: { discoveredAt?: string } = {}): DiscoveredListing[] {
  return normalizeApifyResults(results, options);
}

export async function fetchApifyLensResults(
  imageBase64: string,
  apiToken: string,
  { fetchImpl = fetch, timeoutMs = APIFY_LENS_TIMEOUT_MS }: { fetchImpl?: FetchImplementation; timeoutMs?: number } = {},
): Promise<DiscoveredListing[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(APIFY_LENS_ACTOR_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiToken}`,
      },
      body: JSON.stringify({
        searchTypes: ["all", "products", "visual-match"],
        imagesBase64: [imageBase64],
        language: "en",
      }),
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`Apify Lens returned HTTP ${response.status}.`);

    const results: unknown = await response.json();
    return parseLensApifyResults(Array.isArray(results) ? results : []);
  } finally {
    clearTimeout(timeout);
  }
}
