package viewmodels

import components.features.catalog.screens.toHITLPayload
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import network.ApiClient
import network.ProductItem
import network.models.HITLPayload

class CatalogViewModel(
    private val apiClient: ApiClient,
    private val scope: CoroutineScope,
) {
    private val _activeDetailProduct = MutableStateFlow<ProductItem?>(null)
    val activeDetailProduct: StateFlow<ProductItem?> = _activeDetailProduct.asStateFlow()

    private val _hitlCheckoutPayload = MutableStateFlow<HITLPayload?>(null)
    val hitlCheckoutPayload: StateFlow<HITLPayload?> = _hitlCheckoutPayload.asStateFlow()

    private val _checkoutStatus = MutableStateFlow<String?>(null)
    val checkoutStatus: StateFlow<String?> = _checkoutStatus.asStateFlow()

    fun clearCheckoutStatus() {
        _checkoutStatus.value = null
    }

    fun setActiveDetailProduct(product: ProductItem?) {
        _activeDetailProduct.value = product
    }

    fun initiateCheckout(product: ProductItem) {
        scope.launch {
            try {
                val (confirmed, stock) = apiClient.checkInventory(product.id)
                _hitlCheckoutPayload.value =
                    product.toHITLPayload(
                        inventoryConfirmed = confirmed,
                        stockRemaining = stock,
                    )
            } catch (e: Exception) {
                _checkoutStatus.value = "Failed to initiate checkout: ${e.message}"
            }
        }
    }

    fun confirmCheckout(address: String?) {
        val payload = _hitlCheckoutPayload.value ?: return
        scope.launch {
            try {
                val msg =
                    apiClient
                        .confirmCheckoutWithToken(
                            payload.product.id,
                            payload.quantity,
                            payload.authorizationId,
                            address ?: "Default Shipping Address",
                        ).message ?: "Order confirmed!"
                _checkoutStatus.value = msg
            } catch (e: Exception) {
                _checkoutStatus.value = "Checkout note: ${e.message}"
            } finally {
                _hitlCheckoutPayload.value = null
            }
        }
    }

    fun dismissCheckout() {
        _hitlCheckoutPayload.value = null
    }

    fun setCheckoutStatus(status: String) {
        _checkoutStatus.value = status
    }
}
