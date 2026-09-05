import assert from "node:assert/strict";
import test from "node:test";
import { validateActionContract } from "../verify-action-contract.mjs";

const validAction = {
  id: "lens-search",
  callback: "performLensSearch",
  client: { file: "composeApp/src/commonMain/kotlin/network/ApiClient.kt", symbol: "performLensSearch" },
  platforms: ["android", "wasm"],
  screen: "vision",
  backendContract: "lensSearch",
  successState: "show verified merchant listings",
  emptyState: "show no matches",
  failureState: "show customer-safe unavailable message",
  owner: "discovery",
  transport: { kind: "firebase-callable", export: "lensSearch" },
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

test("accepts an action whose callback and Firebase callable are real", () => {
  const errors = validateActionContract(
    validContract,
    { exportedFunctions: new Set(["lensSearch"]), sourceFiles: new Map([[validAction.client.file, "suspend fun performLensSearch() = Unit"]]) },
  );

  assert.deepEqual(errors, []);
});

test("rejects empty callbacks and missing Firebase callable exports", () => {
  const errors = validateActionContract(
    {
      ...validContract,
      actions: [
        { ...validAction, callback: "", transport: { kind: "firebase-callable", export: "missingCallable" } },
        ...validContract.actions.slice(1),
      ],
    },
    { exportedFunctions: new Set(["lensSearch"]), sourceFiles: new Map([[validAction.client.file, "suspend fun performLensSearch() = Unit"]]) },
  );

  assert.match(errors.join("\n"), /callback must be a non-empty string/);
  assert.match(errors.join("\n"), /missingCallable is not exported/);
});

test("rejects actions missing production ownership and state contracts", () => {
  const incomplete = { ...validAction };
  delete incomplete.platforms;
  delete incomplete.successState;
  delete incomplete.owner;
  const errors = validateActionContract(
    { version: 1, actions: requiredActionIds.map(id => ({ ...incomplete, id })) },
    { exportedFunctions: new Set(["lensSearch"]), sourceFiles: new Map() },
  );

  assert.match(errors.join("\n"), /platforms/);
  assert.match(errors.join("\n"), /successState/);
  assert.match(errors.join("\n"), /owner/);
});
