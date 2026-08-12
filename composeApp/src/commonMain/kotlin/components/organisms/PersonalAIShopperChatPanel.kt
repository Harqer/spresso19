package components.organisms

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import components.atoms.ChatBubbleText
import components.molecules.AIShopperInputBar
import components.molecules.ChatEmptyStateCard
import components.molecules.ChatMessageHeader

@Composable
fun PersonalAIShopperChatPanel(
    messages: List<Pair<String, Boolean>>,
    onSendMessage: (String) -> Unit,
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
    modifier: Modifier = Modifier
) {
    val listState = rememberLazyListState()

    LaunchedEffect(messages.size) {
        if (messages.isNotEmpty()) {
            listState.animateScrollToItem(messages.size)
        }
    }

    Column(
        modifier = modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.surface)
    ) {
        // Web 1-to-1 Parity Header Bar
        Surface(
            modifier = Modifier.fillMaxWidth(),
            color = MaterialTheme.colorScheme.surfaceContainerLow,
            tonalElevation = 1.dp
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 12.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Box(
                        modifier = Modifier
                            .size(40.dp)
                            .background(MaterialTheme.colorScheme.primary, shape = RoundedCornerShape(12.dp)),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            imageVector = Icons.Default.AutoAwesome,
                            contentDescription = null,
                            tint = MaterialTheme.colorScheme.onPrimary,
                            modifier = Modifier.size(22.dp)
                        )
                    }
                    Column {
                        Text(
                            text = "AI Personal Shopper",
                            style = MaterialTheme.typography.titleMedium
                        )
                        Text(
                            text = if (userLocation != null) "Shopping near $userLocation" else "Global Marketplace",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }

                OutlinedButton(
                    onClick = { onToggleAccessibility?.invoke() }
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(4.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.LocationOn,
                            contentDescription = null,
                            tint = MaterialTheme.colorScheme.primary,
                            modifier = Modifier.size(16.dp)
                        )
                        Text(
                            text = userLocation ?: "Set Location",
                            style = MaterialTheme.typography.labelMedium
                        )
                    }
                }
            }
        }

        if (onToggleAccessibility != null && !hasAccessibilityConsent) {
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(12.dp),
                colors = CardDefaults.cardColors(
                    containerColor = MaterialTheme.colorScheme.surfaceContainer
                )
            ) {
                Column(
                    modifier = Modifier.padding(12.dp),
                    verticalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    Text("Screen search access", style = MaterialTheme.typography.titleSmall)
                    Text(
                        "Find products on screen with a one-time user-requested scan.",
                        style = MaterialTheme.typography.bodySmall
                    )
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        Button(onClick = onToggleAccessibility) {
                            Text("Review access")
                        }
                    }
                }
            }
        }

        // Message History Container with Dynamic User Greeting Card at top
        LazyColumn(
            state = listState,
            modifier = Modifier
                .weight(1f)
                .padding(horizontal = 16.dp, vertical = 8.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            item {
                ChatEmptyStateCard(
                    userName = "Shopper",
                    onSelectSuggestion = onSendMessage,
                    modifier = Modifier.padding(bottom = 8.dp)
                )
            }

            items(messages) { message ->
                val isUser = message.second
                Column(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalAlignment = if (isUser) Alignment.End else Alignment.Start
                ) {
                    ChatMessageHeader(
                        isUser = isUser,
                        timestamp = "Just now"
                    )
                    ChatBubbleText(text = message.first, isUser = isUser)
                }
            }
        }

        // Reusable Input Bar
        AIShopperInputBar(
            onSend = onSendMessage,
            onOpenLiveCamera = onLaunchCamera,
            onOpenObjectDetection = onLaunchCamera,
            onOpenLensWidget = onLaunchCamera,
            isVoiceActive = isVoiceRecording,
            onToggleVoice = onToggleVoiceRecording,
            modifier = Modifier.padding(12.dp)
        )

        if (errorMessage != null) {
            Text(
                text = errorMessage,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.error,
                modifier = Modifier.padding(horizontal = 16.dp, vertical = 4.dp)
            )
        }
    }
}
