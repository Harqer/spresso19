import { getSecret } from "../src/lib/secrets";
import { getActiveProductById } from "./inventory";

export interface KitesurfPurchaseResult {
  success: boolean;
  orderId?: string;
  steps: string[];
  receiptUrl: string;
  screenshotUrl?: string;
  totalAmount: number;
  vendorOrderRef?: string;
}

const BROWSER_RUN_BASE = "https://api.cloudflare.com/client/v4/accounts";
const CDP_WS_BASE = "wss://api.cloudflare.com/client/v4/accounts";

async function loadCloudflareCredentials(): Promise<{ accountId: string; apiToken: string }> {
  const [accountId, apiToken] = await Promise.all([
    getSecret("CLOUDFLARE_ACCOUNT_ID"),
    getSecret("CLOUDFLARE_API_TOKEN"),
  ]);
  return { accountId, apiToken };
}

async function quickAction(
  action: string,
  accountId: string,
  apiToken: string,
  body: Record<string, unknown>
): Promise<any> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000);
  try {
    const response = await fetch(
      `${BROWSER_RUN_BASE}/${accountId}/browser-run/${action}?browser=kitesurf`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      }
    );
    if (response.status === 429) {
      throw new Error("Cloudflare Browser Run rate limited (429). Retry after the backoff window.");
    }
    if (response.status === 422) {
      throw new Error("Cloudflare Browser Run could not process the page (422). The storefront may be incompatible with Kitesurf.");
    }
    if (!response.ok) {
      throw new Error(`Cloudflare Browser Run returned status ${response.status}.`);
    }
    return await response.json();
  } finally {
    clearTimeout(timeoutId);
  }
}

async function searchProductOnMerchant(
  merchantUrl: string,
  productName: string,
  accountId: string,
  apiToken: string
): Promise<{ found: boolean; price?: number; productUrl?: string }> {
  try {
    const result = await quickAction("json", accountId, apiToken, {
      url: merchantUrl,
      prompt: `Find whether the product "${productName}" is listed on this storefront, extract its price and its product page URL.`,
      response_format: {
        type: "json_schema",
        json_schema: {
          type: "object",
          properties: {
            found: { type: "boolean" },
            price: { type: "string" },
            productUrl: { type: "string" },
          },
          required: ["found"],
        },
      },
    });
    const data = result?.result || {};
    return {
      found: data.found === true,
      price: typeof data.price === "string" && data.price.trim() ? parseFloat(data.price.replace(/[^0-9.]/g, "")) : undefined,
      productUrl: typeof data.productUrl === "string" ? data.productUrl : undefined,
    };
  } catch (err: any) {
    console.warn(`Cloudflare Browser Run could not verify ${merchantUrl}:`, err.message);
    throw new Error("The merchant listing could not be verified.");
  }
}

const kiteSearchCache = new Map<string, { expiresAt: number; value: any[] }>();
const KITE_SEARCH_CACHE_TTL_MS = 5 * 60 * 1000;

/**
 * Single-pass Kitesurf Direct Web Search & Product Extraction.
 * Eliminates redundant Google Search + Kitesurf double passes.
 */
export async function searchKitesurfRetailerProducts(
  query: string,
  retailerHint?: string
): Promise<any[]> {
  const cacheKey = `${(retailerHint || "").toLowerCase()}|${query.toLowerCase().trim()}`;
  const cached = kiteSearchCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  const produce = async (): Promise<any[]> => {
    try {
      const { accountId, apiToken } = await loadCloudflareCredentials();
      const searchTargetUrl = retailerHint?.toLowerCase().includes("banana")
        ? "https://bananarepublic.gap.com"
        : `https://www.google.com/search?q=${encodeURIComponent(query + " buy online")}`;

      const result = await quickAction("json", accountId, apiToken, {
        url: searchTargetUrl,
        prompt: `Extract current live retail product listings matching query "${query}". Include product title, price, image URL, and direct product page URL.`,
        response_format: {
          type: "json_schema",
          json_schema: {
            type: "object",
            properties: {
              products: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    title: { type: "string" },
                    price: { type: "number" },
                    productUrl: { type: "string" },
                    imageUrl: { type: "string" }
                  },
                  required: ["title", "price"]
                }
              }
            },
            required: ["products"]
          }
        }
      });

      const items = Array.isArray(result?.result?.products) ? result.result.products : [];
      return items.flatMap((item: any, idx: number) => {
        const price = Number(item.price);
        if (
          typeof item.title !== "string" ||
          !item.title.trim() ||
          !Number.isFinite(price) ||
          price <= 0 ||
          typeof item.productUrl !== "string"
        ) {
          return [];
        }
        let productUrl: URL;
        try {
          productUrl = new URL(item.productUrl);
        } catch {
          return [];
        }
        if (productUrl.protocol !== "https:") return [];
        return [{
          id: `kitesurf-${Date.now()}-${idx}`,
          name: item.title.trim(),
          brand: retailerHint || productUrl.hostname,
          category: "Web sourced",
          price,
          image: typeof item.imageUrl === "string" ? item.imageUrl : "",
          merchantUrl: productUrl.toString(),
          availabilityStatus: "VERIFY_AT_MERCHANT_CHECKOUT",
        }];
      });
    } catch (err: any) {
      console.warn("[Kitesurf Search] Direct web extraction note:", err.message);
    }

    // No listings is a valid empty discovery result; callers must handle it.
    return [];
  };

  const value = await produce();
  kiteSearchCache.set(cacheKey, { expiresAt: Date.now() + KITE_SEARCH_CACHE_TTL_MS, value });
  return value;
}

async function captureReceiptScreenshot(
  url: string,
  accountId: string,
  apiToken: string
): Promise<string | undefined> {
  try {
    const res = await quickAction("screenshot", accountId, apiToken, {
      url,
      viewport: { width: 1280, height: 800 },
    });
    return res?.result?.image || res?.screenshot || undefined;
  } catch (err: any) {
    console.warn(`[Kitesurf] Screenshot failed for ${url}:`, err.message);
    return undefined;
  }
}

async function runHeadlessCheckout(
  targetUrl: string,
  shippingAddress: string,
  accountId: string,
  apiToken: string,
  biometricAuthorized?: boolean,
  virtualCardJson?: string
): Promise<{ steps: string[]; vendorOrderRef?: string }> {
  const steps: string[] = [];
  try {
    const { default: puppeteer } = await import("puppeteer-core");
    const browserWSEndpoint = `${CDP_WS_BASE}/${accountId}/browser-run/devtools/browser?browser=kitesurf`;

    const browser = await puppeteer.connect({
      browserWSEndpoint,
      headers: { Authorization: `Bearer ${apiToken}` },
    });

    try {
      const page = await browser.newPage();
      await page.goto(targetUrl, { waitUntil: "networkidle2", timeout: 45000 });
      steps.push(`Loaded merchant storefront page: ${targetUrl}`);

      // Add the already-selected catalog variant to the merchant cart. Variant
      // choice is never guessed by automation.
      const addToCart = await page.$(
        "button[aria-label*='Add to cart' i], button::-p-text(Add to cart), [data-testid*='add-to-cart'], #add-to-cart"
      );
      if (addToCart) {
        await addToCart.click();
        await new Promise((resolve) => setTimeout(resolve, 2000));
        steps.push("Submitted Add-to-Cart form action on merchant storefront.");
      }

      // Navigate to checkout without submitting an order.
      const cartCheckout = await page.$(
        "button[aria-label*='checkout' i], a::-p-text(Checkout), [data-testid*='checkout'], #checkout-btn"
      );
      if (cartCheckout) {
        await cartCheckout.click();
        await new Promise((resolve) => setTimeout(resolve, 2500));
        steps.push("Navigated to merchant checkout form page.");
      }

      // Shipping can be filled from the user's confirmed checkout payload.
      const addressInputs = await page.$$(
        "input[name*='address' i], input[name*='street' i], input[autocomplete*='address' i], textarea[name*='address' i]"
      );
      if (addressInputs.length > 0) {
        await addressInputs[0].type(shippingAddress, { delay: 25 });
        steps.push("Filled the confirmed shipping address.");
      }

      if (!biometricAuthorized) {
        steps.push("Halted checkout before final form submit awaiting user biometric confirmation.");
        return { steps };
      }

      // A Stripe PaymentIntent ID is not a merchant payment credential. Until
      // a merchant API returns a verifiable order reference, browser checkout
      // must never click Place Order or manufacture a success response.
      void virtualCardJson;
      throw new Error(
        "This merchant requires an approved payment and order-confirmation integration before Spresso can submit the order."
      );
    } finally {
      await browser.close();
    }
  } catch (err: any) {
    console.warn("Headless checkout automation failed:", err.message);
    throw new Error(`Headless checkout failed: ${err.message}`);
  }
}

export async function executeKitesurfPurchase(
  productId: string,
  shippingAddress: string,
  paymentToken: string = "",
  merchantUrl?: string,
  userApprovedPaywall?: boolean,
  biometricAuthorized?: boolean
): Promise<KitesurfPurchaseResult> {
  const steps: string[] = [];
  if (!shippingAddress.trim()) {
    throw new Error("A confirmed shipping address is required.");
  }
  const product = await getActiveProductById(productId);
  if (!product) {
    throw new Error("Product not found. Cannot automate a purchase without a valid product.");
  }

  const targetUrl = merchantUrl;
  if (!targetUrl) {
    throw new Error(
      "No merchant storefront URL available for this product. Provide a real merchantUrl to automate the purchase."
    );
  }

  // Paywall & Subscription Gate Check
  const isPaywalledSite = targetUrl.toLowerCase().includes("subscriber") || targetUrl.toLowerCase().includes("paywall") || targetUrl.toLowerCase().includes("vip-club");
  if (isPaywalledSite && !userApprovedPaywall) {
    return {
      success: false,
      steps: ["Encountered subscription paywall gate on merchant site.", "Halted automated navigation awaiting user approval."],
      receiptUrl: "",
      totalAmount: product.price,
      requiresUserApproval: true,
      paywallNotice: `Target site "${targetUrl}" requires a paid subscription or paywall pass. Do you approve proceeding? Type 'y' or click Yes to confirm (y/N)?`
    } as any;
  }

  const { accountId, apiToken } = await loadCloudflareCredentials();
  steps.push("Loaded Cloudflare Browser Run credentials from Secret Manager.");

  const search = await searchProductOnMerchant(targetUrl, product.name, accountId, apiToken);
  if (!search.found) {
    throw new Error(`Kitesurf could not find "${product.name}" on the provided merchant storefront.`);
  }
  steps.push(`Verified product availability on the merchant storefront (price: ${search.price ?? "n/a"}).`);

  const productUrl = search.productUrl || targetUrl;
  const cdpResult = await runHeadlessCheckout(productUrl, shippingAddress, accountId, apiToken, biometricAuthorized, paymentToken);
  steps.push(...cdpResult.steps);

  if (!cdpResult.vendorOrderRef) {
    throw new Error("The merchant did not return a verifiable order reference.");
  }

  const screenshotUrl = await captureReceiptScreenshot(productUrl, accountId, apiToken);
  steps.push("Captured merchant confirmation evidence.");

  const totalAmount = search.price && search.price > 0 ? search.price : product.price;

  return {
    success: true,
    orderId: cdpResult.vendorOrderRef,
    steps,
    receiptUrl: screenshotUrl || "",
    screenshotUrl,
    totalAmount,
    vendorOrderRef: cdpResult.vendorOrderRef
  };
}
