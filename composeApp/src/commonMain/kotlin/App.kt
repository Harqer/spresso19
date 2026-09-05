import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
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
import components.features.chat.PersonalAIShopperChatPage
import components.features.chat.cards.DiscoveryCard
import components.features.creators.CreatorAgentsPage
import components.features.creators.CreatorAgentsSection
import components.features.creators.CreatorTemplatesSection
import components.features.grocery.GroceryListPage
import components.features.grocery.IngredientChecklistCard
import components.features.onboarding.GamifiedOnboardingDialog
import components.features.onboarding.SplashScreenPage
import components.features.orders.OrderReturnDialog
import components.features.orders.OrderReturnResultCard
import components.features.orders.OrdersTrackerPage
import components.features.profile.AccountManagementSection
import components.features.profile.LegalSecuritySection
import components.features.profile.PaymentWalletSection
import components.features.profile.PaymentWalletRoute
import components.features.profile.PreferencesSection
import components.features.profile.PreferencesRoute
import components.features.profile.ProfilePage
import components.features.profile.SubscriptionMembershipRoute
import components.features.profile.SubscriptionMembershipSection
import components.features.profile.SupportPage
import components.features.profile.SubscriptionMembershipRoute
import components.features.spatial.LiquidGlassCard
import components.features.travel.BoardingPassList
import components.features.travel.QrModal
import components.features.travel.ReceiptScannerSection
import components.features.travel.TravelTripsPage
import components.features.travel.VoiceNotesSection
import components.features.vision.SmartVisionDetectionOverlay
import components.features.vision.SmartVisionPage
import components.features.wardrobe.GallerySyncDisabledView
import components.features.wardrobe.StackedWardrobeDecks
import components.features.wardrobe.WardrobePage
import components.features.wardrobe.WardrobeViewPage
import components.features.wearables.MetaWearablesPage
import components.models.ItineraryEvent
import components.navigation.MainAppTemplate
import components.navigation.defaultNavDestinations
import components.shared.MerchantHandoffDialog
import components.shared.overlays.GlobalChatOverlay
import kotlinx.coroutines.launch
import kotlinx.serialization.json.boolean
import kotlinx.serialization.json.jsonPrimitive
import navigation.ActionDestination
import navigation.NavKey
import navigation.Navigator
import navigation.SpressoAction
import navigation.rememberNavigationState
import network.ApiClient
import network.DetectedItem
import network.LiveApiClient
import network.ProductItem
import network.SpressoBackend
import network.models.GroceryItem
import network.models.SubscriptionTier
import theme.AppTheme
import theme.ThemeMode
import ui.rememberImagePicker
import viewmodels.ChatViewModel
import viewmodels.CatalogViewModel
import kotlin.io.encoding.Base64
import kotlin.io.encoding.ExperimentalEncodingApi

/**
 * Main Application Root composable with Type-Safe Navigation 3 routing for Compose Multiplatform.
 * Orchestrates 25+ screens, modals, dialogs, overlays, and adaptive destinations.
 */
@Composable
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
    currentLatLng: Pair<Double, Double>? = null,
    onRequestLocationPermission: () -> Unit = {},
) {
    var themeMode by rememberSaveable { mutableStateOf(ThemeMode.SYSTEM) }

    AppTheme(themeMode = themeMode) {
        if (isAuthLoading) {
            Box(
                modifier = modifier.fillMaxSize().windowInsetsPadding(WindowInsets.safeDrawing),
                contentAlignment = Alignment.Center,
            ) {
                CircularProgressIndicator()
            }
            return@AppTheme
        }

        val navigationState =
            rememberNavigationState(
                startRoute = NavKey.ChatKey(),
                topLevelRoutes = defaultNavDestinations.map { it.key }.toSet(),
            )
        val navigator = remember(navigationState) { Navigator(navigationState) }

        // Auth gating mirrors the conditional-navigation recipe: a signed-out session
        // sits on AuthKey placed on top of the start stack, while signed-in starts at
        // the stacked Chat tab. The gate runs before deep-link handling in the same
        // coroutine so a cold-start link is shown above either the auth or the home UI.
        var hasShownAuthGate by remember { mutableStateOf(false) }
        var lastHandledLink by remember { mutableStateOf<NavKey?>(null) }
        var lastHandledLinkUid by remember { mutableStateOf<String?>(null) }

        LaunchedEffect(currentUserUid, externalNavKey) {
            if (currentUserUid == null) {
                if (!hasShownAuthGate) {
                    hasShownAuthGate = true
                    navigator.resetTo(NavKey.AuthKey)
                }
            } else {
                hasShownAuthGate = false
            }

            val pending = externalNavKey
            if (pending != null && !(pending == lastHandledLink && currentUserUid == lastHandledLinkUid)) {
                lastHandledLink = pending
                lastHandledLinkUid = currentUserUid
                navigator.navigate(pending)
            }
        }

        val scope = rememberCoroutineScope()
        val apiClient = remember { ApiClient() }
        val liveApiClient = remember { LiveApiClient() }
        val chatViewModel = remember { ChatViewModel(apiClient, scope, liveApiClient) }
        val catalogViewModel = remember { CatalogViewModel(scope) }
        val audioRecorder = remember { AudioRecorder() }
        val audioPlayer = remember { AudioPlayer() }

        DisposableEffect(Unit) {
            onDispose {
                apiClient.client.close()
                liveApiClient.close()
                audioRecorder.stopRecording()
            }
        }

        var isVideoPlaying by remember { mutableStateOf(false) }
        var displayMediaUrl by remember { mutableStateOf<String?>(null) }
        var isVoiceRecording by remember { mutableStateOf(false) }
        var activeProductId by remember { mutableStateOf<String?>(null) }
        var errorMessage by remember { mutableStateOf<String?>(null) }
        var selectedTemplateId by remember { mutableStateOf("economic") }
        var returnResultMessage by rememberSaveable { mutableStateOf<String?>(null) }
        var lastVisionContext by remember { mutableStateOf<String?>(null) }

        val pickImage =
            rememberImagePicker(
                onFrameCaptured = { frameBytes ->
                    // Routine live vision is handled on-device through ML Kit.
                    // Full image upload remains explicit through the image picker.
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
                            @OptIn(ExperimentalEncodingApi::class)
                            val base64Image = Base64.Default.encode(bytes)
                            try {
                                displayMediaUrl = apiClient.requestVirtualTryOn(base64Image)
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
            isVoiceRecording = isVoiceRecording,
            onToggleVoiceRecording = {
                if (isVoiceRecording) {
                    audioRecorder.stopRecording()
                    liveApiClient.close()
                    isVoiceRecording = false
                } else {
                    audioRecorder.onAudioChunk = { chunk ->
                        scope.launch {
                            @OptIn(ExperimentalEncodingApi::class)
                            liveApiClient.sendAudioChunk(Base64.Default.encode(chunk))
                        }
                    }
                    audioRecorder.startRecording()
                    if (audioRecorder.isRecording()) {
                        chatViewModel.startVoiceStream(
                            agentType = "SHOPPING_CONCIERGE",
                            onReceiveAudio = { chunk -> audioPlayer.playChunk(chunk) },
                        )
                        isVoiceRecording = true
                    } else {
                        errorMessage = "Microphone access required for voice AI recording."
                    }
                }
            },
            themeMode = themeMode,
            onThemeModeChange = { themeMode = it },
            onAskAI = { prompt ->
                chatViewModel.sendMessage(prompt = prompt, location = null, agentType = "SHOPPING_CONCIERGE")
                navigator.navigate(NavKey.ChatKey())
            },
            entryProvider =
                entryProvider {
                    // 1. Auth & Onboarding Flow
                    entry<NavKey.AuthKey> { currentDestinationKey ->
                        AuthPage(
                            onGoogleSignInRequested = onGoogleSignInRequested,
                            onSuccess = { navigator.replace(NavKey.ChatKey()) },
                        )
                    }
                    entry<NavKey.SplashScreenKey> { currentDestinationKey ->
                        SplashScreenPage(
                            onSplashComplete = {
                                navigator.replace(if (currentUserUid == null) NavKey.AuthKey else NavKey.ChatKey())
                            },
                        )
                    }
                    entry<NavKey.GamifiedOnboardingKey> { currentDestinationKey ->
                        GamifiedOnboardingDialog(
                            isOpen = true,
                            onDismiss = { navigator.goBack() },
                            onComplete = { navigator.replace(NavKey.CatalogKey) },
                            onLaunchVirtualTryOn = { pickImage() },
                            onOpenPaymentWallet = { navigator.navigate(NavKey.PaymentWalletKey) },
                            onOpenWardrobe = { navigator.navigate(NavKey.WardrobeKey()) },
                        )
                    }
                    entry<NavKey.EmailVerificationKey> { currentDestinationKey ->
                        ProfilePage(
                            userUid = currentUserUid,
                            userName = currentUserName,
                            apiClient = apiClient,
                            themeMode = themeMode,
                            onThemeModeChange = { themeMode = it },
                            onSignOut = { navigator.resetTo(NavKey.AuthKey) },
                            onVerifyEmail = onVerifyEmailRequested,
                            onNavigateToWearables = { navigator.navigate(NavKey.MetaWearablesKey) },
                        )
                    }

                    // 2. Personal AI Shopper / Chat Flow
                    entry<NavKey.ChatKey> { currentDestinationKey ->
                        PersonalAIShopperChatPage(
                            chatViewModel = chatViewModel,
                            isVideoPlaying = isVideoPlaying,
                            isVoiceRecording = isVoiceRecording,
                            liveTranscript = chatViewModel.liveTranscript,
                            userName = currentUserName,
                            errorMessage = errorMessage,
                            userLatLng = currentLatLng,
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
                            onAddToCart = { product ->
                                scope.launch {
                                    try {
                                        apiClient.recordInteraction(product.id, "add_to_cart")
                                    } catch (_: Exception) { }
                                }
                                catalogViewModel.initiateCheckout(product)
                                navigator.navigate(NavKey.HITLCheckoutKey)
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
                                chatViewModel.sendMessage(prompt = prompt, location = null, agentType = "SHOPPING_CONCIERGE")
                                navigator.navigate(NavKey.ChatKey())
                            },
                            onToggleVoice = {
                                if (isVoiceRecording) {
                                    audioRecorder.stopRecording()
                                    liveApiClient.close()
                                    isVoiceRecording = false
                                } else {
                                    audioRecorder.onAudioChunk = { chunk ->
                                        scope.launch {
                                            @OptIn(ExperimentalEncodingApi::class)
                                            liveApiClient.sendAudioChunk(Base64.Default.encode(chunk))
                                        }
                                    }
                                    audioRecorder.startRecording()
                                    if (audioRecorder.isRecording()) {
                                        scope.launch {
                                            liveApiClient.connect(
                                                onReceiveAudio = { chunk -> audioPlayer.playChunk(chunk) },
                                                onReceiveText = { text -> chatViewModel.liveTranscript = text },
                                            )
                                        }
                                        isVoiceRecording = true
                                    }
                                }
                            },
                        )
                    }
                    entry<NavKey.ChatbotCanvasKey> { currentDestinationKey ->
                        PersonalAIShopperChatPage(
                            chatViewModel = chatViewModel,
                            isVideoPlaying = isVideoPlaying,
                            isVoiceRecording = isVoiceRecording,
                            liveTranscript = chatViewModel.liveTranscript,
                            userName = currentUserName,
                            errorMessage = errorMessage,
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
                                chatViewModel.sendMessage(prompt = prompt, location = null, agentType = "SHOPPING_CONCIERGE")
                                navigator.navigate(NavKey.ChatKey())
                            },
                        )
                    }

                    // 3. Product Catalog & Curation Flow
                    entry<NavKey.CatalogKey> { currentDestinationKey ->
                        ProductCatalogPage(
                            apiClient = apiClient,
                            httpClient = apiClient.client,
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
                            onAskAI = { prompt ->
                                navigator.navigate(NavKey.ChatKey(initialPrompt = prompt))
                            },
                            onCheckoutRequested = {
                                navigator.navigate(NavKey.HITLCheckoutKey)
                            },
                        )
                    }
                    entry<NavKey.ProductCatalogScreenKey> { currentDestinationKey ->
                        ProductCatalogPage(
                            apiClient = apiClient,
                            httpClient = apiClient.client,
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
                            onAskAI = { prompt ->
                                navigator.navigate(NavKey.ChatKey(initialPrompt = prompt))
                            },
                            onCheckoutRequested = {
                                navigator.navigate(NavKey.HITLCheckoutKey)
                            },
                        )
                    }
                    entry<NavKey.ProductDetailKey> { currentDestinationKey ->
                        var detailProduct by remember { mutableStateOf<ProductItem?>(null) }
                        var loadError by remember { mutableStateOf<String?>(null) }

                        LaunchedEffect(currentDestinationKey.productId) {
                            try {
                                detailProduct = apiClient.fetchProduct(currentDestinationKey.productId)
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
                                onTryOn = { product ->
                                    activeProductId = product.id
                                    pickImage()
                                },
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
                                            apiClient.recordInteraction(currentProduct.id, "like")
                                            errorMessage = "Saved to your favorites."
                                        } catch (e: Exception) {
                                            errorMessage = "Failed to save to favorites."
                                        }
                                    }
                                },
                                onShare = { id -> onShare(id) },
                                onBuyNow = {
                                    catalogViewModel.initiateCheckout(currentProduct)
                                    navigator.navigate(NavKey.HITLCheckoutKey)
                                },
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
                                curatedProducts = apiClient.discoverPersonalizedProducts()
                            } catch (e: Exception) {
                                curationError = "Recommendations are unavailable right now. Please try again later."
                            }
                        }
                        when {
                            curationError != null -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                                Text(curationError!!, color = MaterialTheme.colorScheme.error)
                            }
                            curatedProducts == null -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator() }
                            else -> AICurationFeed(
                                curatedProducts = curatedProducts!!,
                                httpClient = apiClient.client,
                                onTryOnRequested = { product ->
                                    activeProductId = product.id
                                    pickImage()
                                },
                            )
                        }
                    }

                    // 4. Wardrobe & Virtual Try-On Flow
                    entry<NavKey.WardrobeKey> { currentDestinationKey ->
                        WardrobeViewPage(
                            displayMediaUrl = currentDestinationKey.displayMediaUrl ?: displayMediaUrl,
                            httpClient = apiClient.client,
                            currentLatLng = currentLatLng,
                            onPickImageRequested = { pickImage() },
                            onShareRequested = onShare,
                        )
                    }
                    entry<NavKey.WardrobeMainKey> { currentDestinationKey ->
                        WardrobePage(
                            onNavigateToTryOn = { id ->
                                activeProductId = id
                                pickImage()
                            },
                            onOpenLens = { navigator.navigate(NavKey.SmartVisionKey()) },
                        )
                    }
                    entry<NavKey.StackedWardrobeDecksKey> { currentDestinationKey ->
                        var recommendedProducts by remember { mutableStateOf<List<ProductItem>?>(null) }
                        var likedProducts by remember { mutableStateOf<List<ProductItem>>(emptyList()) }
                        var recommendationsError by remember { mutableStateOf<String?>(null) }
                        LaunchedEffect(Unit) {
                            try {
                                recommendedProducts = apiClient.discoverPersonalizedProducts()
                            } catch (e: Exception) {
                                recommendationsError = "Live product recommendations are unavailable right now."
                                recommendedProducts = emptyList()
                            }
                            runCatching {
                                likedProducts = apiClient.fetchFavorites()
                            }
                        }
                        ColumnWithRouteMessage(recommendationsError) {
                            StackedWardrobeDecks(
                                products = recommendedProducts.orEmpty(),
                                likedProducts = likedProducts,
                                onSelectTryOn = { product ->
                                    activeProductId = product.id
                                    pickImage()
                                },
                                onOpenUploadModal = { pickImage() },
                            )
                        }
                    }
                    entry<NavKey.GallerySyncDisabledKey> { currentDestinationKey ->
                        GallerySyncDisabledView(
                            onGrant = { pickImage() },
                        )
                    }

                    // 5. Smart Vision & Lens Flow
                    entry<NavKey.SmartVisionKey> { currentDestinationKey ->
                        SmartVisionPage(
                            apiClient = apiClient,
                            onSelectProduct = { productId ->
                                activeProductId = productId
                                navigator.navigate(NavKey.CatalogKey)
                            },
                        )
                    }
                    entry<NavKey.SmartVisionDetectionKey> { currentDestinationKey ->
                        var detectedItem by remember { mutableStateOf<DetectedItem?>(null) }
                        var loadError by remember { mutableStateOf<String?>(null) }

                        LaunchedEffect(Unit) {
                            try {
                                detectedItem = apiClient.fetchDetection("latest")
                            } catch (e: Exception) {
                                loadError = "Failed to load detection details"
                            }
                        }

                        val currentDetection = detectedItem
                        if (currentDetection != null) {
                            SmartVisionDetectionOverlay(
                                item = currentDetection,
                                matchedProduct = null,
                                width = 300.dp,
                                height = 400.dp,
                                apiClient = apiClient,
                                onSelectProduct = { id ->
                                    activeProductId = id
                                    navigator.navigate(NavKey.CatalogKey)
                                },
                                onHitlCheckout = {
                                    navigator.navigate(NavKey.HITLCheckoutKey)
                                },
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

                    // 6. Grocery & Ingredients Flow
                    entry<NavKey.GroceryKey> { currentDestinationKey ->
                        GroceryListPage(
                            apiClient = apiClient,
                            onAskAI = { prompt ->
                                navigator.navigate(NavKey.ChatKey(initialPrompt = prompt))
                            },
                        )
                    }
                    entry<NavKey.IngredientChecklistKey> { currentDestinationKey ->
                        var sampleGrocery by remember { mutableStateOf<GroceryItem?>(null) }
                        var loadError by remember { mutableStateOf<String?>(null) }

                        LaunchedEffect(currentDestinationKey.recipeName) {
                            try {
                                sampleGrocery = apiClient.fetchRecipe(currentDestinationKey.recipeName)
                            } catch (e: Exception) {
                                loadError = "Failed to load recipe ingredients"
                            }
                        }

                        val currentGrocery = sampleGrocery
                        if (currentGrocery != null) {
                            IngredientChecklistCard(
                                item = currentGrocery,
                                onToggle = { itemId ->
                                    scope.launch {
                                        try {
                                            if (apiClient.toggleGroceryItem(itemId, !currentGrocery.checked)) {
                                                sampleGrocery = currentGrocery.copy(checked = !currentGrocery.checked)
                                            } else {
                                                loadError = "Unable to update this ingredient. Please try again."
                                            }
                                        } catch (e: Exception) {
                                            loadError = "Unable to update this ingredient. Please try again."
                                        }
                                    }
                                },
                                onDelete = { itemId ->
                                    scope.launch {
                                        try {
                                            if (apiClient.deleteGroceryItem(itemId)) {
                                                navigator.goBack()
                                            } else {
                                                loadError = "Unable to remove this ingredient. Please try again."
                                            }
                                        } catch (e: Exception) {
                                            loadError = "Unable to remove this ingredient. Please try again."
                                        }
                                    }
                                },
                                onAskAI = {
                                    navigator.navigate(
                                        NavKey.ChatKey(initialPrompt = "Suggest recipes for ${currentGrocery.name}"),
                                    )
                                },
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

                    // 7. Orders & Checkout Flow
                    entry<NavKey.OrdersKey> { currentDestinationKey ->
                        OrdersTrackerPage(
                            apiClient = apiClient,
                            onAskAI = { prompt ->
                                navigator.navigate(NavKey.ChatKey(initialPrompt = prompt))
                            },
                        )
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
                                if (returnReason.isBlank()) {
                                    returnError = "Tell us why you would like to return this order."
                                } else {
                                    scope.launch {
                                        isSubmittingReturn = true
                                        try {
                                            val response = apiClient.requestOrderReturn(currentDestinationKey.orderId, returnReason.trim())
                                            if (response["success"]?.jsonPrimitive?.boolean == true) {
                                                returnResultMessage = "Your return request was submitted. We'll send the next steps when they are ready."
                                                navigator.replace(NavKey.OrderReturnResultKey(currentDestinationKey.orderId))
                                            } else {
                                                returnError = "Unable to submit this return. Please try again."
                                            }
                                        } catch (e: Exception) {
                                            returnError = "Unable to submit this return. Please try again."
                                        } finally {
                                            isSubmittingReturn = false
                                        }
                                    }
                                }
                            },
                        )
                        returnError?.let { message ->
                            Text(message, color = MaterialTheme.colorScheme.error, modifier = Modifier.padding(24.dp))
                        }
                    }
                    entry<NavKey.OrderReturnResultKey> { currentDestinationKey ->
                        OrderReturnResultCard(
                            msg = returnResultMessage ?: "Return details are unavailable. Open order history to check the latest status.",
                            onDismiss = {
                                returnResultMessage = null
                                navigator.goBack()
                            },
                        )
                    }
                    entry<NavKey.HITLCheckoutKey> { currentDestinationKey ->
                        val payload by catalogViewModel.hitlCheckoutPayload.collectAsState()
                        val checkoutStatus by catalogViewModel.checkoutStatus.collectAsState()
                        when {
                            payload != null -> MerchantHandoffDialog(
                                payload = payload,
                                onDismiss = {
                                    catalogViewModel.dismissCheckout()
                                    navigator.goBack()
                                },
                            )
                            else -> ColumnWithRouteMessage(
                                checkoutStatus ?: "Choose a product before starting checkout.",
                            ) {}
                        }
                    }

                    // 8. Creator Agents & Studio Flow
                    entry<NavKey.CreatorKey> { currentDestinationKey ->
                        CreatorAgentsPage(
                            apiClient = apiClient,
                            selectedTemplateId = currentDestinationKey.selectedTemplateId.ifEmpty { selectedTemplateId },
                            onTemplateSelected = { id -> selectedTemplateId = id },
                        )
                    }
                    entry<NavKey.CreatorTemplatesKey> { currentDestinationKey ->
                        CreatorTemplatesSection(
                            apiClient = apiClient,
                            scope = scope,
                        )
                    }
                    entry<NavKey.CreatorAgentsSectionKey> { currentDestinationKey ->
                        CreatorAgentsSection(
                            apiClient = apiClient,
                            scope = scope,
                        )
                    }

                    // 9. Travel & Expenses Flow
                    entry<NavKey.TravelKey> { currentDestinationKey ->
                        TravelTripsPage(
                            apiClient = apiClient,
                            onAskAI = { prompt ->
                                navigator.navigate(NavKey.ChatKey(initialPrompt = prompt))
                            },
                        )
                    }
                    entry<NavKey.TravelQrModalKey> { currentDestinationKey ->
                        if (
                            currentDestinationKey.qrData.isBlank() ||
                            currentDestinationKey.qrData == "SPRESSO-PASS-2026"
                        ) {
                            ColumnWithRouteMessage("This pass is unavailable. Open a confirmed itinerary item to view its QR code.") {}
                        } else {
                            QrModal(
                                title = currentDestinationKey.eventTitle,
                                location = currentDestinationKey.eventLocation,
                                qrData = currentDestinationKey.qrData,
                                onClose = { navigator.goBack() },
                            )
                        }
                    }
                    entry<NavKey.TravelReceiptScannerKey> { currentDestinationKey ->
                        TravelTripsPage(apiClient = apiClient, onAskAI = { prompt -> navigator.navigate(NavKey.ChatKey(initialPrompt = prompt)) })
                    }
                    entry<NavKey.TravelVoiceNotesKey> { currentDestinationKey ->
                        TravelTripsPage(apiClient = apiClient, onAskAI = { prompt -> navigator.navigate(NavKey.ChatKey(initialPrompt = prompt)) })
                    }
                    entry<NavKey.TravelBoardingPassKey> { currentDestinationKey ->
                        TravelTripsPage(apiClient = apiClient, onAskAI = { prompt -> navigator.navigate(NavKey.ChatKey(initialPrompt = prompt)) })
                    }

                    // 10. Profile & Account Settings Flow
                    entry<NavKey.ProfileKey> { currentDestinationKey ->
                        ProfilePage(
                            userUid = currentUserUid,
                            userName = currentUserName,
                            apiClient = apiClient,
                            themeMode = themeMode,
                            onThemeModeChange = { themeMode = it },
                            onSignOut = {
                                navigator.replace(NavKey.AuthKey)
                            },
                            onVerifyEmail = onVerifyEmailRequested,
                            onNavigateToFavorites = {
                                navigator.navigate(ActionDestination.resolve(SpressoAction.OpenSavedListings))
                            },
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
                            onSignOut = { navigator.resetTo(NavKey.AuthKey) },
                            onVerifyEmail = onVerifyEmailRequested,
                            onNavigateToFavorites = {
                                navigator.navigate(ActionDestination.resolve(SpressoAction.OpenSavedListings))
                            },
                            onNavigateToOrderHistory = { navigator.navigate(NavKey.OrdersKey) },
                            onNavigateToNotifications = { navigator.navigate(NavKey.PreferencesKey) },
                            onNavigateToWearables = { navigator.navigate(NavKey.MetaWearablesKey) },
                            onNavigateToPrivacySecurity = { navigator.navigate(NavKey.LegalSecurityKey) },
                            onNavigateToSupport = { navigator.navigate(NavKey.SupportKey) },
                        )
                    }
                    entry<NavKey.PaymentWalletKey> { currentDestinationKey ->
                        PaymentWalletRoute(userUid = currentUserUid, apiClient = apiClient)
                    }
                    entry<NavKey.SubscriptionMembershipKey> { currentDestinationKey ->
                        SubscriptionMembershipRoute(userUid = currentUserUid, apiClient = apiClient)
                    }
                    entry<NavKey.LegalSecurityKey> { currentDestinationKey ->
                        ColumnWithRouteMessage(null) { LegalSecuritySection() }
                    }
                    entry<NavKey.PreferencesKey> { currentDestinationKey ->
                        PreferencesRoute(
                            userUid = currentUserUid,
                            apiClient = apiClient,
                            themeMode = themeMode,
                            onThemeModeChange = { themeMode = it },
                        )
                    }
                    entry<NavKey.SupportKey> { currentDestinationKey ->
                        SupportPage()
                    }

                    // 11. Wearables & Spatial Flow
                    entry<NavKey.MetaWearablesKey> { currentDestinationKey ->
                        MetaWearablesPage(
                            isConnected = false,
                            batteryPercent = 0,
                            glassesModelName = "Meta smart glasses",
                            isCameraStreaming = false,
                            onPairClick = {},
                            onStartHandsFreeCheckout = {},
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
        modifier = Modifier.fillMaxSize().windowInsetsPadding(androidx.compose.foundation.layout.WindowInsets.safeDrawing).padding(24.dp),
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
