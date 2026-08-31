import { defineSecret } from "firebase-functions/params";
import {
  DiscoveredListingSchema,
  canonicalMerchantUrl,
  stableListingId,
  type DiscoveredListing,
} from "./contracts/discoveredListing";
import { merchantAdapterFor } from "./kitesurf/merchantAdapters";
import type {
  MerchantBrowser,
  MerchantPageSignals,
  MerchantStagingOptions,
  MerchantStagingResult,
} from "./kitesurf/stagingTypes";

const CLOUDFLARE_ACCOUNT_ID = defineSecret("CLOUDFLARE_ACCOUNT_ID");
const CLOUDFLARE_API_TOKEN = defineSecret("CLOUDFLARE_API_TOKEN");
const BROWSER_RUN_BASE = "https://api.cloudflare.com/client/v4/accounts";
const KITESURF_TIMEOUT_MS = 15_000;
const KITESURF_REQUEST_LIMIT = 1;
const KITESURF_SEARCH_RESULT_LIMIT = 10;

type CloudflareCredentials = {
  accountId: string;
  apiToken: string;
};

type KitesurfSearchRecord = {
  title?: unknown;
  price?: unknown;
  currency?: unknown;
  productUrl?: unknown;
  imageUrl?: unknown;
  productId?: unknown;
};

async function loadCloudflareCredentials(): Promise<CloudflareCredentials> {
  const accountId = CLOUDFLARE_ACCOUNT_ID.value();
  const apiToken = CLOUDFLARE_API_TOKEN.value();
  if (!accountId || !apiToken) {
    throw new Error("Cloudflare Browser Run credentials are not configured.");
  }
  return { accountId, apiToken };
}

function allowedDomainsFromEnvironment(): string[] {
  return (process.env.KITESURF_ALLOWED_DOMAINS || "")
    .split(",")
    .map(value => value.trim().toLowerCase())
    .filter(value => /^[a-z0-9.-]+$/.test(value));
}

function isAllowedMerchantUrl(value: string, allowedDomains: readonly string[]): boolean {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return false;
    const hostname = url.hostname.toLowerCase();
    return allowedDomains.some(domain => hostname === domain || hostname.endsWith(`.${domain}`));
  } catch {
    return false;
  }
}

function redactActionLog(value: string): string {
  return value
    .replace(/https:\/\/[^\s]+/gi, "[merchant-url]")
    .replace(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g, "[redacted-email]")
    .replace(/\b(?:\d[ -]*?){13,19}\b/g, "[redacted-payment]");
}

function parseObservedPrice(value: unknown, currency: unknown): number | undefined {
  if (typeof value === "number") return Number.isFinite(value) && value > 0 ? value : undefined;
  if (typeof value !== "string") return undefined;

  const normalized = value.trim().replace(/\s/g, "");
  if (!normalized || /[^0-9,.$€£A-Z]/i.test(normalized)) return undefined;
  const amountText = normalized.replace(/^[A-Z]{3}/i, "").replace(/[$€£]/g, "");
  const lastDot = amountText.lastIndexOf(".");
  const lastComma = amountText.lastIndexOf(",");
  const decimalIndex = Math.max(lastDot, lastComma);
  const integerPart = decimalIndex >= 0
    ? amountText.slice(0, decimalIndex).replace(/[.,]/g, "")
    : amountText.replace(/[.,]/g, "");
  const decimalPart = decimalIndex >= 0 ? amountText.slice(decimalIndex + 1) : "";
  const numeric = decimalIndex >= 0 && decimalPart.length > 0 && decimalPart.length <= 2
    ? Number(`${integerPart}.${decimalPart}`)
    : Number(integerPart);

  if (typeof currency === "string" && !/^[A-Z]{3}$/.test(currency)) return undefined;
  return Number.isFinite(numeric) && numeric > 0 ? numeric : undefined;
}

function observedCurrency(value: unknown, price: unknown): string | undefined {
  if (typeof value === "string" && /^[A-Z]{3}$/.test(value)) return value;
  if (typeof price !== "string") return undefined;
  if (price.includes("$")) return "USD";
  if (price.includes("€")) return "EUR";
  if (price.includes("£")) return "GBP";
  return undefined;
}

async function quickAction(credentials: CloudflareCredentials, body: Record<string, unknown>): Promise<unknown> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), KITESURF_TIMEOUT_MS);
  try {
    const response = await fetch(
      `${BROWSER_RUN_BASE}/${credentials.accountId}/browser-run/json?browser=kitesurf`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${credentials.apiToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      },
    );
    if (!response.ok) throw new Error(`Browser Run request failed with HTTP ${response.status}.`);
    return response.json();
  } finally {
    clearTimeout(timeoutId);
  }
}

function cloudflareBrowser(credentials: CloudflareCredentials): MerchantBrowser {
  return {
    async inspectPublicListing({ url, requestLimit, timeoutMs }): Promise<MerchantPageSignals> {
      if (requestLimit !== KITESURF_REQUEST_LIMIT || timeoutMs > KITESURF_TIMEOUT_MS) {
        throw new Error("Kitesurf staging request limits are invalid.");
      }
      const adapter = merchantAdapterFor(new URL(url).hostname);
      const response = await quickAction(credentials, {
        url,
        prompt: "Inspect this public product page only. Do not log in, solve challenges, fill forms, add items to a cart, submit payment details, or click a place-order control. Return the current URL, visible price and currency, plus booleans for login, bot challenge, payment form, and place-order control detection.",
        response_format: {
          type: "json_schema",
          json_schema: {
            type: "object",
            properties: {
              finalUrl: { type: "string" },
              price: { type: ["string", "number"] },
              currency: { type: "string" },
              loginRequired: { type: "boolean" },
              botChallenge: { type: "boolean" },
              paymentFormDetected: { type: "boolean" },
              placeOrderControlDetected: { type: "boolean" },
            },
          },
        },
        selectors: adapter.selectors,
      });
      const data = response && typeof response === "object" && "result" in response
        ? (response as { result: unknown }).result
        : response;
      return data && typeof data === "object" ? data as MerchantPageSignals : {};
    },
  };
}

function failure(
  failureReason: MerchantStagingResult["failureReason"],
  steps: string[],
  status: "failed" | "incompatible" = "failed",
): MerchantStagingResult {
  return { status, steps: steps.map(redactActionLog), failureReason };
}

export async function stageKitesurfListing(
  listing: Pick<DiscoveredListing, "merchantUrl" | "name">,
  options: MerchantStagingOptions = {},
): Promise<MerchantStagingResult> {
  if (!listing.merchantUrl?.trim() || !listing.name?.trim()) {
    return failure("missing_listing", ["Merchant listing details were missing."]);
  }

  const allowedDomains = options.allowedDomains ?? allowedDomainsFromEnvironment();
  if (!isAllowedMerchantUrl(listing.merchantUrl, allowedDomains)) {
    return failure("disallowed_domain", ["Merchant URL was rejected before navigation."]);
  }

  let browser: MerchantBrowser;
  try {
    browser = options.browser ?? cloudflareBrowser(await loadCloudflareCredentials());
  } catch (error) {
    console.warn("Kitesurf staging configuration failed:", redactActionLog(error instanceof Error ? error.message : String(error)));
    return failure("network_error", ["Merchant page staging is unavailable."]);
  }
  let signals: MerchantPageSignals;
  try {
    signals = await browser.inspectPublicListing({
      url: canonicalMerchantUrl(listing.merchantUrl),
      requestLimit: KITESURF_REQUEST_LIMIT,
      timeoutMs: KITESURF_TIMEOUT_MS,
    });
  } catch (error) {
    console.warn("Kitesurf public-listing staging failed:", redactActionLog(error instanceof Error ? error.message : String(error)));
    return failure("network_error", ["Merchant page staging could not be completed."]);
  }

  const finalUrl = typeof signals.finalUrl === "string" ? signals.finalUrl : listing.merchantUrl;
  if (!isAllowedMerchantUrl(finalUrl, allowedDomains)) {
    return failure("disallowed_domain", ["Merchant navigation left the allowlisted domain."]);
  }
  if (signals.loginRequired) return failure("login_required", ["Merchant page requires customer sign-in."], "incompatible");
  if (signals.botChallenge) return failure("bot_challenge", ["Merchant page presented a bot challenge."], "incompatible");
  if (signals.paymentFormDetected) return failure("unsupported_checkout", ["Merchant payment form requires user-completed checkout."], "incompatible");

  const price = parseObservedPrice(signals.price, signals.currency);
  const currency = observedCurrency(signals.currency, signals.price);
  const steps = ["Opened the allowlisted public merchant listing."];
  if (price && currency) steps.push("Observed the current merchant price.");
  if (signals.placeOrderControlDetected) steps.push("Stopped before the merchant place-order control.");
  return {
    status: "staged",
    finalUrl: canonicalMerchantUrl(finalUrl),
    observedPrice: price && currency ? { amount: price, currency, evidenceUrl: canonicalMerchantUrl(finalUrl) } : undefined,
    steps,
  };
}

export async function searchKitesurfRetailerProducts(query: string, retailerHint?: string): Promise<DiscoveredListing[]> {
  const allowedDomains = allowedDomainsFromEnvironment();
  const merchantUrl = retailerHint?.trim();
  if (!merchantUrl || !isAllowedMerchantUrl(merchantUrl, allowedDomains)) return [];

  try {
    const credentials = await loadCloudflareCredentials();
    const response = await quickAction(credentials, {
      url: canonicalMerchantUrl(merchantUrl),
      prompt: `Extract at most ${KITESURF_SEARCH_RESULT_LIMIT} public product listings matching the supplied search query. Do not interact with forms, carts, checkout, payment, account, or security controls.`,
      query,
      response_format: {
        type: "json_schema",
        json_schema: {
          type: "object",
          properties: {
            products: {
              type: "array",
              maxItems: KITESURF_SEARCH_RESULT_LIMIT,
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  price: { type: ["string", "number"] },
                  currency: { type: "string" },
                  productUrl: { type: "string" },
                  imageUrl: { type: "string" },
                  productId: { type: "string" },
                },
                required: ["title", "productUrl"],
              },
            },
          },
          required: ["products"],
        },
      },
    });
    const data = response && typeof response === "object" && "result" in response
      ? (response as { result?: { products?: unknown } }).result
      : response as { products?: unknown };
    const products = Array.isArray(data?.products) ? data.products.slice(0, KITESURF_SEARCH_RESULT_LIMIT) : [];
    const discoveredAt = new Date().toISOString();

    return products.flatMap((item: KitesurfSearchRecord) => {
      if (typeof item.title !== "string" || !item.title.trim() || typeof item.productUrl !== "string") return [];
      if (!isAllowedMerchantUrl(item.productUrl, allowedDomains)) return [];
      let productUrl: string;
      try {
        productUrl = canonicalMerchantUrl(item.productUrl);
      } catch {
        return [];
      }
      const price = parseObservedPrice(item.price, item.currency);
      const currency = observedCurrency(item.currency, item.price);
      const parsed = DiscoveredListingSchema.safeParse({
        id: stableListingId("kitesurf", productUrl, typeof item.productId === "string" ? item.productId : undefined),
        name: item.title.trim(),
        brand: new URL(productUrl).hostname,
        category: "Web sourced",
        imageUrl: typeof item.imageUrl === "string" && item.imageUrl.startsWith("https://") ? item.imageUrl : undefined,
        merchantUrl: productUrl,
        source: "kitesurf",
        providerListingId: typeof item.productId === "string" ? item.productId : undefined,
        observedPrice: price && currency ? { amount: price, currency, evidenceUrl: productUrl } : undefined,
        discoveredAt,
      });
      return parsed.success ? [parsed.data] : [];
    });
  } catch (error) {
    console.warn("Kitesurf product search failed:", redactActionLog(error instanceof Error ? error.message : String(error)));
    return [];
  }
}

export interface KitesurfPurchaseResult {
  success: false;
  steps: string[];
  receiptUrl: string;
  totalAmount: number;
}

export async function executeKitesurfPurchase(): Promise<never> {
  throw new Error("Merchant checkout is user-completed. Kitesurf cannot submit orders or payment credentials.");
}
