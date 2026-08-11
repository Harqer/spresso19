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
    onToggleAccessibility: (() -> Unit)? = null
) {
    AppTheme {
        val scope = rememberCoroutineScope()
        val apiClient = remember { ApiClient() }
        val liveApiClient = remember { LiveApiClient() }
        val audioRecorder = remember { AudioRecorder() }
        
        var currentTab by rememberSaveable { mutableStateOf(Tab.Shop) }
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
                        icon = { Text("🛍") }
                    )
                    NavigationBarItem(
                        selected = currentTab == Tab.Assistant,
                        onClick = { currentTab = Tab.Assistant },
                        label = { Text("Assistant") },
                        icon = { Text("💬") }
                    )
                    NavigationBarItem(
                        selected = currentTab == Tab.Wardrobe,
                        onClick = { currentTab = Tab.Wardrobe },
                        label = { Text("Wardrobe") },
                        icon = { Text("🧥") }
                    )
                    NavigationBarItem(
                        selected = currentTab == Tab.Agents,
                        onClick = { currentTab = Tab.Agents },
                        label = { Text("Agents") },
                        icon = { Text("👥") }
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
                            } else {
                                scope.launch {
                                    liveApiClient.connect(
                                        onReceiveAudio = { _ -> },
                                        onReceiveText = { text -> liveTranscript = text }
                                    )
                                }
                                audioRecorder.onAudioChunk = { chunk ->
                                    scope.launch {
                                        @OptIn(ExperimentalEncodingApi::class)
                                        liveApiClient.sendAudioChunk(Base64.Default.encode(chunk))
                                    }
                                }
                                audioRecorder.startRecording()
                            }
                            isVoiceRecording = !isVoiceRecording
                        }
                    ) {
                        if (isVoiceRecording) {
                            Text("🛑")
                        } else {
                            Text("🎙")
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
                            }
                        )
                    }
                    Tab.Assistant -> {
                        PersonalAIShopperChatPage(
                            isVideoPlaying = isVideoPlaying,
                            isVoiceRecording = isVoiceRecording,
                            liveTranscript = liveTranscript,
                            errorMessage = errorMessage,
                            isAccessibilityEnabled = isAccessibilityEnabled,
                            onToggleAccessibility = onToggleAccessibility,
                            onLaunchCamera = { pickImage() }
                        )
                    }
                    Tab.Wardrobe -> {
                        WardrobeViewPage(
                            displayMediaUrl = displayMediaUrl,
                            httpClient = apiClient.client,
                            onPickImageRequested = { pickImage() }
                        )
                    }
                    Tab.Agents -> {
                        CreatorAgentsPage(
                            selectedTemplateId = selectedTemplateId,
                            onTemplateSelected = { id -> selectedTemplateId = id }
                        )
                    }
                }
            }
        }
    }
}
