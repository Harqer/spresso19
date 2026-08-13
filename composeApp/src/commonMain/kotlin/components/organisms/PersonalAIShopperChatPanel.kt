package components.organisms

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
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
import components.atoms.ChatBubbleText
import components.molecules.AIShopperInputBar
import components.molecules.ChatEmptyStateCard
import components.molecules.ChatMessageHeader
import components.molecules.ChatProductCard
import network.ChatMessage
import network.ProductItem

@Composable
fun PersonalAIShopperChatPanel(
    messages: List<ChatMessage>,
    onSendMessage: (String) -> Unit,
    onAddToCart: (ProductItem) -> Unit = {},
    onSelectTryOn: (ProductItem) -> Unit = {},
    errorMessage: String? = null,
    userLocation: String? = null,
    isAccessibilityEnabled: Boolean = false,
    hasAccessibilityConsent: Boolean = false,
    onToggleAccessibility: (() -> Unit)? = null,
    onRequestAccessibilityScan: (() -> Unit)? = null,
    onRevokeAccessibilityConsent: (() -> Unit)? = null,
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

    Column(modifier = modifier.fillMaxSize().background(MaterialTheme.colorScheme.surface)) {
        Surface(
            modifier = Modifier.fillMaxWidth(), color = MaterialTheme.colorScheme.surfaceContainerLow, tonalElevation = 1.dp,
            border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 12.dp),
                verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    Box(modifier = Modifier.size(40.dp).background(MaterialTheme.colorScheme.primary, shape = RoundedCornerShape(12.dp)), contentAlignment = Alignment.Center) {
                        Icon(Icons.Default.AutoAwesome, null, tint = MaterialTheme.colorScheme.onPrimary, modifier = Modifier.size(22.dp))
                    }
                    Column {
                        Text("AI Personal Shopper", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                        Text(if (userLocation != null) "Shopping near $userLocation" else "Global Marketplace", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
                Surface(
                    onClick = { onToggleAccessibility?.invoke() }, shape = CircleShape, color = MaterialTheme.colorScheme.surfaceContainer,
                    border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant)
                ) {
                    Row(modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        Icon(Icons.Default.LocationOn, null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(14.dp))
                        Text(userLocation ?: "Set Location", style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.SemiBold)
                    }
                }
            }
        }

        if (onToggleAccessibility != null && !hasAccessibilityConsent) {
            Card(modifier = Modifier.fillMaxWidth().padding(12.dp), colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainer)) {
                Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    Text("Screen search access", style = MaterialTheme.typography.titleSmall)
                    Text("Find products on screen with a one-time user-requested scan.", style = MaterialTheme.typography.bodySmall)
                    Button(onClick = onToggleAccessibility) { Text("Review access") }
                }
            }
        }

        LazyColumn(state = listState, modifier = Modifier.weight(1f).padding(horizontal = 16.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
            item { ChatEmptyStateCard(userName = "Shopper", onSelectSuggestion = onSendMessage, modifier = Modifier.padding(top = 16.dp)) }
            items(messages) { message ->
                val isUser = message.isUser
                Column(modifier = Modifier.fillMaxWidth(), horizontalAlignment = if (isUser) Alignment.End else Alignment.Start, verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    ChatMessageHeader(isUser = isUser, timestamp = message.timestamp)
                    ChatBubbleText(
                        text = message.text, isUser = isUser, thought = message.thought, sources = message.sources,
                        mediaUrl = message.mediaUrl, mediaType = message.mediaType, isStreaming = isGenerating && message == messages.lastOrNull() && !isUser, httpClient = httpClient
                    )
                    if (message.products.isNotEmpty()) {
                        Box(modifier = Modifier.padding(start = if (isUser) 0.dp else 32.dp, top = 8.dp).fillMaxWidth(0.9f)) {
                            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                message.products.forEach { product ->
                                    ChatProductCard(product = product, onAddToCart = onAddToCart, onSelectTryOn = onSelectTryOn, httpClient = httpClient)
                                }
                            }
                        }
                    }
                }
            }
            item { Spacer(modifier = Modifier.height(16.dp)) }
        }

        AIShopperInputBar(
            onSend = onSendMessage,
            onOpenLiveCamera = onLaunchCamera,
            onOpenObjectDetection = onLaunchCamera,
            onOpenLensWidget = onRequestAccessibilityScan,
            isVoiceActive = isVoiceRecording,
            isSpeaking = isSpeaking,
            isListening = isListening,
            onToggleVoice = onToggleVoiceRecording,
            onStopVoice = onStopVoice,
            isTyping = isGenerating,
            modifier = Modifier.padding(16.dp)
        )

        if (errorMessage != null) {
            Text(errorMessage, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.error, modifier = Modifier.padding(horizontal = 16.dp, vertical = 4.dp))
        }
    }
}

