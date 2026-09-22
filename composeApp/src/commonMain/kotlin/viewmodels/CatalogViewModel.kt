package viewmodels

import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import network.CheckoutConfirmation
import network.CheckoutQuote
import network.ConvexApi
import network.ProductItem
import network.promptBiometricAuth

/** A checkout that the backend has accepted and quoted; pending user confirmation. */
data class CheckoutDraft(
    val attemptId: String,
    val product: ProductItem,
    val quantity: Int,
    val quote: CheckoutQuote,
)

/** User-visible phases of the checkout lifecycle. */
sealed interface CheckoutPhase {
    data object AwaitingConfirmation : CheckoutPhase

    data object ConfirmingBiometric : CheckoutPhase

    data object Charging : CheckoutPhase

    data class Succeeded(
        val confirmation: CheckoutConfirmation,
    ) : CheckoutPhase

    data class Failed(
        val message: String,
    ) : CheckoutPhase
}

class CatalogViewModel(
    private val scope: CoroutineScope,
    private val convexApi: ConvexApi,
) {
    private val _activeDetailProduct = MutableStateFlow<ProductItem?>(null)
    val activeDetailProduct: StateFlow<ProductItem?> = _activeDetailProduct.asStateFlow()

    private val _checkoutDraft = MutableStateFlow<CheckoutDraft?>(null)
    val checkoutDraft: StateFlow<CheckoutDraft?> = _checkoutDraft.asStateFlow()

    private val _checkoutPhase = MutableStateFlow<CheckoutPhase>(CheckoutPhase.AwaitingConfirmation)
    val checkoutPhase: StateFlow<CheckoutPhase> = _checkoutPhase.asStateFlow()

    private val _checkoutStatus = MutableStateFlow<String?>(null)
    val checkoutStatus: StateFlow<String?> = _checkoutStatus.asStateFlow()

    fun clearCheckoutStatus() {
        _checkoutStatus.value = null
    }

    fun setActiveDetailProduct(product: ProductItem?) {
        _activeDetailProduct.value = product
    }

    /**
     * Starts a real checkout: acquires an idempotent server-side attempt and
     * obtains the merchant's live, server-verified price. No amount is ever
     * taken from the client — the quote comes back from the backend provider.
     */
    fun initiateCheckout(
        product: ProductItem,
        quantity: Int = 1,
    ) {
        scope.launch {
            _checkoutPhase.value = CheckoutPhase.AwaitingConfirmation
            _checkoutDraft.value = null
            try {
                val idempotencyKey = "${product.id}-${kotlin.time.Clock.System.now().toEpochMilliseconds()}"
                val attemptId = convexApi.acquireCheckoutAttempt(product, quantity, idempotencyKey)
                val quote = convexApi.prepareCheckout(attemptId)
                _checkoutDraft.value = CheckoutDraft(attemptId, product, quantity, quote)
            } catch (e: Exception) {
                val message = e.message ?: "Unable to start checkout. Please try again."
                _checkoutPhase.value = CheckoutPhase.Failed(message)
                // Surfaces inline failures on screens that only observe checkoutStatus.
                _checkoutStatus.value = message
            }
        }
    }

    /**
     * Confirms the draft: a strong local biometric step-up gates the request
     * (the signature never leaves the device), then the backend charges the
     * user's saved default card off-session for the quoted amount.
     */
    fun confirmCheckout() {
        val draft = _checkoutDraft.value ?: return
        when (_checkoutPhase.value) {
            is CheckoutPhase.ConfirmingBiometric, is CheckoutPhase.Charging -> return
            else -> Unit
        }
        scope.launch {
            val approved =
                promptBiometricAuth(
                    reason = "Confirm ${draft.quote.amountCents / 100.0} ${draft.quote.currency} for ${draft.product.name}?",
                    payload = draft.attemptId,
                )
            if (approved == null) {
                _checkoutPhase.value = CheckoutPhase.Failed("Purchase was not confirmed on this device.")
                return@launch
            }
            _checkoutPhase.value = CheckoutPhase.Charging
            try {
                val confirmation = convexApi.confirmCheckout(draft.attemptId)
                _checkoutPhase.value = CheckoutPhase.Succeeded(confirmation)
                _checkoutDraft.value = null
            } catch (e: Exception) {
                _checkoutPhase.value = CheckoutPhase.Failed(e.message ?: "Payment failed. Please try again.")
            }
        }
    }

    fun dismissCheckout() {
        _checkoutDraft.value = null
        _checkoutPhase.value = CheckoutPhase.AwaitingConfirmation
    }

    fun setCheckoutStatus(status: String) {
        _checkoutStatus.value = status
    }
}
