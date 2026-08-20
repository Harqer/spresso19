package network

actual object SpressoConfig {
    actual val backendBaseUrl: String
        get() = "https://spresso-5561f.web.app"
    actual val cloudFunctionsBaseUrl: String
        get() = "https://us-central1-spresso-5561f.cloudfunctions.net"
    actual val googlePayMerchantId: String
        get() = "BCR2DN6DTK6ZNGLF"
    actual val stripePublishableKey: String
        get() = "pk_live_51xyz"
}
