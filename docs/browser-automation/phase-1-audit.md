# Phase 1 audit — Spresso browser/commerce path (current HEAD)

Audited: 2026-09-25, against the working tree on `main`. Every claim below is
verified against the current tree, not the bundle's authored snapshot. Evidence
is `file:symbol`. Where a bundle claim is already remediated, the working
implementation is preserved and left in place.

## 1. Synthetic success in open/add/update/remove — DISPROVEN (already remediated)

The bundle (authored against an older tree) claimed `convex/merchantBrowser/tools.ts`
contained synthetic success paths. Current HEAD verifies postconditions in the
provider layer; a tool throws instead of fabricating success:

- `convex/merchantBrowser/provider.ts` — every mutating action follows
  authorize → execute → observe → verify postcondition → record:
  - `addToCart`: re-observes the merchant cart badge via `observedCartCount`
    after the click; returns `success: true` only when `after > before`
    (provider-side postcondition), else `success:false` with the observed count.
  - `updateQuantity`: re-reads the merchant quantity input; `verified =
    observed === Math.trunc(args.quantity)` gates `success`.
  - `removeItem`: requires `after < before` (badge dropped) for `success`.
  - `navigateToProduct`: re-reads the page target; `success:true` only when the
    browser actually landed on the requested product URL (host-prefixed).
- `convex/merchantBrowser/tools.ts` — `merchant_add_to_cart`,
  `merchant_update_quantity`, `merchant_remove_item`, `merchant_open_product`
  each `throw` when the provider result is not `success` (e.g. "The merchant
  cart did not confirm … was added."); none synthesizes a success payload from
  event recording. `consumeActionBudget` is accounting only.
- Regression coverage: `convex/merchantBrowserProvider.test.ts`
  (`stubCartAttempts`) drives the CDP read/click/re-read sequence and asserts
  the postcondition outcomes; `scripts/test/no-synthetic-success.test.mjs`
  (`scripts/universal_mock_scanner.cjs --strict-production`) scans the tree for
  synthetic-success payloads.

**Disposition:** preserve the working implementation; Phase 2 replaces the
execution seam (Cloudflare → Browserbase/Playwright) without weakening these
postconditions.

## 2. Kitesurf selection for new interactive sessions — DISPROVEN (already remediated)

The bundle claimed `selectEngine(false)` routed new sessions to Kitesurf.
Current HEAD:

- `convex/merchantBrowser/index.ts` — `selectEngine` now takes
  `requiresPersistence` and `beginSession` calls `selectEngine(true)`, always
  returning `"CHROMIUM"`. `beginSession` also enforces the HTTPS-only
  allowlist (`KITESURF_ALLOWED_DOMAINS` env) before creating any session.
- `convex/merchantBrowser/provider.ts:startBrowserSession` — records the
  engine-accurate persistent Chromium and refuses to resurrect terminal
  sessions (verified by `convex/merchantBrowser.test.ts`
  "provider start refuses to resurrect a terminal session").
- Residual naming only: the env var is still named `KITESURF_ALLOWED_DOMAINS`
  and the schema enum still carries a `KITESURF` literal (this phase replaces
  the enum with the canonical provider union; see §7).

**Disposition:** remediated; env var rename happens with the Phase 2 runtime
switchover so test environments do not break mid-contract phase.

## 3. Missing real browser executor — CONFIRMED

- `convex/merchantBrowser/provider.ts` — the entire execution layer goes
  through `convex/merchantBrowser/cloudflare.ts` (`CF.createBrowser`,
  `CF.openPage`, `CF.listTargets`, `CF.cdp`) — raw Cloudflare Browser REST/CDP
  string plumbing. Page interaction is `Runtime.evaluate` snippets in
  `observedCartCount`/the click expressions; there is no Playwright, no
  semantic locators, no auto-waiting, no iframe/tab/upload/download surface.
- `package.json` — no `playwright-core`, no `@browserbasehq/sdk` dependency.
- `convex/merchantBrowser/state.ts:reobserveAfterResume` re-observation is a
  single target-list read, not a real DOM/a11y observation.

**Disposition:** true defect, remediation scheduled as Phase 2 (Browserbase +
Playwright runtime behind the same Convex state contract). Phase 1 ships the
typed execution contracts (`convex/merchantBrowser/contracts.ts`) the runtime
must satisfy, including `evaluate` and the broker-only `cdp` escape.

## 4. Payment success creating a retailer order without merchant confirmation — CONFIRMED

- `convex/commerce/checkout.ts:completePayment` — on the Stripe webhook it
  inserts an `orders` row with `status: "PROCESSING"` from
  `payment_intent.succeeded` alone: `attempt.amountCents`/`currency` match and
  the webhook inbox is deduped, but there is no merchant-side evidence that any
  retailer order exists. `humanConfirmedAt` is stamped from the payment event,
  not a human-confirmed merchant artifact.
- The order lifecycle (`AUTHORIZED`→…→`DELIVERED`) in `convex/schema.ts`
  (`orders.status`) has no state that represents "merchant confirmed the
  order" — confirmation evidence has nowhere to live.
- Adjacent truth: `convex/commerce/actions.ts:merchantQuote` uses Kitesurf
  `browser-rendering/json` only for ephemeral price verification — that is a
  read-only quote path and is preserved.

**Disposition:** true defect. Phase 1 extends the session machine with
`READY_FOR_PURCHASE_AUTHORIZATION` / `SUBMITTING_PURCHASE` so a purchase
submission becomes a first-class workflow state, and Phase 5 (purchase
authority, UCP/AP2) owns the remediation: an order may only leave `PROCESSING`
on verified merchant evidence, and `completePayment` gains a merchant-order
evidence gate rather than creating a confirmed order from the payment webhook
alone.

## 5. Duplicate legacy Kitesurf/OpenClaw commerce authority — CONFIRMED (defanged)

- `functions/src/kitesurf*` and `functions/src/ai/tools/kitesurfSearch.ts` —
  Firebase Functions Kitesurf browser tooling still in the tree.
- `services/openclaw/**` — OpenClaw service tree still present.
- `convex/ai/guardrails.ts` (lines 32, 55) — `kitesurf` remains in source enums.
- `convex/lib/browserHttp.ts` — verified in current HEAD: exports only CORS
  helpers (`browserOrigins`, `browserHttpAction`); it is a transport helper,
  not a commerce authority, and is not a remediation target.
- Commerce authority in current HEAD is already centralized in Convex
  (`convex/commerce/checkout.ts`, `convex/payments/stripe.ts`); no Convex code
  path calls into functions/src or services/openclaw for commerce.

**Disposition:** dead parallel code remains in the tree (repo debt), but it is
not on the live commerce path. Removal is Phase 6 (verification/cleanup), with
the constraint that Firebase Auth must be preserved and Firebase Functions must
not be reintroduced as commerce authority.

## 6. KMP consumer compatibility (current behavior verified)

- `composeApp/src/commonMain/kotlin/network/ConvexApi.kt:MerchantBrowserSession`
  carries `status` as a plain `String` — new status literals deserialize
  without client changes.
- `composeApp/src/commonMain/kotlin/components/features/chat/MerchantBrowserSessionCard.kt:MerchantStatusLabel`
  maps unknown statuses to the "Starting" label, and `stepCopy` maps unknown
  steps to `null` — new statuses degrade safely, though labels like
  WAITING_USER_INPUT rendering as "Starting" is a Phase 3 (experience) fix,
  not a Phase 1 blocker.

## 7. Contract deltas introduced this phase

- `convex/schema.ts:merchantBrowserSessions` — status union extended with
  `WAITING_USER_INPUT`, `WAITING_SECURE_INPUT`,
  `READY_FOR_PURCHASE_AUTHORIZATION`, `SUBMITTING_PURCHASE`; `engine` replaced
  by `provider` (Browserbase-capable enum: `CLOUDFLARE` | `BROWSERBASE`);
  `controlOwner` (`AGENT` | `USER` | `CREDENTIAL_BROKER` | `NONE`) added with
  the exactly-one invariant; `taskId` identity field added. No CDP
  `connectUrl`/debug URL field exists or is added — the only provider
  identifier is `providerSessionId`.
- `convex/merchantBrowser/state.ts` — transition map extended for the new
  statuses; control owner transitions mirror the state machine; `expectedSeq`
  optimistic-concurrency (stale expected sequence) rejection added.
- `convex/merchantBrowser/contracts.ts` — new shared execution contract types
  (`BrowserExecutionRequest`, `BrowserOperation` union incl. `evaluate` and
  broker-only `cdp`, locator targets, `BrowserAssertion`,
  `BrowserExecutionResult`, `OUTCOME_UNKNOWN`).
- `convex/merchantBrowser/tools.ts` — success semantics documented as
  verified-evidence-only; `merchant_request_handoff` reasons classify into
  user-input vs secure-input waiting states where the session is not ACTIVE.
