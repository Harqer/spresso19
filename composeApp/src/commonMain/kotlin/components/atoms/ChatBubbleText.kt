package components.atoms

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import network.models.GroundingSource

@Composable
fun ChatBubbleText(
    text: String,
    isUser: Boolean,
    thought: String? = null,
    sources: List<GroundingSource> = emptyList(),
    mediaUrl: String? = null,
    mediaType: String? = null,
    isStreaming: Boolean = false,
    httpClient: io.ktor.client.HttpClient? = null,
    modifier: Modifier = Modifier
) {
    val bubbleColor = if (isUser) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.surfaceContainerHigh
    val textColor = if (isUser) MaterialTheme.colorScheme.onPrimary else MaterialTheme.colorScheme.onSurface
    val shape = if (isUser) RoundedCornerShape(20.dp, 20.dp, 4.dp, 20.dp) else RoundedCornerShape(20.dp, 20.dp, 20.dp, 4.dp)

    Column(modifier = modifier, horizontalAlignment = if (isUser) Alignment.End else Alignment.Start, verticalArrangement = Arrangement.spacedBy(6.dp)) {
        if (!thought.isNullOrBlank() && !isUser) ChatThoughtBox(thought = thought)
        Surface(shape = shape, color = bubbleColor, tonalElevation = if (isUser) 2.dp else 0.dp) {
            Column(modifier = Modifier.padding(horizontal = 16.dp, vertical = 12.dp)) {
                if (isStreaming && text.isEmpty()) {
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        CircularProgressIndicator(modifier = Modifier.size(14.dp), color = textColor, strokeWidth = 2.dp)
                        Text(text = "Sourcing recommendations...", style = MaterialTheme.typography.bodySmall, color = textColor.copy(alpha = 0.7f))
                    }
                } else {
                    Text(text = text, style = MaterialTheme.typography.bodyMedium, color = textColor)
                }
                if (sources.isNotEmpty() && !isUser) ChatGroundingSources(sources = sources, textColor = textColor)
            }
        }
    }
}
