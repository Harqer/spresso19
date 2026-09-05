# Web Cart and Merchant Handoff Correction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make catalog checkout add a verified listing exactly once, open the cart, provide a real HTTPS merchant handoff, and reject malformed or internally inconsistent persisted cart state.

**Architecture:** Keep user-completed merchant checkout as the only purchase path. A small web orchestration seam coordinates “add once, then open cart,” while `CartDrawer` renders a real HTTPS link. A shared cart-state helper keeps the UI quantity and embedded listing-snapshot quantity synchronized, and the HTTP cart boundary validates and sanitizes the complete payload before Firestore persistence.

**Tech Stack:** React 19, TypeScript, Node test runner through `tsx`, Zod, Firebase Functions v2, Firestore.

**Spec:** `docs/superpowers/specs/2026-08-30-discovery-routing-production-design.md`

## Global Constraints

- Spresso discovers listings and does not own retailer inventory.
- Unknown prices remain unknown and are never converted into a payment authority.
- Checkout is user-completed at an HTTPS merchant listing; no order or payment submission occurs.
- Catalog checkout adds the requested listing exactly once and opens the cart.
- Cart persistence accepts verified listing snapshots only and rejects mismatched duplicated quantity.
- Customer UI uses natural shopping language and never exposes backend or model jargon.
- Production failures do not fall back to mock or synthetic success.
- Run GitNexus impact analysis before changing existing symbols and change analysis before committing.

---

### Task 1: Restore a real merchant-handoff action

**Files:**
- Create: `src/lib/merchantCheckout.ts`
- Create: `src/test/merchant-checkout.test.tsx`
- Modify: `src/App.tsx`
- Modify: `src/components/CartDrawer.tsx`
- Modify: `src/components/shared/AppModalManager.tsx`
- Modify: `src/components/features/catalog/ProductCatalogPage.tsx`
- Modify: `src/components/features/catalog/ProductCatalogGrid.tsx`

**Interfaces:**
- Produces: `requestMerchantCheckout(product, actions): Promise<void>`, where `actions.addToCart` is called once before `actions.openCart`.
- Produces: `verifiedMerchantUrl(value): string | null`, accepting HTTPS only.
- Changes the catalog checkout callback to `(product: ProductItem) => void`; it no longer constructs or sends a legacy `HITLPayload`.
- `CartDrawer` renders its primary checkout action as a direct anchor to the first verified merchant listing. When a cart contains multiple listings, item-level merchant links remain available for the additional checkouts.

- [ ] **Step 1: Write the failing merchant orchestration test**

```tsx
test("catalog checkout adds the verified listing once before opening the cart", async () => {
  const events: string[] = [];
  await requestMerchantCheckout(product, {
    addToCart: async received => { assert.strictEqual(received, product); events.push("add"); },
    openCart: () => events.push("open"),
  });
  assert.deepEqual(events, ["add", "open"]);
});
```

- [ ] **Step 2: Write the failing rendered CartDrawer test**

```tsx
test("cart checkout renders a direct HTTPS merchant handoff", () => {
  const html = renderToStaticMarkup(<CartDrawer isOpen cart={[cartItem]} {...callbacks} />);
  assert.match(html, /href="https:\/\/merchant\.example\/products\/coat"/);
  assert.match(html, />Continue to merchant checkout</);
});
```

- [ ] **Step 3: Run the focused test and verify red**

Run: `npx tsx --test src/test/merchant-checkout.test.tsx`

Expected: FAIL because `src/lib/merchantCheckout.ts` and the direct handoff do not exist.

- [ ] **Step 4: Implement the minimal orchestration seam**

```ts
export type MerchantCheckoutActions = {
  addToCart: (product: ProductItem) => Promise<void>;
  openCart: () => void;
};

export async function requestMerchantCheckout(
  product: ProductItem,
  actions: MerchantCheckoutActions,
): Promise<void> {
  if (!product.listing || !verifiedMerchantUrl(product.listing.merchantUrl)) {
    throw new Error("A verified merchant listing is required.");
  }
  await actions.addToCart(product);
  actions.openCart();
}
```

- [ ] **Step 5: Wire catalog checkout to the product callback exactly once**

`ProductCatalogGrid.handleCheckout(product)` calls only `onRequestMerchantCheckout(product)`. `App` supplies a handler that calls `requestMerchantCheckout` with `handleAddToCart` and `setCartDrawerOpen(true)`. Do not call both `onAddToCart` and the merchant-checkout callback for one click.

- [ ] **Step 6: Replace the inert CartDrawer button with a direct HTTPS anchor**

Use `verifiedMerchantUrl(cart[0]?.listing.merchantUrl)` for the primary action. Remove the unused `onRequestHITLCheckout` prop from `CartDrawer` and `AppModalManager`. Preserve the per-item links so carts spanning merchants remain truthful and navigable.

- [ ] **Step 7: Run focused and web verification**

Run: `npx tsx --test src/test/merchant-checkout.test.tsx`

Run: `npm run lint`

Run: `npm run build`

Expected: all commands pass; clicking catalog checkout has exactly one add operation and the rendered cart contains a real HTTPS merchant link.

- [ ] **Step 8: Run GitNexus change analysis and commit**

Run: `node .gitnexus/run.cjs detect-changes --scope all --repo .`

Commit: `fix: restore web merchant checkout handoff`

### Task 2: Validate and synchronize persisted cart state

**Files:**
- Create: `src/lib/cartState.ts`
- Create: `src/test/cart-state.test.ts`
- Create: `functions/src/cart/webCart.ts`
- Create: `functions/test/webCartBoundary.test.ts`
- Modify: `src/App.tsx`
- Modify: `functions/src/webapi.ts`

**Interfaces:**
- Produces: `withCartQuantity(item, quantity): CartItem`, updating `item.quantity` and `item.listing.quantity` together.
- Produces: `createCartItem(product, quantity): CartItem`, requiring `product.listing` and a quantity from 1 through 25.
- Produces: `parseWebCart(body): WebCartItem[]`, returning only strict, sanitized cart items whose product ID, listing ID, top-level quantity, and snapshot quantity agree.
- The `/api/cart` POST boundary returns HTTP 400 with `{ success: false, error: "A valid cart is required." }` for invalid input and performs no Firestore write.

- [ ] **Step 1: Write the failing client cart-state test**

```ts
test("quantity updates keep the listing snapshot synchronized", () => {
  const updated = withCartQuantity(cartItem, 2);
  assert.equal(updated.quantity, 2);
  assert.equal(updated.listing.quantity, 2);
  assert.equal(cartItem.quantity, 1);
});
```

- [ ] **Step 2: Write the failing HTTP-boundary parser tests**

```ts
test("rejects mismatched duplicated quantity", () => {
  assert.throws(() => parseWebCart({ cart: [{ ...cartItem, quantity: 2 }] }));
});

test("rejects arbitrary nested product fields", () => {
  assert.throws(() => parseWebCart({ cart: [{ ...cartItem, product: { ...cartItem.product, stock: 99 } }] }));
});
```

- [ ] **Step 3: Run both focused tests and verify red**

Run: `npx tsx --test src/test/cart-state.test.ts`

Run: `cd functions && npx tsx --test test/webCartBoundary.test.ts`

Expected: FAIL because the cart-state and web-cart boundary modules do not exist.

- [ ] **Step 4: Implement immutable client cart-state helpers**

`createCartItem` calls `createCartListingSnapshot(product.listing, quantity)`. `withCartQuantity` accepts only integer quantities from 1 through 25 and returns a new object with both quantity fields set to the same value.

- [ ] **Step 5: Use the helpers in every App cart mutation**

New items use `createCartItem`. Existing additions and quantity changes use `withCartQuantity`. Removal and clearing keep their current behavior. No mutation may leave `CartItem.quantity !== CartItem.listing.quantity`.

- [ ] **Step 6: Implement the strict server parser**

Use `CartListingSnapshotSchema` for `listing`, a strict product rendering schema containing only `id`, `name`, `brand`, `category`, `price`, `currency`, `merchantUrl`, `sku`, `rating`, `description`, `image`, `virtualTryOnEligible`, `mcpServerId`, `availabilityStatus`, and `listing`, and a top-level integer `quantity` from 1 through 25. Add refinements for equal IDs, equal quantities, and equal merchant URLs. Limit the cart to 100 line items.

- [ ] **Step 7: Enforce validation before Firestore**

In `webApi`, call `parseWebCart(req.body)` before `ref.set`. On validation failure, respond with HTTP 400 and the customer-safe error above, then return. Persist only the parsed value. Do not convert malformed input to an empty successful cart.

- [ ] **Step 8: Run focused and integration verification**

Run: `npx tsx --test src/test/cart-state.test.ts`

Run: `cd functions && npx tsx --test test/webCartBoundary.test.ts`

Run: `npm run lint`

Run: `cd functions && npm run build`

Run: `npm run test:smoke`

Expected: all commands pass; malformed cart writes fail closed and valid quantity changes remain synchronized.

- [ ] **Step 9: Run GitNexus change analysis and commit**

Run: `node .gitnexus/run.cjs detect-changes --scope all --repo .`

Commit: `fix: validate persisted web cart state`

## Completion criteria

- A catalog checkout click adds one verified listing and opens the cart.
- The cart’s primary checkout action is a real HTTPS merchant link, not an inert button or in-app payment path.
- Every cart mutation keeps duplicated quantity fields synchronized.
- `/api/cart` rejects malformed, synthetic, inventory-bearing, or internally inconsistent objects before Firestore.
- Focused tests, web lint/build, Functions build, smoke checks, and GitNexus change analysis pass without concealing unrelated dirty-tree risk.
