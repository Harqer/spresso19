package network.models

import kotlinx.serialization.Serializable

@Serializable
enum class SubscriptionTier(val displayName: String, val badgeColorHex: Long) {
    FREE("Free Explorer", 0xFF6B7280),
    SPRESSO_VIP("Spresso VIP", 0xFF059669),
    CHEF_PRO("Bargain Chef Pro", 0xFF7C3AED)
}

@Serializable
data class PaymentCardInfo(
    val id: String,
    val brand: String,
    val last4: String,
    val expiryMonth: Int,
    val expiryYear: Int,
    val isDefault: Boolean = false
)

@Serializable
data class UserProfileData(
    val uid: String,
    val name: String,
    val email: String,
    val avatarUrl: String? = null,
    val tier: SubscriptionTier = SubscriptionTier.FREE,
    val renewalDate: String? = null,
    val savedCards: List<PaymentCardInfo> = emptyList(),
    val notificationsEnabled: Boolean = true,
    val emailAlertsEnabled: Boolean = true,
    val biometricEnabled: Boolean = false,
    val themePreference: String = "system",
    val explicitInterests: List<String> = emptyList(),
    val inferredPainPoints: List<String> = emptyList(),
    val behavioralProfileSummary: String? = null,
    val web3WalletAddress: String? = null
)

object GooglePayConfig {
    fun createAllowedPaymentMethodsJson(publishableKey: String): String {
        return """
            [
              {
                "type": "CARD",
                "parameters": {
                  "allowedAuthMethods": ["PAN_ONLY", "CRYPTOGRAM_3DS"],
                  "allowedCardNetworks": ["AMEX", "DISCOVER", "JCB", "MASTERCARD", "VISA"]
                },
                "tokenizationSpecification": {
                  "type": "PAYMENT_GATEWAY",
                  "parameters": {
                    "gateway": "stripe",
                    "stripe:version": "2020-08-27",
                    "stripe:publishableKey": "$publishableKey"
                  }
                }
              }
            ]
        """.trimIndent()
    }
}
