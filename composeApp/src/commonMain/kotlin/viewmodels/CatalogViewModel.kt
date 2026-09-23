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
import network.getCheckoutDevicePublicKey
import network.parseBiometricAssertion
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
        /**
         * True when the attempt is still chargeable (e.g. the user declined
         * the biometric prompt before anything reached the backend). A charge
         * the backend rejected kills the attempt server-side, so retrying is
         * impossible and the UI must not offer it.
         */
        val retryable: Boolean,
    ) : CheckoutPhase
}

class CatalogViewModel(
    private val scope: CoroutineScope,
    private val convexApi: ConvexApi,
) {
    /**
     * Authorization failures the user can recover from by trying again without
     * a fresh quote (e.g. a transient verify hiccup). Everything else —
     * consumed/expired challenge, revoked key — needs a re-prepare.
     */
    private val authorizationRetryableMarkers = listOf("expired", "re-verify")

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
                // Pre-charge failure: the attempt is not killed, retrying starts fresh.
                _checkoutPhase.value = CheckoutPhase.Failed(message, retryable = true)
                // Surfaces inline failures on screens that only observe checkoutStatus.
                _checkoutStatus.value = message
            }
        }
    }

    /**
     * Confirms the draft. The device biometric unlocks a Keystore/WebCrypto
     * signing key that signs the server-issued exact-intent message; the
     * signature is submitted to Convex, which verifies it server-side against
     * the registered device key and consumes the single-use challenge. Only
     * then is the off-session charge attempted. Client biometric success alone
     * authorizes nothing — the server gate is authoritative.
     */
    fun confirmCheckout() {
        val draft = _checkoutDraft.value ?: return
        if (draft.quote.message.isBlank()) {
            _checkoutPhase.value =
                CheckoutPhase.Failed("Checkout is missing its authorization challenge. Refresh and try again.", retryable = true)
            return
        }
        // Reserve the flow synchronously: a double tap must not start a second
        // biometric prompt or fire a second charge request.
        when (val current = _checkoutPhase.value) {
            is CheckoutPhase.AwaitingConfirmation -> Unit
            is CheckoutPhase.Failed -> if (!current.retryable) return
            else -> return
        }
        _checkoutPhase.value = CheckoutPhase.ConfirmingBiometric
        scope.launch {
            // The platform signs the exact-intent message bytes — never a
            // pre-computed digest — so the server's crypto.verify over the
            // stored message applies a single, matching SHA-256.
            val assertion =
                promptBiometricAuth(
                    reason = "Confirm ${draft.quote.amountCents / 100.0} ${draft.quote.currency} for ${draft.product.name}?",
                    payload = draft.quote.message,
                )
            if (assertion == null) {
                // Nothing reached the backend; the attempt is still valid.
                _checkoutPhase.value = CheckoutPhase.Failed("Purchase was not confirmed on this device.", retryable = true)
                return@launch
            }
            val parsed = parseBiometricAssertion(assertion)
            if (parsed == null) {
                _checkoutPhase.value = CheckoutPhase.Failed("Device confirmation could not be read. Try again.", retryable = true)
                return@launch
            }
            try {
                // Server-verifiable authorization: Convex verifies the device
                // signature over the exact intent before any charge.
                convexApi.authorizeCheckout(draft.attemptId, parsed.signature, parsed.publicKey)
            } catch (e: Exception) {
                // Authorization failures (unregistered/revoked key, expired or
                // consumed challenge, bad signature) keep the attempt alive for
                // a re-quote only when the server says the challenge is gone.
                val message = e.message ?: "Purchase could not be authorized."
                _checkoutPhase.value =
                    CheckoutPhase.Failed(message, retryable = authorizationRetryableMarkers.any { message.contains(it, ignoreCase = true) })
                return@launch
            }
            _checkoutPhase.value = CheckoutPhase.Charging
            try {
                val confirmation = convexApi.confirmCheckout(draft.attemptId)
                _checkoutPhase.value = CheckoutPhase.Succeeded(confirmation)
                _checkoutDraft.value = null
            } catch (e: Exception) {
                // The backend strips the verified quote on any charge failure,
                // so this attempt is dead: do not leave a confirmable draft.
                _checkoutPhase.value = CheckoutPhase.Failed(e.message ?: "Payment failed. Please try again.", retryable = false)
            }
        }
    }

    /** Registers this device's checkout signing key. Returns null when the platform has no enrollment surface. */
    suspend fun registerCheckoutDevice(): String? {
        val publicKey = getCheckoutDevicePublicKey() ?: return null
        return convexApi.registerCheckoutDevice(publicKey, "Spresso checkout key")
    }

    fun dismissCheckout() {
        _checkoutDraft.value = null
        _checkoutPhase.value = CheckoutPhase.AwaitingConfirmation
    }

    fun setCheckoutStatus(status: String) {
        _checkoutStatus.value = status
    }
}
