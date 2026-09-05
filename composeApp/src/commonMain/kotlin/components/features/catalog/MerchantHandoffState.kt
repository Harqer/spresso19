package components.features.catalog

data class MerchantHandoffState(
    val listing: DiscoveredListing,
    val biometricApproved: Boolean = false,
    val purchaseConfirmed: Boolean = false,
) {
    val verifiedMerchantUrl: String?
        get() = listing.merchantUrl.takeIf { it.startsWith("https://") }

    val canOpenMerchant: Boolean
        get() = verifiedMerchantUrl != null && !purchaseConfirmed

    fun afterBiometricApproval(): MerchantHandoffState = copy(biometricApproved = true)
}
