package components.features.chat

import components.models.*

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.getValue
import androidx.compose.runtime.setValue
import components.features.chat.ChatBubbleText
import components.features.chat.AIShopperInputBar
import components.features.chat.ChatEmptyStateCard
import components.features.chat.ChatMessageHeader
import components.features.chat.ChatProductCard
import network.ChatMessage
import network.ProductItem

@Composable
fun PersonalAIShopperChatPanel(
    messages: List<ChatMessage>,
    onSendMessage: (String) -> Unit,
    userName: String? = null,
    onAddToCart: (ProductItem) -> Unit = {},
    onSelectTryOn: (ProductItem) -> Unit = {},
    errorMessage: String? = null,
    userLocation: String? = null,
    isAccessibilityEnabled: Boolean = false,
    hasAccessibilityConsent: Boolean = false,
    onToggleAccessibility: (() -> Unit)? = null,
    onRequestAccessibilityScan: (() -> Unit)? = null,
    onRevokeAccessibilityConsent: (() -> Unit)? = null,
    onTriggerGlobalLens: (() -> Unit)? = null,
    onLaunchCamera: (() -> Unit)? = null,
    isVoiceRecording: Boolean = false,
    onToggleVoiceRecording: (() -> Unit)? = null,
    isSpeaking: Boolean = false,
    isListening: Boolean = false,
    onStopVoice: (() -> Unit)? = null,
    isGenerating: Boolean = false,
    httpClient: io.ktor.client.HttpClient? = null,
    modifier: Modifier = Modifier
) {
    val listState = rememberLazyListState()

    LaunchedEffect(messages.size) {
        if (messages.isNotEmpty()) listState.animateScrollToItem(messages.size)
    }

    Column(
        modifier = modifier.fillMaxSize().background(MaterialTheme.colorScheme.surface),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        LazyColumn(
            state = listState,
            modifier = Modifier
                .weight(1f)
                .widthIn(max = 840.dp)
                .fillMaxWidth()
                .padding(horizontal = 24.dp),
            verticalArrangement = Arrangement.spacedBy(24.dp)
        ) {
            item { ChatEmptyStateCard(userName = userName, userLocation = userLocation, onSelectSuggestion = onSendMessage, modifier = Modifier.padding(top = 24.dp)) }
            items(messages) { message ->
                val isUser = message.isUser
                var visible by remember { mutableStateOf(false) }
                LaunchedEffect(Unit) { visible = true }
                AnimatedVisibility(
                    visible = visible,
                    enter = androidx.compose.animation.slideInVertically(initialOffsetY = { 50 }, animationSpec = androidx.compose.animation.core.tween(300)) + androidx.compose.animation.fadeIn(animationSpec = androidx.compose.animation.core.tween(300))
                ) {
                    Column(modifier = Modifier.fillMaxWidth(), horizontalAlignment = if (isUser) Alignment.End else Alignment.Start, verticalArrangement = Arrangement.spacedBy(4.dp)) {
                        ChatMessageHeader(isUser = isUser, timestamp = message.timestamp)
                    ChatBubbleText(
                        text = message.text, isUser = isUser, thought = message.thought, sources = message.sources,
                        mediaUrl = message.mediaUrl, mediaType = message.mediaType, isStreaming = isGenerating && message == messages.lastOrNull() && !isUser, httpClient = httpClient
                    )
                    if (message.products.isNotEmpty()) {
                        Box(modifier = Modifier.padding(start = if (isUser) 0.dp else 32.dp, top = 8.dp).fillMaxWidth()) {
                            @OptIn(ExperimentalLayoutApi::class)
                            FlowRow(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.spacedBy(8.dp),
                                verticalArrangement = Arrangement.spacedBy(8.dp),
                                maxItemsInEachRow = 2
                            ) {
                                message.products.forEach { product ->
                                    Box(modifier = Modifier.widthIn(max = 240.dp).fillMaxWidth(0.48f)) {
                                        ChatProductCard(product = product, onAddToCart = onAddToCart, onSelectTryOn = onSelectTryOn, httpClient = httpClient)
                                    }
                                }
                            }
                        }
                    }
                    }
                }
            }
            item { Spacer(modifier = Modifier.height(24.dp)) }
        }

        Column(modifier = Modifier.fillMaxWidth(), horizontalAlignment = Alignment.CenterHorizontally) {
            if (errorMessage != null) {
                Text(
                    text = errorMessage,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.error,
                    modifier = Modifier.padding(horizontal = 16.dp, vertical = 4.dp)
                )
            }
            Surface(
                modifier = Modifier.fillMaxWidth(),
                color = MaterialTheme.colorScheme.surfaceContainerLow
            ) {
                Box(modifier = Modifier.fillMaxWidth(), contentAlignment = Alignment.TopCenter) {
                    AIShopperInputBar(
                        onSend = onSendMessage,
                        onOpenLiveCamera = onLaunchCamera,
                        onOpenObjectDetection = onTriggerGlobalLens ?: onLaunchCamera,
                        isVoiceActive = isVoiceRecording,
                        isSpeaking = isSpeaking,
                        isListening = isListening,
                        onToggleVoice = onToggleVoiceRecording,
                        onStopVoice = onStopVoice,
                        isTyping = isGenerating,
                        modifier = Modifier
                            .widthIn(max = 840.dp)
                            .padding(16.dp)
                            .navigationBarsPadding()
                            .imePadding()
                    )
                }
            }
        }
    }
}

