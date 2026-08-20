package components.features.catalog.screens

import network.ProductItem
import network.models.HITLChallenge
import network.models.HITLPayload
import network.models.HITLProduct

fun ProductItem.toHITLPayload(
    quantity: Int = 1,
    authorizationId: String = "AUTH-${id.uppercase()}",
    inventoryConfirmed: Boolean = true,
    stockRemaining: Int = 10
): HITLPayload {
    val safePrice = price ?: 0.0
    return HITLPayload(
        authorizationId = authorizationId,
        product = HITLProduct(id = id, name = name, price = safePrice, sku = "SKU-${id.uppercase()}", image = imageUrl),
        quantity = quantity,
        totalAmount = safePrice * quantity,
        currency = "USD",
        deviceSource = "WEARABLE",
        inventoryConfirmed = inventoryConfirmed,
        stockRemaining = stockRemaining,
        humanInTheLoopChallenge = HITLChallenge(title = "Biometric Verification Required", message = "Confirm purchase with fingerprint or passkey")
    )
}
