# Android Core Functional Design

## Goal

Make the Jetpack Compose/Kotlin Multiplatform Android application the complete
stage-one client. React/Vite remains in the repository and uses the same backend
contracts, but Android is the first release gate.

## Domain boundaries

- Catalog owns discovery, listing detail, save listing, and add-to-cart actions.
- Wardrobe owns user-owned clothing, photos, outfits, styling, and the existing
  liked/bookmarked discovery collections.
- Grocery owns ingredients and grocery lists.
- Travel owns trips, boarding passes, receipts, and travel notes.
- Orders owns merchant quotes, confirmed orders, tracking, returns, and refunds.
- Profile/settings owns identity, preferences, payment, and wallet setup.
- Chat owns Ask Spresso conversations and recommendation actions.
- Camera and wearable capture routes analyzed results into Catalog or Wardrobe.

Spresso stores user intent and discovery metadata only. It does not store
retailer inventory, reserve stock, decrement quantities, or claim availability
without a fresh merchant response.

## Purchase flow

`sign in -> discover -> inspect -> cart -> fresh merchant quote -> choose Stripe
or Coinbase -> review exact transaction -> explicit user confirmation -> signed
provider result -> order receipt/status`

Stripe handles card checkout. Coinbase handles supported wallet/crypto checkout.
AI may research and prepare the transaction, but cannot select credentials or
submit an unconfirmed payment.

## Android architecture

- Compose screens and state live in `commonMain` where platform-neutral.
- Android services and SDK boundaries live in `androidMain`.
- Navigation 3 owns typed routes, conditional auth flow, saved back stacks, and
  adaptive list/detail or supporting-pane scenes.
- Adaptive navigation uses `NavigationSuiteScaffold`; screens own their insets.
- Every Activity uses edge-to-edge and `adjustResize`; lists, fields, dialogs,
  and FABs consume insets exactly once.
- Firebase Auth/App Check, Firestore, callable Functions, and App Functions are
  the trusted application boundary.

## Camera and wearables

CameraX owns permission, preview, capture, analysis, lifecycle, rotation, and
hardware failure states. ML Kit analysis uses the supported CameraX integration.

Meta DAT initialization, registration, permissions, session readiness,
capability attachment, Display DSL rendering, camera teardown, terminal-session
recreation, and async error handling follow the installed DAT skills. Glasses
surfaces never use phone Material 3 components.

## Action and page contract

Every visible action, Firebase callable, App Function, AI tool, and payment
operation must map to one canonical page and typed payload. Contract tests cover
successful routing, authorization, failure, cancellation, duplicate requests,
stale quotes, and user-facing error copy. No action may silently route to a
different domain or synthesize success.

## Verification

The Android gate requires Gradle compilation, unit tests, Compose/UI tests,
Navigation 3 route checks, App Function registration/invocation checks, Android
CLI layout inspection, CameraX permission/capture checks, DAT MockDeviceKit
lifecycle checks, and Stripe/Coinbase provider-sandbox confirmation paths.
Fresh merchant quotes, idempotency, provider confirmation, and server-side
telemetry must be proven. React/Vite verification follows after Android gates.
