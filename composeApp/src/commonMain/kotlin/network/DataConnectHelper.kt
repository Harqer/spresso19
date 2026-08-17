package network

/**
 * Toggles the like status for a product in Firebase Data Connect.
 *
 * @param productId The product's UUID string.
 * @param userUid The authenticated Firebase user UID. Must be a real UID — anonymous fallbacks are not permitted.
 */
expect suspend fun toggleLike(productId: String, userUid: String)

expect suspend fun getInventoryFromDataConnect(): List<ProductItem>
