package network

/**
 * Platform-agnostic configuration holder.
 */
expect object SpressoConfig {
    val backendBaseUrl: String
    val cloudFunctionsBaseUrl: String
    val backendWebSocketUrl: String
    val googlePayMerchantId: String
}
