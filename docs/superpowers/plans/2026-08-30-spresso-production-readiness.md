# Spresso Production Readiness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Use one KMP and Compose screen tree for Android and web. Make every visible feature return real backend results or a clear unavailable state. Remove hardcoded success first. Prove virtual try-on, shared button wiring, and cross-device data next. Retire React and Vite only after KMP Wasm passes parity.

**Architecture:** Put feature screens and state in `composeApp/src/commonMain`. Keep Navigation 3, CameraX, passkeys, and Android device APIs in `androidMain`. Put browser history, web Firebase adapters, and web media adapters in `wasmJsMain`. Both outputs use the same Firebase project, backend contracts, UID-based data, version rules, and server timestamps. Freeze the React and Vite client as a parity reference. Migrate its remaining behavior into shared Compose callers, switch Hosting to KMP Wasm, then delete React and Vite in the same wave.

**Tech Stack:** Kotlin Multiplatform, Jetpack Compose, Navigation 3 on Android, Kotlin Wasm for web, Firebase Auth, App Check, Firestore, Realtime Database, Functions, Hosting, Storage, Google Cloud, Cloudflare Workers, Terraform 1.16, Node test runner, Gradle 9.6, JDK 17. React 19 and Vite 8 are migration-only dependencies until Task 13.

---

## Product owner direction

- Keep Realtime Database.
- Keep the Google Cloud services that current product features need.
- Keep purchasing. Replace sample success with a real, guarded provider path.
- Fix hardcoded success before build and bundle work.
- Focus on visible web and Android controls, backend wiring, virtual try-on, route drift, and missing backend names.
- Use KMP Compose for both Android and web. Do not create a React version and a Compose version of the same screen.
- Keep authentication sessions device-local. Sync account data after the same user signs into each device.
- Treat the current Spark plan and zero observed traffic as owner-provided context. Verify service availability before deciding that code caused an unreachable endpoint.

## Delivery rules

- Work from a clean branch created from the intended release commit. Preserve unrelated user changes.
- Keep features and service resources unless a separate owner decision approves deletion.
- Reuse the existing Compose screens in `commonMain`. A task may create a contract, platform adapter, test, route registry, or data repository. It may not create a second version of an existing feature screen.
- Do not delete Realtime Database, purchasing, Cloud SQL, Redis, Data Connect, Spanner, Cloud Run, or another Google Cloud service in this plan.
- A retained service must have a documented owner, real configuration, reachability check, and failure test.
- Write the failing test first. Record the expected failure. Make the smallest source change that passes it. Run the package gate before committing.
- Do not add local success fallbacks, sample results, random embeddings, sample tokens, or default production URLs.
- Use JDK 17 for every Gradle command.
- Keep production purchasing behind the current user-completed policy until product, legal, billing, and provider approval allow a different mode. Preserve and test the feature code in a provider sandbox.
- Do not run `npm audit fix --force`.
- Freeze React and Vite feature work. Task 1 may remove synthetic success from the temporary client. Tasks 2 through 12 use it only as a parity reference. Task 13 migrates Hosting to KMP Wasm and deletes the redundant React client after parity passes. Tasks 14 and 15 handle release and live proof.

## Access prerequisite

This prerequisite changes account state and needs a project owner. It creates no repository commit.

**Files:**

- Create: `docs/operations/production-inventory.md`

- [ ] Reauthenticate Firebase CLI. Run `firebase projects:list` and `firebase apps:list --project get-spresso`.
- [ ] Select an account that can read `get-spresso`. Run `gcloud projects describe get-spresso`.
- [ ] Set the active project with `gcloud config set project get-spresso` only after the account check passes.
- [ ] Reauthenticate Wrangler from `mcp-portal-worker/`. Run `npx wrangler deployments list`.
- [ ] Record the current Firebase plan, enabled products, web and Android app IDs, Hosting site, App Check registrations, Functions, Realtime Database instance, Firestore databases, Storage buckets, Data Connect services, Cloud SQL, Redis, Spanner, Cloud Run, Worker, and provider accounts.
- [ ] For every service that is unavailable on Spark, record the required plan or account change. Do not change billing without owner approval.
- [ ] Stop if the project owner confirms a different project or Android package. Update the architecture decision before changing identifiers.

## Task 1: Eliminate hardcoded and synthetic success

**Files:**

- Delete after replacement: `scripts/verify-integration.ts`
- Create: `scripts/smoke/production-smoke.mjs`
- Create: `scripts/smoke/production-smoke.test.mjs`
- Create: `scripts/smoke/endpoint-manifest.json`
- Modify: `scripts/universal_mock_scanner.cjs`
- Modify: `services/ranking-engine/batch_worker.py`
- Create: `services/ranking-engine/test_batch_worker.py`
- Modify: `src/hooks/useWardrobeGalleryInteractions.ts`
- Modify: `src/components/features/wardrobe/WardrobeMixMatchTab.tsx`
- Create: `scripts/test/no-synthetic-success.test.mjs`

- [ ] Write smoke-runner tests for DNS failure, 404, 401, 403, 429, 500, timeout, malformed JSON, missing App Check, and missing provider configuration. Each case must exit nonzero.
- [ ] Run `node --test scripts/smoke/production-smoke.test.mjs`. Confirm it fails because the fail-closed runner does not exist.
- [ ] Implement `production-smoke.mjs` with no Express import and no localhost fallback. Require a base URL and short-lived credentials through environment variables.
- [ ] Accept success only when status, content type, and response schema match `endpoint-manifest.json`. Do not accept an error field as proof that a route works.
- [ ] Delete `scripts/verify-integration.ts` after the new runner tests pass.
- [ ] Write `no-synthetic-success.test.ts`. Reject sample tokens, fake Stripe client secrets, invented orders, fixed trust scores, random user-visible data, invented endpoint IDs, localhost production fallback, and error-as-success assertions.
- [ ] Change the ranking worker to require a real stored embedding. Return a typed unavailable result when none exists. Use a registered FCM device token. Do not use a user ID as a topic fallback.
- [ ] Change wardrobe code to show loading, empty, and unavailable states. Keep save and mix-and-match features. Remove hardcoded outfits, scores, and local success after backend failure.
- [ ] Run `node --test scripts/test/*.test.mjs`, Python tests, the smoke self-tests, and the scanner.
- [ ] Commit with message `test: make product checks fail closed`.

## Task 2: Map every visible action to a real contract

**Files:**

- Create: `contracts/ui-actions.json`
- Create: `scripts/verify-action-contract.mjs`
- Create: `scripts/test/verify-action-contract.test.mjs`
- Create: `composeApp/src/commonMain/kotlin/contracts/ActionResult.kt`
- Create: `composeApp/src/commonTest/kotlin/contracts/UiActionContractTest.kt`
- Modify: `composeApp/src/commonMain/kotlin/components/features/catalog/ProductCatalogPage.kt`
- Modify: `composeApp/src/commonMain/kotlin/components/features/chat/PersonalAIShopperChatPage.kt`
- Modify: `composeApp/src/commonMain/kotlin/components/features/creators/CreatorAgentsPage.kt`
- Modify: `composeApp/src/commonMain/kotlin/components/features/grocery/GroceryListPage.kt`
- Modify: `composeApp/src/commonMain/kotlin/components/features/orders/OrdersTrackerPage.kt`
- Modify: `composeApp/src/commonMain/kotlin/components/features/profile/ProfilePage.kt`
- Modify: `composeApp/src/commonMain/kotlin/components/features/travel/TravelTripsPage.kt`
- Modify: `composeApp/src/commonMain/kotlin/components/features/wardrobe/WardrobeViewPage.kt`
- Modify: `composeApp/src/commonMain/kotlin/components/shared/HITLCheckoutModal.kt`
- Read for parity: `src/components/CartDrawer.tsx`
- Read for parity: `src/components/GroceryListView.tsx`
- Read for parity: `src/components/HITLCheckoutModal.tsx`
- Read for parity: `src/components/OrdersTracker.tsx`
- Read for parity: `src/components/SmartVisionView.tsx`
- Read for parity: `src/components/VirtualTryOnModal.tsx`
- Read for parity: `src/components/features/catalog/ProductCatalogPage.tsx`
- Read for parity: `src/components/features/chat/CreatorGenAIAgentsChatPage.tsx`
- Read for parity: `src/components/features/chat/PersonalAIShopperChatPage.tsx`
- Read for parity: `src/components/features/profile/ProfilePage.tsx`
- Read for parity: `src/components/features/travel/TravelTripsPage.tsx`
- Read for parity: `src/components/features/wardrobe/WardrobeViewPage.tsx`

- [ ] Reuse the existing Compose files listed above. Do not create alternate catalog, wardrobe, travel, purchase, profile, grocery, order, creator, or chat screens.
- [ ] Read the React controls only to capture behavior that the shared Compose screen does not yet expose. Do not change React behavior.
- [ ] Define each action in `contracts/ui-actions.json` with `id`, `platforms`, `screen`, `control`, `backendContract`, `successState`, `emptyState`, `failureState`, and `owner`.
- [ ] Inventory every production Compose `Button`, clickable modifier, submission, and checkout request. Link any React-only behavior to the existing Compose screen that will absorb it.
- [ ] Write a contract test that fails when a visible action has no entry, no real backend contract, an empty callback, or a hardcoded success state.
- [ ] Run the contract and KMP tests. Save the first missing-action list as the task baseline.
- [ ] Create one typed action result with `success`, `empty`, `unavailable`, `unauthorized`, `validationError`, and `providerError` states. Use it in shared Compose presentation code.
- [ ] Wire catalog, wardrobe, grocery, travel, profile, creator, orders, cart, vision, and purchase controls to the declared backend name.
- [ ] Add common tests for each primary action handler. Assert request payload, loading state, success state, and provider failure state. Task 15 will press the same controls on Android and Wasm.
- [ ] Run `node --test scripts/test/verify-action-contract.test.mjs`, `node scripts/verify-action-contract.mjs`, and KMP unit tests.
- [ ] Commit with message `test: cover shared Compose action wiring`.

## Task 3: Prove virtual try-on end to end

**Files:**

- Modify: `composeApp/src/commonMain/kotlin/App.kt`
- Modify: `composeApp/src/commonMain/kotlin/components/features/catalog/ProductActions.kt`
- Modify: `composeApp/src/commonMain/kotlin/network/ApiClient.kt`
- Modify: `functions/src/ai/index.ts`
- Modify: `functions/src/ai/mediaGeneration.ts`
- Modify: `functions/src/ai/flows/virtualTryOnFlow.ts`
- Create: `functions/test/virtual-try-on.test.js`
- Create: `composeApp/src/commonTest/kotlin/features/VirtualTryOnContractTest.kt`
- Read for parity: `src/components/VirtualTryOnModal.tsx`

- [ ] Write Functions tests for missing auth, missing App Check, empty image, oversized image, unsupported media type, provider secret missing, provider timeout, provider rejection, successful result, and result persistence.
- [ ] Run Functions tests. Confirm the new cases expose the current gaps.
- [ ] Store uploads in Firebase Storage under the authenticated user. Pass a signed or controlled object reference to the provider. Never log image bytes or signed URLs.
- [ ] Validate the provider response. Persist the real output reference and job status. Return a job ID, status, and controlled media URL.
- [ ] Add bounded timeout, one safe retry for a retryable provider response, and idempotency by request ID.
- [ ] Write common KMP tests for file selection input, payload encoding, progress, result display state, timeout, and provider-unavailable mapping.
- [ ] Add the shared virtual try-on action and its Android and Wasm platform capabilities to `contracts/ui-actions.json`.
- [ ] Run Functions tests, KMP tests, and the action contract check.
- [ ] Commit with message `fix: wire virtual try-on to real provider results`.

## Task 4: Generate and enforce backend route names

**Files:**

- Create: `contracts/firebase-functions.json`
- Create: `scripts/generate-function-contract.mjs`
- Create: `composeApp/src/commonMain/kotlin/network/GeneratedFirebaseRoutes.kt`
- Modify: `composeApp/src/commonMain/kotlin/network/ApiClient.kt`
- Modify: `functions/src/ai/index.ts`
- Modify: `functions/src/catalog.ts`
- Modify: `functions/src/users.ts`
- Create: `functions/test/function-contract.test.js`
- Read for parity: `src/components/features/chat/CreatorGenAIAgentsChatPage.tsx`
- Read for parity: `src/components/features/chat/PersonalAIShopperChatPage.tsx`
- Read for parity: `src/components/features/wardrobe/WardrobePage.tsx`
- Read for parity: `src/components/features/travel/TravelTripsPage.tsx`

- [ ] Put every supported callable and HTTP Function in one JSON contract. Record transport, Auth, App Check, request schema, response schema, provider, and UI action IDs.
- [ ] Include the six missing names found by the audit: `creatorAgentsMetadata`, `fetchProductsByIds`, `seasonalStyling`, `parseReceipt`, `generateRecipeBargainChef`, and `updateUserProfile`.
- [ ] Write a test that loads `functions/lib/index.js` and compares the real export set with the contract.
- [ ] Run Functions tests. Confirm the six missing names fail.
- [ ] Implement each missing function with real Firestore, Realtime Database, Storage, Data Connect, Google Cloud, or provider behavior as assigned by the service contract. Do not return sample data.
- [ ] Make receipt parsing callable and invoke it from the existing shared Compose travel screen.
- [ ] Generate Kotlin names from JSON. Make `--check` fail when the generated file is stale.
- [ ] Replace literal KMP client names with generated names. Keep the frozen React calls only until Task 13 deletes that client.
- [ ] Test authentication, App Check, validation, missing provider, empty real result, and successful real result for each new function.
- [ ] Run Functions tests, KMP tests, and `node scripts/generate-function-contract.mjs --check`.
- [ ] Commit with message `fix: align client and backend names`.

## Task 5: Sync account data across Android, Wasm, and devices

**Files:**

- Create: `contracts/sync-records.json`
- Create: `composeApp/src/commonMain/kotlin/data/SyncRecord.kt`
- Create: `composeApp/src/commonMain/kotlin/data/SyncRepository.kt`
- Create: `composeApp/src/androidMain/kotlin/data/FirebaseSyncDataSource.kt`
- Create: `composeApp/src/wasmJsMain/kotlin/data/FirebaseSyncDataSource.kt`
- Modify: `composeApp/src/commonMain/kotlin/network/ApiClient.kt`
- Modify: `composeApp/src/commonMain/kotlin/network/models/ProfileModels.kt`
- Modify: `composeApp/src/commonMain/kotlin/network/models/OrderModels.kt`
- Create: `functions/src/sync.ts`
- Modify: `functions/src/index.ts`
- Modify: `functions/src/webapi.ts`
- Modify: `firestore.rules`
- Create: `database.rules.json`
- Modify: `firebase.json`
- Create: `functions/test/cross-device-sync.test.js`
- Create: `composeApp/src/commonTest/kotlin/data/SyncRepositoryTest.kt`

- [ ] Define profile, preferences, cart, wardrobe, orders, saved items, and provider jobs in `sync-records.json`. Record primary store, record key, server timestamp field, version field, merge rule, deletion rule, and live update channel.
- [ ] Keep sign-in sessions local to each device. Require the same Firebase account on Android and web so both sessions resolve to the same UID.
- [ ] Write emulator tests with two clients using the same UID. Verify that a write from client A appears on client B, a stale write cannot overwrite a newer version, and sign-out stops listeners.
- [ ] Route mutations through authenticated Functions when the record needs validation, payment, provider work, or multi-store coordination.
- [ ] Use server timestamps and monotonic versions. Use transactions or preconditions for conflicting writes.
- [ ] Use Firestore or Realtime Database listeners for live updates according to the ownership contract. Treat device storage as a cache, not the source of truth.
- [ ] Implement Android and Wasm data sources behind the same common repository interface. Platform files may wrap SDK differences. They may not contain screen logic.
- [ ] Add Realtime Database rules to `database.rules.json` and declare them in `firebase.json`.
- [ ] Test offline queue, reconnect, duplicate request, deleted record, revoked account, and two-device conflict behavior.
- [ ] Run Firebase emulator tests, Functions tests, and common KMP tests.
- [ ] Commit with message `fix: sync account data across devices`.

## Task 6: Give each retained backend one tested responsibility

**Files:**

- Create: `contracts/backend-services.json`
- Create: `docs/operations/backend-ownership.md`
- Create: `scripts/verify-backend-ownership.mjs`
- Modify: `composeApp/src/commonMain/kotlin/network/SpressoBackend.kt`
- Modify: `composeApp/src/commonMain/kotlin/network/DataConnectHelper.kt`
- Modify: `functions/src/users.ts`
- Modify: `functions/src/database/spannerClient.ts`
- Modify: `terraform/main.tf`
- Create: `functions/test/backend-ownership.test.js`

- [ ] List Firestore, Realtime Database, Storage, Functions, Data Connect, Cloud SQL, Redis, Spanner, Cloud Run, Worker, and external providers in `backend-services.json`.
- [ ] For each retained service, record purpose, data owner, client, server owner, environment variable or binding, health check, failure state, and responsible team.
- [ ] Mark the service required, optional, dormant, or migration-only. Do not delete a service in this task.
- [ ] Write a check that rejects two services claiming primary ownership of the same record type unless the contract names a replication direction and consistency rule.
- [ ] Keep Realtime Database access in the Android and Wasm adapters. Limit it to the responsibilities recorded in the contract. Add emulator tests for its rules and real read and write paths.
- [ ] Choose one primary product source in the service contract. Make the shared KMP repository use that source. Do not load two sources and let response order choose the winner.
- [ ] Make account deactivation handle each retained store independently. Return partial cleanup status and queue retryable server cleanup. Do not silently skip a store.
- [ ] Require explicit Spanner project, instance, and database configuration. Remove stale default IDs while keeping Spanner.
- [ ] Add authenticated health checks that verify service access without exposing data or secrets.
- [ ] Run the ownership check, Firebase emulator tests, Functions tests, and Terraform validation.
- [ ] Commit with message `docs: define and test backend ownership`.

## Task 7: Preserve purchasing and replace fake purchase behavior

**Files:**

- Modify: `composeApp/src/commonMain/kotlin/components/shared/HITLCheckoutModal.kt`
- Modify: `composeApp/src/commonMain/kotlin/network/ApiClient.kt`
- Modify: `functions/src/payments/index.ts`
- Modify: `functions/src/webhooks.ts`
- Modify: `agents/tool_server/main.py`
- Create: `contracts/purchase-policy.json`
- Create: `functions/test/purchase-contract.test.js`
- Create: `composeApp/src/commonTest/kotlin/features/PurchaseFlowTest.kt`
- Read for parity: `src/components/HITLCheckoutModal.tsx`

- [ ] Record current release mode, provider sandbox, permitted actions, approval gates, idempotency rule, webhook source, order owner, refund owner, and production enablement requirements in `purchase-policy.json`.
- [ ] Keep the purchase and checkout controls in the shared Compose screen so Android and Wasm use the same behavior.
- [ ] Write tests that reject fixed client secrets, invented order IDs, hardcoded provider success, client-supplied totals, missing consent, duplicate requests, invalid webhook signatures, and provider errors reported as success.
- [ ] Keep the current production user-completed behavior until the policy contract records approval for in-app transaction execution.
- [ ] Wire the sandbox path to real provider test credentials from secret bindings. Load price and product identity from the backend. Never trust a client amount.
- [ ] Use an idempotency key tied to authenticated user, cart version, and approval event.
- [ ] Verify webhooks before state changes. Persist provider event IDs and reject replays.
- [ ] Map sandbox success, decline, cancellation, timeout, and webhook delay to real UI states. Do not fabricate an order before the provider confirms it.
- [ ] Keep production execution disabled by configuration until account, billing, legal, and product checks pass. The feature remains present and testable.
- [ ] Run purchase contract, KMP, Functions, and tool-server tests.
- [ ] Commit with message `fix: preserve purchasing with real guarded behavior`.

## Task 8: Enforce Auth and App Check without hiding provider errors

**Files:**

- Modify: `functions/src/wardrobe/index.ts`
- Modify: `functions/src/users.ts`
- Modify: `functions/src/interactions.ts`
- Modify: `functions/src/catalog.ts`
- Modify: `functions/src/webapi.ts`
- Modify: `composeApp/src/commonMain/kotlin/network/CloudFunctionsHelper.kt`
- Modify: `composeApp/src/androidMain/kotlin/network/AuthHelper.kt`
- Modify: `composeApp/src/androidMain/kotlin/network/CloudFunctionsHelper.kt`
- Modify: `composeApp/src/wasmJsMain/kotlin/network/AuthHelper.kt`
- Modify: `composeApp/src/wasmJsMain/kotlin/network/CloudFunctionsHelper.kt`
- Create: `functions/test/app-check-policy.test.js`
- Create: `composeApp/src/commonTest/kotlin/network/FirebaseCredentialsPolicyTest.kt`

- [ ] Generate an Auth and App Check policy test from `contracts/firebase-functions.json`.
- [ ] Confirm it fails for wardrobe, preference, onboarding, Coinbase, profile, interaction, and travel callables.
- [ ] Add `enforceAppCheck: true` to protected callables.
- [ ] Make the Wasm production configuration check fail when the App Check site key is absent.
- [ ] Keep local App Check testing explicit with documented debug tokens. Never disable checks in deployed Functions.
- [ ] Preserve provider and internal error status. Do not convert every thrown error to 401.
- [ ] Run Functions, common KMP, Android, and Wasm credential tests.
- [ ] Commit with message `fix: enforce backend identity policy`.

## Task 9: Fix route identity and screen reachability

**Files:**

- Modify: `composeApp/src/commonMain/kotlin/navigation/NavKey.kt`
- Modify: `composeApp/src/commonMain/kotlin/navigation/NavigationState.kt`
- Modify: `composeApp/src/commonMain/kotlin/navigation/Navigator.kt`
- Modify: `composeApp/src/commonMain/kotlin/App.kt`
- Create: `composeApp/src/commonMain/kotlin/navigation/PlatformNavHost.kt`
- Create: `composeApp/src/androidMain/kotlin/navigation/PlatformNavHost.android.kt`
- Create: `composeApp/src/wasmJsMain/kotlin/navigation/PlatformNavHost.wasmJs.kt`
- Create: `composeApp/src/commonTest/kotlin/navigation/NavRegistryTest.kt`
- Create: `composeApp/src/commonTest/kotlin/navigation/NavigatorTest.kt`
- Create: `composeApp/src/wasmJsTest/kotlin/navigation/WebHistoryRouteTest.kt`

- [ ] Remove the AndroidX Navigation 3 parent type from the common `NavKey` model. Keep keys serializable and platform-neutral.
- [ ] Keep one common key registry and one common screen mapping. Do not copy a screen mapping into Android and Wasm files.
- [ ] Use an Android platform host that adapts the common keys to Navigation 3.
- [ ] Use a Wasm platform host that maps the same keys to browser history and direct URLs.
- [ ] Add tests that enumerate all declared keys and confirm each has a common screen entry.
- [ ] Test top-level replacement, detail back stack, external navigation, and saved arguments.
- [ ] Test every Wasm direct URL plus browser back and forward behavior.
- [ ] Add route and screen action IDs to `contracts/ui-actions.json`.
- [ ] Run common, Android Navigation 3, and Wasm browser route tests.
- [ ] Commit with message `fix: share routes across Android and Wasm`.

## Task 10: Restore Android and Wasm feature execution

**Files:**

- Modify: `composeApp/src/commonMain/kotlin/components/features/onboarding/GamifiedOnboardingDialog.kt`
- Modify: `composeApp/src/commonMain/kotlin/components/features/onboarding/GamifiedOnboardingSection.kt`
- Modify: `composeApp/src/commonMain/kotlin/network/Telemetry.kt`
- Create: `composeApp/src/commonMain/kotlin/components/features/auth/PasskeyRegistrationStep.kt`
- Modify: `composeApp/build.gradle.kts`
- Modify: `gradle/libs.versions.toml`
- Create: `composeApp/src/commonTest/kotlin/features/OnboardingFlowTest.kt`
- Create: `composeApp/src/wasmJsTest/kotlin/features/WasmFeatureParityTest.kt`

- [ ] Add tests for onboarding telemetry, signed-out profile behavior, profile save, passkey supported, passkey unavailable, and backend failure.
- [ ] Restore `Telemetry.recordLog` as a real sink or replace the calls with the current telemetry API. Do not add an empty method.
- [ ] Restore the passkey component with a real capability check and error state. If the current device cannot use passkeys, show unavailable without claiming registration.
- [ ] Keep Navigation 3 dependencies in Android source sets. Remove Android-only dependencies from common and Wasm resolution.
- [ ] Give Wasm real implementations for every common `expect` declaration used by a release screen. An unavailable device feature must return a typed capability result.
- [ ] Run focused common tests.
- [ ] Compile Android and Wasm with JDK 17 so platform tests can execute. Treat compilation as a test prerequisite here, not as release packaging.
- [ ] Run Android unit tests, Android lint, and Wasm tests.
- [ ] Commit with message `fix: restore KMP Android and web execution`.

## Task 11: Wire and secure Worker and Cloud Run paths

**Files:**

- Modify: `mcp-portal-worker/wrangler.jsonc`
- Modify: `mcp-portal-worker/src/index.ts`
- Modify: `mcp-portal-worker/test/index.spec.ts`
- Modify: `agents/tool_server/requirements.txt`
- Modify: `agents/tool_server/main.py`
- Create: `agents/tool_server/test_main.py`
- Create: `agents/tool_server/Dockerfile`
- Create: `agents/tool_server/.dockerignore`

- [ ] Replace starter Worker tests with missing token, invalid signature, wrong audience, expiry, allowed route, denied route, oversized body, backend timeout, and header stripping cases.
- [ ] Declare the real backend URL, Access team domain, and Access audience bindings in Wrangler configuration.
- [ ] Generate Worker runtime types and remove the hand-written binding type.
- [ ] Verify Access JWT signature, issuer, audience, and expiry. Cache keys with a bounded TTL.
- [ ] Remove the localhost backend fallback. Return unavailable when the binding is absent.
- [ ] Fix the invalid Python requirements line and test a clean container install.
- [ ] Keep required tool and purchase routes. Replace example data and fixed URLs with validated inputs, provider sandbox configuration, and contract-driven results.
- [ ] Do not return provider exception strings to clients.
- [ ] Run Worker tests, type generation, deploy dry run, Python tests, and container health tests.
- [ ] Commit with message `fix: wire Worker and Cloud Run services`.

## Task 12: Make Terraform describe every retained service

**Files:**

- Modify: `terraform/provider.tf`
- Modify: `terraform/main.tf`
- Modify: `terraform/variables.tf`
- Modify: `terraform/outputs.tf`
- Create: `terraform/backend.hcl.example`
- Create: `terraform/versions.tf`
- Create: `terraform/tests/production.tftest.hcl`
- Create: `docs/operations/resource-ownership.md`

- [ ] Write Terraform tests for stale project IDs, mutable images, missing secret containers, mismatched Spanner names, missing required service resources, and undocumented resource ownership.
- [ ] Keep Cloud SQL, Redis, Spanner, Cloud Run, networking, and other required Google Cloud resources. Match each Terraform resource to `contracts/backend-services.json`.
- [ ] Mark a resource dormant when it has no current caller. Keep it until the owner approves cleanup.
- [ ] Add Firebase, Firestore, Realtime Database, Storage, Functions, Cloud Build, and App Check APIs needed by the verified project.
- [ ] Add all secret containers named by Functions and tool-server contracts. Do not put secret values in Terraform state.
- [ ] Add remote GCS state configuration and a bootstrap note. Do not commit a saved plan file.
- [ ] Pin Terraform and provider versions to reviewed releases.
- [ ] Document whether Terraform, Firebase CLI, Wrangler, or a provider console owns each resource and deployment.
- [ ] Run format, init without backend, validate, and Terraform tests.
- [ ] After access is restored, run a saved plan against `get-spresso`. Review every change before apply.
- [ ] Commit with message `infra: describe retained production services`.

## Task 13: Cut web to KMP Wasm and delete React and Vite

This task comes after the customer paths pass their contract tests.

**Files:**

- Create: `contracts/client-parity.json`
- Create: `scripts/check-kmp-web-artifact.mjs`
- Create: `composeApp/src/wasmJsTest/kotlin/parity/ClientParityTest.kt`
- Modify: `composeApp/src/wasmJsMain/kotlin/main.kt`
- Modify: `package.json`
- Modify: `composeApp/build.gradle.kts`
- Modify: `gradle/libs.versions.toml`
- Modify: `firebase.json`
- Modify: `package-lock.json`
- Modify: `functions/package-lock.json`
- Modify: `mcp-portal-worker/package-lock.json`
- Create: `docs/operations/dependency-audit.md`
- Delete after cutover: `src/`
- Delete after cutover: `index.html`
- Delete after cutover: `vite.config.ts`
- Delete after cutover: `firebase-applet-config.json`

- [ ] Put every React route, primary action, backend call, empty state, and error state in `client-parity.json`. Link each row to an existing common Compose screen and action contract.
- [ ] Write a parity test that fails while any React behavior lacks a common Compose implementation or Wasm adapter.
- [ ] Migrate each missing caller into the existing common screen. Do not add a compatibility layer that keeps both client implementations active.
- [ ] Build the Wasm production browser distribution and run direct URL, back and forward, refresh, Auth, App Check, data sync, virtual try-on, and purchase sandbox tests.
- [ ] Update Firebase Hosting to serve the KMP Wasm production distribution. Deploy it to a staging channel before production cutover.
- [ ] Add `check-kmp-web-artifact.mjs`. Check Kotlin dead-code elimination, production mode, source maps policy, unreferenced assets, provider SDK size, and a reviewed gzip budget.
- [ ] Switch production Hosting only after every parity row passes.
- [ ] In the same migration wave, delete `src/`, root React HTML, Vite config, React-only Firebase config, React-only tests, and generated TypeScript client code. Remove React, React DOM, Vite, and browser-only React packages from `package.json`.
- [ ] Keep root scripts that audit contracts. Change client build and development commands to the Gradle Wasm tasks.
- [ ] Remove unused packages only when the service and feature contracts prove there is no caller.
- [ ] Upgrade one direct dependency family at a time. Run focused tests after each change.
- [ ] Record any high advisory with no upstream fix, including exposure, control, owner, and expiry date.
- [ ] Run the parity test, KMP Web build, artifact check, Android compile, all package tests, and production dependency audits.
- [ ] Commit with message `refactor: move web to shared KMP client`.

## Task 14: Build one complete CI and staging release path

**Files:**

- Modify: `.github/workflows/ci-autofix.yml`
- Modify: `.github/workflows/spresso-multi-agent-cicd.yml`
- Modify: `.github/workflows/release.yml`
- Modify: `scripts/ci-gate.sh`
- Create: `.github/workflows/post-deploy-smoke.yml`
- Create: `docs/operations/release-runbook.md`

- [ ] Make one pull request workflow authoritative.
- [ ] Set up Node 20, JDK 17, Gradle, Terraform 1.16, and package caches.
- [ ] Run `npm ci` in root, Functions, and Worker package roots.
- [ ] Gate on synthetic-success scan, UI action contract, virtual try-on tests, purchase tests, backend names, cross-device sync, service ownership, shared route tests, Android and Wasm tests, Worker and tool-server tests, Terraform tests, web artifact checks, and dependency policy.
- [ ] Keep live checks out of untrusted pull requests. Run them after staging deploy with short-lived credentials.
- [ ] Deploy immutable Firebase, Cloud Run, Worker, KMP Wasm web, and Android artifacts from the same commit.
- [ ] Stop promotion on the first failed post-deploy smoke check.
- [ ] Document promotion, rollback, key rotation, provider disable, and incident commands.
- [ ] Commit with message `ci: gate real feature behavior before release`.

## Task 15: Prove KMP Wasm and Android against live services

This task changes live systems. A project owner must approve billing, deploy, Terraform apply, and provider production enablement.

**Files:**

- Modify: `docs/operations/production-inventory.md`
- Create: `docs/operations/release-evidence/README.md`
- Modify: `README.md`

- [ ] Confirm one commit passes CI.
- [ ] Confirm the Firebase plan supports each enabled service or record the approved plan change.
- [ ] Review and apply only the approved Terraform changes.
- [ ] Deploy rules, indexes, Functions, Hosting with the KMP Wasm artifact, Storage rules, Cloud Run, Worker, and Android from the same commit.
- [ ] Run authenticated reachability checks for every service in `backend-services.json`.
- [ ] Run every primary shared Compose action on Wasm web and Android. Record request ID, backend name, result state, and observed user state without saving personal data.
- [ ] Sign into the same test account on Android and Wasm. Change profile, preferences, cart, wardrobe, and saved items on each device. Verify the other client receives each update and stale writes do not win.
- [ ] Run virtual try-on with a consented test image. Verify upload, provider job, stored result, display, and cleanup.
- [ ] Run the purchase feature with provider sandbox credentials. Verify consent, server-owned amount, idempotency, decline, cancellation, and webhook handling. Keep production charging disabled until approved.
- [ ] Run every Wasm direct route and every Android top-level destination from the shared route contract.
- [ ] Confirm no provider failure renders sample content or success.
- [ ] Save command versions, commit SHA, deployment IDs, status summary, and rollback identifiers. Do not save tokens or secrets.
- [ ] Update README with observed status and date.
- [ ] Commit with message `docs: record verified production behavior`.

## Final acceptance

- [ ] No production or readiness path invents success.
- [ ] Every visible shared Compose control has a real contract and tested failure state on Android and Wasm.
- [ ] Virtual try-on passes upload, provider, storage, display, timeout, and unavailable checks.
- [ ] Every client backend name exists in the generated contract and deployed export set.
- [ ] Realtime Database and each required Google Cloud service have a documented owner and live reachability result.
- [ ] Purchasing remains visible and passes real provider sandbox tests with production charging guarded.
- [ ] Every common route renders on Wasm and maps through Navigation 3 on Android.
- [ ] The release has one KMP Compose screen tree. React, Vite, and their duplicate screen files are absent.
- [ ] Android and Wasm compile and pass tests with JDK 17. Android lint passes.
- [ ] Worker bindings exist and Access verification fails closed.
- [ ] Terraform plan matches the retained service inventory and remote state policy.
- [ ] The KMP Wasm production entrypoint uses real files. Dead-code elimination and dependency policy pass their reviewed limits.
- [ ] Authenticated production smoke checks pass for the recorded deployment IDs.
