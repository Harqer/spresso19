package navigation

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith

class ActionDestinationTest {
    @Test
    fun productActionsRemainInProductDetail() {
        assertEquals(
            NavKey.ProductDetailKey("product-1"),
            ActionDestination.resolve(SpressoAction.OpenProduct("product-1")),
        )
        assertEquals(
            NavKey.ProductDetailKey("listing-1"),
            ActionDestination.resolve(SpressoAction.AddToCart("listing-1")),
        )
    }

    @Test
    fun savedListingRoutesToWardrobeSavedCollection() {
        assertEquals(
            NavKey.WardrobeMainKey,
            ActionDestination.resolve(SpressoAction.SaveListing("listing-1")),
        )
    }

    @Test
    fun ownedWardrobeItemRoutesToWardrobe() {
        assertEquals(
            NavKey.WardrobeKey(),
            ActionDestination.resolve(SpressoAction.OpenWardrobeItem("item-1")),
        )
    }

    @Test
    fun openSavedListingsRoutesToWardrobeCollections() {
        assertEquals(
            NavKey.WardrobeMainKey,
            ActionDestination.resolve(SpressoAction.OpenSavedListings),
        )
    }

    @Test
    fun purchaseAndAccountActionsOwnTheirDestinations() {
        assertEquals(
            NavKey.HITLCheckoutKey,
            ActionDestination.resolve(SpressoAction.OpenCheckout("cart-1")),
        )
        assertEquals(
            NavKey.OrdersKey,
            ActionDestination.resolve(SpressoAction.OpenOrders),
        )
        assertEquals(
            NavKey.PaymentWalletKey,
            ActionDestination.resolve(SpressoAction.OpenPaymentWallet),
        )
    }

    @Test
    fun cameraAndWearableActionsOwnTheirSurfaces() {
        assertEquals(
            NavKey.CatalogKey,
            ActionDestination.resolve(SpressoAction.AnalyzeCameraResult("result-1")),
        )
        assertEquals(
            NavKey.MetaWearablesKey,
            ActionDestination.resolve(SpressoAction.OpenWearables),
        )
    }

    @Test
    fun identifierBearingActionsRejectBlankIdentifiers() {
        assertFailsWith<IllegalArgumentException> {
            ActionDestination.resolve(SpressoAction.OpenProduct("  "))
        }
    }
}
