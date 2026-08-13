package components.molecules

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp

@Composable
fun AttachmentChipsBar(
    isTyping: Boolean = false,
    isVoiceActive: Boolean = false,
    isSpeaking: Boolean = false,
    isListening: Boolean = false,
    onStopVoice: (() -> Unit)? = null,
    modifier: Modifier = Modifier
) {
    Column(modifier = modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(6.dp)) {
        if (isTyping) {
            Row(
                modifier = Modifier.fillMaxWidth().padding(horizontal = 4.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Box(modifier = Modifier.size(10.dp).background(brush = Brush.linearGradient(listOf(Color(0xFFFF69B4), Color(0xFFFFC107), Color(0xFF10B981))), shape = CircleShape))
                    Text(text = "Spresso AI Personal Shopper is responding...", style = MaterialTheme.typography.labelSmall.copy(fontWeight = FontWeight.SemiBold), color = MaterialTheme.colorScheme.primary)
                }
                Icon(Icons.Default.AutoAwesome, null, tint = Color(0xFFFFC107), modifier = Modifier.size(16.dp))
            }
        }
        if (isVoiceActive) {
            Surface(
                modifier = Modifier.fillMaxWidth().padding(horizontal = 4.dp),
                color = MaterialTheme.colorScheme.surfaceContainer,
                shape = CircleShape,
                border = BorderStroke(1.dp, MaterialTheme.colorScheme.primary.copy(alpha = 0.4f))
            ) {
                Row(modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.SpaceBetween) {
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        Box(modifier = Modifier.size(8.dp).background(MaterialTheme.colorScheme.primary, CircleShape))
                        Text(text = when { isSpeaking -> "Spresso AI is speaking..."; isListening -> "Listening... Speak now"; else -> "Bi-directional Voice Mode Active" }, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.primary)
                    }
                    if (onStopVoice != null) {
                        Text(text = "End Voice", modifier = Modifier.clickable { onStopVoice() }, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
            }
        }
    }
}
