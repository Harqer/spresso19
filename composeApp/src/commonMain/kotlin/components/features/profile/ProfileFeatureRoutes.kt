package components.features.profile

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.launch
import network.ApiClient
import network.models.SubscriptionTier
import network.models.UserProfileData
import theme.ThemeMode

@Composable
private fun ProfileFeatureRoute(
    userUid: String?,
    apiClient: ApiClient,
    modifier: Modifier = Modifier,
    content: @Composable (UserProfileData, (String) -> Unit, (UserProfileData) -> Unit) -> Unit,
) {
    var profile by remember(userUid) { mutableStateOf<UserProfileData?>(null) }
    var isLoading by remember(userUid) { mutableStateOf(true) }
    var message by remember { mutableStateOf<String?>(null) }

    suspend fun refresh() {
        val uid = userUid
        if (uid == null) {
            message = "Sign in to manage this setting."
            isLoading = false
            return
        }
        try {
            profile = apiClient.fetchUserProfile(uid)
            message = null
        } catch (e: Exception) {
            message = "Unable to load your account settings. Please try again."
        } finally {
            isLoading = false
        }
    }

    LaunchedEffect(userUid) { refresh() }

    Box(
        modifier = modifier.fillMaxSize().windowInsetsPadding(WindowInsets.safeDrawing).padding(24.dp),
        contentAlignment = Alignment.TopCenter,
    ) {
        Column(
            modifier = Modifier.fillMaxWidth().widthIn(max = 840.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            when {
                isLoading -> CircularProgressIndicator()
                profile != null -> content(profile!!, { message = it }, { updated -> profile = updated })
                message != null -> Text(message!!, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.error)
            }
            if (profile != null) {
                message?.let { Text(it, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant) }
            }
        }
    }
}

@Composable
fun PaymentWalletRoute(
    userUid: String?,
    apiClient: ApiClient,
    modifier: Modifier = Modifier,
) {
    val scope = rememberCoroutineScope()
    ProfileFeatureRoute(userUid, apiClient, modifier) { profile, showMessage, updateProfile ->
        PaymentWalletSection(
            savedCards = profile.savedCards,
            web3WalletAddress = profile.web3WalletAddress,
            onAddPaymentCard = {
                showMessage("Adding a card is unavailable until secure card entry is connected.")
            },
            onRemovePaymentCard = { paymentMethodId ->
                scope.launch {
                    try {
                        if (apiClient.removePaymentMethod(paymentMethodId)) {
                            val refreshed = apiClient.fetchUserProfile(profile.uid)
                            updateProfile(refreshed)
                            showMessage("Payment card removed.")
                        } else {
                            showMessage("Unable to remove this card. Please try again.")
                        }
                    } catch (e: Exception) {
                        showMessage("Unable to remove this card. Please try again.")
                    }
                }
            },
            onGoogleWalletAction = {
                scope.launch {
                    try {
                        val jwt = apiClient.generateGoogleWalletPassJwt("loyalty")
                        showMessage(
                            if (jwt.isNotBlank()) {
                                "Your wallet pass was created, but adding it from this screen is unavailable."
                            } else {
                                "Unable to create your wallet pass right now."
                            },
                        )
                    } catch (e: Exception) {
                        showMessage("Unable to create your wallet pass right now.")
                    }
                }
            },
            onConnectCoinbaseWallet = {
                showMessage("Coinbase Wallet connection must be completed from the account profile.")
            },
        )
    }
}

@Composable
fun SubscriptionMembershipRoute(
    userUid: String?,
    apiClient: ApiClient,
    modifier: Modifier = Modifier,
) {
    val scope = rememberCoroutineScope()
    ProfileFeatureRoute(userUid, apiClient, modifier) { profile, showMessage, updateProfile ->
        SubscriptionMembershipSection(
            currentTier = profile.tier,
            renewalDate = profile.renewalDate,
            onManageSubscription = {
                val targetTier = if (profile.tier == SubscriptionTier.FREE) SubscriptionTier.SPRESSO_VIP else SubscriptionTier.FREE
                scope.launch {
                    try {
                        if (apiClient.updateUserSubscription(profile.uid, targetTier.name)) {
                            updateProfile(profile.copy(tier = targetTier))
                            showMessage("Subscription updated.")
                        } else {
                            showMessage("Unable to update your subscription. Please try again.")
                        }
                    } catch (e: Exception) {
                        showMessage("Unable to update your subscription. Please try again.")
                    }
                }
            },
        )
    }
}

@Composable
fun PreferencesRoute(
    userUid: String?,
    apiClient: ApiClient,
    themeMode: ThemeMode,
    onThemeModeChange: (ThemeMode) -> Unit,
    modifier: Modifier = Modifier,
) {
    val scope = rememberCoroutineScope()
    ProfileFeatureRoute(userUid, apiClient, modifier) { profile, showMessage, updateProfile ->
        fun save(updated: UserProfileData) {
            scope.launch {
                try {
                    if (apiClient.updateUserProfile(updated)) {
                        updateProfile(updated)
                    } else {
                        showMessage("Unable to save your preferences. Please try again.")
                    }
                } catch (e: Exception) {
                    showMessage("Unable to save your preferences. Please try again.")
                }
            }
        }

        PreferencesSection(
            isDarkTheme = themeMode == ThemeMode.DARK,
            onToggleTheme = {
                val next = if (themeMode == ThemeMode.DARK) ThemeMode.LIGHT else ThemeMode.DARK
                onThemeModeChange(next)
                save(profile.copy(themePreference = next.name.lowercase()))
            },
            notificationsEnabled = profile.notificationsEnabled,
            onToggleNotifications = { enabled -> save(profile.copy(notificationsEnabled = enabled)) },
            emailAlertsEnabled = profile.emailAlertsEnabled,
            onToggleEmailAlerts = { enabled -> save(profile.copy(emailAlertsEnabled = enabled)) },
        )
    }
}
