import { describe, expect, test } from "vitest";
import { deriveRecommendationQueries, productKeyWords } from "./recommendationQueries";

const empty = {
  searchInquiries: [],
  vibes: [],
  savedProductIds: [],
  likedProductIds: [],
  recentOrderNames: [],
};

describe("recommendation query derivation", () => {
  test("empty durable context yields no queries", () => {
    expect(deriveRecommendationQueries(empty)).toEqual([]);
  });

  test("latest search inquiry is prioritized, with lower tiers filling remaining slots", () => {
    const queries = deriveRecommendationQueries({
      ...empty,
      searchInquiries: ["running shoes", "waterproof jacket"],
      vibes: ["minimal"],
      likedProductIds: ["parallel:abc123"],
    });
    expect(queries).toEqual(["waterproof jacket", "minimal fashion", "abc123 style"]);
  });

  test("vibes are joined into one query capped at three", () => {
    const queries = deriveRecommendationQueries({
      ...empty,
      vibes: ["minimal", "streetwear", "techwear", "cottagecore"],
    });
    expect(queries).toEqual(["minimal streetwear techwear fashion"]);
  });

  test("saved and liked product keys are deduplicated and stripped of source", () => {
    const queries = deriveRecommendationQueries({
      ...empty,
      savedProductIds: ["parallel: listing-9", "serpapi:listing-9"],
      likedProductIds: ["kitesurf:trainer-x"],
    });
    expect(queries).toEqual(["listing-9 trainer-x style"]);
  });

  test("orders produce a similarity query capped at two names", () => {
    const queries = deriveRecommendationQueries({
      ...empty,
      recentOrderNames: ["Trail Runner", "Rain Shell", "Extra"],
    });
    expect(queries).toEqual(["similar to Trail Runner and Rain Shell"]);
  });

  test("inquiry beats vibe, but affinity fills remaining slots", () => {
    const queries = deriveRecommendationQueries({
      ...empty,
      searchInquiries: ["wool coat"],
      vibes: ["outdoor"],
      savedProductIds: ["parallel:hiking-boots"],
    });
    expect(queries).toEqual(["wool coat", "outdoor fashion", "hiking-boots style"]);
  });

  test("productKeyWords keeps provider ids without a source prefix intact", () => {
    expect(productKeyWords("parallel:abc:def")).toBe("abc:def");
    expect(productKeyWords("plain-id")).toBe("plain-id");
    expect(productKeyWords("parallel:  ")).toBe("");
  });
});
