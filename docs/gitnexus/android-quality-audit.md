# Android/KMP quality audit

Date: 2026-09-04  
Scope: `composeApp/**` only. This is a classification report; no production source was deleted or modified.

## Executive finding

`com.spresso` is the only viable Android package boundary in the working tree. The package move from `com.spresso19` is not yet a clean rename in Git: 46 old-package paths are staged as deletions while the filesystem contains 96 paths in the new package family, including additional Android integrations. Keep the new implementation, but checkpoint and review the move as a rename-plus-behavior-change before accepting it.

The strongest production surface is the shared KMP Compose application plus the Android CameraX and DAT entry points. It compiles (`:composeApp:compileDebugKotlinAndroid` passed in the parent verification) and has real Firebase/API call sites. It is not release-complete: camera/wearable flows have no instrumentation coverage, and several Android implementations duplicate responsibilities. The generated Data Connect package is provider output, not a competing handwritten implementation.

The repository-wide GitNexus result remains critical because the entire working tree is dirty. The Android-specific `NavKey` impact was HIGH (34 impacted symbols / 2 processes); `CameraCaptureView` was HIGH (3 impacted symbols / 1 direct caller); `SpressoWearablesService` was LOW by symbol resolution but externally referenced by the manifest, so the LOW result is not sufficient evidence of safety.

The canonical customer-facing product name is **Spresso**. The verified Firebase Hosting origin is `https://get-spresso.web.app`; `get-spresso.app` is not an established production endpoint in this repository. The Android application label is sourced from `@string/app_name`, and Play release tooling now targets the canonical `com.spresso` application ID. Package IDs, Firebase project IDs, and GitNexus repository identifiers that contain `spresso19` remain migration metadata and are not customer-facing names.

## Disposition summary

| Group | Classification | Quality / richness | Disposition |
|---|---|---:|---|
| `com/spresso/**` Android package | production, broad feature surface; migration not checkpointed | 4/5 | Retain as canonical; split rename from behavior changes |
| `com/spresso19/**` | legacy/deleted package paths | 0/5 in current filesystem | Discard only after rename, manifest, import, and external-consumer verification |
| `commonMain/**` Compose/navigation | production shared surface | 4/5 | Retain; it owns cross-platform UI and route contracts |
| Android `features/camera/**` | production CameraX capture UI | 3/5 | Retain; harden lifecycle/error handling and add device tests |
| Android + common `features/vision/**` | production/partial | 3/5 | Retain shared presentation and one Android camera owner; consolidate duplicate analyzers |
| Android DAT wearable files | production/partial | 3/5 | Retain; complete skill-gated lifecycle and MockDeviceKit coverage |
| Android `com/spresso/dataconnect/**` | generated/provider output | not scored | Regenerate from schema; never hand-edit or treat as domain source |
| `network/DataConnectHelper.kt` adapters | production integration boundary | 3/5 | Retain if calls remain required; keep handwritten logic outside generated directory |
| Android/common tests | test-only, narrow coverage | 2/5 | Retain and expand; no production replacement implied |
| `*Preview.kt`, `TestPreview.kt`, `BasicPreview.kt` | preview/test support | 1–2/5 | Retain only if used by Android Studio; exclude from feature-quality score |
| `composeApp/build/**` | generated build output | not scored | Discard from any source checkpoint/commit; do not manually clean shared tree |

## 1. Package and migration boundary

Canonical configuration is in `composeApp/build.gradle.kts` (`namespace` and `applicationId` are both `com.spresso`). `composeApp/src/androidMain/AndroidManifest.xml` uses the new package for metadata, services, receivers, and app functions. Current source search finds no `com.spresso19` package declarations.

The old paths are not a second implementation to retain. They are deleted paths in the working tree:

- `composeApp/src/androidMain/kotlin/com/spresso19/**`
- `composeApp/src/commonMain/kotlin/com/spresso19/**`
- `composeApp/src/iosMain/kotlin/com/spresso19/**`
- `composeApp/src/wasmJsMain/kotlin/com/spresso19/**`

The new paths are not a pure rename in important files. For example, the new `MainActivity.kt` differs materially from the old file (466 insertions / 289 deletions), and `SpressoWearablesService.kt` differs by 815 insertions / 517 deletions. Therefore:

- Retain `com.spresso` and the current manifest/application identity.
- Do not restore the old package as a parallel production path.
- Archive the old implementation only through a recoverable Git checkpoint or history; discard after verifying merged-manifest component names, deep links, shortcuts, App Functions, and any external clients.
- Make the eventual Git operation a reviewable rename/migration commit, followed by separate behavior commits.

The stale `composeApp/build/generated/source/buildConfig/release/com/spresso19/BuildConfig.java` is generated output from an earlier package state. It is not source and must not be used as evidence that the old namespace is active. It should be excluded from source commits and regenerated after the package migration.

## 2. Shared KMP and navigation

Retain:

- `composeApp/src/commonMain/kotlin/App.kt`
- `composeApp/src/commonMain/kotlin/navigation/NavKey.kt`
- `composeApp/src/commonMain/kotlin/navigation/NavigationState.kt`
- `composeApp/src/commonMain/kotlin/navigation/Navigator.kt`
- `composeApp/src/commonMain/kotlin/navigation/ActionDestination.kt`
- `composeApp/src/commonMain/kotlin/navigation/SpressoAction.kt`
- `composeApp/src/commonMain/kotlin/components/navigation/**`

This is the richest and most reusable surface: typed Navigation 3 route keys, adaptive Material 3 navigation, and KMP shared pages. Existing routes distinguish wardrobe-owned media, saved/liked discovery listings, catalog, orders, wallet, checkout, camera/vision, and wearables. `ActionDestinationTest` now verifies those ownership decisions.

Risk is real rather than theoretical: `NavKey` has HIGH upstream impact, so route changes can affect the Android entry point, adaptive navigation, and multiple feature pages. Keep route/action tests in `commonTest`, and compile both Android and wasm after shared changes. Do not create a second “Saved” page: liked/bookmarked discovery listings already belong to the Wardrobe collection surface.

## 3. CameraX and vision

### Retain as production candidates

- `composeApp/src/androidMain/kotlin/components/features/camera/CameraCaptureView.kt`
- `composeApp/src/androidMain/kotlin/components/features/camera/CameraCaptureActions.kt`
- `composeApp/src/androidMain/kotlin/components/features/camera/CameraPermissionDialog.kt`
- `composeApp/src/androidMain/kotlin/components/features/camera/CameraBottomBar.kt`
- `composeApp/src/androidMain/kotlin/components/features/camera/CameraTopBar.kt`
- `composeApp/src/androidMain/kotlin/components/features/camera/CameraGridOverlay.kt`
- `composeApp/src/androidMain/kotlin/components/features/camera/ObjectDetectionOverlay.kt`
- `composeApp/src/androidMain/kotlin/components/features/vision/LiveVisionCamera.kt`
- `composeApp/src/commonMain/kotlin/components/features/vision/SmartVisionPage.kt`
- `composeApp/src/commonMain/kotlin/components/features/vision/SmartVisionViewport.kt`
- shared detection/overlay files under `components/features/vision/**`

`CameraCaptureView` is feature-rich: CameraX lifecycle controller, photo/video capture, front/back lens, flash, grid, zoom/focus, ML Kit object analysis, gallery import, and frame/context callbacks. `LiveVisionCamera` is a real Android CameraX/ML Kit stream with backpressure and throttling. Shared `SmartVisionPage` performs real image upload/search through `ApiClient.performLensSearch` and maps results to merchant listings.

### Partial/scaffolded quality concerns

- `CameraCaptureView` and `LiveVisionCamera` each create a CameraX controller and ML Kit analyzer. They are two production paths for closely related camera work, not harmless platform `actual` variants. Select one owner for capture/analysis and make the other a thin adapter.
- `CameraCaptureActions.capturePhoto` silently completes on `ImageCaptureException`; the UI receives no action-specific failure message. This violates the zero-mock requirement indirectly by making a failed real operation look like a no-op.
- Camera permission requests include microphone for the general camera screen, even when the user is taking a photo. Separate camera and audio permission requests by capability.
- `SmartVisionPage` calls its discovered-listing collection `inventory`. This is semantically wrong for Spresso's discovery-only model and should be renamed to listings/results in a behavior-neutral cleanup.
- No Android instrumentation tests exist under `composeApp/src/androidInstrumentedTest`; the Gradle dependency is present but not exercised. Unit tests cannot validate permission denial, rotation, process death, camera absence, or lifecycle teardown.

Disposition: retain the richer CameraX path, consolidate analyzers, then add device/instrumentation coverage. Do not discard platform `actual` files for desktop/iOS/wasm: their user-facing upload/unavailable behavior is required for KMP compilation and fallback UX. They are partial by capability, not duplicate Android implementations.

## 4. Meta DAT wearable surface

Retain as the canonical Android wearable group:

- `composeApp/src/androidMain/kotlin/com/spresso/SpressoApp.kt`
- `composeApp/src/androidMain/kotlin/com/spresso/SpressoWearablesService.kt`
- `composeApp/src/androidMain/kotlin/components/features/wearables/MetaWearablesPage.kt`
- `composeApp/src/androidMain/kotlin/components/features/wearables/MetaDeviceCard.kt`
- `composeApp/src/androidMain/kotlin/components/features/wearables/WearableToolProtocol.kt`
- `composeApp/src/androidMain/kotlin/com/spresso/wearable/YuvToBitmapConverter.kt`
- `composeApp/src/commonMain/kotlin/components/features/wearables/MetaWearablesPage.kt`

The Android files contain real DAT registration/permission/session, camera/display service, and tool protocol code; the common and wasm files are platform UI fallbacks. The protocol has focused unit coverage in `WearableToolProtocolTest`, but the lifecycle gate is incomplete without MockDeviceKit/live validation for registration, permission denial, disconnect, pause/resume, terminal stop, and capability errors.

Do not merge the DAT Display surface with phone Material 3 components. Keep DAT DSL styling in the Android wearable implementation and common phone styling in the shared page.

Disposition: retain, skill-gate all future edits, and classify any older `com/spresso19` wearable copy as migration history—not a fallback implementation.

## 5. Generated Data Connect output

The 45 Kotlin files under `composeApp/src/androidMain/kotlin/com/spresso/dataconnect/com/spresso/dataconnect/**` are explicitly generated by Firebase Data Connect; the local README says regeneration overwrites changes. `ListProductsQuery.kt`, `GetProductByIdQuery.kt`, user/cart/order/wardrobe queries, and mutations are provider bindings, not a handwritten catalog implementation.

Disposition:

- Retain generated files only when they are reproducibly generated from the checked-in Data Connect schema/configuration and required by current Android callers.
- Regenerate as one isolated provider-output change; do not hand-edit generated Kotlin to fix domain behavior.
- Retain handwritten adapters in `network/DataConnectHelper.kt`, `network/SpressoBackend.kt`, and `MainActivity.kt` only where callers are verified.
- Review `ListProductsQuery` and any product/order fields against the discovery-only rule. Product price/listing metadata is allowed; retailer stock, reservation, decrement, or fake availability fields are not.
- Exclude `composeApp/build/**` generated classes, including the stale release `com.spresso19.BuildConfig`, from all source-quality decisions.

## 6. Tests and previews

Current test-only production-adjacent files are:

- `composeApp/src/commonTest/kotlin/navigation/ActionDestinationTest.kt` — shared route ownership; retain and expand.
- `composeApp/src/androidUnitTest/kotlin/components/features/catalog/DiscoveredListingCallableParserTest.kt` — real response parsing boundary; retain.
- `composeApp/src/androidUnitTest/kotlin/components/features/auth/PlatformPasskeyRegistrarTest.kt` — platform auth boundary; retain.
- `composeApp/src/androidUnitTest/kotlin/components/features/wearables/WearableToolProtocolTest.kt` — protocol parsing; retain.

These are useful contract tests but do not establish feature completeness. There are no Android instrumented camera, DAT, navigation UI, or payment confirmation tests in the current source tree. Preview files (`RootPreview.kt`, `com/spresso/*Preview.kt`, and `ProductCatalogPagePreview.kt`) are test/design support, not competing implementations; keep only those still discoverable by the IDE and do not score them as production behavior.

## Recommended clean-house sequence

1. Create a recoverable checkpoint of the whole tree.
2. Stage the package migration as rename-only where possible; verify the merged manifest and build-generated package.
3. Keep shared Navigation 3 and the new `com.spresso` Android surface as canonical.
4. Consolidate CameraX ownership and rename discovery results away from `inventory`.
5. Complete DAT lifecycle/device tests using the required installed DAT skills.
6. Regenerate Data Connect output from schema and isolate it from handwritten adapters.
7. Add Android instrumentation coverage before discarding any camera/wearable path.
8. Run GitNexus exact-target impact for each existing symbol, then compare detection against `main` after each isolated commit.

No path should be discarded solely because it is large, duplicated by package migration, or absent from the GitNexus caller set. External manifest references and generated/provider boundaries require explicit verification first.
