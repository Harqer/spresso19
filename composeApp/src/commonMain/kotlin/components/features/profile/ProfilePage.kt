package components.features.profile

import components.models.*
import components.features.profile.widgets.ProfileListItem
import components.features.profile.widgets.ThemeSelectorCard
import components.features.profile.widgets.ProfileHeader

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.safeDrawing
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.HelpOutline
import androidx.compose.material.icons.automirrored.outlined.Logout
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.setValue
import kotlinx.coroutines.launch
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import network.ApiClient
import network.models.UserProfileData
import theme.ThemeMode

@Composable
fun ProfilePage(
    userUid: String?,
    userName: String? = null,
    apiClient: ApiClient? = null,
    themeMode: ThemeMode = ThemeMode.SYSTEM,
    onThemeModeChange: ((ThemeMode) -> Unit)? = null,
    onSignOut: (() -> Unit)? = null,
    onVerifyEmail: (() -> Unit)? = null,
    onNavigateToFavorites: (() -> Unit)? = null,
    onNavigateToOrderHistory: (() -> Unit)? = null,
    onNavigateToNotifications: (() -> Unit)? = null,
    onNavigateToWearables: (() -> Unit)? = null,
    onNavigateToPrivacySecurity: (() -> Unit)? = null,
    onNavigateToSupport: (() -> Unit)? = null,
    modifier: Modifier = Modifier
) {
    val bgLight = MaterialTheme.colorScheme.background
    val scrollState = rememberScrollState()

    val isDark = when (themeMode) {
        ThemeMode.LIGHT -> false
        ThemeMode.DARK -> true
        ThemeMode.SYSTEM -> androidx.compose.foundation.isSystemInDarkTheme()
    }

    var userProfile by androidx.compose.runtime.remember { androidx.compose.runtime.mutableStateOf<UserProfileData?>(null) }
    val scope = androidx.compose.runtime.rememberCoroutineScope()
    val snackbarHostState = androidx.compose.runtime.remember { SnackbarHostState() }
    val platformContext = getPlatformContext()

    androidx.compose.runtime.LaunchedEffect(userUid) {
        if (userUid != null && apiClient != null) {
            try {
                userProfile = apiClient.fetchUserProfile(userUid)
            } catch (e: Exception) {
                snackbarHostState.showSnackbar("Failed to load profile. Please try again.")
            }
        }
    }

    Scaffold(
        modifier = modifier.fillMaxSize(),
        containerColor = if (isDark) MaterialTheme.colorScheme.surface else bgLight,
        contentWindowInsets = WindowInsets.safeDrawing,
        snackbarHost = { SnackbarHost(snackbarHostState) }
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .consumeWindowInsets(innerPadding)
                .verticalScroll(scrollState)
                .padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(24.dp)
        ) {
            if (userProfile != null) {
                UserProfileHeaderSection(
                    profile = userProfile!!,
                    onUpdateName = { newName ->
                        scope.launch {
                            try {
                                val updated = userProfile!!.copy(name = newName)
                                apiClient?.updateUserProfile(updated)
                                userProfile = updated
                            } catch (e: Exception) {
                                snackbarHostState.showSnackbar("Failed to update profile.")
                            }
                        }
                    }
                )

                SubscriptionMembershipSection(
                    currentTier = userProfile!!.tier,
                    renewalDate = userProfile!!.renewalDate,
                    onManageSubscription = {
                        scope.launch {
                            try {
                                val newTier = if (userProfile!!.tier == network.models.SubscriptionTier.FREE) network.models.SubscriptionTier.SPRESSO_VIP else network.models.SubscriptionTier.FREE
                                val newTierName = newTier.name
                                val success = userUid?.let { uid -> apiClient?.updateUserSubscription(uid, newTierName) } ?: false
                                if (success) {
                                    val updated = userProfile!!.copy(tier = newTier)
                                    userProfile = updated
                                    snackbarHostState.showSnackbar("Subscription updated successfully.")
                                } else {
                                    snackbarHostState.showSnackbar("Failed to update subscription.")
                                }
                            } catch (e: Exception) {
                                snackbarHostState.showSnackbar("Failed to update subscription.")
                            }
                        }
                    }
                )

                PaymentWalletSection(
                    savedCards = userProfile!!.savedCards,
                    web3WalletAddress = userProfile!!.web3WalletAddress,
                    onAddPaymentCard = {
                        scope.launch {
                            try {
                                val success = apiClient?.createPaymentMethod(stripePaymentMethodId = "pm_card_visa") ?: false
                                if (success) {
                                    val newCard = network.models.PaymentCardInfo(id = "card_${kotlin.random.Random.nextInt()}", brand = "Visa", last4 = "4242", expiryMonth = 12, expiryYear = 2028)
                                    val updated = userProfile!!.copy(savedCards = userProfile!!.savedCards + newCard)
                                    userProfile = updated
                                    snackbarHostState.showSnackbar("Payment card added successfully.")
                                } else {
                                    snackbarHostState.showSnackbar("Failed to add payment card.")
                                }
                            } catch (e: Exception) {
                                snackbarHostState.showSnackbar("Failed to add payment card.")
                            }
                        }
                    },
                    onGoogleWalletAction = {
                        scope.launch {
                            try {
                                val jwt = apiClient?.generateGoogleWalletPassJwt("loyalty") ?: ""
                                if (jwt.isNotEmpty()) {
                                    snackbarHostState.showSnackbar("Google Wallet Pass generated successfully.")
                                } else {
                                    snackbarHostState.showSnackbar("Unable to generate Google Wallet Pass at this time.")
                                }
                            } catch (e: Exception) {
                                snackbarHostState.showSnackbar("Failed to connect Google Wallet.")
                            }
                        }
                    },
                    onConnectCoinbaseWallet = {
                        scope.launch {
                            try {
                                val coinbaseHelper = CoinbaseWalletHelper(platformContext)
                                val address = coinbaseHelper.connectWallet()
                                val success = apiClient?.connectCoinbaseWallet(address) ?: false
                                if (success) {
                                    val updated = userProfile!!.copy(web3WalletAddress = address)
                                    userProfile = updated
                                    snackbarHostState.showSnackbar("Coinbase Wallet connected.")
                                } else {
                                    snackbarHostState.showSnackbar("Failed to connect Coinbase Wallet.")
                                }
                            } catch (e: Exception) {
                                snackbarHostState.showSnackbar("Failed to connect Coinbase Wallet.")
                            }
                        }
                    }
                )
            } else {
                ProfileHeader(
                    userProfile = null,
                    userName = userName,
                    userUid = userUid
                )
            }

            // Action Cards (Web Parity Settings)
            Column(modifier = Modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                ProfileListItem(icon = Icons.Outlined.FavoriteBorder, title = "My Favorites", subtitle = "View saved products", onClick = onNavigateToFavorites)
                ProfileListItem(icon = Icons.Outlined.History, title = "Order History", subtitle = "Track your purchases", onClick = onNavigateToOrderHistory)
                ProfileListItem(icon = Icons.Outlined.NotificationsNone, title = "Notifications", subtitle = "Manage alerts and updates", onClick = onNavigateToNotifications)
                ProfileListItem(icon = Icons.Outlined.CheckCircle, title = "Verify Email", subtitle = "Secure account with digital credentials", onClick = onVerifyEmail)
                ProfileListItem(icon = Icons.Outlined.Face, title = "Smart Glasses", subtitle = "Manage Meta Wearables", onClick = onNavigateToWearables)
                
                ThemeSelectorCard(
                    themeMode = themeMode,
                    onThemeModeChange = { newTheme ->
                        onThemeModeChange?.invoke(newTheme)
                        userUid?.let { uid ->
                            apiClient?.let { client ->
                                scope.launch {
                                    try {
                                        val currentProfile = userProfile ?: UserProfileData(uid = uid, email = "", name = "")
                                        client.updateUserProfile(currentProfile)
                                    } catch (e: Exception) {
                                        snackbarHostState.showSnackbar("Failed to update theme preference.")
                                    }
                                }
                            }
                        }
                    }
                )

                ProfileListItem(icon = Icons.Outlined.Security, title = "Privacy & Security", subtitle = "Biometric and account safety", onClick = onNavigateToPrivacySecurity)
                ProfileListItem(icon = Icons.AutoMirrored.Outlined.HelpOutline, title = "Support", subtitle = "Contact Spresso Concierge", onClick = onNavigateToSupport)
            }

            Spacer(modifier = Modifier.height(16.dp))

            AccountManagementSection(
                onSignOut = { onSignOut?.invoke() },
                onDeactivateAccount = {
                    userUid?.let { uid ->
                        scope.launch {
                            try {
                                apiClient?.deactivateAccount(uid)
                                onSignOut?.invoke()
                            } catch (e: Exception) {
                                snackbarHostState.showSnackbar("Failed to deactivate account.")
                            }
                        }
                    } ?: run {
                        scope.launch {
                            snackbarHostState.showSnackbar("User ID is missing.")
                        }
                    }
                }
            )
            
            Spacer(modifier = Modifier.height(32.dp))
        }
    }
}
