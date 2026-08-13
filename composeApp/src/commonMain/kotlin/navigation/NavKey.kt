package navigation

import kotlinx.serialization.Serializable

/**
 * Type-safe Navigation 3 Key Contract for Spresso 19.
 */
@Serializable
sealed interface NavKey {
    @Serializable
    data object AuthKey : NavKey

    @Serializable
    data class ChatKey(
        val initialPrompt: String? = null,
        val initialImage: String? = null
    ) : NavKey

    @Serializable
    data object CatalogKey : NavKey

    @Serializable
    data class SmartVisionKey(
        val selectedProductId: String? = null
    ) : NavKey

    @Serializable
    data object GroceryKey : NavKey

    @Serializable
    data object OrdersKey : NavKey

    @Serializable
    data class CreatorKey(
        val selectedTemplateId: String = "economic"
    ) : NavKey

    @Serializable
    data class WardrobeKey(
        val displayMediaUrl: String? = null,
        val isVideoPlaying: Boolean = false
    ) : NavKey

    @Serializable
    data object ProfileKey : NavKey
}
