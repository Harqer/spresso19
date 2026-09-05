# Backend feature review

Review scope: `functions/src/**`, `functions/test/**`, `firebase.json`, Firestore/Storage rules, and related backend configuration. This is a merge decision report, not a production change. Findings are based on source inspection and the available local verification; no provider deployment or live payment was performed.

## Decision summary

| Feature group | Decision | Evidence and merge condition |
| --- | --- | --- |
| Product discovery and provider normalization | MERGE | `discoveryTypes.ts`, provider adapters, and `discoveryProviders.test.ts` require HTTPS merchant URLs, normalize provider data, preserve provenance, deduplicate listings, and reject model-invented evidence. No owned inventory fields are added. |
| Kitesurf merchant research/staging | HOLD | `kitesurfService.ts` has HTTPS/domain allowlisting, request/time limits, redaction, and an explicit stop-before-order contract. Production requires a non-empty `KITESURF_ALLOWED_DOMAINS` configuration and a live Cloudflare Browser Run integration test. `prepareCheckout` currently calls staging with empty options, so an unconfigured allowlist fails closed. |
| Cart intent and legacy cart migration | MERGE | `addListingToCart.ts` uses a Firestore transaction and UUID idempotency records; snapshots retain listing metadata only. `cartQuoteBoundary.test.ts`, `webCartBoundary.test.ts`, and `legacyAddToCartBoundary.test.ts` cover no stock/reservation/availability claims and reject legacy client pricing. |
| Merchant quote boundary | MERGE WITH CHECKOUT HOLD | `merchantQuote.ts` validates canonical merchant URL, observation freshness, currency, positive integer cents, and quantity totals. It is a good boundary, but it must be exercised against the configured merchant provider before enabling payment. |
| Stripe checkout and webhook reconciliation | HOLD | The server rejects client prices and creates Stripe PaymentIntents with an idempotency key; signed webhooks verify the event, match the purchase attempt, compare amount/currency, deduplicate events, and create user-scoped orders only after payment success. Blockers: `prepareCheckout` reads `stripePublishableKey.value()` but does not include `stripePublishableKey` in its function `secrets` binding; and the Firestore transaction performs external merchant/Stripe calls inside the transaction callback, which needs an idempotent, retry-safe design and integration test before production. |
| Retained legacy Stripe/biometric/crypto callables | MERGE AS FAIL-CLOSED COMPATIBILITY | `createStripeIntent`, `confirmPurchase`, `executeBiometricPurchase`, and `processCryptoPayment` require auth and reject client-controlled or direct merchant payment requests. Keep only while all clients have migrated to `prepareCheckout`; do not describe them as payment implementations. |
| Coinbase wallet connection | HOLD | `connectCoinbaseWallet` and the web equivalent persist a caller-supplied address after regex validation. There is no ownership/signature challenge, network/token verification, or wallet-provider proof. It must not be used to authorize payment until a verified connection flow exists. |
| CDP agent-wallet transfer | HOLD / SECURITY BLOCKER | Preparation, amount caps, network allowlist, locked destination/amount, and replay tests are present in `agentWallet.ts` and `agentWalletBoundary.test.ts`. However, transfer records are keyed only by `idempotencyKey`, not `(uid, idempotencyKey)`, and the callable does not pass the authenticated UID into the service. A user who knows another user's key may access or confirm that record. The arbitrary `userConfirmationToken` is also not cryptographically bound to a recent authenticated confirmation. Do not merge as executable wallet payment. |
| AI discovery/chat/Genkit | HOLD FOR PROVIDER VERIFICATION | Auth/App Check, budget counters, cache TTLs, provider provenance, customer-safe streaming text, and schema validation are present. `genkit` is pinned to `^1.41.0` and the configured model IDs are preview models. The Genkit docs/CLI and current provider model availability must be verified before release; add non-networked flow contracts and a live smoke test. |
| AI media / Higgsfield fallback / VTO | HOLD | Provider fallback, budget accounting, bounded media decode/download, Storage persistence, signed URLs, and job metadata are implemented. Provider model/endpoint contracts, output content types, signed URL lifecycle, and failure/retry behavior still need live integration evidence. |
| Orders | HOLD | User-scoped reads and signed Stripe webhook creation exist. Order status/return/reminder actions need end-to-end verification against the same canonical order shape and provider lifecycle; no direct client order creation should be enabled. |
| Wardrobe likes/bookmarks | MERGE | User-scoped subcollections, transaction idempotency, and App Check/auth checks are implemented. These are user preference records, not inventory. The global `idempotency_keys` collection should eventually be user-namespaced to avoid cross-user key collisions. |
| Firestore/Storage rules | MERGE WITH RULES TEST GATE | Default deny, owner-only nested orders, and server-only wallet records are covered by `rules.test.js`. Run emulator-backed rules tests in CI; source-text tests alone do not prove deployed rules behavior. |
| Firebase hosting/API config | HOLD | `firebase.json` correctly names site `get-spresso` and routes `/api/**` to `webApi`, while preserving Firestore/Storage rules. Removed stale Cloud Run rewrites are consistent with the current source, but deployment must verify that `webApi`, Auth providers, App Check, and the `get-spresso.web.app` site are actually live. |
| Data Connect | HOLD / LEGACY BOUNDARY | `users.ts` account deletion still executes Data Connect mutations and `catalog.ts` imports generated Data Connect trips. Removing the `dataconnect` block from `firebase.json` does not remove runtime dependencies. Keep until callers are migrated or the Data Connect deployment is verified. |
| Generated `functions/lib/**` | DISCARD FROM REVIEWED SOURCE (REGENERATE) | `functions/package.json` builds `src` to `lib`; generated JS/maps should not be selected as independent feature implementations. Keep only reproducible build output required by deployment and exclude stale duplicate trees from merge decisions. |
| Stale policy/config references | HOLD | `policy.json` still contains `spresso-5561f`; `functions/src/database/spannerClient.ts` defaults to `spresso-19`. These are prohibited legacy identifiers under project instructions and require verified configuration ownership before cleanup. |

## Verification executed

- `cd functions && npm run build` — passed locally.
- Focused boundary suite was attempted with `npx tsx --test`; the sandbox denied `tsx`'s temporary IPC pipe (`listen EPERM`), so that invocation is not evidence of a pass. Existing prior evidence recorded focused cart/wallet tests as passing, but they should be rerun in CI or an environment permitting the test runner.
- `git diff --check -- functions/src functions/test firebase.json firestore.rules storage.rules policy.json` — passed.

## Merge ordering

1. Merge discovery normalization, cart intent, provider provenance, and fail-closed compatibility callables with their tests.
2. Fix and test the Stripe secret binding and redesign/verify checkout transaction side effects; only then merge the checkout UI/backend pair.
3. Keep Kitesurf staging behind verified domain configuration and a live provider smoke test.
4. Do not merge executable CDP transfers or Coinbase wallet authorization until UID scoping and cryptographic/recent-auth confirmation are implemented.
5. Resolve Data Connect and stale project-ID ownership before deleting any remaining source.
6. Regenerate `functions/lib` from the selected source during the release build; do not merge generated duplicates as separate feature work.

## Overall recommendation

Merge the discovery/cart/rules foundations and fail-closed compatibility behavior. Hold all payment execution, wallet authorization, live AI/media provider paths, Data Connect cleanup, and stale project configuration until the blockers above have direct tests and verified environment evidence. No backend group is recommended for permanent discard solely because GitNexus reports low usage; dynamic imports and deployed clients remain possible.
