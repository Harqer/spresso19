package network

/**
 * Platform-agnostic configuration holder.
 */
expect object SpressoConfig {
    val backendBaseUrl: String
    val googlePayMerchantId: String
    val stripePublishableKey: String

    /** Convex HTTP bridge origin (`*.convex.site`) used by the KMP clients. */
    val convexSiteUrl: String
}
