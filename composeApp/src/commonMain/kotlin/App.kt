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
import components.features.profile.PreferencesSection
import components.features.profile.ProfilePage
import components.features.profile.SubscriptionMembershipSection
import components.features.spatial.LiquidGlassCard
import components.features.travel.BoardingPassList
import components.features.travel.ItineraryEvent
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
import navigation.rememberSaveableNavBackStack
import network.ApiClient
import network.DetectedItem
import network.LiveApiClient
import network.ProductItem
import network.models.GroceryItem
import network.models.SubscriptionTier
import theme.AppTheme
import theme.ThemeMode
import ui.rememberImagePicker

/**
 * Main Application Root composable with Type-Safe Navigation 3 routing for Compose Multiplatform.
 * Orchestrates 25+ screens, modals, dialogs, overlays, and adaptive destinations.
 */
@Composable
fun App(
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
    onEmailSignInRequested: (String, String) -> Unit = { _, _ -> },
    onEmailSignUpRequested: (String, String, String) -> Unit = { _, _, _ -> },
    onVerifyEmailRequested: () -> Unit = {},
    externalNavKey: NavKey? = null
) {
    var themeMode by rememberSaveable { mutableStateOf(ThemeMode.SYSTEM) }

    AppTheme(themeMode = themeMode) {
        val initialKey = if (currentUserUid == null) NavKey.AuthKey else NavKey.ChatKey()
        val backStack = rememberSaveableNavBackStack(initialKey = initialKey)

        LaunchedEffect(externalNavKey) {
            externalNavKey?.let { backStack.push(it) }
        }

        if (currentUserUid == null) {
            AuthPage(
                onGoogleSignInRequested = onGoogleSignInRequested,
                onEmailSignInRequested = onEmailSignInRequested,
                onEmailSignUpRequested = onEmailSignUpRequested
            )
            return@AppTheme
        }

        val scope = rememberCoroutineScope()
        val apiClient = remember { ApiClient() }
        val liveApiClient = remember { LiveApiClient() }
        val chatViewModel = remember { viewmodels.ChatViewModel(apiClient, scope, liveApiClient) }
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
        var liveTranscript by remember { mutableStateOf("") }
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
                            backStack.push(NavKey.WardrobeKey(displayMediaUrl = displayMediaUrl, isVideoPlaying = false))
                        } catch (e: Exception) {
                            errorMessage = "Error: Failed to fetch Virtual Try-On."
                            isVideoPlaying = false
                        }
                    }
                }
            }
        )

        MainAppTemplate(
            currentKey = backStack.currentKey,
            onNavigate = { targetKey -> backStack.switchTab(targetKey) },
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
                        scope.launch {
                            liveApiClient.connect(
                                onReceiveAudio = { chunk -> audioPlayer.playChunk(chunk) },
                                onReceiveText = { text -> liveTranscript = text }
                            )
                        }
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
                backStack.push(NavKey.ChatKey())
            }
        ) { currentDestinationKey ->
            when (currentDestinationKey) {
                // 1. Auth & Onboarding Flow
                is NavKey.AuthKey -> {
                    AuthPage(
                        onGoogleSignInRequested = onGoogleSignInRequested,
                        onEmailSignInRequested = onEmailSignInRequested,
                        onEmailSignUpRequested = onEmailSignUpRequested
                    )
                }
                is NavKey.SplashScreenKey -> {
                    SplashScreenPage(
                        onSplashComplete = {
                            backStack.replace(if (currentUserUid == null) NavKey.AuthKey else NavKey.ChatKey())
                        }
                    )
                }
                is NavKey.GamifiedOnboardingKey -> {
                    GamifiedOnboardingDialog(
                        isOpen = true,
                        onDismiss = { backStack.pop() },
                        onComplete = { backStack.replace(NavKey.CatalogKey) }
                    )
                }
                is NavKey.EmailVerificationKey -> {
                    ProfilePage(
                        userUid = currentUserUid,
                        userName = currentUserName,
                        apiClient = apiClient,
                        themeMode = themeMode,
                        onThemeModeChange = { themeMode = it },
                        onSignOut = { backStack.replace(NavKey.AuthKey) },
                        onVerifyEmail = onVerifyEmailRequested
                    )
                }

                // 2. Personal AI Shopper / Chat Flow
                is NavKey.ChatKey -> {
                    PersonalAIShopperChatPage(
                        chatViewModel = chatViewModel,
                        isVideoPlaying = isVideoPlaying,
                        isVoiceRecording = isVoiceRecording,
                        liveTranscript = liveTranscript,
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
                        onAddToCart = { _ -> },
                        onSelectTryOn = { product ->
                            activeProductId = product.id
                            pickImage()
                        },
                        initialPrompt = currentDestinationKey.initialPrompt,
                        initialImage = currentDestinationKey.initialImage,
                        apiClient = apiClient
                    )
                }
                is NavKey.GlobalChatOverlayKey -> {
                    GlobalChatOverlay(
                        isVisible = true,
                        onDismissRequest = { backStack.pop() },
                        onSendMessage = { prompt ->
                            chatViewModel.sendMessage(prompt = prompt, location = null, agentType = "SHOPPING_CONCIERGE")
                            backStack.push(NavKey.ChatKey())
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
                                            onReceiveText = { text -> liveTranscript = text }
                                        )
                                    }
                                    isVoiceRecording = true
                                }
                            }
                        }
                    )
                }
                is NavKey.ChatbotCanvasKey -> {
                    PersonalAIShopperChatPage(
                        chatViewModel = chatViewModel,
                        isVideoPlaying = isVideoPlaying,
                        isVoiceRecording = isVoiceRecording,
                        liveTranscript = liveTranscript,
                        userName = currentUserName,
                        errorMessage = errorMessage,
                        apiClient = apiClient
                    )
                }
                is NavKey.ChatDiscoveryCardKey -> {
                    DiscoveryCard(
                        id = "discovery_1",
                        badge = "Trending",
                        isErrorTheme = false,
                        icon = Icons.Default.AutoAwesome,
                        title = "Explore New Arrivals",
                        subtitle = "Curated luxury styles tailored to your taste.",
                        prompt = "Show me trending fashion items",
                        onClick = { prompt ->
                            chatViewModel.sendMessage(prompt = prompt, location = null, agentType = "SHOPPING_CONCIERGE")
                            backStack.push(NavKey.ChatKey())
                        }
                    )
                }

                // 3. Product Catalog & Curation Flow
                is NavKey.CatalogKey -> {
                    ProductCatalogPage(
                        apiClient = apiClient,
                        httpClient = apiClient.client,
                        onProductSelected = { id ->
                            activeProductId = id
                            scope.launch {
                                try {
                                    displayMediaUrl = apiClient.requestSpin360(id)
                                    isVideoPlaying = true
                                    backStack.push(NavKey.WardrobeKey(displayMediaUrl = displayMediaUrl, isVideoPlaying = true))
                                } catch (e: Exception) {
                                    errorMessage = "Failed to fetch Spin 360: ${e.message}"
                                }
                            }
                        },
                        onTryOnRequested = { product ->
                            activeProductId = product.id
                            pickImage()
                        },
                        onShareRequested = onShare,
                        onAskAI = { prompt ->
                            backStack.push(NavKey.ChatKey(initialPrompt = prompt))
                        }
                    )
                }
                is NavKey.ProductCatalogScreenKey -> {
                    ProductCatalogScreen(
                        onProductSelected = { id ->
                            activeProductId = id
                            backStack.push(NavKey.ProductDetailKey(id))
                        },
                        onTryOnRequested = { product ->
                            activeProductId = product.id
                            pickImage()
                        },
                        onShareRequested = onShare,
                        onAskAI = { prompt ->
                            backStack.push(NavKey.ChatKey(initialPrompt = prompt))
                        }
                    )
                }
                is NavKey.ProductDetailKey -> {
                    val detailProduct = ProductItem(
                        id = currentDestinationKey.productId,
                        name = "Product ${currentDestinationKey.productId}",
                        brand = "Spresso Select",
                        price = 129.99,
                        rating = 4.8,
                        category = "Fashion",
                        imageUrl = ""
                    )
                    ProductCatalogDetailDialog(
                        product = detailProduct,
                        checkoutStatus = null,
                        onDismiss = { backStack.pop() },
                        onTryOn = { product ->
                            activeProductId = product.id
                            pickImage()
                        },
                        onSpin360 = { id ->
                            scope.launch {
                                try {
                                    displayMediaUrl = apiClient.requestSpin360(id)
                                    isVideoPlaying = true
                                    backStack.push(NavKey.WardrobeKey(displayMediaUrl = displayMediaUrl, isVideoPlaying = true))
                                } catch (e: Exception) {
                                    errorMessage = "Failed to fetch Spin 360: ${e.message}"
                                }
                            }
                        },
                        onLike = {},
                        onShare = onShare,
                        onBuyNow = { backStack.push(NavKey.HITLCheckoutKey) }
                    )
                }
                is NavKey.AICurationFeedKey -> {
                    AICurationFeed(
                        products = emptyList(),
                        onSelectProduct = { id ->
                            activeProductId = id
                            backStack.push(NavKey.CatalogKey)
                        },
                        onTryOn = { product ->
                            activeProductId = product.id
                            pickImage()
                        }
                    )
                }

                // 4. Wardrobe & Virtual Try-On Flow
                is NavKey.WardrobeKey -> {
                    WardrobeViewPage(
                        displayMediaUrl = currentDestinationKey.displayMediaUrl ?: displayMediaUrl,
                        httpClient = apiClient.client,
                        onPickImageRequested = { pickImage() },
                        onShareRequested = onShare
                    )
                }
                is NavKey.WardrobeMainKey -> {
                    WardrobePage(
                        onNavigateToTryOn = { id ->
                            activeProductId = id
                            pickImage()
                        },
                        onOpenLens = { backStack.push(NavKey.SmartVisionKey()) }
                    )
                }
                is NavKey.StackedWardrobeDecksKey -> {
                    StackedWardrobeDecks(
                        products = emptyList(),
                        onSelectTryOn = { product ->
                            activeProductId = product.id
                            pickImage()
                        },
                        onOpenUploadModal = { pickImage() }
                    )
                }
                is NavKey.GallerySyncDisabledKey -> {
                    GallerySyncDisabledView(
                        onGrant = { pickImage() }
                    )
                }

                // 5. Smart Vision & Lens Flow
                is NavKey.SmartVisionKey -> {
                    SmartVisionPage(
                        apiClient = apiClient,
                        onSelectProduct = { productId ->
                            activeProductId = productId
                            backStack.push(NavKey.CatalogKey)
                        }
                    )
                }
                is NavKey.SmartVisionDetectionKey -> {
                    val detectedItem = DetectedItem(
                        detectedName = "Designer Jacket",
                        brandGuess = "Acne Studios",
                        category = "Outerwear",
                        priceEstimate = 450.0
                    )
                    SmartVisionDetectionOverlay(
                        item = detectedItem,
                        matchedProduct = null,
                        width = 300.dp,
                        height = 400.dp,
                        apiClient = apiClient,
                        onSelectProduct = { id ->
                            activeProductId = id
                            backStack.push(NavKey.CatalogKey)
                        },
                        onHitlCheckout = {
                            backStack.push(NavKey.HITLCheckoutKey)
                        }
                    )
                }

                // 6. Grocery & Ingredients Flow
                is NavKey.GroceryKey -> {
                    GroceryListPage(
                        apiClient = apiClient,
                        onAskAI = { prompt ->
                            backStack.push(NavKey.ChatKey(initialPrompt = prompt))
                        }
                    )
                }
                is NavKey.IngredientChecklistKey -> {
                    val sampleGrocery = GroceryItem(
                        id = "item-1",
                        name = currentDestinationKey.recipeName,
                        category = "Pantry",
                        quantity = 1,
                        estimatedPrice = 4.99,
                        checked = false
                    )
                    IngredientChecklistCard(
                        item = sampleGrocery,
                        onToggle = {},
                        onDelete = {},
                        onAskAI = { backStack.push(NavKey.ChatKey(initialPrompt = "Suggest recipes for ${sampleGrocery.name}")) }
                    )
                }

                // 7. Orders & Checkout Flow
                is NavKey.OrdersKey -> {
                    OrdersTrackerPage(
                        apiClient = apiClient,
                        onAskAI = { prompt ->
                            backStack.push(NavKey.ChatKey(initialPrompt = prompt))
                        }
                    )
                }
                is NavKey.OrderReturnKey -> {
                    OrderReturnDialog(
                        orderId = currentDestinationKey.orderId,
                        returnReason = "",
                        onReturnReasonChange = {},
                        isSubmittingReturn = false,
                        onDismissRequest = { backStack.pop() },
                        onConfirmReturn = {
                            backStack.replace(NavKey.OrderReturnResultKey(currentDestinationKey.orderId))
                        }
                    )
                }
                is NavKey.OrderReturnResultKey -> {
                    OrderReturnResultCard(
                        msg = "Return label created for Order ${currentDestinationKey.returnId}. Check email for prepaid label.",
                        onDismiss = { backStack.pop() }
                    )
                }
                is NavKey.HITLCheckoutKey -> {
                    HITLCheckoutModal(
                        payload = null,
                        onDismiss = { backStack.pop() },
                        onConfirmPurchase = {
                            backStack.replace(NavKey.OrdersKey)
                        }
                    )
                }

                // 8. Creator Agents & Studio Flow
                is NavKey.CreatorKey -> {
                    CreatorAgentsPage(
                        apiClient = apiClient,
                        selectedTemplateId = currentDestinationKey.selectedTemplateId.ifEmpty { selectedTemplateId },
                        onTemplateSelected = { id -> selectedTemplateId = id }
                    )
                }
                is NavKey.CreatorTemplatesKey -> {
                    CreatorTemplatesSection(
                        selectedTemplate = selectedTemplateId,
                        onSelectTemplate = { selectedTemplateId = it }
                    )
                }
                is NavKey.CreatorAgentsSectionKey -> {
                    CreatorAgentsSection(
                        activeAgentId = "concierge",
                        onSelectAgent = {},
                        isDeployingAgent = false,
                        onDeployAgent = {}
                    )
                }

                // 9. Travel & Expenses Flow
                is NavKey.TravelKey -> {
                    TravelTripsPage(
                        onAskAI = { prompt ->
                            backStack.push(NavKey.ChatKey(initialPrompt = prompt))
                        }
                    )
                }
                is NavKey.TravelQrModalKey -> {
                    val event = ItineraryEvent(
                        title = currentDestinationKey.eventTitle,
                        time = "14:30",
                        type = "flight",
                        location = currentDestinationKey.eventLocation,
                        status = "Confirmed",
                        qrData = currentDestinationKey.qrData
                    )
                    QrModal(
                        activeQrModalEvent = event,
                        onClose = { backStack.pop() }
                    )
                }
                is NavKey.TravelReceiptScannerKey -> {
                    ReceiptScannerSection(
                        activeTripId = currentDestinationKey.activeTripId,
                        tripExpenses = emptyList(),
                        onAddExpense = {}
                    )
                }
                is NavKey.TravelVoiceNotesKey -> {
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
                is NavKey.TravelBoardingPassKey -> {
                    BoardingPassList(
                        tripEvents = emptyList(),
                        onShowQr = { evt ->
                            backStack.push(NavKey.TravelQrModalKey(eventTitle = evt.title, eventLocation = evt.location, qrData = evt.qrData ?: "SPRESSO-PASS"))
                        }
                    )
                }

                // 10. Profile & Account Settings Flow
                is NavKey.ProfileKey -> {
                    ProfilePage(
                        userUid = currentUserUid,
                        userName = currentUserName,
                        apiClient = apiClient,
                        themeMode = themeMode,
                        onThemeModeChange = { themeMode = it },
                        onSignOut = {
                            backStack.replace(NavKey.AuthKey)
                        },
                        onVerifyEmail = onVerifyEmailRequested
                    )
                }
                is NavKey.AccountManagementKey -> {
                    AccountManagementSection(
                        onSignOut = { backStack.replace(NavKey.AuthKey) },
                        onDeactivateAccount = { backStack.replace(NavKey.AuthKey) }
                    )
                }
                is NavKey.PaymentWalletKey -> {
                    PaymentWalletSection(
                        savedCards = emptyList(),
                        onAddPaymentCard = {},
                        onGoogleWalletAction = {}
                    )
                }
                is NavKey.SubscriptionMembershipKey -> {
                    SubscriptionMembershipSection(
                        currentTier = SubscriptionTier.SPRESSO_VIP,
                        renewalDate = "September 1, 2026",
                        onManageSubscription = {}
                    )
                }
                is NavKey.LegalSecurityKey -> {
                    LegalSecuritySection(
                        onShowRefundPolicy = {},
                        onShowPlayPolicy = {},
                        onShowPrivacyTerms = {}
                    )
                }
                is NavKey.PreferencesKey -> {
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
                is NavKey.MetaWearablesKey -> {
                    MetaWearablesPage(
                        onDismiss = { backStack.pop() }
                    )
                }
                is NavKey.SpatialLiquidGlassKey -> {
                    LiquidGlassCard {
                        Text(
                            text = "Spatial Glass Surface Active",
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurface
                        )
                    }
                }
            }
        }
    }
}
