package components.features.chat

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp

@Composable
actual fun VideoReviewCard(videoUrl: String, modifier: Modifier) {
    Box(modifier = modifier.fillMaxWidth().padding(16.dp)) {
        Text("Video reviews are currently only supported on Android: $videoUrl")
    }
}
