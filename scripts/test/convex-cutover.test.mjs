import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(path, "utf8");
const convexApi = read("composeApp/src/commonMain/kotlin/network/ConvexApi.kt");
const catalog = read("composeApp/src/commonMain/kotlin/components/features/catalog/ProductCatalogPage.kt");
const orders = read("composeApp/src/commonMain/kotlin/components/features/orders/OrdersTrackerPage.kt");
const travel = read("composeApp/src/commonMain/kotlin/components/features/travel/TravelTripsPage.kt");
const grocery = read("composeApp/src/commonMain/kotlin/components/features/grocery/GroceryListPage.kt");
const bridge = read("convex/http.ts");
const discovery = read("convex/discovery.ts");
const schema = read("convex/schema.ts");

test("KMP discovery is external-provider driven through the Convex bridge", () => {
  assert.match(convexApi, /\/api\/discovery\/search/);
  assert.match(convexApi, /\/api\/discovery\/recommendations/);
  assert.match(catalog, /fetchRecommendedProducts/);
  assert.match(catalog, /searchProducts/);
  assert.match(discovery, /Parallel|SerpAPI|fetchWithSource/);
  assert.doesNotMatch(discovery, /defineTable\(["']products/);
});

test("user commerce state is authenticated and scoped in Convex", () => {
  assert.match(bridge, /getUserIdentity/);
  assert.match(bridge, /\/api\/orders/);
  assert.match(bridge, /\/api\/saved/);
  assert.match(bridge, /\/api\/cart/);
  assert.match(schema, /savedProducts: defineTable/);
  assert.match(schema, /orders: defineTable/);
});

test("orders, travel, and grocery screens use the Convex transport", () => {
  assert.match(orders, /ConvexApi/);
  assert.match(orders, /fetchOrders/);
  assert.match(travel, /fetchTravelTrips/);
  assert.match(grocery, /fetchGroceryList/);
  assert.match(grocery, /Unable to load your grocery list/);
});
