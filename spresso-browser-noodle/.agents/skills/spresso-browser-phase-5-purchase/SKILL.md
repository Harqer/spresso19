---
name: spresso-browser-phase-5-purchase
description: Implement UCP/AP2 capability negotiation, deterministic purchase authorization, safe non-AP2 fallback, scoped payment credential handling, and merchant-order truth.
schedule: "Run only after PHASE-4-DONE.md exists, PHASE-5-DONE.md and PHASE-5-BLOCKED.md are absent, and Noodle mode is supervised or manual."
---

# Operating rules

Read before work:
- `.agents/skills/spresso-browser-orchestrator/references/architecture-contract.md`
- `.agents/skills/spresso-browser-orchestrator/references/nested-skills.md`
- `.agents/skills/spresso-browser-orchestrator/references/repo-paths.md`
- `.agents/skills/spresso-browser-orchestrator/references/phase-markers.md`

Work against current HEAD. Search call sites before replacing exports. Preserve working canonical paths and remove duplication rather than adding a parallel subsystem.

Use repository evidence and tests. Do not ask the user for information derivable from the codebase or primary docs.

If `.noodle.toml` is `auto` and this phase explicitly forbids auto, stop without code changes and create the phase BLOCKED marker requesting `supervised` or `manual`.

# Phase 5 — secure purchase authorization and merchant order truth

AUTO MODE IS FORBIDDEN FOR THIS PHASE.

## Nested skills

Load `convex:convex-expert` before Convex edits and `convex:convex-reviewer` before completion.

There is no nested AP2 skill to substitute for the protocol. Read current UCP/AP2 primary specifications before coding.

## Goal

Let Playwright prepare a real merchant checkout, then move spending authority outside the agent. Use UCP/AP2 only when actually negotiated. Preserve purchase capability when AP2 is unavailable through a Muse-equivalent exact-approval/scoped-credential path.

## Checkout snapshot

Before authorization, capture and normalize live merchant truth:
- merchant origin/name;
- line items;
- SKU/product identity;
- variant/size/color;
- quantity;
- shipping destination summary;
- shipping option;
- tax/fees;
- currency;
- final amount;
- checkout URL/state;
- observation timestamp.

Browser evidence is live and must be re-read immediately before final submission.

## UCP/AP2 capability negotiation

For merchant origin:
1. fetch and validate `/.well-known/ucp`;
2. negotiate protocol version/capability intersection;
3. native AP2 path is active only when checkout capability and AP2 mandate payment extension are both negotiated according to the current UCP/AP2 specs;
4. once locked to AP2 for that checkout, reject silent downgrade.

The AP2 Trusted Surface and mandate verification are deterministic/non-agentic.

Implement exact current v0.2-or-later mandate verification from the installed spec/version:
- verify merchant-signed checkout;
- bind Checkout Mandate to exact checkout;
- bind Payment Mandate to the checkout;
- verify signatures/issuer/audience/expiry/nonces and transaction constraints;
- retain receipt/evidence references.

Do not label browser-only merchants AP2.

## Human-present non-AP2 fallback

For a merchant that does not support AP2, use exact human approval before payment submission.

Trusted Compose confirmation must show:
- merchant;
- products/variants/quantities;
- shipping summary/option;
- tax/fees;
- currency;
- total;
- payment method summary.

The model cannot approve this surface.

After approval, immediately re-read merchant checkout. If merchant/items/variant/quantity/currency/amount changed, invalidate approval and return to confirmation.

## Payment credential path

Use the current production-supported Stripe Link wallet-for-agents / scoped payment-token capability if the account is enabled for it.

Underlying reusable card credentials never enter model context.

If a new merchant form needs a one-time/scoped credential:
- acquire it only after exact approval;
- bind it to the approved purchase using provider-supported merchant/amount/time controls;
- transition browser control away from AGENT while the credential is inserted/submitted;
- do not persist or log the credential.

If the Stripe account/provider capability is not enabled, this is a genuine external blocker for autonomous non-AP2 payment. Preserve the safe fallback: HUMAN_CONTROL at the merchant payment step. Do not invent an unscoped reusable-card architecture.

## Existing Stripe remediation

Audit current Spresso `PaymentIntent`/webhook/order flow.

A Stripe payment success to Spresso is not retailer fulfillment evidence.

Do not create/finalize a retailer `orders` record merely from `payment_intent.succeeded`.

Merchant order truth requires one or more authoritative artifacts:
- UCP/AP2 receipt;
- merchant order ID;
- merchant confirmation response;
- verified confirmation page/network response.

Represent payment state separately from merchant order state where needed.

Preserve webhook idempotency and payload-hash protections.

## Purchase browser transition

Required states:

```text
ACTIVE
→ READY_FOR_PURCHASE_AUTHORIZATION
→ [trusted approval/AP2]
→ SUBMITTING_PURCHASE
→ merchant evidence
→ COMPLETED
```

The agent cannot mutate checkout contents after approval without invalidating authorization.

A submit timeout is `OUTCOME_UNKNOWN`; inspect merchant order/cart/account before retry.

## Tests

Cover:
- UCP profile missing/invalid;
- AP2 capability absent -> non-AP2 path;
- AP2 negotiated -> downgrade rejected;
- mandate signature/expiry/checkout hash mismatch;
- amount/item/variant changed after approval -> invalidated;
- model cannot call approval mutation as the user;
- credential never appears in AI/browser event output;
- payment success without merchant confirmation does not create completed retailer order;
- duplicate submit/webhook reconciliation;
- timeout after purchase submission reconciles before retry.

Use existing device-bound confirmation only where it remains truthful and compatible; do not call proprietary P-256 confirmation "AP2".

## KMP

Update `CheckoutConfirmDialog` / `HITLCheckoutSummaryCard` / `PurchaseConfirmationState` to render the authoritative normalized checkout and clear invalidation/resume states. Keep payment/auth secrets out of Compose saved state/logging.

## Completion

Write `PHASE-5-DONE.md` only after end-to-end test coverage proves payment authority is separate from the browser/model and merchant confirmation—not payment alone—creates order truth.
