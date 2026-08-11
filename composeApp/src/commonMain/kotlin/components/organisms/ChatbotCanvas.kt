package components.organisms

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.blur
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import components.molecules.ParallaxCard

@Composable
fun ChatbotCanvas(
    isVideoPlaying: Boolean,
    isVoiceRecording: Boolean = false,
    modifier: Modifier = Modifier,
    cardContent: @Composable () -> Unit
) {
    val scrollState = rememberScrollState()
    
    Box(
        modifier = modifier
            .fillMaxSize()
    ) {
        // Background UI (Blurred if video is playing)
        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(scrollState)
                .then(if (isVideoPlaying) Modifier.blur(16.dp) else Modifier),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            
            // Header Section
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
            
            // Voice Status Indicator
            if (isVoiceRecording) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 24.dp, vertical = 8.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = "🎙 Listening to your command...",
                        style = MaterialTheme.typography.labelLarge,
                        color = MaterialTheme.colorScheme.error
                    )
                }
            }
            
            // Render the Parallax Card to hold dynamic content (Virtual Try-On / Spin 360)
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
            
            // Footer Section providing instructions
            Text(
                text = "Scroll to see the parallax effect, or use voice commands.",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.outline,
                modifier = Modifier.padding(top = 24.dp)
            )
            
            // Extra spacing to allow generous scrolling for the parallax effect
            Box(modifier = Modifier.height(1000.dp))
        }
    }
}
