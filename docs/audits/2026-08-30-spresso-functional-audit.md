# Spresso Functional Readiness Audit

Date: 2026-08-30

Commit inspected: `34deb25`

Working tree: dirty before this audit. Existing changes were treated as user work and were not changed.

## Verdict

Spresso is not ready for release. The checkout has no verified end-to-end production path.

The web client passes TypeScript checks and creates a static bundle. Its configured development and production entrypoints do not exist. Its first authenticated route renders no page. Android and Wasm compilation fail. The public Firebase Hosting and Functions URLs tested during the audit return HTTP 404. The Cloudflare Worker has no backend binding and its tests fail. Customer-facing code uses several backend systems without one tested ownership contract, and some paths replace failure with synthetic success.

## Product owner priority after review

The product owner set this implementation order after reviewing the findings:

1. Remove hardcoded and synthetic success.
2. Wire shared Compose controls to real backend behavior on Android and Wasm.
3. Prove virtual try-on across upload, provider, storage, and display.
4. Fix route and backend name drift.
5. Keep Realtime Database and required Google Cloud services. Prove the role and reachability of each.
6. Keep purchasing. Replace fake behavior with a real, guarded provider path.
7. Migrate Hosting to KMP Wasm and delete React and Vite after feature parity passes.
8. Handle production packaging, dead-code elimination, and bundle limits after the functional paths pass.

The product owner reports that `get-spresso` is on the Firebase Spark plan and shows zero traffic. The audit could not verify that console state because the current account lacks access.

The checkout contains three client targets. The root `src/` tree is an existing React web client built by Vite. `composeApp/src/androidMain` is the native Android client. `composeApp/src/wasmJsMain` is a second web target. Android itself is not a web build, but KMP can produce web output through the existing Wasm target.

The product owner selected the KMP and Compose app as the single client codebase for Android and web. The revised plan moves shared screens into `commonMain`, keeps Navigation 3 and CameraX in Android adapters, and uses browser adapters for Wasm. It freezes React and Vite during parity work, then deletes that client after KMP web passes the same routes and actions. It does not create a second set of feature screens.

Firebase sign-in sessions remain device-local for security. Data consistency works through the same Firebase project and UID. When the user signs into the same account on another device, profile, preferences, cart, wardrobe, order, and provider job data should load from the shared backend and update through listeners. The plan adds server timestamps, version checks, idempotency keys, and conflict rules for those records.

## Scope and method

The audit read and traced these sources:

- `AGENTS.md`, `.agents/AGENTS.md`, `mcp-portal-worker/AGENTS.md`
- `README.md`, `docs/spresso_architecture_context.md`, and `docs/testing.md`
- Root, Functions, and Worker package manifests and lock files
- `firebase.json`, `.firebaserc`, Firebase client setup, and Functions exports
- Web routes, KMP Navigation 3 keys and entries, HTTP and callable clients
- All Terraform files under `terraform/`
- CI workflows and `scripts/ci-gate.sh`
- Release-facing scripts, Worker code, Cloud Run tool-server code, and the ranking worker

GitNexus was refreshed against the current working tree. The index contains 11,058 nodes, 18,427 edges, 338 clusters, and 217 flows. Flow generation hit its budget, so the audit used text search and direct source inspection to cover routes that the graph may have omitted.

## Release scorecard

| Area | Result | Evidence |
| --- | --- | --- |
| Web type check | Pass | `npm run lint` completed successfully. |
| Web static build | Partial pass | `npm run build -- --manifest` completed. The main JavaScript chunk is 2,262.40 kB and 600.02 kB gzip. Vite reported ineffective dynamic imports and a chunk over 500 kB. |
| Web runtime entrypoints | Fail | `package.json:7` points `dev` at missing `server.ts`. `package.json:9` points `start` at missing `dist/server.cjs`. The Vite build does not create that server file. |
| Web route startup | Fail | `src/App.tsx:36` starts on `catalog`, but the render branches begin with `chat`, `travel`, and `products`. No `catalog` branch exists. |
| Web data tests | Fail | Five of six assertions pass. `OrderItemSchema` accepts a negative quantity, contrary to `src/test/data-layer.test.ts:25`. |
| Functions compile | Pass | `tsc --noEmit` completed successfully. |
| Functions tests | Partial pass | Four test files pass. They cover chat auth, chat CORS, live token, and rules. Product, cart, order, payment, provider, web API, and deployment contracts have no passing test coverage. |
| Android compile | Fail | `GamifiedOnboardingDialog.kt:98` and `:100` cannot resolve `recordLog`. `GamifiedOnboardingSection.kt:98` cannot resolve `PasskeyRegistrationStep`. |
| Android unit tests | Blocked | Kotlin compilation fails before tests run. |
| Wasm compile | Fail | `androidx.navigation3:navigation3-ui:1.1.0-alpha01` has no compatible Wasm JS variant in the current dependency graph. |
| KMP route registration | Pass | All 40 declared `NavKey` types have entries in `App.kt`. The top-level group comparison uses key classes consistently. |
| Worker type generation | Partial pass | `wrangler types --check` passes, but generated `Env` has no bindings. Source code hand-writes `BACKEND_URL`. |
| Worker dry run | Partial pass | `wrangler deploy --dry-run` completes and reports `No bindings found`. |
| Worker tests | Fail | Both starter tests expect `Hello World!`. The current Worker returns a missing Access JWT error. |
| Terraform format and validation | Pass | `terraform fmt -check -recursive` and `terraform validate` pass with provider 5.45.2. |
| Terraform plan | Not usable | No state file or backend block exists. The checked-in `terraform/tfplan` was created by Terraform 1.15.9 and cannot be read by local Terraform 1.16.0. |
| Firebase public reachability | Fail | Hosting `/`, `webApi/api/products`, `chatStream`, and `discoverPersonalizedProducts` returned HTTP 404 at the declared `get-spresso` URLs. |
| Cloudflare reachability | Unverified | Saved Wrangler credentials are expired, so the deployed Worker and its bindings could not be listed. |
| Dependency audit | Fail | Root reports 48 production advisories, including 7 high severity. Functions reports 97, including 12 high severity. Worker reports zero. |
| Zero-mock rule | Fail | The integration runner creates a local fake server when production is down. The ranking worker synthesizes embeddings and notification targets. Wardrobe code falls back to local sample data. |

## Blocking findings

### P0. No deployment can be proven reachable

The repository declares Firebase project `get-spresso` in `.firebaserc:3`. The public URLs tested for that project return 404. Firebase CLI credentials are expired. The active gcloud project is `musically-studio`, not `get-spresso`. The active gcloud account cannot read `get-spresso`. Wrangler authentication is also expired.

This blocks checks for Firebase app registration, Hosting releases, Functions deployments, App Check registration, Firestore, Storage, Worker deployment, Worker bindings, Cloud Run, and Spanner.

Code changes cannot resolve this blocker. A project owner must grant or restore access before any deployment claim can pass.

### P0. Android and Wasm cannot produce runnable artifacts

The Android compile fails on unresolved onboarding symbols. The Wasm compile fails because a Navigation 3 UI artifact is placed in a source set that targets Wasm even though the artifact has no Wasm variant.

The KMP route registry itself is internally complete. `NavKey.kt` declares 40 keys and `App.kt` registers all 40. The failure sits in compilation and platform dependency placement, not missing route entries.

### P0. Web launch scripts and the first route are broken

The root scripts claim two server entrypoints that do not exist:

```json
"dev": "tsx server.ts",
"start": "node dist/server.cjs"
```

The only build script is `vite build`, which emits static client assets. A production process launched with `npm start` exits because `dist/server.cjs` is absent.

The app initializes `activeTab` to `catalog` at `src/App.tsx:36`. No `catalog` render condition exists in `src/App.tsx:452-550`. The hash allowlist at `src/App.tsx:52` contains nonexistent `scaffold` and omits valid `travel`. A signed-in user can land on a blank content area until they choose another tab.

### P0. The current integration check can report success without production

`scripts/verify-integration.ts:16-241` starts an Express server on localhost when the live URL is unavailable. That server returns invented products, orders, Stripe secrets, saved cards, subscriptions, AI output, merchant trust scores, and purchase success. Later checks send `Bearer test-token` and a sample biometric token.

This script tests its own fake responses when the deployment is absent. It cannot support a production-readiness claim. `scripts/universal_mock_scanner.cjs` reported seven weak text matches but missed these structured fake responses, local fallbacks, and random embeddings.

### P0. Client and backend entrypoints have drifted apart

The clients call six deployed names that Functions does not export:

| Client | Missing deployed name | Source |
| --- | --- | --- |
| Web | `creatorAgentsMetadata` | `src/components/features/chat/CreatorGenAIAgentsChatPage.tsx:61` |
| Web | `fetchProductsByIds` | `src/components/features/chat/PersonalAIShopperChatPage.tsx:156` |
| Web | `seasonalStyling` | `src/components/features/wardrobe/WardrobePage.tsx:44` |
| Web | `parseReceipt` | `src/components/features/travel/TravelTripsPage.tsx:102` |
| KMP | `generateRecipeBargainChef` | `composeApp/src/commonMain/kotlin/network/FirebaseRoutes.kt:21` |
| KMP | `updateUserProfile` | `composeApp/src/commonMain/kotlin/network/FirebaseRoutes.kt:23` |

The repository has no generated contract or test that compares client route names with exported Functions names.

## High-risk findings

### P1. Backend ownership is unclear in production clients

The checked-in launch architecture names Firestore, Auth, App Check, Functions, Storage, Spanner, and Cloud Run. It marks Data Connect, Postgres, Cloud SQL, Redis, and Realtime Database as legacy or out of scope. The product owner has now directed the implementation to keep Realtime Database and required Google Cloud services.

The web client initializes Realtime Database and Data Connect on every load at `src/lib/firebase.ts:17-20`. `src/main.tsx:7-9` imports the whole Data Connect SDK and writes it to `window.SpressoDataConnect`. `src/App.tsx:243-295` loads Firestore-backed products and then always calls legacy Data Connect. A Data Connect response can overwrite the current products.

Travel, wardrobe, profile, payment method, subscription, and preference UI paths also import generated Data Connect operations. `deactivateAccount` requires a Data Connect deletion, so account deletion can fail when that service is unavailable.

Terraform provisions Cloud SQL and Redis at `terraform/main.tf:36-98`. The plan will retain required resources and assign one tested responsibility to each. It will not delete a data service until the product owner approves a separate cleanup.

### P1. Product and preference API contracts lose data

`functions/src/webapi.ts:108` returns Firestore document data without adding `doc.id`. `src/App.tsx:250-264` expects each product to have `p.id`.

The location modal sends `location`, `coords`, and `radius` at `src/App.tsx:566-575`. The API only accepts `theme`, `seedHex`, and `secondarySeedHex` at `functions/src/webapi.ts:68-79`. The location update returns success but writes nothing.

The API catches every thrown error and returns 401 at `functions/src/webapi.ts:114-115`. Backend outages and programming faults become false authentication errors. `writeJson` also sets `Access-Control-Allow-Origin: *` while the Function configuration limits CORS to two Hosting origins.

### P1. App Check policy is inconsistent

These callable groups do not set `enforceAppCheck: true`:

- Wardrobe and preference functions in `functions/src/wardrobe/index.ts`
- `initializeOnboarding`, `connectCoinbaseWallet`, and `getUserProfile` in `functions/src/users.ts`
- `ingestInteraction` in `functions/src/interactions.ts`
- `getTravelTrips` in `functions/src/catalog.ts`

The web client leaves App Check disabled when `VITE_FIREBASE_APPCHECK_RECAPTCHA_SITE_KEY` is absent. `authFetch` then omits the token at `src/lib/firebase.ts:265-268`. A production build can complete even though every protected API call will fail.

### P1. The Worker is not wired or secure enough for release

`mcp-portal-worker/wrangler.jsonc` declares no `BACKEND_URL` binding. The dry run confirms that no bindings exist. `mcp-portal-worker/src/index.ts:44` falls back to `http://localhost:8080`, which cannot reach the intended production service.

The Worker only checks whether a Cloudflare Access token string exists. It does not verify the token signature, issuer, audience, or expiry. It forwards the original headers, including the Access token and cookies, to the backend. The DLP rule only masks one credit-card pattern and sets no request-size limit.

The checked-in tests still assert the starter `Hello World!` response. Both fail against current code. Local workerd also warns that it only supports compatibility date 2026-03-10 while the Worker requests 2026-08-17.

Cloudflare recommends fail-closed secret and binding use, generated runtime types, bounded work, and tested retry and error behavior. See [Cloudflare Workers Best Practices](https://developers.cloudflare.com/workers/best-practices/workers-best-practices/).

### P1. Checkout code can still create payments and orders

The repository instructions set checkout to a user-completed mode. The UI should prepare a cart and open the merchant checkout. It should not place the order.

`functions/src/payments/index.ts` still exports `createStripeIntent`, `confirmPurchase`, `executeBiometricPurchase`, and `processCryptoPayment`. `confirmPurchase` can charge through Stripe and create an order if deployed. The web checkout calls `createCheckoutIntent`, which rejects and tells the client to use `confirmPurchase`. KMP calls `confirmPurchase` directly.

This behavior conflicts with the checked-in user-completed policy. The product owner wants to keep purchasing. Preserve the feature, replace fixed or invented success with real provider sandbox behavior, and keep production charging guarded until policy, billing, legal, and provider checks approve it.

### P1. Terraform and the service inventory do not agree

Terraform syntax is valid, but the resource graph does not match the checked-in launch architecture or a verified service inventory.

- It provisions Cloud SQL and Redis, but no checked-in service contract names their production callers and data ownership.
- It has no remote state backend.
- It does not manage Firebase Hosting, Functions, Firestore, Storage, or App Check.
- Its secret list omits `SERPAPI_API_KEY`, `PARALLEL_API_KEY`, both Higgsfield secrets, four Google Wallet secrets, and two Coinbase CDP secrets used by Functions.
- It creates Spanner instance `spresso-catalog` and database `catalog_db`, while `functions/src/database/spannerClient.ts` expects different resource names and defaults to forbidden project `spresso-19`.
- It declares Cloud Run ingress but no explicit invoker policy in the inspected files.

No apply should run until project access, resource ownership, state storage, and the retained resource list are settled. The implementation plan keeps required resources and verifies them.

### P1. Production dependency audits fail

The root package tree has 48 reported production advisories, including 7 high severity. The Functions tree has 97, including 12 high severity. The high findings include OpenTelemetry denial-of-service paths, Axios issues, `ws` memory issues, and crypto package issues in the Coinbase dependency chain.

Some proposed audit fixes downgrade or replace major packages. Do not run `npm audit fix --force` without focused tests and a dependency review.

## Medium-risk findings

### P2. Tree shaking and route splitting are ineffective

Every top-level web page is imported at startup in `src/App.tsx:4-33`. The app has no `React.lazy` route boundary. `src/main.tsx:7-9` retains the full generated Data Connect SDK on a global object.

Vite produces a 2,262.40 kB main JavaScript chunk. It warns that dynamic imports for Firebase Functions, the Data Connect bundle, and `src/lib/firebase.ts` cannot split those modules because other code imports them statically.

The project has no checked-in bundle budget or manifest test, so CI cannot detect a route that pulls a provider SDK into the startup chunk.

### P2. CI does not install or verify the full release toolchain

`scripts/ci-gate.sh` checks stale identifiers, Functions tests, one web schema test, Android lint and tests, and Terraform. It omits the web build, web route checks, Wasm, Worker, bundle limits, dependency audits, callable contract checks, and live smoke tests.

The release and multi-agent workflows call the gate without setting up Node, running `npm ci`, or setting up Terraform. One pull request workflow only runs Android. The gate currently stops at stale identifiers. When its web test runs separately, it fails because negative order quantities pass validation.

### P2. Stale and invented identifiers remain in deployable files

The CI gate finds stale project and package identifiers in Dataflow code, Fastlane, Spanner code, policy files, deployment scripts, runtime database code, and release scripts. Specific examples include:

- `dataflow/vto_video_pipeline.py` uses `spresso-5561f` and endpoint `1234567890`.
- `fastlane/Appfile` uses package `com.spresso19`.
- `functions/src/database/spannerClient.ts` defaults to `spresso-19`.
- `scripts/deploy_gcp.sh` targets `spresso-5561f` and creates Realtime Database.
- `server/plugins/vitposePlugin.ts` defaults to `https://vitpose-gpu-service.a.run.app/v1/predict`.
- `src/db/index.ts` defaults to a stale Cloud SQL connection.

The README and architecture notes describe Android package `com.spresso19`, while `composeApp/build.gradle.kts` and the checked-in Firebase config use `com.spresso`. Live Firebase app registration could not be checked because the account is not authorized.

### P2. The Cloud Run tool server is not buildable as checked in

`agents/tool_server/requirements.txt:4` contains the literal text `requests\nstripe`, which is not two valid requirements. The Flask service labels its routes as examples. It accepts a checkout amount from the request, creates a generic product, and points Stripe to `https://spresso.com/success` and `/cancel`. It also returns provider exception text to the caller.

### P2. Ranking and wardrobe paths synthesize user-visible data

`services/ranking-engine/batch_worker.py:93-95` seeds and creates a random 64-value product embedding when no real embedding exists. Its notification path uses a user ID as an FCM topic fallback. The wardrobe gallery hook falls back to local state when Data Connect fails. `WardrobeMixMatchTab.tsx` inserts a hardcoded saved outfit and score when the backend has not loaded data.

These paths violate the zero-mock production rule. A missing provider or record must return a typed unavailable or empty state.

## CLI and account state

| Tool | Installed state | Account or project state |
| --- | --- | --- |
| Node | 22.23.1 | Usable. |
| npm and npx | 10.9.8 | Usable. A floating `firebase-tools@latest` lookup did not complete, so this audit used the installed CLI. |
| Firebase CLI | Global 15.26.0 | Alias is `get-spresso`. Saved credentials are expired. |
| gcloud | 582.0.0 | Active project is `musically-studio`. Active account cannot read `get-spresso`. |
| Terraform | 1.16.0 | Validation passes. Checked-in plan uses an incompatible Terraform version. |
| Gradle wrapper | 9.6.1 | Runs with JDK 17. Android and Wasm compilation fail. |
| Genkit | Package-local 1.41.0 | No global command. Package-local use is reproducible. |
| Wrangler | Worker-local 4.123.0 | Saved credentials are expired. |
| adb | Installed | No device run was needed because compilation failed first. |
| ktlint | Command missing | CI uses Android lint, not a standalone ktlint command. |

## Required release gate

Spresso should not ship until one clean commit passes all of these checks with no local fallback server:

1. A repository scan that rejects hardcoded success, sample tokens, localhost production fallback, random user-visible data, and error-as-success checks.
2. UI action contract tests for every primary shared Compose control on Android and Wasm.
3. Virtual try-on tests for upload, provider, Storage result, display, timeout, retry, and unavailable behavior.
4. Functions contract tests and client-to-export name reconciliation.
5. Backend ownership and authenticated reachability checks for Realtime Database and every required Google Cloud service.
6. Purchase provider sandbox tests with consent, server-owned price, idempotency, decline, cancellation, webhook verification, and production guards.
7. Shared route tests, Wasm direct URL checks, and Android Navigation 3 adapter tests.
8. Android and Wasm feature tests and compilation with JDK 17, plus Android lint.
9. Worker and Cloud Run tests with declared bindings and verified Access tokens.
10. Terraform format, init, validate, tests, and a reviewed plan against remote state.
11. KMP Wasm browser distribution, client parity check, React and Vite deletion, dead-code elimination budget, and dependency audit policy.
12. Authenticated live smoke checks against the recorded deployment IDs.

The corrective sequence is defined in `docs/superpowers/plans/2026-08-30-spresso-production-readiness.md`.
