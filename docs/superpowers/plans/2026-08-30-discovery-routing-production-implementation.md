# Discovery and Merchant Routing Production Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Replace loose discovery and checkout data with verified provider listings, user-intent cart state, safe merchant staging, real client wiring, and production evidence across web, Android, Functions, and infrastructure.

**Architecture:** A canonical `DiscoveredListing` contract crosses provider adapters, Firebase callables, Firestore cart state, web, and Kotlin common code. Provider results are validated before model ranking. Checkout remains user-completed, while Kitesurf can verify and stage compatible merchant pages without submitting orders.

**Tech Stack:** TypeScript, Firebase Functions v2, Genkit, Parallel, SerpAPI, Apify, Cloudflare Browser Run Kitesurf, Firestore, Stripe, React/Vite, Kotlin Multiplatform, Gradle, Terraform.

**Spec:** `docs/superpowers/specs/2026-08-30-discovery-routing-production-design.md`

## Global Constraints

- Spresso discovers listings and does not own retailer inventory.
- Unknown prices are represented as unknown, never as zero.
- The client never chooses a payment amount.
- Agents stop before order submission, payment submission, account changes, and security changes.
- Test fixtures may model provider responses. Production handlers must call real configured boundaries.
- Missing credentials or unavailable infrastructure fail closed and are reported as environment blockers.
- Every production capability needs a reachable entrypoint and an integration check.
- Run GitNexus impact analysis before changing symbols and change analysis before commits.

## Dependency graph

Task 1 blocks Tasks 2 through 8. Tasks 2, 3, 4, and 5 run in parallel after Task 1. Task 6 starts after Tasks 2 and 3. Task 7 starts after Task 2. Task 8 starts after Tasks 4 and 5. Task 9 integrates all streams. Task 10 is the release verification gate.

### Task 1: Establish the shared listing and state contracts

**Files:**
- Create: `contracts/discovered-listing.schema.json`
- Create: `functions/src/contracts/discoveredListing.ts`
- Create: `src/lib/discoveredListing.ts`
- Create: `composeApp/src/commonMain/kotlin/components/features/catalog/DiscoveredListing.kt`
- Test: `scripts/test/discovered-listing-contract.test.mjs`

**Interfaces:**
- Produces `DiscoveredListing`, `CartListingSnapshot`, and `MerchantStagingResult` field definitions for all later tasks.
- Produces canonical URL and stable ID helpers with deterministic output.

- [ ] Write failing tests for required merchant URLs, valid source values, nullable observed prices, deterministic IDs, and rejection of timestamp-derived IDs.
- [ ] Run `node scripts/test/discovered-listing-contract.test.mjs` and confirm the new contract tests fail.
- [ ] Implement the JSON schema, TypeScript parser, Kotlin data class, canonical URL helper, and stable ID helper.
- [ ] Run the contract test and Functions type check. Confirm all pass.
- [ ] Run GitNexus impact analysis for existing product and cart types before migrating callers.
- [ ] Commit the contract only with `git add contracts functions/src/contracts src/lib composeApp/src/commonMain scripts/test/discovered-listing-contract.test.mjs && git commit -m "feat: define verified discovery listing contract"`.

### Task 2: Normalize provider results and enforce provenance

**Files:**
- Create: `functions/src/ai/providers/discoveryTypes.ts`
- Create: `functions/src/ai/providers/parallelAdapter.ts`
- Create: `functions/src/ai/providers/serpApiAdapter.ts`
- Create: `functions/src/ai/providers/apifyAdapter.ts`
- Modify: `functions/src/ai/index.ts`
- Modify: `functions/src/ai/flows/discoverPersonalizedProductsFlow.ts`
- Modify: `functions/src/ai/tools/searchProducts.ts`
- Test: `functions/test/discoveryProviders.test.ts`

**Interfaces:**
- Consumes the Task 1 `DiscoveredListing` parser.
- Produces `normalizeParallelResults`, `normalizeSerpApiResults`, `normalizeApifyResults`, and `assertModelListingProvenance`.

- [ ] Add fixtures for valid provider results, missing URLs, fabricated URLs, fabricated prices, numeric prices, and duplicate canonical URLs.
- [ ] Run `cd functions && npx tsx test/discoveryProviders.test.ts` and confirm failures.
- [ ] Implement provider adapters that validate external data before model ranking.
- [ ] Change Gemini normalization to accept only validated provider records and verify every returned URL, source, price evidence URL, and image URL against those records.
- [ ] Preserve unknown prices as `null` through the callable response and client mapping.
- [ ] Run the provider test, `npm run build` in `functions`, and the strict synthetic-success scanner.
- [ ] Commit with `git add functions/src/ai functions/test/discoveryProviders.test.ts && git commit -m "feat: validate discovery provider provenance"`.

### Task 3: Move cart and payment logic to the server-owned boundary

**Files:**
- Create: `functions/src/cart/cartListingSnapshot.ts`
- Create: `functions/src/payments/merchantQuote.ts`
- Modify: `functions/src/cart/index.ts`
- Modify: `functions/src/payments/index.ts`
- Modify: `functions/src/webhooks.ts`
- Test: `functions/test/cartQuoteBoundary.test.ts`

**Interfaces:**
- Consumes `DiscoveredListing` from Task 1.
- Produces `CartListingSnapshot` persistence and `getMerchantQuote` with server-owned amount calculation.
- Removes client authority over `unitPrice`, `currency`, merchant URL, and final payment amount.

- [ ] Add failing tests proving a cart write stores listing metadata, client `unitPrice` is rejected by payment endpoints, stale observations require a fresh quote, and unknown prices cannot create payment intents.
- [ ] Run the boundary test and confirm failures.
- [ ] Implement cart snapshot persistence without stock, reservation, or availability fields.
- [ ] Implement `getMerchantQuote` with provider lookup, canonical currency validation, expiry checks, and integer-cent calculation on the server.
- [ ] Keep merchant checkout user-completed. Do not create a Stripe intent from the merchant handoff flow.
- [ ] Add idempotency and webhook references only for approved Spresso-controlled financial operations.
- [ ] Run the boundary test, Functions build, and no-synthetic-success tests.
- [ ] Commit with `git add functions/src/cart functions/src/payments functions/src/webhooks.ts functions/test/cartQuoteBoundary.test.ts && git commit -m "fix: enforce server-owned merchant quote boundary"`.

### Task 4: Harden Kitesurf merchant staging

**Files:**
- Create: `functions/src/kitesurf/merchantAdapters.ts`
- Create: `functions/src/kitesurf/stagingTypes.ts`
- Modify: `functions/src/kitesurfService.ts`
- Modify: `functions/src/ai/tools/kitesurfSearch.ts`
- Test: `functions/test/kitesurfStaging.test.ts`

**Interfaces:**
- Consumes `DiscoveredListing` and allowlisted domains from Task 1.
- Produces `MerchantStagingResult` with `status`, `finalUrl`, `observedPrice`, `steps`, and typed failure reasons.

- [ ] Add failing tests for non-HTTPS URLs, disallowed domains, login-required pages, bot challenges, unsupported payment forms, missing merchant URLs, and safe stop before place-order controls.
- [ ] Run the Kitesurf test and confirm failures.
- [ ] Implement domain allowlists, HTTPS-only navigation, request and timeout limits, redacted action logs, deterministic listing IDs, and numeric price parsing.
- [ ] Move selectors into merchant adapters and return incompatibility instead of claiming generic checkout support.
- [ ] Keep the browser flow from submitting orders or payment credentials.
- [ ] Run the Kitesurf test and Functions build. When Cloudflare credentials are available, run a real public-page staging check and record the result.
- [ ] Commit with `git add functions/src/kitesurf functions/src/kitesurfService.ts functions/src/ai/tools/kitesurfSearch.ts functions/test/kitesurfStaging.test.ts && git commit -m "feat: add safe Kitesurf merchant staging"`.

### Task 5: Audit secrets, Terraform, and callable reachability

**Files:**
- Modify: `terraform/main.tf`
- Modify: `functions/src/index.ts`
- Modify: `functions/src/ai/index.ts`
- Modify: `functions/src/ai/tools/searchProducts.ts`
- Create: `scripts/test/secret-binding-audit.mjs`
- Create: `scripts/test/deployed-capability-audit.mjs`

**Interfaces:**
- Consumes all exported Functions and secret declarations.
- Produces a machine-readable report mapping each callable to required secrets and deployed endpoint checks.

- [ ] Add failing checks for missing Parallel and SerpAPI declarations, unbound secrets, missing callable exports, and endpoints that return fake success.
- [ ] Run both audit scripts and confirm failures for each known omission.
- [ ] Add only launch-approved secrets to Terraform and bind each secret to every function that can reach it.
- [ ] Verify callable exports against `contracts/production-endpoints.json`.
- [ ] Make unavailable infrastructure fail closed with an explicit environment blocker.
- [ ] Run the audits, strict mock scanner, and Functions build.
- [ ] Commit with `git add terraform/main.tf functions/src scripts/test && git commit -m "chore: verify provider secrets and callable reachability"`.

### Task 6: Wire the shared discovery repository into the web client

**Files:**
- Create: `src/lib/discoveryRepository.ts`
- Modify: `src/App.tsx`
- Modify: `src/components/features/catalog/ProductCatalogPage.tsx`
- Modify: `src/components/features/chat/PersonalAIShopperChatPage.tsx`
- Modify: `src/components/features/vision/*`
- Modify: `src/components/features/wardrobe/*`
- Test: `src/test/discoveryRepository.test.tsx`

**Interfaces:**
- Consumes the Task 1 TypeScript contract and Task 2 callable response.
- Produces shared listing state for catalog, chat, vision, wardrobe, cart, and checkout.

- [ ] Add failing tests for unknown price rendering, duplicate request suppression, cancellation on query changes, and shared listing identity across surfaces.
- [ ] Run the web test and confirm failures.
- [ ] Implement repository caching with provider expiry, request cancellation, and debounce.
- [ ] Remove remaining product-inventory assumptions and delete `fetchProductsByIds` if no verified caller remains.
- [ ] Update cart and checkout handoff to use listing snapshots and merchant URLs.
- [ ] Run web tests, lint, and the production build.
- [ ] Commit with `git add src && git commit -m "feat: share verified discovery state across web"`.

### Task 7: Complete Android discovery and passkey wiring

**Files:**
- Modify: `composeApp/src/commonMain/kotlin/components/features/catalog/*`
- Modify: `composeApp/src/commonMain/kotlin/components/features/chat/*`
- Modify: `composeApp/src/commonMain/kotlin/components/features/cart/*`
- Create: `composeApp/src/androidMain/kotlin/components/features/auth/PlatformPasskeyRegistrar.kt`
- Modify: `composeApp/src/commonMain/kotlin/components/features/auth/PasskeyRegistrationStep.kt`
- Test: `composeApp/src/androidUnitTest/*`

**Interfaces:**
- Consumes the Task 1 Kotlin listing contract and Firebase callable envelope.
- Produces a real Android passkey registration adapter and user-completed merchant handoff state.

- [ ] Read the required authentication and Android skills before editing platform authentication code.
- [ ] Add failing unit tests for callable listing parsing, passkey success, user cancellation, provider failure, and no purchase-success transition after biometric approval.
- [ ] Run the focused Android tests and confirm failures.
- [ ] Implement the platform credential adapter using the approved Android API and propagate typed results into common code.
- [ ] Remove the passkey placeholder callback and connect the real adapter.
- [ ] Wire catalog, chat, cart, and merchant handoff to the shared listing contract.
- [ ] Run `./gradlew :composeApp:testDebugUnitTest :composeApp:compileDebugKotlinAndroid --no-daemon` with JDK 17.
- [ ] Commit with `git add composeApp && git commit -m "feat: wire Android discovery and passkey registration"`.

### Task 8: Reduce web bundle size and add tree-shaking gates

**Files:**
- Modify: `vite.config.ts`
- Modify: route entry files under `src/`
- Create: `scripts/test/bundle-budget.test.mjs`
- Modify: `package.json`

**Interfaces:**
- Consumes the shared web repository from Task 6.
- Produces route-level chunks and a repeatable production bundle budget check.

- [ ] Add a failing budget test for the current main bundle and a manifest assertion for route chunks.
- [ ] Run the bundle test and confirm failure.
- [ ] Split catalog, chat, wardrobe, travel, and vision routes at their route boundaries.
- [ ] Remove imports that prevent tree shaking and verify production-only modules are not in the initial chunk.
- [ ] Run `npm run build -- --manifest` and the bundle budget test.
- [ ] Commit with `git add vite.config.ts src package.json scripts/test/bundle-budget.test.mjs && git commit -m "perf: split web routes and enforce bundle budgets"`.

### Task 9: Integrate and resolve cross-stream contract mismatches

**Files:**
- Modify files identified by GitNexus impact analysis.
- Test: `scripts/test/*`, `functions/test/*`, `composeApp/src/androidUnitTest/*`

- [ ] Run GitNexus impact analysis for `ProductItem`, `fetchProductsByIds`, `createStripeIntent`, `executeKitesurfPurchase`, and the discovery callable.
- [ ] Resolve all type and envelope mismatches without reintroducing local inventory queries or client prices.
- [ ] Run web tests, Functions tests, Android unit tests, strict mock scanning, and callable contract tests together.
- [ ] Review each provider error path to confirm it fails closed and produces customer-safe copy.
- [ ] Run `git diff --check` and inspect the complete diff for fake data, placeholder callbacks, and unreachable success branches.
- [ ] Commit the integration fixes after change analysis reports the intended graph changes.

### Task 10: Production verification and evidence report

**Files:**
- Modify: `docs/audits/2026-08-30-spresso-functional-audit.md`
- Create: `docs/audits/2026-08-30-discovery-routing-release-evidence.md`
- Modify: `.audit/2026-08-30-build.tsv`

- [ ] Run `npm run lint`, `npm run build -- --manifest`, `npm run test:smoke`, and `npm run test:contracts`.
- [ ] Run `cd functions && npm run build && npx tsc --noEmit`.
- [ ] Run Android compile, lint, and unit tests with JDK 17. Record any environment blocker without converting it to a pass.
- [ ] Run deployed smoke checks against `get-spresso` for health, auth, App Check, discovery, cart, and merchant handoff.
- [ ] Run a real Kitesurf public-page staging check when Cloudflare credentials are available.
- [ ] Run strict production mock scanning and bundle budget checks.
- [ ] Run GitNexus change analysis with the final scope and inspect high or critical risk results.
- [ ] Write the evidence report with separate sections for repository proof, deployed proof, provider proof, and unresolved environment blockers.
- [ ] Mark the release ready only when every required capability has a reachable real implementation and no placeholder or synthetic-success path remains.

## Parallel dispatch strategy

After Task 1, dispatch four agents in parallel:

- Agent A owns Task 2, provider normalization and provenance.
- Agent B owns Task 3, cart and payment boundaries.
- Agent C owns Task 4, Kitesurf staging.
- Agent D owns Task 5, infrastructure and callable audits.

After those streams pass review, dispatch four more agents:

- Agent A owns Task 6, shared web discovery state.
- Agent B owns Task 7, Android discovery and passkeys.
- Agent C owns Task 8, web performance and tree shaking.
- Agent D owns Task 9 preparation, cross-stream contract checks and test integration.

The root agent owns Task 1, reviews every agent result, resolves conflicts, runs Task 9, and performs Task 10. Agents must not edit files assigned to another stream without reporting the conflict first.

## Completion criteria

The work is complete only when the canonical listing contract is used by every client and provider path, payment amounts are server-owned, Kitesurf cannot submit orders, Android passkeys use a real adapter, the web bundle meets its budget, every active secret and callable is verified, and the release evidence report contains real test or deployment evidence for each capability.
