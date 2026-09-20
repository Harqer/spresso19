package network

/** User-owned wardrobe outfit returned by the Convex HTTP bridge. */
data class WardrobeOutfitData(
    val id: String,
    val title: String,
    val description: String?,
    val imageUrl: String?,
    val items: List<WardrobeItemData>,
)

/** User-owned wardrobe item or bookmarked external listing. */
data class WardrobeItemData(
    val id: String,
    val category: String,
    val brand: String?,
    val imageUrl: String,
    val color: String?,
    val kind: String = "user_upload",
    val productId: String? = null,
    val mediaAssetId: String? = null,
    val mediaKey: String? = null,
)

data class CreatorAgentData(
    val id: String,
    val title: String,
    val badge: String?,
    val subtitle: String,
    val iconName: String,
    val capabilities: String,
    val quickPrompts: List<QuickPromptData>,
)

data class QuickPromptData(
    val id: String,
    val label: String,
    val prompt: String,
)

data class CreativeTemplateData(
    val id: String,
    val name: String,
    val creator: String,
    val category: String,
    val description: String?,
    val iconName: String,
    val promptExample: String?,
)
