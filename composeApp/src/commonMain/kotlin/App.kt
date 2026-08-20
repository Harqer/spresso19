import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
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
import audio.AudioPlayer
import audio.AudioRecorder
import components.features.auth.AuthPage
import components.features.catalog.AICurationFeed
import components.features.catalog.ProductCatalogDetailDialog
import components.features.catalog.ProductCatalogPage
import components.features.catalog.screens.ProductCatalogScreen
import components.features.chat.PersonalAIShopperChatPage
import components.features.chat.cards.DiscoveryCard
import components.features.creators.CreatorAgentsPage
import components.features.creators.CreatorAgentsSection
import components.features.creators.CreatorTemplatesSection
import androidx.compose.material3.CircularProgressIndicator
import components.features.grocery.GroceryListPage
import components.features.grocery.IngredientChecklistCard
import components.features.onboarding.GamifiedOnboardingDialog
import components.features.onboarding.SplashScreenPage
import components.shared.HITLCheckoutModal
import components.features.orders.OrderReturnDialog
import components.features.orders.OrderReturnResultCard
import components.features.orders.OrdersTrackerPage
import components.features.profile.AccountManagementSection
import components.features.profile.LegalSecuritySection
import components.features.profile.PaymentWalletSection
import components.features.profile.PreferencesSection
import components.features.profile.ProfilePage
import components.features.profile.SubscriptionMembershipSection
import components.features.spatial.LiquidGlassCard
import components.features.travel.BoardingPassList
import components.models.ItineraryEvent
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
import components.navigation.MainAppTemplate
import components.shared.HITLCheckoutModal
import components.shared.overlays.GlobalChatOverlay
import kotlin.io.encoding.Base64
import kotlin.io.encoding.ExperimentalEncodingApi
import kotlinx.coroutines.launch
import navigation.NavKey
import androidx.navigation3.runtime.entryProvider
import navigation.rememberNavigationState
import navigation.Navigator
import components.navigation.defaultNavDestinations
import network.ApiClient
import network.DetectedItem
import network.LiveApiClient
import network.ProductItem
import network.models.GroceryItem
import network.models.SubscriptionTier
import network.SpressoBackend
import viewmodels.ChatViewModel
import theme.AppTheme
import theme.ThemeMode
import ui.rememberImagePicker

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
    externalNavKey: NavKey? = null
) {
    var themeMode by rememberSaveable { mutableStateOf(ThemeMode.SYSTEM) }

    AppTheme(themeMode = themeMode) {
        val initialKey = if (currentUserUid == null) NavKey.AuthKey else NavKey.ChatKey()
        val navigationState = rememberNavigationState(
            startRoute = initialKey,
            topLevelRoutes = defaultNavDestinations.map { it.key }.toSet()
        )
        val navigator = remember { Navigator(navigationState) }

        LaunchedEffect(externalNavKey) {
            externalNavKey?.let { navigator.navigate(it) }
        }

        val scope = rememberCoroutineScope()
        val apiClient = remember { ApiClient() }
        val liveApiClient = remember { LiveApiClient() }
        val chatViewModel = remember { ChatViewModel(apiClient, scope, liveApiClient) }
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

        val pickImage = rememberImagePicker(
            onFrameCaptured = { frameBytes ->
                if (isVoiceRecording) {
                    @OptIn(ExperimentalEncodingApi::class)
                    chatViewModel.sendLiveVideoFrame(Base64.Default.encode(frameBytes))
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
                            errorMessage = "Error: Failed to fetch Virtual Try-On."
                            isVideoPlaying = false
                        }
                    }
                }
            }
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
                            onReceiveAudio = { chunk -> audioPlayer.playChunk(chunk) }
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
            entryProvider = entryProvider {
                // 1. Auth & Onboarding Flow
                entry<NavKey.AuthKey> { currentDestinationKey ->
                    AuthPage(
                        onGoogleSignInRequested = onGoogleSignInRequested,
                        onSuccess = { navigator.replace(NavKey.ChatKey()) }
                    )
                }
                entry<NavKey.SplashScreenKey> { currentDestinationKey ->
                    SplashScreenPage(
                        onSplashComplete = {
                            navigator.replace(if (currentUserUid == null) NavKey.AuthKey else NavKey.ChatKey())
                        }
                    )
                }
                entry<NavKey.GamifiedOnboardingKey> { currentDestinationKey ->
                    GamifiedOnboardingDialog(
                        isOpen = true,
                        onDismiss = { navigator.goBack() },
                        onComplete = { navigator.replace(NavKey.CatalogKey) }
                    )
                }
                entry<NavKey.EmailVerificationKey> { currentDestinationKey ->
                    ProfilePage(
                        userUid = currentUserUid,
                        userName = currentUserName,
                        apiClient = apiClient,
                        themeMode = themeMode,
                        onThemeModeChange = { themeMode = it },
                        onSignOut = { navigator.replace(NavKey.AuthKey) },
                        onVerifyEmail = onVerifyEmailRequested
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
                        isAccessibilityEnabled = isAccessibilityEnabled,
                        hasAccessibilityConsent = hasAccessibilityConsent,
                        showAccessibilityDisclosure = showAccessibilityDisclosure,
                        onToggleAccessibility = onToggleAccessibility,
                        onAccessibilityConsentAccepted = onAccessibilityConsentAccepted,
                        onDismissAccessibilityDisclosure = onDismissAccessibilityDisclosure,
                        onRevokeAccessibilityConsent = onRevokeAccessibilityConsent,
                        onRequestAccessibilityScan = onRequestAccessibilityScan,
                        onTriggerGlobalLens = onTriggerGlobalLens,
                        onLaunchCamera = { pickImage() },
                        onAddToCart = { product ->
                            scope.launch {
                                try {
                                    apiClient.recordInteraction(product.id, "add_to_cart")
                                    // Using the production default grocery list ID
                                    SpressoBackend.addGroceryItem(
                                        listId = "b90c13bc-33b2-4d1a-8c2f-87000d11f67f",
                                        productName = product.name,
                                        productId = product.id,
                                        addedVia = "CHAT_AI"
                                    )
                                    errorMessage = "Added \${product.name} to cart."
                                } catch (e: Exception) {
                                    errorMessage = "Failed to add to cart: \${e.message}"
                                }
                            }
                        },
                        onSelectTryOn = { product ->
                            activeProductId = product.id
                            pickImage()
                        },
                        initialPrompt = currentDestinationKey.initialPrompt,
                        initialImage = currentDestinationKey.initialImage,
                        apiClient = apiClient
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
                                            onReceiveText = { text -> chatViewModel.liveTranscript = text }
                                        )
                                    }
                                    isVoiceRecording = true
                                }
                            }
                        }
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
                        apiClient = apiClient
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
                        }
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
                        onShareRequested = onShare,
                        onAskAI = { prompt ->
                            navigator.navigate(NavKey.ChatKey(initialPrompt = prompt))
                        }
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
                        onShareRequested = onShare,
                        onAskAI = { prompt ->
                            navigator.navigate(NavKey.ChatKey(initialPrompt = prompt))
                        }
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
                        onBuyNow = { navigator.navigate(NavKey.HITLCheckoutKey) }
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
                    AICurationFeed(
                        curatedProducts = emptyList(),
                        httpClient = apiClient.client,
                        onTryOnRequested = { product ->
                            activeProductId = product.id
                            pickImage()
                        }
                    )
                }

                // 4. Wardrobe & Virtual Try-On Flow
                entry<NavKey.WardrobeKey> { currentDestinationKey ->
                    WardrobeViewPage(
                        displayMediaUrl = currentDestinationKey.displayMediaUrl ?: displayMediaUrl,
                        httpClient = apiClient.client,
                        onPickImageRequested = { pickImage() },
                        onShareRequested = onShare
                    )
                }
                entry<NavKey.WardrobeMainKey> { currentDestinationKey ->
                    WardrobePage(
                        onNavigateToTryOn = { id ->
                            activeProductId = id
                            pickImage()
                        },
                        onOpenLens = { navigator.navigate(NavKey.SmartVisionKey()) }
                    )
                }
                entry<NavKey.StackedWardrobeDecksKey> { currentDestinationKey ->
                    StackedWardrobeDecks(
                        products = emptyList(),
                        onSelectTryOn = { product ->
                            activeProductId = product.id
                            pickImage()
                        },
                        onOpenUploadModal = { pickImage() }
                    )
                }
                entry<NavKey.GallerySyncDisabledKey> { currentDestinationKey ->
                    GallerySyncDisabledView(
                        onGrant = { pickImage() }
                    )
                }

                // 5. Smart Vision & Lens Flow
                entry<NavKey.SmartVisionKey> { currentDestinationKey ->
                    SmartVisionPage(
                        apiClient = apiClient,
                        onSelectProduct = { productId ->
                            activeProductId = productId
                            navigator.navigate(NavKey.CatalogKey)
                        }
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
                            }
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
                        }
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
                            onToggle = {},
                            onDelete = {},
                            onAskAI = { navigator.navigate(NavKey.ChatKey(initialPrompt = "Suggest recipes for ${currentGrocery.name}")) }
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
                        }
                    )
                }
                entry<NavKey.OrderReturnKey> { currentDestinationKey ->
                    OrderReturnDialog(
                        orderId = currentDestinationKey.orderId,
                        returnReason = "",
                        onReturnReasonChange = {},
                        isSubmittingReturn = false,
                        onDismissRequest = { navigator.goBack() },
                        onConfirmReturn = {
                            navigator.replace(NavKey.OrderReturnResultKey(currentDestinationKey.orderId))
                        }
                    )
                }
                entry<NavKey.OrderReturnResultKey> { currentDestinationKey ->
                    OrderReturnResultCard(
                        msg = "Return label created for Order ${currentDestinationKey.returnId}. Check email for prepaid label.",
                        onDismiss = { navigator.goBack() }
                    )
                }
                entry<NavKey.HITLCheckoutKey> { currentDestinationKey ->
                    HITLCheckoutModal(
                        payload = null,
                        onDismiss = { navigator.goBack() },
                        onConfirmPurchase = {
                            navigator.replace(NavKey.OrdersKey)
                        }
                    )
                }

                // 8. Creator Agents & Studio Flow
                entry<NavKey.CreatorKey> { currentDestinationKey ->
                    CreatorAgentsPage(
                        apiClient = apiClient,
                        selectedTemplateId = currentDestinationKey.selectedTemplateId.ifEmpty { selectedTemplateId },
                        onTemplateSelected = { id -> selectedTemplateId = id }
                    )
                }
                entry<NavKey.CreatorTemplatesKey> { currentDestinationKey ->
                    CreatorTemplatesSection(
                        apiClient = apiClient,
                        scope = scope
                    )
                }
                entry<NavKey.CreatorAgentsSectionKey> { currentDestinationKey ->
                    CreatorAgentsSection(
                        apiClient = apiClient,
                        scope = scope
                    )
                }

                // 9. Travel & Expenses Flow
                entry<NavKey.TravelKey> { currentDestinationKey ->
                    TravelTripsPage(
                        onAskAI = { prompt ->
                            navigator.navigate(NavKey.ChatKey(initialPrompt = prompt))
                        }
                    )
                }
                entry<NavKey.TravelQrModalKey> { currentDestinationKey ->
                    val event = ItineraryEvent(
                        id = "evt-qr",
                        tripId = "trip-current",
                        type = "flight",
                        title = currentDestinationKey.eventTitle,
                        description = "Confirmed boarding pass ticket",
                        eventTime = "14:30",
                        location = currentDestinationKey.eventLocation,
                        qrData = currentDestinationKey.qrData
                    )
                    QrModal(
                        activeQrModalEvent = event,
                        onClose = { navigator.goBack() }
                    )
                }
                entry<NavKey.TravelReceiptScannerKey> { currentDestinationKey ->
                    ReceiptScannerSection(
                        activeTripId = currentDestinationKey.activeTripId,
                        tripExpenses = emptyList(),
                        onAddExpense = {}
                    )
                }
                entry<NavKey.TravelVoiceNotesKey> { currentDestinationKey ->
                    VoiceNotesSection(
                        tripVoiceNotes = emptyList(),
                        isRecording = isVoiceRecording,
                        onToggleRecording = {
                            if (isVoiceRecording) {
                                audioRecorder.stopRecording()
                                liveApiClient.close()
                                isVoiceRecording = false
                            } else {
                                audioRecorder.startRecording()
                                isVoiceRecording = true
                            }
                        }
                    )
                }
                entry<NavKey.TravelBoardingPassKey> { currentDestinationKey ->
                    BoardingPassList(
                        tripEvents = emptyList(),
                        onShowQr = { evt ->
                            navigator.navigate(NavKey.TravelQrModalKey(eventTitle = evt.title, eventLocation = evt.location, qrData = evt.qrData ?: "SPRESSO-PASS"))
                        }
                    )
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
                        onVerifyEmail = onVerifyEmailRequested
                    )
                }
                entry<NavKey.AccountManagementKey> { currentDestinationKey ->
                    AccountManagementSection(
                        onSignOut = { navigator.replace(NavKey.AuthKey) },
                        onDeactivateAccount = { navigator.replace(NavKey.AuthKey) }
                    )
                }
                entry<NavKey.PaymentWalletKey> { currentDestinationKey ->
                    PaymentWalletSection(
                        savedCards = emptyList(),
                        onAddPaymentCard = {},
                        onGoogleWalletAction = {}
                    )
                }
                entry<NavKey.SubscriptionMembershipKey> { currentDestinationKey ->
                    SubscriptionMembershipSection(
                        currentTier = SubscriptionTier.SPRESSO_VIP,
                        renewalDate = "September 1, 2026",
                        onManageSubscription = {}
                    )
                }
                entry<NavKey.LegalSecurityKey> { currentDestinationKey ->
                    LegalSecuritySection(
                        onShowRefundPolicy = {},
                        onShowPlayPolicy = {},
                        onShowPrivacyTerms = {}
                    )
                }
                entry<NavKey.PreferencesKey> { currentDestinationKey ->
                    PreferencesSection(
                        isDarkTheme = when (themeMode) {
                            ThemeMode.DARK -> true
                            ThemeMode.LIGHT -> false
                            ThemeMode.SYSTEM -> false
                        },
                        onToggleTheme = {
                            themeMode = if (themeMode == ThemeMode.DARK) ThemeMode.LIGHT else ThemeMode.DARK
                        },
                        notificationsEnabled = true,
                        onToggleNotifications = {},
                        emailAlertsEnabled = true,
                        onToggleEmailAlerts = {}
                    )
                }

                // 11. Wearables & Spatial Flow
                entry<NavKey.MetaWearablesKey> { currentDestinationKey ->
                    MetaWearablesPage(
                        onDismiss = { navigator.goBack() }
                    )
                }
                entry<NavKey.SpatialLiquidGlassKey> { currentDestinationKey ->
                    LiquidGlassCard {
                        Text(
                            text = "Spatial Glass Surface Active",
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurface
                        )
                    }
                }
            }
        )
    }
}
