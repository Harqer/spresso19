import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const page = readFileSync("src/components/features/catalog/ProductCatalogPage.tsx", "utf8");
const grid = readFileSync("src/components/features/catalog/ProductCatalogGrid.tsx", "utf8");
const card = readFileSync("src/components/features/catalog/ProductCatalogCard.tsx", "utf8");
const state = readFileSync("src/lib/convexState.ts", "utf8");

 test("catalog preference reads use Convex and contain no Firebase callable or local fallback", () => {
  assert.match(page, /useConvexCatalogState/);
  assert.match(page, /listSavedProducts|savedProducts/);
  assert.match(page, /listLikedProducts|likedProducts/);
  assert.doesNotMatch(page, /httpsCallable|firebase\/functions|getUserPreferences|localStorage|DataConnect|Firestore/);
});

test("catalog bookmark and like actions call typed parent-owned mutations", () => {
  assert.match(page, /setSavedProduct/);
  assert.match(page, /setLikedProduct/);
  assert.match(grid, /onToggleBookmark/);
  assert.match(grid, /onToggleLike/);
  assert.match(card, /aria-label=\{bookmarked \? "Remove bookmark"/);
  assert.match(card, /aria-label=\{liked \? "Unlike product"/);
  assert.doesNotMatch(grid, /httpsCallable|firebase\/functions|localStorage/);
});

test("catalog state remains bounded and authenticated", () => {
  assert.match(state, /useConvexCatalogState/);
  assert.match(state, /CONVEX_LIST_LIMIT = 100/);
  assert.match(state, /isAuthenticated \? \{ limit: CONVEX_LIST_LIMIT \} : "skip"/);
});
