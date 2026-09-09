# Neon Commerce and Passkey Migration Implementation Plan

> **SUPERSEDED 2026-09-08 (owner decision): Neon is rejected — Convex is the sole application database.** Spresso owns no inventory or fulfillment ledger, so a second relational control plane is unjustified. The live successor is [`2026-09-08-convex-commerce-passkey-revenuecat.md`](2026-09-08-convex-commerce-passkey-revenuecat.md). This file is retained only as the decision record; do not implement it.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create one Neon relational core for catalog/commerce and implement server-verified passkey step-up MFA without replacing Firebase Authentication.

**Architecture:** Authenticated Convex Node actions are the trusted compute boundary. They derive Firebase UID from `ctx.auth`, use Neon transactions for relational state, and call merchant/Stripe services outside retryable database transaction bodies. WebAuthn credentials public credentials, one-time challenges, and one-time action grants live in Neon.

**Tech Stack:** Neon PostgreSQL, Drizzle, Convex Node actions, Firebase Auth, WebAuthn, `@simplewebauthn/server`, `@simplewebauthn/browser`, Android Credential Manager, Stripe, TypeScript, Kotlin Multiplatform.

**Spec:** `docs/superpowers/specs/2026-09-05-platform-cost-migration-design.md`

## Global Constraints

- No local Neon migration skill was installed when this plan was authored. Before NEON-001 execution, activate the current official Neon migration skill if available; otherwise read the linked official Neon branching, pooling, and restore documentation and record that fallback in the ticket evidence.
- Do not create a paid Neon project, production branch, role, or secret without separate owner approval.
- Use pooled connections for runtime and a direct connection for Drizzle migrations and `pg_dump`/restore.
- Firebase UID is an external identity key. Clients never connect to Neon directly.
- Passkeys are application-level step-up MFA, not Firebase-native MFA and not passkey-at-login.
- Use `@simplewebauthn/server`; do not write WebAuthn cryptography or parsing from scratch.
- Challenges and grants are random, five-minute, purpose-bound, and single-use.
- A protected action consumes its matching grant in the same Neon transaction that advances the action.
- Merchant quote and Stripe calls run outside retryable Neon transactions and retain provider idempotency keys.
- Run GitNexus impact before symbol edits, write failing tests first, and run full detect-changes before each commit.

---

### Task 1: NEON-001 — Add the relational client, schema, and rehearsal

**Files:**

- Create: `drizzle.config.ts`
- Create: `db/client.ts`
- Create: `db/schema.ts`
- Create: `db/migrations/0001_catalog_commerce_passkeys.sql`
- Create: `test/neonSchema.test.ts`
- Create: `scripts/migrations/verify-neon.mjs`
- Modify: `package.json`
- Modify: `.env.example`
- Modify: `docs/operations/backend-ownership.md`

**Interfaces:**

- Produces: `getRuntimeDb()` using `NEON_DATABASE_URL_POOLED`.
- Produces: Drizzle migration tooling using `NEON_DATABASE_URL_DIRECT`.
- Produces relational tables for users, catalog, checkout/payment, orders, webhooks, subscriptions, and WebAuthn.

- [ ] **Step 1: Verify current Neon guidance and local dependencies**

Read current official docs for connection pooling, serverless driver/runtime choice, branching, scale-to-zero, PITR, and restore. Select one supported AWS region close to Convex and the expected users. Do not select deprecated Neon Azure regions.

- [ ] **Step 2: Write failing schema-contract tests**

The test parses Drizzle metadata or an isolated PostgreSQL schema and asserts:

```ts
expect(unique("checkout_attempts", ["firebase_uid", "idempotency_key"])).toBe(true);
expect(unique("webhook_inbox", ["provider", "event_id"])).toBe(true);
expect(primaryKey("passkey_accounts")).toEqual(["firebase_uid"]);
expect(unique("passkey_accounts", ["user_handle"])).toBe(true);
expect(primaryKey("passkey_credentials")).toEqual(["credential_id"]);
expect(column("checkout_attempts", "amount_minor").type).toBe("bigint");
expect(column("step_up_authorizations", "consumed_at").nullable).toBe(true);
```

- [ ] **Step 3: Run and verify RED**

Run `npx vitest run test/neonSchema.test.ts`.

Expected: FAIL because the database schema does not exist.

- [ ] **Step 4: Add the minimal client boundary**

`db/client.ts` must fail closed when the pooled URL is absent and must never fall back to localhost in production.

```ts
export function requireDatabaseUrl(name: "NEON_DATABASE_URL_POOLED" | "NEON_DATABASE_URL_DIRECT"): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}
```

Do not log either URL.

- [ ] **Step 5: Add versioned relational tables**

Create:

- `users(firebase_uid primary key, created_at)`;
- `products`, `merchant_listings`, and immutable `listing_price_observations`;
- `checkout_attempts`, `payment_attempts`, `webhook_inbox`, `orders`, `order_items`, `returns`, and `subscriptions`;
- `passkey_accounts`, `passkey_credentials`, `webauthn_challenges`, and `step_up_authorizations` with the exact columns from the spec.

Use check constraints for positive quantity/amount, enumerated state constraints, UTC timestamps, and foreign keys. Do not add inventory/stock columns.

- [ ] **Step 6: Add migration verification**

`verify-neon.mjs` reports source/target counts, canonical SHA-256 hashes, invalid foreign keys, duplicate natural keys, negative amounts, and orphan records. It exits nonzero unless all invalid/duplicate/orphan counts are zero.

- [ ] **Step 7: Rehearse on an isolated branch**

After owner approval for remote changes:

```bash
npx drizzle-kit migrate
npx tsx --test test/neonSchema.test.ts
node scripts/migrations/verify-neon.mjs
pg_dump "$NEON_DATABASE_URL_DIRECT" --schema-only --no-owner --no-privileges > /tmp/spresso-neon-schema.sql
```

Restore the dump into a fresh rehearsal branch and rerun tests. Record branch IDs, start/end timestamps, counts, hashes, and restore duration; do not commit URLs or credentials.

- [ ] **Step 8: Verify GREEN**

```bash
npx vitest run test/neonSchema.test.ts
npm run lint
git diff --check
node .gitnexus/run.cjs detect-changes --scope all --repo .
```

- [ ] **Step 9: Commit**

```bash
git add drizzle.config.ts db test/neonSchema.test.ts scripts/migrations/verify-neon.mjs package.json package-lock.json .env.example docs/operations/backend-ownership.md
git commit -m "feat: add neon catalog commerce and passkey schema"
```

### Task 2: PAY-001 — Make checkout idempotent before adding MFA

**Files:**

- Create: `convex/commerce/checkout.ts`
- Create: `db/repositories/checkoutAttempts.ts`
- Create: `test/checkoutConcurrency.test.ts`
- Modify: `functions/src/webhooks.ts:83`
- Modify: `functions/src/payments/index.ts`
- Modify: `src/services/backend/contracts.ts`
- Modify: `src/services/backend/CommerceGateway.ts`

**Interfaces:**

- Produces:

```ts
type PrepareCheckoutInput = {
  listingId: string;
  quantity: number;
  idempotencyKey: string;
};

type PreparedCheckout = {
  attemptId: string;
  amountMinor: number;
  currency: string;
  status: "AWAITING_STEP_UP" | "READY_FOR_PAYMENT";
};
```

- Produces: compare-and-set transitions for `NEW -> QUOTING -> AWAITING_STEP_UP|READY_FOR_PAYMENT -> PROCESSING -> COMPLETED|FAILED`.

- [ ] **Step 1: Run impact analysis**

```bash
node .gitnexus/run.cjs impact "prepareCheckout" --direction upstream --repo .
node .gitnexus/run.cjs context "createStripeCheckoutForCart" --repo .
node .gitnexus/run.cjs query "checkout merchant quote Stripe webhook transaction" --repo .
```

Report every HIGH/CRITICAL result before edits.

- [ ] **Step 2: Write the failing concurrency and failure tests**

Cover 20 identical requests, duplicate provider webhook, quote timeout, Stripe timeout after quote, stale `QUOTING` recovery, client amount injection, anonymous user, and two users sharing an idempotency key. Assertions:

```ts
assert.equal(merchantQuoteCalls, 1);
assert.equal(stripeIntentCalls, 1);
assert.equal(await countOrders(), 1);
assert.equal(await countAttemptsFor(uid, idempotencyKey), 1);
```

- [ ] **Step 3: Run and verify RED**

Run `npx tsx --test test/checkoutConcurrency.test.ts`.

Expected: FAIL because the Neon checkout repository/action does not exist and the current Firestore transaction encloses external calls.

- [ ] **Step 4: Implement acquire, external work, and finalize**

Use a short Neon transaction to insert/select the attempt by `(firebase_uid, idempotency_key)`. Commit. Call the merchant outside the transaction. Persist the immutable quote snapshot with compare-and-set. If the user's policy requires passkey step-up, stop at `AWAITING_STEP_UP`; otherwise continue to Stripe outside the transaction. Pass the attempt ID as Stripe idempotency key metadata.

- [ ] **Step 5: Implement signed webhook inbox**

Verify the Stripe signature before data access. In one Neon transaction, insert `(provider,event_id)`, update the payment attempt, and create/update the order. A unique violation means an already-processed event and returns success without repeating effects.

- [ ] **Step 6: Keep the legacy path as rollback only**

Move callers behind `CommerceGateway`. Do not delete legacy Functions until Neon reconciliation and observation pass. Ensure no target code calls Stripe or merchant APIs inside a database transaction callback.

- [ ] **Step 7: Verify GREEN**

Run focused concurrency tests, existing cart/payment tests, TypeScript build, and a scanner that rejects external client calls inside transaction callbacks.

- [ ] **Step 8: Commit**

```bash
git add convex/commerce db/repositories test/checkoutConcurrency.test.ts functions/src/webhooks.ts functions/src/payments src/services/backend
git commit -m "fix: make checkout idempotent in neon"
```

### Task 3: AUTH-001 — Implement passkey registration and assertion actions

**Files:**

- Create: `convex/passkeys.ts`
- Create: `convex/lib/webauthn.ts`
- Create: `db/repositories/passkeys.ts`
- Create: `test/passkeySecurity.test.ts`
- Modify: `package.json`
- Modify: `functions/package.json`
- Delete after target tests pass: `functions/lib/shared/passkeys.js`
- Delete after target tests pass: `functions/lib/shared/passkeys.js.map`

**Interfaces:**

- Produces authenticated actions:

```ts
createRegistrationOptions(): Promise<PublicKeyCredentialCreationOptionsJSON>;
verifyRegistration(response: RegistrationResponseJSON): Promise<PasskeySummary>;
createAuthenticationOptions(input: StepUpRequest): Promise<PublicKeyCredentialRequestOptionsJSON>;
verifyAuthentication(input: { challengeId: string; response: AuthenticationResponseJSON }): Promise<StepUpGrant>;
```

- Produces:

```ts
type StepUpRequest = {
  purpose: "checkout" | "wallet_transfer" | "passkey_add" | "passkey_remove";
  resourceId: string;
  amountMinor?: number;
  currency?: string;
};

type StepUpGrant = { authorizationId: string; expiresAt: number };
```

- [ ] **Step 1: Inventory the current passkey surface**

Run GitNexus query/context for `PasskeyRegistrationStep`, `PlatformPasskeyRegistrar`, `handleFirebaseBiometricAuth`, and `promptBiometricAuth`. Confirm with text search that `functions/lib/shared/passkeys.js` is unimported and its TypeScript source is absent. Record the stale generated Data Connect `RegisterPasskey` types.

- [ ] **Step 2: Write the failing security suite**

Create one test per behavior: successful registration, duplicate credential, multiple credentials/user, challenge replay, expired challenge, wrong UID, wrong ceremony, wrong origin, wrong RP ID, missing user verification, malformed client data, unknown credential, revoked credential, valid zero sign counter, decreasing nonzero counter, assertion replay, and two concurrent consumes with exactly one success.

Name the production behavior each test would break before writing the test body.

- [ ] **Step 3: Run and verify RED**

```bash
npx tsx --test test/passkeySecurity.test.ts
```

Expected: FAIL because the target repository and actions do not exist.

- [ ] **Step 4: Move vetted WebAuthn dependencies**

Add `@simplewebauthn/server` to the target/root package and `@simplewebauthn/browser` for React. Keep exact locked versions. Remove the Functions-package dependency only after no Functions source imports it.

- [ ] **Step 5: Implement server configuration and option generation**

Require explicit production values:

```ts
type WebAuthnConfig = {
  rpId: string;
  rpName: "Spresso";
  expectedOrigins: readonly string[];
  challengeTtlMs: 300_000;
};
```

Production startup fails if the RP ID is absent, if a web origin is not HTTPS, or if an Android origin does not start with `android:apk-key-hash:`. Use `userVerification: "required"` and discoverable credentials. Exclude already registered credential IDs during enrollment.

- [ ] **Step 6: Implement registration verification**

Require authenticated, non-anonymous, recently reauthenticated Firebase identity. Load the challenge by `(id, uid, ceremony=registration)`, verify it with `verifyRegistrationResponse`, then atomically consume it and insert credential ID, COSE public key, sign count, transports, device type, and backup state. Unique credential conflicts fail closed.

- [ ] **Step 7: Implement assertion verification and grant issuance**

Load the challenge and credential by authenticated UID. Call `verifyAuthenticationResponse` with exact challenge, RP ID, origin allow-list, credential public key, and stored counter. In one transaction: consume the challenge, update counter/last-used metadata, and insert a random opaque step-up authorization bound to the challenge's purpose/resource/amount/currency.

- [ ] **Step 8: Remove orphaned passkey artifacts**

Delete the tracked compiled `functions/lib/shared/passkeys.js(.map)` after target tests pass. Do not reintroduce its single Firestore document design. Stale Data Connect generated passkey files are removed in Task 6 after the full connector retirement.

- [ ] **Step 9: Verify GREEN**

```bash
npx tsx --test test/passkeySecurity.test.ts
npm run lint
npm run build
git diff --check
node .gitnexus/run.cjs detect-changes --scope all --repo .
```

- [ ] **Step 10: Commit**

```bash
git add convex/passkeys.ts convex/lib/webauthn.ts db/repositories/passkeys.ts test/passkeySecurity.test.ts package.json package-lock.json functions/package.json functions/package-lock.json functions/lib/shared/passkeys.js functions/lib/shared/passkeys.js.map
git commit -m "feat: add server-verified passkey ceremonies"
```

### Task 4: AUTH-001 — Wire browser and Android passkey clients

**Files:**

- Create: `src/services/auth/passkeys.ts`
- Create: `test/passkeyClient.test.ts`
- Modify: `src/services/backend/contracts.ts`
- Modify: `composeApp/src/commonMain/kotlin/network/BackendGateway.kt`
- Modify: `composeApp/src/commonMain/kotlin/components/features/auth/PasskeyRegistrationStep.kt`
- Modify: `composeApp/src/androidMain/kotlin/components/features/auth/PlatformPasskeyRegistrar.kt`
- Create: `composeApp/src/androidMain/kotlin/components/features/auth/PlatformPasskeyAuthenticator.kt`
- Modify: `composeApp/src/androidUnitTest/kotlin/components/features/auth/PlatformPasskeyRegistrarTest.kt`
- Create: `composeApp/src/androidUnitTest/kotlin/components/features/auth/PlatformPasskeyAuthenticatorTest.kt`

**Interfaces:**

- Consumes: Task 3 option/verification actions.
- Produces: `registerPasskey(): PasskeyRegistrationResult` and `authorize(request: StepUpRequest): StepUpResult` behind `BackendGateway`.

- [ ] **Step 1: Run impact analysis**

Analyze `PasskeyRegistrationStep` and `PlatformPasskeyRegistrar`. The registration-step context is a lower-bound graph result with a dropped unresolved caller; confirm all Compose call sites with text search before changing its signature.

- [ ] **Step 2: Write failing browser and Android tests**

Browser tests assert that server options are passed unchanged to `startRegistration`/`startAuthentication`, cancellation maps to `Cancelled`, server rejection maps to a customer-safe failure, and raw credential response is returned only to the verification action.

Android tests assert `CreatePublicKeyCredentialRequest` and `GetPublicKeyCredentialOption` receive server JSON unchanged, cancellation is not success, and provider failure never creates a grant.

- [ ] **Step 3: Run and verify RED**

```bash
npx tsx --test test/passkeyClient.test.ts
env JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64 PATH=/usr/lib/jvm/java-17-openjdk-amd64/bin:/usr/bin:/bin ./gradlew :composeApp:testDebugUnitTest --tests '*PlatformPasskey*' --no-daemon
```

Expected: FAIL because browser/authenticator adapters are missing.

- [ ] **Step 4: Implement browser ceremonies**

`src/services/auth/passkeys.ts` requests options through `PasskeyGateway`, calls the SimpleWebAuthn browser helper, and submits the full response. It never generates a challenge, user handle, RP ID, or allow-credential list locally.

- [ ] **Step 5: Reuse Android registration and add assertion**

Keep `PlatformPasskeyRegistrar` as the Credential Manager boundary. Add `PlatformPasskeyAuthenticator` with `GetPublicKeyCredentialOption`. Pass server JSON unchanged and submit `authenticationResponseJson` to the backend. Do not use `BiometricPrompt` or the local Android keystore as a substitute for WebAuthn.

- [ ] **Step 6: Wire onboarding safely**

Replace the default `BackendUnavailable` injection only when the target gateway is configured. Enrollment stays skippable. Copy says “Use a passkey to protect checkout” and never exposes provider/database details.

- [ ] **Step 7: Verify GREEN**

Run focused browser/Android tests, full KMP unit tests, KMP Wasm compile, TypeScript lint/build, and GitNexus detect-changes.

- [ ] **Step 8: Commit**

```bash
git add src/services/auth src/services/backend test/passkeyClient.test.ts composeApp/src
git commit -m "feat: wire web and android passkey clients"
```

### Task 5: AUTH-002 — Enforce one-time passkey grants for sensitive actions

**Files:**

- Modify: `src/components/HITLCheckoutModal.tsx:109`
- Modify: `src/services/backend/CommerceGateway.ts`
- Modify: `convex/commerce/checkout.ts`
- Modify: `functions/src/payments/agentWalletCallables.ts`
- Create: `convex/security/passkeyPolicy.ts`
- Create: `test/passkeyCheckout.test.ts`
- Create: `test/passkeyRecovery.test.ts`
- Create: `src/components/features/profile/widgets/PasskeySettings.tsx`
- Modify: `src/components/features/profile/ProfilePage.tsx`
- Create: `composeApp/src/commonMain/kotlin/components/features/profile/PasskeySettings.kt`
- Modify: `composeApp/src/commonMain/kotlin/components/features/profile/ProfilePage.kt`

**Interfaces:**

- Consumes: `StepUpGrant.authorizationId` from Task 3.
- Produces: `consumeStepUpAuthorization(tx, expected)` which succeeds exactly once for a matching UID/purpose/resource/amount/currency.

- [ ] **Step 1: Run impact analysis and report current security gap**

```bash
node .gitnexus/run.cjs context "handleFirebaseBiometricAuth" --repo .
node .gitnexus/run.cjs impact "HITLCheckoutModal" --direction upstream --repo .
node .gitnexus/run.cjs context "confirmAgentTransfer" --repo .
```

Record that `handleFirebaseBiometricAuth` only calls Google sign-in/token refresh; it is not WebAuthn proof.

- [ ] **Step 2: Write failing authorization tests**

Reject: Firebase token with no grant, client `biometricVerified=true`, grant for another user/order/purpose, changed amount/currency, expired grant, consumed grant, revoked credential, and concurrent consume. Assert one success for twenty concurrent submits and zero processor calls for every rejected case.

- [ ] **Step 3: Run and verify RED**

Run `npx tsx --test test/passkeyCheckout.test.ts test/passkeyRecovery.test.ts`.

Expected: FAIL because checkout trusts client state and no server grant consumer exists.

- [ ] **Step 4: Refactor checkout order of operations**

Remove `biometricVerified` and `handleFirebaseBiometricAuth`. `prepareCheckout` first obtains a fresh merchant quote and returns `attemptId`, `amountMinor`, `currency`, and `AWAITING_STEP_UP`. The UI renders the exact server amount, runs the passkey assertion for that attempt, then submits `authorizationId`. The server consumes it before creating/confirming the processor intent.

- [ ] **Step 5: Apply policy only to sensitive actions**

The first policy version protects `checkout`, `wallet_transfer`, `passkey_add`, and `passkey_remove`. It does not prompt for browsing, chat, likes, saved products, cart edits, or wardrobe changes. Rollout configuration supports `off | staff | opt_in | required_high_risk` and defaults to `staff` outside tests.

- [ ] **Step 6: Implement passkey management and recovery**

Users can list metadata, name, add, and revoke credentials. Adding/revoking requires recent Firebase reauthentication plus current passkey step-up when one exists. Removing the final credential requires the recovery ceremony and emits an out-of-band security notification. Support personnel cannot create a bypass grant.

- [ ] **Step 7: Verify GREEN**

Run passkey security/client/checkout/recovery suites, existing cart/payment tests, TypeScript build, Android tests, and a browser integration test using a virtual authenticator. Confirm cancellation and unavailable-authenticator states never enable payment.

- [ ] **Step 8: Commit**

```bash
git add src/components/HITLCheckoutModal.tsx src/services convex/commerce convex/security functions/src/payments test composeApp/src
git commit -m "feat: require passkey step-up for sensitive actions"
```

### Task 6: NEON-002 — Migrate relational data and retire overlapping stores

**Files:**

- Create: `scripts/migrations/export-dataconnect.mjs`
- Create: `scripts/migrations/import-neon.mjs`
- Create: `scripts/migrations/reconcile-neon.mjs`
- Modify: `composeApp/src/androidMain/kotlin/network/SpressoBackend.kt`
- Modify: `functions/src/catalog.ts`
- Modify: `functions/src/users.ts`
- Delete after cutover: `dataconnect/`
- Delete after cutover: `src/dataconnect/`
- Delete after cutover: `functions/src/dataconnect/`
- Delete after cutover: `server/dataconnect/`
- Delete after cutover: `composeApp/src/androidMain/kotlin/com/spresso/dataconnect/`
- Delete after cutover: `src/db/index.ts`
- Delete after cutover: `functions/src/database/spannerClient.ts`
- Modify: `package.json`
- Modify: `functions/package.json`
- Modify: `composeApp/build.gradle.kts`
- Modify: `firebase.json`
- Modify: `.firebaserc`

**Interfaces:**

- Consumes: Neon repositories and `BackendGateway` adapters.
- Produces: one relational owner and a reconciliation artifact for every migrated table.

- [ ] **Step 1: Map callers with GitNexus**

Analyze `SpressoBackend`, `getTravelTrips`, user deletion, `initDbSchema`, and `SpannerProductRepository`. `SpressoBackend` currently affects ten upstream symbols. Treat zero/UNKNOWN dynamic calls as unresolved and confirm generated-operation names with text search.

- [ ] **Step 2: Write failing migration/reconciliation tests**

Fixtures include valid records, duplicate natural keys, caller-supplied foreign UID, binary-float money, orphan items, stale passkey generated types, and missing provider references. Assert the verifier rejects every invalid fixture and produces stable hashes for valid data.

- [ ] **Step 3: Run and verify RED**

Run `npx tsx --test test/neonMigration.test.ts`.

Expected: FAIL because exporters/importers do not exist.

- [ ] **Step 4: Implement idempotent export/import**

Export newline-delimited canonical records. Import with deterministic keys and `ON CONFLICT` rules that cannot overwrite a newer target record. Derive user identity from authenticated source metadata, never a caller-supplied `userId` argument.

- [ ] **Step 5: Rehearse snapshot and final delta**

On an isolated Neon branch: migrate schema, import snapshot, reconcile counts/hashes, inject one bad row and prove failure, fix it, rerun, switch shadow reads, then rehearse legacy-write freeze and final delta. Record zero invalid/orphan/duplicate rows before cutover.

- [ ] **Step 6: Switch callers by domain**

Move catalog and checkout first through `CommerceGateway`. Personal groceries/travel/wardrobe/onboarding move to Convex, not Neon. Keep legacy read-only during the observation window. Do not maintain dual writes.

- [ ] **Step 7: Delete callers before providers**

Only after GitNexus and text search show no active callers: delete Data Connect schemas/generated SDKs, PGAdapter/Cloud SQL pool, imperative DDL, Spanner client, passkey generated leftovers, and their dependencies/config. Do not delete Firebase Auth.

- [ ] **Step 8: Verify GREEN and restore**

Run reconciliation, TypeScript build/tests, Functions tests while Functions remain, KMP Android/Wasm builds, repository forbidden-runtime scan, a Neon branch restore drill, `git diff --check`, and full GitNexus detect-changes.

- [ ] **Step 9: Commit by retired boundary**

```bash
git commit -m "feat: migrate catalog and commerce to neon"
git commit -m "chore: retire data connect runtime"
git commit -m "chore: remove pgadapter and spanner clients"
```

Stage only the boundary named by each commit.
