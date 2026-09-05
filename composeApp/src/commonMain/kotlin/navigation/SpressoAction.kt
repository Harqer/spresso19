package navigation

sealed interface SpressoAction {
    data class OpenProduct(val productId: String) : SpressoAction

    data class SaveListing(val listingId: String) : SpressoAction

    data class AddToCart(
        val listingId: String,
        val quantity: Int = 1,
    ) : SpressoAction

    data class OpenWardrobeItem(val itemId: String) : SpressoAction

    data object OpenSavedListings : SpressoAction

    data class AnalyzeCameraResult(val resultId: String) : SpressoAction

    data object OpenOrders : SpressoAction

    data class OpenCheckout(val cartId: String) : SpressoAction

    data object OpenPaymentWallet : SpressoAction

    data object OpenWearables : SpressoAction
}
