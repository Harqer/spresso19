package network

actual object SpressoConfig {
    actual val backendBaseUrl: String
        get() = "https://get-spresso.web.app"
    actual val cloudFunctionsBaseUrl: String
        get() = "https://us-central1-get-spresso.cloudfunctions.net"
    actual val googlePayMerchantId: String
        get() = "BCR2DN6DTK6ZNGLF"
    actual val stripePublishableKey: String
        get() = ""
}
