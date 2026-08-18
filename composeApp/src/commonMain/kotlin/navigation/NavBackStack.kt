package navigation

import androidx.compose.runtime.Composable
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.saveable.Saver
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.snapshots.SnapshotStateList

/**
 * Navigation 3 State-Preserving Saveable BackStack implementation.
 */
class NavBackStack(initialKey: NavKey) {
    val entries: SnapshotStateList<NavKey> = mutableStateListOf(initialKey)

    val currentKey: NavKey
        get() = entries.lastOrNull() ?: NavKey.ChatKey()

    fun push(key: NavKey) {
        if (entries.lastOrNull() != key) {
            entries.add(key)
        }
    }

    fun pop(): Boolean {
        if (entries.size > 1) {
            entries.removeAt(entries.lastIndex)
            return true
        }
        return false
    }

    fun replace(key: NavKey) {
        if (entries.isNotEmpty()) {
            entries[entries.lastIndex] = key
        } else {
            entries.add(key)
        }
    }

    fun switchTab(key: NavKey) {
        val existingIndex = entries.indexOfFirst { it::class == key::class }
        if (existingIndex != -1) {
            while (entries.size > existingIndex + 1) {
                entries.removeAt(entries.lastIndex)
            }
            entries[existingIndex] = key
        } else {
            entries.add(key)
        }
    }

    companion object {
        fun saver(): Saver<NavBackStack, List<String>> = Saver(
            save = { backStack ->
                backStack.entries.map { serializeNavKey(it) }
            },
            restore = { savedList ->
                val stack = NavBackStack(NavKey.ChatKey())
                stack.entries.clear()
                savedList.forEach { str ->
                    deserializeNavKey(str)?.let { stack.entries.add(it) }
                }
                if (stack.entries.isEmpty()) {
                    stack.entries.add(NavKey.ChatKey())
                }
                stack
            }
        )
    }
}

private fun serializeNavKey(key: NavKey): String {
    return when (key) {
        is NavKey.AuthKey -> "Auth"
        is NavKey.SplashScreenKey -> "Splash"
        is NavKey.GamifiedOnboardingKey -> "Onboarding:${key.initialStep}"
        is NavKey.EmailVerificationKey -> "EmailVerification"
        is NavKey.ChatKey -> "Chat:${key.initialPrompt.orEmpty()}:${key.initialImage.orEmpty()}"
        is NavKey.GlobalChatOverlayKey -> "GlobalChat"
        is NavKey.ChatbotCanvasKey -> "ChatbotCanvas"
        is NavKey.ChatDiscoveryCardKey -> "ChatDiscovery:${key.category}"
        is NavKey.CatalogKey -> "Catalog"
        is NavKey.ProductCatalogScreenKey -> "CatalogScreen"
        is NavKey.ProductDetailKey -> "ProductDetail:${key.productId}"
        is NavKey.AICurationFeedKey -> "AICurationFeed"
        is NavKey.SmartVisionKey -> "SmartVision:${key.selectedProductId.orEmpty()}"
        is NavKey.SmartVisionDetectionKey -> "SmartVisionDetection"
        is NavKey.GroceryKey -> "Grocery"
        is NavKey.IngredientChecklistKey -> "IngredientChecklist:${key.recipeName}"
        is NavKey.OrdersKey -> "Orders"
        is NavKey.OrderReturnKey -> "OrderReturn:${key.orderId}"
        is NavKey.OrderReturnResultKey -> "OrderReturnResult:${key.returnId}"
        is NavKey.HITLCheckoutKey -> "HITLCheckout"
        is NavKey.CreatorKey -> "Creator:${key.selectedTemplateId}"
        is NavKey.CreatorTemplatesKey -> "CreatorTemplates"
        is NavKey.CreatorAgentsSectionKey -> "CreatorAgentsSection"
        is NavKey.TravelKey -> "Travel"
        is NavKey.TravelQrModalKey -> "TravelQr:${key.eventTitle}:${key.eventLocation}:${key.qrData}"
        is NavKey.TravelReceiptScannerKey -> "TravelReceipt:${key.activeTripId}"
        is NavKey.TravelVoiceNotesKey -> "TravelVoiceNotes"
        is NavKey.TravelBoardingPassKey -> "TravelBoardingPass"
        is NavKey.WardrobeKey -> "Wardrobe:${key.displayMediaUrl.orEmpty()}:${key.isVideoPlaying}"
        is NavKey.WardrobeMainKey -> "WardrobeMain"
        is NavKey.StackedWardrobeDecksKey -> "StackedWardrobeDecks"
        is NavKey.GallerySyncDisabledKey -> "GallerySyncDisabled"
        is NavKey.ProfileKey -> "Profile"
        is NavKey.AccountManagementKey -> "AccountManagement"
        is NavKey.PaymentWalletKey -> "PaymentWallet"
        is NavKey.SubscriptionMembershipKey -> "SubscriptionMembership"
        is NavKey.LegalSecurityKey -> "LegalSecurity"
        is NavKey.PreferencesKey -> "Preferences"
        is NavKey.MetaWearablesKey -> "MetaWearables"
        is NavKey.SpatialLiquidGlassKey -> "SpatialLiquidGlass"
    }
}

private fun deserializeNavKey(str: String): NavKey? {
    val parts = str.split(":")
    return when (parts.getOrNull(0)) {
        "Auth" -> NavKey.AuthKey
        "Splash" -> NavKey.SplashScreenKey
        "Onboarding" -> NavKey.GamifiedOnboardingKey(parts.getOrNull(1)?.toIntOrNull() ?: 1)
        "EmailVerification" -> NavKey.EmailVerificationKey
        "Chat" -> NavKey.ChatKey(
            initialPrompt = parts.getOrNull(1)?.ifEmpty { null },
            initialImage = parts.getOrNull(2)?.ifEmpty { null }
        )
        "GlobalChat" -> NavKey.GlobalChatOverlayKey
        "ChatbotCanvas" -> NavKey.ChatbotCanvasKey
        "ChatDiscovery" -> NavKey.ChatDiscoveryCardKey(parts.getOrNull(1) ?: "general")
        "Catalog" -> NavKey.CatalogKey
        "CatalogScreen" -> NavKey.ProductCatalogScreenKey
        "ProductDetail" -> NavKey.ProductDetailKey(parts.getOrNull(1) ?: "")
        "AICurationFeed" -> NavKey.AICurationFeedKey
        "SmartVision" -> NavKey.SmartVisionKey(
            selectedProductId = parts.getOrNull(1)?.ifEmpty { null }
        )
        "SmartVisionDetection" -> NavKey.SmartVisionDetectionKey
        "Grocery" -> NavKey.GroceryKey
        "IngredientChecklist" -> NavKey.IngredientChecklistKey(parts.getOrNull(1) ?: "Quick Meal")
        "Orders" -> NavKey.OrdersKey
        "OrderReturn" -> NavKey.OrderReturnKey(parts.getOrNull(1) ?: "")
        "OrderReturnResult" -> NavKey.OrderReturnResultKey(parts.getOrNull(1) ?: "")
        "HITLCheckout" -> NavKey.HITLCheckoutKey
        "Creator" -> NavKey.CreatorKey(
            selectedTemplateId = parts.getOrNull(1) ?: "economic"
        )
        "CreatorTemplates" -> NavKey.CreatorTemplatesKey
        "CreatorAgentsSection" -> NavKey.CreatorAgentsSectionKey
        "Travel" -> NavKey.TravelKey
        "TravelQr" -> NavKey.TravelQrModalKey(
            eventTitle = parts.getOrNull(1) ?: "Flight Ticket",
            eventLocation = parts.getOrNull(2) ?: "Gate A4",
            qrData = parts.getOrNull(3) ?: "SPRESSO-PASS-2026"
        )
        "TravelReceipt" -> NavKey.TravelReceiptScannerKey(parts.getOrNull(1) ?: "trip-current")
        "TravelVoiceNotes" -> NavKey.TravelVoiceNotesKey
        "TravelBoardingPass" -> NavKey.TravelBoardingPassKey
        "Wardrobe" -> NavKey.WardrobeKey(
            displayMediaUrl = parts.getOrNull(1)?.ifEmpty { null },
            isVideoPlaying = parts.getOrNull(2)?.toBooleanStrictOrNull() ?: false
        )
        "WardrobeMain" -> NavKey.WardrobeMainKey
        "StackedWardrobeDecks" -> NavKey.StackedWardrobeDecksKey
        "GallerySyncDisabled" -> NavKey.GallerySyncDisabledKey
        "Profile" -> NavKey.ProfileKey
        "AccountManagement" -> NavKey.AccountManagementKey
        "PaymentWallet" -> NavKey.PaymentWalletKey
        "SubscriptionMembership" -> NavKey.SubscriptionMembershipKey
        "LegalSecurity" -> NavKey.LegalSecurityKey
        "Preferences" -> NavKey.PreferencesKey
        "MetaWearables" -> NavKey.MetaWearablesKey
        "SpatialLiquidGlass" -> NavKey.SpatialLiquidGlassKey
        else -> null
    }
}

@Composable
fun rememberSaveableNavBackStack(initialKey: NavKey): NavBackStack {
    return rememberSaveable(saver = NavBackStack.saver()) {
        NavBackStack(initialKey)
    }
}
