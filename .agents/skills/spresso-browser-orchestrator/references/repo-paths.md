# Repository path contract

Before each phase, resolve current paths from HEAD. Expected canonical areas:

```text
package.json
convex/schema.ts
convex/ai/tools.ts
convex/merchantBrowser/index.ts
convex/merchantBrowser/provider.ts
convex/merchantBrowser/state.ts
convex/merchantBrowser/tools.ts
convex/merchantBrowser/events.ts
convex/commerce/actions.ts
convex/commerce/checkout.ts
convex/payments/**
convex/http.ts

composeApp/**/MerchantBrowserViewModel.kt
composeApp/**/MerchantBrowserSessionCard.kt
composeApp/**/MerchantBrowserTimelinePane.kt
composeApp/**/CheckoutConfirmDialog.kt
composeApp/**/HITLCheckoutSummaryCard.kt
composeApp/**/MerchantHandoffDialog.kt
composeApp/**/PurchaseConfirmationState.kt
```

Legacy/reference paths may include:

```text
functions/src/kitesurf*
services/openclaw/**
spresso-production-harness-v10-local-ci/docs/merchant-browser-automation.md
```

Legacy paths do not become canonical merely because they exist. Preserve Firebase Auth; do not reintroduce Firebase Functions as parallel commerce/browser authority.

When a path moved, locate the symbol/import call sites and update this phase against the actual canonical file. Do not create a duplicate subsystem just because the expected path differs.
