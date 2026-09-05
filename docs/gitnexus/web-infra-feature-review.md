# Web and Terraform feature review

Date: 2026-09-04  
Scope: React/Vite web surface, `src/**`, `terraform/**`, and related tests/scripts.  
Decision rule: merge only behavior that has a real production boundary, correct ownership, and verification. A TypeScript build alone is not sufficient.

## Verification evidence

Fresh checks run in parallel from the repository root:

- `npm run lint` — passed (`tsc --noEmit`).
- `npm run build` — passed; Vite transformed 935 modules. It reports a large-chunk warning for `Logger` (675.88 kB gzip 200.48 kB), so performance work remains.
- `node --test scripts/test/*.test.mjs` — passed: 9 tests, 0 failures.
- `terraform -chdir=terraform fmt -check` — passed as part of the command chain.
- `terraform -chdir=terraform validate` — blocked by the checked-in Google/Google-beta provider failing plugin schema negotiation. This is an environment/provider verification blocker, not a validation pass.

## Decision matrix

| Feature group | Decision | Evidence and reason | Merge boundary |
|---|---|---|---|
| Discovery/catalog | **MERGE** | `src/lib/discoveryRepository.ts` calls the real `discoverPersonalizedProducts` callable, validates HTTPS merchant URLs, normalizes provider evidence/expiry, debounces and cancels requests. `src/test/discoveryRepository.test.tsx`, `discovery-boundary.test.mjs`, and `discovered-listing-contract.test.mjs` cover identity, cancellation, unknown prices, and the no-owned-inventory rule. | Merge repository/catalog components and their contract tests. Keep merchant price/availability verification at checkout. |
| Chat/personal shopper | **MERGE with boundary follow-up** | `PersonalAIShopperChatPage.tsx` streams from the authenticated `chatStream` endpoint and starts the same verified discovery repository for product results. `production-smoke`, `no-synthetic-success`, function-contract, and action-contract tests pass. | Merge streaming/discovery behavior. Keep AI limited to research/preparation; checkout and payment remain user-confirmed. Add a direct stream-envelope test before release. |
| Wardrobe and liked/bookmarked collections | **MERGE** | `WardrobeViewPage.tsx` has real tabs for owned wardrobe items, bookmarks, likes, outfits, and gallery; `useWardrobeState.ts`/gallery hooks call backend connectors. The removed `WardrobePage.tsx` is not needed by the active route. | Merge `WardrobeViewPage`, state/hooks, and focused tests. Do not treat discovery listings as owned inventory. |
| Orders | **MERGE with release gate** | `OrdersTracker.tsx` uses authenticated `getUserOrders`, parses `GetOrdersResponseSchema`, and calls real reminder, return, and Google Wallet functions with user-facing errors. | Merge after confirming deployed callable names and adding a return/permission integration test. No client-created order success is present in this surface. |
| Stripe checkout | **HOLD** | `HITLCheckoutModal.tsx` uses `prepareCheckout`, Stripe Elements, an idempotency key, and polls for a server-written webhook order. However it reads a product document from Firestore, displays a pre-quote total, has a duplicate `return context`, and labels Google Pay while using the generic Stripe PaymentElement. These need a single verified quote/order contract before merge. | Merge only with server quote as the sole displayed amount, verified listing ownership, signed-webhook evidence, and explicit card/wallet confirmation tests. |
| Coinbase/crypto checkout | **DISCARD from this slice / HOLD for a new implementation** | The Coinbase button is deliberately disabled and reports “USDC setup required”; no Coinbase SDK/payment invocation exists. Retaining the UI implies a capability that is not available. | Remove the unavailable option from this web slice, or reintroduce it only with the approved Coinbase integration, provider capability check, user confirmation, and server settlement boundary. |
| Profile payment cards | **DISCARD current add-card implementation** | `PaymentCardsWidget.tsx:31-43` accepts a card-number field and sends the entered value as `stripePaymentMethodId`, fabricates `brand: "Visa"`/`last4`, and has no customer-facing error. This violates the payment boundary and risks PAN handling. Listing/removing server tokenized methods may be retained only after the unsafe add flow is removed. | Replace with Stripe Elements/SetupIntent or remove “Add Card”; never send raw card data to Firebase/Data Connect. |
| Vision/camera discovery | **HOLD** | `CameraObjectDetectionModal.tsx` and `GoogleLensScreenWidgetModal.tsx` call real `lensSearch` and preserve `VERIFY_AT_MERCHANT_CHECKOUT`, with discovery contract coverage. But camera permission/error/device coverage is absent from this web audit, and these are separate from required Android CameraX/DAT validation. | Merge only the provider-boundary pieces; hold release until capture denial, upload failure, malformed result, and merchant-link tests are added. |
| Settings/theme/location/auth | **MERGE** | `firebase.ts`, `DynamicThemePickerModal.tsx`, `LocationPermissionModal.tsx`, and `AuthScreen.tsx` use Firebase auth/preferences and user-facing failure handling. Identity/config tests pass and canonical project references resolve to `get-spresso`. | Merge with existing auth/preferences tests. Keep secrets server-side. |
| Grocery | **HOLD** | `GroceryListView.tsx` uses real Data Connect list operations and routes products to the cart, but it defaults missing schema fields (`quantity`, category, estimated price) client-side and needs a clear listing/merchant quote path. | Merge list CRUD only after schema defaults are explicit and “estimated” values cannot be mistaken for merchant price/availability. |
| Travel and expenses | **HOLD** | Trip/event/expense queries and `createTravelExpense` are real connectors. Receipt parsing calls the deployed function URL, but `handleReceiptUpload` inserts a client-only `exp-receipt-*` record and does not persist the parsed expense. Voice recording always sets an error (`toggleRecording`), so that feature is scaffolded. | Merge read/add-expense paths after error UX tests. Rework receipt persistence and implement or remove voice recording before release. |
| React/Vite routing/config | **MERGE** | Route modules are thin canonical exports; Vite uses ESM-safe `fileURLToPath`, manifest output, and existing bundle-budget test. Lint/build and web boundary tests pass. | Merge routing/config. Track the large `Logger` chunk as performance work, not a reason to discard feature code. |
| Terraform approved Google boundary | **HOLD** | `terraform/main.tf` removes Cloud SQL/Redis and retains Spanner catalog, Cloud Run tool server, Secret Manager, and Agent Engine staging, matching the Firestore-first/no-inventory architecture. It also creates an empty Spanner database, uses `INGRESS_TRAFFIC_ALL`, and binds only a subset of declared secrets to Cloud Run. Provider schema validation is blocked. | Merge only after provider validation, plan review against `get-spresso`, restrictive ingress/auth decision, and complete secret binding audit. |
| Terraform legacy/generated material | **DISCARD** | `terraform/tfplan` and generated artifacts were identified as non-source outputs and are not required by active web imports/tests. | Keep generated plans/artifacts out of source merges; regenerate in CI/release tooling. |

## Recommended merge set

Merge the discovery/catalog, chat streaming, wardrobe collection, orders, auth/settings, and Vite routing/config groups with their passing tests. Merge only the safe portions of vision and grocery after the noted boundary tests are added.

Do not merge the current payment-card add flow, the disabled Coinbase claim, client-only receipt records, always-failing voice-note control, or Terraform until its provider/plan/security gates pass. No production deletion is authorized by this report; archive candidates need a separate checkpoint and graph comparison.

## Cleanup order

1. Split the merge set into domain commits so GitNexus compares one feature boundary at a time.
2. Remove or replace the unsafe payment-card form before any web release.
3. Resolve Stripe quote/display semantics and Coinbase capability ownership.
4. Persist receipt parsing through the authenticated backend or remove the action; implement voice recording only with a real backend path.
5. Reinitialize/validate Terraform providers, run a plan for `get-spresso`, and review Cloud Run ingress and secret bindings.
6. Run `gitnexus detect-changes --scope compare --base-ref main` after each domain commit; do not interpret the current aggregate dirty-tree critical result as a feature-level result.
