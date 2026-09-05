"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.kitesurfSecrets = void 0;
exports.normalizeKitesurfSearchResults = normalizeKitesurfSearchResults;
exports.stageKitesurfListing = stageKitesurfListing;
exports.searchKitesurfRetailerProducts = searchKitesurfRetailerProducts;
exports.executeKitesurfPurchase = executeKitesurfPurchase;
const params_1 = require("firebase-functions/params");
const discoveredListing_1 = require("./contracts/discoveredListing");
const merchantAdapters_1 = require("./kitesurf/merchantAdapters");
const CLOUDFLARE_ACCOUNT_ID = (0, params_1.defineSecret)("CLOUDFLARE_ACCOUNT_ID");
const CLOUDFLARE_API_TOKEN = (0, params_1.defineSecret)("CLOUDFLARE_API_TOKEN");
exports.kitesurfSecrets = [CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_API_TOKEN];
const BROWSER_RUN_BASE = "https://api.cloudflare.com/client/v4/accounts";
const KITESURF_TIMEOUT_MS = 15000;
const KITESURF_REQUEST_LIMIT = 1;
const KITESURF_SEARCH_RESULT_LIMIT = 10;
async function loadCloudflareCredentials() {
    const accountId = CLOUDFLARE_ACCOUNT_ID.value();
    const apiToken = CLOUDFLARE_API_TOKEN.value();
    if (!accountId || !apiToken) {
        throw new Error("Cloudflare Browser Run credentials are not configured.");
    }
    return { accountId, apiToken };
}
function allowedDomainsFromEnvironment() {
    return (process.env.KITESURF_ALLOWED_DOMAINS || "")
        .split(",")
        .map(value => value.trim().toLowerCase())
        .filter(value => /^[a-z0-9.-]+$/.test(value));
}
function isAllowedMerchantUrl(value, allowedDomains) {
    try {
        const url = new URL(value);
        if (url.protocol !== "https:")
            return false;
        const hostname = url.hostname.toLowerCase();
        return allowedDomains.some(domain => hostname === domain || hostname.endsWith(`.${domain}`));
    }
    catch (_a) {
        return false;
    }
}
function redactActionLog(value) {
    return value
        .replace(/https:\/\/[^\s]+/gi, "[merchant-url]")
        .replace(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g, "[redacted-email]")
        .replace(/\b(?:\d[ -]*?){13,19}\b/g, "[redacted-payment]");
}
function parseObservedPrice(value, currency) {
    if (typeof value === "number")
        return Number.isFinite(value) && value > 0 ? value : undefined;
    if (typeof value !== "string")
        return undefined;
    const normalized = value.trim().replace(/\s/g, "");
    if (!normalized || /[^0-9,.$€£A-Z]/i.test(normalized))
        return undefined;
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
    if (typeof currency === "string" && !/^[A-Z]{3}$/.test(currency))
        return undefined;
    return Number.isFinite(numeric) && numeric > 0 ? numeric : undefined;
}
function observedCurrency(value, price) {
    if (typeof value === "string" && /^[A-Z]{3}$/.test(value))
        return value;
    if (typeof price !== "string")
        return undefined;
    if (price.includes("$"))
        return "USD";
    if (price.includes("€"))
        return "EUR";
    if (price.includes("£"))
        return "GBP";
    return undefined;
}
async function quickAction(credentials, body) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), KITESURF_TIMEOUT_MS);
    try {
        const response = await fetch(`${BROWSER_RUN_BASE}/${credentials.accountId}/browser-run/json?browser=kitesurf`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${credentials.apiToken}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
            signal: controller.signal,
        });
        if (!response.ok)
            throw new Error(`Browser Run request failed with HTTP ${response.status}.`);
        return response.json();
    }
    finally {
        clearTimeout(timeoutId);
    }
}
function normalizeKitesurfSearchResults(products, allowedDomains, discoveredAt = new Date().toISOString()) {
    if (!Array.isArray(products))
        return [];
    const seenMerchantUrls = new Set();
    return products.slice(0, KITESURF_SEARCH_RESULT_LIMIT).flatMap((candidate) => {
        if (!candidate || typeof candidate !== "object")
            return [];
        const item = candidate;
        if (typeof item.title !== "string" || !item.title.trim() || typeof item.productUrl !== "string")
            return [];
        if (!isAllowedMerchantUrl(item.productUrl, allowedDomains))
            return [];
        let productUrl;
        try {
            productUrl = (0, discoveredListing_1.canonicalMerchantUrl)(item.productUrl);
        }
        catch (_a) {
            return [];
        }
        if (seenMerchantUrls.has(productUrl))
            return [];
        const price = parseObservedPrice(item.price, item.currency);
        const currency = observedCurrency(item.currency, item.price);
        const parsed = discoveredListing_1.DiscoveredListingSchema.safeParse({
            id: (0, discoveredListing_1.stableListingId)("kitesurf", productUrl, typeof item.productId === "string" ? item.productId : undefined),
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
        if (!parsed.success)
            return [];
        seenMerchantUrls.add(productUrl);
        return [parsed.data];
    });
}
function cloudflareBrowser(credentials) {
    return {
        async inspectPublicListing({ url, requestLimit, timeoutMs }) {
            if (requestLimit !== KITESURF_REQUEST_LIMIT || timeoutMs > KITESURF_TIMEOUT_MS) {
                throw new Error("Kitesurf staging request limits are invalid.");
            }
            const adapter = (0, merchantAdapters_1.merchantAdapterFor)(new URL(url).hostname);
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
                ? response.result
                : response;
            return data && typeof data === "object" ? data : {};
        },
    };
}
function failure(failureReason, steps, status = "failed") {
    return { status, steps: steps.map(redactActionLog), failureReason };
}
async function stageKitesurfListing(listing, options = {}) {
    var _a, _b, _c, _d;
    if (!((_a = listing.merchantUrl) === null || _a === void 0 ? void 0 : _a.trim()) || !((_b = listing.name) === null || _b === void 0 ? void 0 : _b.trim())) {
        return failure("missing_listing", ["Merchant listing details were missing."]);
    }
    const allowedDomains = (_c = options.allowedDomains) !== null && _c !== void 0 ? _c : allowedDomainsFromEnvironment();
    if (!isAllowedMerchantUrl(listing.merchantUrl, allowedDomains)) {
        return failure("disallowed_domain", ["Merchant URL was rejected before navigation."]);
    }
    let browser;
    try {
        browser = (_d = options.browser) !== null && _d !== void 0 ? _d : cloudflareBrowser(await loadCloudflareCredentials());
    }
    catch (error) {
        console.warn("Kitesurf staging configuration failed:", redactActionLog(error instanceof Error ? error.message : String(error)));
        return failure("network_error", ["Merchant page staging is unavailable."]);
    }
    let signals;
    try {
        signals = await browser.inspectPublicListing({
            url: (0, discoveredListing_1.canonicalMerchantUrl)(listing.merchantUrl),
            requestLimit: KITESURF_REQUEST_LIMIT,
            timeoutMs: KITESURF_TIMEOUT_MS,
        });
    }
    catch (error) {
        console.warn("Kitesurf public-listing staging failed:", redactActionLog(error instanceof Error ? error.message : String(error)));
        return failure("network_error", ["Merchant page staging could not be completed."]);
    }
    const finalUrl = typeof signals.finalUrl === "string" ? signals.finalUrl : listing.merchantUrl;
    if (!isAllowedMerchantUrl(finalUrl, allowedDomains)) {
        return failure("disallowed_domain", ["Merchant navigation left the allowlisted domain."]);
    }
    if (signals.loginRequired)
        return failure("login_required", ["Merchant page requires customer sign-in."], "incompatible");
    if (signals.botChallenge)
        return failure("bot_challenge", ["Merchant page presented a bot challenge."], "incompatible");
    if (signals.paymentFormDetected)
        return failure("unsupported_checkout", ["Merchant payment form requires user-completed checkout."], "incompatible");
    const price = parseObservedPrice(signals.price, signals.currency);
    const currency = observedCurrency(signals.currency, signals.price);
    const steps = ["Opened the allowlisted public merchant listing."];
    if (price && currency)
        steps.push("Observed the current merchant price.");
    if (signals.placeOrderControlDetected)
        steps.push("Stopped before the merchant place-order control.");
    return {
        status: "staged",
        finalUrl: (0, discoveredListing_1.canonicalMerchantUrl)(finalUrl),
        observedPrice: price && currency ? { amount: price, currency, evidenceUrl: (0, discoveredListing_1.canonicalMerchantUrl)(finalUrl) } : undefined,
        steps,
    };
}
async function searchKitesurfRetailerProducts(query, retailerHint) {
    const allowedDomains = allowedDomainsFromEnvironment();
    const merchantUrl = retailerHint === null || retailerHint === void 0 ? void 0 : retailerHint.trim();
    if (!merchantUrl || !isAllowedMerchantUrl(merchantUrl, allowedDomains))
        return [];
    try {
        const credentials = await loadCloudflareCredentials();
        const response = await quickAction(credentials, {
            url: (0, discoveredListing_1.canonicalMerchantUrl)(merchantUrl),
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
            ? response.result
            : response;
        return normalizeKitesurfSearchResults(data === null || data === void 0 ? void 0 : data.products, allowedDomains);
    }
    catch (error) {
        console.warn("Kitesurf product search failed:", redactActionLog(error instanceof Error ? error.message : String(error)));
        return [];
    }
}
async function executeKitesurfPurchase() {
    throw new Error("Merchant checkout is user-completed. Kitesurf cannot submit orders or payment credentials.");
}
//# sourceMappingURL=kitesurfService.js.map