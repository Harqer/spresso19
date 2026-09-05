"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.selectShopperModel = selectShopperModel;
const STRONG_REASONING_PHRASES = [
    "deep research", "mix and match", "virtual try-on", "try on", "wardrobe",
    "outfit", "style me", "compare", "comparison", "tradeoff",
];
const WEAK_REASONING_TERMS = [
    "fit", "fabric", "height", "weight", "size", "location", "why",
];
function selectShopperModel(prompt) {
    const normalized = prompt.toLowerCase();
    let strongHits = 0;
    let weakHits = 0;
    for (const phrase of STRONG_REASONING_PHRASES) {
        if (normalized.includes(phrase))
            strongHits += 1;
    }
    for (const term of WEAK_REASONING_TERMS) {
        if (normalized.includes(term))
            weakHits += 1;
    }
    const shouldUsePro = strongHits >= 1 || strongHits + weakHits >= 2;
    return shouldUsePro
        ? "googleai/gemini-3.1-pro-preview"
        : "googleai/gemini-3.1-flash-lite-preview";
}
//# sourceMappingURL=modelRouting.js.map