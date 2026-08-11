package network

/**
 * Platform-agnostic configuration holder.
 */
expect object SpressoConfig {
    val backendWebSocketUrl: String
    val googlePayMerchantId: String
}
