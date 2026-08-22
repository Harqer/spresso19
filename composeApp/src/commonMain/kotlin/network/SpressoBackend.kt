package network

/**
 * Platform-specific Data Connect backend operations.
 * All mutations and queries connect to the real Firebase Data Connect instance.
 * No stubs, no empty bodies, no mock returns.
 */
expect object SpressoBackend {
    // ── Grocery ──────────────────────────────────────────────────────────────
    suspend fun addGroceryItem(
        listId: String,
        productName: String,
        productId: String?,
        addedVia: String,
    )

    suspend fun toggleGroceryItem(
        itemId: String,
        isPurchased: Boolean,
    )

    suspend fun deleteGroceryItem(itemId: String)

    // ── Onboarding ───────────────────────────────────────────────────────────
    suspend fun updateOnboardingStatus(
        currentStep: Int,
        isCompleted: Boolean,
    )

    // ── Orders ───────────────────────────────────────────────────────────────
    suspend fun createOrder(
        authorizationId: String,
        productId: String,
        quantity: Int,
        totalAmount: Double,
        shippingAddress: String?,
        deviceSource: String,
        paymentMethod: String,
        userConfirmedToken: String?,
    )

    // ── Travel ───────────────────────────────────────────────────────────────
    suspend fun createVoiceNote(
        tripId: String,
        transcript: String,
    )

    suspend fun createTravelExpense(
        tripId: String,
        amount: Double,
        currency: String?,
        category: String,
        merchant: String,
        items: String?,
    )

    // ── Vision ───────────────────────────────────────────────────────────────
    suspend fun logVisionEvent(
        detectedObjects: String,
        context: String?,
        imageUrl: String?,
    )

    // ── Wardrobe ─────────────────────────────────────────────────────────────
    suspend fun getWardrobeOutfits(): List<WardrobeOutfitData>

    suspend fun getWardrobeItems(): List<WardrobeItemData>

    suspend fun uploadImage(
        bytes: ByteArray,
        path: String,
    ): String

    suspend fun addWardrobeItem(
        outfitId: String?,
        category: String,
        brand: String?,
        imageUrl: String,
        color: String?,
    )

    // ── Creator ──────────────────────────────────────────────────────────────
    suspend fun getCreatorAgents(): List<CreatorAgentData>

    suspend fun getCreativeTemplates(): List<CreativeTemplateData>
}

// ── Typed return models (platform-agnostic) ────────────────────────────────

data class WardrobeOutfitData(
    val id: String,
    val title: String,
    val description: String?,
    val imageUrl: String?,
    val items: List<WardrobeItemData>,
)

data class WardrobeItemData(
    val id: String,
    val category: String,
    val brand: String?,
    val imageUrl: String,
    val color: String?,
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
