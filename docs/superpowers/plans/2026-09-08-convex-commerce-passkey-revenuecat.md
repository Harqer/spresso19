# Convex Commerce, Passkey, and RevenueCat Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILLS before any task: `convex-expert` (all code under `convex/`), `convex-test` (test generation), `convex-migrate` + `convex-migrate-rehearse` (any schema change on deployed data), `security-best-practices` (TypeScript references). Read `convex/_generated/ai/guidelines.md` first — it overrides remembered API shapes. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Move the commerce action log (checkout attempts, payment attempts, webhook inbox, order receipts), passkey credentials/challenges/grants, and RevenueCat entitlements onto Convex documents with serializable-transaction uniqueness — replacing the superseded Neon relational plan.

**Architecture:** Authenticated Convex functions are the trusted boundary. Identity comes only from `requireFirebaseIdentity(ctx)`. Natural unique keys that Convex indexes cannot express (idempotency keys, webhook event IDs) are enforced by serializable get-then-insert inside a single mutation, proven by convex-test concurrency tests. External calls (merchant quote, Stripe, RevenueCat) run in Node actions **outside** mutations; state advances via compare-and-set mutations.

**Spec:** `docs/superpowers/specs/2026-09-05-platform-cost-migration-design.md` (2026-09-08 revision)

## Global Constraints

- Do not create a production Convex deployment, Stripe configuration, or RevenueCat project without separate owner approval. Rehearsals run on the anonymous/local dev deployment or an explicitly created dev deployment.
- Firebase UID is the external identity key. Clients never receive database URLs, Stripe keys, RevenueCat webhook secrets, or WebAuthn private keys.
- Passkeys are application-level step-up MFA, not Firebase-native MFA and not passkey-at-login.
- Use `@simplewebauthn/server`; do not write WebAuthn cryptography or parsing from scratch.
- Challenges and grants are random, five-minute, purpose-bound, and single-use.
- A protected action consumes its matching grant in the same mutation that advances the action.
- Merchant quote and Stripe calls run outside mutation bodies and retain provider idempotency keys. Never call Stripe or merchant APIs inside a mutation callback.
- Money is integer minor units (`v.int64()` or `v.number()` per guidelines — never floats).
- Every mutation gets a convex-test concurrency test for its unique-key behavior; a lost uniqueness guarantee is a defect, not a documented limitation.
- Run GitNexus impact before symbol edits, write failing tests first, and run full detect-changes before each commit.

---

### Task 1: CVX-003 — Commerce action log on Convex documents

**Files:**

- Modify: `convex/schema.ts`
- Create: `convex/commerce/checkout.ts`
- Create: `convex/commerce/webhooks.ts`
- Create: `convex/commerce/checkout.test.ts`
- Modify: `functions/src/webhooks.ts` (rollback-only during observation)
- Modify: `src/services/backend/contracts.ts`
- Modify: `src/services/backend/CommerceGateway.ts`

**Interfaces:**

- Produces: `prepareCheckout({ listingId, quantity, idempotencyKey })` public mutation-backed flow with CAS transitions `NEW -> QUOTING -> AWAITING_STEP_UP|READY_FOR_PAYMENT -> PROCESSING -> COMPLETED|FAILED`.
- Produces: `stripeWebhook` HTTP action — signature verify first, then one mutation inserting `webhookInbox` (unique per `(provider, eventId)`), advancing the attempt, and writing the order receipt.

- [ ] **Step 1: Run impact analysis** (`node .gitnexus/run.cjs impact "prepareCheckout" --direction upstream --repo .`, `context "createStripeCheckoutForCart"`). Report HIGH/CRITICAL before edits.

- [ ] **Step 2: Write failing concurrency and failure tests** (convex-test): 20 identical `prepareCheckout` calls produce one attempt, one merchant-quote action invocation, one Stripe intent; duplicate webhook event produces one order; quote timeout and stale `QUOTING` recovery paths; client amount injection rejected; anonymous rejected; two users sharing an idempotency key do not collide.

- [ ] **Step 3: Verify RED** — `npx vitest run convex/commerce/checkout.test.ts`.

- [ ] **Step 4: Implement acquire, external work, finalize** — acquire: serializable get-then-insert of `checkoutAttempts` by `(firebaseUid, idempotencyKey)` in one mutation; commit. Quote + Stripe in a Node action with the attempt ID as idempotency metadata. Finalize: compare-and-set mutation persists the immutable quote snapshot. Step-up stop at `AWAITING_STEP_UP` per policy.

- [ ] **Step 5: Implement webhook inbox** — HTTP action verifies the Stripe signature before data access; one mutation inserts the inbox document, updates the attempt, writes `orders`/`orderItems`. A duplicate `(provider, eventId)` returns success without repeating effects.

- [ ] **Step 6: Keep the legacy Functions path as rollback only.** Move callers behind `CommerceGateway`. No target code calls Stripe or merchant APIs inside a mutation.

- [ ] **Step 7: Verify GREEN** — focused tests, existing cart/payment tests, TypeScript build, and a scan confirming no external calls inside mutation bodies.

- [ ] **Step 8: Commit** — `git commit -m "feat: make checkout idempotent on convex"`.

### Task 2: AUTH-001/002 — Passkey registration, assertion, and grant binding

**Files:**

- Create: `convex/passkeys.ts`
- Create: `convex/lib/webauthn.ts`
- Create: `convex/passkeys.test.ts`
- Modify: `package.json` (`@simplewebauthn/server`, `@simplewebauthn/browser`)

**Interfaces:**

- Produces: `createRegistrationOptions`, `verifyRegistration`, `createAssertionOptions`, `verifyAssertion` (actions/mutations per runtime), `consumeStepUpGrant` used inside the protected action's mutation.
- Tables: `passkeyAccounts`, `passkeyCredentials`, `webauthnChallenges`, `stepUpGrants` per the spec's document model.

- [ ] **Step 1: Impact analysis** on the current checkout biometric path and profile settings callers.

- [ ] **Step 2: Failing security tests** — wrong user, wrong origin, wrong RP ID, wrong purpose, wrong resource, amount/currency mismatch, expired challenge, revoked credential, replayed grant, second passkey enrollment, cross-user denial, anonymous denial. A Firebase token alone must never authorize a protected action.

- [ ] **Step 3: Verify RED** — `npx vitest run convex/passkeys.test.ts`.

- [ ] **Step 4: Implement** — challenges/grants created in mutations (random, 5-minute, purpose-bound); verification via `@simplewebauthn/server` in actions; consumption and state advance in the same mutation; multiple credentials per account; revocation requires recent reauthentication and an out-of-band notification.

- [ ] **Step 5: Verify GREEN and commit** — `git commit -m "feat: passkey step-up mfa on convex"`.

### Task 3: RC-001 — RevenueCat entitlements on Convex

**Files:**

- Create: `convex/entitlements.ts`
- Create: `convex/entitlements.test.ts`
- Create: `convex/http.ts` (RevenueCat webhook route)
- Modify: `src/services/backend/contracts.ts` (entitlement read gateway)
- Modify: `.env.example` (`REVENUECAT_WEBHOOK_AUTH_SECRET` name only)

**Interfaces:**

- Produces: HTTP action at `/webhooks/revenuecat` verifying the webhook authorization header against `REVENUECAT_WEBHOOK_AUTH_SECRET` before any data access.
- Produces: `entitlements` document per user (single source of truth for `spresso_plus`, AI quota packs); internal mutation applies grant/revoke events idempotently by RevenueCat event id.
- Produces: `getMyEntitlements` public query — server-derived identity, reads only the caller's document.

- [ ] **Step 1: Impact analysis** on any existing subscription/premium gating code paths.

- [ ] **Step 2: Failing tests** — valid signed event grants/revokes; duplicate event id is idempotent; invalid/missing secret rejected with 401; unknown app user id creates no entitlement and logs server-side; entitlement read is cross-user safe; anonymous read returns empty.

- [ ] **Step 3: Verify RED** — `npx vitest run convex/entitlements.test.ts`.

- [ ] **Step 4: Implement** — webhook HTTP action (signature/secret check first), idempotent event application, `entitlements` documents updated only by this path. Clients check the Convex document, never the RevenueCat SDK verdict alone. AI may suggest a plan but never initiates or completes a purchase.

- [ ] **Step 5: Verify GREEN and commit** — `git commit -m "feat: revenuecat entitlements on convex"`.

### Task 4: Retirement of the superseded relational plan

- Delete `2026-09-05-neon-commerce-passkey-migration.md` after Tasks 1–3 merge (its content is superseded by this plan; keep git history as the record).
- Remove Drizzle/PG references from any contracts and ownership files; verify with the ownership verifier.

---

## Delivery gate

WebAuthn negative/replay suite passes; one intent/order under concurrency; webhook replay produces one order; entitlements change only via the verified webhook. Rollback: keep enrollment optional; disable enforcement policy; legacy Functions path remains during observation.
