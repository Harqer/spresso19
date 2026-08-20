package network

/**
 * Platform-agnostic configuration holder.
 */
expect object SpressoConfig {
    val backendBaseUrl: String
    val cloudFunctionsBaseUrl: String
    val googlePayMerchantId: String
    val stripePublishableKey: String
}
