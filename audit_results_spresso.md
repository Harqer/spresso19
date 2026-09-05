# Spresso Mock / Nonfunctional Button Audit — Verified Findings

Last verified: 2026-09-01 via static analysis + GitNexus graph impact analysis (no emulator).

## How this differs from the raw regex audit

The earlier regex pass (`audit_mocks.py`) flagged every empty `onXYZ = { }` it saw,
including Preview functions, screenshot tests, and Compose default parameter values.
Manual verification against the call graph separates real defects from expected
Compose idioms.

## Verified false positives (expected Compose idioms, not defects)

- `composeApp/src/screenshotTestDebug/**` — screenshot test files; deleted in refactor.
- `components/core/PrimaryButton.kt`, `components/features/chat/ChatSuggestionChip.kt`,
  `components/features/wardrobe/WardrobeTabChips.kt` — `@Preview` composables only.
- Default parameter values (`onAskAI: (String) -> Unit = {}` etc.) across navigation and
  feature composables — these are overridden at every production call site.
- `App.kt` MetaWearablesPage route: `onPairClick = {}` / `onStartHandsFreeCheckout = {}`
  are optional hooks the Android `actual` never relies on — the Android implementation
  is a fully wired Meta DAT flow (registration, permissions, sessions, error streams).

## Verified real findings

### F1. Backend: unauthenticated payment-initiation endpoint (RESOLVED — keep removed)
`agents/tool_server/main.py` exposed `POST /tools/stripe/checkout` with no authentication,
no App Check, a client-chosen amount, and hardcoded `spresso.com` success URLs. Stripe is
the financial system of record, but the canonical path is Firebase Functions
(`getStripeConfig`, `createCheckoutIntent`, `stripeWebhook` with auth + App Check +
signed-webhook verification) — the tool-server endpoint was an unauthenticated duplicate
payment path regardless of checkout mode, so it stays removed. Product decision (2026-09-01):
Stripe checkout remains part of Spresso; AI-assisted purchasing is optional and the user can
always complete the purchase themselves. The tool server also no longer leaks the Apify token
in the URL query string (now an Authorization header) and sanitizes provider errors.
Also fixed: `agents/tool_server/requirements.txt` had the malformed literal line
`requests\nstripe` (flagged by the 2026-08-30 audits); it is now two pinned requirements.

### F2. Terraform: forbidden Cloud SQL + Redis provisioning (REMOVED)
`terraform/main.tf` provisioned `google_sql_database_instance` (PostgreSQL),
`google_sql_database`, `google_sql_user`, `google_redis_instance`, enabled the
`sqladmin.googleapis.com` and `redis.googleapis.com` APIs, and required a `db_password`
variable. AGENTS.md and `docs/spresso_architecture_context.md` forbid provisioning
Cloud SQL/Redis/Data Connect without a documented requirement. Removed: Cloud SQL and
Redis resources, their APIs, the now-purposeless private-IP/VPC-peering block kept only
for them, the `db_password` variable, and the `cloud_sql_connection_name`/`redis_ip`
outputs. Added a header comment stating the Firestore-first provisioning boundary.
The approved Spanner global-catalog and Cloud Run tool-server boundaries remain.

### F3 (RESOLVED 2026-09-01). Web checkout was structurally dead; Spresso-controlled Stripe checkout implemented
Product decision: purchasing stays; AI-assisted purchase is optional and the user can always complete the
purchase themselves. The web modal's Debit/Credit and Google Pay buttons previously called a callable that
deliberately always rejected, so they could never work. Implemented the approved Spresso-controlled flow:
`prepareCheckout` (Firebase Function, App Check + auth) prices the purchase server-side from a fresh merchant
quote (existing `getMerchantQuote` + Kitesurf staging) against the server-validated cart snapshot, creates an
idempotent Stripe PaymentIntent, and returns the client secret; the user confirms in Stripe Elements; the
signed `stripeWebhook` reconciles the order into `users/{uid}/orders` with event deduplication and amount
verification. The client no longer sends amounts or writes orders itself — it polls for the server-written
order before showing success. Legacy reject-only callables (`createStripeIntent`, `confirmPurchase` etc.)
are retained as client-compatibility guards; boundary tests updated and passing (6/6 plus 24/24 neighboring).
Mandate docs updated to match: AGENTS.md, .agents/AGENTS.md, and the shopper system prompt now describe
the user-confirmed, server-priced checkout model instead of the previous user-completed-only mode.

### F3b. UI: LegalSecurityKey route renders with all-null callbacks (OPEN — needs content decision)
`App.kt:831` renders `LegalSecuritySection()` with no callbacks, so all three policy
rows ("Refunds & Return Policy", "App policies", "Privacy Statement & Terms") always
show honest "unavailable" errors. Per the zero-mock protocol I did not fabricate
policy content. Options: navigate to real policy documents (needs approved content),
or hide the rows until policies exist. Requires a product/content decision.

### F4. Dead code: `ProductActions` and `ChatSuggestionChip` (OPEN — cleanup candidates)
Zero call sites in production code (`ProductActions` is referenced only by itself and
a deleted preview file). Not user-facing; they are unreachable components. Safe to
delete or keep for planned features, but they are not wired to anything.

### F5. Hardcoded wearable props (OPEN — cosmetic)
`App.kt` passes `isConnected = false`, `batteryPercent = 0`,
`glassesModelName = "Meta smart glasses"` to `MetaWearablesPage`; the Android actual
ignores these and reads real state from `Wearables.*` streams. Misleading but harmless.

### F6 (2026-09-01). Agent wallets (USDC) implemented behind CDP custody and a hard human-confirmation gate
New boundary: `functions/src/payments/agentWallet.ts` + `cdpWalletAdapter.ts` + `agentWalletCallables.ts`.
Custody: Coinbase Developer Platform server wallet — private keys never leave CDP's TEE; Spresso stores only
API identifiers as Secret Manager secrets (`CDP_API_KEY_ID`, `CDP_API_KEY_SECRET`, `CDP_WALLET_SECRET`),
provisioned in the terraform vault list and bound per function. Policy layers (independent, stacked):
(1) in-code spend cap ($100/transfer) + network allowlist (base/base-sepolia); (2) CDP policy attached to the
account (ethValue cap, recipient allowlist, network allowlist, netUSDChange cap) enforced at signing time.
Flow: `prepareAgentTransfer` stages a transfer (idempotent, no funds move) → user confirms in the trusted UI →
`confirmAgentTransfer` executes with amount/destination locked to the prepared record; replay cannot double-
spend; audit logs are server-side only. Firestore `walletTransfers` is server-only (default-deny rules,
locked by test). Verified: wallet boundary tests 9/9, rules tests 4/4, functions tsc clean, terraform valid.
Pending: Stripe Projects browser auth was not completed, so CDP credentials must be created in the CDP Portal
or via Projects after sign-in, then set with `firebase functions:secrets:set`; CDP policy attachment ID is
created at provisioning time (see AGENT_WALLET setup note in docs).

## Legacy artifact note
`policy.json` is an IAM policy export that still references stale project
`spresso-5561f` (forbidden identifier). Read-only export artifact, not infrastructure
code; flagged for awareness.
