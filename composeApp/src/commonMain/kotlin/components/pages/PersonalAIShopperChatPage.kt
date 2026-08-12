package components.pages

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.Checkbox
import androidx.compose.material3.MaterialTheme
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
import components.organisms.PersonalAIShopperChatPanel

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
    modifier: Modifier = Modifier
) {
    val messages = remember { mutableStateListOf<Pair<String, Boolean>>() }

    LaunchedEffect(liveTranscript) {
        if (liveTranscript.isNotEmpty()) {
            messages.clear()
            messages.add("Hello Shopper! I'm your Spresso AI Personal Shopper. How can I help you find outfits, ingredients, or local retail deals today?" to false)
            messages.add(liveTranscript to false)
        }
    }

    if (messages.isEmpty()) {
        messages.add("Hello Shopper! I'm your Spresso AI Personal Shopper. How can I help you find outfits, ingredients, or local retail deals today?" to false)
    }

    if (showAccessibilityDisclosure) {
        var acknowledged by remember(showAccessibilityDisclosure) { mutableStateOf(false) }
        AlertDialog(
            onDismissRequest = { onDismissAccessibilityDisclosure?.invoke() },
            title = { Text("Screen search access") },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text("Spresso can capture the current app window or screen only after you tap Scan current screen...")
                    Text("A capture may include text, account details... Do not scan passwords, one-time codes, payment forms...")
                    Text("For visual shopping search, the image is processed via HTTPS... Raw images are not saved to disk...")
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Checkbox(checked = acknowledged, onCheckedChange = { acknowledged = it })
                        Text("I agree to screen capture and transfer for visual shopping search.")
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

    Scaffold(modifier = modifier.fillMaxSize()) { innerPadding ->
        PersonalAIShopperChatPanel(
            messages = messages,
            onSendMessage = { prompt -> messages.add(prompt to true) },
            errorMessage = errorMessage,
            userLocation = userLocation,
            isAccessibilityEnabled = isAccessibilityEnabled,
            hasAccessibilityConsent = hasAccessibilityConsent,
            onToggleAccessibility = onToggleAccessibility,
            onRequestAccessibilityScan = onRequestAccessibilityScan,
            onRevokeAccessibilityConsent = onRevokeAccessibilityConsent,
            onLaunchCamera = onLaunchCamera,
            isVoiceRecording = isVoiceRecording,
            onToggleVoiceRecording = onToggleVoiceRecording,
            modifier = Modifier.padding(innerPadding)
        )
    }
}
