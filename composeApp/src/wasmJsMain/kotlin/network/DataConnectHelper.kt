package network

import kotlinx.coroutines.await
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlinx.serialization.json.doubleOrNull

import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put
import kotlin.random.Random

actual suspend fun upsertUserPreference(theme: String?, pushNotifications: Boolean?, emailAlerts: Boolean?) {
    val payload = buildJsonObject {
        put("theme", theme)
        put("pushNotifications", pushNotifications)
        put("emailAlerts", emailAlerts)
    }
    SpressoDataConnect.upsertUserPreference(parseJsonToJsAny(payload.toString())).await<JsAny?>()
}

actual suspend fun upsertUserProfile(email: String?, displayName: String?, avatarUrl: String?) {
    val payload = buildJsonObject {
        put("email", email)
        put("displayName", displayName)
        put("avatarUrl", avatarUrl)
    }
    SpressoDataConnect.upsertUserProfile(parseJsonToJsAny(payload.toString())).await<JsAny?>()
}

actual suspend fun addGroceryItem(listId: String, productName: String, productId: String?, addedVia: String) {
    val payload = buildJsonObject {
        put("listId", listId)
        put("productName", productName)
        put("productId", productId)
        put("addedVia", addedVia)
    }
    SpressoDataConnect.addGroceryItem(parseJsonToJsAny(payload.toString())).await<JsAny?>()
}

actual suspend fun toggleGroceryItem(id: String, isPurchased: Boolean) {
    val payload = buildJsonObject {
        put("itemId", id)
        put("isPurchased", isPurchased)
    }
    SpressoDataConnect.toggleGroceryItem(parseJsonToJsAny(payload.toString())).await<JsAny?>()
}

actual suspend fun deleteGroceryItem(id: String) {
    val payload = buildJsonObject { put("itemId", id) }
    SpressoDataConnect.deleteGroceryItem(parseJsonToJsAny(payload.toString())).await<JsAny?>()
}

actual suspend fun createPaymentMethod(stripePaymentMethodId: String) {
    val payload = buildJsonObject { put("stripePaymentMethodId", stripePaymentMethodId) }
    SpressoDataConnect.createPaymentMethod(parseJsonToJsAny(payload.toString())).await<JsAny?>()
}

actual suspend fun deletePaymentMethod(id: String) {
    val payload = buildJsonObject { put("id", id) }
    SpressoDataConnect.deletePaymentMethod(parseJsonToJsAny(payload.toString())).await<JsAny?>()
}

actual suspend fun updateUserSubscription(id: String, tier: String) {
    val payload = buildJsonObject {
        put("id", id)
        put("tier", tier)
    }
    SpressoDataConnect.updateUserSubscription(parseJsonToJsAny(payload.toString())).await<JsAny?>()
}

actual suspend fun createOrder(
    authorizationId: String,
    productId: String,
    quantity: Int,
    totalAmount: Float,
    shippingAddress: String?,
    deviceSource: String,
    paymentMethod: String,
    userConfirmedToken: String?
) {
    val payload = buildJsonObject {
        put("authorizationId", authorizationId)
        put("productId", productId)
        put("quantity", quantity)
        put("totalAmount", totalAmount)
        put("shippingAddress", shippingAddress)
        put("deviceSource", deviceSource)
        put("paymentMethod", paymentMethod)
        put("userConfirmedToken", userConfirmedToken)
    }
    SpressoDataConnect.createOrder(parseJsonToJsAny(payload.toString())).await<JsAny?>()
}

actual suspend fun connectCoinbaseWallet(address: String) {
    val payload = buildJsonObject { put("walletAddress", address) }
    SpressoDataConnect.connectCoinbaseWallet(parseJsonToJsAny(payload.toString())).await<JsAny?>()
}

actual suspend fun registerPasskey(credentialId: String, publicKey: String) {
    val payload = buildJsonObject {
        put("credentialId", credentialId)
        put("publicKey", publicKey)
    }
    SpressoDataConnect.registerPasskey(parseJsonToJsAny(payload.toString())).await<JsAny?>()
}

