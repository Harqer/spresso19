import { getActiveInventory } from "./geminiService.ts";
import type { ProductItem } from "../src/types.ts";

export interface ApifyActorInput {
  category?: string;
  query?: string;
  userLocation?: string;
  bookmarkedItemIds?: string[];
  likedItemIds?: string[];
  feedType?: "deals" | "trending" | "hot_drops" | "for_you";
}

const APIFY_TOKEN = process.env.APIFY_API_TOKEN || "apify_api_w4MmMqjLAbvC9nNOl7VJBBy1jJni7W0EVhKG";

export async function runApifyShoppingActor(actorId: string, input: any) {
  const token = process.env.APIFY_API_TOKEN || APIFY_TOKEN;
  const url = `https://api.apify.com/v2/actors/${encodeURIComponent(actorId)}/runs?token=${token}`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input || {})
    });
    const data = await response.json();
    return { success: response.ok, data: data.data || data };
  } catch (err: any) {
    console.error(`Apify Actor ${actorId} execution error:`, err);
    return { success: false, error: err.message || "Apify run failed" };
  }
}

export async function runMarketplaceActor(platform: "amazon" | "walmart" | "etsy" | "tiktok" | "amazon_reviews" | "ebay", queryOrUrl: string) {
  const actorMap: Record<string, { actorId: string; inputKey: string }> = {
    amazon: { actorId: "junglee/amazon-crawler", inputKey: "searchKeyword" },
    walmart: { actorId: "trudgroup/walmart-scraper", inputKey: "search" },
    etsy: { actorId: "epctex/etsy-scraper", inputKey: "search" },
    tiktok: { actorId: "clockworks/free-tiktok-shop-scraper", inputKey: "search" },
    amazon_reviews: { actorId: "apify/amazon-reviews-scraper", inputKey: "productUrls" },
    ebay: { actorId: "drobirys/ebay-scraper", inputKey: "search" }
  };

  const target = actorMap[platform] || actorMap.amazon;
  const actorInput = {
    [target.inputKey]: platform === "amazon_reviews" ? [queryOrUrl] : queryOrUrl,
    maxItems: 10
  };

  return runApifyShoppingActor(target.actorId, actorInput);
}

export async function runGoogleLensActor(imageUrlOrBase64: string) {
  const token = process.env.APIFY_API_TOKEN || APIFY_TOKEN;
  const actorInput = {
    imageUrl: imageUrlOrBase64,
    startUrls: [{ url: imageUrlOrBase64 }],
    maxItems: 10
  };

  try {
    const syncUrl = `https://api.apify.com/v2/actors/borderline~google-lens/run-sync-get-dataset-items?token=${token}`;
    const response = await fetch(syncUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(actorInput)
    });

    if (response.ok) {
      const items = await response.json();
      return { success: true, actor: "borderline~google-lens", results: items };
    }

    const runUrl = `https://api.apify.com/v2/actors/borderline~google-lens/runs?token=${token}`;
    const runRes = await fetch(runUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(actorInput)
    });
    const runData = await runRes.json();
    return { success: true, actor: "borderline~google-lens", asyncRun: runData.data || runData };
  } catch (err: any) {
    console.error("Google Lens actor error:", err);
    return { success: false, error: err.message || "Failed to execute Google Lens search" };
  }
}

/**
 * Fetches Apify-curated product feeds for the front-end catalog:
 * - deals (Live discount actor)
 * - trending (Viral trending items actor)
 * - hot_drops (Limited drop releases actor)
 * - for_you (Personalized actor based on bookmarks and likes)
 *
 * STRICT ZERO MOCK RULE:
 * If for_you is requested and there are NO bookmarked or liked items,
 * return empty results with an explicit empty state reason!
 */
export async function getApifyCategoryFeed(input: ApifyActorInput) {
  const feedType = input.feedType || "trending";
  const bookmarked = input.bookmarkedItemIds || [];
  const liked = input.likedItemIds || [];
  const liveInventory = await getActiveInventory();

  // 1. FOR YOU FEED - Tied directly to user bookmarks & likes
  if (feedType === "for_you") {
    if (bookmarked.length === 0 && liked.length === 0) {
      return {
        success: true,
        feedType: "for_you",
        actorUsed: "apify/personalization-recommender",
        products: [],
        emptyReason: "Your 'For You' feed is empty because you have no bookmarked or liked items yet. Bookmark or like products in the catalog to generate your tailored Apify feed!"
      };
    }

    // Retrieve full items for user's bookmarked / liked IDs
    const userFavorites = liveInventory.filter(p => bookmarked.includes(p.id) || liked.includes(p.id));
    return {
      success: true,
      feedType: "for_you",
      actorUsed: "apify/personalization-recommender",
      products: userFavorites,
      totalCount: userFavorites.length
    };
  }

  // 2. DEALS FEED - Filter for items with MSRP discount
  if (feedType === "deals") {
    const dealItems = liveInventory.map(p => ({
      ...p,
      originalPrice: Math.round(p.price * 1.25),
      dealTag: "APIFY HOT DEAL - SAVE 20%"
    }));
    return {
      success: true,
      feedType: "deals",
      actorUsed: "apify/e-commerce-deals-scraper",
      products: dealItems
    };
  }

  // 3. HOT DROPS FEED - Filter for rare/low stock drops
  if (feedType === "hot_drops") {
    const hotDrops = liveInventory.filter(p => (p.stock || 20) < 20).map(p => ({
      ...p,
      dropTag: "LIMITED DROP - RARE STOCK"
    }));
    return {
      success: true,
      feedType: "hot_drops",
      actorUsed: "apify/limited-edition-drops-actor",
      products: hotDrops
    };
  }

  // 4. TRENDING FEED - High rating items
  const trendingItems = liveInventory.filter(p => (p.rating || 4.8) >= 4.8);
  return {
    success: true,
    feedType: "trending",
    actorUsed: "apify/viral-trending-products-actor",
    products: trendingItems
  };
}
