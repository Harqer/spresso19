import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.navigation3.runtime.entryProvider
import audio.AudioPlayer
import audio.AudioRecorder
import components.features.auth.AuthPage
import components.features.catalog.AICurationFeed
import components.features.catalog.ProductCatalogDetailDialog
import components.features.catalog.ProductCatalogPage
import components.features.catalog.toProductItem
import components.features.chat.PersonalAIShopperChatPage
import components.features.chat.cards.DiscoveryCard
import components.features.creators.CreatorAgentsPage
import components.features.creators.CreatorAgentsSection
import components.features.creators.CreatorTemplatesSection
import components.features.grocery.GroceryListPage
import components.features.onboarding.GamifiedOnboardingDialog
import components.features.onboarding.SplashScreenPage
import components.features.orders.OrderReturnDialog
import components.features.orders.OrderReturnResultCard
import components.features.orders.OrdersTrackerPage
import components.features.profile.LegalSecuritySection
import components.features.profile.PaymentWalletRoute
import components.features.profile.PreferencesRoute
import components.features.profile.ProfilePage
import components.features.profile.SubscriptionMembershipRoute
import components.features.profile.SupportPage
import components.features.spatial.LiquidGlassCard
import components.features.travel.QrModal
import components.features.travel.TravelTripsPage
import components.features.vision.SmartVisionPage
import components.features.wardrobe.GallerySyncDisabledView
import components.features.wardrobe.StackedWardrobeDecks
import components.features.wardrobe.WardrobePage
import components.features.wardrobe.WardrobeViewPage
import components.features.wearables.MetaWearablesPage
import components.navigation.MainAppTemplate
import components.navigation.defaultNavDestinations
import components.shared.CheckoutConfirmDialog
import components.shared.overlays.GlobalChatOverlay
import kotlinx.coroutines.launch
import kotlinx.serialization.json.booleanOrNull
import kotlinx.serialization.json.jsonPrimitive
import navigation.ActionDestination
import navigation.NavKey
import navigation.Navigator
import navigation.SpressoAction
import navigation.rememberNavigationState
import network.ConnectionState
import network.ConvexApi
import network.LiveApiClient
import network.ProductItem
import network.signOut
import theme.AppTheme
import theme.ThemeMode
import ui.rememberImagePicker
import viewmodels.CatalogViewModel
import viewmodels.ChatViewModel
import viewmodels.MerchantBrowserViewModel
import kotlin.io.encoding.Base64
import kotlin.io.encoding.ExperimentalEncodingApi

/**
 * Main Application Root composable with Type-Safe Navigation 3 routing for Compose Multiplatform.
 * Orchestrates 25+ screens, modals, dialogs, overlays, and adaptive destinations.
 */
@Composable
@Suppress("UNUSED_PARAMETER")
fun App(
    modifier: Modifier = Modifier,
    currentUserUid: String? = null,
    currentUserName: String? = null,
    onShare: (String) -> Unit = {},
    isAccessibilityEnabled: Boolean = false,
    hasAccessibilityConsent: Boolean = false,
    showAccessibilityDisclosure: Boolean = false,
    onToggleAccessibility: (() -> Unit)? = null,
    onAccessibilityConsentAccepted: (() -> Unit)? = null,
    onDismissAccessibilityDisclosure: (() -> Unit)? = null,
    onRevokeAccessibilityConsent: (() -> Unit)? = null,
    onRequestAccessibilityScan: (() -> Unit)? = null,
    onCloseGlobalChat: () -> Unit = {},
    onTriggerGlobalLens: () -> Unit = {},
    onLensResult: (String) -> Unit = {},
    onGoogleSignInRequested: () -> Unit = {},
    onPhoneSignInRequested: (() -> Unit)? = null,
    onVerifyEmailRequested: () -> Unit = {},
    externalNavKey: NavKey? = null,
    isAuthLoading: Boolean = false,
    rootAuthError: String? = null,
    /** onboardingCompleted from the canonical users.bootstrap launch state (null = not bootstrapped). */
    bootstrappedOnboardingCompleted: Boolean? = null,
    /** Firebase-verified email of the account awaiting verification (gate UI copy only). */
    verificationEmail: String? = null,
    isEmailVerificationRequired: Boolean = false,
    currentLatLng: Pair<Double, Double>? = null,
    onRequestLocationPermission: () -> Unit = {},
    onRequestMicrophonePermission: ((Boolean) -> Unit) -> Unit = { onResult -> onResult(true) },
) {
    var themeMode by rememberSaveable { mutableStateOf(ThemeMode.SYSTEM) }

    AppTheme(themeMode = themeMode) {
        if (isAuthLoading) {
            Box(
                modifier = modifier.fillMaxSize().windowInsetsPadding(WindowInsets.safeDrawing),
                contentAlignment = Alignment.Center,
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    CircularProgressIndicator()
                    if (rootAuthError != null) {
                        Spacer(modifier = Modifier.height(16.dp))
                        Text(
                            text = rootAuthError,
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.error,
                        )
                    }
                }
            }
            return@AppTheme
        }

        val navigationState =
            rememberNavigationState(
                startRoute = NavKey.SplashScreenKey,
                topLevelRoutes = defaultNavDestinations.map { it.key }.toSet(),
            )
        val navigator = remember(navigationState) { Navigator(navigationState) }
        var hasShownAuthGate by remember { mutableStateOf(false) }
        var onboardingGateResolved by remember { mutableStateOf(false) }
        val canReceiveDeepLinks = currentUserUid != null && !isEmailVerificationRequired
        var lastHandledLink by remember { mutableStateOf<NavKey?>(null) }
        var lastHandledLinkUid by remember { mutableStateOf<String?>(null) }

        LaunchedEffect(currentUserUid, isEmailVerificationRequired, externalNavKey) {
            if (currentUserUid == null) {
                if (!hasShownAuthGate) {
                    hasShownAuthGate = true
                    navigator.resetTo(NavKey.AuthKey)
                } else if (navigator.state.backStacks[navigator.state.startRoute]?.lastOrNull() !is NavKey.AuthKey) {
                    navigator.resetTo(NavKey.AuthKey)
                }
            } else if (isEmailVerificationRequired) {
                if (!hasShownAuthGate) {
                    hasShownAuthGate = true
                    navigator.resetTo(NavKey.EmailVerificationKey)
                }
            } else {
                hasShownAuthGate = false
            }

            val pending = externalNavKey
            if (pending != null && canReceiveDeepLinks && !(pending == lastHandledLink && currentUserUid == lastHandledLinkUid)) {
                lastHandledLink = pending
                lastHandledLinkUid = currentUserUid
                navigator.navigate(pending)
            }
        }

        val scope = rememberCoroutineScope()
        val apiClient = remember { ConvexApi() }
        LaunchedEffect(currentUserUid, isEmailVerificationRequired, onboardingGateResolved) {
            if (currentUserUid != null && !isEmailVerificationRequired && !onboardingGateResolved) {
                onboardingGateResolved = true
                // Canonical launch state from users.bootstrap (delivered by
                // the host on Android; the web bridge path falls back to the
                // HTTP preferences read).
                val needsOnboarding = bootstrappedOnboardingCompleted
                    ?: (runCatching { apiClient.fetchPreferences() }.getOrNull()
                        ?.get("onboardingCompleted")?.jsonPrimitive?.booleanOrNull != true)
                if (needsOnboarding) navigator.navigate(NavKey.GamifiedOnboardingKey())
            }
        }

        val liveApiClient = remember { LiveApiClient() }
        val chatViewModel = remember { ChatViewModel(apiClient, scope, liveApiClient) }
        val merchantViewModel = remember { MerchantBrowserViewModel(apiClient, scope) }
        val catalogViewModel = remember { CatalogViewModel(scope, apiClient) }
        val audioRecorder = remember { AudioRecorder() }
        val audioPlayer = remember { AudioPlayer() }
        chatViewModel.onPlaybackInterrupted = { audioPlayer.stop() }

        var checkoutDeviceStatus by remember { mutableStateOf<String?>(null) }
        val onRegisterCheckoutDeviceRequested: () -> Unit = {
            scope.launch {
                checkoutDeviceStatus =
                    try {
                        if (catalogViewModel.registerCheckoutDevice() != null) {
                            "This device can now confirm purchases with biometrics."
                        } else {
                            "Purchase confirmation is not available on this device."
                        }
                    } catch (e: Exception) {
                        e.message ?: "Device registration failed. Sign in again and retry."
                    }
            }
        }
        checkoutDeviceStatus?.let { message ->
            AlertDialog(
                onDismissRequest = { checkoutDeviceStatus = null },
                confirmButton = { TextButton(onClick = { checkoutDeviceStatus = null }) { Text("OK") } },
                title = { Text("Purchase confirmation") },
                text = { Text(message) },
            )
        }

        var isVideoPlaying by remember { mutableStateOf(false) }
        var displayMediaUrl by remember { mutableStateOf<String?>(null) }
        var isVoiceRecording by remember { mutableStateOf(false) }
        var isVoiceStartPending by remember { mutableStateOf(false) }
        var activeProductId by remember { mutableStateOf<String?>(null) }
        var errorMessage by remember { mutableStateOf<String?>(null) }
        var selectedTemplateId by remember { mutableStateOf("economic") }
        var returnResultMessage by rememberSaveable { mutableStateOf<String?>(null) }
        var lastVisionContext by remember { mutableStateOf<String?>(null) }
        var voiceActivationGeneration by remember { mutableStateOf(0L) }
        var isVoiceCaptureStarting by remember { mutableStateOf(false) }
        val connectionState by liveApiClient.connectionStateFlow.collectAsState()
        val currentChatViewModel by rememberUpdatedState(chatViewModel)

        DisposableEffect(chatViewModel, liveApiClient, audioRecorder, audioPlayer) {
            onDispose {
                voiceActivationGeneration += 1
                chatViewModel.stopVoiceStream()
                audioRecorder.stopRecording()
                audioPlayer.release()
            }
        }

        val stopVoiceRecording: () -> Unit = {
            voiceActivationGeneration += 1
            isVoiceStartPending = false
            isVoiceCaptureStarting = false
            chatViewModel.stopVoiceStream()
            audioRecorder.stopRecording()
            audioPlayer.stop()
            isVoiceRecording = false
        }

        val startAudioCapture: () -> Unit = {
            if (!audioRecorder.isRecording() && !isVoiceCaptureStarting) {
                isVoiceCaptureStarting = true
                val activationGeneration = voiceActivationGeneration
                onRequestMicrophonePermission permissionResult@{ granted ->
                    if (activationGeneration != voiceActivationGeneration) return@permissionResult
                    isVoiceCaptureStarting = false
                    if (!granted) {
                        errorMessage = "Microphone permission is required to start voice chat."
                        stopVoiceRecording()
                        return@permissionResult
                    }
                    if (!chatViewModel.isVoiceActive ||
                        liveApiClient.connectionState != ConnectionState.CONNECTED ||
                        !liveApiClient.isSetupComplete
                    ) {
                        return@permissionResult
                    }

                    try {
                        audioRecorder.onAudioChunk = { chunk ->
                            scope.launch {
                                @OptIn(ExperimentalEncodingApi::class)
                                chatViewModel.sendVoiceChunk(Base64.encode(chunk))
                            }
                        }
                        audioRecorder.onStarted = {
                            isVoiceRecording = true
                            isVoiceStartPending = false
                            isVoiceCaptureStarting = false
                        }
                        audioRecorder.onStopped = {
                            isVoiceRecording = false
                            isVoiceCaptureStarting = false
                            isVoiceStartPending = chatViewModel.isVoiceActive
                        }
                        audioRecorder.startRecording()
                    } catch (error: Exception) {
                        stopVoiceRecording()
                        errorMessage = "Unable to start microphone capture. Please check microphone access and try again."
                        network.Telemetry.recordError("Microphone activation failed", error)
                    }
                }
            }
        }

        val startVoiceRecording: () -> Unit = {
            if (!isVoiceRecording && !isVoiceStartPending && !chatViewModel.isVoiceActive) {
                isVoiceStartPending = true
                errorMessage = null
                voiceActivationGeneration += 1
                chatViewModel.startVoiceStream(
                    onReceiveAudio = { chunk -> audioPlayer.playChunk(chunk) },
                    onPlaybackInterrupted = { audioPlayer.stop() },
                )
                if (!chatViewModel.isVoiceActive) {
                    isVoiceStartPending = false
                    errorMessage = chatViewModel.errorMessage ?: "Unable to start voice chat. Please try again."
                }
            }
        }

        val toggleVoiceRecording: () -> Unit = {
            if (isVoiceRecording || isVoiceStartPending || chatViewModel.isVoiceActive) {
                stopVoiceRecording()
            } else {
                startVoiceRecording()
            }
        }

        LaunchedEffect(chatViewModel.isVoiceActive, connectionState) {
            if (chatViewModel.isVoiceActive && connectionState == ConnectionState.CONNECTED) {
                try {
                    startAudioCapture()
                    isVoiceStartPending = isVoiceCaptureStarting || !isVoiceRecording
                } catch (error: Exception) {
                    stopVoiceRecording()
                    errorMessage = "Unable to start microphone capture. Please check microphone access and try again."
                    network.Telemetry.recordError("Microphone activation failed", error)
                }
            } else {
                audioRecorder.stopRecording()
                audioPlayer.stop()
                isVoiceCaptureStarting = false
                isVoiceRecording = false
                isVoiceStartPending = chatViewModel.isVoiceActive
            }
        }

        val currentStopVoiceRecording by rememberUpdatedState(stopVoiceRecording)
        DisposableEffect(audioRecorder) {
            audioRecorder.onError = { error ->
                scope.launch {
                    currentStopVoiceRecording()
                    errorMessage = "Microphone access is unavailable. Please try again."
                    network.Telemetry.recordError("Microphone capture failed", error)
                }
            }
            onDispose {
                audioRecorder.onError = null
                audioRecorder.onStarted = null
                audioRecorder.onStopped = null
            }
        }

        val pickImage =
            rememberImagePicker(
                onFrameCaptured = { frameBytes ->
                    if (isVoiceRecording) {
                        scope.launch {
                            @OptIn(ExperimentalEncodingApi::class)
                            chatViewModel.sendLiveVideoFrame(Base64.encode(frameBytes))
                        }
                    }
                },
                onVisionContextCaptured = { context ->
                    if (isVoiceRecording && context.isNotBlank() && context != lastVisionContext) {
                        lastVisionContext = context
                        chatViewModel.sendLiveVisionContext(context)
                    }
                },
                onImagePicked = { bytes ->
                    if (bytes != null) {
                        scope.launch {
                            try {
                                val productId = activeProductId ?: error("Select a product before starting try-on.")
                                val garment = apiClient.fetchProductById(productId)?.imageUrl?.takeIf { it.startsWith("https://") }
                                    ?: error("A verified garment image is required for try-on.")
                                displayMediaUrl = apiClient.generateVirtualTryOn(
                                    bytes = bytes,
                                    garmentImageUrl = garment,
                                    idempotencyKey = "tryon:$productId:${kotlin.time.Clock.System.now().toEpochMilliseconds()}",
                                )
                                isVideoPlaying = false
                                navigator.navigate(NavKey.WardrobeKey(displayMediaUrl = displayMediaUrl, isVideoPlaying = false))
                            } catch (e: Exception) {
                                errorMessage = "Virtual try-on is unavailable right now. Please try again."
                                isVideoPlaying = false
                            }
                        }
                    }
                },
            )

        MainAppTemplate(
            modifier = modifier,
            navigationState = navigationState,
            navigator = navigator,
            isVoiceRecording = isVoiceRecording || isVoiceStartPending,
            onToggleVoiceRecording = toggleVoiceRecording,
            themeMode = themeMode,
            onThemeModeChange = { themeMode = it },
            onAskAI = { prompt ->
                chatViewModel.sendMessage(prompt = prompt)
                navigator.navigate(NavKey.ChatKey())
            },
            entryProvider =
                entryProvider {
                    entry<NavKey.AuthKey> { currentDestinationKey ->
                        AuthPage(
                            onGoogleSignInRequested = onGoogleSignInRequested,
                            onPhoneSignInRequested = onPhoneSignInRequested,
                            onSuccess = { navigator.resetTo(NavKey.SplashScreenKey) },
                        )
                    }
                    entry<NavKey.SplashScreenKey> { currentDestinationKey ->
                        SplashScreenPage(
                            onSplashComplete = {
                                navigator.replace(
                                    when {
                                        currentUserUid == null -> NavKey.AuthKey
                                        isEmailVerificationRequired -> NavKey.EmailVerificationKey
                                        else -> NavKey.ChatKey()
                                    },
                                )
                            },
                        )
                    }
                    entry<NavKey.GamifiedOnboardingKey> { currentDestinationKey ->
                        GamifiedOnboardingDialog(
                            isOpen = true,
                            onDismiss = { navigator.goBack() },
                            apiClient = apiClient,
                            onComplete = {
                                scope.launch {
                                    runCatching { apiClient.setPreferences(onboardingCompleted = true) }
                                        .onFailure { error -> network.Telemetry.recordError("Onboarding completion persist failed", error) }
                                    navigator.resetTo(NavKey.ChatKey())
                                }
                            },
                            onLaunchVirtualTryOn = { pickImage() },
                            onOpenPaymentWallet = { navigator.navigate(NavKey.PaymentWalletKey) },
                            onOpenWardrobe = { navigator.navigate(NavKey.WardrobeKey()) },
                        )
                    }
                    entry<NavKey.EmailVerificationKey> { currentDestinationKey ->
                        // Dedicated verification gate (auth correction scope):
                        // Firebase stays authoritative for verification state —
                        // Resend / I've-verified act on the Firebase user, and
                        // the root state machine re-evaluates on token refresh.
                        components.features.auth.widgets.EmailVerificationPage(
                            email = verificationEmail,
                            onVerified = { navigator.resetTo(NavKey.SplashScreenKey) },
                            onSignOut = {
                                signOut()
                                chatViewModel.clearSession()
                                catalogViewModel.clearCheckoutStatus()
                                merchantViewModel.stop()
                                navigator.resetTo(NavKey.AuthKey)
                            },
                        )
                    }

                    entry<NavKey.ChatKey> { currentDestinationKey ->
                        PersonalAIShopperChatPage(
                            chatViewModel = chatViewModel,
                            isVideoPlaying = isVideoPlaying,
                            isVoiceRecording = isVoiceRecording || isVoiceStartPending,
                            liveTranscript = chatViewModel.liveTranscript,
                            userName = currentUserName,
                            errorMessage = errorMessage,
                            userLatLng = currentLatLng,
                            merchantViewModel = merchantViewModel,
                            isAccessibilityEnabled = isAccessibilityEnabled,
                            hasAccessibilityConsent = hasAccessibilityConsent,
                            showAccessibilityDisclosure = showAccessibilityDisclosure,
                            onToggleAccessibility = onToggleAccessibility,
                            onAccessibilityConsentAccepted = onAccessibilityConsentAccepted,
                            onDismissAccessibilityDisclosure = onDismissAccessibilityDisclosure,
                            onRevokeAccessibilityConsent = onRevokeAccessibilityConsent,
                            onRequestAccessibilityScan = onRequestAccessibilityScan,
                            onTriggerGlobalLens = onTriggerGlobalLens,
                            onRequestLocationPermission = onRequestLocationPermission,
                            onCloseGlobalChat = onCloseGlobalChat,
                            onLaunchCamera = { pickImage() },
                            onToggleVoiceRecording = toggleVoiceRecording,
                            onAddToCart = { product ->
                                scope.launch {
                                    try {
                                        val added = apiClient.addCartItem(product, quantity = 1)
                                        if (!added) {
                                            errorMessage = "Unable to save this listing to your cart. Please try again."
                                            return@launch
                                        }
                                        apiClient.recordInteraction(product.id, "add_to_cart")
                                        catalogViewModel.initiateCheckout(product)
                                        navigator.navigate(NavKey.HITLCheckoutKey)
                                    } catch (error: Exception) {
                                        errorMessage = error.message ?: "Unable to add this listing to your cart. Please try again."
                                    }
                                }
                            },
                            onSelectTryOn = { product ->
                                activeProductId = product.id
                                pickImage()
                            },
                            initialPrompt = currentDestinationKey.initialPrompt,
                            initialImage = currentDestinationKey.initialImage,
                            apiClient = apiClient,
                        )
                    }
                    entry<NavKey.GlobalChatOverlayKey> { currentDestinationKey ->
                        GlobalChatOverlay(
                            isVisible = true,
                            onDismissRequest = { navigator.goBack() },
                            onSendMessage = { prompt ->
                                chatViewModel.sendMessage(prompt = prompt)
                                navigator.navigate(NavKey.ChatKey())
                            },
                            onOpenLiveCamera = { pickImage() },
                            onOpenObjectDetection = onTriggerGlobalLens,
                            onToggleVoice = toggleVoiceRecording,
                        )
                    }
                    entry<NavKey.ChatbotCanvasKey> { currentDestinationKey ->
                        PersonalAIShopperChatPage(
                            chatViewModel = chatViewModel,
                            isVideoPlaying = isVideoPlaying,
                            isVoiceRecording = isVoiceRecording || isVoiceStartPending,
                            liveTranscript = chatViewModel.liveTranscript,
                            userName = currentUserName,
                            errorMessage = errorMessage,
                            merchantViewModel = merchantViewModel,
                            onTriggerGlobalLens = onTriggerGlobalLens,
                            onLaunchCamera = { pickImage() },
                            onToggleVoiceRecording = toggleVoiceRecording,
                            apiClient = apiClient,
                        )
                    }
                    entry<NavKey.ChatDiscoveryCardKey> { currentDestinationKey ->
                        DiscoveryCard(
                            id = "discovery_1",
                            isErrorTheme = false,
                            icon = Icons.Default.AutoAwesome,
                            title = "Explore New Arrivals",
                            subtitle = "Curated luxury styles tailored to your taste.",
                            prompt = "Show me trending fashion items",
                            onClick = { prompt ->
                                chatViewModel.sendMessage(prompt = prompt)
                                navigator.navigate(NavKey.ChatKey())
                            },
                        )
                    }
                    entry<NavKey.CatalogKey> { currentDestinationKey ->
                        ProductCatalogPage(
                            apiClient = apiClient,
                            httpClient = apiClient.client,
                            catalogViewModel = catalogViewModel,
                            onProductSelected = { id ->
                                activeProductId = id
                                navigator.navigate(NavKey.ProductDetailKey(id))
                            },
                            onTryOnRequested = { product ->
                                activeProductId = product.id
                                pickImage()
                            },
                            onMediaGenerated = { mediaUrl, mediaType ->
                                displayMediaUrl = mediaUrl
                                navigator.navigate(
                                    NavKey.WardrobeKey(
                                        displayMediaUrl = mediaUrl,
                                        isVideoPlaying = mediaType == "video",
                                    ),
                                )
                            },
                            onShareRequested = onShare,
                            onAskAI = { prompt -> navigator.navigate(NavKey.ChatKey(initialPrompt = prompt)) },
                            onCheckoutRequested = { navigator.navigate(NavKey.HITLCheckoutKey) },
                        )
                    }
                    entry<NavKey.ProductDetailKey> { currentDestinationKey ->
                        var detailProduct by remember { mutableStateOf<ProductItem?>(null) }
                        var loadError by remember { mutableStateOf<String?>(null) }
                        LaunchedEffect(currentDestinationKey.productId) {
                            try {
                                detailProduct = apiClient.fetchProductById(currentDestinationKey.productId)
                            } catch (e: Exception) {
                                loadError = "Failed to fetch product details"
                            }
                        }
                        val currentProduct = detailProduct
                        if (currentProduct != null) {
                            ProductCatalogDetailDialog(
                                product = currentProduct,
                                checkoutStatus = null,
                                onDismiss = { navigator.goBack() },
                                onTryOn = { product -> activeProductId = product.id; pickImage() },
                                onSpin360 = { id ->
                                    scope.launch {
                                        try {
                                            displayMediaUrl = apiClient.requestSpin360(id)
                                            isVideoPlaying = true
                                            navigator.navigate(NavKey.WardrobeKey(displayMediaUrl = displayMediaUrl, isVideoPlaying = true))
                                        } catch (e: Exception) {
                                            errorMessage = "Failed to fetch Spin 360: ${e.message}"
                                        }
                                    }
                                },
                                onLike = {
                                    scope.launch {
                                        try {
                                            apiClient.setSavedProduct(currentProduct, saved = true)
                                            errorMessage = "Saved to your favorites."
                                        } catch (e: Exception) {
                                            errorMessage = "Failed to save to favorites."
                                        }
                                    }
                                },
                                onShare = { id -> onShare(id) },
                                onBuyNow = { catalogViewModel.initiateCheckout(currentProduct); navigator.navigate(NavKey.HITLCheckoutKey) },
                            )
                        } else if (loadError != null) {
                            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                                Text(loadError!!, color = MaterialTheme.colorScheme.error)
                            }
                        } else {
                            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                                CircularProgressIndicator()
                            }
                        }
                    }
                    entry<NavKey.AICurationFeedKey> { currentDestinationKey ->
                        var curatedProducts by remember { mutableStateOf<List<ProductItem>?>(null) }
                        var curationError by remember { mutableStateOf<String?>(null) }
                        LaunchedEffect(Unit) {
                            try {
                                curatedProducts = apiClient.fetchRecommendedProducts()
                            } catch (e: Exception) {
                                curationError = "Recommendations are unavailable right now. Please try again later."
                            }
                        }
                        when {
                            curationError != null -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                                Text(curationError!!, color = MaterialTheme.colorScheme.error)
                            }
                            curatedProducts == null -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                                CircularProgressIndicator()
                            }
                            else -> AICurationFeed(curatedProducts = curatedProducts!!, httpClient = apiClient.client, onTryOnRequested = { product -> activeProductId = product.id; pickImage() })
                        }
                    }
                    entry<NavKey.WardrobeKey> { currentDestinationKey ->
                        WardrobeViewPage(
                            displayMediaUrl = currentDestinationKey.displayMediaUrl ?: displayMediaUrl,
                            httpClient = apiClient.client,
                            currentLatLng = currentLatLng,
                            onPickImageRequested = { pickImage() },
                            onOpenLens = onTriggerGlobalLens,
                            onShareRequested = onShare,
                        )
                    }
                    entry<NavKey.WardrobeMainKey> { currentDestinationKey ->
                        WardrobePage(onNavigateToTryOn = { id -> activeProductId = id; pickImage() }, onOpenLens = onTriggerGlobalLens)
                    }
                    entry<NavKey.StackedWardrobeDecksKey> { currentDestinationKey ->
                        var recommendedProducts by remember { mutableStateOf<List<ProductItem>?>(null) }
                        var likedProducts by remember { mutableStateOf<List<ProductItem>>(emptyList()) }
                        var recommendationsError by remember { mutableStateOf<String?>(null) }
                        LaunchedEffect(Unit) {
                            try {
                                recommendedProducts = apiClient.fetchRecommendedProducts()
                            } catch (e: Exception) {
                                recommendationsError = "Live product recommendations are unavailable right now."
                                recommendedProducts = emptyList()
                            }
                            runCatching { likedProducts = apiClient.fetchSavedListings().mapNotNull { it.listing?.toProductItem() } }
                        }
                        ColumnWithRouteMessage(recommendationsError) {
                            StackedWardrobeDecks(
                                products = recommendedProducts.orEmpty(),
                                likedProducts = likedProducts,
                                onSelectTryOn = { product -> activeProductId = product.id; pickImage() },
                                onOpenUploadModal = { pickImage() },
                            )
                        }
                    }
                    entry<NavKey.GallerySyncDisabledKey> { currentDestinationKey ->
                        GallerySyncDisabledView(onGrant = { pickImage() })
                    }
                    entry<NavKey.SmartVisionKey> { currentDestinationKey ->
                        SmartVisionPage(
                            apiClient = apiClient,
                            onSelectProduct = { productId -> activeProductId = productId; navigator.navigate(NavKey.CatalogKey) },
                            onAskAI = { prompt -> navigator.navigate(NavKey.ChatKey(initialPrompt = prompt)) },
                            onTriggerGlobalLens = onTriggerGlobalLens,
                        )
                    }
                    entry<NavKey.SmartVisionDetectionKey> {
                        SmartVisionPage(
                            apiClient = apiClient,
                            onSelectProduct = { productId -> activeProductId = productId; navigator.navigate(NavKey.ProductDetailKey(productId)) },
                            onAskAI = { prompt -> navigator.navigate(NavKey.ChatKey(initialPrompt = prompt)) },
                            onTriggerGlobalLens = onTriggerGlobalLens,
                        )
                    }
                    entry<NavKey.GroceryKey> { currentDestinationKey ->
                        GroceryListPage(apiClient = apiClient, onAskAI = { prompt -> navigator.navigate(NavKey.ChatKey(initialPrompt = prompt)) })
                    }
                    entry<NavKey.IngredientChecklistKey> { currentDestinationKey ->
                        GroceryListPage(apiClient = apiClient, onAskAI = { prompt -> navigator.navigate(NavKey.ChatKey(initialPrompt = prompt)) })
                    }
                    entry<NavKey.OrdersKey> { currentDestinationKey ->
                        OrdersTrackerPage(apiClient = apiClient, onAskAI = { prompt -> navigator.navigate(NavKey.ChatKey(initialPrompt = prompt)) })
                    }
                    entry<NavKey.OrderReturnKey> { currentDestinationKey ->
                        var returnReason by remember { mutableStateOf("") }
                        var isSubmittingReturn by remember { mutableStateOf(false) }
                        var returnError by remember { mutableStateOf<String?>(null) }
                        OrderReturnDialog(
                            orderId = currentDestinationKey.orderId,
                            returnReason = returnReason,
                            onReturnReasonChange = { returnReason = it },
                            isSubmittingReturn = isSubmittingReturn,
                            onDismissRequest = { navigator.goBack() },
                            onConfirmReturn = {
                                if (returnReason.isBlank()) returnError = "Tell us why you would like to return this order."
                                else scope.launch {
                                    isSubmittingReturn = true
                                    try {
                                        if (apiClient.requestOrderReturn(currentDestinationKey.orderId, returnReason.trim())) {
                                            returnResultMessage = "Your return request was submitted. We'll send the next steps when they are ready."
                                            navigator.replace(NavKey.OrderReturnResultKey(currentDestinationKey.orderId))
                                        } else returnError = "Unable to submit this return. Please try again."
                                    } catch (e: Exception) {
                                        returnError = "Unable to submit this return. Please try again."
                                    } finally { isSubmittingReturn = false }
                                }
                            },
                        )
                        returnError?.let { Text(it, color = MaterialTheme.colorScheme.error, modifier = Modifier.padding(24.dp)) }
                    }
                    entry<NavKey.OrderReturnResultKey> { currentDestinationKey ->
                        OrderReturnResultCard(msg = returnResultMessage ?: "Return details are unavailable. Open order history to check the latest status.", onDismiss = { returnResultMessage = null; navigator.goBack() })
                    }
                    entry<NavKey.HITLCheckoutKey> { currentDestinationKey ->
                        val draft by catalogViewModel.checkoutDraft.collectAsState()
                        val phase by catalogViewModel.checkoutPhase.collectAsState()
                        when {
                            draft != null -> CheckoutConfirmDialog(draft = draft!!, phase = phase, onConfirm = { catalogViewModel.confirmCheckout() }, onDismiss = { catalogViewModel.dismissCheckout(); navigator.goBack() })
                            else -> ColumnWithRouteMessage((phase as? viewmodels.CheckoutPhase.Failed)?.message ?: "Choose a product before starting checkout.") {}
                        }
                    }
                    entry<NavKey.CreatorKey> { currentDestinationKey ->
                        CreatorAgentsPage(apiClient = apiClient, selectedTemplateId = currentDestinationKey.selectedTemplateId.ifEmpty { selectedTemplateId }, onTemplateSelected = { id -> selectedTemplateId = id })
                    }
                    entry<NavKey.CreatorTemplatesKey> { currentDestinationKey -> CreatorTemplatesSection(apiClient = apiClient, scope = scope) }
                    entry<NavKey.CreatorAgentsSectionKey> { currentDestinationKey -> CreatorAgentsSection(apiClient = apiClient, scope = scope) }
                    entry<NavKey.TravelKey> { currentDestinationKey -> TravelTripsPage(apiClient = apiClient, onAskAI = { prompt -> navigator.navigate(NavKey.ChatKey(initialPrompt = prompt)) }) }
                    entry<NavKey.TravelQrModalKey> { currentDestinationKey -> QrModal(title = currentDestinationKey.eventTitle, location = currentDestinationKey.eventLocation, qrData = currentDestinationKey.qrData, onClose = { navigator.goBack() }) }
                    entry<NavKey.ProfileKey> { currentDestinationKey ->
                        ProfilePage(
                            userUid = currentUserUid,
                            userName = currentUserName,
                            apiClient = apiClient,
                            themeMode = themeMode,
                            onThemeModeChange = { themeMode = it },
                            onSignOut = { signOut(); chatViewModel.clearSession(); catalogViewModel.clearCheckoutStatus(); merchantViewModel.stop(); navigator.replace(NavKey.AuthKey) },
                            onVerifyEmail = onVerifyEmailRequested,
                            onRegisterCheckoutDevice = onRegisterCheckoutDeviceRequested,
                            onNavigateToFavorites = { navigator.navigate(ActionDestination.resolve(SpressoAction.OpenSavedListings)) },
                            onNavigateToOrderHistory = { navigator.navigate(NavKey.OrdersKey) },
                            onNavigateToNotifications = { navigator.navigate(NavKey.PreferencesKey) },
                            onNavigateToWearables = { navigator.navigate(NavKey.MetaWearablesKey) },
                            onNavigateToPrivacySecurity = { navigator.navigate(NavKey.LegalSecurityKey) },
                            onNavigateToSupport = { navigator.navigate(NavKey.SupportKey) },
                        )
                    }
                    entry<NavKey.AccountManagementKey> { currentDestinationKey ->
                        ProfilePage(
                            userUid = currentUserUid,
                            userName = currentUserName,
                            apiClient = apiClient,
                            themeMode = themeMode,
                            onThemeModeChange = { themeMode = it },
                            onSignOut = { signOut(); chatViewModel.clearSession(); catalogViewModel.clearCheckoutStatus(); merchantViewModel.stop(); navigator.resetTo(NavKey.AuthKey) },
                            onVerifyEmail = onVerifyEmailRequested,
                            onRegisterCheckoutDevice = onRegisterCheckoutDeviceRequested,
                            onNavigateToFavorites = { navigator.navigate(ActionDestination.resolve(SpressoAction.OpenSavedListings)) },
                            onNavigateToOrderHistory = { navigator.navigate(NavKey.OrdersKey) },
                            onNavigateToNotifications = { navigator.navigate(NavKey.PreferencesKey) },
                            onNavigateToWearables = { navigator.navigate(NavKey.MetaWearablesKey) },
                            onNavigateToPrivacySecurity = { navigator.navigate(NavKey.LegalSecurityKey) },
                            onNavigateToSupport = { navigator.navigate(NavKey.SupportKey) },
                        )
                    }
                    entry<NavKey.PaymentWalletKey> { currentDestinationKey -> PaymentWalletRoute(userUid = currentUserUid, apiClient = apiClient) }
                    entry<NavKey.SubscriptionMembershipKey> { currentDestinationKey -> SubscriptionMembershipRoute(userUid = currentUserUid, apiClient = apiClient) }
                    entry<NavKey.LegalSecurityKey> { currentDestinationKey -> ColumnWithRouteMessage(null) { LegalSecuritySection() } }
                    entry<NavKey.PreferencesKey> { currentDestinationKey -> PreferencesRoute(userUid = currentUserUid, apiClient = apiClient, themeMode = themeMode, onThemeModeChange = { themeMode = it }) }
                    entry<NavKey.SupportKey> { currentDestinationKey -> SupportPage(onOpenChat = { navigator.navigate(NavKey.ChatKey(initialPrompt = "I need help with my Spresso account.")) }) }
                    entry<NavKey.MetaWearablesKey> { currentDestinationKey ->
                        MetaWearablesPage(
                            isConnected = false,
                            batteryPercent = 0,
                            glassesModelName = "Meta smart glasses",
                            isCameraStreaming = false,
                            onStartHandsFreeCheckout = { navigator.navigate(NavKey.HITLCheckoutKey) },
                            onDismiss = { navigator.goBack() },
                            modifier = Modifier,
                        )
                    }
                    entry<NavKey.SpatialLiquidGlassKey> { currentDestinationKey ->
                        LiquidGlassCard {
                            Text(
                                text = "Spatial Glass Surface Active",
                                style = MaterialTheme.typography.bodyMedium,
                                color = MaterialTheme.colorScheme.onSurface,
                            )
                        }
                    }
                },
        )
    }
}

@Composable
private fun ColumnWithRouteMessage(
    message: String?,
    content: @Composable () -> Unit,
) {
    Column(
        modifier = Modifier.fillMaxSize().windowInsetsPadding(WindowInsets.safeDrawing).padding(24.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        message?.let {
            Text(
                text = it,
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.error,
            )
        }
        content()
    }
}
