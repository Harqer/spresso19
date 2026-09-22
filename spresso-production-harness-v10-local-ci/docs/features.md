# Feature Registry

A feature is an end-to-end user capability, not a UI layer. Screens are named by user task, not backend mechanism.

## Product Discovery
Discover/compare/resolve purchasable products. Cover canonical product/offer/merchant/provenance, paging/lazy UI, variants/prices, empty/error/stale states, and try-on/purchase handoff.

## Virtual Try-On
Generate product-specific visualization. Use the installed/current Higgsfield skill/docs completely. Cover durable job state, private media, moderation, provenance, cancellation/retry, result display, cleanup, and access control. Generated imagery is not authoritative fit/sizing/inventory truth.

## Screen Product Discovery
Android MediaProjection capture → observations/OCR/detections → verified product candidates → discovery/try-on/purchase. Cover permission/lifecycle, no/multiple matches, stale results, capture stop, and cleanup. Observation confidence is not product identity.

## Wearable Product Detection
Use `docs/meta-wearables-dat.md`. Meta DAT and Glimmer remain separate platform paths. Cover the full applicable wearable lifecycle before perception/product resolution. Detection confidence is not verified product identity.

## Agentic Checkout
No dedicated Checkout screen is required. AI may prepare and execute only after explicit biometric + MFA confirmation of the exact intent. Bind authorization to user, merchant, offer/cart, variant, quantity, amount, currency, nonce/expiry/idempotency. Material changes invalidate authorization. Reconcile ambiguous payment/merchant outcomes before retry.

## Realtime AI
Use one canonical realtime media/session transport. Convex stores durable session/tool/application state. Cover permissions, reconnect, interruption/barge-in, cancellation, duplicate/stale responses, backpressure, cleanup, and in-flight tool behavior. Voice/transcript is never purchase authorization.

## Grocery List
Realtime user-owned list with deterministic mutations. AI may propose/resolve items. Cover duplicates, concurrent edits, substitutes/unavailable items, auth, reconnect/offline behavior.

## Order History
Lazy/paged user-owned history linked to Spresso workflow state and authoritative external payment/merchant/fulfillment status. Cover cross-user denial, partial/unknown states, duplicates, and reconciliation.
