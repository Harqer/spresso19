import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import audio.AudioRecorder
import components.pages.CreatorAgentsPage
import components.pages.PersonalAIShopperChatPage
import components.pages.ProductCatalogPage
import components.pages.WardrobeViewPage
import components.templates.AppTab
import components.templates.MainAppTemplate
import kotlin.io.encoding.Base64
import kotlin.io.encoding.ExperimentalEncodingApi
import kotlinx.coroutines.launch
import network.ApiClient
import network.LiveApiClient
import theme.AppTheme
import ui.rememberImagePicker

@Composable
fun App(
    onShare: (String) -> Unit = {},
    isAccessibilityEnabled: Boolean = false,
    hasAccessibilityConsent: Boolean = false,
    showAccessibilityDisclosure: Boolean = false,
    onToggleAccessibility: (() -> Unit)? = null,
    onAccessibilityConsentAccepted: (() -> Unit)? = null,
    onDismissAccessibilityDisclosure: (() -> Unit)? = null,
    onRevokeAccessibilityConsent: (() -> Unit)? = null,
    onRequestAccessibilityScan: (() -> Unit)? = null
) {
    AppTheme {
        val scope = rememberCoroutineScope()
        val apiClient = remember { ApiClient() }
        val liveApiClient = remember { LiveApiClient() }
        val audioRecorder = remember { AudioRecorder() }

        var currentTab by rememberSaveable { mutableStateOf(AppTab.Assistant) }
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
                        currentTab = AppTab.Wardrobe
                    } catch (e: Exception) {
                        errorMessage = "Error: Failed to fetch Virtual Try-On."
                        isVideoPlaying = false
                    }
                }
            }
        }

        MainAppTemplate(
            currentTab = currentTab,
            onTabSelected = { currentTab = it },
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
                                onReceiveAudio = { _ -> },
                                onReceiveText = { text -> liveTranscript = text }
                            )
                        }
                        isVoiceRecording = true
                    } else {
                        errorMessage = "Microphone access required for voice AI recording."
                    }
                }
            }
        ) { tab ->
            when (tab) {
                AppTab.Assistant -> PersonalAIShopperChatPage(
                    isVideoPlaying = isVideoPlaying,
                    isVoiceRecording = isVoiceRecording,
                    liveTranscript = liveTranscript,
                    errorMessage = errorMessage,
                    isAccessibilityEnabled = isAccessibilityEnabled,
                    hasAccessibilityConsent = hasAccessibilityConsent,
                    showAccessibilityDisclosure = showAccessibilityDisclosure,
                    onToggleAccessibility = onToggleAccessibility,
                    onAccessibilityConsentAccepted = onAccessibilityConsentAccepted,
                    onDismissAccessibilityDisclosure = onDismissAccessibilityDisclosure,
                    onRevokeAccessibilityConsent = onRevokeAccessibilityConsent,
                    onRequestAccessibilityScan = onRequestAccessibilityScan,
                    onLaunchCamera = { pickImage() }
                )
                AppTab.Shop -> ProductCatalogPage(
                    apiClient = apiClient,
                    httpClient = apiClient.client,
                    onProductSelected = { id ->
                        activeProductId = id
                        scope.launch {
                            try {
                                displayMediaUrl = apiClient.requestSpin360(id)
                                isVideoPlaying = true
                                currentTab = AppTab.Wardrobe
                            } catch (e: Exception) {
                                errorMessage = "Failed to fetch Spin 360: ${e.message}"
                            }
                        }
                    },
                    onTryOnRequested = { product ->
                        activeProductId = product.id
                        pickImage()
                    },
                    onShareRequested = onShare
                )
                AppTab.Wardrobe -> WardrobeViewPage(
                    displayMediaUrl = displayMediaUrl,
                    httpClient = apiClient.client,
                    onPickImageRequested = { pickImage() },
                    onShareRequested = onShare
                )
                AppTab.Agents -> CreatorAgentsPage(
                    apiClient = apiClient,
                    selectedTemplateId = selectedTemplateId,
                    onTemplateSelected = { id -> selectedTemplateId = id }
                )
            }
        }
    }
}
