package components.features.chat

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import components.models.*
import network.ChatMessage
import network.ProductItem

@Composable
fun PersonalAIShopperChatPanel(
    messages: List<ChatMessage>,
    onSendMessage: (String) -> Unit,
    userName: String? = null,
    onAddToCart: (ProductItem) -> Unit = { },
    onSelectTryOn: (ProductItem) -> Unit = { },
    errorMessage: String? = null,
    userLocation: String? = null,
    isAccessibilityEnabled: Boolean = false,
    hasAccessibilityConsent: Boolean = false,
    onToggleAccessibility: (() -> Unit)? = null,
    onRequestAccessibilityScan: (() -> Unit)? = null,
    onRevokeAccessibilityConsent: (() -> Unit)? = null,
    onTriggerGlobalLens: (() -> Unit)? = null,
    onLaunchCamera: (() -> Unit)? = null,
    onRequestLocationPermission: (() -> Unit)? = null,
    isVoiceRecording: Boolean = false,
    onToggleVoiceRecording: (() -> Unit)? = null,
    isSpeaking: Boolean = false,
    isListening: Boolean = false,
    onStopVoice: (() -> Unit)? = null,
    isGenerating: Boolean = false,
    httpClient: io.ktor.client.HttpClient? = null,
    apiClient: network.ApiClient? = null,
    modifier: Modifier = Modifier,
) {
    val listState = rememberLazyListState()

    LaunchedEffect(messages.size) {
        if (messages.isNotEmpty()) listState.animateScrollToItem(messages.size)
    }

    Column(
        modifier = modifier.fillMaxSize().background(MaterialTheme.colorScheme.surface),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        LazyColumn(
            state = listState,
            modifier =
                Modifier
                    .weight(1f)
                    .widthIn(max = 840.dp)
                    .fillMaxWidth()
                    .padding(horizontal = 24.dp),
            verticalArrangement = Arrangement.spacedBy(24.dp),
        ) {
            item {
                ChatEmptyStateCard(
                    userName = userName,
                    userLocation = userLocation,
                    onSelectSuggestion = onSendMessage,
                    modifier = Modifier.padding(top = 24.dp),
                )
            }
            items(messages) { message ->
                components.features.chat.widgets.ChatMessageItem(
                    message = message,
                    isGenerating = isGenerating,
                    isLastMessage = message == messages.lastOrNull(),
                    onAddToCart = onAddToCart,
                    onSelectTryOn = onSelectTryOn,
                    httpClient = httpClient,
                    apiClient = apiClient,
                )
            }
            item { Spacer(modifier = Modifier.height(24.dp)) }
        }

        Column(modifier = Modifier.fillMaxWidth(), horizontalAlignment = Alignment.CenterHorizontally) {
            if (errorMessage != null) {
                Text(
                    text = errorMessage,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.error,
                    modifier = Modifier.padding(horizontal = 16.dp, vertical = 4.dp),
                )
            }
            Surface(
                modifier = Modifier.fillMaxWidth(),
                color = MaterialTheme.colorScheme.surfaceContainerLow,
            ) {
                Box(modifier = Modifier.fillMaxWidth(), contentAlignment = Alignment.TopCenter) {
                    AIShopperInputBar(
                        onSend = onSendMessage,
                        onOpenLiveCamera = onLaunchCamera,
                        onOpenObjectDetection = onTriggerGlobalLens ?: onLaunchCamera,
                        onRequestLocationPermission = onRequestLocationPermission,
                        isVoiceActive = isVoiceRecording,
                        isSpeaking = isSpeaking,
                        isListening = isListening,
                        onToggleVoice = onToggleVoiceRecording,
                        onStopVoice = onStopVoice,
                        isTyping = isGenerating,
                        modifier =
                            Modifier
                                .widthIn(max = 840.dp)
                                .padding(16.dp)
                                .navigationBarsPadding()
                                .imePadding(),
                    )
                }
            }
        }
    }
}
