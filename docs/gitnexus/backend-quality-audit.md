# Backend quality audit

Audit scope: `functions/**` and `firebase.json`. Generated orphan cleanup is recorded in `docs/gitnexus/backend-legacy-archive-2026-09-04.txt`.

## Executive result

`functions/src` is the only canonical backend source tree. `functions/lib` is the TypeScript compiler output consumed by Firebase (`functions/package.json` sets `main` to `lib/index.js`), so it must be regenerated from `src`, not selected as an alternative implementation. The nested `functions/lib/src/**` tree was a stale/legacy build output and has been archived.

The strongest production-quality areas are the current cart/quote/Stripe webhook boundary, merchant-discovery provenance validation, Kitesurf merchant handoff guardrails, and the shared test suite. The weakest areas are the legacy AI cart tool, disabled/retained payment callables, untyped compatibility routes, and generated artifacts mixed into source control.

## Evidence and scoring

Scores are relative quality/feature-richness ratings (5 = retain as the implementation baseline; 1 = archive or discard after dependency confirmation). “Complete” means implemented and guarded by a real boundary; it does not mean deployed or provider integration-tested.

| Area | Canonical path | State | Quality | Feature evidence | Recommendation |
|---|---|---:|---:|---|---|
| Function aggregation | `functions/src/index.ts` | production wiring | 5/5 | Explicit exports for orders, wardrobe, AI, payments, catalog, cart, users, web API and webhook | Retain; source of truth |
| Cart boundary | `functions/src/cart/**` | production-complete core | 5/5 | Zod listing schema, authenticated callable, quantity limits, Firestore transaction, idempotency request document, listing snapshot | Retain; add more integration coverage later |
| Web cart boundary | `functions/src/cart/webCart.ts` | production-complete validation | 5/5 | Strict schema, HTTPS merchant/image checks, quantity and listing-ID/URL consistency checks; tests cover rejection of inventory fields | Retain |
| Merchant quote / Stripe checkout | `functions/src/webhooks.ts`, `functions/src/payments/merchantQuote.ts` | production-complete core, integration pending | 5/5 | Fresh merchant quote, server-owned amount/currency, Stripe idempotency key, signed webhook, event dedupe, amount reconciliation, user-scoped order creation | Retain; require deployed Stripe/provider integration evidence before release |
| Orders | `functions/src/orders/index.ts` | production-complete user operations | 4/5 | User-scoped reads, ownership checks, idempotent return and delivery acknowledgement, status guards | Retain; improve typed Firestore data and return idempotency scope |
| Wardrobe likes/bookmarks | `functions/src/wardrobe/index.ts` | production-complete basic operations | 3/5 | Auth/App Check, user-scoped collections, toggle transactions and idempotency | Retain; reconcile duplicated preference-array API before expanding |
| Discovery providers | `functions/src/ai/providers/**`, `contracts/discoveredListing.ts`, `ai/lensSearch.ts` | production-complete adapters, provider integration pending | 4/5 | Provider normalization, HTTPS merchant provenance, deduplication, bounded results, lens contract tests | Retain |
| Kitesurf merchant routing | `functions/src/kitesurfService.ts`, `src/kitesurf/**` | production-complete safety boundary, provider integration pending | 4/5 | Domain allowlist, request limits, price parsing, explicit stop before merchant payment/order controls, staging tests | Retain; deploy only after Cloudflare credentials/domain policy verification |
| AI flows and HTTP callables | `functions/src/ai/index.ts`, `ai/flows/**` | feature-rich production path, integration pending | 4/5 | Auth/App Check checks, secrets binding, cost budgets/cache, schema-based Genkit output in flows, streaming endpoint, media boundaries | Retain; split oversized index and add provider contract tests |
| AI tool `searchProducts` | `functions/src/ai/tools/searchProducts.ts` | production discovery path | 4/5 | Auth context, budget, cache, SerpAPI normalization, no-inventory language | Retain |
| AI tool `addToCart` | `functions/src/ai/tools/addToCart.ts`, `functions/src/cart/addListingToCart.ts` | migrated onto canonical boundary | 4/5 | Requires a complete discovered listing, bounded quantity, and UUID idempotency key; delegates to the same transactional snapshot helper as `cart.addToCart`; prompt registration remains intact | Retain; add provider-to-listing contract coverage before enabling broad agent use |
| AI `ecommerceAgent` | `functions/src/ai/tools/ecommerceAgent.ts` | partial delegation | 3/5 | Authenticated delegation to personalized discovery flow; output uses `z.any()` | Retain only after typed output contract and caller audit |
| Crypto payment callables | `functions/src/payments/agentWalletCallables.ts`, `payments/agentWallet.ts` | guarded preparation/transfer boundary; merchant purchase disabled | 3/5 | Authenticated, explicit confirmation, replay/idempotency and policy checks are tested; current merchant payment callables intentionally reject direct merchant crypto purchase | Retain as wallet-transfer boundary only; do not describe as completed product checkout |
| Retired crypto AI artifact | `functions/lib/ai/tools/prepareCryptoPurchase.js` (+ map) | archived generated orphan | 1/5 | Source `functions/src/ai/tools/prepareCryptoPurchase.ts` is deleted; no current source export/caller; generated code contains an older direct-crypto preparation path | Archived under `/tmp/spresso-legacy-archive/backend`; do not restore |
| Payment compatibility callables | `functions/src/payments/index.ts` (`createStripeIntent`, `confirmPurchase`, `processCryptoPayment`) | intentional rejection boundary | 2/5 | Auth/App Check and customer-facing `failed-precondition`; prevents old clients from bypassing current checkout | Retain temporarily for safe migration; remove only after client/deployment version audit |
| Compatibility routes | `functions/src/missingRoutes.ts` | production but mixed legacy | 2/5 | Real Firestore/Genkit/Google AI operations, auth and App Check; several broad untyped request payloads and historical naming | Retain only referenced exports; split into domain modules, then archive unused routes |
| Generic web API | `functions/src/webapi.ts` | production HTTP boundary | 3/5 | Auth token + App Check verification, restrictive CORS origins, user-scoped cart/orders/preferences/wallet routes | Retain; add method/schema tests and avoid duplicating callable behavior |
| Firebase configuration | `firebase.json` | production config | 4/5 | Correct Hosting site/origin, security headers, API rewrite, Functions source, Auth/Firestore/Storage rules | Retain; verify deployed functions/secrets individually |

## Generated and duplicate artifacts

| Path | Classification | Action |
|---|---|---|
| `functions/lib/**` | Required Firebase runtime build output | Keep only as reproducible build output if repository policy requires checked-in `lib`; otherwise ignore it and deploy from `npm run build`. Never hand-edit. |
| `functions/lib/**/*.js.map` | Generated source maps | Keep only with the corresponding generated JS; otherwise discard during cleanup. |
| `functions/lib/src/**` | Stale nested build output | Archived under `/tmp/spresso-legacy-archive/backend`; it was not referenced by deployment scripts or imports. Its `searchProducts.js` said “store inventory,” contradicting the current discovery boundary. |
| `functions/src/dataconnect/esm/**`, `index.cjs.js`, `index.d.ts`, `package.json` | Generated Data Connect client artifacts located in `src` | Move to the designated generated boundary or regenerate from schema; do not treat them as hand-authored source. |
| `functions/lib/dataconnect/**` | Generated Data Connect output | Regenerate alongside the build; do not maintain independently. |
| `functions/test-agentkit*.ts/js`, `functions/testTools.ts`, `functions/test-tool.js` | Ad-hoc exploratory scripts | Archive outside production test discovery unless a named CI job uses them. They are not included by the configured `node --test test/*.test.js` command. |
| `functions/test/**` | Tests | Retain. TypeScript tests import `src`; legacy JavaScript tests import compiled `lib`, so both build paths must be validated until the suite is normalized. |
| `functions/package-lock.json` | Dependency lockfile | Retain; pin and review runtime dependencies before deployment. |

## Duplicate implementation risks

1. **Cart mutation duplication (resolved in this slice):** `src/cart/index.ts` and `src/ai/tools/addToCart.ts` now share `src/cart/addListingToCart.ts`, which stores a validated discovered-listing snapshot and uses a request idempotency document. The AI tool still requires a complete listing contract so it cannot write an opaque product ID.
2. **Payment entrypoint duplication:** `src/webhooks.ts` is the current Stripe quote-and-webhook boundary. The older functions in `src/payments/index.ts` intentionally reject client-controlled payment requests. Keep those rejection guards during client migration; do not wire new clients to them.
3. **Discovery duplication:** `src/ai/tools/searchProducts.ts` is current provider-backed discovery. `lib/src/ai/tools/searchProducts.js` is an older inventory-oriented implementation and must not be deployed or copied back into source.
4. **Build duplication:** `lib/**` and `lib/src/**` look like separate implementations to graph tools, but only `lib/index.js` is the configured runtime entrypoint and it is generated from `src/index.ts`.
5. **User preference duplication:** wardrobe stores likes/bookmarks under `users/{uid}/likes` and `bookmarks`, while `getUserPreferences` also exposes array fields in `user_preferences`. This is a data-model overlap requiring migration documentation before either path is removed.

## Cleanup order

1. Preserve a recoverable checkpoint and record deployed-function names before deleting anything.
2. Audit callers of `ai/tools/addToCart`, `prepareCryptoPurchase`, and every `missingRoutes` export. Migrate valid callers to the canonical cart/checkout/discovery boundaries. The AI cart tool migration is complete; its remaining caller is Genkit prompt/tool registration rather than a separate cart implementation.
3. Remove or ignore stale `functions/lib/src/**` and orphan generated files by running the canonical build, not by hand-editing output.
4. Decide whether generated `functions/lib/**` is committed project policy; enforce that choice with `.gitignore`/CI consistently.
5. Normalize tests so source tests run after TypeScript compilation and no JavaScript test imports stale generated code.
6. Re-run GitNexus analysis and `detect-changes --scope compare --base-ref main` after each domain cleanup. Treat unresolved `UNKNOWN` impact as requiring text/caller confirmation.

## Verification evidence

- `npm run build` in `functions/`: passed on 2026-09-04; TypeScript compiled successfully and Data Connect artifacts were copied to `lib/`.
- `npx tsx --test test/legacyAddToCartBoundary.test.ts`: passed on 2026-09-04; the contract confirms the AI tool delegates to the canonical helper and contains no direct cart write.
- 15 backend test files are present; the suite contains 65 `test`/`it` declarations by static count.
- Existing tests cover cart quote boundaries, webhook idempotency/reconciliation assertions, crypto transfer safety, Kitesurf staging stop conditions, discovery normalization, lens parsing, App Check/auth, receipt parsing, virtual try-on validation, web cart validation, and Firestore rules.
- No deployment, live provider, Stripe webhook, Coinbase/CDP, or Firebase emulator evidence was claimed by this audit.

## Final disposition

Retain the canonical TypeScript source and its meaningful tests. Archive or discard the stale nested build and orphan crypto-preparation output after caller confirmation. The one production behavior that should be actively retired is the legacy AI `addToCart` tool because it bypasses the validated cart snapshot and idempotency boundary. Keep compatibility rejection callables until all clients are proven migrated; they are safety barriers, not feature implementations.
