package network

/**
 * Toggles the like status for a product in Firebase Data Connect.
 *
 * @param productId The product's UUID string.
 * @param userUid The authenticated Firebase user UID. Must be a real UID — anonymous fallbacks are not permitted.
 */
expect suspend fun toggleLike(productId: String, userUid: String)



expect suspend fun upsertUserPreference(theme: String?, pushNotifications: Boolean?, emailAlerts: Boolean?)

expect suspend fun upsertUserProfile(email: String?, displayName: String?, avatarUrl: String?)

expect suspend fun addGroceryItem(listId: String, productName: String, productId: String?, addedVia: String)
expect suspend fun toggleGroceryItem(id: String, isPurchased: Boolean)
expect suspend fun deleteGroceryItem(id: String)
expect suspend fun createPaymentMethod(stripePaymentMethodId: String)
expect suspend fun updateUserSubscription(id: String, tier: String)
expect suspend fun createOrder(authorizationId: String, productId: String, quantity: Int, totalAmount: Float, shippingAddress: String?, deviceSource: String, paymentMethod: String, userConfirmedToken: String?)

expect suspend fun connectCoinbaseWallet(address: String)
expect suspend fun registerPasskey(credentialId: String, publicKey: String)
