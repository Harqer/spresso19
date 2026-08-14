import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import audio.AudioPlayer
import audio.AudioRecorder
import components.features.auth.AuthPage
import components.features.creators.CreatorAgentsPage
import components.features.grocery.GroceryListPage
import components.features.orders.OrdersTrackerPage
import components.features.chat.PersonalAIShopperChatPage
import components.features.catalog.ProductCatalogPage
import components.features.profile.ProfilePage
import components.features.vision.SmartVisionPage
import components.features.wardrobe.WardrobeViewPage
import components.navigation.MainAppTemplate
import kotlin.io.encoding.Base64
import kotlin.io.encoding.ExperimentalEncodingApi
import kotlinx.coroutines.launch
import navigation.NavKey
import navigation.rememberSaveableNavBackStack
import network.ApiClient
import network.LiveApiClient
import theme.AppTheme
import theme.ThemeMode
import ui.rememberImagePicker

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
    onLensResult: (String) -> Unit = {},
    onGoogleSignInRequested: () -> Unit = {},
    onEmailSignInRequested: (String, String) -> Unit = { _, _ -> },
    onEmailSignUpRequested: (String, String, String) -> Unit = { _, _, _ -> }
) {
    var themeMode by rememberSaveable { mutableStateOf(ThemeMode.SYSTEM) }

    AppTheme(themeMode = themeMode) {
        val initialKey = if (currentUserUid == null) NavKey.AuthKey else NavKey.ChatKey()
        val backStack = rememberSaveableNavBackStack(initialKey = initialKey)

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

        var isVideoPlaying by remember { mutableStateOf(false) }
        var displayMediaUrl by remember { mutableStateOf<String?>(null) }
        var isVoiceRecording by remember { mutableStateOf(false) }
        var activeProductId by remember { mutableStateOf<String?>(null) }
        var liveTranscript by remember { mutableStateOf("") }
        var errorMessage by remember { mutableStateOf<String?>(null) }
        var selectedTemplateId by remember { mutableStateOf("economic") }

        val pickImage = rememberImagePicker { bytes ->
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
        ) { targetKey ->
            when (targetKey) {
                is NavKey.AuthKey -> {
                    AuthPage(
                        onGoogleSignInRequested = onGoogleSignInRequested,
                        onEmailSignInRequested = onEmailSignInRequested,
                        onEmailSignUpRequested = onEmailSignUpRequested
                    )
                }
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
                        onLaunchCamera = { pickImage() },
                        onAddToCart = { _ -> },
                        onSelectTryOn = { product ->
                            activeProductId = product.id
                            pickImage()
                        },
                        initialPrompt = targetKey.initialPrompt,
                        initialImage = targetKey.initialImage,
                        apiClient = apiClient
                    )
                }
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
                is NavKey.GroceryKey -> {
                    GroceryListPage(
                        apiClient = apiClient,
                        onAskAI = { prompt ->
                            backStack.push(NavKey.ChatKey(initialPrompt = prompt))
                        }
                    )
                }
                is NavKey.WardrobeKey -> {
                    WardrobeViewPage(
                        displayMediaUrl = targetKey.displayMediaUrl ?: displayMediaUrl,
                        httpClient = apiClient.client,
                        onPickImageRequested = { pickImage() },
                        onShareRequested = onShare
                    )
                }
                is NavKey.SmartVisionKey -> {
                    SmartVisionPage(
                        apiClient = apiClient,
                        onSelectProduct = { productId ->
                            activeProductId = productId
                            backStack.push(NavKey.CatalogKey)
                        }
                    )
                }
                is NavKey.OrdersKey -> {
                    OrdersTrackerPage(
                        apiClient = apiClient,
                        onAskAI = { prompt ->
                            backStack.push(NavKey.ChatKey(initialPrompt = prompt))
                        }
                    )
                }
                is NavKey.CreatorKey -> {
                    CreatorAgentsPage(
                        apiClient = apiClient,
                        selectedTemplateId = targetKey.selectedTemplateId.ifEmpty { selectedTemplateId },
                        onTemplateSelected = { id -> selectedTemplateId = id }
                    )
                }
                is NavKey.TravelKey -> {
                    components.features.travel.TravelTripsPage(
                        onAskAI = { prompt ->
                            backStack.push(NavKey.ChatKey(initialPrompt = prompt))
                        }
                    )
                }
                is NavKey.ProfileKey -> {
                    ProfilePage(
                        userUid = currentUserUid,
                        userName = currentUserName,
                        apiClient = apiClient,
                        themeMode = themeMode,
                        onThemeModeChange = { themeMode = it },
                        onSignOut = {
                            backStack.push(NavKey.AuthKey)
                        }
                    )
                }
            }
        }
    }
}
