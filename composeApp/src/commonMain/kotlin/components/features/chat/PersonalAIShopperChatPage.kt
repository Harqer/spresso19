package components.features.chat

import components.models.*

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.safeDrawing
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import components.features.chat.PersonalAIShopperChatPanel
import viewmodels.ChatViewModel
import kotlinx.coroutines.launch
import network.ChatMessage
import network.ProductItem

@Composable
fun PersonalAIShopperChatPage(
    chatViewModel: ChatViewModel,
    isVideoPlaying: Boolean,
    isVoiceRecording: Boolean,
    liveTranscript: String,
    userName: String? = null,
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
    onTriggerGlobalLens: (() -> Unit)? = null,
    onLaunchCamera: (() -> Unit)? = null,
    onToggleVoiceRecording: (() -> Unit)? = null,
    onAddToCart: (ProductItem) -> Unit = {},
    onSelectTryOn: (ProductItem) -> Unit = {},
    initialPrompt: String? = null,
    initialImage: String? = null,
    apiClient: network.ApiClient = remember { network.ApiClient() },
    modifier: Modifier = Modifier
) {
    val messages = chatViewModel.messages
    val isGenerating = chatViewModel.isGenerating

    LaunchedEffect(initialPrompt, initialImage) {
        if (!initialImage.isNullOrBlank()) {
            chatViewModel.sendCameraSnapshot(initialImage, prompt = initialPrompt)
        } else if (!initialPrompt.isNullOrBlank() && (messages.isEmpty() || messages.last().text != initialPrompt)) {
            chatViewModel.sendMessage(prompt = initialPrompt, location = userLocation, agentType = "SHOPPING_CONCIERGE")
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
            confirmButton = { 
                components.atoms.SpressoButton(
                    text = "I understand",
                    enabled = acknowledged && onAccessibilityConsentAccepted != null, 
                    onClick = { onAccessibilityConsentAccepted?.invoke() },
                    trackingId = "chat_accessibility_consent",
                    trackingAction = "accept"
                ) 
            },
            dismissButton = { 
                components.atoms.SpressoButton(
                    text = "Decline",
                    variant = components.atoms.SpressoButtonVariant.GHOST,
                    onClick = { onDismissAccessibilityDisclosure?.invoke() },
                    trackingId = "chat_accessibility_consent",
                    trackingAction = "decline"
                ) 
            }
        )
    }

    Scaffold(modifier = modifier) { innerPadding ->
        PersonalAIShopperChatPanel(
            messages = messages,
            onSendMessage = { chatViewModel.sendMessage(prompt = it, location = userLocation, agentType = "SHOPPING_CONCIERGE") },
            userName = userName,
            onAddToCart = onAddToCart,
            onSelectTryOn = onSelectTryOn,
            errorMessage = errorMessage ?: chatViewModel.errorMessage,
            userLocation = userLocation,
            isAccessibilityEnabled = isAccessibilityEnabled,
            hasAccessibilityConsent = hasAccessibilityConsent,
            onToggleAccessibility = onToggleAccessibility,
            onRequestAccessibilityScan = onRequestAccessibilityScan,
            onTriggerGlobalLens = onTriggerGlobalLens,
            onRevokeAccessibilityConsent = onRevokeAccessibilityConsent,
            onLaunchCamera = onLaunchCamera,
            isVoiceRecording = isVoiceRecording || chatViewModel.isVoiceActive,
            onToggleVoiceRecording = onToggleVoiceRecording ?: { chatViewModel.toggleVoiceStream() },
            isSpeaking = chatViewModel.isVoiceSpeaking,
            isListening = chatViewModel.isVoiceListening,
            onStopVoice = { chatViewModel.stopVoiceStream() },
            isGenerating = isGenerating,
            httpClient = apiClient.client,
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .consumeWindowInsets(innerPadding)
        )
    }
}

