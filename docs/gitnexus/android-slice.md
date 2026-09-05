# GitNexus Android/KMP slice inventory

Date: 2026-09-04  
Scope: `composeApp/**` only. This is an inventory and remediation boundary; no production source was changed for this slice.

## Current repository signal

The Android tree is not a clean, reviewable change set yet. `git status --short -- composeApp` reports 126 modified files, 54 deleted files, and 64 untracked paths. The current diff stat is 67 paths and 5,271 deletions versus 601 additions. These counts include work already present before this inventory and must not be interpreted as one feature.

GitNexus was queried against the indexed repository `Spresso19`. The index reports 12,398 nodes and 21,180 relationships, but its cross-language/property-resolution warnings make impact results lower-bound at interface and dynamic boundaries.

## Canonical Android package boundary

`composeApp/build.gradle.kts` declares both `namespace = "com.spresso"` and `applicationId = "com.spresso"`. The Android manifest uses relative component names (`.MainActivity`, `.SpressoApp`, services, receivers), and source imports now target `com.spresso.*`.

The old tracked `composeApp/src/**/com/spresso19/**` paths are deleted while corresponding `com/spresso/**` paths are untracked. This is a package migration represented as delete-plus-add in the current working tree, not yet as a reviewable rename. There are 46 tracked old-package files and 45 tracked new-package files in Git's index; the filesystem currently has no `com.spresso19` package declarations and 90 files under the new package family. The new paths include Android entry points, app services, App Functions, Engage, billing, wearable helpers, XR, Data Connect generated Kotlin, and platform expect/actual implementations.

Recommended canonical boundary:

- Keep `com.spresso` as the only Android namespace and application ID.
- Preserve `com.spresso19` only as a documented migration history/compatibility concern until all manifest, imports, deep links, and external consumers are verified.
- Stage package moves as explicit rename-only commits, then make behavior changes separately. Do not delete the old side or add the new side in the same broad feature commit without a compile and manifest check.
- Treat `composeApp/src/androidMain/kotlin/com/spresso/dataconnect/**` as generated/provider output. Compare it to the Data Connect schema/generator source before accepting deletions or regenerated mutations.

## Android/KMP feature boundaries

### Shared navigation and Compose surface

Canonical files are `composeApp/src/commonMain/kotlin/navigation/{NavKey.kt,NavigationState.kt,Navigator.kt,ActionDestination.kt,SpressoAction.kt}` and `components/navigation/{AdaptiveNavigationScaffold.kt,AdaptiveScaffoldBody.kt,AdaptiveNavItems.kt}`. Navigation is shared KMP state rendered by Navigation 3 and adaptive Material 3 layouts; Android platform entry is `com.spresso.MainActivity`.

GitNexus impact evidence:

- `NavKey` upstream impact: HIGH, 34 impacted symbols, 25 direct callers, 2 affected processes. GitNexus warns this is lower-bound because the interface has 12 implementations and dynamic/interface dispatch is incomplete.
- `AdaptiveNavigationScaffold` context calls `NavigationState.toDecoratedEntries`, `Navigator.goBack`, and `Navigator.navigate`.

Implementation boundary: make route/action contract changes in isolated commits with common tests first; compile Android and wasm after navigation changes because the route model is shared.

### CameraX and vision

Android-only camera implementation lives under `components/features/camera/**` (7 files) and `components/features/vision/LiveVisionCamera.kt`. Dependencies are CameraX 1.3.4, CameraX ML Kit vision 1.4.0-beta02, and ML Kit object detection/labeling/text. `CameraCaptureView` owns permission requests, lifecycle camera controller, image/video capture, analysis, zoom/focus, and UI controls. `LiveVisionCamera` owns stream analysis and throttled image emission to the backend.

GitNexus impact evidence for `CameraCaptureView`: HIGH, exact target, 3 impacted symbols, 1 direct caller (`rememberImagePicker`), and the `App → CapturePhoto` / `App → ToggleVideoRecording` processes. Camera changes therefore cross Android camera, shared App, image picker, and wardrobe/vision flows.

Required next commits:

1. CameraX permission/lifecycle contract tests and failure-state UI behavior.
2. Capture and analysis boundary, including executor disposal and analyzer backpressure.
3. Vision upload/result routing to the correct catalog/wardrobe destination.

Use the CameraX skill and Android instrumentation/device verification for permission denial, pause/resume, rotation, capture failure, and camera absence. Do not introduce fake frames or mock production responses.

### Meta Wearables DAT

DAT dependencies are `mwdat-core`, `mwdat-camera`, `mwdat-display`, and debug/instrumentation `mwdat-mockdevice`, all version 0.9.0. DAT code is confined to Android files including `com/spresso/SpressoApp.kt`, `com/spresso/SpressoWearablesService.kt`, `components/features/wearables/MetaWearablesPage.kt`, `MetaDeviceCard.kt`, and `WearableToolProtocol.kt`. Manifest metadata supplies `mwdat_application_id` and `mwdat_client_token`; release values are read from environment variables and debug values from `local.properties`.

`SpressoApp` initializes DAT once. `MetaWearablesPage` handles Android permissions, DAT registration, DAT camera permission, and starts the foreground service. `SpressoWearablesService` owns camera/display/audio capabilities and service actions.

GitNexus impact evidence for `SpressoWearablesService`: LOW exact symbol, one direct importer (`MetaWearablesPage`), but the manifest references the service externally and therefore the graph result is not sufficient by itself. `NavKey` impact also includes the Android entry point and navigation layer.

Required next commits:

1. DAT registration/permission/session lifecycle contract and MockDeviceKit tests.
2. Camera stream capability and terminal/disconnect/error handling.
3. DAT Display DSL content verification separately from phone Material 3 UI.

Before each DAT edit, read the applicable installed `mwdat-android` skills and validate with MockDeviceKit or DAT Inspector where available. Never infer DAT APIs from the graph or generic Android APIs.

### Android integration and generated/provider boundaries

`build.gradle.kts` also binds Firebase, App Check, Data Connect, Google Engage, App Functions, Wallet, Coinbase Wallet SDK 1.2.0, billing, XR, and location. The broad dependency set is not evidence that each service is deployed or safe to couple into the first Android slice.

The generated Data Connect package currently appears under `com/spresso/dataconnect/com/spresso/dataconnect`, while one tracked generated mutation was deleted and other generated files were added/modified. This must be reconciled against the schema/generator before staging. Generated output should be isolated from handwritten Android package migration commits.

## Verification matrix for isolated commits

| Slice | Primary paths | Minimum evidence |
| --- | --- | --- |
| Package migration | `com/spresso19` → `com/spresso`, manifest, Gradle | rename-only diff; `compileDebugKotlinAndroid`; merged-manifest/component check; import search |
| Navigation | `commonMain/navigation`, `components/navigation`, `App.kt` | common route/action tests; Android compile; wasm compile; GitNexus impact/detect |
| CameraX | Android camera/vision and `ui/ImagePicker.kt` | CameraX permission/lifecycle/capture tests; device or instrumentation checks |
| DAT wearable | Android wearable service/page/protocol and manifest | DAT skill-gated MockDeviceKit/live checks for registration, denial, disconnect, pause/resume, terminal stop, capability failure |
| Provider/generated code | Data Connect generated package and Gradle dependencies | generator/schema diff; Android compile; no hand-edited generated output without provenance |

## Recommended Android commit sequence

1. `chore(android): checkpoint and classify package migration` — rename-only `com.spresso19` to `com.spresso`; manifest and imports; no feature behavior.
2. `test(navigation): lock shared route/action ownership` — common contract tests for page ownership and action destinations.
3. `feat(android): harden CameraX capture boundary` — permission, lifecycle, capture, analysis, and result routing.
4. `feat(android): complete Meta DAT lifecycle` — registration, permissions, session/capabilities, display, and service recovery.
5. `chore(android): reconcile generated Data Connect output` — generator provenance and compile verification.
6. `test(android): run cross-target release gate` — Android unit/instrumentation, wasm compile, and graph comparison against `main`.

Each commit requires upstream impact before editing existing symbols and `detect-changes --scope compare --base-ref main` before it is accepted. The current whole-tree GitNexus critical result must remain a baseline warning until unrelated domains are checkpointed and removed from the working-set comparison; it is not evidence that each Android slice is critical.

## Evidence commands

```bash
git status --short -- composeApp
git diff --stat -- composeApp
git ls-files 'composeApp/src/**/com/spresso19/**'
git ls-files 'composeApp/src/**/com/spresso/**'
rg -n 'com\.meta\.wearable|androidx\.camera|namespace|applicationId|mwdat_' composeApp composeApp/build.gradle.kts
gitnexus query "Android KMP CameraX Meta DAT navigation"
gitnexus impact "NavKey" --direction upstream
gitnexus impact "CameraCaptureView" --direction upstream
gitnexus impact "SpressoWearablesService" --direction upstream
gitnexus context "AdaptiveNavigationScaffold"
```
