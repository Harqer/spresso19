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
    val status: String = "DELIVERED",
    val deviceSource: String = "WEB",
    val humanConfirmedAt: String = "",
    val mcpTransactionHash: String = "",
    val shippingAddress: String = "",
    val trackingStatus: String? = "In Transit - Out for Delivery",
    val carrier: String? = "FedEx",
    val trackingNumber: String? = "FX-8492019",
    val estimatedDelivery: String? = "Today, 5:00 PM",
    val returnStatus: String? = "NONE",
    val returnReason: String? = null,
    val reminderSet: Boolean = false,
    val reminderTime: String? = null,
    val paymentMethod: String? = "Google Pay",
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
    val title: String = "Biometric Verification Required",
    val message: String = "Confirm purchase with fingerprint or passkey",
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
    val inventoryConfirmed: Boolean = true,
    val stockRemaining: Int = 10,
    val humanInTheLoopChallenge: HITLChallenge? = null,
)

fun DetectedItem.toHITLPayload(
    authorizationId: String = "AUTH-LENS-${this.hashCode()}",
    inventoryConfirmed: Boolean = true,
    stockRemaining: Int = 10,
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
        inventoryConfirmed = inventoryConfirmed,
        stockRemaining = stockRemaining,
        humanInTheLoopChallenge =
            HITLChallenge(
                title = "Approve Lens Purchase",
                message = "You are purchasing an item detected by Spresso Lens. Verify details before confirming.",
            ),
    )
}
