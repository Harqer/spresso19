package components.features.profile

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.consumeWindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawing
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.HelpOutline
import androidx.compose.material.icons.outlined.CheckCircle
import androidx.compose.material.icons.outlined.Face
import androidx.compose.material.icons.outlined.FavoriteBorder
import androidx.compose.material.icons.outlined.History
import androidx.compose.material.icons.outlined.NotificationsNone
import androidx.compose.material.icons.outlined.Security
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
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
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import network.ConvexApi
import network.models.UserProfileData
import network.sendEmailVerification
import theme.ThemeMode

@Composable
fun ProfilePage(
    userUid: String?,
    userName: String? = null,
    apiClient: ConvexApi? = null,
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
    var preferencesLoaded by remember { mutableStateOf(false) }

    androidx.compose.runtime.LaunchedEffect(userUid) {
        preferencesLoaded = false
        if (userUid != null && apiClient != null) {
            try {
                userProfile = apiClient.fetchUserProfile(userUid)
                val prefs = apiClient.getUserPreferences()
                val fitPref = prefs["fitPreference"]
                val heightPref = prefs["height"]
                val weightPref = prefs["weight"]
                if (fitPref is String) fitPreference = fitPref
                if (heightPref is String) userHeight = heightPref
                if (weightPref is String) userWeight = weightPref
                preferencesLoaded = true
            } catch (e: Exception) {
                snackbarHostState.showSnackbar("Failed to load profile. Please try again.")
            }
        }
    }

    androidx.compose.runtime.LaunchedEffect(userUid, fitPreference, userHeight, userWeight, preferencesLoaded) {
        if (!preferencesLoaded || userUid == null || apiClient == null) return@LaunchedEffect
        delay(500)
        runCatching {
            apiClient.updateUserPreferences(
                fitPreference = fitPreference,
                height = userHeight,
                weight = userWeight,
            )
        }.onFailure {
            snackbarHostState.showSnackbar("Failed to save style preferences.")
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
                            snackbarHostState.showSnackbar("Subscription changes are handled through secure billing checkout.")
                        }
                    },
                )

                PaymentWalletSection(
                    savedCards = userProfile!!.savedCards,
                    web3WalletAddress = userProfile!!.web3WalletAddress,
                    onAddPaymentCard = {
                        scope.launch {
                            snackbarHostState.showSnackbar(
                                "Use Stripe or Google Pay to add a card securely; raw card details never enter Spresso.",
                            )
                        }
                    },
                    onRemovePaymentCard = { paymentMethodId ->
                        scope.launch {
                            try {
                                val success = apiClient?.removePaymentMethod(paymentMethodId) ?: false
                                if (success && userUid != null) {
                                    userProfile = apiClient.fetchUserProfile(userUid)
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
                            snackbarHostState.showSnackbar(
                                "Google Wallet passes become available after an eligible tracked order is selected.",
                            )
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
                            scope.launch {
                                val sent = sendEmailVerification()
                                snackbarHostState.showSnackbar(
                                    if (sent) "Verification email sent." else "Unable to send verification email.",
                                )
                            }
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
                    if (userUid == null || apiClient == null) {
                        scope.launch { snackbarHostState.showSnackbar("Sign in to deactivate your account.") }
                    } else {
                        scope.launch {
                            try {
                                apiClient.deactivateAccount()
                                onSignOut?.invoke()
                            } catch (e: Exception) {
                                snackbarHostState.showSnackbar("Failed to deactivate account. Please reauthenticate and try again.")
                            }
                        }
                    }
                },
            )

            Spacer(modifier = Modifier.height(32.dp))
        }
    }
}
