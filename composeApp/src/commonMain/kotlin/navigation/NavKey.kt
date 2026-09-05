package navigation

import kotlinx.serialization.Serializable
import androidx.navigation3.runtime.NavKey as AndroidXNavKey

/**
 * Type-safe Navigation 3 Key Contract for Spresso.
 * Contains all top-level destinations, feature screens, modals, overlays, and detail flows.
 */
@Serializable
sealed interface NavKey : AndroidXNavKey {
    // 1. Auth & Onboarding Flow
    @Serializable
    data object AuthKey : NavKey

    @Serializable
    data object SplashScreenKey : NavKey

    @Serializable
    data class GamifiedOnboardingKey(
        val initialStep: Int = 1,
    ) : NavKey

    @Serializable
    data object EmailVerificationKey : NavKey

    // 2. Personal AI Shopper / Chat Flow
    @Serializable
    data class ChatKey(
        val initialPrompt: String? = null,
        val initialImage: String? = null,
    ) : NavKey

    @Serializable
    data object GlobalChatOverlayKey : NavKey

    @Serializable
    data object ChatbotCanvasKey : NavKey

    @Serializable
    data class ChatDiscoveryCardKey(
        val category: String = "general",
    ) : NavKey

    // 3. Product Catalog & Curation Flow
    @Serializable
    data object CatalogKey : NavKey

    @Serializable
    data object ProductCatalogScreenKey : NavKey

    @Serializable
    data class ProductDetailKey(
        val productId: String,
    ) : NavKey

    @Serializable
    data object AICurationFeedKey : NavKey

    // 4. Wardrobe & Virtual Try-On Flow
    @Serializable
    data class WardrobeKey(
        val displayMediaUrl: String? = null,
        val isVideoPlaying: Boolean = false,
    ) : NavKey

    @Serializable
    data object WardrobeMainKey : NavKey

    @Serializable
    data object StackedWardrobeDecksKey : NavKey

    @Serializable
    data object GallerySyncDisabledKey : NavKey

    // 5. Smart Vision & Lens Flow
    @Serializable
    data class SmartVisionKey(
        val selectedProductId: String? = null,
    ) : NavKey

    @Serializable
    data object SmartVisionDetectionKey : NavKey

    // 6. Grocery & Ingredients Flow
    @Serializable
    data object GroceryKey : NavKey

    @Serializable
    data class IngredientChecklistKey(
        val recipeName: String = "Quick Meal",
    ) : NavKey

    // 7. Orders & Checkout Flow
    @Serializable
    data object OrdersKey : NavKey

    @Serializable
    data class OrderReturnKey(
        val orderId: String,
    ) : NavKey

    @Serializable
    data class OrderReturnResultKey(
        val returnId: String,
    ) : NavKey

    @Serializable
    data object HITLCheckoutKey : NavKey

    // 8. Creator Agents & Studio Flow
    @Serializable
    data class CreatorKey(
        val selectedTemplateId: String = "economic",
    ) : NavKey

    @Serializable
    data object CreatorTemplatesKey : NavKey

    @Serializable
    data object CreatorAgentsSectionKey : NavKey

    // 9. Travel & Expenses Flow
    @Serializable
    data object TravelKey : NavKey

    @Serializable
    data class TravelQrModalKey(
        val eventTitle: String = "Flight Ticket",
        val eventLocation: String = "Gate A4",
        val qrData: String = "SPRESSO-PASS-2026",
    ) : NavKey

    @Serializable
    data class TravelReceiptScannerKey(
        val activeTripId: String = "trip-current",
    ) : NavKey

    @Serializable
    data object TravelVoiceNotesKey : NavKey

    @Serializable
    data object TravelBoardingPassKey : NavKey

    // 10. Profile & Account Settings Flow
    @Serializable
    data object ProfileKey : NavKey

    @Serializable
    data object AccountManagementKey : NavKey

    @Serializable
    data object PaymentWalletKey : NavKey

    @Serializable
    data object SubscriptionMembershipKey : NavKey

    @Serializable
    data object LegalSecurityKey : NavKey

    @Serializable
    data object PreferencesKey : NavKey

    @Serializable
    data object SupportKey : NavKey

    // 11. Wearables & Spatial Flow
    @Serializable
    data object MetaWearablesKey : NavKey

    @Serializable
    data object SpatialLiquidGlassKey : NavKey
}
