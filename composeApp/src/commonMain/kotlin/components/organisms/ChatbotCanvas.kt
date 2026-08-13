package components.organisms

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Mic
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.blur
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import components.molecules.ParallaxCard
import org.jetbrains.compose.ui.tooling.preview.Preview
import theme.AppTheme

@Composable
fun ChatbotCanvas(
    isVideoPlaying: Boolean,
    isVoiceRecording: Boolean = false,
    modifier: Modifier = Modifier,
    cardContent: @Composable () -> Unit
) {
    val scrollState = rememberScrollState()

    Box(
        modifier = modifier.fillMaxSize()
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(scrollState)
                .then(if (isVideoPlaying) Modifier.blur(16.dp) else Modifier),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 32.dp, horizontal = 24.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Text(
                    text = "Spresso19 Virtual Assistant",
                    style = MaterialTheme.typography.headlineMedium,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.primary
                )

                Text(
                    text = "I can help you visualize products with Genkit AI.",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(top = 8.dp)
                )
            }

            if (isVoiceRecording) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 24.dp, vertical = 8.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.Mic,
                            contentDescription = "Microphone",
                            tint = MaterialTheme.colorScheme.error,
                            modifier = Modifier.size(18.dp)
                        )
                        Text(
                            text = "Listening to your command...",
                            style = MaterialTheme.typography.labelLarge,
                            color = MaterialTheme.colorScheme.error
                        )
                    }
                }
            }

            ParallaxCard(
                scrollOffset = scrollState.value.toFloat(),
                backgroundColor = MaterialTheme.colorScheme.surface,
                contentColor = MaterialTheme.colorScheme.onSurface
            ) {
                Column(
                    modifier = Modifier.fillMaxWidth()
                ) {
                    cardContent()
                }
            }

            Text(
                text = "Scroll to see the parallax effect, or use voice commands.",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.outline,
                modifier = Modifier.padding(top = 24.dp)
            )

            Box(modifier = Modifier.height(1000.dp))
        }
    }
}

@Preview
@Composable
fun ChatbotCanvasPreview() {
    AppTheme {
        ChatbotCanvas(isVideoPlaying = false) {
            androidx.compose.material3.Text("AI Conversation Canvas")
        }
    }
}
