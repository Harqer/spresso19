package components.shared.overlays

import androidx.compose.foundation.layout.*
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import components.features.chat.AIShopperInputBar
import components.templates.SpressoBottomSheet

/**
 * An overlay that can be summoned from any screen to quick-capture a chat intent.
 * It encapsulates the `AIShopperInputBar` inside a bottom sheet and passes the resulting
 * message intent up to the caller to handle (e.g., routing to the main chat screen).
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun GlobalChatOverlay(
    isVisible: Boolean,
    onDismissRequest: () -> Unit,
    onSendMessage: (String) -> Unit,
    modifier: Modifier = Modifier,
    onOpenLiveCamera: (() -> Unit)? = null,
    onOpenObjectDetection: (() -> Unit)? = null,
    onToggleVoice: (() -> Unit)? = null
) {
    if (isVisible) {
        SpressoBottomSheet(
            onDismissRequest = onDismissRequest,
            title = "Ask Spresso AI",
            modifier = modifier
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(bottom = 16.dp)
            ) {
                AIShopperInputBar(
                    onSend = { 
                        onSendMessage(it)
                        onDismissRequest()
                    },
                    onOpenLiveCamera = onOpenLiveCamera,
                    onOpenObjectDetection = onOpenObjectDetection,
                    onToggleVoice = onToggleVoice,
                    placeholder = "How can I help you today?"
                )
            }
        }
    }
}
