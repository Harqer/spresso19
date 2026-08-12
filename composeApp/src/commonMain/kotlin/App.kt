import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.Box
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import theme.AppTheme
import network.ApiClient
import kotlinx.coroutines.launch
import androidx.compose.material3.FloatingActionButton
import network.LiveApiClient
import audio.AudioRecorder
import kotlin.io.encoding.Base64
import kotlin.io.encoding.ExperimentalEncodingApi
import ui.rememberImagePicker
import network.ProductItem
import components.pages.ProductCatalogPage
import components.pages.PersonalAIShopperChatPage
import components.pages.WardrobeViewPage
import components.pages.CreatorAgentsPage

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Chat
import androidx.compose.material.icons.filled.ShoppingBag
import androidx.compose.material.icons.filled.Checkroom
import androidx.compose.material.icons.filled.Group
import androidx.compose.material.icons.filled.Mic
import androidx.compose.material.icons.filled.Stop

enum class Tab {
    Shop,
    Assistant,
    Wardrobe,
    Agents
}

@OptIn(ExperimentalMaterial3Api::class)
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
        
        var currentTab by rememberSaveable { mutableStateOf(Tab.Assistant) }
        var isVideoPlaying by remember { mutableStateOf(false) }
        var displayMediaUrl by remember { mutableStateOf<String?>(null) }
        var isVoiceRecording by remember { mutableStateOf(false) }
        var activeProductId by remember { mutableStateOf<String?>(null) }
        var liveTranscript by remember { mutableStateOf("") }
        var errorMessage by remember { mutableStateOf<String?>(null) }
        var selectedTemplateId by remember { mutableStateOf("chef") }

        val pickImage = rememberImagePicker { bytes ->
            if (bytes != null) {
                scope.launch {
                    @OptIn(ExperimentalEncodingApi::class)
                    val base64Image = Base64.Default.encode(bytes)
                    try {
                        displayMediaUrl = apiClient.requestVirtualTryOn(base64Image)
                        isVideoPlaying = false
                        currentTab = Tab.Wardrobe // Automatically navigate to wardrobe to see try-on results
                    } catch (e: Exception) {
                        errorMessage = "Error: Failed to fetch Virtual Try-On."
                        isVideoPlaying = false
                    }
                }
            }
        }
        
        Scaffold(
            topBar = {
                TopAppBar(
                    title = {
                        val titleText = when(currentTab) {
                            Tab.Shop -> "Spresso19 Storefront"
                            Tab.Assistant -> "Spresso19 AI Shopper"
                            Tab.Wardrobe -> "Spresso19 Wardrobe"
                            Tab.Agents -> "Spresso19 Creator Agents"
                        }
                        Text(titleText)
                    }
                )
            },
            bottomBar = {
                NavigationBar {
                    NavigationBarItem(
                        selected = currentTab == Tab.Shop,
                        onClick = { currentTab = Tab.Shop },
                        label = { Text("Shop") },
                        icon = { Icon(Icons.Default.ShoppingBag, contentDescription = "Shop") }
                    )
                    NavigationBarItem(
                        selected = currentTab == Tab.Assistant,
                        onClick = { currentTab = Tab.Assistant },
                        label = { Text("Assistant") },
                        icon = { Icon(Icons.AutoMirrored.Filled.Chat, contentDescription = "Assistant") }
                    )
                    NavigationBarItem(
                        selected = currentTab == Tab.Wardrobe,
                        onClick = { currentTab = Tab.Wardrobe },
                        label = { Text("Wardrobe") },
                        icon = { Icon(Icons.Default.Checkroom, contentDescription = "Wardrobe") }
                    )
                    NavigationBarItem(
                        selected = currentTab == Tab.Agents,
                        onClick = { currentTab = Tab.Agents },
                        label = { Text("Agents") },
                        icon = { Icon(Icons.Default.Group, contentDescription = "Agents") }
                    )
                }
            },
            floatingActionButton = {
                if (currentTab == Tab.Assistant) {
                    FloatingActionButton(
                        onClick = {
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
                    ) {
                        if (isVoiceRecording) {
                            Icon(Icons.Default.Stop, contentDescription = "Stop recording")
                        } else {
                            Icon(Icons.Default.Mic, contentDescription = "Start recording")
                        }
                    }
                }
            }
        ) { innerPadding ->
            Box(modifier = Modifier.padding(innerPadding).fillMaxSize()) {
                when(currentTab) {
                    Tab.Shop -> {
                        ProductCatalogPage(
                            apiClient = apiClient,
                            httpClient = apiClient.client,
                            onProductSelected = { id ->
                                activeProductId = id
                                scope.launch {
                                    try {
                                        displayMediaUrl = apiClient.requestSpin360(id)
                                        isVideoPlaying = true
                                        currentTab = Tab.Wardrobe
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
                    }
                    Tab.Assistant -> {
                        PersonalAIShopperChatPage(
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
                    }
                    Tab.Wardrobe -> {
                        WardrobeViewPage(
                            displayMediaUrl = displayMediaUrl,
                            httpClient = apiClient.client,
                            onPickImageRequested = { pickImage() },
                            onShareRequested = onShare
                        )
                    }
                    Tab.Agents -> {
                        CreatorAgentsPage(
                            apiClient = apiClient,
                            selectedTemplateId = selectedTemplateId,
                            onTemplateSelected = { id -> selectedTemplateId = id }
                        )
                    }
                }
            }
        }
    }
}
