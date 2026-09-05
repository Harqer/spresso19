"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseLensApifyResults = parseLensApifyResults;
exports.fetchApifyLensResults = fetchApifyLensResults;
const apifyAdapter_1 = require("./providers/apifyAdapter");
const APIFY_LENS_ACTOR_URL = "https://api.apify.com/v2/actors/borderline~google-lens/run-sync-get-dataset-items";
const APIFY_LENS_TIMEOUT_MS = 15000;
function parseLensApifyResults(results, options = {}) {
    return (0, apifyAdapter_1.normalizeApifyResults)(results, options);
}
async function fetchApifyLensResults(imageBase64, apiToken, { fetchImpl = fetch, timeoutMs = APIFY_LENS_TIMEOUT_MS } = {}) {
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
        if (!response.ok)
            throw new Error(`Apify Lens returned HTTP ${response.status}.`);
        const results = await response.json();
        return parseLensApifyResults(Array.isArray(results) ? results : []);
    }
    finally {
        clearTimeout(timeout);
    }
}
//# sourceMappingURL=lensSearch.js.map