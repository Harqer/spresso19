/**
 * Pure recommendation-query derivation — no Convex runtime, no providers.
 *
 * Durable user state is the only input; the output is the small set of
 * external search queries the discovery actions fan out through their
 * provider tools. Explicit recent intent (search inquiries) beats durable
 * taste (vibes), which beats affinity hints (saved/liked product keys and
 * order names). Empty input yields no queries: the caller reports honestly
 * that no durable context exists rather than returning generic filler.
 */

export type RecommendationInputs = {
  searchInquiries: readonly string[];
  vibes: readonly string[];
  savedProductIds: readonly string[];
  likedProductIds: readonly string[];
  recentOrderNames: readonly string[];
};

/** Extract the human-readable part of a `source:providerListingId` product key. */
export function productKeyWords(productId: string): string {
  const withoutSource = productId.includes(":") ? productId.split(":").slice(1).join(":") : productId;
  return withoutSource.trim();
}

export function deriveRecommendationQueries(inputs: RecommendationInputs): string[] {
  const inquiries = inputs.searchInquiries.map((inquiry) => inquiry.trim()).filter(Boolean);
  const vibes = inputs.vibes.map((vibe) => vibe.trim()).filter(Boolean).slice(0, 3);
  const productWords = [
    ...new Set(
      [...inputs.savedProductIds, ...inputs.likedProductIds].map(productKeyWords).filter(Boolean),
    ),
  ].slice(0, 3);
  const orderNames = inputs.recentOrderNames.map((name) => name.trim()).filter(Boolean).slice(0, 2);

  const queries: string[] = [];
  if (inquiries.length > 0) queries.push(inquiries[inquiries.length - 1]);
  if (vibes.length > 0) queries.push(`${vibes.join(" ")} fashion`);
  if (productWords.length > 0) queries.push(`${productWords.join(" ")} style`);
  if (orderNames.length > 0) queries.push(`similar to ${orderNames.join(" and ")}`);
  return queries.slice(0, 3);
}
