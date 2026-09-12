export type ShopperModel = "googleai/gemini-3.1-flash-lite-preview" | "googleai/gemini-3.1-pro-preview";

const STRONG_REASONING_PHRASES = [
  "deep research", "mix and match", "virtual try-on", "try on", "wardrobe",
  "outfit", "style me", "compare", "comparison", "tradeoff",
];

const WEAK_REASONING_TERMS = [
  "fit", "fabric", "height", "weight", "size", "location", "why",
];

function countMatches(prompt: string, terms: readonly string[]): number {
  return terms.filter((term) => prompt.includes(term)).length;
}

function isStrongReasoningPrompt(prompt: string): boolean {
  const normalized = prompt.toLowerCase();
  const strongMatches = countMatches(normalized, STRONG_REASONING_PHRASES);
  const weakMatches = countMatches(normalized, WEAK_REASONING_TERMS);
  return strongMatches > 0 || strongMatches + weakMatches >= 2;
}

export function selectShopperModel(prompt: string): ShopperModel {
  return isStrongReasoningPrompt(prompt)
    ? "googleai/gemini-3.1-pro-preview"
    : "googleai/gemini-3.1-flash-lite-preview";
}

export type NemotronRoutingInput = {
  prompt: string;
  imageUrls?: readonly string[];
  videoUrls?: readonly string[];
};

/**
 * Nemotron is reserved for multimodal or strong-reasoning requests. This is
 * an eligibility decision only; configuration and provider availability are
 * checked by the gateway at execution time.
 */
export function shouldUseNemotron(input: NemotronRoutingInput): boolean {
  const hasMedia = (input.imageUrls?.length ?? 0) > 0 || (input.videoUrls?.length ?? 0) > 0;
  if (hasMedia) return true;
  return isStrongReasoningPrompt(input.prompt);
}
