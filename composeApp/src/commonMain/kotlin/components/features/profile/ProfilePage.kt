package components.features.profile

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.safeDrawing
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.HelpOutline
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import components.features.profile.widgets.ProfileHeader
import components.features.profile.widgets.ProfileListItem
import components.features.profile.widgets.ThemeSelectorCard
import components.models.*
import kotlinx.coroutines.launch
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
    modifier: Modifier = Modifier,
) {
    val bgLight = MaterialTheme.colorScheme.background
    val scrollState = rememberScrollState()

    val isDark =
        when (themeMode) {
            ThemeMode.LIGHT -> false
            ThemeMode.DARK -> true
            ThemeMode.SYSTEM -> androidx.compose.foundation.isSystemInDarkTheme()
        }

    var userProfile by androidx.compose.runtime.remember { androidx.compose.runtime.mutableStateOf<UserProfileData?>(null) }
    val scope = androidx.compose.runtime.rememberCoroutineScope()
    val snackbarHostState = androidx.compose.runtime.remember { SnackbarHostState() }
    val platformContext = getPlatformContext()

    var fitPreference by remember { mutableStateOf("regular") }
    var userHeight by remember { mutableStateOf("") }
    var userWeight by remember { mutableStateOf("") }

    androidx.compose.runtime.LaunchedEffect(userUid) {
        if (userUid != null && apiClient != null) {
            try {
                userProfile = apiClient.fetchUserProfile(userUid)
                val prefs = apiClient.getUserPreferences()
                val fitPref = prefs["fitPreference"]
                if (fitPref is String) fitPreference = fitPref
            } catch (e: Exception) {
                snackbarHostState.showSnackbar("Failed to load profile. Please try again.")
            }
        }
    }

    Scaffold(
        modifier = modifier.fillMaxSize(),
        containerColor = if (isDark) MaterialTheme.colorScheme.surface else bgLight,
        contentWindowInsets = WindowInsets.safeDrawing,
        snackbarHost = { SnackbarHost(snackbarHostState) },
    ) { innerPadding ->
        Column(
            modifier =
                Modifier
                    .fillMaxSize()
                    .padding(innerPadding)
                    .consumeWindowInsets(innerPadding)
                    .verticalScroll(scrollState)
                    .padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(24.dp),
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
                    },
                )

                SubscriptionMembershipSection(
                    currentTier = userProfile!!.tier,
                    renewalDate = userProfile!!.renewalDate,
                    onManageSubscription = {
                        scope.launch {
                            try {
                                val newTier =
                                    if (userProfile!!.tier ==
                                        network.models.SubscriptionTier.FREE
                                    ) {
                                        network.models.SubscriptionTier.SPRESSO_VIP
                                    } else {
                                        network.models.SubscriptionTier.FREE
                                    }
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
                    },
                )

                PaymentWalletSection(
                    savedCards = userProfile!!.savedCards,
                    web3WalletAddress = userProfile!!.web3WalletAddress,
                    onAddPaymentCard = {
                        scope.launch {
                            snackbarHostState.showSnackbar("Adding a card is unavailable until secure card entry is connected.")
                        }
                    },
                    onRemovePaymentCard = { paymentMethodId ->
                        scope.launch {
                            try {
                                val success = apiClient?.removePaymentMethod(paymentMethodId) ?: false
                                if (success && userUid != null) {
                                    userProfile = apiClient?.fetchUserProfile(userUid)
                                    snackbarHostState.showSnackbar("Payment card removed.")
                                } else {
                                    snackbarHostState.showSnackbar("Unable to remove this card. Please try again.")
                                }
                            } catch (e: Exception) {
                                snackbarHostState.showSnackbar("Unable to remove this card. Please try again.")
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
                                if (!Regex("^0x[a-fA-F0-9]{40}$").matches(address)) {
                                    snackbarHostState.showSnackbar("Failed to connect Coinbase Wallet.")
                                    return@launch
                                }
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
                    },
                )
            } else {
                ProfileHeader(
                    userProfile = null,
                    userName = userName,
                    userUid = userUid,
                )
            }

            // Action Cards (Web Parity Settings)
            Column(modifier = Modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                ProfileListItem(
                    icon = Icons.Outlined.FavoriteBorder,
                    title = "My Favorites",
                    subtitle = "View saved products",
                    onClick =
                        onNavigateToFavorites ?: {
                            scope.launch { snackbarHostState.showSnackbar("Favorites are unavailable right now.") }
                            Unit
                        },
                )
                ProfileListItem(
                    icon = Icons.Outlined.History,
                    title = "Order History",
                    subtitle = "Track your purchases",
                    onClick =
                        onNavigateToOrderHistory ?: {
                            scope.launch { snackbarHostState.showSnackbar("Order history is unavailable right now.") }
                            Unit
                        },
                )
                ProfileListItem(
                    icon = Icons.Outlined.NotificationsNone,
                    title = "Notifications",
                    subtitle = "Manage alerts and updates",
                    onClick =
                        onNavigateToNotifications ?: {
                            scope.launch { snackbarHostState.showSnackbar("Notification settings are unavailable right now.") }
                            Unit
                        },
                )
                ProfileListItem(
                    icon = Icons.Outlined.CheckCircle,
                    title = "Verify Email",
                    subtitle = "Secure account with digital credentials",
                    onClick =
                        onVerifyEmail ?: {
                            scope.launch { snackbarHostState.showSnackbar("Email verification is unavailable right now.") }
                            Unit
                        },
                )
                ProfileListItem(
                    icon = Icons.Outlined.Face,
                    title = "Smart Glasses",
                    subtitle = "Manage Meta Wearables",
                    onClick =
                        onNavigateToWearables ?: {
                            scope.launch { snackbarHostState.showSnackbar("Smart glasses settings are unavailable right now.") }
                            Unit
                        },
                )

                ThemeSelectorCard(
                    themeMode = themeMode,
                    onThemeModeChange = { newTheme ->
                        onThemeModeChange?.invoke(newTheme)
                        userUid?.let { uid ->
                            apiClient?.let { client ->
                                scope.launch {
                                    try {
                                        val currentProfile = userProfile
                                        if (currentProfile == null) {
                                            snackbarHostState.showSnackbar("Unable to save theme before your profile is loaded.")
                                            return@launch
                                        }
                                        val updatedProfile = currentProfile.copy(themePreference = newTheme.name.lowercase())
                                        client.updateUserProfile(updatedProfile)
                                        userProfile = updatedProfile
                                    } catch (e: Exception) {
                                        snackbarHostState.showSnackbar("Failed to update theme preference.")
                                    }
                                }
                            }
                        }
                    },
                )

                StylePreferencesSection(
                    fitPreference = fitPreference,
                    height = userHeight,
                    weight = userWeight,
                    onFitPreferenceChange = { newFit ->
                        fitPreference = newFit
                        scope.launch {
                            try {
                                apiClient?.updateUserPreferences(fitPreference = newFit)
                            } catch (e: Exception) {
                                snackbarHostState.showSnackbar("Failed to save fit preference.")
                            }
                        }
                    },
                    onHeightChange = { userHeight = it },
                    onWeightChange = { userWeight = it },
                )

                ProfileListItem(
                    icon = Icons.Outlined.Security,
                    title = "Privacy & Security",
                    subtitle = "Biometric and account safety",
                    onClick =
                        onNavigateToPrivacySecurity ?: {
                            scope.launch { snackbarHostState.showSnackbar("Privacy and security settings are unavailable right now.") }
                            Unit
                        },
                )
                ProfileListItem(
                    icon = Icons.AutoMirrored.Outlined.HelpOutline,
                    title = "Support",
                    subtitle = "Contact Spresso Concierge",
                    onClick =
                        onNavigateToSupport ?: {
                            scope.launch { snackbarHostState.showSnackbar("Support is unavailable right now. Please try again later.") }
                            Unit
                        },
                )
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
                },
            )

            Spacer(modifier = Modifier.height(32.dp))
        }
    }
}
