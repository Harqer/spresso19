package components.organisms

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CameraAlt
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import components.atoms.ChatBubbleText
import components.molecules.ChatEmptyStateCard
import components.molecules.JetchatInputBar

@Composable
fun PersonalAIShopperChatPanel(
    messages: List<Pair<String, Boolean>>,
    onSendMessage: (String) -> Unit,
    errorMessage: String? = null,
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
            listState.animateScrollToItem(messages.size - 1)
        }
    }

    Column(
        modifier = modifier
            .fillMaxSize()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Text(
            text = "Personal AI Shopper",
            style = MaterialTheme.typography.titleLarge
        )

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
                        text = "CameraX Smart Visual Search",
                        style = MaterialTheme.typography.titleSmall
                    )
                    Text(
                        text = "Native real-time lens object detection & virtual try-on capture.",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
                if (onLaunchCamera != null) {
                    Button(
                        onClick = onLaunchCamera,
                        colors = ButtonDefaults.buttonColors(
                            containerColor = MaterialTheme.colorScheme.primary
                        )
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(4.dp)
                        ) {
                            Icon(Icons.Default.CameraAlt, contentDescription = "Camera")
                            Text("Open Camera")
                        }
                    }
                }
            }
        }

        if (onToggleAccessibility != null) {
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(
                    containerColor = MaterialTheme.colorScheme.secondaryContainer
                )
            ) {
                Column(
                    modifier = Modifier.padding(14.dp),
                    verticalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    Text("Screen search", style = MaterialTheme.typography.titleSmall)
                    Text(
                        "Find products on screen with a one-time user-requested scan.",
                        style = MaterialTheme.typography.bodySmall
                    )
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        Button(onClick = onToggleAccessibility) {
                            Text(if (hasAccessibilityConsent) "Manage settings" else "Review access")
                        }
                        if (hasAccessibilityConsent && isAccessibilityEnabled && onRequestAccessibilityScan != null) {
                            Button(onClick = onRequestAccessibilityScan) {
                                Text("Scan screen")
                            }
                        }
                        if (hasAccessibilityConsent && onRevokeAccessibilityConsent != null) {
                            TextButton(onClick = onRevokeAccessibilityConsent) {
                                Text("Revoke")
                            }
                        }
                    }
                }
            }
        }

        if (messages.size <= 2) {
            ChatEmptyStateCard(
                onSelectSuggestion = onSendMessage
            )
        }

        LazyColumn(
            state = listState,
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

        JetchatInputBar(
            onSendMessage = onSendMessage,
            onLaunchCamera = onLaunchCamera,
            isVoiceRecording = isVoiceRecording,
            onToggleVoiceRecording = onToggleVoiceRecording
        )

        if (errorMessage != null) {
            Text(
                text = errorMessage,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.error,
                modifier = Modifier.padding(bottom = 4.dp)
            )
        }
    }
}
