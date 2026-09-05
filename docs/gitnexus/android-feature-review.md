# Android/KMP feature review

Date: 2026-09-04  
Scope: `composeApp/**` only  
Decision vocabulary: **MERGE** means production-capable for this integration slice; **HOLD** means retain the code but do not merge into a release branch until the listed gates pass; **DISCARD** means remove/archive only after confirming no required callers.

## Executive decision

| Feature group | Decision | Why |
|---|---|---|
| Auth and onboarding | **MERGE** | Firebase email/password and Android Credential Manager Google sign-in are real integrations; failure paths are customer-facing. Passkey coverage exists, but the provider configuration and device-flow tests remain release gates. |
| Navigation 3 and adaptive shell | **MERGE** | Typed `NavKey` routes, per-tab back stacks, `NavDisplay` entry wiring, and adaptive navigation are in active use. Keep the current route contract; do not merge any name-only route cleanup without exact impact analysis. |
| Catalog/discovery | **MERGE** for discovery; **HOLD** for checkout | Product discovery uses provider listings and explicit no-inventory modeling. Catalog UI, detail, like, try-on, share, and merchant handoff are wired. |
| Checkout/payment | **HOLD** | `CatalogViewModel.initiateCheckout()` creates a locally fabricated `authorizationId` and constructs a payload without a fresh server `prepareCheckout` quote. The detail dialog also invokes `onCheckoutRequested()` immediately, before the async payload is available. This violates the human-confirmed, server-priced payment boundary. |
| CameraX capture | **HOLD** | CameraX capture, gallery import, ML Kit object detection, and video capture are implemented. The composable requests microphone permission even for photo-only use and samples `PreviewView.bitmap` on a timer for frame/context callbacks rather than using a bounded analyzer pipeline. Permission denial, lifecycle recreation, and hardware tests are not present. GitNexus impact is HIGH (3 callers/processes). |
| Smart Vision / visual discovery | **HOLD** | It calls real `performLensSearch` and maps canonical listings, but the camera/input boundary has no dedicated Android integration tests and the result flow still opens `MerchantHandoffDialog` from a locally held HITL payload. Verify fresh merchant quote and user confirmation before allowing checkout. GitNexus impact is LOW for the common page. |
| Meta DAT wearables | **HOLD** | Registration, Android permissions, DAT camera permission, device metadata, user-facing failures, and foreground service handoff are present. The inspected implementation does not prove the required `DeviceSessionState.STARTED` capability attach/readiness discipline, terminal-session recreation, capability detach, or MockDeviceKit validation. DAT page symbol resolution is ambiguous across Android/common/Wasm; use the Android target UID for future impact checks. |
| Wardrobe and saved discovery listings | **MERGE** for read/upload/liked collection | Wardrobe reads user-scoped items and uploads real images; liked listings are loaded into the wardrobe collection. No retailer stock is modeled. Keep owned wardrobe media separate from liked discovery listings. |
| Profile/settings | **HOLD** | Profile fetch/update and payment-method removal are real, but “manage subscription” toggles tiers directly and “Add Card” only shows an unavailable message. Coinbase/Google Wallet UI does not establish a production payment path. |
| Legacy `com.spresso19` Android sources | **DISCARD** after checkpoint | The canonical manifest/application imports are under `com.spresso`; the old package files are deleted in the working tree and corresponding replacements are untracked. Treat as a package migration checkpoint, not an independent feature branch. Do not permanently delete until the rename is committed and a clean clone builds. |

## Evidence and graph impact

Exact GitNexus upstream checks were run against the current index:

- `SmartVisionPage` (`commonMain`): LOW, 2 impacted symbols, one `App` process.
- `CameraCaptureView` (`androidMain`): HIGH, 3 impacted symbols, one `App` process; callers include `rememberImagePicker` and the app flow.
- `ProductCatalogScreen` (`commonMain`): HIGH, 3 impacted symbols, two processes (`ProductCatalogPage`, `App`).
- `MetaWearablesPage` by name was ambiguous across three platform candidates and returned UNKNOWN overall. The Android candidate was LOW with two impacted symbols; future checks must use its exact target UID.
- `ProfilePage` by name was ambiguous across Kotlin and React candidates and returned UNKNOWN overall. The common Kotlin candidate was LOW with two impacted symbols.

The repository-wide dirty-tree `detect-changes` result remains critical and is not evidence against any one feature: it includes unrelated existing changes and package migration deletes/adds. These decisions are based on file inspection, callers, and the focused checks below.

## Verification run

The following command was run against the current tree:

```text
env JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64 PATH=/usr/lib/jvm/java-17-openjdk-amd64/bin:/usr/bin:/bin ./gradlew :composeApp:testDebugUnitTest :composeApp:compileDebugKotlinAndroid --no-daemon --console=plain
```

At report creation time Gradle was still running, so this review does not claim a fresh pass. Previously recorded focused evidence includes `navigation.ActionDestinationTest` passing and `:composeApp:compileDebugKotlinAndroid` passing. The parent agent must capture the final exit code/output before merging.

## Merge order

1. Merge Auth, Navigation, discovery Catalog, Wardrobe, and the existing focused tests after the fresh Android command passes.
2. Keep Checkout and Profile out of release until the server quote, Stripe/Coinbase payment boundary, explicit confirmation, idempotency, and webhook reconciliation are tested.
3. Keep CameraX and Smart Vision out of release until permission/lifecycle/device tests cover denial, pause/resume, rotation/recreation, and failure paths.
4. Keep DAT out of release until registration, denial, disconnect, pause/resume, terminal stop, capability readiness/error, and MockDeviceKit or Inspector evidence are attached.
5. Archive only proven-dead legacy/generated paths after a recoverable checkpoint and clean-clone build.

## Do not merge/discard

- Do not merge fabricated authorization IDs or claim that the current 1-Tap Buy Now flow submits a real checkout.
- Do not merge a payment card entry stub as if card storage were complete.
- Do not discard `commonMain` feature code because a name-only GitNexus query reports zero callers; the index explicitly reports unresolved dynamic-call risk for ambiguous symbols.
- Do not treat the untracked `com.spresso` replacements and deleted `com.spresso19` files as safely merged until the migration is checkpointed.
