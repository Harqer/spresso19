package components.pages

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import components.organisms.PersonalAIShopperChatPanel
import viewmodels.ChatViewModel
import kotlinx.coroutines.launch
import network.ChatMessage
import network.ProductItem

@Composable
fun PersonalAIShopperChatPage(
    isVideoPlaying: Boolean,
    isVoiceRecording: Boolean,
    liveTranscript: String,
    errorMessage: String? = null,
    userLocation: String? = null,
    isAccessibilityEnabled: Boolean = false,
    hasAccessibilityConsent: Boolean = false,
    showAccessibilityDisclosure: Boolean = false,
    onToggleAccessibility: (() -> Unit)? = null,
    onAccessibilityConsentAccepted: (() -> Unit)? = null,
    onDismissAccessibilityDisclosure: (() -> Unit)? = null,
    onRevokeAccessibilityConsent: (() -> Unit)? = null,
    onRequestAccessibilityScan: (() -> Unit)? = null,
    onLaunchCamera: (() -> Unit)? = null,
    onToggleVoiceRecording: (() -> Unit)? = null,
    onAddToCart: (ProductItem) -> Unit = {},
    onSelectTryOn: (ProductItem) -> Unit = {},
    initialPrompt: String? = null,
    initialImage: String? = null,
    apiClient: network.ApiClient = remember { network.ApiClient() },
    modifier: Modifier = Modifier
) {
    val scope = rememberCoroutineScope()
    val viewModel = remember { ChatViewModel(apiClient, scope) }
    val messages = viewModel.messages
    val isGenerating = viewModel.isGenerating

    LaunchedEffect(initialPrompt, initialImage) {
        if (!initialImage.isNullOrBlank()) {
            viewModel.sendCameraSnapshot(initialImage, prompt = initialPrompt)
        } else if (!initialPrompt.isNullOrBlank() && (messages.isEmpty() || messages.last().text != initialPrompt)) {
            viewModel.sendMessage(prompt = initialPrompt, location = userLocation, agentType = "SHOPPING_CONCIERGE")
        }
    }

    LaunchedEffect(liveTranscript) {
        if (liveTranscript.isNotEmpty()) {
            messages.add(ChatMessage(id = "live-" + messages.size, text = liveTranscript, isUser = false))
        }
    }

    if (showAccessibilityDisclosure) {
        var acknowledged by remember(showAccessibilityDisclosure) { mutableStateOf(false) }
        AlertDialog(
            onDismissRequest = { onDismissAccessibilityDisclosure?.invoke() },
            title = { Text("Screen search access") },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text("Spresso can capture current app screen after you tap Scan...")
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Checkbox(checked = acknowledged, onCheckedChange = { acknowledged = it })
                        Text("I agree to screen capture and transfer for visual shopping search.")
                    }
                }
            },
            confirmButton = { Button(enabled = acknowledged && onAccessibilityConsentAccepted != null, onClick = { onAccessibilityConsentAccepted?.invoke() }) { Text("I understand") } },
            dismissButton = { TextButton(onClick = { onDismissAccessibilityDisclosure?.invoke() }) { Text("Decline") } }
        )
    }

    Scaffold(modifier = modifier.fillMaxSize()) { innerPadding ->
        PersonalAIShopperChatPanel(
            messages = messages,
            onSendMessage = { viewModel.sendMessage(prompt = it, location = userLocation, agentType = "SHOPPING_CONCIERGE") },
            onAddToCart = onAddToCart,
            onSelectTryOn = onSelectTryOn,
            errorMessage = errorMessage ?: viewModel.errorMessage,
            userLocation = userLocation,
            isAccessibilityEnabled = isAccessibilityEnabled,
            hasAccessibilityConsent = hasAccessibilityConsent,
            onToggleAccessibility = onToggleAccessibility,
            onRequestAccessibilityScan = onRequestAccessibilityScan,
            onRevokeAccessibilityConsent = onRevokeAccessibilityConsent,
            onLaunchCamera = onLaunchCamera,
            isVoiceRecording = isVoiceRecording || viewModel.isVoiceActive,
            onToggleVoiceRecording = onToggleVoiceRecording ?: { viewModel.toggleVoiceStream() },
            isSpeaking = viewModel.isVoiceSpeaking,
            isListening = viewModel.isVoiceListening,
            onStopVoice = { viewModel.stopVoiceStream() },
            isGenerating = isGenerating,
            httpClient = apiClient.client,
            modifier = Modifier.padding(innerPadding)
        )
    }
}

