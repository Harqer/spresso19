package components.features.catalog

data class MerchantHandoffState(
    val listing: DiscoveredListing,
    val biometricApproved: Boolean = false,
    val purchaseConfirmed: Boolean = false,
) {
    fun afterBiometricApproval(): MerchantHandoffState = copy(biometricApproved = true)
}
