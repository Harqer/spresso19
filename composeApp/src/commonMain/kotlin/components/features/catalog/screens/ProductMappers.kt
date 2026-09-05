package components.features.catalog.screens

import network.ProductItem
import network.models.HITLChallenge
import network.models.HITLPayload
import network.models.HITLProduct

fun ProductItem.toHITLPayload(
    quantity: Int = 1,
    authorizationId: String,
): HITLPayload {
    val safePrice = price ?: 0.0
    return HITLPayload(
        authorizationId = authorizationId,
        product = HITLProduct(id = id, name = name, price = safePrice, sku = "", image = imageUrl, merchantUrl = merchantUrl),
        quantity = quantity,
        totalAmount = safePrice * quantity,
        currency = "USD",
        deviceSource = "ANDROID_APP",
        availabilityStatus = "VERIFY_AT_MERCHANT_CHECKOUT",
        humanInTheLoopChallenge =
            HITLChallenge(
                title = "Confirm purchase",
                message = "Review this order, choose payment, and confirm with your device.",
            ),
    )
}
