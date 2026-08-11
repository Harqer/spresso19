package components.pages

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import components.atoms.ChatBubbleText
import components.organisms.ChatbotCanvas

@Composable
fun PersonalAIShopperChatPage(
    isVideoPlaying: Boolean,
    isVoiceRecording: Boolean,
    liveTranscript: String,
    errorMessage: String?,
    isAccessibilityEnabled: Boolean = false,
    onToggleAccessibility: (() -> Unit)? = null,
    modifier: Modifier = Modifier
) {
    val messages = remember { mutableStateListOf<Pair<String, Boolean>>() }
    
    LaunchedEffect(liveTranscript) {
        if (liveTranscript.isNotEmpty()) {
            messages.clear()
            messages.add("Hi there! I am your AI Shopper Assistant." to false)
            messages.add("How can I assist you with Spresso e-commerce today?" to false)
            messages.add(liveTranscript to false)
        }
    }
    
    if (messages.isEmpty()) {
        messages.add("Hi there! I am your AI Shopper Assistant." to false)
        messages.add("How can I assist you with Spresso e-commerce today?" to false)
    }

    Scaffold(
        modifier = modifier.fillMaxSize()
    ) { innerPadding ->
        ChatbotCanvas(
            isVideoPlaying = isVideoPlaying,
            isVoiceRecording = isVoiceRecording,
            modifier = Modifier.padding(innerPadding)
        ) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                Text(
                    text = "Personal AI Shopper",
                    style = MaterialTheme.typography.titleLarge
                )

                // Accessibility Widget Toggle Card
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(
                        containerColor = MaterialTheme.colorScheme.surfaceVariant
                    )
                ) {
                    Row(
                        modifier = Modifier.padding(12.dp).fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                text = "Google Lens Screen Widget",
                                style = MaterialTheme.typography.titleSmall
                            )
                            Text(
                                text = "Toggles background draw-over widget for visual try-ons & product finding.",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                        Switch(
                            checked = isAccessibilityEnabled,
                            onCheckedChange = {
                                onToggleAccessibility?.invoke()
                            }
                        )
                    }
                }
                
                LazyColumn(
                    modifier = Modifier.weight(1f),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    items(messages) { message ->
                        val isUser = message.second
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = if (isUser) Arrangement.End else Arrangement.Start
                        ) {
                            ChatBubbleText(text = message.first, isUser = isUser)
                        }
                    }
                }
                
                if (errorMessage != null) {
                    Text(
                        text = "⚠️ $errorMessage",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.error,
                        modifier = Modifier.padding(bottom = 8.dp)
                    )
                }
            }
        }
    }
}
