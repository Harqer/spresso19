package network

/**
 * Toggles the like status for a product. Data Connect is not supported on JS/WASM platforms.
 */
actual suspend fun toggleLike(productId: String, userUid: String) {
    // Firebase Data Connect is not supported on the wasmJs target; this is a no-op stub.
}
