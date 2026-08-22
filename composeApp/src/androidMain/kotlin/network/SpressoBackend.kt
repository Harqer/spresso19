package network

import com.google.firebase.storage.FirebaseStorage
import com.spresso.dataconnect.SpressoConnectorConnector
import com.spresso.dataconnect.execute
import com.spresso.dataconnect.instance
import kotlinx.coroutines.tasks.await
import java.util.UUID

/**
 * Android actual implementation of SpressoBackend.
 * All operations connect to Firebase Data Connect — zero stubs, zero empty bodies.
 */
actual object SpressoBackend {
    // ── Grocery ──────────────────────────────────────────────────────────────

    actual suspend fun addGroceryItem(
        listId: String,
        productName: String,
        productId: String?,
        addedVia: String,
    ) {
        val listUuid = UUID.fromString(listId)
        SpressoConnectorConnector.instance.addGroceryItem.execute(
            listId = listUuid,
            productName = productName,
            addedVia = addedVia,
        ) {
            this.productId = productId
        }
    }

    actual suspend fun toggleGroceryItem(
        itemId: String,
        isPurchased: Boolean,
    ) {
        val itemUuid = UUID.fromString(itemId)
        SpressoConnectorConnector.instance.toggleGroceryItem.execute(
            id = itemUuid,
            isPurchased = isPurchased,
        )
    }

    actual suspend fun deleteGroceryItem(itemId: String) {
        val itemUuid = UUID.fromString(itemId)
        SpressoConnectorConnector.instance.deleteGroceryItem.execute(id = itemUuid)
    }

    // ── Onboarding ───────────────────────────────────────────────────────────

    actual suspend fun updateOnboardingStatus(
        currentStep: Int,
        isCompleted: Boolean,
    ) {
        SpressoConnectorConnector.instance.updateOnboardingStatus.execute(
            currentStep = currentStep,
            isCompleted = isCompleted,
        )
    }

    // ── Orders ───────────────────────────────────────────────────────────────

    actual suspend fun createOrder(
        authorizationId: String,
        productId: String,
        quantity: Int,
        totalAmount: Double,
        shippingAddress: String?,
        deviceSource: String,
        paymentMethod: String,
        userConfirmedToken: String?,
    ) {
        SpressoConnectorConnector.instance.createOrder.execute(
            authorizationId = authorizationId,
            productId = productId,
            quantity = quantity,
            totalAmount = totalAmount,
            deviceSource = deviceSource,
            paymentMethod = paymentMethod,
        ) {
            this.shippingAddress = shippingAddress
            this.userConfirmedToken = userConfirmedToken
        }
    }

    // ── Travel ───────────────────────────────────────────────────────────────

    actual suspend fun createVoiceNote(
        tripId: String,
        transcript: String,
    ) {
        val tripUuid = UUID.fromString(tripId)
        SpressoConnectorConnector.instance.createVoiceNote.execute(
            tripId = tripUuid,
            transcript = transcript,
        )
    }

    actual suspend fun createTravelExpense(
        tripId: String,
        amount: Double,
        currency: String?,
        category: String,
        merchant: String,
        items: String?,
    ) {
        val tripUuid = UUID.fromString(tripId)
        SpressoConnectorConnector.instance.createTravelExpense.execute(
            tripId = tripUuid,
            amount = amount,
            category = category,
            merchant = merchant,
        ) {
            this.currency = currency
            this.items = items
        }
    }

    // ── Vision ───────────────────────────────────────────────────────────────

    actual suspend fun logVisionEvent(
        detectedObjects: String,
        context: String?,
        imageUrl: String?,
    ) {
        SpressoConnectorConnector.instance.logVisionEvent.execute(
            detectedObjects = detectedObjects,
        ) {
            this.context = context
            this.imageUrl = imageUrl
        }
    }

    // ── Wardrobe ─────────────────────────────────────────────────────────────

    actual suspend fun getWardrobeOutfits(): List<WardrobeOutfitData> =
        try {
            val result = SpressoConnectorConnector.instance.getWardrobeOutfits.execute()
            result.data.wardrobeOutfits.map { outfit ->
                WardrobeOutfitData(
                    id = outfit.id.toString(),
                    title = outfit.title,
                    description = outfit.description,
                    imageUrl = outfit.imageUrl,
                    items =
                        outfit.items.map { item ->
                            WardrobeItemData(
                                id = item.id.toString(),
                                category = item.category,
                                brand = item.brand,
                                imageUrl = item.imageUrl,
                                color = item.color,
                            )
                        },
                )
            }
        } catch (e: Exception) {
            Telemetry.recordError("getWardrobeOutfits failed", e)
            throw e
        }

    actual suspend fun getWardrobeItems(): List<WardrobeItemData> =
        try {
            val result = SpressoConnectorConnector.instance.getWardrobeItems.execute()
            result.data.wardrobeItems.map { item ->
                WardrobeItemData(
                    id = item.id.toString(),
                    category = item.category,
                    brand = item.brand,
                    imageUrl = item.imageUrl,
                    color = item.color,
                )
            }
        } catch (e: Exception) {
            Telemetry.recordError("getWardrobeItems failed", e)
            throw e
        }

    actual suspend fun uploadImage(
        bytes: ByteArray,
        path: String,
    ): String =
        try {
            val storageRef = FirebaseStorage.getInstance().reference.child(path)
            storageRef.putBytes(bytes).await()
            storageRef.downloadUrl.await().toString()
        } catch (e: Exception) {
            Telemetry.recordError("uploadImage failed", e)
            throw e
        }

    actual suspend fun addWardrobeItem(
        outfitId: String?,
        category: String,
        brand: String?,
        imageUrl: String,
        color: String?,
    ) {
        val outfitUuid = outfitId?.let { UUID.fromString(it) }
        SpressoConnectorConnector.instance.addWardrobeItem.execute(
            category = category,
            imageUrl = imageUrl,
        ) {
            this.outfitId = outfitUuid
            this.brand = brand
            this.color = color
        }
    }

    // ── Creator ──────────────────────────────────────────────────────────────

    actual suspend fun getCreatorAgents(): List<CreatorAgentData> =
        try {
            val result = SpressoConnectorConnector.instance.getCreatorAgents.execute()
            result.data.creatorAgents.map { agent ->
                CreatorAgentData(
                    id = agent.id.toString(),
                    title = agent.title,
                    badge = agent.badge,
                    subtitle = agent.subtitle,
                    iconName = agent.iconName,
                    capabilities = agent.capabilities,
                    quickPrompts =
                        agent.quickPrompts.map { qp ->
                            QuickPromptData(
                                id = qp.id.toString(),
                                label = qp.label,
                                prompt = qp.prompt,
                            )
                        },
                )
            }
        } catch (e: Exception) {
            Telemetry.recordError("getCreatorAgents failed", e)
            throw e
        }

    actual suspend fun getCreativeTemplates(): List<CreativeTemplateData> =
        try {
            val result = SpressoConnectorConnector.instance.getCreativeTemplates.execute()
            result.data.creativeTemplates.map { template ->
                CreativeTemplateData(
                    id = template.id.toString(),
                    name = template.name,
                    creator = template.creator,
                    category = template.category,
                    description = template.description,
                    iconName = template.iconName,
                    promptExample = template.promptExample,
                )
            }
        } catch (e: Exception) {
            Telemetry.recordError("getCreativeTemplates failed", e)
            throw e
        }
}
