package network.models

import kotlinx.serialization.Serializable
import network.DetectedItem
import network.ProductItem

@Serializable
data class OrderItem(
    val product: ProductItem,
    val quantity: Int,
)

@Serializable
data class OrderRecord(
    val id: String,
    val items: List<OrderItem>,
    val totalAmount: Double,
    val status: String = "",
    val deviceSource: String = "",
    val humanConfirmedAt: String = "",
    val mcpTransactionHash: String = "",
    val shippingAddress: String = "",
    val trackingStatus: String? = null,
    val carrier: String? = null,
    val trackingNumber: String? = null,
    val estimatedDelivery: String? = null,
    val returnStatus: String? = null,
    val returnReason: String? = null,
    val reminderSet: Boolean = false,
    val reminderTime: String? = null,
    val paymentMethod: String? = null,
    val userUid: String? = null,
)

@Serializable
data class HITLProduct(
    val id: String,
    val name: String,
    val price: Double,
    val sku: String,
    val image: String,
)

@Serializable
data class HITLChallenge(
    val title: String = "Review merchant listing",
    val message: String = "Review price, availability, and delivery details with the merchant.",
    val safetyChecks: List<String> = emptyList(),
)

@Serializable
data class HITLPayload(
    val authorizationId: String,
    val product: HITLProduct,
    val quantity: Int,
    val totalAmount: Double,
    val currency: String = "USD",
    val deviceSource: String = "WEB",
    val humanInTheLoopChallenge: HITLChallenge? = null,
)

fun DetectedItem.toHITLPayload(
    authorizationId: String = "AUTH-LENS-${this.hashCode()}",
): HITLPayload {
    val safePrice = priceEstimate ?: 0.0
    return HITLPayload(
        authorizationId = authorizationId,
        product =
            HITLProduct(
                id = matchingCatalogId ?: "lens_${this.hashCode()}",
                name = detectedName,
                price = safePrice,
                sku = "SKU-LENS-${this.hashCode()}",
                image = "",
            ),
        quantity = 1,
        totalAmount = safePrice,
        currency = "USD",
        deviceSource = "WEARABLE_CAMERA",
        humanInTheLoopChallenge =
            HITLChallenge(
                title = "Approve Lens Purchase",
                message = "You are purchasing an item detected by Spresso Lens. Verify details before confirming.",
            ),
    )
}
