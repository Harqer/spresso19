import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";

const files = {
  app: readFileSync("src/App.tsx", "utf8"),
  tracker: readFileSync("src/components/OrdersTracker.tsx", "utf8"),
  checkout: readFileSync("src/components/HITLCheckoutModal.tsx", "utf8"),
  convexState: readFileSync("src/lib/convexState.ts", "utf8"),
  contract: readFileSync("convex/commerce/checkout.ts", "utf8"),
  actions: readFileSync("convex/commerce/actions.ts", "utf8"),
};

test("orders UI reads and mutates through Convex only", () => {
  assert.match(files.tracker, /useConvexOrders/);
  assert.match(files.convexState, /api\.commerce\.checkout\.listOrders/);
  assert.doesNotMatch(files.tracker, /firebase\/functions|httpsCallable|useQuery\(/);
  assert.doesNotMatch(files.app, /authFetch\([^)]*\/api\/orders/);
  assert.doesNotMatch(files.app, /fetchInventoryAndOrders/);
});

test("checkout state owns listing snapshots and authenticated mutations", () => {
  assert.match(files.contract, /acquireCheckoutAttempt/);
  assert.match(files.contract, /setOrderReminder/);
  assert.match(files.contract, /requestReturn/);
  assert.match(files.contract, /requireFirebaseIdentity/);
  assert.match(files.contract, /by_token_identifier/);
  assert.match(files.actions, /merchantQuote/);
  assert.match(files.actions, /createPaymentIntent/);
  assert.doesNotMatch(files.checkout, /firebase\/firestore|httpsCallable/);
  assert.doesNotMatch(files.checkout, /"prepareCheckout"/);
});

test("no fake order success or client-owned payment path remains", () => {
  assert.doesNotMatch(files.tracker, /success\s*:\s*true|data\.success/);
  assert.doesNotMatch(files.checkout, /firebase\/firestore|httpsCallable|getDocs\(|collection\(/);
  assert.match(files.convexState, /api\.commerce\.checkout\.listOrders/);
});
