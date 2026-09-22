import assert from "node:assert/strict";
import test from "node:test";
import { validateActionContract } from "../verify-action-contract.mjs";

const validAction = {
  id: "lens-search",
  callback: "ConvexApi.searchVision",
  platforms: ["android", "wasm"],
  screen: "vision",
  backendContract: "/api/vision/search (Convex vision.searchByImage)",
  successState: "show verified merchant listings",
  emptyState: "show no matches",
  failureState: "show customer-safe unavailable message",
  owner: "discovery",
  transport: { kind: "convex-bridge", route: "/api/vision/search" },
};

const requiredActionIds = [
  "lens-search",
  "catalog-discovery",
  "cart-add",
  "cart-remove",
  "merchant-handoff",
  "virtual-try-on",
  "profile-save",
  "wardrobe-save",
  "grocery-toggle",
  "travel-receipt-parse",
  "orders-refresh",
  "passkey-registration",
];
const validContract = {
  version: 1,
  actions: requiredActionIds.map(id => ({ ...validAction, id })),
};

test("accepts an action whose callback and Convex bridge route are real", () => {
  const errors = validateActionContract(
    validContract,
    { bridgeRoutes: new Set(["/api/vision/search"]) },
  );

  assert.deepEqual(errors, []);
});

test("rejects empty callbacks and unregistered bridge routes", () => {
  const errors = validateActionContract(
    {
      ...validContract,
      actions: [
        { ...validAction, callback: "", transport: { kind: "convex-bridge", route: "/api/not-registered" } },
        ...validContract.actions.slice(1),
      ],
    },
    { bridgeRoutes: new Set(["/api/vision/search"]) },
  );

  assert.match(errors.join("\n"), /callback must be a non-empty string/);
  assert.match(errors.join("\n"), /\/api\/not-registered is not registered in convex\/http\.ts/);
});

test("rejects actions missing production ownership and state contracts", () => {
  const incomplete = { ...validAction };
  delete incomplete.platforms;
  delete incomplete.successState;
  delete incomplete.owner;
  const errors = validateActionContract(
    { version: 1, actions: requiredActionIds.map(id => ({ ...incomplete, id })) },
    { bridgeRoutes: new Set(["/api/vision/search"]) },
  );

  assert.match(errors.join("\n"), /platforms/);
  assert.match(errors.join("\n"), /successState/);
  assert.match(errors.join("\n"), /owner/);
});
