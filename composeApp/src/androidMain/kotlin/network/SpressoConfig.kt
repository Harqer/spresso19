package network

actual object SpressoConfig {
    actual val backendBaseUrl: String = "https://get-spresso.web.app"
    actual val cloudFunctionsBaseUrl: String = "https://us-central1-get-spresso.cloudfunctions.net"
    actual val googlePayMerchantId: String = "BCR2DN6DTK6ZNGLF"
    actual val stripePublishableKey: String = com.spresso19.BuildConfig.STRIPE_PUBLISHABLE_KEY
}
