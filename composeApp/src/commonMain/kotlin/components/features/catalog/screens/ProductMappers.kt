package components.features.catalog.screens

import network.ProductItem
import network.models.HITLChallenge
import network.models.HITLPayload
import network.models.HITLProduct

fun ProductItem.toHITLPayload(quantity: Int = 1): HITLPayload {
    val safePrice = price ?: 0.0
    return HITLPayload(
        authorizationId = "AUTH-${id.uppercase()}",
        product = HITLProduct(id = id, name = name, price = safePrice, sku = "SKU-${id.uppercase()}", image = imageUrl),
        quantity = quantity,
        totalAmount = safePrice * quantity,
        currency = "USD",
        deviceSource = "WEARABLE",
        inventoryConfirmed = true,
        stockRemaining = 10,
        humanInTheLoopChallenge = HITLChallenge(title = "Biometric Verification Required", message = "Confirm purchase with fingerprint or passkey")
    )
}
