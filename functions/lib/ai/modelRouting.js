"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.selectShopperModel = selectShopperModel;
exports.shouldUseNemotron = shouldUseNemotron;
const STRONG_REASONING_PHRASES = [
    "deep research", "mix and match", "virtual try-on", "try on", "wardrobe",
    "outfit", "style me", "compare", "comparison", "tradeoff",
];
const WEAK_REASONING_TERMS = [
    "fit", "fabric", "height", "weight", "size", "location", "why",
];
function countMatches(prompt, terms) {
    return terms.filter((term) => prompt.includes(term)).length;
}
function isStrongReasoningPrompt(prompt) {
    const normalized = prompt.toLowerCase();
    const strongMatches = countMatches(normalized, STRONG_REASONING_PHRASES);
    const weakMatches = countMatches(normalized, WEAK_REASONING_TERMS);
    return strongMatches > 0 || strongMatches + weakMatches >= 2;
}
function selectShopperModel(prompt) {
    return isStrongReasoningPrompt(prompt)
        ? "googleai/gemini-3.1-pro-preview"
        : "googleai/gemini-3.1-flash-lite-preview";
}
/**
 * Nemotron is reserved for multimodal or strong-reasoning requests. This is
 * an eligibility decision only; configuration and provider availability are
 * checked by the gateway at execution time.
 */
function shouldUseNemotron(input) {
    var _a, _b;
    var _c, _d;
    const hasMedia = ((_c = (_a = input.imageUrls) === null || _a === void 0 ? void 0 : _a.length) !== null && _c !== void 0 ? _c : 0) > 0 || ((_d = (_b = input.videoUrls) === null || _b === void 0 ? void 0 : _b.length) !== null && _d !== void 0 ? _d : 0) > 0;
    if (hasMedia)
        return true;
    return isStrongReasoningPrompt(input.prompt);
}
//# sourceMappingURL=modelRouting.js.map