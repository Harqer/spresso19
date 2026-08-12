package com.spresso19

/** A single, short-lived request created by a visible user action. */
internal data class ExplicitCaptureRequest(
    val token: String,
    val requestedAtMillis: Long
)

/**
 * Keeps the service's one-shot capture boundary explicit and testable.
 * Consent and the exact system-enabled state are checked again by the service
 * immediately before the platform screenshot call and before upload.
 */
internal class AccessibilityCaptureGate(
    private val nowMillis: () -> Long = { System.currentTimeMillis() },
    private val requestLifetimeMillis: Long = REQUEST_LIFETIME_MILLIS
) {
    private var activeToken: String? = null
    private var lastAcceptedToken: String? = null

    fun accept(
        request: ExplicitCaptureRequest,
        hasConsent: Boolean,
        serviceEnabled: Boolean
    ): Boolean {
        if (!hasConsent || !serviceEnabled || !isFresh(request) || request.token.isBlank()) {
            return false
        }
        if (activeToken != null || request.token == lastAcceptedToken) {
            return false
        }
        activeToken = request.token
        lastAcceptedToken = request.token
        return true
    }

    fun isActiveAndFresh(
        request: ExplicitCaptureRequest,
        hasConsent: Boolean,
        serviceEnabled: Boolean
    ): Boolean =
        activeToken == request.token && hasConsent && serviceEnabled && isFresh(request)

    fun complete(request: ExplicitCaptureRequest) {
        if (activeToken == request.token) {
            activeToken = null
        }
    }

    private fun isFresh(request: ExplicitCaptureRequest): Boolean {
        val age = nowMillis() - request.requestedAtMillis
        return age in 0..requestLifetimeMillis
    }

    companion object {
        const val REQUEST_LIFETIME_MILLIS = 10_000L
    }
}
