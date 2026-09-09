# Spresso Production Convex and ChatGPT Apps SDK Transition Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. Read `convex-expert` before editing `convex/`, `openai-docs` before changing the Apps SDK/MCP boundary, and `convex-test` for each new backend contract. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the application client and reviewed ChatGPT Apps SDK tools onto the verified Convex production deployment while completing the production action and database contracts for discovery, AI chat, virtual try-on, media, and human-approved merchant checkout.

**Architecture:** Convex production is the application state and trusted server-function boundary at `https://woozy-anteater-572.convex.cloud`. The native/web client uses the production URL only in its release configuration; local development remains on `decisive-dolphin-161`. The ChatGPT Apps SDK server remains a separate public HTTPS MCP service and calls only an authenticated, narrowly scoped Convex catalog contract. Bunny stores media bytes; Convex stores ownership, job state, hashes, and stable media keys; merchants remain the source of price, availability, and fulfillment.

**Tech Stack:** Convex 1.45, `@convex-dev/agent`, Convex rate limiter, Firebase OIDC identity validation, OpenAI Apps SDK/MCP, Bunny Storage/CDN, Stripe Elements and signed webhooks, Kotlin Multiplatform client, Vitest/convex-test.

**Spec:** `docs/spresso_architecture_context.md`, `docs/superpowers/plans/2026-09-08-chatgpt-apps-sdk-surface.md`, and `docs/superpowers/plans/2026-09-08-convex-commerce-passkey-revenuecat.md`.

## Global Constraints

- The verified production Convex URL is `https://woozy-anteater-572.convex.cloud`; do not replace it with an invented or stale endpoint.
- `CONVEX_DEPLOYMENT=dev:decisive-dolphin-161` remains the local development target; release configuration must opt into production explicitly.
- Google Cloud, Firebase Hosting, Genkit, and Cloud Run are not deployment targets for this rebuild. Firebase Auth remains the identity issuer only where the Convex auth contract requires it.
- Spresso is product discovery and merchant routing, not an inventory owner. Never add stock, reserve inventory, decrement inventory, or claim availability without a fresh merchant response.
- Agents may discover products, explain fit, add intent to a cart, and prepare checkout. Only the authenticated user can confirm payment in trusted UI; an agent cannot submit payment, enter credentials, sign a wallet transaction, or claim purchase completion.
- Bunny is mandatory for production media bytes. Missing Bunny configuration fails closed; no Firebase/Convex media fallback and no client-side storage credential.
- Lens means Android MediaProjection screen inspection; CameraX means physical-camera detection/labeling/photo/video capture. Virtual try-on is generated photo/video, not a 3D/4D/AR body model.
- Every public Convex function has object-form args and returns validators, derives identity server-side, uses indexes for reads, and has negative authorization tests.
- No MCP private or commerce tool is released before OAuth subject mapping, rate limits, audit logging, and trusted-UI confirmation are implemented.

## Current production evidence

- Production deployment exists as `mikros:spresso:production` (`woozy-anteater-572`). The endpoint returns HTTP 200.
- Production schema and Convex components are deployed; `npx convex function-spec --prod` lists the application functions.
- Local `npx tsc -p convex/tsconfig.json --noEmit --pretty false` passes. The Convex CLI did not discover the repository `convex/tsconfig.json` during its deploy check, so the next deploy must retain the explicit local typecheck gate until that CLI discrepancy is resolved.
- The root client is wired to `VITE_CONVEX_URL`; the MCP server still fails closed until a verified catalog gateway and secret are configured.

### Transition slice completed (2026-09-09)

- `SpressoConvexProvider` now binds the Firebase OIDC token to the configured Convex URL.
- The shopper UI creates a server-owned Convex Agent thread, sends prompts through `aiChat.sendMessage`, and renders persisted UI stream deltas from `aiChat.listMessages`.
- `aiGeneration` uses Convex Agent `streamText` with saved deltas; the model is selected by server-only `SPRESSO_LLM_MODEL` through the Convex AI gateway.
- The production deployment contains the updated streaming function contract. Remaining unchecked tasks are intentionally blocked on verified catalog/provider contracts, media-provider configuration, and the separate MCP host.

## Action and data ownership map

| Capability | Public client action/query | Internal action/mutation | Convex data owner | External boundary |
|---|---|---|---|---|
| Identity and trial | `users.me`; bootstrap through chat/thread flow | `users.ensureUser` | `users` | Firebase OIDC token, 14-day trial window |
| Preferences | `reactiveState.getPreferences`, `setPreferences` | none | `preferences` | Android permission state only; no raw media |
| AI chat | `aiChat.createThread`, `getThread`, `listMessages`, `sendMessage` | `aiGeneration.generateResponse`, `aiChat.recordUsage` | Agent component, `aiUsage` | Convex AI gateway/OpenAI model; bounded prompt/output and rate limit |
| Discovery | New authenticated discovery contract to be defined before release | Provider fetch and normalization action | No retailer inventory table; optional bounded listing cache only after provider ownership is approved | Verified merchant/search provider; untrusted listing text |
| Saved products/cart intent | `reactiveState.listSavedProducts`, `setSavedProduct`, `listCartItems`, `addCartItem`, `setCartQuantity` | none | `savedProducts`, `cartItems` | Listing metadata only; no stock or final-price authority |
| Wardrobe | `reactiveState.listWardrobeItems`, `addWardrobeItem`, `removeWardrobeItem` | media actions for owned assets | `wardrobeItems`, `mediaAssets` | Bunny private media URLs |
| Lens/camera/VTO | New consented job/session functions | bounded vision/VTO provider actions and result mutations | New `visionSessions`, `tryOnJobs`, `tryOnOutputs` tables | MediaProjection, CameraX/ML Kit, approved model provider, Bunny |
| Meta DAT | Native registration/session remains on device | optional server-side tool/audit mutation | New `wearableActionLog` only for reviewed audit events | DAT permissions/session/capability lifecycle |
| Checkout preparation | `commerce.checkout.acquireCheckoutAttempt` and read-only status query | new merchant quote + Stripe intent Node action; CAS mutations `markQuoted`/`finalizeQuote` | `checkoutAttempts` | Fresh merchant quote and Stripe; client amount never trusted |
| Payment confirmation | Trusted UI confirms exact quote through Stripe Elements | signed webhook HTTP action; `acquireWebhookEvent`, `completeWebhookEvent` | `webhookInbox`, `orders` | Stripe is financial system of record |
| MCP discovery | MCP `search_products`, `render_discovery_widget` | server-only catalog adapter | No direct MCP database access | Public HTTPS MCP host → authenticated Convex catalog contract |

## Tasks

### Task 1: Make release configuration select the production Convex URL

**Files:**
- Modify: `.env.example`
- Create: `.env.production.example`
- Modify: `docs/spresso_architecture_context.md`
- Test: `scripts/test/production-hardcoding-boundary.test.mjs`

- [ ] Add `VITE_CONVEX_URL=https://woozy-anteater-572.convex.cloud` to the release example and document that `.env.local` remains dev-only. Do not place deployment tokens or provider secrets in either file.
- [ ] Add a production configuration check that rejects the dev hostname in release builds and accepts only the verified Convex production hostname.
- [ ] Run the existing production hardcoding and build checks; fail if a secret or stale Google/Firebase deployment URL is introduced.
- [ ] Commit `chore: wire release configuration to convex production`.

### Task 2: Wire the actual client transport without duplicating backend state

**Files:**
- Inspect and modify the existing release client entry point identified by the repository search (`composeApp/` for Kotlin Multiplatform and the Vite entry only if it actually owns the Convex surface)
- Create: the smallest typed Convex client gateway at the existing client boundary
- Test: client contract test covering dev/prod URL selection

- [ ] Confirm the client currently using the rebuilt Convex functions; do not add a second API client or leave legacy Firebase callable routes silently active for the same domain.
- [ ] Pass Firebase OIDC identity through the official Convex auth provider integration and map `VITE_CONVEX_URL`/release configuration to the client.
- [ ] Exercise `users.me`, `reactiveState.getPreferences`, chat thread creation, and one denied unauthenticated call against the deployed contract.
- [ ] Run the client build and the existing production smoke suite before committing.

### Task 3: Freeze the Convex schema and public/internal action contract

**Files:**
- Modify: `convex/schema.ts` only when a task below has a failing contract test
- Modify: `convex/reactiveState.ts`, `convex/aiChat.ts`, `convex/users.ts`
- Test: existing Convex tests plus one cross-user denial test per new public function

- [ ] Keep existing ownership indexes for `users`, `preferences`, `savedProducts`, `cartItems`, `wardrobeItems`, `aiUsage`, `mediaAssets`, `checkoutAttempts`, `webhookInbox`, and `orders`.
- [ ] Remove any future catalog field that implies Spresso inventory ownership; discovery records must contain listing evidence, merchant URL, observed price timestamp, and provider identity only.
- [ ] Add return validators to any registered function still lacking one, and replace any resource scan with an indexed bounded read.
- [ ] Run `npx vitest run convex --passWithNoTests` and `npx tsc -p convex/tsconfig.json --noEmit --pretty false`.

### Task 4: Implement the discovery contract used by both the app and MCP

**Files:**
- Create: `convex/discovery.ts`
- Modify: `convex/schema.ts` only if a bounded cache is required by the contract
- Modify: `mcp-server/convexClient.mjs`, `mcp-server/server.mjs`
- Test: `convex/discovery.test.ts`, `mcp-server/server.test.mjs`

- [ ] Define one closed-world `searchProducts` contract with bounded query, category, price, currency, merchant URL, evidence URL, media references, and freshness fields.
- [ ] Keep provider calls in a Node action; normalize and validate results before writing an optional short-lived cache. Never accept client-supplied availability or price as authoritative.
- [ ] Expose a server-authenticated, read-only Convex HTTP/action boundary for MCP only after its URL and token are verified in the deployment vault; do not point MCP directly at the Convex client URL with a guessed route.
- [ ] Test prompt-injection text in merchant fields, malformed URLs, stale quotes, oversized result sets, anonymous calls, and cross-user access.

### Task 5: Complete media, camera, Lens, and virtual try-on state

**Files:**
- Modify: `convex/schema.ts`
- Create: `convex/vision.ts`, `convex/tryOn.ts`
- Modify: `convex/media/actions.ts`, `convex/media/boundary.ts`
- Test: `convex/vision.test.ts`, `convex/tryOn.test.ts`, existing media tests

- [ ] Model consented `visionSessions` with owner, source (`lens_screen`, `camera_photo`, `camera_video`), purpose, status, created/expired times, and no raw frame storage.
- [ ] Model `tryOnJobs` and `tryOnOutputs` with owner, garment/listing reference, source asset IDs, body-fit context, provider job ID, status, bounded error code, output media asset IDs, and retention timestamps.
- [ ] Keep screen capture separate from CameraX input; require explicit cancellation/expiry and prevent a screen frame from being interpreted as a camera frame.
- [ ] Upload generated output server-to-server to Bunny, persist only stable media keys/hashes, and mint short-lived private URLs on demand.
- [ ] Test consent denial, owner isolation, cancellation, provider failure, oversized media, source-host rejection, and expired read URLs.

### Task 6: Finish human-controlled commerce actions

**Files:**
- Modify: `convex/commerce/checkout.ts`, `convex/schema.ts`
- Create: `convex/commerce/actions.ts`, `convex/http.ts` if the webhook route is not already present
- Test: `convex/commerceCheckout.test.ts`, webhook signature/idempotency tests

- [ ] Keep `acquireCheckoutAttempt` idempotent by `(tokenIdentifier, idempotencyKey)` and store user intent only.
- [ ] Add a Node action that obtains a fresh merchant quote and creates a Stripe payment intent with the attempt ID/idempotency key; never accept client amount, currency, merchant availability, or payment credentials.
- [ ] Stop at `AWAITING_STEP_UP` until trusted UI confirms the exact quote; a model/MCP tool cannot advance this state.
- [ ] Add a signed Stripe webhook HTTP action that verifies the signature before data access, deduplicates `(provider,eventId)`, advances the attempt by compare-and-set, and writes one order receipt.
- [ ] Test duplicate requests, quote changes, stale quotes, webhook replay, signature failure, user mismatch, and attempted agent-controlled payment.

### Task 7: Add the reviewed Apps SDK production boundary

**Files:**
- Modify: `mcp-server/server.mjs`, `mcp-server/convexClient.mjs`, `mcp-server/README.md`
- Create: host deployment manifest and secret-vault instructions for the separately approved non-Google HTTPS host
- Test: MCP Inspector against the deployed non-production URL, then production health/tool contract checks

- [ ] Keep `/mcp` stateless and read-only until OAuth subject mapping is implemented.
- [ ] Configure only the verified Convex catalog contract URL and server-only token; fail closed when either is absent or non-HTTPS.
- [ ] Do not expose cart, checkout, payment, account, wallet, camera, Lens, or private wardrobe tools before OAuth and trusted confirmation contracts are complete.
- [ ] Publish the MCP endpoint only after HTTPS, origin policy, rate limits, tool annotations, audit logging, and OpenAI test cases pass.

### Task 8: Production verification and release gate

**Files:**
- Modify: `docs/testing.md` only if a new command is needed
- Create: `scripts/test/production-convex-contract.test.mjs` if the existing smoke harness cannot express the checks

- [ ] Run `npm run lint`, `npm run build`, `npm run test:contracts`, `npm run test:smoke`, `npm run test:bundle-budget`, `npx vitest run convex --passWithNoTests`, and `npx tsc -p convex/tsconfig.json --noEmit --pretty false`.
- [ ] Run `npx convex function-spec --prod` and verify the expected public/internal surface; query production tables read-only and confirm no inventory tables or fake availability fields exist.
- [ ] Run production health checks against `https://woozy-anteater-572.convex.cloud` and the separately deployed MCP `/` and `/mcp` endpoints.
- [ ] Run GitNexus `detect-changes --scope all` and review high/critical impact warnings before commit.
- [ ] Commit only after every check is green; never commit a partial production transition.

## Execution order

Tasks 1–3 establish the production client and stable Convex contracts. Task 4 is the prerequisite for MCP. Task 5 can proceed in parallel with Task 4 after the media ownership contract is fixed. Task 6 must complete before any commerce tool is considered. Task 7 follows the verified discovery contract. Task 8 is the release gate for the complete transition.
