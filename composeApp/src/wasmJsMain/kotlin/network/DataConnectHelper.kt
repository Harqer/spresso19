package network

import kotlinx.coroutines.await
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlinx.serialization.json.doubleOrNull

/**
 * Toggles the like status for a product via JS Interop.
 */
actual suspend fun toggleLike(productId: String, userUid: String) {
    try {
        SpressoDataConnect.toggleLike(
            parseJsonToJsAny(
                "{\"productId\":\"$productId\",\"idempotencyKey\":\"wasm-${kotlin.random.Random.nextInt()}\"}"
            )
        ).await<JsAny?>()
    } catch (e: Exception) {
        throw e
    }
}


actual suspend fun upsertUserPreference(theme: String?, pushNotifications: Boolean?, emailAlerts: Boolean?) {
    // Stub for wasm JS interop
}

actual suspend fun upsertUserProfile(email: String?, displayName: String?, avatarUrl: String?) {
    // Stub for wasm JS interop
}

actual suspend fun connectCoinbaseWallet(address: String) {
    // Stub for wasm JS interop
}

actual suspend fun registerPasskey(credentialId: String, publicKey: String) {
    // Stub for wasm JS interop
}
