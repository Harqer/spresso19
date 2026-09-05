package navigation

object ActionDestination {
    fun resolve(action: SpressoAction): NavKey {
        return when (action) {
            is SpressoAction.OpenProduct -> NavKey.ProductDetailKey(action.productId.requireIdentifier("productId"))
            is SpressoAction.SaveListing -> NavKey.WardrobeMainKey
            is SpressoAction.AddToCart -> NavKey.ProductDetailKey(action.listingId.requireIdentifier("listingId"))
            is SpressoAction.OpenWardrobeItem -> NavKey.WardrobeKey()
            SpressoAction.OpenSavedListings -> NavKey.WardrobeMainKey
            is SpressoAction.AnalyzeCameraResult -> NavKey.CatalogKey
            SpressoAction.OpenOrders -> NavKey.OrdersKey
            is SpressoAction.OpenCheckout -> NavKey.HITLCheckoutKey
            SpressoAction.OpenPaymentWallet -> NavKey.PaymentWalletKey
            SpressoAction.OpenWearables -> NavKey.MetaWearablesKey
        }
    }

    private fun String.requireIdentifier(name: String): String =
        trim().also { require(it.isNotEmpty()) { "$name must not be empty" } }
}
