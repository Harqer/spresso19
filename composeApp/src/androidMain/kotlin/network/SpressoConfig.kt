package network

actual object SpressoConfig {
    actual val backendBaseUrl: String = "https://get-spresso.web.app"
    actual val googlePayMerchantId: String = "BCR2DN6DTK6ZNGLF"
    actual val stripePublishableKey: String
        get() = AndroidRuntimeConfig.stripePublishableKey
    actual val convexSiteUrl: String = "https://woozy-anteater-572.convex.site"
    /** WebSocket deployment URL for the official Convex Android client. */
    const val convexDeploymentUrl: String = "https://decisive-dolphin-161.convex.cloud"
}
