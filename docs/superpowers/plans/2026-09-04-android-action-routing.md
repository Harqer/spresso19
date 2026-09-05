# Android Action Routing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Make Android actions resolve to canonical domain pages with typed payloads and deterministic failure behavior.

**Architecture:** Add a small pure routing contract in `commonMain` that classifies user actions by domain and produces typed `NavKey` destinations. Keep existing screen implementations and backend contracts; migrate callers through the contract instead of introducing another navigation layer. Verify the contract with common tests and Android navigation tests before touching payment, camera, or wearable implementations.

**Tech Stack:** Kotlin Multiplatform, Jetpack Compose, Navigation 3, Kotlin serialization, Kotlin test, Android Gradle Plugin.

**Spec:** `docs/superpowers/specs/2026-09-04-android-core-design.md`

## Global Constraints

- Android is the stage-one release client; React/Vite remains frozen until Android gates pass.
- Catalog listings are discovery metadata; Spresso owns no retailer inventory.
- Existing liked/bookmarked product collections are rendered through Wardrobe;
  owned wardrobe media remains distinct from discovery listings.
- Financial actions require an authenticated user, exact quote, explicit trusted-UI confirmation, provider idempotency, and provider confirmation.
- No production mocks, fabricated success, placeholder data, or internal diagnostics in customer UI.
- Meta glasses use DAT Display DSL, never phone Material 3 components.
- Existing symbols require GitNexus upstream impact analysis before edits.

### Task 1: Define canonical action and domain contracts

**Files:**
- Create: `composeApp/src/commonMain/kotlin/navigation/DomainPage.kt`
- Create: `composeApp/src/commonMain/kotlin/navigation/SpressoAction.kt`
- Create: `composeApp/src/commonMain/kotlin/navigation/ActionDestination.kt`
- Test: `composeApp/src/commonTest/kotlin/navigation/ActionDestinationTest.kt`

**Interfaces:**
- `DomainPage` enumerates `Chat`, `Catalog`, `Wardrobe`, `Grocery`, `Travel`, `Orders`, `Profile`, `Camera`, and `Wearables`.
- `SpressoAction` contains typed actions: `OpenProduct(productId)`, `SaveListing(listingId)`, `AddToCart(listingId, quantity)`, `OpenWardrobeItem(itemId)`, `AnalyzeCameraResult(resultId)`, `OpenOrders`, `OpenCheckout(cartId)`, `OpenPaymentWallet`, and `OpenWearables`.
- `ActionDestination.resolve(action: SpressoAction): NavKey` returns the canonical existing route, including `WardrobeMainKey` for liked/bookmarked listings.

- [ ] **Step 1: Write the failing tests**

```kotlin
class ActionDestinationTest {
    @Test
    fun savedListingRoutesToSavedItemsNotWardrobe() {
        assertEquals(
            NavKey.WardrobeMainKey,
            ActionDestination.resolve(SpressoAction.SaveListing("listing-1")),
        )
    }

    @Test
    fun ownedWardrobeItemRoutesToWardrobe() {
        assertEquals(
            NavKey.WardrobeKey(),
            ActionDestination.resolve(SpressoAction.OpenWardrobeItem("item-1")),
        )
    }
}
```

- [ ] **Step 2: Run the focused test and verify the expected failure**

Run: `./gradlew :composeApp:testDebugUnitTest --tests navigation.ActionDestinationTest --no-daemon --console=plain`

Expected: compilation failure because the action contract and saved-items route do not yet exist.

- [ ] **Step 3: Implement the minimal pure contract**

Use sealed Kotlin types, reject blank identifiers with `require`, and map each action to one route. Do not call Firebase, Compose state, or platform APIs from the resolver.

- [ ] **Step 4: Run the focused test and verify it passes**

Run the same Gradle command. Expected: both assertions pass with no warnings caused by the new contract.

### Task 2: Verify Wardrobe saved-listing ownership without adding a duplicate destination

**Files:**
- Modify: `composeApp/src/commonMain/kotlin/App.kt`
- Modify: `composeApp/src/commonMain/kotlin/components/features/wardrobe/StackedWardrobeDecks.kt`
- Reuse: `composeApp/src/commonMain/kotlin/network/ApiClient.kt`
- Test: `composeApp/src/commonTest/kotlin/navigation/NavKeyContractTest.kt`

**Interfaces:**
- Use existing `WardrobeMainKey` and `StackedWardrobeDecks` for liked/bookmarked listings.
- Keep owned garment media and discovery listings separate within Wardrobe.
- Do not add inventory fields or duplicate listing persistence.

- [ ] **Step 1: Write the failing route contract test**

```kotlin
class NavKeyContractTest {
    @Test
    fun savedItemsIsNotWardrobe() {
        assertTrue(NavKey.WardrobeMainKey != NavKey.WardrobeKey())
    }
}
```

- [ ] **Step 2: Run the focused test and verify the expected failure**

Run: `./gradlew :composeApp:testDebugUnitTest --tests navigation.NavKeyContractTest --no-daemon --console=plain`

Expected: the ownership assertion fails until the existing Wardrobe route is wired as the saved-listing destination.

- [ ] **Step 3: Add the route and entry**

Map saved-listing actions to the existing Wardrobe collection state and expose the route from existing catalog/profile callers. Do not create a second source of truth.

- [ ] **Step 4: Run the focused test and verify it passes**

Run the same Gradle command. Expected: the route contract passes.

### Task 3: Migrate Android callers to the action contract

**Files:**
- Modify: `composeApp/src/commonMain/kotlin/App.kt`
- Modify: `composeApp/src/commonMain/kotlin/components/features/catalog/ProductActions.kt`
- Modify: `composeApp/src/commonMain/kotlin/components/features/wardrobe/`
- Modify: `composeApp/src/androidMain/kotlin/com/spresso/MainActivity.kt`
- Modify: `composeApp/src/androidMain/kotlin/com/spresso/appfunctions/SpressoAppFunctionService.kt`
- Modify: `composeApp/src/androidMain/kotlin/com/spresso/SpressoWearablesService.kt`
- Test: `composeApp/src/commonTest/kotlin/navigation/ActionCallerContractTest.kt`

**Interfaces:**
- UI, App Functions, camera callbacks, and wearable tool callbacks emit `SpressoAction`.
- Only the navigation boundary resolves actions into `NavKey`.
- Backend operations remain in repositories/services; route resolution never performs side effects.

- [ ] **Step 1: Write failing caller-contract tests**

Cover `SaveListing`, `AddToCart`, `AnalyzeCameraResult`, `OpenOrders`, `OpenCheckout`, and wearable handoff actions. Assert the resolved route class and identifier.

- [ ] **Step 2: Run focused tests and verify failure**

Run: `./gradlew :composeApp:testDebugUnitTest --tests navigation.ActionCallerContractTest --no-daemon --console=plain`

Expected: failures identify callers still constructing unrelated routes directly.

- [ ] **Step 3: Replace direct misrouting**

Route saved listings to Saved Items, owned garments to Wardrobe, camera product recognition to Catalog/Product Detail, checkout actions to Checkout, and order actions to Orders. Preserve user-facing error copy and existing provider calls.

- [ ] **Step 4: Run focused tests and verify pass**

Run the same command. Expected: all action caller assertions pass.

### Task 4: Verify Android navigation and affected flows

**Files:**
- Test: `composeApp/src/androidUnitTest/kotlin/navigation/AndroidActionRoutingTest.kt`
- Test: `composeApp/src/androidInstrumentedTest/kotlin/navigation/Navigation3ActionRoutingTest.kt`

- [ ] **Step 1: Add route persistence and back-stack assertions**

Verify authenticated entry, top-level switching, detail navigation, saved back-stack restoration, checkout return, and order receipt navigation.

- [ ] **Step 2: Run Android unit tests and verify failure before implementation**

Run: `./gradlew :composeApp:testDebugUnitTest --tests navigation.* --no-daemon --console=plain`

- [ ] **Step 3: Implement only the missing Navigation 3 state behavior**

Keep `Navigator` as the single state mutator. Do not introduce string routes, fragment navigation, or a second back-stack implementation.

- [ ] **Step 4: Run Android unit and instrumented checks**

Run: `./gradlew :composeApp:testDebugUnitTest :composeApp:connectedDebugAndroidTest --no-daemon --console=plain`

Expected: route, adaptive navigation, and action wiring checks pass on the available device.

### Task 5: Review graph impact and hand off to payment/camera/DAT plans

**Files:**
- No production files; review only.

- [ ] **Step 1: Run the Android compile gate**

Run: `./gradlew :composeApp:compileDebugKotlinAndroid --no-daemon --console=plain`

- [ ] **Step 2: Run GitNexus upstream impact for changed symbols**

Run: `node .gitnexus/run.cjs impact "ActionDestination" --direction upstream --repo .` and review callers and risk.

- [ ] **Step 3: Run graph change analysis**

Run: `node .gitnexus/run.cjs detect-changes --scope all --repo .`. Treat partial, truncated, unknown, high, or critical results as unresolved.

- [ ] **Step 4: Record the next independent plan**

Payment, CameraX, and Meta DAT each require separate implementation plans because they have different SDK contracts and verification environments.
