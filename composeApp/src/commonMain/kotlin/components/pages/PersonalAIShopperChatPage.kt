package components.pages

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Send
import androidx.compose.material.icons.filled.CameraAlt
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Checkbox
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.IconButtonDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
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
    errorMessage: String? = null,
    isAccessibilityEnabled: Boolean = false,
    hasAccessibilityConsent: Boolean = false,
    showAccessibilityDisclosure: Boolean = false,
    onToggleAccessibility: (() -> Unit)? = null,
    onAccessibilityConsentAccepted: (() -> Unit)? = null,
    onDismissAccessibilityDisclosure: (() -> Unit)? = null,
    onRevokeAccessibilityConsent: (() -> Unit)? = null,
    onRequestAccessibilityScan: (() -> Unit)? = null,
    onLaunchCamera: (() -> Unit)? = null,
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

    if (showAccessibilityDisclosure) {
        var acknowledged by remember(showAccessibilityDisclosure) { mutableStateOf(false) }
        AlertDialog(
            onDismissRequest = { onDismissAccessibilityDisclosure?.invoke() },
            title = { Text("Screen search access") },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text(
                        "Spresso can capture the current app window or screen only after you tap Scan current screen or the system accessibility button. It does not capture at service startup, from screen changes, or in the background."
                    )
                    Text(
                        "A capture may include text, account details, messages, notifications, or anything else visible on that screen. Do not scan passwords, one-time codes, payment or banking forms, health apps, private messages, or authentication screens."
                    )
                    Text(
                        "For visual shopping search, the one-time image is sent over HTTPS to Spresso's visual-search service and processors including Google Gemini and Apify. Spresso does not save the raw image to your device, chat history, analytics, or a persistent account record; transient request data is discarded after processing. External processors handle the submitted image under their own published processing and retention terms."
                    )
                    Text(
                        "You can decline now or revoke consent later in Spresso or Android accessibility settings. Turning the Android service on is separate from this consent."
                    )
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Checkbox(
                            checked = acknowledged,
                            onCheckedChange = { acknowledged = it }
                        )
                        Text("I understand and agree to screen capture and transfer for visual shopping search.")
                    }
                }
            },
            confirmButton = {
                Button(
                    enabled = acknowledged && onAccessibilityConsentAccepted != null,
                    onClick = { onAccessibilityConsentAccepted?.invoke() }
                ) {
                    Text("I understand and continue")
                }
            },
            dismissButton = {
                TextButton(onClick = { onDismissAccessibilityDisclosure?.invoke() }) {
                    Text("Decline")
                }
            }
        )
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
                                onClick = { onLaunchCamera() },
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
                            modifier = Modifier.padding(16.dp),
                            verticalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            Text("Screen search", style = MaterialTheme.typography.titleSmall)
                            Text(
                                "Find products in the screen you are viewing with a one-time, user-requested scan.",
                                style = MaterialTheme.typography.bodySmall
                            )
                            Text(
                                "Consent: ${if (hasAccessibilityConsent) "granted" else "not granted"}",
                                style = MaterialTheme.typography.bodySmall
                            )
                            Text(
                                "Android service: ${if (isAccessibilityEnabled) "enabled" else "not enabled"}",
                                style = MaterialTheme.typography.bodySmall
                            )
                            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                Button(onClick = { onToggleAccessibility() }) {
                                    Text(if (hasAccessibilityConsent) "Manage Android settings" else "Review access")
                                }
                                if (hasAccessibilityConsent && isAccessibilityEnabled && onRequestAccessibilityScan != null) {
                                    Button(onClick = { onRequestAccessibilityScan() }) {
                                        Text("Scan current screen")
                                    }
                                }
                            }
                            if (hasAccessibilityConsent && onRevokeAccessibilityConsent != null) {
                                TextButton(onClick = { onRevokeAccessibilityConsent() }) {
                                    Text("Revoke consent")
                                }
                            }
                        }
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

                var userPrompt by remember { mutableStateOf("") }
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    OutlinedTextField(
                        value = userPrompt,
                        onValueChange = { userPrompt = it },
                        placeholder = { Text("Ask your AI Personal Shopper...") },
                        modifier = Modifier.weight(1f)
                    )
                    IconButton(
                        onClick = {
                            if (userPrompt.isNotBlank()) {
                                messages.add(userPrompt to true)
                                userPrompt = ""
                            }
                        },
                        colors = IconButtonDefaults.iconButtonColors(
                            containerColor = MaterialTheme.colorScheme.primary,
                            contentColor = MaterialTheme.colorScheme.onPrimary
                        )
                    ) {
                        Icon(Icons.AutoMirrored.Filled.Send, contentDescription = "Send message")
                    }
                }

                if (errorMessage != null) {
                    Text(
                        text = errorMessage,
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.error,
                        modifier = Modifier.padding(bottom = 8.dp)
                    )
                }
            }
        }
    }
}
